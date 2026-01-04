import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';

// Database URL from environment variable
const DATABASE_URL = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/administrador_de_propriedades';

// Create MySQL connection pool
export const pool = mysql.createPool(DATABASE_URL);

// Create Drizzle instance with schema
export const db = drizzle(pool, { schema, mode: 'default' });

// Test database connection
export async function testConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
