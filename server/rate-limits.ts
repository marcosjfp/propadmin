import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import type { Store, Options } from 'express-rate-limit';
import { db, type Database } from './db.js';

export function rateKey(namespace:string, value:string) {
  return `${namespace}:${createHash('sha256').update(value).digest('hex')}`;
}
export async function incrementRate(database:Database, key:string, windowMs:number) {
  const result = await database.execute(sql`
    INSERT INTO rate_limits (key,hits,"expiresAt") VALUES (${key},1,now() + ${windowMs} * interval '1 millisecond')
    ON CONFLICT (key) DO UPDATE SET
      hits = CASE WHEN rate_limits."expiresAt" <= now() THEN 1 ELSE rate_limits.hits + 1 END,
      "expiresAt" = CASE WHEN rate_limits."expiresAt" <= now() THEN now() + ${windowMs} * interval '1 millisecond' ELSE rate_limits."expiresAt" END
    RETURNING hits, "expiresAt"
  `);
  // Bounded cleanup prevents arbitrary usernames/IPs leaving an unbounded table.
  await database.execute(sql`DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE "expiresAt" < now() LIMIT 100)`);
  return {totalHits:Number(result.rows[0].hits),resetTime:new Date(result.rows[0].expiresAt as string)};
}
export async function enforceRate(database:Database, namespace:string, value:string, limit:number, windowMs:number) {
  const record = await incrementRate(database,rateKey(namespace,value),windowMs);
  if (record.totalHits > limit) throw new TRPCError({code:'TOO_MANY_REQUESTS',message:'Muitas tentativas. Aguarde alguns minutos e tente novamente.'});
}
export class DatabaseRateLimitStore implements Store {
  private windowMs = 900000;
  localKeys = false;
  readonly prefix:string;
  constructor(private namespace:string) {this.prefix=`${namespace}:`;}
  init(options:Options) {this.windowMs=options.windowMs;}
  increment(key:string) {return incrementRate(db,rateKey(this.namespace,key),this.windowMs);}
  async decrement(key:string) {await db.execute(sql`UPDATE rate_limits SET hits = greatest(0,hits-1) WHERE key=${rateKey(this.namespace,key)}`);}
  async resetKey(key:string) {await db.execute(sql`DELETE FROM rate_limits WHERE key=${rateKey(this.namespace,key)}`);}
}
