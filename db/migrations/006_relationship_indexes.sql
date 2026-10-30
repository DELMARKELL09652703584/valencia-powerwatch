-- Migration 006: relationship indexing and feedback history preservation.
-- Additive only. No table, column, or row is dropped.
--
-- 1. Every foreign key column needs an index so parent updates/deletes and
--    reverse lookups do not fall back to a sequential scan. These are the 28
--    FK columns that were still unindexed after migration 002/003.
-- 2. feedback.user_id used ON DELETE CASCADE, so deleting an account erased the
--    resident's ratings and comments. Feedback keeps a denormalized user_name,
--    so it can survive account removal; the FK becomes nullable + SET NULL.

CREATE INDEX IF NOT EXISTS announcements_created_by_idx ON announcements (created_by);
CREATE INDEX IF NOT EXISTS feedback_user_idx ON feedback (user_id);
CREATE INDEX IF NOT EXISTS feedback_barangay_idx ON feedback (barangay_id);
CREATE INDEX IF NOT EXISTS incident_assignments_assigned_by_idx ON incident_assignments (assigned_by);
CREATE INDEX IF NOT EXISTS incident_assignments_repair_assignment_idx ON incident_assignments (repair_assignment_id);
CREATE INDEX IF NOT EXISTS incident_assignments_report_idx ON incident_assignments (report_id);
CREATE INDEX IF NOT EXISTS incident_assignments_target_barangay_idx ON incident_assignments (target_barangay_id);
CREATE INDEX IF NOT EXISTS incident_reports_linked_by_idx ON incident_reports (linked_by);
CREATE INDEX IF NOT EXISTS incidents_assigned_team_idx ON incidents (assigned_team_id);
CREATE INDEX IF NOT EXISTS incidents_created_by_idx ON incidents (created_by);
CREATE INDEX IF NOT EXISTS incidents_scheduled_idx ON incidents (scheduled_id);
CREATE INDEX IF NOT EXISTS outage_updates_updated_by_idx ON outage_updates (updated_by);
CREATE INDEX IF NOT EXISTS repair_assignment_evidence_staff_idx ON repair_assignment_evidence (staff_id);
CREATE INDEX IF NOT EXISTS repair_assignment_location_confirmations_staff_idx
  ON repair_assignment_location_confirmations (staff_id);
CREATE INDEX IF NOT EXISTS repair_assignments_assigned_by_idx ON repair_assignments (assigned_by);
CREATE INDEX IF NOT EXISTS repair_assignments_incident_idx ON repair_assignments (incident_id);
CREATE INDEX IF NOT EXISTS repair_assignments_report_idx ON repair_assignments (report_id);
CREATE INDEX IF NOT EXISTS repair_teams_active_assignment_idx ON repair_teams (active_assignment_id);
CREATE INDEX IF NOT EXISTS report_comments_user_idx ON report_comments (user_id);
CREATE INDEX IF NOT EXISTS report_evidence_uploaded_by_idx ON report_evidence (uploaded_by);
CREATE INDEX IF NOT EXISTS report_status_history_changed_by_idx ON report_status_history (changed_by);
CREATE INDEX IF NOT EXISTS report_verifications_reviewer_idx ON report_verifications (reviewer_id);
CREATE INDEX IF NOT EXISTS reports_assigned_team_idx ON reports (assigned_team_id);
CREATE INDEX IF NOT EXISTS role_permissions_permission_idx ON role_permissions (permission_id);
CREATE INDEX IF NOT EXISTS scheduled_outages_created_by_idx ON scheduled_outages (created_by);
CREATE INDEX IF NOT EXISTS staff_barangay_assignments_assigned_by_idx ON staff_barangay_assignments (assigned_by);
CREATE INDEX IF NOT EXISTS staff_team_members_assigned_by_idx ON staff_team_members (assigned_by);
CREATE INDEX IF NOT EXISTS user_roles_assigned_by_idx ON user_roles (assigned_by);

-- Feedback is a historical record: keep it when the author account is removed.
ALTER TABLE feedback ALTER COLUMN user_id DROP NOT NULL;

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'feedback_user_id_fkey' AND confdeltype = 'c'
  ) THEN
    ALTER TABLE feedback DROP CONSTRAINT feedback_user_id_fkey;
    ALTER TABLE feedback
      ADD CONSTRAINT feedback_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END
$do$;
