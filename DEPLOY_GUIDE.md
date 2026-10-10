# Production deployment

This guide covers the PostgreSQL/Supabase and Vercel setup in the current source. The October 2026 audit was verified locally; no remote migration or production deployment was performed.

## Environment

Configure the target environment outside committed source:

- `NODE_ENV=production` and a supported Node runtime (24 LTS is tested).
- `DATABASE_URL`: PostgreSQL connection string. For Supabase transaction pooling use its supplied pooler URL; the driver uses `prepare:false`. Include `sslmode=verify-full` to verify TLS and the server certificate. If the provider uses a private CA, install its official CA through `NODE_EXTRA_CA_CERTS`; do not disable certificate verification.
- `JWT_SECRET`: a unique random secret of at least 32 characters, for example generated with `openssl rand -hex 32`. Do not reuse the local test secret.
- `CLIENT_URL`: the exact HTTPS application origin, without a path or query. Production mutations reject missing or different Origin headers.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: storage project URL and server-only service credential. Never expose the service key through a `VITE_` variable.
- `SUPABASE_STORAGE_BUCKET=property-images` (or the chosen bucket name).
- `TRUST_PROXY_HOPS`: the actual trusted reverse-proxy count. Vercel defaults to 1; direct local access defaults to 0. Other hosts must configure this to avoid incorrect client-IP rate limiting.
- Leave `ENABLE_DEV_LOGIN` unset or false. Production refuses to start with the bypass enabled.

Explicit environment variables take precedence over dotenv files. Administrative scripts load `.env.local` and then `.env`; inspect the intended target before running a migration. Never copy `.env.test.local` into production.

## Private storage

Create a **private** Supabase bucket. Set its file size limit to exactly 5,242,880 bytes and allowed MIME types to only `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Do not add anonymous bucket access policies. The server uses its service credential; authenticated agents receive a signed upload destination for their own property.

The application checks the decoded format, restricts images to 16 million pixels, strips metadata and creates WebP derivatives up to 1920 pixels plus 400-pixel thumbnails. Animated GIFs become a static image. Original uploads are removed on successful completion. Reads recheck property visibility and issue a short-lived signed URL. Such URLs remain bearer credentials for their validity window; deleting the object revokes availability. Local disk image storage is development-only.

Supabase [signed upload URLs](https://supabase.com/docs/reference/javascript/file-buckets-createsigneduploadurl) last two hours; application completion tokens expire after five minutes. Abandoned uploads may therefore exist temporarily. Run `pnpm storage:cleanup` to review unreferenced objects older than 24 hours. After review, `pnpm storage:cleanup --apply` removes them through the Storage API. Schedule the reviewed command daily; it preserves referenced images, including archived properties.

## Existing database release order

1. Back up the database and image storage, and verify restoration. Rehearse against a staging copy with the intended production configuration.
2. Review `drizzle/0007_supabase_postgres.sql` (idempotent PostgreSQL baseline) and `drizzle/0008_production_hardening.sql`. Pause writes during the migration/image conversion window.
3. Run `pnpm db:migrate`. Migrations execute in one transaction under an advisory lock and store SHA-256 checksums in `propadmin_migrations`. Never edit an applied migration; add a new one.
4. If migration detects multiple pending/paid commissions for one property, it aborts. Reconcile those financial records manually before retrying; the migration does not discard them. Existing primary-image duplicates are resolved deterministically.
5. Run `pnpm db:migrate-images`. It converts inline base64 images to private objects and is resumable. External image URLs or invalid files require explicit review/re-upload; the converter never fetches arbitrary URLs.
6. Ensure at least one intended administrator is active. An existing administrator can promote an approved account through the application. For a brand-new environment, create a pending account through signup and have the database owner bootstrap that specific account to active/admin after verifying its identity. The local test seeder deliberately refuses production and remote URLs.
7. Run `pnpm production:check`. It requires secure configuration, unchanged/applied migrations, an active administrator, no legacy images and the private bucket restrictions above.
8. Run the verification commands in README, build and deploy. On Vercel, configure the production variables before deployment; `vercel.json` builds the client and routes API requests to `api/index.ts`.
9. Check `/api/health` for `status:ok` and `database:connected`; verify sign-in, pending-property image privacy, approval, signed upload completion and commission payment in staging before admitting production traffic.

Rolling back application files does not reverse schema or image migration changes. Use the tested backup/restore plan for a database rollback; do not delete migration-history rows to force reruns.

## Operational behavior

Rate limits share PostgreSQL counters across application instances, including login/signup and upload limits. Serverless instances use a bounded connection pool; monitor database connections, API errors, rate-limit responses and storage cleanup failures.

Paid and cancelled commissions are final records. Cancellation of a pending commission reopens an approved, unarchived property. Archiving a user or property retains ownership and financial references. The API blocks self-demotion/deactivation and serializes administrator changes to prevent removing the last active administrator. Production health/preflight checks do not replace a staging smoke test of the remote deployment.
