import { drizzle } from 'drizzle-orm/postgres-js';
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
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getClient(): postgres.Sql {
  if (!client) {
    client = postgres(getDatabaseUrl(), {
      max: 1,
      connect_timeout: 10,
      idle_timeout: 20,
      prepare: false,
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
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return (getDb() as any)[prop];
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
