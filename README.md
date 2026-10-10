# PropAdmin

Property administration for users, agents and administrators. Agents submit listings for review; administrators approve properties, assign agents and manage commissions. Accounts and properties are archived to preserve financial history.

The application uses React 18, Wouter, tRPC 10, React Query 4, Express 5, Drizzle and PostgreSQL. The updated build uses Vite 8, Tailwind CSS 4 and ESLint 10. Node 24 LTS and pnpm 11.1.3 are the tested toolchain; Node 22.12 or newer is required.

## Local development

```sh
pnpm install --frozen-lockfile
```

Follow [LOCAL_TEST_ADMIN.md](LOCAL_TEST_ADMIN.md) to start the isolated Docker database and use the local test administrator. Existing remote environment files are not used by `pnpm dev:local`.

```sh
pnpm db:seed-local-admin
pnpm build
pnpm dev:local
```

Open http://localhost:3000/login. For frontend hot reload, run `pnpm client-dev` in a second terminal and open http://localhost:5173/login.

## Verification

```sh
pnpm type-check
pnpm server:check
pnpm --dir client lint
pnpm test
pnpm test:integration
pnpm build
pnpm audit --audit-level moderate
```

Database tests require the local database and `.env.test.local`. They refuse remote database URLs and use disposable fixtures/schemas. CI also runs the database integration suite against an ephemeral PostgreSQL service.

## Production

Use [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) for migrations, private image storage, credentials and release checks. `pnpm production:check` validates the configured production database and bucket without modifying them. Building locally does not verify remote infrastructure or deploy the application.

See [AUDIT_REPORT.md](AUDIT_REPORT.md) for the resolved findings and validation. The previous infrastructure/script guides are retained under `docs/archive/` for historical reference.
