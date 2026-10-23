const {
  describeDatabase,
  requireStagingEnvironment,
  createStagingClient,
  readMigrations,
  sha256,
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

const run = async () => {
  const connectionString = requireStagingEnvironment();
  const migrations = readMigrations();
  if (!migrations.length) throw new Error('No SQL migrations found.');
  const client = createStagingClient(connectionString);
  await client.connect();

  try {
    console.log(`Target development branch: ${describeDatabase(connectionString)}`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    for (const migration of migrations) {
      const existing = await client.query(
        'SELECT checksum FROM schema_migrations WHERE version = $1',
        [migration.name],
      );
      if (existing.rowCount > 0) {
        if (existing.rows[0].checksum !== migration.checksum) {
          throw new Error(`Migration ${migration.name} changed after it was applied. Create a new migration instead.`);
        }
        console.log(`SKIP ${migration.name} (already applied)`);
        continue;
      }
      console.log(`APPLY ${migration.name}`);
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [migration.name, sha256(migration.sql)],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    const expected = [...CORE_TABLES, ...SUPPORT_TABLES];
    const actual = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const actualNames = new Set(actual.rows.map((row) => row.table_name));
    const missing = expected.filter((name) => !actualNames.has(name));
    if (missing.length) {
      throw new Error(`Schema is missing expected tables: ${missing.join(', ')}`);
    }
    console.log(`PASS ${expected.length} domain/support tables present (${CORE_TABLES.length} core + ${SUPPORT_TABLES.length} supporting).`);
  } finally {
    await client.end();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error(`Neon development migration failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { run, CORE_TABLES, SUPPORT_TABLES };
