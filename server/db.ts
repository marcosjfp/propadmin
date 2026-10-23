import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import * as schema from '../drizzle/schema.js';
import { runtimeDatabaseOptions } from './database-options.js';

// Lazy pool creation to prevent crash on startup
let client: pg.Pool | null = null;
export type Database = NodePgDatabase<typeof schema>;
let dbInstance: Database | null = null;

function getClient(): pg.Pool {
  if (!client) {
    client = new pg.Pool(runtimeDatabaseOptions());
    client.on('error', error => {
      console.error('Idle database connection failed:', (error as Error & {code?:string}).code || error.name);
    });
    if (process.env.VERCEL) attachDatabasePool(client);
  }
  return client;
}

// Lazy Drizzle instance creation
function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getClient(), { schema });
  }
  return dbInstance;
}

// Export db as a proxy that lazily initializes
export const db = new Proxy({} as Database, {
  get(_, prop) {
    return Reflect.get(getDb(), prop);
  }
});

// Export pool getter for direct queries
export { getClient as pool };

// Test database connection with timeout
export async function testConnection(): Promise<boolean> {
  try {
    await getClient().query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
