# PropAdmin: Vercel + Supabase deployment and recovery

Checked against this repository and official documentation on 10 October 2026. Application URL: https://propadmin-lac.vercel.app.

## Confirmed live failure and recommendation

The public login page returns HTTP 200, but `/api/health` and `/api/trpc/auth.me` return HTTP 500 with `FUNCTION_INVOCATION_FAILED`. The supplied Vercel log identifies the immediate cause:

```text
ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/server/trpc'
imported from /var/task/server/routers/auth.js
```

The auth router used extensionless relative imports. Local `tsx` accepted them; deployed Node ESM did not. Those imports now include `.js`. A further extensionless schema import was corrected, backend TypeScript now uses NodeNext resolution, and `pnpm build` compiles/imports the server using native Node before building the frontend. [Node requires extensions for relative ESM imports](https://nodejs.org/api/esm.html#mandatory-file-extensions).

**Keep Vercel + Supabase for this recovery.** Switching PostgreSQL providers cannot resolve a JavaScript module-loading error. Neon is a viable database alternative with [pooled connections](https://neon.com/blog/pgbouncer-the-one-with-prepared-statements), but this code also needs Supabase Storage; a Neon migration would introduce database/data migration work and retain a storage provider. Reconsider only after the current deployment works and there is a specific database requirement.

The corrected code must reach the GitHub repository used by Vercel before it can change the live application. Remote configuration and migrations must be ready before the production push. No remote database, credentials, project settings or deployment have been changed by this local preparation.

Follow the numbered stages below in order. Commands run in **Terminal on your Mac**, SQL runs in **Supabase SQL Editor**, and dashboard settings are changed in the named service. Replace uppercase placeholders with your actual values; never paste passwords, keys or complete connection URLs into chat.

Prepared locally for this recovery:

- ESM import fix and a native Node server check that runs during every build.
- A pinned pnpm install command in `vercel.json`, alongside the existing build/output/routing settings.
- An ignored, owner-only `.env.production.local` template, with a generated application JWT secret. Its database URL and Supabase key still need your actual values.
- Local integration tests and the local test administrator. The local account is separate from Supabase production.

A local Git commit alone does not publish anything. Pushing `main` can start a Vercel production deployment, so do that at stage 9.

## 1. Open the correct repository and verify local preparation

Open a new Terminal window and run:

```sh
cd /Users/marcosfp/Development/propadmin
git branch --show-current
git status --short
git log -1 --oneline
```

For this recovery, the branch is `main` and the GitHub repository is `marcosjfp/propadmin`. The local fix commit should mention Vercel startup/Supabase deployment. An empty `git status --short` means tracked changes are committed; ignored environment files will not appear there.

Confirm your private files are excluded:

```sh
git check-ignore .env.production.local .env.test.local
```

Expected output lists both paths. Keep `.env.production.local` private, including when sharing screenshots.

Codex runs the checks before creating the local recovery commit. To repeat them after subsequent code edits:

```sh
pnpm install --frozen-lockfile
pnpm type-check
pnpm --dir client lint
pnpm test:integration
pnpm build
```

Integration tests use the local Docker database and `.env.test.local`. If Docker was stopped, open Docker Desktop and start the local database first:

```sh
docker compose --env-file .env.test.local -f docker-compose.local.yml up -d --wait
```

Expected: checks pass and the build includes `Native Node ESM server import passed.` This tests the emitted server with Node's actual module loader, without connecting to a remote database.

**Checkpoint:** Local code is checked and committed. Continue with service configuration before pushing.

## 2. Collect the correct Supabase connection details

Open the existing Supabase project and confirm it is running. Click **Connect** and copy these two URLs from the dashboard:

| Purpose | Connection |
| --- | --- |
| Vercel runtime | Shared Transaction pooler, port 6543 |
| Local migrations and image conversion | Shared Session pooler, port 5432 |

Use the actual copied hostname; do not construct it from a guessed region. Shared-pooler usernames include the project reference, typically `postgres.PROJECT_REF`. The password is the database password, not an API key. Encode reserved characters in the password when inserting it in a URL; avoid double-encoding a URL already assembled for you.

If the copied URL contains `[YOUR-PASSWORD]`, replace that part with the URL-encoded database password (remove the brackets). For a password containing characters such as `@`, `:`, `/`, `#` or `%`, this local helper asks for it without echoing input, then prints the encoded value for you to copy:

```sh
python3 -c 'import getpass, urllib.parse; print(urllib.parse.quote(getpass.getpass("Database password (hidden): "), safe=""))'
```

The printed value is still a secret. Keep it on your computer. Do not encode the entire connection string, and do not re-encode a password the dashboard already encoded.

Append `?sslmode=verify-full`, or `&sslmode=verify-full` if the copied URL already has query parameters. If `sslmode` is already present with another value, change it to `verify-full` rather than adding a duplicate parameter. An illustrative runtime URL is:

```text
postgresql://postgres.PROJECT_REF:ENCODED_DB_PASSWORD@COPIED_POOLER_HOST:6543/postgres?sslmode=verify-full
```

The [transaction pooler is intended for serverless traffic](https://supabase.com/docs/guides/database/connecting-to-postgres). This app disables prepared statements and query pipelining. Administrative image conversion uses a session-level advisory lock, so its connection must preserve a session. Shared poolers provide an [IPv4-compatible route](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP); a direct `db.PROJECT_REF.supabase.co` URL may have different network requirements.

For a certificate verification failure, download the official database root certificate from Supabase Database settings. Put the complete PEM certificate into the optional `DATABASE_SSL_CA` environment variable. The application and administrative scripts accept real line breaks or escaped `\n`. Certificate verification remains enabled. This support avoids depending on a certificate-file path inside Vercel's function bundle.

**Check:** Runtime URL uses the copied transaction hostname/username; administrative URL uses the session pooler. Neither URL points to localhost.

## 3. Configure private image storage

In Supabase → Storage:

1. Create or select the bucket `property-images`.
2. Keep **Public bucket** off.
3. Set its maximum file size to exactly **5,242,880 bytes (5 MiB)**. If the dashboard accepts an MB value, confirm the resulting byte value with `production:check`.
4. Restrict MIME types to exactly `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
5. Ensure the project's global storage limit is at least that size.
6. Do not add anonymous read/write policies to this bucket for this app.

These restrictions are supported by [Supabase bucket configuration](https://supabase.com/docs/guides/storage/buckets/creating-buckets). This app authorizes uploads in its own API and uses signed destinations; pending images stay private. Successful uploads are decoded, stripped of metadata and converted into WebP images/thumbnails. Animated GIFs become static images.

Find the project URL and a **server secret key** in Supabase → Project Settings → API Keys/Connect. Prefer a new `sb_secret_...` key. Store it under `SUPABASE_SERVICE_ROLE_KEY`: that variable name is historical, and this SDK accepts the new server key. Do not use an `anon`/publishable key in that variable. [Supabase distinguishes server secret keys from browser publishable keys](https://supabase.com/docs/guides/getting-started/api-keys).

**Check:** Bucket is private, the key belongs to the same project as `SUPABASE_URL`, and the key is never placed in a frontend `VITE_` variable.

## 4. Keep application authentication and database access distinct

PropAdmin uses its own JWT/bcrypt login and the `public.users` table. Creating a user under **Supabase Authentication → Users** does not create a PropAdmin account.

The app accesses PostgreSQL through its backend. It does not use Supabase's REST/GraphQL Data API for these tables. For a Supabase project dedicated to PropAdmin, disable **Enable Data API** in the Data API integration settings. [Supabase documents this option for server-only database access](https://supabase.com/docs/guides/api/securing-your-api#disable-the-data-api).

If other applications share the project and need that API, keep it enabled and review grants/RLS for PropAdmin's `users`, `properties`, `commissions`, `property_images`, `audit_logs`, `rate_limits` and `propadmin_migrations` tables. Do not expose account hashes or financial/audit tables through anonymous policies. Table creation through SQL does not itself guarantee RLS.

**Check:** PropAdmin requests go through `/api/trpc/*`; accounts appear in `public.users`. Do not configure Supabase Auth redirect URLs to fix this app's custom login.

## 5. Fill in the private administrative environment file

In your editor, open this existing file:

```text
/Users/marcosfp/Development/propadmin/.env.production.local
```

On this Mac, you can also open it from Terminal:

```sh
open -t .env.production.local
```

The file was created with owner-only permissions and a generated 64-character hexadecimal `JWT_SECRET`. Replace these values, leaving the other prepared settings in place:

| Variable | What to put into the local file |
| --- | --- |
| `DATABASE_URL` | Complete **shared session pooler** connection string, port 5432, with the database password encoded and `sslmode=verify-full` |
| `SUPABASE_URL` | Your project's actual HTTPS project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your project's server secret key |
| `DATABASE_SSL_CA` | Optional complete official CA certificate, if your connection requires it |

For `DATABASE_URL`, replace the entire example value with the URL copied at stage 2. This avoids accidentally leaving a placeholder username or hostname. There must be no `REPLACE_` values left in active settings.

Keep `CLIENT_URL=https://propadmin-lac.vercel.app`, `SUPABASE_STORAGE_BUCKET=property-images`, `NODE_ENV=production`, `TRUST_PROXY_HOPS=1` and `ENABLE_DEV_LOGIN=false`. Use the generated `JWT_SECRET` in Vercel too. If you already have a strong production app JWT secret you want to retain, replace the generated value with that existing secret in both places; rotating it signs out existing sessions.

Save the file. Do not add spaces around `=`. For a certificate, use the commented example with literal escaped `\n` between certificate lines, or a correctly quoted multiline PEM value.

Do not use `pnpm db:seed-local-admin` against Supabase. That command is intentionally local-only. The explicit `--env-file=.env.production.local` commands below keep administrative operations separate from the existing development configuration. Use a fresh Terminal without exported `DATABASE_URL`/other overrides, because existing process variables take precedence over Node's env file.

**Checkpoint:** The local file has real session-pooler credentials and the same Supabase project URL/key/bucket you configured above. It stays ignored by Git.

## 6. Check that Vercel builds the complete repository

Open Vercel → the existing `propadmin` project → Settings → Build and Deployment (labels can vary slightly).

| Setting | Required value for this repository |
| --- | --- |
| Root Directory | Repository root; leave blank if PropAdmin is the repository root. Do not select `client`. |
| Framework Preset | Other, for this custom static frontend + `api/index.ts` deployment |
| Node.js Version | 24.x |
| Install Command | `npm install --global --force pnpm@11.1.3 && pnpm --version && pnpm install --frozen-lockfile` |
| Build Command | `pnpm run build` |
| Output Directory | `dist` |
| Production Branch | `main` in `marcosjfp/propadmin` for this repository |

The committed `vercel.json` already specifies the install, build and output commands. Leave dashboard command overrides disabled so that file controls them. If your dashboard requires explicit entries, use the matching values in the table. The explicit install command pins the version used by this workspace instead of depending on an older Vercel default. `--force` replaces an existing pnpm shim only inside the disposable Vercel build environment. Check the build log confirms pnpm 11.1.3. Do not replace the lockfile during deployment. Vercel documents [package-manager overrides](https://vercel.com/docs/package-managers) and supports [Node 24](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

Keep the existing root `vercel.json`. It routes `/api/*` and `/trpc/*` to the API entrypoint, serves generated assets, and falls back to `index.html` for frontend routes. `api/index.ts` exports the Express handler. Vercel supports [Express applications](https://vercel.com/docs/frameworks/backend/express); no separate `pnpm start` command is needed there.

**Check:** Vercel sees both `client/` and `api/`, and the root lockfile/build script. A deployment of only the client can display login while leaving the backend unavailable.

Also open Settings → Git and confirm the connected repository is `marcosjfp/propadmin`. Save settings without redeploying an older commit.

## 7. Set Vercel production environment variables

Open Vercel → Project → Settings → Environment Variables. Add/select the **Production** environment for the following values:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Transaction pooler URL from stage 2, with `sslmode=verify-full` |
| `JWT_SECRET` | The same generated app secret from the local private file |
| `CLIENT_URL` | `https://propadmin-lac.vercel.app` |
| `SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | The server secret key from stage 3 |
| `SUPABASE_STORAGE_BUCKET` | `property-images` |
| `TRUST_PROXY_HOPS` | `1` for this Vercel setup |
| `ENABLE_DEV_LOGIN` | `false`, or remove the variable |
| `DATABASE_SSL_CA` | Optional official PEM root certificate if required |

Copy the generated `JWT_SECRET` from your private `.env.production.local` file into the Vercel variable. A new secret is already prepared; do not generate a different one for each environment file. Do not reuse Supabase's JWT signing secret or the local test environment's JWT secret. Changing an existing app JWT secret signs out existing sessions.

`CLIENT_URL` must match the HTTPS origin you actually use for login, without `/login`, a query or another hostname. When moving to a custom domain, update this value and use that domain consistently.

Preview deployments need their own staging database/bucket/secrets and exact staging origin. Avoid copying production data access into arbitrary previews. A preview's different hostname can otherwise cause expected CSRF rejection.

[Environment changes apply to new deployments](https://vercel.com/docs/environment-variables); editing variables alone does not update the already running deployment.

**Check:** Save each variable. Every required variable is scoped to Production, with no literal placeholder text or quotes added by copying an example.

## 8. Migrate the existing database and inline images

Before changing an existing database:

1. Open Supabase → Database → Backups and identify a recovery point that covers the data you need to preserve.
2. If scheduled backups are unavailable or do not cover the current data, take a fresh logical backup using the [official backup/restore CLI procedure](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). Store the files privately outside this Git repository.
3. Back up existing Storage objects separately, retaining their bucket/folder paths. For a small bucket, download the objects through Storage; use the documented storage tooling for a larger collection. A database backup contains storage metadata, not the image files themselves.
4. Rehearse restoration and these migrations on staging before modifying valuable production records.
5. Pause writes from the old application during the production migration/image-conversion window.

[Supabase documents plan-dependent database backups and separate Storage backup requirements](https://supabase.com/docs/guides/platform/backups). If the project is genuinely empty, there is no existing application data to preserve, but check that before assuming it.

In a fresh Terminal, return to the project root and run the migration runner. Execute one command at a time and wait for a successful result before continuing:

```sh
cd /Users/marcosfp/Development/propadmin
node --env-file=.env.production.local --import tsx scripts/migrate.ts
```

Expected first-run output names `0007_supabase_postgres.sql` and `0008_production_hardening.sql`. Existing bootstrap tables are retained. The runner records checksums and executes migrations transactionally. A later run with identical files applies nothing.

If migration finds multiple pending/paid commissions for one property, it aborts. Reconcile those financial records before retrying; do not delete migration checksums or alter applied migration files to bypass the check.

Convert old inline images:

```sh
node --env-file=.env.production.local --import tsx scripts/migrate-images.ts
```

The converter can resume after an interruption. External legacy image URLs and invalid data need review/re-upload; it will not fetch arbitrary external URLs.

In Supabase SQL Editor, verify without displaying credentials:

```sql
SELECT name, applied_at
FROM public.propadmin_migrations
ORDER BY name;

SELECT count(*) AS legacy_images_remaining
FROM public.property_images
WHERE "storageKey" IS NULL;
```

**Check:** Two migration rows exist and `legacy_images_remaining` is zero. Apply the Data API/RLS decision in stage 4 to the resulting tables.

## 9. Push the corrected commit and wait for Vercel

The local recovery commit is prepared after checks; review it before publishing:

```sh
git status --short
git log -1 --oneline
git show --stat --oneline HEAD
```

The commit must include `server/routers/auth.ts`, `scripts/check-server.mjs`, `server/database-options.ts`, `tsconfig.json`, `vercel.json` and this guide. Environment files must not be included.

After stages 2–8 are complete, publish the local `main` commit:

```sh
git push origin main
```

If push reports a non-fast-forward rejection, stop and reconcile the remote changes; do not use force push. If GitHub authentication fails, complete authentication in your Git client and retry the same command. Do not paste tokens into chat.

Open Vercel → `propadmin` → Deployments. The Git integration should create a **Production** deployment of the pushed commit. Open it and compare its commit ID with `git log -1 --oneline`.

Inspect the build log. Expected:

1. pnpm version `11.1.3`.
2. `Native Node ESM server import passed.`
3. A successful frontend build.
4. Deployment becomes **Ready**.

If no deployment starts, check Settings → Git for repository/production branch. Deploy the newly pushed commit through that integration. If rerunning a deployment, select the deployment of the **new commit** → Redeploy and turn off reuse of the old build cache for this recovery. Redeploying the previous commit cannot include local fixes.

Once Ready, open these URLs:

```text
https://propadmin-lac.vercel.app/api/health
https://propadmin-lac.vercel.app/login
```

Expected health result: HTTP 200 with `status: "ok"` and `database: "connected"`, plus a timestamp. You can check from Terminal too:

```sh
curl --fail-with-body https://propadmin-lac.vercel.app/api/health
```

The login page should render. Anonymous `/api/trpc/auth.me` returning HTTP 401 is expected. A 500 means the API still failed; open Vercel Logs, filter the new `/api/health` request, and inspect its first error.

**Checkpoint:** The new commit is live and the database health check succeeds. Finish administrator verification and final preflight before normal use.

## 10. Verify or bootstrap the intended production administrator

If an administrator already exists, use this query to check it:

```sql
SELECT id, username, email, role, status, "deletedAt",
       ("passwordHash" IS NOT NULL) AS has_password
FROM public.users
WHERE role = 'admin';
```

An administrator must have a username, a usable bcrypt password hash, `role='admin'`, `status='active'` and no deletion timestamp. A row created by an older OAuth/dev bypass path may lack local login credentials.

If no usable administrator exists, open `https://propadmin-lac.vercel.app/signup` yourself and create an account with a unique strong password. It is expected to be pending. Then, as the Supabase database owner:

```sql
SELECT id, username, email, role, status
FROM public.users
WHERE username = 'YOUR_CHOSEN_USERNAME';
```

Write down the numeric ID returned for your own account. After verifying the exact account ID and identity, replace both placeholders below and activate only that account:

```sql
UPDATE public.users
SET role = 'admin', status = 'active', "updatedAt" = now()
WHERE id = YOUR_VERIFIED_NUMERIC_ID
  AND username = 'YOUR_CHOSEN_USERNAME'
  AND "deletedAt" IS NULL
RETURNING id, username, role, status;
```

Replace the placeholders before running the query; expect exactly one returned row. This is a one-time bootstrap by the database owner. Later approvals/promotions should use the authenticated administrator UI.

The requested `local-admin` exists only in the local Docker database; it is not a production account.

**Check:** Real `/login` succeeds with the intended account and `/admin` opens. Run final preflight in stage 11 after bootstrap.

## 11. Run production preflight and accept the deployment

Using the administrative env file:

```sh
node --env-file=.env.production.local --import tsx scripts/production-check.ts
```

Expected output:

```text
Production configuration, migrations, administrator and private storage checks passed.
```

It checks secure configuration, applied/unchanged migration files, an active administrator, absence of legacy image records and exact private bucket restrictions. Because it uses the administrative session URL, also verify live `/api/health` to exercise Vercel's runtime transaction URL.

In your browser, use the production origin `https://propadmin-lac.vercel.app` consistently. Test the following with clearly identified test records or in staging, then remove temporary nonfinancial records when finished:

- An ordinary account stays pending until approved and cannot open administrator tools.
- An approved agent can submit a property; the administrator can approve/reject it.
- JPEG/PNG uploads succeed, thumbnails render and a pending property's images cannot be read anonymously.
- Active, approved property images can be viewed through their application URLs.
- In staging, recording a transaction credits the assigned agent; cancellation retains history, and paid commissions cannot be rewritten. Avoid generating fake financial transactions in real production data.
- Sign-out clears the session; login works again using the exact configured origin.

**Check:** Preflight and the live workflow checks pass. A successful static frontend build alone does not prove API/database/storage functionality.

## Troubleshooting by symptom

| Symptom/log | Meaning and next check |
| --- | --- |
| `ERR_MODULE_NOT_FOUND ... /server/trpc` | Old extensionless import build is still deployed. Verify commit and native-server check, then redeploy. |
| `FUNCTION_INVOCATION_FAILED` / health 500 | Inspect the first function error in Vercel Logs. Possible import, configuration or native-module startup error; it is not a diagnosis by itself. |
| `SUPABASE_URL is required` or another required-variable error | Production scope is missing a variable; save it and create a new deployment. |
| Health 503, database unavailable | Startup reached the health route. Check pooler hostname/port, encoded database password, SSL and Supabase project/network state. |
| `password authentication failed` | Verify database password and pooler username; API keys are not database passwords. |
| `Tenant or user not found` | Recopy the complete pooler URL, including project reference in the username and actual hostname. |
| Certificate-chain/self-signed certificate error | Supply the official CA PEM through `DATABASE_SSL_CA`; retain verified TLS. |
| `relation ... does not exist` / missing `deletedAt` or `rate_limits` | Migrations did not run on the database used by this deployment. |
| Login says pending/rejected | Check the account in `public.users`, not Supabase Auth, and complete administrator approval/bootstrap. |
| Mutations return 403 but reads work | Compare request origin with `CLIENT_URL`; the app intentionally rejects mismatches/missing Origin. |
| Upload fails; other API works | Check same-project server key, private bucket name, MIME/file limits and API logs for decoder/storage errors. |
| Image preflight says legacy images remain | Run the converter, then inspect/re-upload unsupported legacy records. |
| New settings appear to have no effect | Confirm the latest deployment's commit/environment; existing deployments keep their old variable values. |
| Lockfile/package-manager installation error | Verify root directory and explicit pnpm 11.1.3 install, then rebuild without stale cache. |

## Ongoing operation

Run `node --env-file=.env.production.local --import tsx scripts/cleanup-storage.ts` to review abandoned/unreferenced objects older than 24 hours. After reviewing the list, add `--apply` to remove those objects. Schedule the reviewed cleanup daily; referenced images, including archived-property images, are retained. This cleanup script is an administrative task, not an existing public cron endpoint.

Monitor Vercel API errors, database connections and storage usage. Rehearse backups/restores. Rolling back the frontend/server deployment does not reverse schema or image migrations; use the tested data recovery plan when required.
