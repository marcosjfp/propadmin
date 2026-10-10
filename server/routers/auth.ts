import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { createJWT } from '../context';
import { COOKIE_NAME } from '../../shared/const';
import { enforceRate } from '../rate-limits.js';
import { passwordSchema } from '../../shared/validation.js';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createAuditLog } from './audit.js';

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
      username: z.string().min(1, 'Usuário é obrigatório').max(64),
      password: z.string().min(1, 'Senha é obrigatória').max(256),
    }))
    .mutation(async ({ ctx, input }) => {
      const { username, password } = input;

      const ip = ctx.ip || 'unknown';
      await enforceRate(ctx.db,'login-ip',ip,30,15*60*1000);
      await enforceRate(ctx.db,'login-pair',`${ip}:${username}`,10,15*60*1000);

      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      // Dummy compare to mitigate timing attacks
      if (!user || !user.passwordHash || user.deletedAt) {
        await bcrypt.compare(password, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');

        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Usuário ou senha inválidos',
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
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


      // Update last signed in
      await ctx.db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      await createAuditLog({ctx:{...ctx,user},action:'user_login',entityType:'user',entityId:user.id,entityName:user.name || username,description:'Login realizado'});

      const token = createJWT({ id: user.id, email: user.email, role: user.role });

      // Cookie settings for production
      const isProduction = process.env.NODE_ENV === 'production';
      (ctx.res as unknown as { cookie: (name: string, value: string, options: Record<string, unknown>) => void }).cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return { success: true };
    }),

  // Signup
  signup: publicProcedure
    .input(z.object({
      name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
      username: z.string().min(3, 'Usuário deve ter pelo menos 3 caracteres').max(64),
      password: passwordSchema,
      email: z.string().max(320).email('E-mail inválido').toLowerCase(),
      role: z.enum(['user', 'agent']).default('user'),
    }))
    .mutation(async ({ ctx, input }) => {
      await enforceRate(ctx.db,'signup-ip',ctx.ip || 'unknown',5,60*60*1000);
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
      const openId = `local-${randomUUID()}`;

      const [created] = await ctx.db.insert(users).values({
        name,
        username,
        email,
        passwordHash,
        role,
        status: 'pending',
        openId,
        loginMethod: 'local',
      }).returning();
      await createAuditLog({ctx,action:'user_created',entityType:'user',entityId:created.id,entityName:name,newValue:{name,username,email,role,status:'pending'},description:'Cadastro aguardando aprovação'});

      return { success: true, message: 'Conta criada. Aguardando aprovação.' };
    }),

  // Logout current user
  logout: publicProcedure.mutation(async ({ ctx }) => {
    if (ctx.user) await createAuditLog({ctx,action:'user_logout',entityType:'user',entityId:ctx.user.id,entityName:ctx.user.name || undefined,description:'Logout realizado'});
    // Clear the cookie
    (ctx.res as unknown as { clearCookie: (name: string) => void }).clearCookie(COOKIE_NAME);
    return { success: true };
  }),
});
