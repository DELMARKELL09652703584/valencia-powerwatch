const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');
const { createResidentStore } = require('../server/resident-store');
const { getDatabaseUrl } = require('../server/database-url');

const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : null;
const connectionString = getDatabaseUrl();
if (!sourcePath) {
  throw new Error('Usage: node scripts/migrate-residents-to-neon.js <sqlite-backup-path>');
}
if (!connectionString) {
  throw new Error('DATABASE_URL or NEON_DATABASE_URL must be set in the environment before importing account data.');
}

const source = new DatabaseSync(sourcePath, { readOnly: true });
const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 10_000,
});
const store = createResidentStore(pool);

const run = async () => {
  let importedAccounts = 0;
  let existingAccounts = 0;
  let importedSessions = 0;

  try {
    const residents = source.prepare("SELECT * FROM users WHERE role = 'resident'").all();
    for (const resident of residents) {
      const existing = await store.findByEmail(resident.email);
      if (existing) {
        existingAccounts += 1;
        continue;
      }
      await store.saveLegacyAccount(resident);
      importedAccounts += 1;
    }

    const sessions = source.prepare(`
      SELECT s.token, s.created_at, s.expires_at, u.email
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE u.role = 'resident'
    `).all();
    for (const session of sessions) {
      await store.saveLegacySession(session);
      importedSessions += 1;
    }

    console.log(`Resident account migration complete: ${importedAccounts} imported, ${existingAccounts} already present, ${importedSessions} sessions copied.`);
  } finally {
    source.close();
    await pool.end();
  }
};

run().catch((error) => {
  console.error(`Resident account migration failed: ${error.message}`);
  process.exitCode = 1;
});
