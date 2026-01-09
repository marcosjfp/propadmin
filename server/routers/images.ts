import { z } from 'zod';
import { router, protectedProcedure, agentProcedure } from '../trpc.js';
import { propertyImages, properties } from '../../drizzle/schema.js';
import { eq, and, desc, asc } from 'drizzle-orm';
import { createAuditLog } from './audit.js';

export const imagesRouter = router({
  // Listar imagens de uma propriedade
  listByProperty: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const images = await ctx.db
        .select()
        .from(propertyImages)
        .where(eq(propertyImages.propertyId, input.propertyId))
        .orderBy(desc(propertyImages.isPrimary), asc(propertyImages.sortOrder));
      return images;
    }),

  // Obter imagem principal de uma propriedade
  getPrimary: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [image] = await ctx.db
        .select()
        .from(propertyImages)
        .where(and(
          eq(propertyImages.propertyId, input.propertyId),
          eq(propertyImages.isPrimary, true)
        ))
        .limit(1);
      return image || null;
    }),

  // Adicionar imagem (via base64)
  create: agentProcedure
    .input(z.object({
      propertyId: z.number(),
      base64Data: z.string().max(7 * 1024 * 1024, 'Imagem muito grande (máx 5MB)'), // ~5MB em base64
      filename: z.string().max(255),
      originalName: z.string().max(255),
      mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif'], {
        errorMap: () => ({ message: 'Tipo de imagem não permitido. Use: JPEG, PNG, WebP ou GIF' })
      }),
      size: z.number().max(5 * 1024 * 1024, 'Arquivo muito grande (máx 5MB)'),
      isPrimary: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verificar se a propriedade pertence ao agente
      const [property] = await ctx.db
        .select()
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);

      if (!property) {
        throw new Error('Propriedade não encontrada');
      }

      if (property.agentId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new Error('Você não tem permissão para adicionar imagens a esta propriedade');
      }

      // Verificar limite de 10 imagens
      const existingImages = await ctx.db
        .select()
        .from(propertyImages)
        .where(eq(propertyImages.propertyId, input.propertyId));

      if (existingImages.length >= 10) {
        throw new Error('Limite máximo de 10 imagens atingido');
      }

      // Se é a primeira imagem ou marcada como principal, definir como principal
      const shouldBePrimary = input.isPrimary || existingImages.length === 0;

      // Se vai ser a principal, remover flag das outras
      if (shouldBePrimary) {
        await ctx.db
          .update(propertyImages)
          .set({ isPrimary: false })
          .where(eq(propertyImages.propertyId, input.propertyId));
      }

      // Salvar a imagem (neste caso, salvamos o base64 diretamente como URL)
      // Em produção, você salvaria em um serviço de storage como S3
      const url = input.base64Data;

      // Próxima ordem
      const nextOrder = existingImages.length;

      await ctx.db
        .insert(propertyImages)
        .values({
          propertyId: input.propertyId,
          url,
          filename: input.filename,
          originalName: input.originalName,
          mimeType: input.mimeType,
          size: input.size,
          isPrimary: shouldBePrimary,
          sortOrder: nextOrder,
        });

      // Buscar imagem criada
      const [newImage] = await ctx.db
        .select()
        .from(propertyImages)
        .where(eq(propertyImages.propertyId, input.propertyId))
        .orderBy(desc(propertyImages.id))
        .limit(1);

      // Registrar no histórico
      await createAuditLog({
        ctx,
        action: 'image_uploaded',
        entityType: 'image',
        entityId: newImage.id,
        entityName: input.originalName,
        newValue: { 
          filename: input.filename, 
          originalName: input.originalName,
          propertyId: input.propertyId,
          isPrimary: shouldBePrimary,
        },
        description: `Imagem "${input.originalName}" adicionada ao imóvel "${property.title}"`,
      });

      return newImage;
    }),

  // Definir imagem como principal
  setPrimary: agentProcedure
    .input(z.object({ imageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Buscar a imagem
      const [image] = await ctx.db
        .select()
        .from(propertyImages)
        .where(eq(propertyImages.id, input.imageId))
        .limit(1);

      if (!image) {
        throw new Error('Imagem não encontrada');
      }

      // Verificar permissão
      const [property] = await ctx.db
        .select()
        .from(properties)
        .where(eq(properties.id, image.propertyId))
        .limit(1);

      if (property?.agentId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new Error('Sem permissão');
      }

      // Remover flag de principal das outras imagens
      await ctx.db
        .update(propertyImages)
        .set({ isPrimary: false })
        .where(eq(propertyImages.propertyId, image.propertyId));

      // Definir esta como principal
      await ctx.db
        .update(propertyImages)
        .set({ isPrimary: true })
        .where(eq(propertyImages.id, input.imageId));

      // Registrar no histórico
      await createAuditLog({
        ctx,
        action: 'image_primary_changed',
        entityType: 'image',
        entityId: input.imageId,
        entityName: image.originalName || `Imagem #${input.imageId}`,
        newValue: { imageId: input.imageId, propertyId: image.propertyId },
        description: `Imagem "${image.originalName || input.imageId}" definida como principal do imóvel "${property?.title || image.propertyId}"`,
      });

      return { success: true };
    }),

  // Atualizar ordem das imagens
  updateOrder: agentProcedure
    .input(z.object({
      propertyId: z.number(),
      imageIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verificar permissão
      const [property] = await ctx.db
        .select()
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);

      if (property?.agentId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new Error('Sem permissão');
      }

      // Atualizar ordem de cada imagem
      for (let i = 0; i < input.imageIds.length; i++) {
        await ctx.db
          .update(propertyImages)
          .set({ sortOrder: i })
          .where(eq(propertyImages.id, input.imageIds[i]));
      }

      return { success: true };
    }),

  // Deletar imagem
  delete: agentProcedure
    .input(z.object({ imageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Buscar a imagem
      const [image] = await ctx.db
        .select()
        .from(propertyImages)
        .where(eq(propertyImages.id, input.imageId))
        .limit(1);

      if (!image) {
        throw new Error('Imagem não encontrada');
      }

      // Verificar permissão
      const [property] = await ctx.db
        .select()
        .from(properties)
        .where(eq(properties.id, image.propertyId))
        .limit(1);

      if (property?.agentId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new Error('Sem permissão');
      }

      const wasPrimary = image.isPrimary;
      const propertyId = image.propertyId;
      const imageInfo = { 
        id: image.id, 
        originalName: image.originalName, 
        filename: image.filename,
        propertyId: image.propertyId 
      };

      // Deletar a imagem
      await ctx.db
        .delete(propertyImages)
        .where(eq(propertyImages.id, input.imageId));

      // Se era a principal, definir outra como principal
      if (wasPrimary) {
        const [nextImage] = await ctx.db
          .select()
          .from(propertyImages)
          .where(eq(propertyImages.propertyId, propertyId))
          .orderBy(asc(propertyImages.sortOrder))
          .limit(1);

        if (nextImage) {
          await ctx.db
            .update(propertyImages)
            .set({ isPrimary: true })
            .where(eq(propertyImages.id, nextImage.id));
        }
      }

      // Registrar no histórico
      await createAuditLog({
        ctx,
        action: 'image_deleted',
        entityType: 'image',
        entityId: input.imageId,
        entityName: image.originalName || `Imagem #${input.imageId}`,
        previousValue: imageInfo,
        description: `Imagem "${image.originalName || input.imageId}" removida do imóvel "${property?.title || propertyId}"`,
      });

      return { success: true };
    }),
});
