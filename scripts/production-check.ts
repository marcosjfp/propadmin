import dotenv from 'dotenv';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import { assertProductionConfig } from '../server/config.js';
import { migrationFiles } from './migrations.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
dotenv.config({path:'.env.local'});dotenv.config();
assertProductionConfig({...process.env,NODE_ENV:'production'});
const sql=postgres(process.env.DATABASE_URL!,{max:1,prepare:false});
try {
  const applied=await sql`SELECT name,checksum FROM propadmin_migrations`;
  for (const file of migrationFiles) {
    const checksum=createHash('sha256').update(await readFile(new URL(`../drizzle/${file}`,import.meta.url))).digest('hex');
    if(!applied.some(migration=>migration.name===file && migration.checksum===checksum)) throw new Error(`Migration missing or changed: ${file}`);
  }
  const [admin]=await sql`SELECT count(*)::int AS count FROM users WHERE role='admin' AND status='active' AND "deletedAt" IS NULL`;
  if(!admin.count) throw new Error('At least one active admin is required');
  const [legacy]=await sql`SELECT count(*)::int AS count FROM property_images WHERE "storageKey" IS NULL`;
  if(legacy.count) throw new Error('Legacy images remain. Run db:migrate-images and review any external URLs before release');
  const {data:bucket,error}=await createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}}).storage.getBucket(process.env.SUPABASE_STORAGE_BUCKET || 'property-images');
  if(error || !bucket) throw new Error('Private image bucket is missing or inaccessible');
  if(bucket.public) throw new Error('Image bucket must be private to protect pending property images');
  if(bucket.file_size_limit!==5242880) throw new Error('Set the bucket file limit to exactly 5 MB');
  const requiredTypes=['image/jpeg','image/png','image/webp','image/gif'];
  if(!bucket.allowed_mime_types || requiredTypes.some(mime=>!bucket.allowed_mime_types!.includes(mime)) || bucket.allowed_mime_types.length!==requiredTypes.length) throw new Error('Bucket must allow JPEG, PNG, WebP and GIF');
  console.log('Production configuration, migrations, administrator and private storage checks passed.');
} finally {await sql.end();}
