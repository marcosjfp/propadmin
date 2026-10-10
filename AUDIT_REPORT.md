# Project audit and remediation — 10 October 2026

The confirmed application issues below were repaired and checked locally. Remote production credentials, database contents and Supabase bucket configuration have not been validated or changed. Production deployment still requires the environment and release checks in [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md).

## Resolved findings

| Area | Changes |
| --- | --- |
| Authentication and authorization | CSRF covers every mutation in production and fails closed; revoked/archived accounts lose access; JWT verification restricts algorithms; development bypass is disabled by default. Private images, commission details and audit history enforce visibility/roles. |
| Credentials and audit history | User responses exclude password hashes; snapshots redact credential fields recursively; migration removes historical credential snapshots; login/logout/signup events are recorded. |
| Financial integrity | Property locks serialize transaction creation and approval decisions; a database index prevents duplicate live commissions. Assigned agents receive commissions, rounded to cents. Paid/cancelled records cannot be rewritten. Pending cancellation retains the record and reopens the property. |
| Retention and administrator access | Account/property deletion archives records; restrictive foreign keys preserve financial references. Archiving preserves sold/rented status. Self-deactivation/demotion and competing administrator changes cannot remove all active admins. |
| Images | Private object storage replaces database base64 storage. Signed uploads support 5 MB, validate real image content and generate WebP/thumbnails. Property locks and indexes protect the 10-image limit and single primary image. Legacy conversion and reviewed orphan cleanup commands are supplied. |
| Validation and correctness | IDs, pagination, dates, passwords and inputs are bounded. Rejected listings return to review after edits. Generic property edits cannot bypass transaction finalization. Search includes city and exact property ID, filter changes reset pagination, agent assignment lists all eligible agents, and 0% commissions remain 0%. |
| Dashboard and UI | Server aggregates cover all records, independent of list pages; agent summaries paginate. React Query 4 loading states and hook ordering/dependencies are corrected. Routes lazy-load. Mobile property header clipping and inaccessible filter/action controls were repaired. |
| Infrastructure | Shared database rate limits replace process memory. Production configuration rejects insecure/missing settings and requires verified database TLS. Checksummed transactional migrations, private-bucket preflight, graceful shutdown and isolated local admin setup are supplied. |
| Dependencies and tooling | Updated Vite to 8.3.4, React plugin to 6.1.2, Tailwind to 4.3.3 and ESLint to 10.12.0; patched the retained React 18/tRPC 10/React Query 4 stack. Removed unused Recharts/calendar dependencies and vulnerable unused Drizzle Kit tooling. Strict TypeScript and hooks dependency linting pass. |
| Documentation and CI | Current PostgreSQL/private-storage release instructions replace obsolete setup guidance. CI installs the frozen lockfile and runs type checks, lint, build, dependency audit and real PostgreSQL tests. |

## Validation

- Root strict TypeScript check, client TypeScript/build and zero-warning ESLint pass.
- All 23 tests pass with local PostgreSQL: fresh/repeated/legacy migrations, recursive historical redaction, session revocation, role boundaries, aggregate pagination, administrator races, approval races, commission lifecycle and beneficiary rounding, concurrent image operations and shared rate counters. HTTP tests also start a real server and verify cookies, signed uploads, idempotent completion, WebP reads and pending-image privacy.
- Browser smoke checks cover real sign-in, authenticated dashboard, property management/form and smaller-screen layout. These are manual smoke checks, not a comprehensive browser automation suite.
- The build has no chunk-size warning: largest JavaScript chunk is approximately 135 KB before gzip, compared with roughly 567 KB before route splitting.
- Dependency audit reports zero known advisories in the resolved lockfile. Frozen-lockfile installation passes.
- The local test administrator is `local-admin`; credentials remain in ignored `.env.test.local`. Temporary test fixtures are removed after checks. See [LOCAL_TEST_ADMIN.md](LOCAL_TEST_ADMIN.md).

## Release requirements and further opportunities

Configure the real HTTPS origin, production secrets, PostgreSQL access and private Supabase bucket; reconcile any legacy duplicate commissions, migrate inline images, bootstrap/verify the intended administrator and pass `pnpm production:check` against staging and production before release. No production readiness claim is made without those checks.

Further improvements beyond these repairs include a full browser regression suite, password recovery/MFA if required by the product, and database pagination for increasingly large commission reports. The report currently loads the complete commission set for date-range calculations, so test expected production data volumes. Shared formatters/status labels can be consolidated further without changing behavior.

## Live deployment follow-up

The supplied Vercel log confirmed `ERR_MODULE_NOT_FOUND` from extensionless relative imports in the auth router. Those imports and the schema-relations import now use `.js`, backend resolution uses NodeNext, and every production build compiles and loads the server through native Node ESM. Local `tsx` tests had not exposed this deployment-specific failure. The detailed deployment guide now separates runtime transaction pooling from administrative session pooling and supports optional provider CA PEM configuration. The live deployment still needs the corrected commit and environment/migrations; no remote changes were made here.
