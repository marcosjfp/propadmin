import { databaseOptions } from '../server/database-options.js';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

dotenv.config({path:'.env.local'});dotenv.config();
if (!process.env.DATABASE_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Configure the database and private Supabase storage before running cleanup');
}
const apply=process.argv.includes('--apply');
const sql=postgres(process.env.DATABASE_URL,{max:1,...databaseOptions()});
const bucket=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}}).storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'property-images');
const cutoff=Date.now()-24*60*60*1000;

// Read-only by default. Never remove objects younger than 24 hours: upload URLs
// live for two hours and image completion tokens live for five minutes.
async function list(prefix:string) {
  const result=[];
  for(let offset=0;;offset+=100) {
    const {data,error}=await bucket.list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});
    if(error) throw error;
    result.push(...data);
    if(data.length<100) return result;
  }
}
try {
  const folders=await list('');
  let count=0;
  for(const folder of folders) {
    if(!/^\d+$/.test(folder.name)) continue;
    for(const category of ['incoming','images','thumbnails']) {
      for(const object of await list(`${folder.name}/${category}`)) {
        const key=`${folder.name}/${category}/${object.name}`;
        if(!/^\d+\/(incoming|images|thumbnails)\/[a-f0-9-]+(?:\.webp)?$/.test(key)) continue;
        const modified=Date.parse(object.updated_at || object.created_at || '');
        if(!Number.isFinite(modified) || modified>=cutoff) continue;
        // Recheck immediately before deletion; archived properties retain images.
        const [reference]=await sql`SELECT id FROM property_images WHERE "storageKey"=${key} OR "thumbnailKey"=${key} LIMIT 1`;
        if(reference) continue;
        console.log(`${apply ? 'Removing' : 'Would remove'} ${key}`);
        if(apply) {
          const {error}=await bucket.remove([key]);
          if(error) throw error;
        }
        count++;
      }
    }
  }
  console.log(`${count} unreferenced objects older than 24 hours. ${apply ? 'Cleanup completed.' : 'Dry run; use --apply after reviewing the list.'}`);
} finally {await sql.end();}
