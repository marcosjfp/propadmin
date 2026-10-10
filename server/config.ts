export function assertProductionConfig(env:NodeJS.ProcessEnv=process.env) {
  if (env.NODE_ENV!=='production') return;
  for (const name of ['DATABASE_URL','JWT_SECRET','CLIENT_URL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']) if (!env[name]) throw new Error(`${name} is required in production`);
  if (env.JWT_SECRET!.length<32 || /troque|your[-_ ]|change[-_ ]?me|test-secret/i.test(env.JWT_SECRET!)) throw new Error('Production JWT_SECRET must be a random secret of at least 32 characters');
  const client=new URL(env.CLIENT_URL!);
  if (client.protocol!=='https:' || client.pathname!=='/' || client.search || client.hash || client.username || client.password) throw new Error('CLIENT_URL must be an HTTPS origin');
  if(new URL(env.SUPABASE_URL!).protocol!=='https:') throw new Error('SUPABASE_URL must use HTTPS');
  const database=new URL(env.DATABASE_URL!);
  if (!['postgres:','postgresql:'].includes(database.protocol)) throw new Error('DATABASE_URL must point to PostgreSQL');
  if(database.searchParams.get('sslmode')!=='verify-full') throw new Error('Production DATABASE_URL must use sslmode=verify-full for verified TLS');
  if (env.ENABLE_DEV_LOGIN==='true') throw new Error('Development login bypass cannot be enabled in production');
  if (env.TRUST_PROXY_HOPS && !/^\d+$/.test(env.TRUST_PROXY_HOPS)) throw new Error('TRUST_PROXY_HOPS must be a nonnegative integer');
}
