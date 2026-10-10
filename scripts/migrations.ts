import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type postgres from 'postgres';

export const migrationFiles = ['0007_supabase_postgres.sql', '0008_production_hardening.sql'] as const;

export async function migrate(sql: postgres.Sql) {
  await sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(792817360)`;
    await tx`CREATE TABLE IF NOT EXISTS propadmin_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`;
    for (const name of migrationFiles) {
      const contents = await readFile(new URL(`../drizzle/${name}`, import.meta.url), 'utf8');
      const checksum = createHash('sha256').update(contents).digest('hex');
      const [previous] = await tx`SELECT checksum FROM propadmin_migrations WHERE name = ${name}`;
      if (previous) {
        if (previous.checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      await tx.unsafe(contents);
      await tx`INSERT INTO propadmin_migrations (name, checksum) VALUES (${name}, ${checksum})`;
      console.log(`Applied ${name}`);
    }
  });
}
