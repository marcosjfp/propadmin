// A provider CA can be configured as PEM text without relying on file paths
// inside a serverless bundle. Both real and escaped newlines are accepted.
export function databaseOptions(env:NodeJS.ProcessEnv=process.env) {
  const ca=env.DATABASE_SSL_CA?.replace(/\\n/g,'\n').trim();
  if(ca && !ca.includes('-----BEGIN CERTIFICATE-----')) {
    throw new Error('DATABASE_SSL_CA must contain the provider root certificate in PEM format');
  }
  return {
    prepare:false,
    // Administrative scripts use session pooling. This bounds postgres-js
    // pipelining, but does not make that driver safe for transaction pooling.
    max_pipeline:1,
    ...(ca ? {ssl:{ca,rejectUnauthorized:true}} : env.NODE_ENV==='production' ? {ssl:'verify-full' as const} : {}),
  };
}

// Runtime uses node-postgres, which queues queries on each connection rather
// than pipelining them through Supabase's transaction pooler.
export function runtimeDatabaseOptions(env:NodeJS.ProcessEnv=process.env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const url = new URL(env.DATABASE_URL);
  const ca = env.DATABASE_SSL_CA?.replace(/\\n/g,'\n').trim();
  if (ca && !ca.includes('-----BEGIN CERTIFICATE-----')) {
    throw new Error('DATABASE_SSL_CA must contain the provider root certificate in PEM format');
  }
  const verifiedTls = env.NODE_ENV === 'production' || url.searchParams.get('sslmode') === 'verify-full' || Boolean(ca);
  // pg's connection-string parser otherwise replaces the explicit CA object
  // with the sslmode settings from the URL.
  for (const key of ['sslmode','sslrootcert','sslcert','sslkey']) url.searchParams.delete(key);
  return {
    connectionString:url.href,
    max:3,
    connectionTimeoutMillis:10000,
    idleTimeoutMillis:5000,
    maxLifetimeSeconds:300,
    query_timeout:20000,
    ...(verifiedTls ? {ssl:{rejectUnauthorized:true,...(ca ? {ca} : {})}} : {}),
  };
}
