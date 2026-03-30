import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { createJWT } from '../context';
import { COOKIE_NAME } from '../../shared/const';
import bcrypt from 'bcryptjs';

export const authRouter = router({
  // Get current authenticated user
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
    }
    return ctx.user;
  }),

  // Login
  login: publicProcedure
    .input(z.object({
      username: z.string().min(1, 'Usuário é obrigatório'),
      password: z.string().min(1, 'Senha é obrigatória'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { username, password } = input;
      
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Usuário ou senha inválidos',
        });
      }

      if (user.status === 'pending') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sua conta ainda está pendente de aprovação pelo administrador',
        });
      }

      if (user.status === 'rejected') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sua conta foi rejeitada',
        });
      }

      const isPasswordValid = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
      
      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Usuário ou senha inválidos',
        });
      }

      const token = createJWT({ id: user.id, email: user.email, role: user.role });

      // Cookie settings for production
      const isProduction = process.env.NODE_ENV === 'production';
      ctx.res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      // Update last signed in
      await ctx.db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      return { success: true };
    }),

  // Signup
  signup: publicProcedure
    .input(z.object({
      name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
      username: z.string().min(3, 'Usuário deve ter pelo menos 3 caracteres'),
      password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
      email: z.string().email('E-mail inválido'),
      role: z.enum(['user', 'agent']).default('user'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { name, username, password, email, role } = input;

      const [existingUsername] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUsername) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Nome de usuário indisponível',
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const openId = `local-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await ctx.db.insert(users).values({
        name,
        username,
        email,
        passwordHash,
        role,
        status: 'pending',
        openId,
        loginMethod: 'local',
      });

      return { success: true, message: 'Conta criada. Aguardando aprovação.' };
    }),

  // Logout current user
  logout: publicProcedure.mutation(async ({ ctx }) => {
    // Clear the cookie
    ctx.res.clearCookie(COOKIE_NAME);
    return { success: true };
  }),
});
