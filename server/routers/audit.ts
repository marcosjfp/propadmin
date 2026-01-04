import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc.js';
import { auditLogs } from '../../drizzle/schema.js';
import { eq, desc, and, gte, lte, or, like, sql } from 'drizzle-orm';
import type { Context } from '../context.js';

// Tipos de ação para tipagem
export type AuditAction = 
  | "user_created" | "user_updated" | "user_deleted" | "user_role_changed" | "user_login" | "user_logout"
  | "property_created" | "property_updated" | "property_deleted" | "property_status_changed" | "property_sold" | "property_rented"
  | "image_uploaded" | "image_deleted" | "image_primary_changed"
  | "commission_created" | "commission_status_changed" | "commission_paid" | "commission_cancelled";

export type EntityType = "user" | "property" | "commission" | "image";

// Interface para criar log de auditoria
interface CreateAuditLogParams {
  ctx: Context;
  action: AuditAction;
  entityType: EntityType;
  entityId?: number;
  entityName?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  description: string;
}

// Função auxiliar para criar logs de auditoria
export async function createAuditLog({
  ctx,
  action,
  entityType,
  entityId,
  entityName,
  previousValue,
  newValue,
  description,
}: CreateAuditLogParams): Promise<void> {
  try {
    await ctx.db.insert(auditLogs).values({
      userId: ctx.user?.id || null,
      userName: ctx.user?.name || 'Sistema',
      userRole: ctx.user?.role || 'system',
      action,
      entityType,
      entityId: entityId || null,
      entityName: entityName || null,
      previousValue: previousValue ? JSON.stringify(previousValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      description,
      ipAddress: null, // Pode ser obtido do request se necessário
      userAgent: null,
    });
  } catch (error) {
    // Log de auditoria não deve quebrar a operação principal
    console.error('Erro ao criar log de auditoria:', error);
  }
}

export const auditRouter = router({
  // Listar todos os logs (apenas admin)
  list: adminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(50),
      entityType: z.enum(["user", "property", "commission", "image"]).optional(),
      entityId: z.number().optional(),
      userId: z.number().optional(),
      action: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      // Construir condições de filtro
      const conditions = [];

      if (input?.entityType) {
        conditions.push(eq(auditLogs.entityType, input.entityType));
      }

      if (input?.entityId) {
        conditions.push(eq(auditLogs.entityId, input.entityId));
      }

      if (input?.userId) {
        conditions.push(eq(auditLogs.userId, input.userId));
      }

      if (input?.action) {
        conditions.push(eq(auditLogs.action, input.action as any));
      }

      if (input?.startDate) {
        conditions.push(gte(auditLogs.createdAt, new Date(input.startDate)));
      }

      if (input?.endDate) {
        conditions.push(lte(auditLogs.createdAt, new Date(input.endDate)));
      }

      if (input?.search) {
        conditions.push(
          or(
            like(auditLogs.description, `%${input.search}%`),
            like(auditLogs.entityName, `%${input.search}%`),
            like(auditLogs.userName, `%${input.search}%`)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Buscar logs
      const logs = await ctx.db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      // Contar total
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(whereClause);

      const total = countResult?.count || 0;

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  // Histórico de uma entidade específica
  getEntityHistory: protectedProcedure
    .input(z.object({
      entityType: z.enum(["user", "property", "commission", "image"]),
      entityId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, input.entityType),
            eq(auditLogs.entityId, input.entityId)
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(100);

      return logs;
    }),

  // Histórico de ações de um usuário
  getUserActivity: adminProcedure
    .input(z.object({
      userId: z.number(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, input.userId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit);

      return logs;
    }),

  // Estatísticas de auditoria
  getStats: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input?.startDate) {
        conditions.push(gte(auditLogs.createdAt, new Date(input.startDate)));
      }
      if (input?.endDate) {
        conditions.push(lte(auditLogs.createdAt, new Date(input.endDate)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Contagem por tipo de entidade
      const byEntityType = await ctx.db
        .select({
          entityType: auditLogs.entityType,
          count: sql<number>`count(*)`,
        })
        .from(auditLogs)
        .where(whereClause)
        .groupBy(auditLogs.entityType);

      // Contagem por ação
      const byAction = await ctx.db
        .select({
          action: auditLogs.action,
          count: sql<number>`count(*)`,
        })
        .from(auditLogs)
        .where(whereClause)
        .groupBy(auditLogs.action)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      // Usuários mais ativos
      const topUsers = await ctx.db
        .select({
          userId: auditLogs.userId,
          userName: auditLogs.userName,
          count: sql<number>`count(*)`,
        })
        .from(auditLogs)
        .where(whereClause)
        .groupBy(auditLogs.userId, auditLogs.userName)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      // Total de logs
      const [totalResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(whereClause);

      return {
        total: totalResult?.count || 0,
        byEntityType,
        byAction,
        topUsers,
      };
    }),

  // Ações recentes (dashboard)
  getRecent: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input?.limit || 20);

      return logs;
    }),
});
