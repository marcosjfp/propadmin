// A provider CA can be configured as PEM text without relying on file paths
// inside a serverless bundle. Both real and escaped newlines are accepted.
export function databaseOptions(env:NodeJS.ProcessEnv=process.env) {
  const ca=env.DATABASE_SSL_CA?.replace(/\\n/g,'\n').trim();
  if(ca && !ca.includes('-----BEGIN CERTIFICATE-----')) {
    throw new Error('DATABASE_SSL_CA must contain the provider root certificate in PEM format');
  }
  return {
    prepare:false,
    // Supabase transaction pooling does not support query pipelining.
    max_pipeline:1,
    ...(ca ? {ssl:{ca,rejectUnauthorized:true}} : env.NODE_ENV==='production' ? {ssl:'verify-full' as const} : {}),
  };
}
