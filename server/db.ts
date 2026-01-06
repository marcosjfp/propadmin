import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';

// Build DATABASE_URL from individual variables or use the full URL
function getDatabaseUrl(): string {
  // First try the full DATABASE_URL
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@') && !process.env.DATABASE_URL.includes('@:/')) {
    return process.env.DATABASE_URL;
  }
  
  // Try to build from individual variables
  const host = process.env.DB_HOST || process.env.MYSQL_HOST || process.env.MYSQLHOST;
  const port = process.env.DB_PORT || process.env.MYSQL_PORT || process.env.MYSQLPORT || '3306';
  const user = process.env.DB_USER || process.env.MYSQL_USER || process.env.MYSQLUSER || 'root';
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || '';
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'railway';
  
  if (host) {
    return `mysql://${user}:${password}@${host}:${port}/${database}`;
  }
  
  // Fallback for local development
  return 'mysql://root:root@localhost:3306/administrador_de_propriedades';
}

const DATABASE_URL = getDatabaseUrl();
console.log('🔗 Database URL pattern:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

// Lazy pool creation to prevent crash on startup
let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      uri: DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
    });
  }
  return pool;
}

// Create Drizzle instance with lazy pool
export const db = drizzle({ client: getPool(), schema, mode: 'default' });

// Export pool getter for direct queries
export { getPool as pool };

// Test database connection with timeout
export async function testConnection(): Promise<boolean> {
  try {
    const currentPool = getPool();
    
    // Criar uma promise com timeout de 5 segundos
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
    
    const queryPromise = currentPool.query('SELECT 1');
    
    await Promise.race([queryPromise, timeoutPromise]);
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error instanceof Error ? error.message : error);
    return false;
  }
}
