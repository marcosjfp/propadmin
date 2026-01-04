import { z } from 'zod';
import { router, protectedProcedure, agentProcedure, adminProcedure } from '../trpc.js';
import { commissions, properties, users } from '../../drizzle/schema.js';
import { eq, and, desc } from 'drizzle-orm';

export const commissionsRouter = router({
  // List all commissions (admin only)
  list: adminProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        id: commissions.id,
        propertyId: commissions.propertyId,
        agentId: commissions.agentId,
        transactionType: commissions.transactionType,
        transactionAmount: commissions.transactionAmount,
        commissionRate: commissions.commissionRate,
        commissionAmount: commissions.commissionAmount,
        status: commissions.status,
        paymentDate: commissions.paymentDate,
        createdAt: commissions.createdAt,
        updatedAt: commissions.updatedAt,
        property: properties,
        agent: users,
      })
      .from(commissions)
      .leftJoin(properties, eq(commissions.propertyId, properties.id))
      .leftJoin(users, eq(commissions.agentId, users.id))
      .orderBy(desc(commissions.createdAt));
    return result;
  }),

  // Get commissions for the logged-in agent
  myCommissions: agentProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        id: commissions.id,
        propertyId: commissions.propertyId,
        agentId: commissions.agentId,
        transactionType: commissions.transactionType,
        transactionAmount: commissions.transactionAmount,
        commissionRate: commissions.commissionRate,
        commissionAmount: commissions.commissionAmount,
        status: commissions.status,
        paymentDate: commissions.paymentDate,
        createdAt: commissions.createdAt,
        updatedAt: commissions.updatedAt,
        property: properties,
      })
      .from(commissions)
      .leftJoin(properties, eq(commissions.propertyId, properties.id))
      .where(eq(commissions.agentId, ctx.user.id))
      .orderBy(desc(commissions.createdAt));
    return result;
  }),

  // Get a single commission by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [commission] = await ctx.db
        .select()
        .from(commissions)
        .where(eq(commissions.id, input.id))
        .limit(1);
      return commission;
    }),

  // Create a new commission (agent only)
  create: agentProcedure
    .input(
      z.object({
        propertyId: z.number(),
        transactionType: z.enum(['venda', 'aluguel']),
        transactionAmount: z.number().int().positive(),
        commissionRate: z.number().int().min(0).max(10000), // 0% to 100% (in basis points)
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Calculate commission amount
      const commissionAmount = Math.floor((input.transactionAmount * input.commissionRate) / 10000);

      await ctx.db
        .insert(commissions)
        .values({
          propertyId: input.propertyId,
          agentId: ctx.user.id,
          transactionType: input.transactionType,
          transactionAmount: input.transactionAmount,
          commissionRate: input.commissionRate,
          commissionAmount,
          status: 'pendente',
        });
      
      // Buscar a comissão recém-criada
      const [commission] = await ctx.db
        .select()
        .from(commissions)
        .where(eq(commissions.agentId, ctx.user.id))
        .orderBy(desc(commissions.id))
        .limit(1);
      
      return { id: commission.id };
    }),

  // Update commission status (admin only)
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(['pendente', 'paga', 'cancelada']),
        paymentDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      
      await ctx.db
        .update(commissions)
        .set(updateData)
        .where(eq(commissions.id, id));

      return { success: true };
    }),

  // Delete a commission (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(commissions)
        .where(eq(commissions.id, input.id));

      return { success: true };
    }),
});
