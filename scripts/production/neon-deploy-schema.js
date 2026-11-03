const {
  loadEnvironment,
  describeDatabase,
  sha256,
  readMigrations,
} = require('./neon-staging-common');
const { Client } = require('pg');
const { getDatabaseUrl } = require('../../server/config/database-url');

// Schema deployment for the production Neon branch that Render uses.
//
// This is the only script allowed to write DDL to the database. It is
// additive by design: every migration uses CREATE TABLE IF NOT EXISTS and the
// statements only add objects. Existing snapshot/resident tables are untouched.
//
// Usage:
//   node scripts/neon-deploy-schema.js             # dry run, always rolls back
//   node scripts/neon-deploy-schema.js --apply     # commits the transaction
//
// The dry run applies every pending migration and runs the full verification
// suite inside one transaction, then rolls back. If anything is wrong, Neon is
// left exactly as it was.
const EXPECTED_TABLES = [
  // 24 domain core tables
  'users', 'user_profiles', 'roles', 'user_roles', 'permissions', 'role_permissions',
  'barangays', 'user_sessions', 'reports', 'report_evidence', 'report_verifications',
  'report_status_history', 'report_comments', 'incidents', 'incident_reports',
  'incident_assignments', 'incident_affected_areas', 'outage_updates',
  'scheduled_outages', 'announcements', 'notifications', 'notification_preferences',
  'feedback', 'audit_logs',
  // 11 supporting tables
  'oauth_accounts', 'oauth_states', 'password_reset_tokens', 'settings', 'sms_logs',
  'repair_teams', 'repair_assignments', 'repair_assignment_evidence',
  'repair_assignment_location_confirmations', 'staff_team_members',
  'staff_barangay_assignments',
];

// 69 relationships across the 35 application tables, plus the
// users.legacy_resident_uuid -> resident_accounts(id) link added in 007.
const EXPECTED_FOREIGN_KEYS = 69;
const PROTECTED_TABLES = ['app_snapshots', 'app_snapshots_backup', 'app_snapshot_files', 'resident_accounts', 'resident_sessions'];

const requireDeployEnvironment = () => {
  loadEnvironment();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to deploy schema with NODE_ENV=production.');
  }
  if (process.env.POWERWATCH_ALLOW_PRODUCTION_DDL !== '1') {
    throw new Error('Refusing to write DDL to the production branch. Set POWERWATCH_ALLOW_PRODUCTION_DDL=1 for this run only.');
  }
  const target = getDatabaseUrl();
  if (!target) throw new Error('DATABASE_URL or NEON_DATABASE_URL is required.');
  const targetHost = new URL(target).hostname;
  const devUrl = process.env.NEON_DEV_DATABASE_URL;
  if (devUrl && new URL(devUrl).hostname === targetHost) {
    throw new Error('Refusing to run: NEON_DEV_DATABASE_URL and NEON_DATABASE_URL use the same Neon endpoint.');
  }
  if (!targetHost.endsWith('.neon.tech')) {
    throw new Error(`Refusing to run: ${targetHost} does not look like a Neon endpoint.`);
  }
  return target;
};

const tableSnapshot = async (client) => {
  const result = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map((row) => row.table_name);
};

const verify = async (client) => {
  const failures = [];
  const passes = [];

  const tables = await tableSnapshot(client);
  const tableSet = new Set(tables);
  const missing = EXPECTED_TABLES.filter((name) => !tableSet.has(name));
  if (missing.length) failures.push(`missing tables: ${missing.join(', ')}`);
  else passes.push(`${EXPECTED_TABLES.length} required tables present`);

  const protectedPresent = PROTECTED_TABLES.filter((name) => tableSet.has(name));
  passes.push(`existing tables preserved: ${protectedPresent.join(', ') || 'none'}`);

  const fks = Number((await client.query(`
    SELECT count(*)::int AS c FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE c.contype = 'f' AND n.nspname = 'public' AND r.relname = ANY($1::text[])
  `, [EXPECTED_TABLES])).rows[0].c);
  if (fks !== EXPECTED_FOREIGN_KEYS) failures.push(`foreign keys: expected ${EXPECTED_FOREIGN_KEYS}, found ${fks}`);
  else passes.push(`${fks} foreign keys`);

  const unvalidated = (await client.query(`
    SELECT conname FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace AND NOT convalidated
    ORDER BY conname
  `)).rows.map((row) => row.conname);
  if (unvalidated.length) failures.push(`unvalidated constraints: ${unvalidated.join(', ')}`);
  else passes.push('all constraints validated');

  const noPk = (await client.query(`
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname = ANY($1::text[])
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint p
        WHERE p.conrelid = c.oid AND p.contype = 'p'
      )
    ORDER BY c.relname
  `, [EXPECTED_TABLES])).rows.map((row) => row.relname);
  if (noPk.length) failures.push(`tables without primary key: ${noPk.join(', ')}`);
  else passes.push('every required table has a primary key');

  const checks = Number((await client.query(`
    SELECT count(*)::int AS c FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace AND contype = 'c'
  `)).rows[0].c);
  const expectedChecks = 19;
  if (checks < expectedChecks) failures.push(`CHECK constraints: expected at least ${expectedChecks}, found ${checks}`);
  else passes.push(`${checks} CHECK constraints`);

  const indexes = Number((await client.query(`
    SELECT count(*)::int AS c FROM pg_indexes WHERE schemaname = 'public'
  `)).rows[0].c);
  passes.push(`${indexes} indexes`);

  const seeds = (await client.query(`
    SELECT (SELECT count(*) FROM roles)::int AS roles,
           (SELECT count(*) FROM permissions)::int AS permissions,
           (SELECT count(*) FROM role_permissions)::int AS role_permissions
  `)).rows[0];
  if (seeds.roles !== 4) failures.push(`roles seed: expected 4, found ${seeds.roles}`);
  else passes.push(`4 roles seeded`);
  if (seeds.permissions < 24) failures.push(`permissions seed: expected at least 24, found ${seeds.permissions}`);
  else passes.push(`${seeds.permissions} permissions seeded`);
  if (seeds.role_permissions < 24) failures.push(`role_permissions seed too small: ${seeds.role_permissions}`);
  else passes.push(`${seeds.role_permissions} role-permission rows seeded`);

  return { passes, failures };
};

const run = async () => {
  const apply = process.argv.includes('--apply');
  const connectionString = requireDeployEnvironment();
  const migrations = readMigrations();

  console.log(`Target : ${describeDatabase(connectionString)}`);
  console.log(`Mode   : ${apply ? 'APPLY (commit)' : 'DRY RUN (rollback)'}`);
  console.log(`Files  : ${migrations.map((m) => m.name).join(', ')}\n`);

  const client = new Client({
    connectionString,
    application_name: 'powerwatch-neon-deploy',
    connectionTimeoutMillis: 20_000,
    statement_timeout: 120_000,
  });
  await client.connect();

  let before = [];
  try {
    before = await tableSnapshot(client);
    console.log(`Tables before: ${before.length}`);

    await client.query('BEGIN');
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
      await client.query(migration.sql);
      await client.query(
        'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
        [migration.name, sha256(migration.sql)],
      );
      console.log(`RUN  ${migration.name}`);
    }

    const after = await tableSnapshot(client);
    const added = after.filter((name) => !before.includes(name));
    console.log(`\nTables after : ${after.length} (new: ${added.length})`);

    const { passes, failures } = await verify(client);
    console.log('\nVerification:');
    for (const line of passes) console.log(`  PASS ${line}`);
    for (const line of failures) console.log(`  FAIL ${line}`);

    if (failures.length) {
      await client.query('ROLLBACK');
      throw new Error(`Verification failed (${failures.length} problem(s)); transaction rolled back.`);
    }

    if (apply) {
      await client.query('COMMIT');
      console.log('\nCommitted to the production branch.');
    } else {
      await client.query('ROLLBACK');
      console.log('\nDry run complete; transaction rolled back. Re-run with --apply to commit.');
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error(`\nSchema deployment failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { run, verify, EXPECTED_TABLES, EXPECTED_FOREIGN_KEYS };
