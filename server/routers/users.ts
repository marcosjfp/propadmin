import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc.js';
import { users } from '../../drizzle/schema.js';
import { eq, desc, sql, or } from 'drizzle-orm';
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
      const updateData: Partial<typeof users.$inferInsert> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.phone !== undefined) updateData.phone = input.phone;
      // Apenas agentes podem atualizar o CRECI
      if (input.creci !== undefined && (ctx.user.role === 'agent' || ctx.user.role === 'admin')) {
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

  // List pending users (admin only)
  listPending: adminProcedure.query(async ({ ctx }) => {
    return await ctx.db
      .select()
      .from(users)
      .where(eq(users.status, 'pending'))
      .orderBy(desc(users.createdAt));
  }),

  // Approve a user (admin only)
  approve: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({ status: 'active' })
        .where(eq(users.id, input.id));

      const [user] = await ctx.db.select().from(users).where(eq(users.id, input.id)).limit(1);

      if (user) {
        await createAuditLog({
          ctx,
          action: 'user_updated',
          entityType: 'user',
          entityId: input.id,
          entityName: user.name || user.email || `User #${input.id}`,
          previousValue: { status: 'pending' },
          newValue: { status: 'active' },
          description: `Usuário "${user.name || user.email}" aprovado`,
        });
      }

      return { success: true };
    }),

  // Reject a user (admin only)
  reject: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({ status: 'rejected' })
        .where(eq(users.id, input.id));

      const [user] = await ctx.db.select().from(users).where(eq(users.id, input.id)).limit(1);

      if (user) {
        await createAuditLog({
          ctx,
          action: 'user_updated',
          entityType: 'user',
          entityId: input.id,
          entityName: user.name || user.email || `User #${input.id}`,
          previousValue: { status: 'pending' },
          newValue: { status: 'rejected' },
          description: `Usuário "${user.name || user.email}" rejeitado`,
        });
      }

      return { success: true };
    }),

  // List all users with pagination (admin only)
  list: adminProcedure
    .input(z.object({ 
      page: z.number().min(1).default(1), 
      pageSize: z.number().min(1).max(100).default(20) 
    }).optional().default({ page: 1, pageSize: 20 }))
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const items = await ctx.db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset(offset);
        
      // Conta o total (MySQL requer query separada)
      const [countResult] = await ctx.db
        .select({ count: sql`count(*)` })
        .from(users);
        
      return {
        items,
        totalCount: Number(countResult.count),
        page,
        pageSize,
        totalPages: Math.ceil(Number(countResult.count) / pageSize)
      };
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

  // Create a new user (admin only - protegido para evitar criação não autorizada)
  create: adminProcedure
    .input(
      z.object({
        openId: z.string().min(1),
        name: z.string().trim().min(2).max(100).optional(),
        email: z.string().email().toLowerCase().optional(),
        phone: z.string().regex(/^[\d\s\-()]+$/).optional(),
        loginMethod: z.string().optional(),
        role: z.enum(['user', 'agent', 'admin']).default('user'),
        creci: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar se já existe usuário com mesmo openId
      const [existing] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.openId, input.openId))
        .limit(1);
      
      if (existing) {
        throw new Error('Usuário já existe com este identificador');
      }

      // Verificar email duplicado
      if (input.email) {
        const [emailExists] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);
        
        if (emailExists) {
          throw new Error('Email já está em uso');
        }
      }

      await ctx.db
        .insert(users)
        .values({
          openId: input.openId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          loginMethod: input.loginMethod,
          role: input.role,
          creci: input.creci,
        });
      
      // Buscar o usuário recém-criado pelo openId
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.openId, input.openId))
        .limit(1);

      // Registrar no histórico
      await createAuditLog({
        ctx,
        action: 'user_created',
        entityType: 'user',
        entityId: user.id,
        entityName: user.name || user.email || 'Usuário',
        newValue: { role: input.role },
        description: `Usuário "${user.name || user.email}" criado pelo administrador`,
      });
      
      return { id: user.id };
    }),

  // Update user role (admin only)
  updateRole: adminProcedure
    .input(
      z.object({
        id: z.number(),
        role: z.enum(['user', 'agent', 'admin']),
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
          previousValue: { role: currentUser.role },
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
      // Impedir admin de deletar a si mesmo
      if (input.id === ctx.user.id) {
        throw new Error('Você não pode deletar sua própria conta');
      }

      // Buscar usuário antes de deletar para log
      const [userToDelete] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (!userToDelete) {
        throw new Error('Usuário não encontrado');
      }
      
      await ctx.db
        .delete(users)
        .where(eq(users.id, input.id));

      // Registrar no histórico
      await createAuditLog({
        ctx,
        action: 'user_deleted',
        entityType: 'user',
        entityId: input.id,
        entityName: userToDelete.name || userToDelete.email || `User #${input.id}`,
        previousValue: userToDelete,
        description: `Usuário "${userToDelete.name || userToDelete.email}" excluído`,
      });

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
      
      // Se mudar para user, limpar CRECI
      if (updateData.role === 'user') {
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
        // Validação CRECI: formato CRECI-XX-NNNNNN ou variações comuns
        creci: z.string()
          .min(3, "CRECI deve ter pelo menos 3 caracteres")
          .max(20, "CRECI deve ter no máximo 20 caracteres")
          .regex(
            /^(CRECI[-/]?)?([A-Z]{2}[-/]?)?\d{3,8}[-/]?[A-Z]?$/i,
            "Formato CRECI inválido. Exemplos válidos: 123456, CRECI-SP-123456, CRECI/RJ/12345"
          ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Normalizar CRECI para formato padrão
      const normalizedCreci = input.creci.toUpperCase().replace(/\s/g, '');
      
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
          creci: normalizedCreci,
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
          previousValue: { role: currentUser.role },
          newValue: { role: 'agent', creci: normalizedCreci },
          description: `Usuário "${currentUser.name || currentUser.email}" promovido a corretor com CRECI ${normalizedCreci}`,
        });
      }

      return { success: true };
    }),

  // List all agents
  listAgents: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        creci: users.creci,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(or(eq(users.role, 'agent'), eq(users.role, 'admin')))
      .orderBy(desc(users.createdAt));
    return result;
  }),

  // Create a new agent (admin only)
  createAgent: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        email: z.string().email("Email inválido"),
        phone: z.string().optional(),
        creci: z.string().min(1, "CRECI é obrigatório para corretores"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar se o email já existe
      const [existingUser] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingUser) {
        throw new Error('Já existe um usuário com este email');
      }

      // Gerar um openId único para o usuário (será atualizado quando ele fizer login)
      const openId = `admin-created-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await ctx.db
        .insert(users)
        .values({
          openId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          role: 'agent',
          creci: input.creci,
          loginMethod: 'admin-created',
        });

      // Buscar o usuário criado
      const [newUser] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.openId, openId))
        .limit(1);

      // Registrar no histórico
      await createAuditLog({
        ctx,
        action: 'user_created',
        entityType: 'user',
        entityId: newUser.id,
        entityName: input.name,
        newValue: { name: input.name, email: input.email, role: 'agent', creci: input.creci },
        description: `Corretor "${input.name}" criado pelo administrador`,
      });

      return { id: newUser.id, success: true };
    }),
});
