-- Migration 007: production hardening, validation, and maintainability.
-- Additive only: no table, column, or row is dropped, and no existing
-- constraint is relaxed. Everything below is safe to run on the live branch.
--
-- Scope:
--   1. Auto-maintain updated_at on every table that has the column, without
--      overwriting an explicitly supplied value (the backfill sets historical
--      timestamps and must keep them).
--   2. Close the remaining integrity gaps: coordinate ranges/pairs, an orphaned
--      outage timeline row, non-JSON settings, and non-SHA-256 secret hashes.
--   3. Add the missing users.legacy_resident_uuid -> resident_accounts link.
--   4. Add the indexes used by the Admin, Staff, and Resident screens that the
--      foreign-key pass in migration 006 did not cover.
--   5. Keep users.role and the user_roles matrix in sync.
--   6. Add read-only diagnostic views for data quality and effective access.
--
-- Requires PostgreSQL 16+ (settings uses the SQL/JSON `IS JSON` predicate);
-- the Neon branch is PostgreSQL 18.

-- ---------------------------------------------------------------------------
-- 1. updated_at maintenance
-- ---------------------------------------------------------------------------
-- Only replace updated_at when the statement did not assign it. The backfill
-- writes historical values explicitly and those must be preserved exactly.

CREATE OR REPLACE FUNCTION powerwatch_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$fn$;

DO $do$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'users', 'user_profiles', 'barangays', 'settings',
    'reports', 'incidents', 'scheduled_outages',
    'repair_assignments', 'incident_assignments', 'notification_preferences'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', target || '_touch_updated_at', target);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION powerwatch_touch_updated_at()',
      target || '_touch_updated_at', target
    );
  END LOOP;
END
$do$;

-- ---------------------------------------------------------------------------
-- 2. Value and range validation
-- ---------------------------------------------------------------------------
-- Each constraint is added NOT VALID and then validated so the operation takes
-- only a brief lock and fails loudly if existing rows would violate it.

DO $do$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('barangays', 'barangays_population_check',
        $chk$population IS NULL OR population >= 0$chk$),
      ('barangays', 'barangays_coordinates_check',
        $chk$((latitude IS NULL) = (longitude IS NULL)) AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))$chk$),
      ('reports', 'reports_coordinates_check',
        $chk$((latitude IS NULL) = (longitude IS NULL)) AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))$chk$),
      ('incidents', 'incidents_coordinates_check',
        $chk$((latitude IS NULL) = (longitude IS NULL)) AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))$chk$),
      ('repair_teams', 'repair_teams_coordinates_check',
        $chk$((current_latitude IS NULL) = (current_longitude IS NULL)) AND (current_latitude IS NULL OR (current_latitude BETWEEN -90 AND 90 AND current_longitude BETWEEN -180 AND 180))$chk$),
      ('repair_assignments', 'repair_assignments_coordinates_check',
        $chk$((target_latitude IS NULL) = (target_longitude IS NULL)) AND (target_latitude IS NULL OR (target_latitude BETWEEN -90 AND 90 AND target_longitude BETWEEN -180 AND 180))$chk$),
      ('incident_assignments', 'incident_assignments_coordinates_check',
        $chk$((target_latitude IS NULL) = (target_longitude IS NULL)) AND (target_latitude IS NULL OR (target_latitude BETWEEN -90 AND 90 AND target_longitude BETWEEN -180 AND 180))$chk$),
      ('outage_updates', 'outage_updates_coordinates_check',
        $chk$((latitude IS NULL) = (longitude IS NULL)) AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))$chk$),
      ('outage_updates', 'outage_updates_subject_check',
        $chk$incident_id IS NOT NULL OR report_id IS NOT NULL OR assignment_id IS NOT NULL$chk$),
      ('user_sessions', 'user_sessions_token_hash_check',
        $chk$token_hash ~* '^[0-9a-f]{64}$'$chk$),
      ('password_reset_tokens', 'password_reset_tokens_token_hash_check',
        $chk$token_hash ~* '^[0-9a-f]{64}$'$chk$),
      ('settings', 'settings_value_json_check',
        $chk$value IS JSON$chk$)
    ) AS t(tbl, con, expr)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE c.conname = item.con
        AND r.relname = item.tbl
        AND n.nspname = 'public'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s) NOT VALID', item.tbl, item.con, item.expr);
      EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', item.tbl, item.con);
    END IF;
  END LOOP;
END
$do$;

-- ---------------------------------------------------------------------------
-- 3. Missing relationship: users -> resident_accounts
-- ---------------------------------------------------------------------------
-- The backfill already copies resident_accounts.id into users.legacy_resident_uuid
-- (scripts/neon-backfill.js mergeUsers), but no foreign key guarded that copy.
-- ON DELETE SET NULL keeps the login record when a legacy account is removed.

DO $do$
BEGIN
  IF to_regclass('public.resident_accounts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'users_legacy_resident_uuid_fkey'
         AND connamespace = 'public'::regnamespace
     )
  THEN
    ALTER TABLE users
      ADD CONSTRAINT users_legacy_resident_uuid_fkey
      FOREIGN KEY (legacy_resident_uuid) REFERENCES resident_accounts(id)
      ON DELETE SET NULL
      NOT VALID;
    ALTER TABLE users VALIDATE CONSTRAINT users_legacy_resident_uuid_fkey;
  END IF;
END
$do$;

-- ---------------------------------------------------------------------------
-- 4. Indexes for module queries
-- ---------------------------------------------------------------------------

-- Accounts: login accepts a username case-insensitively.
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_uidx
  ON users (lower(username)) WHERE username IS NOT NULL;

-- Barangays are matched by name in the backfill; case variants must not split
-- one barangay into two rows.
CREATE UNIQUE INDEX IF NOT EXISTS barangays_name_lower_uidx
  ON barangays (lower(barangay_name));

-- Resident portal (live/legacy tables): email login is case-insensitive and
-- session cleanup scans by user.
DO $do$
BEGIN
  IF to_regclass('public.resident_accounts') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS resident_accounts_email_lower_uidx
      ON resident_accounts (lower(email));
    CREATE INDEX IF NOT EXISTS resident_accounts_username_lower_idx
      ON resident_accounts (lower(username)) WHERE username IS NOT NULL;
  END IF;
  IF to_regclass('public.resident_sessions') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS resident_sessions_user_idx
      ON resident_sessions (user_id);
  END IF;
END
$do$;

-- Admin/reporting lists ordered by time.
CREATE INDEX IF NOT EXISTS reports_reported_at_idx ON reports (reported_at DESC);
CREATE INDEX IF NOT EXISTS incidents_start_time_idx ON incidents (start_time DESC);
CREATE INDEX IF NOT EXISTS scheduled_outages_date_idx ON scheduled_outages (outage_date, start_time);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_created_idx ON feedback (created_at DESC);

-- Unread badge and password-reset expiry sweeps.
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON notifications (user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS password_reset_tokens_expiry_idx
  ON password_reset_tokens (expires_at);

-- Dispatch board: current assignments per team.
CREATE INDEX IF NOT EXISTS repair_assignments_team_status_idx
  ON repair_assignments (team_id, status);

-- The normalized mirror is one-to-one with repair_assignments, and assignment
-- codes must not repeat across the two dispatch models.
CREATE UNIQUE INDEX IF NOT EXISTS incident_assignments_repair_assignment_uidx
  ON incident_assignments (repair_assignment_id) WHERE repair_assignment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS incident_assignments_assignment_code_uidx
  ON incident_assignments (assignment_code) WHERE assignment_code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Keep users.role and user_roles consistent
-- ---------------------------------------------------------------------------
-- users.role is the primary role used by the current route guards; user_roles is
-- the full matrix used by role_permissions. Adding the primary role to the
-- matrix on insert/change prevents a user from holding a role that grants no
-- permissions. Rows are only added, never removed, so additional roles survive.

CREATE OR REPLACE FUNCTION powerwatch_sync_primary_role()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  INSERT INTO user_roles (user_id, role_id)
  SELECT NEW.id, r.id FROM roles r WHERE r.role_name = NEW.role
  ON CONFLICT (user_id, role_id) DO NOTHING;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS users_sync_primary_role ON users;
CREATE TRIGGER users_sync_primary_role
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW EXECUTE FUNCTION powerwatch_sync_primary_role();

-- ---------------------------------------------------------------------------
-- 6. Diagnostic views (read-only, no runtime dependency)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_user_effective_permissions AS
WITH role_assignments AS (
  SELECT id AS user_id, role AS role_name FROM users
  UNION
  SELECT ur.user_id, r.role_name
  FROM user_roles ur JOIN roles r ON r.id = ur.role_id
)
SELECT
  a.user_id,
  u.email,
  u.role AS primary_role,
  COALESCE(
    array_agg(DISTINCT p.permission_name ORDER BY p.permission_name)
      FILTER (WHERE p.permission_name IS NOT NULL),
    ARRAY[]::text[]
  ) AS permissions
FROM role_assignments a
JOIN users u ON u.id = a.user_id
LEFT JOIN roles r ON r.role_name = a.role_name
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p ON p.id = rp.permission_id
GROUP BY a.user_id, u.email, u.role;

COMMENT ON VIEW v_user_effective_permissions IS
  'Effective permission names per user, combining users.role and user_roles. Empty when permissions are not wired.';

-- Returns one row per detected inconsistency; an empty result means healthy.
CREATE OR REPLACE VIEW v_data_quality_issues AS
SELECT 'barangay_name_drift'::text AS issue,
       'reports'::text AS table_name,
       r.id::text AS record_id,
       format('barangay_name=%s, barangays.barangay_name=%s', r.barangay_name, b.barangay_name) AS detail
FROM reports r JOIN barangays b ON b.id = r.barangay_id
WHERE r.barangay_name IS DISTINCT FROM b.barangay_name
UNION ALL
SELECT 'barangay_name_drift', 'incidents', i.id::text,
       format('barangay_name=%s, barangays.barangay_name=%s', i.barangay_name, b.barangay_name)
FROM incidents i JOIN barangays b ON b.id = i.barangay_id
WHERE i.barangay_name IS DISTINCT FROM b.barangay_name
UNION ALL
SELECT 'barangay_name_drift', 'scheduled_outages', s.id::text,
       format('barangay_name=%s, barangays.barangay_name=%s', s.barangay_name, b.barangay_name)
FROM scheduled_outages s JOIN barangays b ON b.id = s.barangay_id
WHERE s.barangay_name IS NOT NULL AND s.barangay_name IS DISTINCT FROM b.barangay_name
UNION ALL
SELECT 'barangay_name_drift', 'repair_assignments', a.id::text,
       format('target_barangay_name=%s, barangays.barangay_name=%s', a.target_barangay_name, b.barangay_name)
FROM repair_assignments a JOIN barangays b ON b.id = a.target_barangay_id
WHERE a.target_barangay_name IS DISTINCT FROM b.barangay_name
UNION ALL
SELECT 'incident_link_missing', 'reports', r.id::text,
       format('reports.incident_id=%s has no incident_reports row', r.incident_id)
FROM reports r
WHERE r.incident_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM incident_reports ir
    WHERE ir.report_id = r.id AND ir.incident_id = r.incident_id
  )
UNION ALL
SELECT 'incident_link_cache_stale', 'reports', r.id::text,
       format('incident_reports.incident_id=%s, reports.incident_id=%s', ir.incident_id, r.incident_id)
FROM incident_reports ir JOIN reports r ON r.id = ir.report_id
WHERE r.incident_id IS DISTINCT FROM ir.incident_id
UNION ALL
SELECT 'role_matrix_drift', 'users', u.id::text,
       format('users.role=%s is missing from user_roles', u.role)
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = u.id AND r.role_name = u.role
)
UNION ALL
SELECT 'coordinate_pair_incomplete', 'reports', r.id::text,
       format('latitude=%s, longitude=%s', r.latitude, r.longitude)
FROM reports r
WHERE (r.latitude IS NULL) <> (r.longitude IS NULL)
UNION ALL
SELECT 'coordinate_pair_incomplete', 'incidents', i.id::text,
       format('latitude=%s, longitude=%s', i.latitude, i.longitude)
FROM incidents i
WHERE (i.latitude IS NULL) <> (i.longitude IS NULL);

COMMENT ON VIEW v_data_quality_issues IS
  'Detected data inconsistencies (barangay name drift, incident link drift, role matrix drift, half-set coordinates). Empty means healthy.';

COMMENT ON COLUMN reports.incident_id IS
  'Convenience pointer to the incident. incident_reports is the authoritative link; keep both aligned.';
COMMENT ON COLUMN users.role IS
  'Primary role used by route guards. user_roles is the full role set and is kept in sync by users_sync_primary_role.';
COMMENT ON COLUMN incident_assignments.repair_assignment_id IS
  'One-to-one mirror of repair_assignments; enforce uniqueness for real dispatches.';
