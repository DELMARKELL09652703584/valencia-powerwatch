const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const {
  combineDateTime,
  validSessionHash,
} = require('../scripts/neon-staging-common');

const ROOT = path.resolve(__dirname, '..');
const MIGRATIONS = path.join(ROOT, 'db', 'migrations');

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

const migrationSql = () => fs.readdirSync(MIGRATIONS)
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => fs.readFileSync(path.join(MIGRATIONS, name), 'utf8'))
  .join('\n');

test('migrations define the 24 core and 11 supporting tables', () => {
  const sql = migrationSql();
  for (const table of [...CORE_TABLES, ...SUPPORT_TABLES]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}\\s*\\(`, 'i'), `missing ${table}`);
  }
  assert.equal(CORE_TABLES.length, 24);
  assert.equal(SUPPORT_TABLES.length, 11);
});

test('migrations seed four operational roles and the permission matrix', () => {
  const sql = migrationSql();
  for (const role of ['resident', 'personnel', 'utility', 'administrator']) {
    assert.match(sql, new RegExp(`\\('${role}',`, 'i'));
  }
  assert.match(sql, /CREATE TABLE IF NOT EXISTS role_permissions/i);
  assert.match(sql, /INSERT INTO role_permissions/i);
});

test('staging scripts require an isolated Neon development URL and refuse production', () => {
  const common = fs.readFileSync(path.join(ROOT, 'scripts', 'neon-staging-common.js'), 'utf8');
  assert.match(common, /NEON_DEV_DATABASE_URL/);
  assert.match(common, /POWERWATCH_ALLOW_NEON_DEV/);
  assert.match(common, /NODE_ENV === 'production'/);
  assert.match(common, /identical to/);
  assert.doesNotMatch(common, /NEON_DATABASE_URL\s*\|\|\s*NEON_DEV_DATABASE_URL/);
});

test('validation covers foreign keys, roles, barangays, and hashed sessions', () => {
  const validation = fs.readFileSync(path.join(ROOT, 'scripts', 'neon-validate.js'), 'utf8');
  assert.match(validation, /reports without reporter/);
  assert.match(validation, /users without roles/);
  assert.match(validation, /required roles present/);
  assert.match(validation, /unmapped barangay name/);
  assert.match(validation, /non-SHA-256 tokens/);
  assert.match(validation, /VALIDATION PASSED/);
});

test('production schema deployment is opt-in, additive, and defaults to a dry run', () => {
  const deploy = fs.readFileSync(path.join(ROOT, 'scripts', 'neon-deploy-schema.js'), 'utf8');
  assert.match(deploy, /POWERWATCH_ALLOW_PRODUCTION_DDL/);
  assert.match(deploy, /process\.argv\.includes\('--apply'\)/);
  assert.match(deploy, /ROLLBACK/);
  assert.match(deploy, /\.neon\.tech/);
  assert.match(deploy, /EXPECTED_FOREIGN_KEYS/);
  const { EXPECTED_TABLES, EXPECTED_FOREIGN_KEYS } = require('../scripts/neon-deploy-schema');
  assert.equal(EXPECTED_TABLES.length, 35);
  assert.equal(EXPECTED_FOREIGN_KEYS, 68);
});

test('integrity hardening migration adds the missing foreign key and value checks', () => {
  const sql = fs.readFileSync(path.join(MIGRATIONS, '005_integrity_hardening.sql'), 'utf8');
  assert.match(sql, /repair_teams_active_assignment_fk/);
  assert.match(sql, /VALIDATE CONSTRAINT/);
  assert.match(sql, /CHECK \(%s\) NOT VALID/);
  assert.match(sql, /feedback_rating_check/);
  assert.match(sql, /reports_status_check/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE/i);
});

test('relationship indexes cover every foreign key column', () => {
  const sql = fs.readFileSync(path.join(MIGRATIONS, '006_relationship_indexes.sql'), 'utf8');
  assert.match(sql, /CREATE INDEX IF NOT EXISTS announcements_created_by_idx/);
  assert.match(sql, /ON role_permissions \(permission_id\)/);
  assert.match(sql, /repair_teams \(active_assignment_id\)/);
  assert.match(sql, /feedback_user_id_fkey/);
  assert.match(sql, /ON DELETE SET NULL/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE/i);
  const createIndexes = sql.match(/CREATE INDEX IF NOT EXISTS/g) || [];
  assert.equal(createIndexes.length, 28);
});

test('reference seed is opt-in, idempotent, and limited to barangays and settings', () => {
  const seed = fs.readFileSync(path.join(ROOT, 'scripts', 'neon-seed-reference.js'), 'utf8');
  assert.match(seed, /POWERWATCH_ALLOW_PRODUCTION_SEED/);
  assert.match(seed, /process\.argv\.includes\('--apply'\)/);
  assert.match(seed, /ROLLBACK/);
  assert.match(seed, /ON CONFLICT \(barangay_name\) DO UPDATE/);
  assert.match(seed, /ON CONFLICT \(key\) DO UPDATE/);
  assert.match(seed, /demo_cleanup_version/);
  const { EXCLUDED_SETTINGS } = require('../scripts/neon-seed-reference');
  assert.ok(EXCLUDED_SETTINGS.has('seed_version'));
  for (const table of ['users', 'reports', 'incidents', 'feedback', 'app_snapshots']) {
    assert.doesNotMatch(seed, new RegExp(`INSERT INTO ${table}\\b`), `seed must not write ${table}`);
  }
});

test('staging helpers preserve ISO timestamps and reject raw session tokens', () => {
  assert.equal(combineDateTime('2026-10-23', '14:30'), '2026-10-23T06:30:00.000Z');
  assert.equal(combineDateTime(null, '14:30'), null);
  assert.equal(validSessionHash('a'.repeat(64)), true);
  assert.equal(validSessionHash('not-a-hash'), false);
});
