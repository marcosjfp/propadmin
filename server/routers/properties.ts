import { idSchema, propertyStatuses, propertyTypes, transactionTypes } from '../../shared/validation.js';
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, agentProcedure, adminProcedure } from '../trpc.js';
import { users, properties as propertiesSchema } from '../../drizzle/schema.js';
import { eq, and, desc, or, sql, isNull } from 'drizzle-orm';
import { createAuditLog } from './audit.js';
import { alias } from 'drizzle-orm/pg-core';
import { TRPCError } from '@trpc/server';

// Alias para join com usuário atribuído
const assignedAgent = alias(users, 'assignedAgent');

// Campos padrão do imóvel compartilhados entre queries
const propertySelectFields = {
  id: propertiesSchema.id,
  title: propertiesSchema.title,
  description: propertiesSchema.description,
  type: propertiesSchema.type,
  transactionType: propertiesSchema.transactionType,
  price: propertiesSchema.price,
  size: propertiesSchema.size,
  rooms: propertiesSchema.rooms,
  bathrooms: propertiesSchema.bathrooms,
  hasBackyard: propertiesSchema.hasBackyard,
  hasLivingRoom: propertiesSchema.hasLivingRoom,
  hasKitchen: propertiesSchema.hasKitchen,
  address: propertiesSchema.address,
  city: propertiesSchema.city,
  state: propertiesSchema.state,
  zipCode: propertiesSchema.zipCode,
  agentId: propertiesSchema.agentId,
  assignedAgentId: propertiesSchema.assignedAgentId,
  customCommissionRate: propertiesSchema.customCommissionRate,
  status: propertiesSchema.status,
  isApproved: propertiesSchema.isApproved,
  createdAt: propertiesSchema.createdAt,
  updatedAt: propertiesSchema.updatedAt,
};

export const propertiesRouter = router({
  // List all active AND approved properties with agent info (public)
  list: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        ...propertySelectFields,
        agentName: users.name,
        agentEmail: users.email,
        agentCreci: users.creci,
      })
      .from(propertiesSchema)
      .leftJoin(users, eq(propertiesSchema.agentId, users.id))
      .where(and(isNull(propertiesSchema.deletedAt), eq(propertiesSchema.status, 'ativa'), eq(propertiesSchema.isApproved, true)))
      .orderBy(desc(propertiesSchema.createdAt));
    return result;
  }),

  // List properties with pagination (protected)
  // Admins see all. Agents see active + their own. Users see only active.
  listAll: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
      search: z.string().max(200).optional(),
      status: z.enum([...propertyStatuses, 'todos', 'all']).optional(),
      type: z.enum([...propertyTypes, 'todos', 'all']).optional(),
      transactionType: z.enum([...transactionTypes, 'todos', 'all']).optional(),
      city: z.string().max(100).optional(),
      minPrice: z.number().nonnegative().max(1000000000).optional(),
      maxPrice: z.number().nonnegative().max(1000000000).optional(),
      minRooms: z.number().int().nonnegative().max(1000).optional(),
    }).optional().default({ page: 1, pageSize: 20 }))
    .query(async ({ ctx, input }) => {
      const {
        page, pageSize, search, status, type, transactionType,
        city, minPrice, maxPrice, minRooms
      } = input;
      const offset = (page - 1) * pageSize;

      const whereConditions: ReturnType<typeof or>[] = [isNull(propertiesSchema.deletedAt)];
      if (search) {
        whereConditions.push(
          or(
            sql`${propertiesSchema.title} ILIKE ${`%${search}%`}`,
            sql`${propertiesSchema.address} ILIKE ${`%${search}%`}`,
            sql`${propertiesSchema.description} ILIKE ${`%${search}%`}`,
            sql`${propertiesSchema.city} ILIKE ${`%${search}%`}`,
            sql`${propertiesSchema.id}::text = ${search}`
          )
        );
      }
      if (status && status !== 'todos' && status !== 'all') {
        whereConditions.push(eq(propertiesSchema.status, status as any));
      }
      if (type && type !== 'todos' && type !== 'all') {
        whereConditions.push(eq(propertiesSchema.type, type as any));
      }
      if (transactionType && transactionType !== 'todos' && transactionType !== 'all') {
        whereConditions.push(eq(propertiesSchema.transactionType, transactionType as any));
      }
      if (city && city !== 'todos' && city !== 'all') {
        whereConditions.push(eq(propertiesSchema.city, city));
      }
      if (minPrice !== undefined) {
        whereConditions.push(sql`${propertiesSchema.price} >= ${minPrice * 100}`);
      }
      if (maxPrice !== undefined) {
        whereConditions.push(sql`${propertiesSchema.price} <= ${maxPrice * 100}`);
      }
      if (minRooms !== undefined) {
        whereConditions.push(sql`${propertiesSchema.rooms} >= ${minRooms}`);
      }

      const roleFilters = [];
      if (ctx.user.role === 'admin') {
        // Admins see everything matching other filters
      } else if (ctx.user.role === 'agent') {
        // Agents see active properties OR their own properties
        roleFilters.push(
          or(
            and(isNull(propertiesSchema.deletedAt), eq(propertiesSchema.status, 'ativa'), eq(propertiesSchema.isApproved, true)),
            eq(propertiesSchema.agentId, ctx.user.id),
            eq(propertiesSchema.assignedAgentId, ctx.user.id)
          )
        );
      } else {
        // Regular users only see active & approved properties
        roleFilters.push(
          and(isNull(propertiesSchema.deletedAt), eq(propertiesSchema.status, 'ativa'), eq(propertiesSchema.isApproved, true))
        );
      }

      const allConditions = [...whereConditions, ...roleFilters];
      const finalWhere = allConditions.length > 0 ? and(...allConditions) : undefined;

      const items = await ctx.db
        .select({
          ...propertySelectFields,
          approvedBy: propertiesSchema.approvedBy,
          approvedAt: propertiesSchema.approvedAt,
          rejectionReason: propertiesSchema.rejectionReason,
          agentName: users.name,
          agentEmail: users.email,
          agentCreci: users.creci,
          assignedAgentName: assignedAgent.name,
          assignedAgentEmail: assignedAgent.email,
        })
        .from(propertiesSchema)
        .leftJoin(users, eq(propertiesSchema.agentId, users.id))
        .leftJoin(assignedAgent, eq(propertiesSchema.assignedAgentId, assignedAgent.id))
        .where(finalWhere)
        .orderBy(desc(propertiesSchema.createdAt))
        .limit(pageSize)
        .offset(offset);

      const [countResult] = await ctx.db
        .select({ count: sql`count(*)` })
        .from(propertiesSchema)
        .where(finalWhere);

      return {
        items,
        totalCount: Number(countResult.count),
        page,
        pageSize,
        totalPages: Math.ceil(Number(countResult.count) / pageSize)
      };
    }),

  // List pending approval properties (admin only)
  listPending: adminProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        ...propertySelectFields,
        agentName: users.name,
        agentEmail: users.email,
        agentCreci: users.creci,
      })
      .from(propertiesSchema)
      .leftJoin(users, eq(propertiesSchema.agentId, users.id))
      .where(
        and(
          isNull(propertiesSchema.deletedAt),
          eq(propertiesSchema.status, 'pendente'),
          eq(propertiesSchema.isApproved, false)
        )
      )
      .orderBy(desc(propertiesSchema.createdAt));
    return result;
  }),

  // Get properties for the logged-in agent (inclui criados por ele OU atribuídos a ele)
  myProperties: agentProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        ...propertySelectFields,
        rejectionReason: propertiesSchema.rejectionReason,
      })
      .from(propertiesSchema)
      .where(
        and(isNull(propertiesSchema.deletedAt), or(
          eq(propertiesSchema.agentId, ctx.user.id),
          eq(propertiesSchema.assignedAgentId, ctx.user.id)
        ))
      )
      .orderBy(desc(propertiesSchema.createdAt));
    return result;
  }),

  // Get a single property by ID
  getById: publicProcedure
    .input(z.object({ id: idSchema }))
    .query(async ({ ctx, input }) => {
      const [property] = await ctx.db
        .select({
          ...propertySelectFields,
          agentName: users.name,
          agentEmail: users.email,
          agentCreci: users.creci,
          assignedAgentName: assignedAgent.name,
        })
        .from(propertiesSchema)
        .leftJoin(users, eq(propertiesSchema.agentId, users.id))
        .leftJoin(assignedAgent, eq(propertiesSchema.assignedAgentId, assignedAgent.id))
        .where(and(eq(propertiesSchema.id, input.id),isNull(propertiesSchema.deletedAt)))
        .limit(1);

      if (!property) {
        return null;
      }

      const isPubliclyVisible = property.status === 'ativa' && property.isApproved;
      if (ctx.user?.role === 'admin' || isPubliclyVisible) {
        return property;
      }

      if (
        ctx.user?.role === 'agent' &&
        (property.agentId === ctx.user.id || property.assignedAgentId === ctx.user.id)
      ) {
        return property;
      }

      return null;
    }),

  // Create a new property (agent only - will be pending approval unless admin)
  create: agentProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(255),
        description: z.string().max(10000).optional(),
        type: z.enum(['apartamento', 'casa', 'terreno', 'comercial', 'outro']),
        transactionType: z.enum(['venda', 'aluguel']),
        price: z.number().int().positive().max(100000000000),
        size: z.number().int().positive().max(2147483647),
        rooms: z.number().int().min(0).max(1000),
        bathrooms: z.number().int().min(0).max(1000),
        hasBackyard: z.boolean(),
        hasLivingRoom: z.boolean(),
        hasKitchen: z.boolean(),
        address: z.string().trim().min(1).max(500),
        city: z.string().trim().min(1).max(100),
        state: z.string().length(2),
        zipCode: z.string().max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === 'admin';

      try {
        const [property] = await ctx.db
          .insert(propertiesSchema)
          .values({
            title: input.title,
            description: input.description,
            type: input.type,
            transactionType: input.transactionType,
            price: input.price,
            size: input.size,
            rooms: input.rooms,
            bathrooms: input.bathrooms,
            hasBackyard: input.hasBackyard,
            hasLivingRoom: input.hasLivingRoom,
            hasKitchen: input.hasKitchen,
            address: input.address,
            city: input.city,
            state: input.state,
            zipCode: input.zipCode,
            agentId: ctx.user.id,
            status: isAdmin ? 'ativa' : 'pendente',
            isApproved: isAdmin,
          }).returning();

        // Registrar no histórico
        await createAuditLog({
          ctx,
          action: 'property_created',
          entityType: 'property',
          entityId: property.id,
          entityName: property.title,
          description: `Imóvel "${input.title}" criado por ${ctx.user.name || ctx.user.email}`,
        });

        return {
          id: property.id,
          status: property.status,
          isApproved: property.isApproved,
          needsApproval: !isAdmin
        };
      } catch (error) {
        console.error("Error creating property:", error);
        throw error;
      }
    }),

  // Update a property (agent only, own properties)
  update: agentProcedure
    .input(
      z.object({
        id: idSchema,
        title: z.string().trim().min(1).max(255).optional(),
        description: z.string().max(10000).optional(),
        type: z.enum(['apartamento', 'casa', 'terreno', 'comercial', 'outro']).optional(),
        transactionType: z.enum(['venda', 'aluguel']).optional(),
        price: z.number().int().positive().max(100000000000).optional(),
        size: z.number().int().positive().max(2147483647).optional(),
        rooms: z.number().int().min(0).max(1000).optional(),
        bathrooms: z.number().int().min(0).max(1000).optional(),
        hasBackyard: z.boolean().optional(),
        hasLivingRoom: z.boolean().optional(),
        hasKitchen: z.boolean().optional(),
        address: z.string().trim().min(1).max(500).optional(),
        city: z.string().trim().min(1).max(100).optional(),
        state: z.string().length(2).optional(),
        zipCode: z.string().max(10).optional(),
        status: z.enum(['pendente', 'ativa', 'vendida', 'alugada', 'inativa', 'rejeitada']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => ctx.db.transaction(async tx => {
      ctx = {...ctx, db: tx as typeof ctx.db};
      const { id, ...updateData } = input;

      // Check if property belongs to agent or is assigned to them
      const [property] = await ctx.db
        .select()
        .from(propertiesSchema)
        .where(
          and(
            and(eq(propertiesSchema.id, id),isNull(propertiesSchema.deletedAt)),
            ctx.user.role === 'admin' ? undefined : or(
              eq(propertiesSchema.agentId, ctx.user.id),
              eq(propertiesSchema.assignedAgentId, ctx.user.id)
            )
          )
        )
        .limit(1).for('update');

      if (!property) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Propriedade não encontrada ou você não tem permissão para editá-la' });
      }

      if (updateData.status && updateData.status !== property.status) {
        if (updateData.status === 'pendente' || updateData.status === 'rejeitada') {
          throw new TRPCError({code:'BAD_REQUEST',message:'Use o fluxo de aprovação para revisar o imóvel'});
        }
        if (updateData.status === 'vendida' || updateData.status === 'alugada') {
          throw new TRPCError({code:'BAD_REQUEST',message:'Use Registrar Transação para finalizar o imóvel e sua comissão'});
        }
        if (ctx.user.role !== 'admin' && updateData.status !== 'inativa') {
          throw new TRPCError({code:'FORBIDDEN',message:'Agentes só podem inativar o imóvel; aprovação exige administrador'});
        }
        if (updateData.status === 'ativa' && !property.isApproved) {
          throw new TRPCError({code:'BAD_REQUEST',message:'Aprove o imóvel antes de ativá-lo'});
        }
      }
      if (['vendida','alugada'].includes(property.status) && (updateData.status || updateData.transactionType)) {
        if (updateData.status !== undefined && updateData.status !== property.status || updateData.transactionType !== undefined && updateData.transactionType !== property.transactionType) {
          throw new TRPCError({code:'CONFLICT',message:'Uma transação finalizada não pode ser alterada pela edição do imóvel'});
        }
      }

      // Detectar mudança de status
      const statusChanged = updateData.status && updateData.status !== property.status;
      const previousStatus = property.status;

      await ctx.db
        .update(propertiesSchema)
        .set({...updateData,...(property.status === 'rejeitada' && (!updateData.status || updateData.status === property.status) ? {status:'pendente' as const,isApproved:false,rejectionReason:null} : {})})
        .where(and(eq(propertiesSchema.id, id),isNull(propertiesSchema.deletedAt)));

      // Registrar no histórico
      if (statusChanged) {
        const actionMap: Record<string, any> = {
          'vendida': 'property_sold',
          'alugada': 'property_rented',
        };
        const action = (actionMap[updateData.status!] || 'property_status_changed') as any;

        await createAuditLog({
          ctx,
          action,
          entityType: 'property',
          entityId: id,
          entityName: property.title,
          previousValue: { status: previousStatus },
          newValue: { status: updateData.status },
          description: `Status do imóvel "${property.title}" alterado de "${previousStatus}" para "${updateData.status}"`,
        });
      } else {
        await createAuditLog({
          ctx,
          action: 'property_updated',
          entityType: 'property',
          entityId: id,
          entityName: property.title,
          previousValue: property,
          newValue: updateData,
          description: `Imóvel "${property.title}" atualizado`,
        });
      }

      return { success: true };
    })),

  // Delete a property (agent only, own properties)
  delete: agentProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ ctx, input }) => ctx.db.transaction(async tx => {
      ctx = {...ctx, db: tx as typeof ctx.db};
      // Check if property belongs to agent or is assigned to them
      const [property] = await ctx.db
        .select()
        .from(propertiesSchema)
        .where(
          and(
            and(eq(propertiesSchema.id, input.id),isNull(propertiesSchema.deletedAt)),
            ctx.user.role === 'admin' ? undefined : or(
              eq(propertiesSchema.agentId, ctx.user.id),
              eq(propertiesSchema.assignedAgentId, ctx.user.id)
            )
          )
        )
        .limit(1).for('update');

      if (!property) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Propriedade não encontrada ou você não tem permissão para deletá-la' });
      }

      await ctx.db
        .update(propertiesSchema)
        .set({deletedAt:new Date()})
        .where(and(eq(propertiesSchema.id, input.id),isNull(propertiesSchema.deletedAt)));

      // Registrar no histórico
      await createAuditLog({
        ctx,
        action: 'property_deleted',
        entityType: 'property',
        entityId: input.id,
        entityName: property.title,
        previousValue: property,
        description: `Imóvel "${property.title}" arquivado; histórico financeiro preservado`,
      });

      return { success: true };
    })),

  // Atribuir imóvel a um corretor (admin only)
  assignAgent: adminProcedure
    .input(z.object({
      propertyId: idSchema,
      assignedAgentId: idSchema.nullable(),
    }))
    .mutation(async ({ ctx, input }) => ctx.db.transaction(async tx => {
      ctx = {...ctx, db: tx as typeof ctx.db};
      // Buscar propriedade atual
      const [property] = await ctx.db
        .select()
        .from(propertiesSchema)
        .where(and(eq(propertiesSchema.id, input.propertyId),isNull(propertiesSchema.deletedAt)))
        .limit(1).for('update');

      if (!property) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Propriedade não encontrada' });
      }

      // Se está atribuindo a um agente, verificar se o agente existe
      let assignedAgentName = null;
      if (input.assignedAgentId) {
        const [agent] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.id, input.assignedAgentId))
          .limit(1).for('share');

        if (!agent) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Corretor não encontrado' });
        }

        if (agent.deletedAt || agent.status !== 'active' || (agent.role !== 'agent' && agent.role !== 'admin')) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'O usuário selecionado não é um corretor' });
        }

        assignedAgentName = agent.name;
      }

      // Buscar nome do agente anterior se existia
      let previousAgentName = null;
      if (property.assignedAgentId) {
        const [prevAgent] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.id, property.assignedAgentId))
          .limit(1);
        previousAgentName = prevAgent?.name;
      }

      // Atualizar propriedade
      await ctx.db
        .update(propertiesSchema)
        .set({ assignedAgentId: input.assignedAgentId })
        .where(and(eq(propertiesSchema.id, input.propertyId),isNull(propertiesSchema.deletedAt)));

      // Registrar no histórico
      await createAuditLog({
        ctx,
        action: 'property_assigned',
        entityType: 'property',
        entityId: input.propertyId,
        entityName: property.title,
        previousValue: { assignedAgentId: property.assignedAgentId, assignedAgentName: previousAgentName },
        newValue: { assignedAgentId: input.assignedAgentId, assignedAgentName },
        description: input.assignedAgentId
          ? `Imóvel "${property.title}" atribuído ao corretor ${assignedAgentName}`
          : `Atribuição do imóvel "${property.title}" removida`,
      });

      return {
        success: true,
        assignedAgentName,
        message: input.assignedAgentId
          ? `Imóvel atribuído com sucesso ao corretor ${assignedAgentName}`
          : 'Atribuição removida com sucesso'
      };
    })),

  // Definir comissão customizada (admin only)
  setCustomCommission: adminProcedure
    .input(z.object({
      propertyId: idSchema,
      customCommissionRate: z.number().int().min(0).max(10000).nullable(), // 0% a 100%, null = usar padrão
    }))
    .mutation(async ({ ctx, input }) => ctx.db.transaction(async tx => {
      ctx = {...ctx, db: tx as typeof ctx.db};
      // Buscar propriedade atual
      const [property] = await ctx.db
        .select()
        .from(propertiesSchema)
        .where(and(eq(propertiesSchema.id, input.propertyId),isNull(propertiesSchema.deletedAt)))
        .limit(1).for('update');

      if (!property) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Propriedade não encontrada' });
      }

      const previousRate = property.customCommissionRate;

      // Atualizar propriedade
      await ctx.db
        .update(propertiesSchema)
        .set({ customCommissionRate: input.customCommissionRate })
        .where(and(eq(propertiesSchema.id, input.propertyId),isNull(propertiesSchema.deletedAt)));

      // Registrar no histórico
      const getCommissionLabel = (rate: number | null, transactionType: string) => {
        if (rate === null) {
          return transactionType === 'venda' ? '8% (padrão)' : '10% (padrão)';
        }
        return `${rate / 100}% (customizada)`;
      };

      await createAuditLog({
        ctx,
        action: 'property_commission_changed',
        entityType: 'property',
        entityId: input.propertyId,
        entityName: property.title,
        previousValue: { customCommissionRate: previousRate },
        newValue: { customCommissionRate: input.customCommissionRate },
        description: `Comissão do imóvel "${property.title}" alterada de ${getCommissionLabel(previousRate, property.transactionType)} para ${getCommissionLabel(input.customCommissionRate, property.transactionType)}`,
      });

      return {
        success: true,
        customCommissionRate: input.customCommissionRate,
        message: input.customCommissionRate !== null
          ? `Comissão customizada definida: ${input.customCommissionRate / 100}%`
          : 'Comissão restaurada ao padrão'
      };
    })),

  // Aprovar imóvel pendente (admin only)
  approve: adminProcedure
    .input(z.object({
      propertyId: idSchema,
    }))
    .mutation(async ({ ctx, input }) => ctx.db.transaction(async tx => {
      ctx = {...ctx, db: tx as typeof ctx.db};
      // Buscar propriedade atual
      const [property] = await ctx.db
        .select()
        .from(propertiesSchema)
        .where(and(eq(propertiesSchema.id, input.propertyId),isNull(propertiesSchema.deletedAt)))
        .limit(1).for('update');

      if (!property) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Propriedade não encontrada' });
      }

      if (property.isApproved || property.status !== 'pendente') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta propriedade já está aprovada' });
      }

      // Buscar nome do agente que criou
      let agentName = 'Desconhecido';
      if (property.agentId) {
        const [agent] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.id, property.agentId))
          .limit(1);
        agentName = agent?.name || 'Desconhecido';
      }

      // Atualizar propriedade
      await ctx.db
        .update(propertiesSchema)
        .set({
          isApproved: true,
          status: 'ativa',
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          rejectionReason: null,
        })
        .where(and(eq(propertiesSchema.id, input.propertyId),isNull(propertiesSchema.deletedAt)));

      // Registrar no histórico
      await createAuditLog({
        ctx,
        action: 'property_approved',
        entityType: 'property',
        entityId: input.propertyId,
        entityName: property.title,
        previousValue: { status: property.status, isApproved: false },
        newValue: { status: 'ativa', isApproved: true },
        description: `Imóvel "${property.title}" criado por ${agentName} foi aprovado`,
      });

      return {
        success: true,
        message: `Imóvel "${property.title}" aprovado com sucesso!`
      };
    })),

  // Rejeitar imóvel pendente (admin only)
  reject: adminProcedure
    .input(z.object({
      propertyId: idSchema,
      reason: z.string().max(2000).min(1, 'É necessário informar o motivo da rejeição'),
    }))
    .mutation(async ({ ctx, input }) => ctx.db.transaction(async tx => {
      ctx = {...ctx, db: tx as typeof ctx.db};
      // Buscar propriedade atual
      const [property] = await ctx.db
        .select()
        .from(propertiesSchema)
        .where(and(eq(propertiesSchema.id, input.propertyId),isNull(propertiesSchema.deletedAt)))
        .limit(1).for('update');

      if (!property) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Propriedade não encontrada' });
      }

      if (property.isApproved || property.status !== 'pendente') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não é possível rejeitar uma propriedade já aprovada' });
      }

      // Buscar nome do agente que criou
      let agentName = 'Desconhecido';
      if (property.agentId) {
        const [agent] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.id, property.agentId))
          .limit(1);
        agentName = agent?.name || 'Desconhecido';
      }

      // Atualizar propriedade
      await ctx.db
        .update(propertiesSchema)
        .set({
          status: 'rejeitada',
          rejectionReason: input.reason,
        })
        .where(and(eq(propertiesSchema.id, input.propertyId),isNull(propertiesSchema.deletedAt)));

      // Registrar no histórico
      await createAuditLog({
        ctx,
        action: 'property_rejected',
        entityType: 'property',
        entityId: input.propertyId,
        entityName: property.title,
        previousValue: { status: property.status },
        newValue: { status: 'rejeitada', rejectionReason: input.reason },
        description: `Imóvel "${property.title}" criado por ${agentName} foi rejeitado. Motivo: ${input.reason}`,
      });

      return {
        success: true,
        message: `Imóvel "${property.title}" rejeitado`
      };
    })),

  // List all unique cities where properties are located
  listCities: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .selectDistinct({ city: propertiesSchema.city })
      .from(propertiesSchema)
      .where(and(isNull(propertiesSchema.deletedAt), eq(propertiesSchema.status, 'ativa'), eq(propertiesSchema.isApproved, true)))
      .orderBy(propertiesSchema.city);
    return result.map(r => r.city).filter(Boolean);
  }),
});
