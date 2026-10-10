ALTER TABLE users ADD COLUMN IF NOT EXISTS "deletedAt" timestamp;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS "deletedAt" timestamp;

-- Retain properties and financial history even if an older tool attempts DELETE.
DO $$ DECLARE item record;
BEGIN
  FOR item IN
    SELECT conrelid::regclass AS tbl, conname FROM pg_constraint
    WHERE contype = 'f' AND (
      (conrelid = 'properties'::regclass AND confrelid = 'users'::regclass AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'properties'::regclass AND attname = 'agentId')]::smallint[]) OR
      (conrelid = 'commissions'::regclass AND confrelid IN ('users'::regclass, 'properties'::regclass)))
  LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', item.tbl, item.conname); END LOOP;
END $$;
ALTER TABLE properties ADD CONSTRAINT properties_creator_restrict_fk FOREIGN KEY ("agentId") REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE commissions ADD CONSTRAINT commissions_property_restrict_fk FOREIGN KEY ("propertyId") REFERENCES properties(id) ON DELETE RESTRICT;
ALTER TABLE commissions ADD CONSTRAINT commissions_agent_restrict_fk FOREIGN KEY ("agentId") REFERENCES users(id) ON DELETE RESTRICT;

-- Do not guess which financial record is correct when existing live commissions conflict.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM commissions WHERE status IN ('pendente', 'paga') GROUP BY "propertyId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate live commissions detected. Reconcile them before applying production migrations.';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS commissions_one_live_per_property_idx ON commissions ("propertyId") WHERE status IN ('pendente', 'paga');

-- Keep the first primary image deterministically; all other image data is preserved.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY "propertyId" ORDER BY "sortOrder", id) AS position
  FROM property_images WHERE "isPrimary"
)
UPDATE property_images SET "isPrimary" = false WHERE id IN (SELECT id FROM ranked WHERE position > 1);
CREATE UNIQUE INDEX IF NOT EXISTS images_one_primary_per_property_idx ON property_images ("propertyId") WHERE "isPrimary";
CREATE INDEX IF NOT EXISTS properties_visibility_idx ON properties (status, "isApproved", "deletedAt");
CREATE INDEX IF NOT EXISTS properties_creator_idx ON properties ("agentId");
CREATE INDEX IF NOT EXISTS properties_assignment_idx ON properties ("assignedAgentId");
CREATE INDEX IF NOT EXISTS commissions_agent_idx ON commissions ("agentId");
CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_logs ("entityType", "entityId", "createdAt");
CREATE INDEX IF NOT EXISTS images_property_idx ON property_images ("propertyId");
CREATE TABLE IF NOT EXISTS rate_limits (key varchar(128) PRIMARY KEY, hits integer NOT NULL, "expiresAt" timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS rate_limits_expiry_idx ON rate_limits ("expiresAt");

-- Remove credential material recursively from historical JSON snapshots.
CREATE OR REPLACE FUNCTION pg_temp.redact_credentials(value jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE result jsonb; item record;
BEGIN
  IF jsonb_typeof(value) = 'object' THEN
    result := '{}'::jsonb;
    FOR item IN SELECT key, val FROM jsonb_each(value) AS entry(key, val) LOOP
      IF lower(item.key) NOT IN ('password', 'passwordhash', 'token', 'secret') THEN
        result := result || jsonb_build_object(item.key, pg_temp.redact_credentials(item.val));
      END IF;
    END LOOP;
    RETURN result;
  ELSIF jsonb_typeof(value) = 'array' THEN
    SELECT coalesce(jsonb_agg(pg_temp.redact_credentials(element)), '[]'::jsonb) INTO result FROM jsonb_array_elements(value) element;
    RETURN result;
  END IF;
  RETURN value;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.redact_snapshot(value text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  IF value IS NULL THEN RETURN NULL; END IF;
  RETURN pg_temp.redact_credentials(value::jsonb)::text;
EXCEPTION WHEN invalid_text_representation THEN
  -- Retain malformed non-sensitive text; erase malformed snapshots containing credential keys.
  IF value ~* '(password|passwordHash|token|secret)' THEN RETURN '[credential snapshot redacted]'; END IF;
  RETURN value;
END $$;
UPDATE audit_logs SET "previousValue" = pg_temp.redact_snapshot("previousValue"), "newValue" = pg_temp.redact_snapshot("newValue");

ALTER TABLE property_images ADD COLUMN IF NOT EXISTS "storageKey" text;
ALTER TABLE property_images ADD COLUMN IF NOT EXISTS "thumbnailKey" text;
CREATE UNIQUE INDEX IF NOT EXISTS images_storage_key_idx ON property_images ("storageKey");
