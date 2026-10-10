import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { router, publicProcedure, agentProcedure } from '../trpc.js';
import { propertyImages, properties } from '../../drizzle/schema.js';
import { eq, and, desc, asc } from 'drizzle-orm';
import { createAuditLog } from './audit.js';
import type { Context } from '../context.js';
import { TRPCError } from '@trpc/server';
import { enforceRate } from '../rate-limits.js';
import { idSchema } from '../../shared/validation.js';
import { signedUpload, readObject, putObject, removeObject, normalizeImage } from '../storage.js';

const mimeSchema = z.enum(['image/jpeg','image/png','image/webp','image/gif']);
const uploadClaimsSchema = z.object({purpose:z.literal('image-upload'),userId:idSchema,propertyId:idSchema,key:z.string().regex(/^\d+\/incoming\/[a-f0-9-]+$/),mimeType:mimeSchema,size:z.number().int().positive().max(5*1024*1024),originalName:z.string().min(1).max(255)});
export function verifyUploadToken(token:string) {
  return uploadClaimsSchema.parse(jwt.verify(token,process.env.JWT_SECRET!,{algorithms:['HS256']}));
}
function signUpload(input:z.infer<typeof uploadClaimsSchema>) {return jwt.sign(input,process.env.JWT_SECRET!,{expiresIn:'5m',algorithm:'HS256'});}
function imageResponse(image:typeof propertyImages.$inferSelect) {
  return {...image,url:image.storageKey ? `/api/images/${image.id}` : image.url,thumbnailUrl:image.thumbnailKey ? `/api/images/${image.id}?thumbnail=1` : image.storageKey ? `/api/images/${image.id}` : image.url};
}
export async function requireVisibleProperty(ctx:Context,propertyId:number) {
  const [property]=await ctx.db.select().from(properties).where(eq(properties.id,propertyId)).limit(1);
  if (!property || property.deletedAt || !((property.isApproved && property.status==='ativa') || ctx.user?.role==='admin' || (ctx.user?.role==='agent' && (property.agentId===ctx.user.id || property.assignedAgentId===ctx.user.id)))) {
    throw new TRPCError({code:'NOT_FOUND',message:'Propriedade não encontrada'});
  }
  return property;
}
function requireOwner(ctx:Context,property:typeof properties.$inferSelect | undefined) {
  if (!property || property.deletedAt) throw new TRPCError({code:'NOT_FOUND',message:'Propriedade não encontrada'});
  if (!ctx.user || !(ctx.user.role==='admin' || property.agentId===ctx.user.id || property.assignedAgentId===ctx.user.id)) throw new TRPCError({code:'FORBIDDEN',message:'Sem permissão para gerenciar imagens'});
  return property;
}
async function commitImage(ctx:Context,claims:z.infer<typeof uploadClaimsSchema>,isPrimary:boolean) {
  if (claims.userId !== ctx.user?.id) throw new TRPCError({code:'FORBIDDEN',message:'Upload pertence a outro usuário'});
  const uuid = claims.key.split('/').slice(-1)[0]!;
  const fullKey=`${claims.propertyId}/images/${uuid}.webp`;
  const thumbnailKey=`${claims.propertyId}/thumbnails/${uuid}.webp`;
  const image = await ctx.db.transaction(async tx => {
    const [row]=await tx.select().from(properties).where(eq(properties.id,claims.propertyId)).for('update');
    const property=requireOwner(ctx,row);
    const [already]=await tx.select().from(propertyImages).where(eq(propertyImages.storageKey,fullKey));
    if (already) return already;
    const existing=await tx.select().from(propertyImages).where(eq(propertyImages.propertyId,property.id));
    if (existing.length>=10) throw new TRPCError({code:'BAD_REQUEST',message:'Limite máximo de 10 imagens atingido'});
    const bytes=await readObject(claims.key);
    if (bytes.length!==claims.size) throw new TRPCError({code:'BAD_REQUEST',message:'Tamanho do arquivo inválido'});
    let normalized:Awaited<ReturnType<typeof normalizeImage>>;
    try {normalized=await normalizeImage(bytes,claims.mimeType);} catch {throw new TRPCError({code:'BAD_REQUEST',message:'Arquivo não é uma imagem válida ou excede os limites'});}
    try {
      await putObject(fullKey,normalized.full,'image/webp');
      await putObject(thumbnailKey,normalized.thumbnail,'image/webp');
      const primary=isPrimary || !existing.some(image=>image.isPrimary);
      if (primary) await tx.update(propertyImages).set({isPrimary:false}).where(eq(propertyImages.propertyId,property.id));
      const [created]=await tx.insert(propertyImages).values({propertyId:property.id,url:'',storageKey:fullKey,thumbnailKey,filename:`${uuid}.webp`,originalName:claims.originalName,mimeType:'image/webp',size:normalized.full.length,isPrimary:primary,sortOrder:Math.max(-1,...existing.map(image=>image.sortOrder))+1}).returning();
      await createAuditLog({ctx:{...ctx,db:tx as typeof ctx.db},action:'image_uploaded',entityType:'image',entityId:created.id,entityName:claims.originalName,newValue:{propertyId:property.id,isPrimary:primary},description:`Imagem adicionada ao imóvel "${property.title}"`});
      return created;
    } catch(error) {
      await Promise.allSettled([removeObject(fullKey),removeObject(thumbnailKey)]);
      throw error;
    }
  });
  await removeObject(claims.key).catch(()=>{});
  return imageResponse(image);
}

export const imagesRouter=router({
  listByProperty:publicProcedure.input(z.object({propertyId:idSchema})).query(async ({ctx,input})=>{
    await requireVisibleProperty(ctx,input.propertyId);
    return (await ctx.db.select().from(propertyImages).where(eq(propertyImages.propertyId,input.propertyId)).orderBy(desc(propertyImages.isPrimary),asc(propertyImages.sortOrder))).map(imageResponse);
  }),
  getPrimary:publicProcedure.input(z.object({propertyId:idSchema})).query(async ({ctx,input})=>{
    await requireVisibleProperty(ctx,input.propertyId);
    const [image]=await ctx.db.select().from(propertyImages).where(and(eq(propertyImages.propertyId,input.propertyId),eq(propertyImages.isPrimary,true))).limit(1);
    return image ? imageResponse(image) : null;
  }),
  prepareUpload:agentProcedure.input(z.object({propertyId:idSchema,mimeType:mimeSchema,size:z.number().int().positive().max(5*1024*1024),originalName:z.string().min(1).max(255)})).mutation(async ({ctx,input})=>{
    await enforceRate(ctx.db,'image-upload',String(ctx.user.id),30,60*60*1000);
    const [property]=await ctx.db.select().from(properties).where(eq(properties.id,input.propertyId));
    requireOwner(ctx,property);
    const key=`${input.propertyId}/incoming/${randomUUID()}`;
    const token=signUpload({...input,key,userId:ctx.user.id,purpose:'image-upload'});
    const uploadUrl=await signedUpload(key) ?? `/api/image-uploads?token=${encodeURIComponent(token)}`;
    return {uploadUrl,token};
  }),
  completeUpload:agentProcedure.input(z.object({token:z.string().max(3000),isPrimary:z.boolean().default(false)})).mutation(async ({ctx,input})=>{
    let claims:z.infer<typeof uploadClaimsSchema>;
    try {claims=verifyUploadToken(input.token);} catch {throw new TRPCError({code:'BAD_REQUEST',message:'Upload expirado ou inválido'});}
    return commitImage(ctx,claims,input.isPrimary);
  }),
  // Compatibility for old clients; new clients upload directly to private object storage.
  create:agentProcedure.input(z.object({propertyId:idSchema,base64Data:z.string().max(700*1024),filename:z.string().max(255),originalName:z.string().min(1).max(255),mimeType:mimeSchema,size:z.number().int().positive().max(512*1024),isPrimary:z.boolean().default(false)})).mutation(async ({ctx,input})=>{
    await enforceRate(ctx.db,'image-upload',String(ctx.user.id),30,60*60*1000);
    const match=/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.base64Data);
    if (!match || match[1]!==input.mimeType) throw new TRPCError({code:'BAD_REQUEST',message:'Dados da imagem inválidos'});
    const [property]=await ctx.db.select().from(properties).where(eq(properties.id,input.propertyId));requireOwner(ctx,property);
    const claims={...input,purpose:'image-upload' as const,userId:ctx.user.id,key:`${input.propertyId}/incoming/${randomUUID()}`};
    await putObject(claims.key,Buffer.from(match[2],'base64'),input.mimeType);
    try { return await commitImage(ctx,claims,input.isPrimary); }
    finally {await removeObject(claims.key).catch(()=>{});}
  }),
  setPrimary:agentProcedure.input(z.object({imageId:idSchema})).mutation(async ({ctx,input})=>ctx.db.transaction(async tx=>{
    const [lookup]=await tx.select().from(propertyImages).where(eq(propertyImages.id,input.imageId));
    if (!lookup) throw new TRPCError({code:'NOT_FOUND',message:'Imagem não encontrada'});
    const [property]=await tx.select().from(properties).where(eq(properties.id,lookup.propertyId)).for('update');requireOwner(ctx,property);
    const [image]=await tx.select().from(propertyImages).where(eq(propertyImages.id,input.imageId));
    if (!image) throw new TRPCError({code:'NOT_FOUND',message:'Imagem não encontrada'});
    await tx.update(propertyImages).set({isPrimary:false}).where(eq(propertyImages.propertyId,image.propertyId));
    await tx.update(propertyImages).set({isPrimary:true}).where(eq(propertyImages.id,image.id));
    await createAuditLog({ctx:{...ctx,db:tx as typeof ctx.db},action:'image_primary_changed',entityType:'image',entityId:image.id,description:'Imagem principal alterada'});
    return {success:true};
  })),
  updateOrder:agentProcedure.input(z.object({propertyId:idSchema,imageIds:z.array(idSchema).max(10).refine(ids=>new Set(ids).size===ids.length,'IDs duplicados')})).mutation(async ({ctx,input})=>ctx.db.transaction(async tx=>{
    const [property]=await tx.select().from(properties).where(eq(properties.id,input.propertyId)).for('update');requireOwner(ctx,property);
    const existing=await tx.select({id:propertyImages.id}).from(propertyImages).where(eq(propertyImages.propertyId,input.propertyId));
    if (input.imageIds.some(id=>!existing.some(image=>image.id===id))) throw new TRPCError({code:'BAD_REQUEST',message:'Imagem não pertence ao imóvel'});
    for (const [index,id] of input.imageIds.entries()) await tx.update(propertyImages).set({sortOrder:index}).where(and(eq(propertyImages.id,id),eq(propertyImages.propertyId,input.propertyId)));
    return {success:true};
  })),
  delete:agentProcedure.input(z.object({imageId:idSchema})).mutation(async ({ctx,input})=>{
    const image=await ctx.db.transaction(async tx=>{
      const [lookup]=await tx.select().from(propertyImages).where(eq(propertyImages.id,input.imageId));
      if (!lookup) throw new TRPCError({code:'NOT_FOUND',message:'Imagem não encontrada'});
      const [property]=await tx.select().from(properties).where(eq(properties.id,lookup.propertyId)).for('update');requireOwner(ctx,property);
      const [deleted]=await tx.delete(propertyImages).where(eq(propertyImages.id,input.imageId)).returning();
      if (!deleted) throw new TRPCError({code:'NOT_FOUND',message:'Imagem não encontrada'});
      if (deleted.isPrimary) {
        const [next]=await tx.select().from(propertyImages).where(eq(propertyImages.propertyId,deleted.propertyId)).orderBy(asc(propertyImages.sortOrder),asc(propertyImages.id)).limit(1);
        if (next) await tx.update(propertyImages).set({isPrimary:true}).where(eq(propertyImages.id,next.id));
      }
      await createAuditLog({ctx:{...ctx,db:tx as typeof ctx.db},action:'image_deleted',entityType:'image',entityId:deleted.id,entityName:deleted.originalName,description:'Imagem removida'});
      return deleted;
    });
    await Promise.allSettled([image.storageKey && removeObject(image.storageKey),image.thumbnailKey && removeObject(image.thumbnailKey)]);
    return {success:true};
  }),
});
