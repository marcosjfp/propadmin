import { router, adminProcedure } from '../trpc.js';
import { users } from '../../drizzle/schema.js';
import { and, eq, isNull, sql, asc } from 'drizzle-orm';
import { z } from 'zod';

export const dashboardRouter = router({
  stats: adminProcedure.query(async ({ctx}) => {
    const rows = await ctx.db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM users WHERE "deletedAt" IS NULL) AS "totalUsers",
        (SELECT count(*)::int FROM users WHERE "deletedAt" IS NULL AND role = 'agent' AND status = 'active') AS "totalAgents",
        (SELECT count(*)::int FROM properties WHERE "deletedAt" IS NULL) AS "totalProperties",
        (SELECT count(*)::int FROM properties WHERE "deletedAt" IS NULL AND status = 'ativa' AND "isApproved") AS "activeProperties",
        (SELECT coalesce(sum("commissionAmount"),0)::text FROM commissions WHERE status <> 'cancelada') AS "totalCommissions",
        (SELECT coalesce(sum("commissionAmount"),0)::text FROM commissions WHERE status = 'pendente') AS "pendingCommissions",
        (SELECT coalesce(sum("commissionAmount"),0)::text FROM commissions WHERE status = 'paga') AS "paidCommissions"
    `);
    const row = rows.rows[0];
    return {
      totalUsers:Number(row.totalUsers),totalAgents:Number(row.totalAgents),totalProperties:Number(row.totalProperties),activeProperties:Number(row.activeProperties),
      totalCommissions:Number(row.totalCommissions),pendingCommissions:Number(row.pendingCommissions),paidCommissions:Number(row.paidCommissions),
    };
  }),
  agents: adminProcedure.input(z.object({page:z.number().int().min(1).default(1),pageSize:z.number().int().min(1).max(100).default(20)})).query(async ({ctx,input}) => {
    const items = await ctx.db.select({
      id:users.id,name:users.name,email:users.email,creci:users.creci,
      propertyCount:sql<number>`(SELECT count(*)::int FROM properties WHERE "agentId" = "users"."id" AND "deletedAt" IS NULL)`,
      commissionCount:sql<number>`(SELECT count(*)::int FROM commissions WHERE "agentId" = "users"."id" AND status <> 'cancelada')`,
      total:sql<string>`(SELECT coalesce(sum("commissionAmount"),0)::text FROM commissions WHERE "agentId" = "users"."id" AND status <> 'cancelada')`,
      paid:sql<string>`(SELECT coalesce(sum("commissionAmount"),0)::text FROM commissions WHERE "agentId" = "users"."id" AND status = 'paga')`,
      pending:sql<string>`(SELECT coalesce(sum("commissionAmount"),0)::text FROM commissions WHERE "agentId" = "users"."id" AND status = 'pendente')`,
    }).from(users).where(and(eq(users.role,'agent'),eq(users.status,'active'),isNull(users.deletedAt))).orderBy(asc(users.id)).limit(input.pageSize).offset((input.page-1)*input.pageSize);
    const [count] = await ctx.db.select({total:sql<number>`count(*)::int`}).from(users).where(and(eq(users.role,'agent'),eq(users.status,'active'),isNull(users.deletedAt)));
    return {items:items.map(item=>({...item,total:Number(item.total),paid:Number(item.paid),pending:Number(item.pending)})),totalPages:Math.ceil(count.total/input.pageSize)};
  }),
});
