import test from 'node:test';
import assert from 'node:assert/strict';
process.env.JWT_SECRET ||= 'unit-test-secret-do-not-use-outside-tests';
const { appRouter } = await import('../server/routers/index.js');
const { createAuditLog } = await import('../server/routers/audit.js');

function context(role: 'user' | 'agent' | 'admin' = 'user', database: any = {}) {
  return { db: database, user: { id: 1, role, name: 'Test' }, req: { headers: {} }, res: {}, ip: '127.0.0.1' } as any;
}
function rows(values: unknown[]) {
  const chain: any = {};
  for (const method of ['from', 'where', 'orderBy', 'leftJoin', 'limit']) chain[method] = () => chain;
  chain.then = (resolve: any, reject: any) => Promise.resolve(values).then(resolve, reject);
  return chain;
}

test('CSRF rejects protected, agent, and admin mutations in production before DB access', async () => {
  const oldEnv = process.env.NODE_ENV;
  const oldUrl = process.env.CLIENT_URL;
  process.env.NODE_ENV = 'production';
  process.env.CLIENT_URL = 'https://propadmin.example';
  try {
    for (const origin of ['https://attacker.example', undefined]) {
      const ctx = context('admin');
      ctx.req.headers.origin = origin;
      const caller = appRouter.createCaller(ctx);
      for (const operation of [() => caller.users.updateProfile({name:'Changed'}), () => caller.properties.delete({id:1}), () => caller.users.reject({id:2})]) {
        await assert.rejects(operation, { code: 'FORBIDDEN' });
      }
    }
    delete process.env.CLIENT_URL;
    await assert.rejects(appRouter.createCaller(context('admin')).users.reject({id:2}), {code:'FORBIDDEN'});
  } finally {
    if (oldEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv;
    if (oldUrl === undefined) delete process.env.CLIENT_URL; else process.env.CLIENT_URL = oldUrl;
  }
});

test('regular users cannot read commission details or entity audit history', async () => {
  const caller = appRouter.createCaller(context());
  await assert.rejects(caller.commissions.getById({id:1}), {code:'FORBIDDEN'});
  await assert.rejects(caller.audit.getEntityHistory({entityType:'user',entityId:2}), {code:'FORBIDDEN'});
});

test('agents cannot read another agent commission', async () => {
  const caller = appRouter.createCaller(context('agent', { select: () => rows([{id:1,agentId:2}]) }));
  await assert.rejects(caller.commissions.getById({id:1}), {code:'FORBIDDEN'});
});

test('private property images are hidden from ordinary users', async () => {
  const caller = appRouter.createCaller(context('user', {select: () => rows([{id:1,agentId:2,status:'pendente',isApproved:false}])}));
  await assert.rejects(caller.images.listByProperty({propertyId:1}), {code:'NOT_FOUND'});
  await assert.rejects(caller.images.getPrimary({propertyId:1}), {code:'NOT_FOUND'});
});

test('public images remain readable for approved active properties', async () => {
  let reads = 0;
  const ctx = context('user', {select: () => rows(++reads === 1 ? [{id:1,status:'ativa',isApproved:true}] : [{id:5,url:'data:image/png;base64,AA=='}])});
  ctx.user = null;
  assert.equal((await appRouter.createCaller(ctx).images.listByProperty({propertyId:1}))[0].id, 5);
});

test('audit snapshots omit passwords, including nested objects', async () => {
  let saved: any;
  await createAuditLog({ctx:context('admin',{insert:()=>({values:(value:any)=>{saved=value;}})}),action:'user_updated',entityType:'user',description:'Test',previousValue:{passwordHash:'secret',name:'Visible',nested:{password:'hidden'}},newValue:{password:'hidden'}});
  assert.deepEqual(JSON.parse(saved.previousValue), {name:'Visible',nested:{}});
  assert.deepEqual(JSON.parse(saved.newValue), {});
});

