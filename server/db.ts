import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';

// Database URL from environment variable
const DATABASE_URL = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/administrador_de_propriedades';

// Create MySQL connection pool with timeout settings
export const pool = mysql.createPool({
  uri: DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // 10 segundos de timeout
});

// Create Drizzle instance with schema
export const db = drizzle(pool, { schema, mode: 'default' });

// Test database connection with timeout
export async function testConnection(): Promise<boolean> {
  try {
    // Criar uma promise com timeout de 5 segundos
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
    
    const queryPromise = pool.query('SELECT 1');
    
    await Promise.race([queryPromise, timeoutPromise]);
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error instanceof Error ? error.message : error);
    return false;
  }
}
