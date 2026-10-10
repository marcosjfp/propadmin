import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { passwordSchema, idSchema, dateFilterSchema } from '../shared/validation.js';
import { assertProductionConfig } from '../server/config.js';
import { normalizeImage } from '../server/storage.js';

process.env.JWT_SECRET ||= 'unit-test-secret-do-not-use-outside-tests';
const {appRouter}=await import('../server/routers/index.js');
const {migrate}=await import('../scripts/migrations.js');
const {incrementRate}=await import('../server/rate-limits.js');
const enabled=process.env.RUN_DATABASE_TESTS==='1';

test('input validation bounds IDs, passwords by bytes, and date filters',()=>{
  assert.equal(idSchema.safeParse(1.5).success,false);
  assert.equal(idSchema.safeParse(-1).success,false);
  assert.equal(passwordSchema.safeParse(`Aa1!${'é'.repeat(35)}`).success,false);
  assert.equal(dateFilterSchema.safeParse('not-a-date').success,false);
  assert.equal(dateFilterSchema.safeParse('2026-02-31').success,false);
});

test('production configuration rejects insecure or incomplete settings',()=>{
  const env={NODE_ENV:'production',DATABASE_URL:'postgresql://test:test@localhost/test?sslmode=verify-full',CLIENT_URL:'https://propadmin.example',JWT_SECRET:'a'.repeat(64),SUPABASE_URL:'https://storage.example',SUPABASE_SERVICE_ROLE_KEY:'server-only-test-key'};
  assert.doesNotThrow(()=>assertProductionConfig(env));
  assert.throws(()=>assertProductionConfig({...env,JWT_SECRET:'short'}));
  assert.throws(()=>assertProductionConfig({...env,CLIENT_URL:'http://propadmin.example'}));
  assert.throws(()=>assertProductionConfig({...env,SUPABASE_SERVICE_ROLE_KEY:''}));
  assert.throws(()=>assertProductionConfig({...env,ENABLE_DEV_LOGIN:'true'}));
  assert.throws(()=>assertProductionConfig({...env,DATABASE_URL:'postgresql://test:test@database.example/test?sslmode=require'}));
});

test('image decoder rejects MIME spoofing and creates bounded WebP derivatives',async ()=>{
  const source=await sharp({create:{width:20,height:10,channels:3,background:'#2456ff'}}).png().toBuffer();
  const result=await normalizeImage(source,'image/png');
  assert.equal((await sharp(result.full).metadata()).format,'webp');
  assert.ok((await sharp(result.thumbnail).metadata()).width!<=400);
  await assert.rejects(normalizeImage(source,'image/jpeg'));
  await assert.rejects(normalizeImage(Buffer.from('not an image'),'image/png'));
});

test('production database: clean migration, legacy redaction, archive retention, admin races, aggregates, shared limits, images and transaction lifecycle',{skip:!enabled},async t=>{
  const url=new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  const {default:postgres}=await import('postgres');
  const {drizzle}=await import('drizzle-orm/postgres-js');
  const {eq}=await import('drizzle-orm');
  const schema=await import('../drizzle/schema.js');
  const namespace=`production_test_${randomUUID().replaceAll('-','')}`;
  const root=postgres(url.toString(),{max:1,onnotice:()=>{}});
  await root`CREATE SCHEMA ${root(namespace)}`;
  const connection=postgres(url.toString(),{max:6,connection:{search_path:namespace},onnotice:()=>{}});
  const database=drizzle(connection,{schema});
  const originalStorage=process.env.LOCAL_STORAGE_PATH;
  const directory=await mkdtemp(path.join(tmpdir(),'propadmin-images-'));
  process.env.LOCAL_STORAGE_PATH=directory;
  const context=(user:any)=>({db:database,user,req:{headers:{}},res:{cookie:()=>{},clearCookie:()=>{}},ip:'test-local'} as any);
  try {
    await t.test('empty database migrates completely',async ()=>{
      const fresh=`fresh_${randomUUID().replaceAll('-','')}`;
      await root`CREATE SCHEMA ${root(fresh)}`;
      const clean=postgres(url.toString(),{max:1,connection:{search_path:fresh},onnotice:()=>{}});
      try {
        await migrate(clean);
        assert.equal((await clean`SELECT * FROM propadmin_migrations`).length,2);
        assert.equal((await clean`SELECT * FROM users`).length,0);
        assert.equal((await clean`SELECT * FROM rate_limits`).length,0);
      } finally {await clean.end();await root`DROP SCHEMA ${root(fresh)} CASCADE`;}
    });
    await t.test('legacy bootstrap upgrades redact credentials and are repeatable',async ()=>{
      await connection.unsafe(await readFile(new URL('../drizzle/0007_supabase_postgres.sql',import.meta.url),'utf8'));
      await connection`INSERT INTO audit_logs (action,"entityType","previousValue","newValue") VALUES ('user_updated','user','{"passwordHash":"old-secret","nested":{"password":"secret"},"name":"Keep"}','bad json passwordHash=secret')`;
      await migrate(connection);
      await migrate(connection);
      const [snapshot]=await connection`SELECT "previousValue","newValue" FROM audit_logs`;
      assert.deepEqual(JSON.parse(snapshot.previousValue),{nested:{},name:'Keep'});
      assert.equal(snapshot.newValue,'[credential snapshot redacted]');
      assert.equal((await connection`SELECT * FROM propadmin_migrations`).length,2);
    });
    const [admin]=await database.insert(schema.users).values({openId:randomUUID(),username:'test-admin',name:'Admin',role:'admin',status:'active'}).returning();
    const [agent]=await database.insert(schema.users).values({openId:randomUUID(),username:'test-agent',name:'Agent',role:'agent',status:'active'}).returning();
    const adminCaller=appRouter.createCaller(context(admin));
    const agentCaller=appRouter.createCaller(context(agent));
    const newProperty=async ()=> (await database.insert(schema.properties).values({title:'Production fixture',type:'casa',transactionType:'venda',price:1000000,size:50,rooms:1,bathrooms:1,address:'Test',city:'Test',state:'SP',agentId:agent.id,status:'ativa',isApproved:true}).returning())[0];
    await t.test('self-demotion, self-rejection and cross-admin demotion races cannot lock out admins',async ()=>{
      for (const action of [()=>adminCaller.users.updateRole({id:admin.id,role:'user'}),()=>adminCaller.users.update({id:admin.id,role:'agent'}),()=>adminCaller.users.promoteToAgent({id:admin.id,creci:'12345'}),()=>adminCaller.users.reject({id:admin.id}),()=>adminCaller.users.delete({id:admin.id})]) await assert.rejects(action,{code:'FORBIDDEN'});
      const [second]=await database.insert(schema.users).values({openId:randomUUID(),username:'test-admin-2',role:'admin',status:'active'}).returning();
      const otherCaller=appRouter.createCaller(context(second));
      const results=await Promise.allSettled([adminCaller.users.updateRole({id:second.id,role:'user'}),otherCaller.users.updateRole({id:admin.id,role:'user'})]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      const activeAdmins=await connection`SELECT * FROM users WHERE role='admin' AND status='active' AND "deletedAt" IS NULL`;
      assert.equal(activeAdmins.length,1);
      // Restore the fixture actor by SQL so independent subtests use a valid active admin.
      await connection`UPDATE users SET role='admin',status='active' WHERE id=${admin.id}`;
    });
    await t.test('aggregates cover records beyond page boundaries',async ()=>{
      for(let i=0;i<55;i++) await newProperty();
      const stats=await adminCaller.dashboard.stats();
      assert.equal(stats.totalProperties,55);
      assert.equal(stats.activeProperties,55);
      const summary=await adminCaller.dashboard.agents({page:1,pageSize:1});
      assert.equal(summary.items[0].propertyCount,55);
    });
    await t.test('cancellation retains the commission and reopens the property; paid commissions are immutable',async ()=>{
      const property=await newProperty();
      const result=await agentCaller.commissions.create({propertyId:property.id,transactionType:'venda',transactionAmount:1000000});
      assert.equal((await database.select().from(schema.properties).where(eq(schema.properties.id,property.id)))[0].status,'vendida');
      await adminCaller.commissions.delete({id:result.id});
      assert.equal((await database.select().from(schema.commissions).where(eq(schema.commissions.id,result.id)))[0].status,'cancelada');
      assert.equal((await database.select().from(schema.properties).where(eq(schema.properties.id,property.id)))[0].status,'ativa');
      await agentCaller.commissions.registerTransaction({propertyId:property.id,transactionAmount:1000000});
      const [next]=await connection`SELECT id FROM commissions WHERE "propertyId"=${property.id} AND status='pendente'`;
      await adminCaller.commissions.updateStatus({id:next.id,status:'paga'});
      await assert.rejects(adminCaller.commissions.delete({id:next.id}),{code:'CONFLICT'});
      await adminCaller.properties.delete({id:property.id});
      assert.equal((await connection`SELECT * FROM commissions WHERE id=${next.id}`).length,1);
      await assert.rejects(connection`DELETE FROM properties WHERE id=${property.id}`);
      assert.equal(await adminCaller.properties.getById({id:property.id}),null);
    });
    await t.test('competing approval decisions serialize, and editing a rejected property resubmits it',async ()=>{
      const property=await newProperty();
      await connection`UPDATE properties SET status='pendente',"isApproved"=false WHERE id=${property.id}`;
      const outcomes=await Promise.allSettled([adminCaller.properties.approve({propertyId:property.id}),adminCaller.properties.reject({propertyId:property.id,reason:'Review fixture'})]);
      assert.equal(outcomes.filter(result=>result.status==='fulfilled').length,1);
      await connection`UPDATE properties SET status='rejeitada',"isApproved"=false,"rejectionReason"='Review fixture' WHERE id=${property.id}`;
      await agentCaller.properties.update({id:property.id,title:'Revised property'});
      const [resubmitted]=await connection`SELECT status,"isApproved","rejectionReason" FROM properties WHERE id=${property.id}`;
      assert.equal(resubmitted.status,'pendente');
      assert.equal(resubmitted.isApproved,false);
      assert.equal(resubmitted.rejectionReason,null);
      await adminCaller.properties.approve({propertyId:property.id});
    });
    await t.test('admin-recorded transactions credit the assigned agent and round to the nearest cent',async ()=>{
      const property=await newProperty();
      const [assigned]=await database.insert(schema.users).values({openId:randomUUID(),username:'assigned-agent',role:'agent',status:'active'}).returning();
      await adminCaller.properties.assignAgent({propertyId:property.id,assignedAgentId:assigned.id});
      const result=await adminCaller.commissions.registerTransaction({propertyId:property.id,transactionAmount:1007});
      assert.equal(result.commissionAmount,81);
      const [commission]=await database.select().from(schema.commissions).where(eq(schema.commissions.propertyId,property.id));
      assert.equal(commission.agentId,assigned.id);
    });
    await t.test('image uploads and primary changes stay consistent under concurrency',async ()=>{
      const property=await newProperty();
      const png=await sharp({create:{width:8,height:8,channels:3,background:'blue'}}).png().toBuffer();
      const imageInput={propertyId:property.id,base64Data:`data:image/png;base64,${png.toString('base64')}`,filename:'fixture.png',originalName:'fixture.png',mimeType:'image/png' as const,size:png.length,isPrimary:true};
      const uploads=await Promise.allSettled(Array.from({length:12},()=>agentCaller.images.create(imageInput)));
      assert.equal(uploads.filter(r=>r.status==='fulfilled').length,10);
      const images=await agentCaller.images.listByProperty({propertyId:property.id});
      assert.equal(images.filter(image=>image.isPrimary).length,1);
      await Promise.all([agentCaller.images.setPrimary({imageId:images[0].id}),agentCaller.images.setPrimary({imageId:images[1].id})]);
      assert.equal((await agentCaller.images.listByProperty({propertyId:property.id})).filter(image=>image.isPrimary).length,1);
      assert.ok(images.every(image=>image.storageKey && image.thumbnailKey && image.url.startsWith('/api/images/') && image.size>0));
      await agentCaller.images.delete({imageId:images[0].id});
      assert.equal((await agentCaller.images.listByProperty({propertyId:property.id})).filter(image=>image.isPrimary).length,1);
    });
    await t.test('database rate counters are shared and reset after expiry',async ()=>{
      const results=await Promise.all(Array.from({length:15},()=>incrementRate(database,'test-counter',10000)));
      assert.equal(Math.max(...results.map(result=>result.totalHits)),15);
      await connection`UPDATE rate_limits SET "expiresAt"=now()-interval '1 second' WHERE key='test-counter'`;
      assert.equal((await incrementRate(database,'test-counter',10000)).totalHits,1);
    });
    await t.test('account archive preserves owned properties and history',async ()=>{
      const property=await newProperty();
      await adminCaller.users.delete({id:agent.id});
      const [retained]=await connection`SELECT * FROM users WHERE id=${agent.id}`;
      assert.equal(retained.status,'rejected');
      assert.ok(retained.deletedAt);
      assert.equal((await connection`SELECT * FROM properties WHERE id=${property.id}`).length,1);
      await assert.rejects(connection`DELETE FROM users WHERE id=${agent.id}`);
    });
  } finally {
    await connection.end();
    await root`DROP SCHEMA ${root(namespace)} CASCADE`;
    await root.end();
    if(originalStorage===undefined) delete process.env.LOCAL_STORAGE_PATH; else process.env.LOCAL_STORAGE_PATH=originalStorage;
    await rm(directory,{recursive:true,force:true});
  }
});
