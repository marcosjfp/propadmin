import { z } from 'zod';
import { router, protectedProcedure, agentProcedure, adminProcedure } from '../trpc.js';
import { commissions, properties, users } from '../../drizzle/schema.js';
import { eq, desc, and, or } from 'drizzle-orm';
import { createAuditLog } from './audit.js';
import { TRPCError } from '@trpc/server';

const DEFAULT_COMMISSION_RATE = {
  venda: 800,
  aluguel: 1000,
} as const;

function resolveCommissionRate(inputRate: number | undefined, customRate: number | null, transactionType: 'venda' | 'aluguel') {
  if (inputRate !== undefined) {
    return inputRate;
  }
  if (customRate !== null) {
    return customRate;
  }
  return DEFAULT_COMMISSION_RATE[transactionType];
}

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
      // Buscar propriedade + validar permissão
      const [property] = await ctx.db
        .select()
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);

      if (!property) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Propriedade não encontrada' });
      }

      const canManageProperty =
        ctx.user.role === 'admin' ||
        property.agentId === ctx.user.id ||
        property.assignedAgentId === ctx.user.id;

      if (!canManageProperty) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para registrar transação deste imóvel' });
      }

      if (!property.isApproved || property.status !== 'ativa') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas imóveis ativos e aprovados podem gerar comissão' });
      }

      if (property.transactionType !== input.transactionType) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tipo de transação inválido para este imóvel' });
      }

      if (input.commissionRate !== undefined && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem definir taxa manual na transação' });
      }

      const [existingCommission] = await ctx.db
        .select({ id: commissions.id })
        .from(commissions)
        .where(
          and(
            eq(commissions.propertyId, input.propertyId),
            or(eq(commissions.status, 'pendente'), eq(commissions.status, 'paga'))
          )
        )
        .limit(1);

      if (existingCommission) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Este imóvel já possui uma comissão registrada' });
      }

      const commissionRate = resolveCommissionRate(
        input.commissionRate,
        property.customCommissionRate,
        input.transactionType
      );

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

  // Register transaction and mark property as sold/rented atomically
  registerTransaction: agentProcedure
    .input(
      z.object({
        propertyId: z.number(),
        transactionAmount: z.number().int().min(1000, 'Valor minimo: R$ 10,00').max(100000000000, 'Valor maximo excedido'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [property] = await ctx.db
        .select()
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);

      if (!property) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Propriedade nao encontrada' });
      }

      const canManageProperty =
        ctx.user.role === 'admin' ||
        property.agentId === ctx.user.id ||
        property.assignedAgentId === ctx.user.id;

      if (!canManageProperty) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissao para registrar transacao deste imovel' });
      }

      if (!property.isApproved || property.status !== 'ativa') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas imoveis ativos e aprovados podem ser finalizados' });
      }

      const [existingCommission] = await ctx.db
        .select({ id: commissions.id })
        .from(commissions)
        .where(
          and(
            eq(commissions.propertyId, input.propertyId),
            or(eq(commissions.status, 'pendente'), eq(commissions.status, 'paga'))
          )
        )
        .limit(1);

      if (existingCommission) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Este imovel ja possui uma comissao registrada' });
      }

      const commissionRate = resolveCommissionRate(undefined, property.customCommissionRate, property.transactionType);
      const commissionAmount = Math.floor((input.transactionAmount * commissionRate) / 10000);
      const newStatus = property.transactionType === 'venda' ? 'vendida' : 'alugada';

      await ctx.db.transaction(async (tx) => {
        await tx
          .insert(commissions)
          .values({
            propertyId: property.id,
            agentId: ctx.user.id,
            transactionType: property.transactionType,
            transactionAmount: input.transactionAmount,
            commissionRate,
            commissionAmount,
            status: 'pendente',
          });

        await tx
          .update(properties)
          .set({ status: newStatus })
          .where(eq(properties.id, property.id));
      });

      const [commission] = await ctx.db
        .select()
        .from(commissions)
        .where(eq(commissions.propertyId, property.id))
        .orderBy(desc(commissions.id))
        .limit(1);

      await createAuditLog({
        ctx,
        action: 'commission_created',
        entityType: 'commission',
        entityId: commission.id,
        entityName: property.title,
        newValue: {
          transactionType: property.transactionType,
          transactionAmount: input.transactionAmount,
          commissionRate,
          commissionAmount,
        },
        description: `Comissao de R$ ${(commissionAmount / 100).toFixed(2)} (${commissionRate / 100}%) criada para ${property.transactionType} do imovel "${property.title}"`,
      });

      await createAuditLog({
        ctx,
        action: property.transactionType === 'venda' ? 'property_sold' : 'property_rented',
        entityType: 'property',
        entityId: property.id,
        entityName: property.title,
        previousValue: { status: property.status },
        newValue: { status: newStatus },
        description: `Status do imovel "${property.title}" alterado para "${newStatus}"`,
      });

      return {
        success: true,
        propertyId: property.id,
        transactionType: property.transactionType,
        transactionAmount: input.transactionAmount,
        commissionRate,
        commissionAmount,
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
