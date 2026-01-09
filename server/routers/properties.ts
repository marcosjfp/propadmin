import { z } from 'zod';
import { router, publicProcedure, agentProcedure, adminProcedure } from '../trpc.js';
import { users, properties as propertiesSchema } from '../../drizzle/schema.js';
import { eq, and, desc, or } from 'drizzle-orm';
import { createAuditLog } from './audit.js';
import { alias } from 'drizzle-orm/mysql-core';

// Alias para join com usuário atribuído
const assignedAgent = alias(users, 'assignedAgent');

export const propertiesRouter = router({
  // List all active AND approved properties with agent info (public)
  list: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
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
        agentName: users.name,
        agentEmail: users.email,
        agentCreci: users.creci,
      })
      .from(propertiesSchema)
      .leftJoin(users, eq(propertiesSchema.agentId, users.id))
      .where(
        and(
          eq(propertiesSchema.status, 'ativa'),
          eq(propertiesSchema.isApproved, true)
        )
      )
      .orderBy(desc(propertiesSchema.createdAt));
    return result;
  }),

  // List all properties (admin only) - includes pending approval
  listAll: adminProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
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
        approvedBy: propertiesSchema.approvedBy,
        approvedAt: propertiesSchema.approvedAt,
        rejectionReason: propertiesSchema.rejectionReason,
        createdAt: propertiesSchema.createdAt,
        updatedAt: propertiesSchema.updatedAt,
        agentName: users.name,
        agentEmail: users.email,
        agentCreci: users.creci,
        assignedAgentName: assignedAgent.name,
        assignedAgentEmail: assignedAgent.email,
      })
      .from(propertiesSchema)
      .leftJoin(users, eq(propertiesSchema.agentId, users.id))
      .leftJoin(assignedAgent, eq(propertiesSchema.assignedAgentId, assignedAgent.id))
      .orderBy(desc(propertiesSchema.createdAt));
    return result;
  }),

  // List pending approval properties (admin only)
  listPending: adminProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
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
        status: propertiesSchema.status,
        isApproved: propertiesSchema.isApproved,
        createdAt: propertiesSchema.createdAt,
        updatedAt: propertiesSchema.updatedAt,
        agentName: users.name,
        agentEmail: users.email,
        agentCreci: users.creci,
      })
      .from(propertiesSchema)
      .leftJoin(users, eq(propertiesSchema.agentId, users.id))
      .where(
        and(
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
        rejectionReason: propertiesSchema.rejectionReason,
        createdAt: propertiesSchema.createdAt,
        updatedAt: propertiesSchema.updatedAt,
      })
      .from(propertiesSchema)
      .where(
        or(
          eq(propertiesSchema.agentId, ctx.user.id),
          eq(propertiesSchema.assignedAgentId, ctx.user.id)
        )
      )
      .orderBy(desc(propertiesSchema.createdAt));
    return result;
  }),

  // Get a single property by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [property] = await ctx.db
        .select({
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
          createdAt: propertiesSchema.createdAt,
          updatedAt: propertiesSchema.updatedAt,
          agentName: users.name,
          agentEmail: users.email,
          agentCreci: users.creci,
          assignedAgentName: assignedAgent.name,
        })
        .from(propertiesSchema)
        .leftJoin(users, eq(propertiesSchema.agentId, users.id))
        .leftJoin(assignedAgent, eq(propertiesSchema.assignedAgentId, assignedAgent.id))
        .where(eq(propertiesSchema.id, input.id))
        .limit(1);
      return property;
    }),

  // Create a new property (agent only - will be pending approval unless admin)
  create: agentProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(['apartamento', 'casa', 'terreno', 'comercial', 'outro']),
        transactionType: z.enum(['venda', 'aluguel']),
        price: z.number().int().positive(),
        size: z.number().int().positive(),
        rooms: z.number().int().min(0),
        bathrooms: z.number().int().min(0),
        hasBackyard: z.boolean(),
        hasLivingRoom: z.boolean(),
        hasKitchen: z.boolean(),
        address: z.string().min(1),
        city: z.string().min(1),
        state: z.string().length(2),
        zipCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Creating property with input:", input);
      console.log("User:", ctx.user);
      
      // Admin creates approved properties, agents create pending ones
      const isAdmin = ctx.user.role === 'admin';
      const propertyStatus = isAdmin ? 'ativa' : 'pendente';
      const isApproved = isAdmin;
      
      try {
        // MySQL não suporta RETURNING, então inserimos e pegamos o último ID
        await ctx.db
          .insert(propertiesSchema)
          .values({
            ...input,
            agentId: ctx.user.id,
            status: propertyStatus,
            isApproved: isApproved,
            approvedBy: isAdmin ? ctx.user.id : null,
            approvedAt: isAdmin ? new Date() : null,
          });
        
        // Buscar a propriedade recém-criada pelo agentId e título (mais recente)
        const [property] = await ctx.db
          .select()
          .from(propertiesSchema)
          .where(eq(propertiesSchema.agentId, ctx.user.id))
          .orderBy(desc(propertiesSchema.id))
          .limit(1);
        
        console.log("Property created:", property);
        
        // Registrar no histórico
        await createAuditLog({
          ctx,
          action: 'property_created',
          entityType: 'property',
          entityId: property.id,
          entityName: property.title,
          newValue: { ...input, id: property.id, status: propertyStatus, isApproved },
          description: isAdmin 
            ? `Imóvel "${property.title}" criado e aprovado automaticamente em ${property.city}/${property.state}`
            : `Imóvel "${property.title}" criado e aguardando aprovação em ${property.city}/${property.state}`,
        });
        
        return { 
          id: property.id,
          status: propertyStatus,
          isApproved,
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
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        type: z.enum(['apartamento', 'casa', 'terreno', 'comercial', 'outro']).optional(),
        transactionType: z.enum(['venda', 'aluguel']).optional(),
        price: z.number().int().positive().optional(),
        size: z.number().int().positive().optional(),
        rooms: z.number().int().min(0).optional(),
        bathrooms: z.number().int().min(0).optional(),
        hasBackyard: z.boolean().optional(),
        hasLivingRoom: z.boolean().optional(),
        hasKitchen: z.boolean().optional(),
        address: z.string().min(1).optional(),
        city: z.string().min(1).optional(),
        state: z.string().length(2).optional(),
        zipCode: z.string().optional(),
        status: z.enum(['ativa', 'vendida', 'alugada', 'inativa']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      
      // Check if property belongs to agent
      const [property] = await ctx.db
        .select()
        .from(propertiesSchema)
        .where(
          and(
            eq(propertiesSchema.id, id),
            eq(propertiesSchema.agentId, ctx.user.id)
          )
        )
        .limit(1);

      if (!property) {
        throw new Error('Propriedade não encontrada ou você não tem permissão para editá-la');
      }

      // Detectar mudança de status
      const statusChanged = updateData.status && updateData.status !== property.status;
      const previousStatus = property.status;

      await ctx.db
        .update(propertiesSchema)
        .set(updateData)
        .where(eq(propertiesSchema.id, id));

      // Registrar no histórico
      if (statusChanged) {
        const actionMap: Record<string, any> = {
          'vendida': 'property_sold',
          'alugada': 'property_rented',
        };
        const action = actionMap[updateData.status!] || 'property_status_changed';
        
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
    }),

  // Delete a property (agent only, own properties)
  delete: agentProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Check if property belongs to agent
      const [property] = await ctx.db
        .select()
        .from(propertiesSchema)
        .where(
          and(
            eq(propertiesSchema.id, input.id),
            eq(propertiesSchema.agentId, ctx.user.id)
          )
        )
        .limit(1);

      if (!property) {
        throw new Error('Propriedade não encontrada ou você não tem permissão para deletá-la');
      }

      await ctx.db
        .delete(propertiesSchema)
        .where(eq(propertiesSchema.id, input.id));

      // Registrar no histórico
      await createAuditLog({
        ctx,
        action: 'property_deleted',
        entityType: 'property',
        entityId: input.id,
        entityName: property.title,
        previousValue: property,
        description: `Imóvel "${property.title}" excluído`,
      });

      return { success: true };
    }),

  // Atribuir imóvel a um corretor (admin only)
  assignAgent: adminProcedure
    .input(z.object({
      propertyId: z.number(),
      assignedAgentId: z.number().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Buscar propriedade atual
      const [property] = await ctx.db
        .select()
        .from(propertiesSchema)
        .where(eq(propertiesSchema.id, input.propertyId))
        .limit(1);

      if (!property) {
        throw new Error('Propriedade não encontrada');
      }

      // Se está atribuindo a um agente, verificar se o agente existe
      let assignedAgentName = null;
      if (input.assignedAgentId) {
        const [agent] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.id, input.assignedAgentId))
          .limit(1);

        if (!agent) {
          throw new Error('Corretor não encontrado');
        }
        
        if (agent.role !== 'agent' && agent.role !== 'admin') {
          throw new Error('O usuário selecionado não é um corretor');
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
        .where(eq(propertiesSchema.id, input.propertyId));

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
    }),

  // Definir comissão customizada (admin only)
  setCustomCommission: adminProcedure
    .input(z.object({
      propertyId: z.number(),
      customCommissionRate: z.number().min(0).max(10000).nullable(), // 0% a 100%, null = usar padrão
    }))
    .mutation(async ({ ctx, input }) => {
      // Buscar propriedade atual
      const [property] = await ctx.db
        .select()
        .from(propertiesSchema)
        .where(eq(propertiesSchema.id, input.propertyId))
        .limit(1);

      if (!property) {
        throw new Error('Propriedade não encontrada');
      }

      const previousRate = property.customCommissionRate;

      // Atualizar propriedade
      await ctx.db
        .update(propertiesSchema)
        .set({ customCommissionRate: input.customCommissionRate })
        .where(eq(propertiesSchema.id, input.propertyId));

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
        message: input.customCommissionRate 
          ? `Comissão customizada definida: ${input.customCommissionRate / 100}%`
          : 'Comissão restaurada ao padrão'
      };
    }),

  // Aprovar imóvel pendente (admin only)
  approve: adminProcedure
    .input(z.object({
      propertyId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Buscar propriedade atual
      const [property] = await ctx.db
        .select()
        .from(propertiesSchema)
        .where(eq(propertiesSchema.id, input.propertyId))
        .limit(1);

      if (!property) {
        throw new Error('Propriedade não encontrada');
      }

      if (property.isApproved) {
        throw new Error('Esta propriedade já está aprovada');
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
        .where(eq(propertiesSchema.id, input.propertyId));

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
    }),

  // Rejeitar imóvel pendente (admin only)
  reject: adminProcedure
    .input(z.object({
      propertyId: z.number(),
      reason: z.string().min(1, 'É necessário informar o motivo da rejeição'),
    }))
    .mutation(async ({ ctx, input }) => {
      // Buscar propriedade atual
      const [property] = await ctx.db
        .select()
        .from(propertiesSchema)
        .where(eq(propertiesSchema.id, input.propertyId))
        .limit(1);

      if (!property) {
        throw new Error('Propriedade não encontrada');
      }

      if (property.isApproved) {
        throw new Error('Não é possível rejeitar uma propriedade já aprovada');
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
        .where(eq(propertiesSchema.id, input.propertyId));

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
    }),
});
