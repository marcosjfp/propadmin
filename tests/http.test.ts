import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import superjson from 'superjson';

test('HTTP: real session, signed upload completion, thumbnail privacy and disabled bypass', {skip:process.env.RUN_DATABASE_TESTS!=='1'}, async()=>{
  const url=new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname),'HTTP fixtures must use a loopback database');
  const sql=postgres(url.toString(),{max:1});
  const directory=await mkdtemp(path.join(tmpdir(),'propadmin-http-'));
  const username=`http-${randomUUID()}`;
  const password=`Fixture1!${randomUUID()}`;
  let actorId:number|undefined;
  let propertyId:number|undefined;
  let child:ReturnType<typeof spawn>|undefined;
  let serverErrors='';
  try {
    const [actor]=await sql`INSERT INTO users ("openId",username,"passwordHash",name,role,status) VALUES (${randomUUID()},${username},${await bcrypt.hash(password,10)},'HTTP fixture','admin','active') RETURNING id`;
    actorId=actor.id;
    const listener=createServer();
    await new Promise<void>(resolve=>listener.listen(0,'127.0.0.1',resolve));
    const address=listener.address();
    assert.ok(address && typeof address==='object');
    const port=address.port;
    await new Promise<void>(resolve=>listener.close(()=>resolve()));
    child=spawn(process.execPath,['--import','tsx','server/_core/index.ts'],{env:{...process.env,PORT:String(port),HOST:'127.0.0.1',NODE_ENV:'development',VERCEL:'',ENABLE_DEV_LOGIN:'false',SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',LOCAL_STORAGE_PATH:directory},stdio:['ignore','ignore','pipe']});
    child.stderr!.setEncoding('utf8');
    child.stderr!.on('data',chunk=>{serverErrors+=chunk;});
    const base=`http://127.0.0.1:${port}`;
    let ready=false;
    for(let i=0;i<50;i++) {
      try {ready=(await fetch(`${base}/api/health`)).ok;} catch {}
      if(ready) break;
      if(child.exitCode!==null) throw new Error('HTTP fixture server failed to start');
      await delay(100);
    }
    assert.ok(ready,'HTTP fixture server must become healthy');
    let cookie='';
    async function mutation(route:string,input:unknown) {
      const response=await fetch(`${base}/api/trpc/${route}`,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(superjson.serialize(input))});
      assert.ok(response.ok,`${route} returned ${response.status}`);
      const session=response.headers.get('set-cookie');
      if(session) cookie=session.split(';')[0];
      const result=await response.json();
      return superjson.deserialize<any>(result.result.data);
    }
    await mutation('auth.login',{username,password});
    assert.ok(cookie.includes('='));
    const me=await fetch(`${base}/api/trpc/auth.me`,{headers:{Cookie:cookie}});
    assert.equal(me.status,200);
    assert.ok(!(await me.text()).includes('passwordHash'));
    const batchRoutes=['users.list','dashboard.stats','dashboard.agents','users.listAgents','commissions.list'];
    const batchInput={0:superjson.serialize({page:1,pageSize:20}),1:superjson.serialize(undefined),2:superjson.serialize({page:1,pageSize:20}),3:superjson.serialize(undefined),4:superjson.serialize(undefined)};
    const batch=await fetch(`${base}/api/trpc/${batchRoutes.join(',')}?batch=1&input=${encodeURIComponent(JSON.stringify(batchInput))}`,{headers:{Cookie:cookie},signal:AbortSignal.timeout(5000)});
    assert.equal(batch.status,200,'All administrator dashboard queries must complete in one HTTP batch');
    const batchResults=await batch.json();
    assert.equal(batchResults.length,5);
    assert.ok(batchResults.every((result:any)=>result.result && !result.error));

    assert.equal((await fetch(`${base}/api/dev-login?role=admin`)).status,403);
    const property=await mutation('properties.create',{title:'HTTP image fixture',type:'casa',transactionType:'venda',price:100000,size:10,rooms:1,bathrooms:1,hasBackyard:false,hasLivingRoom:true,hasKitchen:true,address:'Fixture',city:'Fixture',state:'SP'});
    propertyId=property.id;
    await sql`UPDATE properties SET status='pendente',"isApproved"=false WHERE id=${propertyId!}`;
    const png=await sharp({create:{width:12,height:8,channels:3,background:'green'}}).png().toBuffer();
    const upload=await mutation('images.prepareUpload',{propertyId,mimeType:'image/png',size:png.length,originalName:'fixture.png'});
    assert.equal((await fetch(`${base}${upload.uploadUrl}`,{method:'PUT',headers:{'Content-Type':'image/png'},body:png})).status,201);
    const image=await mutation('images.completeUpload',{token:upload.token,isPrimary:true});
    assert.equal((await mutation('images.completeUpload',{token:upload.token,isPrimary:true})).id,image.id,'Completion retries must be idempotent');
    assert.equal((await fetch(`${base}${image.url}`)).status,404,'Pending images must remain private');
    const thumbnail=await fetch(`${base}${image.thumbnailUrl}`,{headers:{Cookie:cookie}});
    assert.equal(thumbnail.status,200);
    assert.equal(thumbnail.headers.get('content-type'),'image/webp');
    assert.equal((await sharp(Buffer.from(await thumbnail.arrayBuffer())).metadata()).format,'webp');
    await mutation('properties.approve',{propertyId});
    assert.equal((await fetch(`${base}${image.url}`)).status,200,'Approved active images must be publicly viewable');
    await mutation('images.delete',{imageId:image.id});
    assert.equal((await fetch(`${base}${image.url}`,{headers:{Cookie:cookie}})).status,404);
    await mutation('auth.logout',undefined);
    assert.equal(serverErrors,'','Server smoke checks must not emit configuration or rate-limit errors');
  } finally {
    if(child && child.exitCode===null) {
      child.kill('SIGTERM');
      await new Promise<void>(resolve=>child!.once('exit',()=>resolve()));
    }
    if(propertyId) await sql`DELETE FROM properties WHERE id=${propertyId}`;
    if(actorId) {
      await sql`DELETE FROM audit_logs WHERE "userId"=${actorId}`;
      await sql`DELETE FROM users WHERE id=${actorId}`;
    }
    await sql.end();
    await rm(directory,{recursive:true,force:true});
  }
});
