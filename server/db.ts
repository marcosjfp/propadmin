import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../drizzle/schema.js';

// Build DATABASE_URL from individual variables or use the full URL
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required. Set the Supabase Postgres connection string in Vercel.');
  }
  return url;
}

// Lazy pool creation to prevent crash on startup
let client: postgres.Sql | null = null;
export type Database = PostgresJsDatabase<typeof schema>;
let dbInstance: Database | null = null;

function getClient(): postgres.Sql {
  if (!client) {
    client = postgres(getDatabaseUrl(), {
      max: 1,
      connect_timeout: 10,
      idle_timeout: 20,
      prepare: false,
      ...(process.env.NODE_ENV === 'production' ? {ssl:'verify-full' as const} : {}),
    });
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
    await getClient()`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
