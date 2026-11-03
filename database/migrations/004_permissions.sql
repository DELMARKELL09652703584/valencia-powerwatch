-- Migration 004: seed permissions and the initial role-permission matrix.
-- The application still uses its existing role guards. This matrix is the
-- starting point for the later permissions migration and must be reviewed
-- against every route before it becomes authoritative.

INSERT INTO permissions (permission_name, description)
VALUES
  ('profile.update', 'Update own profile'),
  ('reports.create', 'Submit a power interruption report'),
  ('reports.read.own', 'Read own reports'),
  ('reports.read.assigned', 'Read reports assigned to staff'),
  ('reports.read.all', 'Read all reports'),
  ('reports.verify', 'Verify, reject, or request clarification for reports'),
  ('reports.comment', 'Comment on reports'),
  ('incidents.read', 'Read incidents'),
  ('incidents.update', 'Update incident status and restoration information'),
  ('incidents.manage', 'Create and manage incidents'),
  ('incidents.assign', 'Assign staff or teams to incidents'),
  ('scheduled.manage', 'Create and manage scheduled outages'),
  ('announcements.read', 'Read announcements'),
  ('announcements.manage', 'Create and publish announcements'),
  ('notifications.read.own', 'Read own notifications'),
  ('feedback.create', 'Submit feedback'),
  ('users.manage', 'Manage user accounts'),
  ('roles.manage', 'Manage roles and permissions'),
  ('barangays.manage', 'Manage barangays'),
  ('settings.manage', 'Manage system settings'),
  ('audit.read', 'Read audit logs'),
  ('staff.assign', 'Assign staff to teams and barangays'),
  ('teams.manage', 'Manage repair teams'),
  ('system.clean_reset', 'Run the guarded clean-reset maintenance action')
ON CONFLICT (permission_name) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
  ('resident', 'profile.update'),
  ('resident', 'reports.create'),
  ('resident', 'reports.read.own'),
  ('resident', 'announcements.read'),
  ('resident', 'notifications.read.own'),
  ('resident', 'feedback.create'),
  ('personnel', 'profile.update'),
  ('personnel', 'reports.read.assigned'),
  ('personnel', 'reports.verify'),
  ('personnel', 'reports.comment'),
  ('personnel', 'incidents.read'),
  ('personnel', 'incidents.update'),
  ('personnel', 'announcements.read'),
  ('personnel', 'notifications.read.own'),
  ('utility', 'profile.update'),
  ('utility', 'reports.read.all'),
  ('utility', 'reports.verify'),
  ('utility', 'reports.comment'),
  ('utility', 'incidents.read'),
  ('utility', 'incidents.update'),
  ('utility', 'incidents.manage'),
  ('utility', 'incidents.assign'),
  ('utility', 'scheduled.manage'),
  ('utility', 'announcements.read'),
  ('utility', 'announcements.manage'),
  ('utility', 'notifications.read.own'),
  ('utility', 'feedback.create'),
  ('utility', 'staff.assign'),
  ('utility', 'teams.manage')
) AS matrix(role_name, permission_name)
JOIN roles r ON r.role_name = matrix.role_name
JOIN permissions p ON p.permission_name = matrix.permission_name
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'administrator'
ON CONFLICT (role_id, permission_id) DO NOTHING;
