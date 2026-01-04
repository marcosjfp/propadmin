import { z } from 'zod';
import { router, publicProcedure, agentProcedure, adminProcedure } from '../trpc.js';
import { users, properties as propertiesSchema } from '../../drizzle/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { createAuditLog } from './audit.js';

export const propertiesRouter = router({
  // List all active properties with agent info (public)
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
        status: propertiesSchema.status,
        createdAt: propertiesSchema.createdAt,
        updatedAt: propertiesSchema.updatedAt,
        agentName: users.name,
        agentEmail: users.email,
        agentCreci: users.creci,
      })
      .from(propertiesSchema)
      .leftJoin(users, eq(propertiesSchema.agentId, users.id))
      .where(eq(propertiesSchema.status, 'ativa'))
      .orderBy(desc(propertiesSchema.createdAt));
    return result;
  }),

  // List all properties (admin only)
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
        status: propertiesSchema.status,
        createdAt: propertiesSchema.createdAt,
        updatedAt: propertiesSchema.updatedAt,
        agentName: users.name,
        agentEmail: users.email,
        agentCreci: users.creci,
      })
      .from(propertiesSchema)
      .leftJoin(users, eq(propertiesSchema.agentId, users.id))
      .orderBy(desc(propertiesSchema.createdAt));
    return result;
  }),

  // Get properties for the logged-in agent
  myProperties: agentProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select()
      .from(propertiesSchema)
      .where(eq(propertiesSchema.agentId, ctx.user.id))
      .orderBy(desc(propertiesSchema.createdAt));
    return result;
  }),

  // Get a single property by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [property] = await ctx.db
        .select()
        .from(propertiesSchema)
        .where(eq(propertiesSchema.id, input.id))
        .limit(1);
      return property;
    }),

  // Create a new property (agent only)
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
      try {
        // MySQL não suporta RETURNING, então inserimos e pegamos o último ID
        await ctx.db
          .insert(propertiesSchema)
          .values({
            ...input,
            agentId: ctx.user.id,
            status: 'ativa',
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
          newValue: { ...input, id: property.id },
          description: `Imóvel "${property.title}" criado em ${property.city}/${property.state}`,
        });
        
        return { id: property.id };
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
});
