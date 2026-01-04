import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc.js';
import { users } from '../../drizzle/schema.js';
import { eq, desc } from 'drizzle-orm';
import { createAuditLog } from './audit.js';

export const usersRouter = router({
  // Get current logged-in user
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  // Update own profile (any authenticated user)
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        creci: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Apenas atualizar campos permitidos do próprio perfil
      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.phone !== undefined) updateData.phone = input.phone;
      // Apenas agentes podem atualizar o CRECI
      if (input.creci !== undefined && ctx.user.isAgent) {
        updateData.creci = input.creci;
      }
      
      if (Object.keys(updateData).length > 0) {
        await ctx.db
          .update(users)
          .set(updateData)
          .where(eq(users.id, ctx.user.id));
      }

      return { success: true };
    }),

  // List all users (admin only)
  list: adminProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
    return result;
  }),

  // Get a single user by ID (admin only)
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);
      return user;
    }),

  // Create a new user (for testing - in production use proper auth)
  create: publicProcedure
    .input(
      z.object({
        openId: z.string().min(1),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        loginMethod: z.string().optional(),
        role: z.enum(['user', 'agent', 'admin']).default('user'),
        isAgent: z.boolean().default(false),
        creci: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(users)
        .values(input);
      
      // Buscar o usuário recém-criado pelo openId
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.openId, input.openId))
        .limit(1);
      
      return { id: user.id };
    }),

  // Update user role (admin only)
  updateRole: adminProcedure
    .input(
      z.object({
        id: z.number(),
        role: z.enum(['user', 'agent', 'admin']),
        isAgent: z.boolean().optional(),
        creci: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      
      // Buscar usuário atual para log
      const [currentUser] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      await ctx.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id));

      // Registrar no histórico
      if (currentUser) {
        await createAuditLog({
          ctx,
          action: 'user_role_changed',
          entityType: 'user',
          entityId: id,
          entityName: currentUser.name || currentUser.email || `User #${id}`,
          previousValue: { role: currentUser.role, isAgent: currentUser.isAgent },
          newValue: updateData,
          description: `Papel do usuário "${currentUser.name || currentUser.email}" alterado de "${currentUser.role}" para "${updateData.role}"`,
        });
      }

      return { success: true };
    }),

  // Delete a user (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Buscar usuário antes de deletar para log
      const [userToDelete] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);
      
      await ctx.db
        .delete(users)
        .where(eq(users.id, input.id));

      // Registrar no histórico
      if (userToDelete) {
        await createAuditLog({
          ctx,
          action: 'user_deleted',
          entityType: 'user',
          entityId: input.id,
          entityName: userToDelete.name || userToDelete.email || `User #${input.id}`,
          previousValue: userToDelete,
          description: `Usuário "${userToDelete.name || userToDelete.email}" excluído`,
        });
      }

      return { success: true };
    }),

  // Update user (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum(['user', 'agent', 'admin']).optional(),
        isAgent: z.boolean().optional(),
        creci: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      
      // Buscar usuário atual para log
      const [currentUser] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      // Se mudar para agent, atualizar isAgent também
      if (updateData.role === 'agent') {
        updateData.isAgent = true;
      } else if (updateData.role === 'user') {
        updateData.isAgent = false;
        updateData.creci = undefined;
      }
      
      await ctx.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id));

      // Registrar no histórico
      if (currentUser) {
        const roleChanged = updateData.role && updateData.role !== currentUser.role;
        await createAuditLog({
          ctx,
          action: roleChanged ? 'user_role_changed' : 'user_updated',
          entityType: 'user',
          entityId: id,
          entityName: currentUser.name || currentUser.email || `User #${id}`,
          previousValue: currentUser,
          newValue: updateData,
          description: roleChanged 
            ? `Papel do usuário "${currentUser.name || currentUser.email}" alterado de "${currentUser.role}" para "${updateData.role}"`
            : `Usuário "${currentUser.name || currentUser.email}" atualizado`,
        });
      }

      return { success: true };
    }),

  // Promote user to agent (admin only)
  promoteToAgent: adminProcedure
    .input(
      z.object({
        id: z.number(),
        creci: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Buscar usuário atual para log
      const [currentUser] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);
      
      await ctx.db
        .update(users)
        .set({
          role: 'agent',
          isAgent: true,
          creci: input.creci,
        })
        .where(eq(users.id, input.id));

      // Registrar no histórico
      if (currentUser) {
        await createAuditLog({
          ctx,
          action: 'user_role_changed',
          entityType: 'user',
          entityId: input.id,
          entityName: currentUser.name || currentUser.email || `User #${input.id}`,
          previousValue: { role: currentUser.role, isAgent: currentUser.isAgent },
          newValue: { role: 'agent', isAgent: true, creci: input.creci },
          description: `Usuário "${currentUser.name || currentUser.email}" promovido a corretor com CRECI ${input.creci}`,
        });
      }

      return { success: true };
    }),

  // List all agents
  listAgents: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select()
      .from(users)
      .where(eq(users.isAgent, true))
      .orderBy(desc(users.createdAt));
    return result;
  }),
});
