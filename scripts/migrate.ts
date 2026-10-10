import dotenv from 'dotenv';
import postgres from 'postgres';
import { migrate } from './migrations.js';
dotenv.config({path:'.env.local'});
dotenv.config();
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = postgres(process.env.DATABASE_URL, {max:1,prepare:false});
try { await migrate(sql); } finally { await sql.end(); }
