import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const enabled = process.env.RUN_DATABASE_TESTS === '1';

test('local database integration: login, revoked sessions, safe serialization, admin edits, images, and concurrent transactions', {skip: !enabled}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname), 'Integration tests require a localhost database');
  assert.notEqual(process.env.NODE_ENV, 'production');
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { default: postgres } = await import('postgres');
  const { eq } = await import('drizzle-orm');
  const schema = await import('../drizzle/schema.js');
  const { appRouter } = await import('../server/routers/index.js');
  const { createContext, createJWT } = await import('../server/context.js');
  const { pool } = await import('../server/db.js');
  const { COOKIE_NAME } = await import('../shared/const.js');
  const connection = postgres(url.toString(), {max:4});
  const database = drizzle(connection, {schema});
  const userIds: number[] = [];
  const propertyIds: number[] = [];
  const makeContext = (user:any) => ({db:database,user,req:{headers:{}},res:{cookie:()=>{},clearCookie:()=>{}},ip:'127.0.0.1'} as any);
  try {
    const [admin] = await database.select().from(schema.users).where(eq(schema.users.username,'local-admin'));
    assert.equal(admin.role,'admin');
    let cookieSet = false;
    const loginContext = makeContext(null);
    loginContext.res.cookie = () => {cookieSet=true;};
    await appRouter.createCaller(loginContext).auth.login({username:'local-admin',password:process.env.LOCAL_ADMIN_PASSWORD!});
    assert.equal(cookieSet,true);
    const [agent] = await database.insert(schema.users).values({openId:randomUUID(),username:`test-${randomUUID()}`,role:'agent',status:'active',name:'Integration agent'}).returning();
    userIds.push(agent.id);
    const token = createJWT(agent);
    for (const status of ['pending','rejected','active'] as const) {
      await database.update(schema.users).set({status}).where(eq(schema.users.id,agent.id));
      const ctx = await createContext({req:{cookies:{[COOKIE_NAME]:token},headers:{}},res:{}} as any);
      assert.equal(Boolean(ctx.user),status==='active');
    }
    const adminCaller = appRouter.createCaller(makeContext(admin));
    const agentCaller = appRouter.createCaller(makeContext(agent));
    assert.equal('passwordHash' in (await adminCaller.users.getById({id:admin.id}))!,false);
    assert.ok((await adminCaller.users.list()).items.every(user=>!('passwordHash' in user)));
    const newProperty = async () => {
      const [property] = await database.insert(schema.properties).values({title:'Integration property',type:'casa',transactionType:'venda',price:1000000,size:100,rooms:2,bathrooms:1,address:'Test',city:'Test',state:'SP',agentId:agent.id,status:'ativa',isApproved:true}).returning();
      propertyIds.push(property.id);
      return property;
    };
    const property = await newProperty();
    await adminCaller.properties.update({id:property.id,title:'Admin can edit other agent property'});
    await agentCaller.properties.update({id:property.id,title:'Agent can edit active property',status:'ativa'});
    await assert.rejects(agentCaller.properties.update({id:property.id,status:'vendida'}),{code:'BAD_REQUEST'});
    const [image] = await database.insert(schema.propertyImages).values({propertyId:property.id,url:'data:image/png;base64,AA==',filename:'test.png',originalName:'test.png',mimeType:'image/png',size:1,sortOrder:7}).returning();
    const other = await newProperty();
    await assert.rejects(agentCaller.images.updateOrder({propertyId:other.id,imageIds:[image.id]}),{code:'BAD_REQUEST'});
    const [unchanged] = await database.select().from(schema.propertyImages).where(eq(schema.propertyImages.id,image.id));
    assert.equal(unchanged.sortOrder,7);
    const results = await Promise.allSettled([
      agentCaller.commissions.registerTransaction({propertyId:property.id,transactionAmount:1000000}),
      agentCaller.commissions.registerTransaction({propertyId:property.id,transactionAmount:1000000}),
    ]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal((await database.select().from(schema.commissions).where(eq(schema.commissions.propertyId,property.id))).length,1);
    const commissions = await adminCaller.commissions.list();
    assert.ok(commissions.every(c=>!c.agent || !('passwordHash' in c.agent)));
    const competing = await newProperty();
    const mixed = await Promise.allSettled([
      agentCaller.commissions.create({propertyId:competing.id,transactionType:'venda',transactionAmount:1000000}),
      agentCaller.commissions.registerTransaction({propertyId:competing.id,transactionAmount:1000000}),
    ]);
    assert.equal(mixed.filter(r=>r.status==='fulfilled').length,1);
    assert.equal((await database.select().from(schema.commissions).where(eq(schema.commissions.propertyId,competing.id))).length,1);
  } finally {
    for (const id of propertyIds) {
      await database.delete(schema.auditLogs).where(eq(schema.auditLogs.entityId,id));
      await database.delete(schema.commissions).where(eq(schema.commissions.propertyId,id));
      await database.delete(schema.properties).where(eq(schema.properties.id,id));
    }
    for (const id of userIds) {
      await database.delete(schema.auditLogs).where(eq(schema.auditLogs.userId,id));
      await database.delete(schema.users).where(eq(schema.users.id,id));
    }
    await connection.end();
    await pool().end();
  }
});
