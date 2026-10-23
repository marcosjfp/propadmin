SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- PropAdmin authorizes requests through its backend and custom login system.
-- Browser-facing Supabase roles must not access these tables directly.
-- Keep names search-path-relative so isolated database tests stay isolated.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['users', 'properties', 'commissions', 'property_images', 'audit_logs', 'rate_limits', 'propadmin_migrations'] LOOP
    -- Already-protected tables need no exclusive lock during a live recovery.
    IF EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass(table_name) AND NOT relrowsecurity) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON TABLE users, properties, commissions, property_images,
  audit_logs, rate_limits, propadmin_migrations FROM PUBLIC;

DO $$
DECLARE browser_role text;
BEGIN
  FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    -- These roles exist in Supabase, but not in a plain local PostgreSQL install.
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = browser_role) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE users, properties, commissions, property_images, audit_logs, rate_limits, propadmin_migrations FROM %I',
        browser_role
      );
    END IF;
  END LOOP;
END $$;
