import { z } from 'zod';
import { router, protectedProcedure, agentProcedure, adminProcedure } from '../trpc.js';
import { commissions, properties, users } from '../../drizzle/schema.js';
import { eq, desc } from 'drizzle-orm';
import { createAuditLog } from './audit.js';

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

  // Get a single commission by ID (verifica permissão)
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [commission] = await ctx.db
        .select()
        .from(commissions)
        .where(eq(commissions.id, input.id))
        .limit(1);
      
      if (!commission) {
        throw new Error('Comissão não encontrada');
      }

      // Verificar permissão: admin pode ver qualquer uma, agente só as próprias
      if (ctx.user.role !== 'admin' && commission.agentId !== ctx.user.id) {
        throw new Error('Você não tem permissão para ver esta comissão');
      }

      return commission;
    }),

  // Create a new commission (agent only)
  create: agentProcedure
    .input(
      z.object({
        propertyId: z.number(),
        transactionType: z.enum(['venda', 'aluguel']),
        transactionAmount: z.number().int().min(1000, 'Valor mínimo: R$ 10,00').max(100000000000, 'Valor máximo excedido'), // Min R$10, Max R$1B
        commissionRate: z.number().int().min(0).max(10000).optional(), // Se não fornecido, usa o da propriedade ou padrão
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Buscar info da propriedade para o log e para verificar comissão customizada
      const [property] = await ctx.db
        .select()
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);

      if (!property) {
        throw new Error('Propriedade não encontrada');
      }

      // Determinar taxa de comissão:
      // 1. Se fornecido no input, usa o do input
      // 2. Se há customCommissionRate na propriedade, usa esse
      // 3. Caso contrário, usa padrão (800 para venda = 8%, 1000 para aluguel = 10%)
      let commissionRate: number;
      if (input.commissionRate !== undefined) {
        commissionRate = input.commissionRate;
      } else if (property.customCommissionRate !== null) {
        commissionRate = property.customCommissionRate;
      } else {
        commissionRate = input.transactionType === 'venda' ? 800 : 1000;
      }

      // Calculate commission amount
      const commissionAmount = Math.floor((input.transactionAmount * commissionRate) / 10000);

      await ctx.db
        .insert(commissions)
        .values({
          propertyId: input.propertyId,
          agentId: ctx.user.id,
          transactionType: input.transactionType,
          transactionAmount: input.transactionAmount,
          commissionRate,
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
      
      // Registrar no histórico
      await createAuditLog({
        ctx,
        action: 'commission_created',
        entityType: 'commission',
        entityId: commission.id,
        entityName: property?.title || `Propriedade #${input.propertyId}`,
        newValue: { ...input, commissionAmount, commissionRate, id: commission.id },
        description: `Comissão de R$ ${(commissionAmount / 100).toFixed(2)} (${commissionRate / 100}%) criada para ${input.transactionType} do imóvel "${property?.title || input.propertyId}"`,
      });
      
      return { 
        id: commission.id,
        commissionRate,
        commissionAmount,
        transactionAmount: input.transactionAmount,
      };
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
      
      // Buscar comissão atual para log
      const [currentCommission] = await ctx.db
        .select({
          commission: commissions,
          property: properties,
        })
        .from(commissions)
        .leftJoin(properties, eq(commissions.propertyId, properties.id))
        .where(eq(commissions.id, id))
        .limit(1);
      
      await ctx.db
        .update(commissions)
        .set(updateData)
        .where(eq(commissions.id, id));

      // Registrar no histórico
      if (currentCommission) {
        const actionMap: Record<string, any> = {
          'paga': 'commission_paid',
          'cancelada': 'commission_cancelled',
        };
        const action = actionMap[input.status] || 'commission_status_changed';
        
        await createAuditLog({
          ctx,
          action,
          entityType: 'commission',
          entityId: id,
          entityName: currentCommission.property?.title || `Comissão #${id}`,
          previousValue: { status: currentCommission.commission.status },
          newValue: { status: input.status, paymentDate: input.paymentDate },
          description: `Status da comissão do imóvel "${currentCommission.property?.title}" alterado de "${currentCommission.commission.status}" para "${input.status}"`,
        });
      }

      return { success: true };
    }),

  // Delete a commission (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Buscar comissão atual para log
      const [currentCommission] = await ctx.db
        .select({
          commission: commissions,
          property: properties,
        })
        .from(commissions)
        .leftJoin(properties, eq(commissions.propertyId, properties.id))
        .where(eq(commissions.id, input.id))
        .limit(1);

      await ctx.db
        .delete(commissions)
        .where(eq(commissions.id, input.id));

      // Registrar no histórico
      if (currentCommission) {
        await createAuditLog({
          ctx,
          action: 'commission_cancelled',
          entityType: 'commission',
          entityId: input.id,
          entityName: currentCommission.property?.title || `Comissão #${input.id}`,
          previousValue: currentCommission.commission,
          description: `Comissão #${input.id} do imóvel "${currentCommission.property?.title || 'N/A'}" foi excluída`,
        });
      }

      return { success: true };
    }),
});
