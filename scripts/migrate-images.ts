import { databaseOptions } from '../server/database-options.js';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { normalizeImage, putObject, removeObject } from '../server/storage.js';
dotenv.config({path:'.env.local'});dotenv.config();
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql=postgres(process.env.DATABASE_URL,{max:1,...databaseOptions()});
try {
  await sql`SELECT pg_advisory_lock(792817362)`;
  // Only inline data is converted; never fetch arbitrary legacy URLs.
  const rows=await sql`SELECT id,"propertyId",url,"mimeType" FROM property_images WHERE "storageKey" IS NULL AND url LIKE 'data:image/%' ORDER BY id`;
  for(const row of rows) {
    const match=/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(row.url);
    if(!match || match[1]!==row.mimeType) throw new Error(`Legacy image ${row.id} has invalid data; repair it before continuing`);
    const normalized=await normalizeImage(Buffer.from(match[2],'base64'),match[1]);
    const uuid=randomUUID();
    const key=`${row.propertyId}/images/${uuid}.webp`;
    const thumbnail=`${row.propertyId}/thumbnails/${uuid}.webp`;
    try {
      await putObject(key,normalized.full,'image/webp');
      await putObject(thumbnail,normalized.thumbnail,'image/webp');
      await sql`UPDATE property_images SET url='',"storageKey"=${key},"thumbnailKey"=${thumbnail},"mimeType"='image/webp',size=${normalized.full.length},filename=${`${uuid}.webp`} WHERE id=${row.id} AND "storageKey" IS NULL`;
      console.log(`Converted image ${row.id}`);
    } catch(error) {await Promise.allSettled([removeObject(key),removeObject(thumbnail)]);throw error;}
  }
  console.log(`Converted ${rows.length} legacy inline images.`);
} finally {await sql.end();}
