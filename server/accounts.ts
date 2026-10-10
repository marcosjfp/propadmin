import { TRPCError } from '@trpc/server';
import { and, eq, getTableColumns, isNull, sql } from 'drizzle-orm';
import { users } from '../drizzle/schema.js';
import type { Context } from './context.js';
const { passwordHash: _hash, ...safeFields } = getTableColumns(users);

export async function changeAccount(ctx: Context, id: number, changes: Partial<typeof users.$inferInsert>) {
  return ctx.db.transaction(async tx => {
    // Serialize changes affecting admin membership and recheck the actor after waiting.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(792817361)`);
    const [actor] = await tx.select(safeFields).from(users).where(eq(users.id, ctx.user!.id));
    if (!actor || actor.role !== 'admin' || actor.status !== 'active' || actor.deletedAt) {
      throw new TRPCError({code:'FORBIDDEN',message:'Acesso administrativo não está mais ativo'});
    }
    const [current] = await tx.select(safeFields).from(users).where(and(eq(users.id,id),isNull(users.deletedAt))).for('update');
    if (!current) throw new TRPCError({code:'NOT_FOUND',message:'Usuário não encontrado'});
    const removesAdmin = changes.deletedAt || (changes.role !== undefined && changes.role !== 'admin') || (changes.status !== undefined && changes.status !== 'active');
    if (id === actor.id && removesAdmin) throw new TRPCError({code:'FORBIDDEN',message:'Você não pode desativar ou remover seu próprio acesso administrativo'});
    if (current.role === 'admin' && current.status === 'active' && removesAdmin) {
      const [result] = await tx.select({count:sql<number>`count(*)::int`}).from(users).where(and(eq(users.role,'admin'),eq(users.status,'active'),isNull(users.deletedAt)));
      if (result.count <= 1) throw new TRPCError({code:'CONFLICT',message:'É necessário manter um administrador ativo'});
    }
    const next = {...changes};
    if (next.role === 'user') next.creci = null;
    await tx.update(users).set(next).where(eq(users.id,id));
    return current;
  });
}
