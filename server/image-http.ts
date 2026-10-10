import express from 'express';
import type { Express } from 'express';
import { eq } from 'drizzle-orm';
import { db } from './db.js';
import { propertyImages } from '../drizzle/schema.js';
import { createContext } from './context.js';
import { requireVisibleProperty, verifyUploadToken } from './routers/images.js';
import { putObject, readObject, signedRead } from './storage.js';

export function registerImageRoutes(app:Express) {
  app.put('/api/image-uploads',express.raw({type:'image/*',limit:'5mb'}),async (req,res) => {
    // This route is only the local fallback. Production upload URLs go to Supabase.
    if (process.env.NODE_ENV==='production' || process.env.SUPABASE_URL) return res.status(404).json({error:'Unavailable'});
    try {
      const claims=verifyUploadToken(String(req.query.token || ''));
      if (!Buffer.isBuffer(req.body) || req.body.length!==claims.size || req.headers['content-type']!==claims.mimeType) return res.status(400).json({error:'Invalid image payload'});
      await putObject(claims.key,req.body,claims.mimeType);
      return res.status(201).json({success:true});
    } catch {return res.status(400).json({error:'Invalid or expired upload'});}
  });
  app.get('/api/images/:id',async (req,res) => {
    const id=Number(req.params.id);
    if (!Number.isInteger(id) || id<=0) return res.sendStatus(404);
    try {
      const ctx=await createContext({req,res});
      const [image]=await db.select().from(propertyImages).where(eq(propertyImages.id,id));
      if (!image) return res.sendStatus(404);
      await requireVisibleProperty(ctx,image.propertyId);
      const key=req.query.thumbnail==='1' ? image.thumbnailKey ?? image.storageKey : image.storageKey;
      if (!key) return res.sendStatus(404);
      res.setHeader('Cache-Control','private, no-store');
      const url=await signedRead(key);
      if (url) return res.redirect(url);
      return res.type('image/webp').send(await readObject(key));
    } catch {return res.sendStatus(404);}
  });
}
