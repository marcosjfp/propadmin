import { idSchema, defaultCommissionRates } from '../../shared/validation.js';
import { z } from 'zod';
import { router, agentProcedure, adminProcedure } from '../trpc.js';
import { commissions, properties, users } from '../../drizzle/schema.js';
import { eq, desc, and, or } from 'drizzle-orm';
import { createAuditLog } from './audit.js';
import type { Context } from '../context.js';
import { TRPCError } from '@trpc/server';

function resolveCommissionRate(inputRate: number | undefined, customRate: number | null, transactionType: 'venda' | 'aluguel') {
  if (inputRate !== undefined) {
    return inputRate;
  }
  if (customRate !== null) {
    return customRate;
  }
  return defaultCommissionRates[transactionType];
}

// All commission writers lock the property before validating its current state.
// The lock serializes create/registerTransaction requests for the same property.
async function recordTransaction(ctx: Context & { user: NonNullable<Context["user"]> }, input: {
  propertyId: number;
  transactionAmount: number;
  transactionType?: 'venda' | 'aluguel';
  commissionRate?: number;
}) {
  return ctx.db.transaction(async (tx) => {
    const [property] = await tx.select().from(properties)
      .where(eq(properties.id, input.propertyId)).limit(1).for('update');
    if (!property || property.deletedAt) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Propriedade não encontrada' });
    }
    if (ctx.user.role !== 'admin' && property.agentId !== ctx.user.id && property.assignedAgentId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para registrar transação deste imóvel' });
    }
    if (!property.isApproved || property.status !== 'ativa') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas imóveis ativos e aprovados podem gerar comissão' });
    }
    if (input.transactionType && property.transactionType !== input.transactionType) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tipo de transação inválido para este imóvel' });
    }
    if (input.commissionRate !== undefined && ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem definir taxa manual na transação' });
    }
    const [existing] = await tx.select({ id: commissions.id }).from(commissions)
      .where(and(eq(commissions.propertyId, property.id), or(eq(commissions.status, 'pendente'), eq(commissions.status, 'paga')))).limit(1);
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Este imóvel já possui uma comissão registrada' });
    }
    const commissionRate = resolveCommissionRate(input.commissionRate, property.customCommissionRate, property.transactionType);
    const commissionAmount = Math.round(input.transactionAmount * commissionRate / 10000);
    const beneficiaryId = property.assignedAgentId ?? property.agentId;
    const [beneficiary] = await tx.select().from(users).where(eq(users.id,beneficiaryId)).for('share');
    if (!beneficiary || beneficiary.deletedAt || beneficiary.status!=='active' || !['agent','admin'].includes(beneficiary.role)) {
      throw new TRPCError({code:'BAD_REQUEST',message:'Atribua o imóvel a um corretor ativo antes de registrar a transação'});
    }
    const [commission] = await tx.insert(commissions).values({
      propertyId: property.id,
      agentId: beneficiaryId,
      transactionType: property.transactionType,
      transactionAmount: input.transactionAmount,
      commissionRate,
      commissionAmount,
      status: 'pendente',
    }).returning();
    const newStatus = property.transactionType === 'venda' ? 'vendida' : 'alugada';
    {
      await tx.update(properties).set({ status: newStatus, updatedAt: new Date() }).where(eq(properties.id, property.id));
    }
    return { property, commission, commissionRate, commissionAmount, newStatus };
  });
}

async function changeCommission(ctx: Context, input: {id:number;status:'pendente'|'paga'|'cancelada';paymentDate?:Date}) {
  return ctx.db.transaction(async tx => {
    const [lookup] = await tx.select().from(commissions).where(eq(commissions.id,input.id));
    if (!lookup) throw new TRPCError({code:'NOT_FOUND',message:'Comissão não encontrada'});
    const [property] = await tx.select().from(properties).where(eq(properties.id,lookup.propertyId)).for('update');
    const [current] = await tx.select().from(commissions).where(eq(commissions.id,input.id)).for('update');
    if (current.status === input.status) return {success:true};
    if (current.status === 'paga' || current.status === 'cancelada') {
      throw new TRPCError({code:'CONFLICT',message:'Comissões pagas ou canceladas são registros finais e não podem ser alteradas'});
    }
    if (input.status === 'paga' && input.paymentDate && input.paymentDate > new Date()) {
      throw new TRPCError({code:'BAD_REQUEST',message:'Data do pagamento não pode estar no futuro'});
    }
    const paymentDate = input.status === 'paga' ? input.paymentDate ?? new Date() : null;
    await tx.update(commissions).set({status:input.status,paymentDate}).where(eq(commissions.id,input.id));
    // Cancellation reopens the approved property unless it was archived.
    if (input.status === 'cancelada' && property && !property.deletedAt && property.isApproved) {
      await tx.update(properties).set({status:'ativa'}).where(eq(properties.id,property.id));
    }
    await createAuditLog({ctx:{...ctx,db:tx as typeof ctx.db},action:input.status==='paga'?'commission_paid':input.status==='cancelada'?'commission_cancelled':'commission_status_changed',entityType:'commission',entityId:current.id,entityName:property?.title ?? `Comissão #${current.id}`,previousValue:{status:current.status},newValue:{status:input.status,paymentDate},description:`Comissão #${current.id}: ${current.status} → ${input.status}; histórico preservado`});
    return {success:true};
  });
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
        agent: { id: users.id, name: users.name, email: users.email, creci: users.creci },
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
  getById: agentProcedure
    .input(z.object({ id: idSchema }))
    .query(async ({ ctx, input }) => {
      const [commission] = await ctx.db
        .select()
        .from(commissions)
        .where(eq(commissions.id, input.id))
        .limit(1);
      
      if (!commission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Comissão não encontrada' });
      }

      // Verificar permissão: admin pode ver qualquer uma, agente só as próprias
      if (ctx.user.role === 'agent' && commission.agentId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para ver esta comissão' });
      }

      return commission;
    }),

  // Create a new commission (agent only)
  create: agentProcedure
    .input(
      z.object({
        propertyId: idSchema,
        transactionType: z.enum(['venda', 'aluguel']),
        transactionAmount: z.number().int().min(1000, 'Valor mínimo: R$ 10,00').max(100000000000, 'Valor máximo excedido'), // Min R$10, Max R$1B
        commissionRate: z.number().int().min(0).max(10000).optional(), // Se não fornecido, usa o da propriedade ou padrão
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { property, commission, commissionRate, commissionAmount } = await recordTransaction(ctx, { propertyId: input.propertyId, transactionAmount: input.transactionAmount, transactionType: input.transactionType, commissionRate: input.commissionRate });

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
        propertyId: idSchema,
        transactionAmount: z.number().int().min(1000, 'Valor minimo: R$ 10,00').max(100000000000, 'Valor maximo excedido'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { property, commission, commissionRate, commissionAmount, newStatus } = await recordTransaction(ctx, { propertyId: input.propertyId, transactionAmount: input.transactionAmount });

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
        id: idSchema,
        status: z.enum(['pendente', 'paga', 'cancelada']),
        paymentDate: z.date().optional(),
      })
    )
    .mutation(async ({ctx,input}) => changeCommission(ctx,input)),

  // Delete a commission (admin only)
  delete: adminProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ctx,input}) => changeCommission(ctx,{id:input.id,status:'cancelada'})),
});
