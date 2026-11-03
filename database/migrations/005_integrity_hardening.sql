-- Migration 005: integrity hardening for the normalized schema.
-- Additive only: it never drops a table, column, or row.
-- Safe to run repeatedly on any branch.
--
-- Two defects from the initial design are corrected here:
--   1. repair_teams.active_assignment_id was declared without a foreign key,
--      so it could point at a dispatch record that no longer exists.
--   2. Status/type columns were free text, so "Restored", "restored", and
--      "Restord" could all coexist and break status analytics. The allowed
--      values below are the exact vocabularies the running application emits
--      (server/routes/reports.js, incidents.js, repair.js, scheduled.js).

DO $do$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('users', 'users_role_check',
        $chk$role IN ('resident', 'personnel', 'utility', 'administrator')$chk$),
      ('users', 'users_account_status_check',
        $chk$account_status IN ('Active', 'Inactive', 'Suspended')$chk$),
      ('barangays', 'barangays_status_check',
        $chk$status IN ('Active', 'Inactive', 'Archived')$chk$),
      ('repair_teams', 'repair_teams_status_check',
        $chk$status IN ('Available', 'Dispatched', 'On Assignment', 'En Route', 'Unavailable', 'Maintenance')$chk$),
      ('reports', 'reports_status_check',
        $chk$status IN ('Submitted', 'Under Review', 'Verified', 'Officially Confirmed', 'Assigned', 'Acknowledged', 'In Progress', 'Resolved', 'Closed', 'Unverified', 'Duplicate', 'Rejected')$chk$),
      ('reports', 'reports_verification_status_check',
        $chk$verification_status IN ('Pending', 'Pending Verification', 'Under Review', 'Verified', 'Officially Confirmed', 'Unverified', 'Duplicate', 'Rejected')$chk$),
      ('reports', 'reports_repair_status_check',
        $chk$repair_status IN ('Pending Assignment', 'Dispatched', 'En Route', 'Arrived On Site', 'In Progress', 'Completed', 'Resolved', 'Cancelled')$chk$),
      ('reports', 'reports_priority_check',
        $chk$priority IN ('Low', 'Medium', 'High', 'Critical')$chk$),
      ('incidents', 'incidents_status_check',
        $chk$status IN ('Reported', 'Under Verification', 'Verified', 'Ongoing', 'Restoration in Progress', 'Restored', 'Resolved', 'Closed')$chk$),
      ('incidents', 'incidents_type_check',
        $chk$incident_type IN ('Unexpected', 'Scheduled')$chk$),
      ('incidents', 'incidents_priority_check',
        $chk$priority IN ('Low', 'Medium', 'High', 'Critical')$chk$),
      ('incidents', 'incidents_repair_status_check',
        $chk$repair_status IN ('Pending Assignment', 'Dispatched', 'En Route', 'Arrived On Site', 'In Progress', 'Completed', 'Resolved', 'Cancelled')$chk$),
      ('incidents', 'incidents_restoration_progress_check',
        $chk$restoration_progress BETWEEN 0 AND 100$chk$),
      ('incidents', 'incidents_customers_affected_check',
        $chk$customers_affected >= 0$chk$),
      ('scheduled_outages', 'scheduled_outages_status_check',
        $chk$status IN ('Scheduled', 'In Preparation', 'Being Implemented', 'Completed', 'Cancelled')$chk$),
      ('repair_assignments', 'repair_assignments_status_check',
        $chk$status IN ('Dispatched', 'En Route', 'Arrived On Site', 'In Progress', 'Completed', 'Resolved', 'Cancelled')$chk$),
      ('incident_assignments', 'incident_assignments_status_check',
        $chk$status IN ('Dispatched', 'En Route', 'Arrived On Site', 'In Progress', 'Completed', 'Resolved', 'Cancelled')$chk$),
      ('announcements', 'announcements_status_check',
        $chk$status IN ('Published', 'Draft', 'Archived')$chk$),
      ('feedback', 'feedback_rating_check',
        $chk$rating BETWEEN 1 AND 5$chk$)
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

-- Repair teams keep a pointer to their current dispatch. Add the missing
-- foreign key so the pointer cannot dangle.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'repair_teams_active_assignment_fk'
  ) THEN
    ALTER TABLE repair_teams
      ADD CONSTRAINT repair_teams_active_assignment_fk
      FOREIGN KEY (active_assignment_id) REFERENCES repair_assignments(id)
      ON DELETE SET NULL
      NOT VALID;
    ALTER TABLE repair_teams VALIDATE CONSTRAINT repair_teams_active_assignment_fk;
  END IF;
END
$do$;
