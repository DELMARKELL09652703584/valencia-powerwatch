const fs = require('node:fs');
const path = require('node:path');
const {
  ROOT,
  loadEnvironment,
  describeDatabase,
  requireStagingEnvironment,
  createStagingClient,
  openSqliteReadOnly,
  quoteIdentifier,
} = require('./neon-staging-common');

const CORE_TABLES = [
  'users', 'user_profiles', 'roles', 'user_roles', 'permissions', 'role_permissions',
  'barangays', 'user_sessions', 'reports', 'report_evidence', 'report_verifications',
  'report_status_history', 'report_comments', 'incidents', 'incident_reports',
  'incident_assignments', 'incident_affected_areas', 'outage_updates',
  'scheduled_outages', 'announcements', 'notifications', 'notification_preferences',
  'feedback', 'audit_logs',
];

const SUPPORT_TABLES = [
  'oauth_accounts', 'oauth_states', 'password_reset_tokens', 'settings', 'sms_logs',
  'repair_teams', 'repair_assignments', 'repair_assignment_evidence',
  'repair_assignment_location_confirmations', 'staff_team_members',
  'staff_barangay_assignments',
];

const failures = [];
const passes = [];

const checkZero = async (client, name, sql) => {
  const result = await client.query(sql);
  const count = Number(result.rows[0]?.count || 0);
  if (count === 0) passes.push(name);
  else failures.push(`${name}: ${count} invalid row(s)`);
};

const checkAtLeast = async (client, name, sql, minimum) => {
  const result = await client.query(sql);
  const count = Number(result.rows[0]?.count || 0);
  if (count >= minimum) passes.push(`${name} (${count})`);
  else failures.push(`${name}: expected at least ${minimum}, found ${count}`);
};

const checkTableCounts = async (client, sourceCounts) => {
  for (const [table, expected] of Object.entries(sourceCounts)) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(table)}`);
    const actual = Number(result.rows[0].count);
    if (actual >= expected) passes.push(`${table} count >= source (${actual}/${expected})`);
    else failures.push(`${table} count ${actual} is lower than source ${expected}`);
  }
};

const run = async () => {
  loadEnvironment();
  const targetUrl = requireStagingEnvironment();
  const client = createStagingClient(targetUrl);
  await client.connect();

  try {
    console.log(`Validating isolated development branch: ${describeDatabase(targetUrl)}`);

    const tableRows = (await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `)).rows.map((row) => row.table_name);
    const present = new Set(tableRows);
    for (const table of [...CORE_TABLES, ...SUPPORT_TABLES]) {
      if (!present.has(table)) failures.push(`missing table: ${table}`);
    }

    const sourcePath = path.resolve(process.env.POWERWATCH_SQLITE_PATH || path.join(ROOT, 'data', 'powerwatch.db'));
    const sourceCounts = {};
    if (fs.existsSync(sourcePath)) {
      const sqlite = openSqliteReadOnly(sourcePath);
      try {
        const sourceTables = new Set(sqlite.prepare(`
          SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        `).all().map((row) => row.name));
        const sourceMap = {
          users: 'users', barangays: 'barangays', reports: 'outage_reports',
          incidents: 'outage_incidents', report_status_history: 'report_status_history',
          audit_logs: 'audit_logs', scheduled_outages: 'scheduled_outages',
          announcements: 'announcements', notifications: 'notifications',
          feedback: 'citizen_feedback', repair_assignments: 'repair_assignments',
          repair_teams: 'repair_teams', sms_logs: 'sms_logs',
        };
        for (const [targetTable, sourceTable] of Object.entries(sourceMap)) {
          if (!sourceTables.has(sourceTable)) continue;
          sourceCounts[targetTable] = Number(sqlite.prepare(`SELECT COUNT(*) AS count FROM ${sourceTable}`).get().count);
        }
      } finally {
        sqlite.close();
      }
      await checkTableCounts(client, sourceCounts);
    } else {
      console.warn(`Source SQLite file not found; source-count comparisons skipped: ${sourcePath}`);
    }

    await checkAtLeast(client, 'roles seeded', 'SELECT COUNT(*)::int AS count FROM roles', 4);
    await checkAtLeast(client, 'permissions seeded', 'SELECT COUNT(*)::int AS count FROM permissions', 10);
    await checkAtLeast(client, 'required roles present', "SELECT COUNT(*)::int AS count FROM roles WHERE role_name IN ('resident','personnel','utility','administrator')", 4);

    await checkZero(client, 'users without profiles', `
      SELECT COUNT(*)::int AS count FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id WHERE p.user_id IS NULL
    `);
    await checkZero(client, 'users without roles', `
      SELECT COUNT(*)::int AS count FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id WHERE ur.user_id IS NULL
    `);
    await checkZero(client, 'users with unknown role', `
      SELECT COUNT(*)::int AS count FROM users u
      LEFT JOIN roles r ON r.role_name = u.role WHERE r.id IS NULL
    `);

    await checkZero(client, 'reports without reporter', `
      SELECT COUNT(*)::int AS count FROM reports r
      LEFT JOIN users u ON u.id = r.reporter_id WHERE u.id IS NULL
    `);
    await checkZero(client, 'reports with unmapped barangay name', `
      SELECT COUNT(*)::int AS count FROM reports
      WHERE barangay_name IS NOT NULL AND btrim(barangay_name) <> '' AND barangay_id IS NULL
    `);
    await checkZero(client, 'reports with missing incident', `
      SELECT COUNT(*)::int AS count FROM reports r
      LEFT JOIN incidents i ON i.id = r.incident_id
      WHERE r.incident_id IS NOT NULL AND i.id IS NULL
    `);
    await checkZero(client, 'report history with missing report', `
      SELECT COUNT(*)::int AS count FROM report_status_history h
      LEFT JOIN reports r ON r.id = h.report_id WHERE r.id IS NULL
    `);
    await checkZero(client, 'report verifications with missing report', `
      SELECT COUNT(*)::int AS count FROM report_verifications v
      LEFT JOIN reports r ON r.id = v.report_id WHERE r.id IS NULL
    `);
    await checkZero(client, 'report evidence with missing report', `
      SELECT COUNT(*)::int AS count FROM report_evidence e
      LEFT JOIN reports r ON r.id = e.report_id WHERE r.id IS NULL
    `);
    await checkZero(client, 'report evidence with empty file URL', `
      SELECT COUNT(*)::int AS count FROM report_evidence
      WHERE file_url IS NULL OR btrim(file_url) = ''
    `);

    await checkZero(client, 'incidents with unmapped barangay name', `
      SELECT COUNT(*)::int AS count FROM incidents
      WHERE barangay_name IS NOT NULL AND btrim(barangay_name) <> '' AND barangay_id IS NULL
    `);
    await checkZero(client, 'incident/report links with missing incident', `
      SELECT COUNT(*)::int AS count FROM incident_reports ir
      LEFT JOIN incidents i ON i.id = ir.incident_id WHERE i.id IS NULL
    `);
    await checkZero(client, 'incident/report links with missing report', `
      SELECT COUNT(*)::int AS count FROM incident_reports ir
      LEFT JOIN reports r ON r.id = ir.report_id WHERE r.id IS NULL
    `);
    await checkZero(client, 'affected areas with missing incident', `
      SELECT COUNT(*)::int AS count FROM incident_affected_areas a
      LEFT JOIN incidents i ON i.id = a.incident_id WHERE i.id IS NULL
    `);
    await checkZero(client, 'affected areas with unmapped barangay name', `
      SELECT COUNT(*)::int AS count FROM incident_affected_areas
      WHERE barangay_name IS NOT NULL AND btrim(barangay_name) <> '' AND barangay_id IS NULL
    `);

    await checkZero(client, 'repair assignments with missing team', `
      SELECT COUNT(*)::int AS count FROM repair_assignments a
      LEFT JOIN repair_teams t ON t.id = a.team_id WHERE t.id IS NULL
    `);
    await checkZero(client, 'repair assignments with missing assigning user', `
      SELECT COUNT(*)::int AS count FROM repair_assignments a
      LEFT JOIN users u ON u.id = a.assigned_by WHERE u.id IS NULL
    `);
    await checkZero(client, 'incident assignments with no incident or report', `
      SELECT COUNT(*)::int AS count FROM incident_assignments
      WHERE incident_id IS NULL AND report_id IS NULL
    `);
    await checkZero(client, 'outage updates with missing incident', `
      SELECT COUNT(*)::int AS count FROM outage_updates u
      LEFT JOIN incidents i ON i.id = u.incident_id
      WHERE u.incident_id IS NOT NULL AND i.id IS NULL
    `);
    await checkZero(client, 'outage updates with missing report', `
      SELECT COUNT(*)::int AS count FROM outage_updates u
      LEFT JOIN reports r ON r.id = u.report_id
      WHERE u.report_id IS NOT NULL AND r.id IS NULL
    `);

    await checkZero(client, 'sessions with non-SHA-256 tokens', `
      SELECT COUNT(*)::int AS count FROM user_sessions
      WHERE token_hash !~ '^[0-9a-fA-F]{64}$'
    `);
    await checkZero(client, 'notifications with missing user', `
      SELECT COUNT(*)::int AS count FROM notifications n
      LEFT JOIN users u ON u.id = n.user_id WHERE u.id IS NULL
    `);
    await checkZero(client, 'feedback with missing user', `
      SELECT COUNT(*)::int AS count FROM feedback f
      LEFT JOIN users u ON u.id = f.user_id WHERE u.id IS NULL
    `);
    await checkZero(client, 'feedback with missing report', `
      SELECT COUNT(*)::int AS count FROM feedback f
      LEFT JOIN reports r ON r.id = f.report_id
      WHERE f.report_id IS NOT NULL AND r.id IS NULL
    `);
    await checkZero(client, 'feedback with missing incident', `
      SELECT COUNT(*)::int AS count FROM feedback f
      LEFT JOIN incidents i ON i.id = f.incident_id
      WHERE f.incident_id IS NOT NULL AND i.id IS NULL
    `);

    const counts = (await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM barangays) AS barangays,
        (SELECT COUNT(*)::int FROM reports) AS reports,
        (SELECT COUNT(*)::int FROM incidents) AS incidents,
        (SELECT COUNT(*)::int FROM user_sessions) AS sessions,
        (SELECT COUNT(*)::int FROM audit_logs) AS audit_logs
    `)).rows[0];

    for (const name of passes) console.log(`PASS ${name}`);
    for (const name of failures) console.error(`FAIL ${name}`);
    console.log(`Summary: ${counts.users} users, ${counts.barangays} barangays, ${counts.reports} reports, ${counts.incidents} incidents, ${counts.sessions} sessions, ${counts.audit_logs} audit rows.`);
    if (failures.length) {
      console.error(`VALIDATION FAILED: ${failures.length} issue(s).`);
      process.exitCode = 1;
    } else {
      console.log('VALIDATION PASSED.');
    }
  } finally {
    await client.end();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error(`Neon development validation failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { run };
