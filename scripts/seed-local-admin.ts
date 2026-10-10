import 'dotenv/config';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { migrate } from './migrations.js';

// Refuse to mutate the project's remote database, even if it is configured as development.
const connection = new URL(process.env.DATABASE_URL ?? '');
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(connection.hostname)) {
  throw new Error('Local admin seeding requires a loopback database and a non-production environment.');
}
const password = process.env.LOCAL_ADMIN_PASSWORD;
if (!password || password.length < 12 || Buffer.byteLength(password) > 72) {
  throw new Error('Set LOCAL_ADMIN_PASSWORD to a password between 12 and 72 bytes.');
}
const sql = postgres(connection.toString(), { max: 1 });
try {
  await migrate(sql);
  const username = process.env.LOCAL_ADMIN_USERNAME || 'local-admin';
  const hash = await bcrypt.hash(password, 10);
  const inserted = await sql`
    INSERT INTO users ("openId", username, "passwordHash", name, email, role, status, "loginMethod")
    VALUES (${`local-test-${randomUUID()}`}, ${username}, ${hash}, 'Local Test Admin', 'admin@example.test', 'admin', 'active', 'local')
    ON CONFLICT (username) DO NOTHING
    RETURNING id, username, role, status
  `;
  if (inserted.length) console.log('Created local test admin:', inserted[0]);
  else {
    const [existing] = await sql`SELECT role, status FROM users WHERE username = ${username}`;
    if (existing?.role !== 'admin' || existing?.status !== 'active') throw new Error('Username already belongs to a different account; choose another username.');
    console.log('Local test admin already exists; password unchanged.');
  }
} finally {
  await sql.end();
}
