import { createClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

function localPath(key:string) {
  if (!/^\d+\/(incoming|images|thumbnails)\/[a-f0-9-]+(?:\.webp)?$/.test(key)) throw new Error('Invalid storage key');
  return path.join(process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(),'.local-images'),key);
}
function remote() {
  if (Boolean(process.env.SUPABASE_URL) !== Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)) throw new Error('Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (process.env.NODE_ENV === 'production') throw new Error('Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for production image storage');
    return null;
  }
  return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'property-images');
}
export async function putObject(key:string, bytes:Buffer, mimeType:string) {
  const bucket = remote();
  if (bucket) {
    const {error} = await bucket.upload(key,bytes,{contentType:mimeType,upsert:false});
    if (error) throw error;
  } else {
    const file = localPath(key); await mkdir(path.dirname(file),{recursive:true}); await writeFile(file,bytes,{flag:'wx'});
  }
}
export async function readObject(key:string) {
  const bucket = remote();
  if (bucket) {
    const {data,error} = await bucket.download(key);
    if (error || !data) throw error ?? new Error('Object unavailable');
    if (data.size > 5*1024*1024) throw new Error('Object exceeds image size limit');
    return Buffer.from(await data.arrayBuffer());
  }
  return readFile(localPath(key));
}
export async function removeObject(key:string) {
  const bucket = remote();
  if (bucket) {const {error}=await bucket.remove([key]);if(error)throw error;}
  else await rm(localPath(key),{force:true});
}
export async function signedUpload(key:string) {
  const bucket = remote();
  if (!bucket) return null;
  const {data,error} = await bucket.createSignedUploadUrl(key,{upsert:false});
  if (error || !data) throw error ?? new Error('Could not sign upload');
  return data.signedUrl;
}
export async function signedRead(key:string) {
  const bucket = remote();
  if (!bucket) return null;
  const {data,error} = await bucket.createSignedUrl(key,60);
  if (error || !data) throw error ?? new Error('Could not sign image');
  return data.signedUrl;
}
export async function normalizeImage(bytes:Buffer,mimeType:string) {
  if (bytes.length > 5*1024*1024 || !bytes.length) throw new Error('Image must be between 1 byte and 5 MB');
  const image = sharp(bytes,{limitInputPixels:16000000,failOn:'warning'});
  const metadata = await image.metadata();
  const formats:Record<string,string>={'image/jpeg':'jpeg','image/png':'png','image/webp':'webp','image/gif':'gif'};
  if (metadata.format !== formats[mimeType]) throw new Error('Image content does not match MIME type');
  const full = await image.clone().rotate().resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
  const thumbnail = await image.clone().rotate().resize({width:400,height:400,fit:'inside',withoutEnlargement:true}).webp({quality:75}).toBuffer();
  return {full,thumbnail};
}
