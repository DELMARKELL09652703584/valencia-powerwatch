#!/usr/bin/env node
/**
 * Remove confirmed legacy demo records without touching real accounts or data.
 *
 * Targets only:
 *   - the unused bootstrap administrator (admin@powerwatch.ph)
 *   - notifications, sessions, OAuth rows and audit logs tied to the legacy
 *     "Juan Test Resident" test account or otherwise orphaned users
 *   - the four legacy generic repair teams (TEAM-01 .. TEAM-04) when they
 *     still match their original seed values and have no dependencies
 *
 * The real administrator (dsaroay@gmail.com), real residents, reports,
 * incidents, settings and all 31 barangays are preserved.
 *
 * Usage:
 *   node scripts/cleanup-legacy-demo-data.js            # dry run
 *   node scripts/cleanup-legacy-demo-data.js --apply    # write changes
 *   node scripts/cleanup-legacy-demo-data.js --apply --db <path>
 */

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { DB_PATH } = require('../../server/config/paths');

const REAL_ADMIN_EMAIL = 'dsaroay@gmail.com';
const DEMO_ADMIN_EMAIL = 'admin@powerwatch.ph';
const TEST_RESIDENT_NAME = 'Juan Test Resident';
const CLEANUP_VERSION = '2026-10-demo-clean-v1';

const DEMO_TEAMS = [
  { code: 'TEAM-01', name: 'Alpha Quick Response Unit' },
  { code: 'TEAM-02', name: 'Bravo Overhead Line Squad' },
  { code: 'TEAM-03', name: 'Charlie Transformer & Substation Team' },
  { code: 'TEAM-04', name: 'Delta Emergency Rescue Unit' },
];

function count(db, sql, params = []) {
  return Number(db.prepare(sql).get(...params)?.c || 0);
}

function findDemoTeamIds(db) {
  const ids = [];
  for (const team of DEMO_TEAMS) {
    const row = db.prepare(
      'SELECT id FROM repair_teams WHERE team_code = ? AND name = ?'
    ).get(team.code, team.name);
    if (!row) return [];
    ids.push(Number(row.id));
  }
  return ids;
}

function demoTeamDependencies(db, teamIds) {
  if (!teamIds.length) return 0;
  const placeholders = teamIds.map(() => '?').join(', ');
  return count(db, `
    SELECT (
      (SELECT COUNT(*) FROM repair_assignments WHERE team_id IN (${placeholders}))
      + (SELECT COUNT(*) FROM staff_team_members WHERE team_id IN (${placeholders}))
      + (SELECT COUNT(*) FROM repair_teams WHERE id IN (${placeholders}) AND active_assignment_id IS NOT NULL)
    ) AS c
  `, [...teamIds, ...teamIds, ...teamIds]);
}

function cleanDatabase(db, { apply = false, logger = console.log } = {}) {
  const alreadyDone = db.prepare(
    'SELECT value FROM settings WHERE key = ?'
  ).get('demo_cleanup_version');
  if (alreadyDone && alreadyDone.value === CLEANUP_VERSION) {
    logger(`Already cleaned (${CLEANUP_VERSION}); nothing to do.`);
    return { skipped: true };
  }

  const realAdmin = db.prepare(`
    SELECT id, status FROM users
    WHERE LOWER(email) = LOWER(?) AND role = 'administrator'
  `).get(REAL_ADMIN_EMAIL);
  if (!realAdmin) {
    throw new Error('Refusing cleanup: the real administrator account was not found.');
  }

  const demoAdmin = db.prepare(`
    SELECT id FROM users
    WHERE LOWER(email) = LOWER(?) AND role = 'administrator' AND id != ?
  `).get(DEMO_ADMIN_EMAIL, realAdmin.id);
  const demoAdminId = demoAdmin ? Number(demoAdmin.id) : 0;

  const demoTeamIds = findDemoTeamIds(db);
  const teamDependencies = demoTeamDependencies(db, demoTeamIds);
  const teamsToDelete = teamDependencies === 0 ? demoTeamIds : [];

  const plan = {
    demo_admin: demoAdminId ? { id: demoAdminId, email: DEMO_ADMIN_EMAIL } : null,
    notifications: count(db, `
      SELECT COUNT(*) AS c FROM notifications
      WHERE message LIKE ? OR user_id NOT IN (SELECT id FROM users)
    `, [`%${TEST_RESIDENT_NAME}%`]),
    sessions: count(db, `
      SELECT COUNT(*) AS c FROM sessions
      WHERE user_id NOT IN (SELECT id FROM users) OR (? > 0 AND user_id = ?)
    `, [demoAdminId, demoAdminId]),
    oauth_accounts: count(db, `
      SELECT COUNT(*) AS c FROM oauth_accounts
      WHERE user_id NOT IN (SELECT id FROM users) OR (? > 0 AND user_id = ?)
    `, [demoAdminId, demoAdminId]),
    password_reset_tokens: count(db, `
      SELECT COUNT(*) AS c FROM password_reset_tokens
      WHERE user_id NOT IN (SELECT id FROM users) OR (? > 0 AND user_id = ?)
    `, [demoAdminId, demoAdminId]),
    audit_logs: count(db, `
      SELECT COUNT(*) AS c FROM audit_logs
      WHERE user_id NOT IN (SELECT id FROM users)
         OR (? > 0 AND user_id = ?)
         OR user_name = ?
         OR detail LIKE '%flowtest_%'
    `, [demoAdminId, demoAdminId, TEST_RESIDENT_NAME]),
    repair_teams: teamsToDelete.length,
    repair_team_dependencies: teamDependencies,
  };

  logger(JSON.stringify(plan, null, 2));

  if (!apply) {
    logger('Dry run only. Re-run with --apply to remove these records.');
    return plan;
  }

  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`
      DELETE FROM notifications
      WHERE message LIKE ? OR user_id NOT IN (SELECT id FROM users)
    `).run(`%${TEST_RESIDENT_NAME}%`);

    if (demoAdminId) {
      db.prepare('DELETE FROM sessions WHERE user_id = ? OR user_id NOT IN (SELECT id FROM users)').run(demoAdminId);
      db.prepare('DELETE FROM oauth_accounts WHERE user_id = ? OR user_id NOT IN (SELECT id FROM users)').run(demoAdminId);
      db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ? OR user_id NOT IN (SELECT id FROM users)').run(demoAdminId);
      db.prepare(`
        DELETE FROM audit_logs
        WHERE user_id = ? OR user_id NOT IN (SELECT id FROM users)
           OR user_name = ? OR detail LIKE '%flowtest_%'
      `).run(demoAdminId, TEST_RESIDENT_NAME);
    } else {
      db.prepare('DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users)').run();
      db.prepare('DELETE FROM oauth_accounts WHERE user_id NOT IN (SELECT id FROM users)').run();
      db.prepare('DELETE FROM password_reset_tokens WHERE user_id NOT IN (SELECT id FROM users)').run();
      db.prepare(`
        DELETE FROM audit_logs
        WHERE user_id NOT IN (SELECT id FROM users) OR user_name = ? OR detail LIKE '%flowtest_%'
      `).run(TEST_RESIDENT_NAME);
    }

    if (demoAdminId) {
      db.prepare('DELETE FROM users WHERE id = ? AND LOWER(email) = LOWER(?) AND role = ?')
        .run(demoAdminId, DEMO_ADMIN_EMAIL, 'administrator');
    }

    if (teamsToDelete.length) {
      const placeholders = teamsToDelete.map(() => '?').join(', ');
      db.prepare(`DELETE FROM repair_teams WHERE id IN (${placeholders})`).run(...teamsToDelete);
      db.prepare(`
        DELETE FROM sqlite_sequence
        WHERE name = 'repair_teams' AND NOT EXISTS (SELECT 1 FROM repair_teams)
      `).run();
    }

    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run('demo_cleanup_version', CLEANUP_VERSION);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  const integrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
  const foreignKeyIssues = db.prepare('PRAGMA foreign_key_check').all();
  if (integrity !== 'ok' || foreignKeyIssues.length) {
    throw new Error(`Post-cleanup verification failed: integrity=${integrity}, foreign_keys=${foreignKeyIssues.length}`);
  }

  logger('Cleanup committed and verified.');
  return plan;
}

function main() {
  const apply = process.argv.includes('--apply');
  const dbFlag = process.argv.indexOf('--db');
  const dbPath = dbFlag !== -1 && process.argv[dbFlag + 1]
    ? path.resolve(process.argv[dbFlag + 1])
    : DB_PATH;

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database not found: ${dbPath}`);
  }

  if (apply && dbPath === DB_PATH) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${dbPath}.before-demo-cleanup-${stamp}.bak`;
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Backup written to ${backupPath}`);
  }

  const db = new DatabaseSync(dbPath);
  try {
    cleanDatabase(db, { apply });
    if (apply) db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  } finally {
    db.close();
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('CLEANUP FAILED:', error.message);
    process.exit(1);
  }
}

module.exports = { cleanDatabase, DEMO_TEAMS, CLEANUP_VERSION };
