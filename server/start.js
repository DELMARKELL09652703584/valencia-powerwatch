require('dotenv').config();

const { DB_PATH, UPLOAD_DIR } = require('./paths');
const { createSnapshotStore, endPool, restoreFromNeon } = require('./persistence');
const { getDatabaseUrl } = require('./database-url');

const ENABLED = String(process.env.POWERWATCH_SNAPSHOT_ENABLED || '').toLowerCase() === 'true';

async function main() {
  if (ENABLED && !getDatabaseUrl()) {
    console.error('[persist] POWERWATCH_SNAPSHOT_ENABLED is true, but DATABASE_URL or NEON_DATABASE_URL is not configured.');
  }
  if (ENABLED) {
    try {
      await restoreFromNeon({ dbPath: DB_PATH, uploadDir: UPLOAD_DIR });
    } catch (error) {
      console.error('[persist] restore failed, continuing with local data:', error.message);
    }
  }

  require('./index');

  if (!ENABLED) return;

  const { db } = require('./db');
  const store = createSnapshotStore({ db, dbPath: DB_PATH, uploadDir: UPLOAD_DIR });
  store.start();

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[persist] ${signal} received; saving final snapshot...`);
    try {
      await store.stop();
      const result = await Promise.race([
        store.snapshotNow({ force: true }),
        new Promise((resolve) => setTimeout(() => resolve({ saved: false, reason: 'timeout' }), 12000)),
      ]);
      if (result.saved) console.log('[persist] final snapshot saved.');
      else console.log(`[persist] final snapshot skipped (${result.reason || 'no changes'}).`);
    } catch (error) {
      console.warn('[persist] final snapshot failed:', error.message);
    }
    await Promise.race([
      endPool(),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    process.exit(0);
  };

  process.on('SIGTERM', () => { shutdown('SIGTERM'); });
  process.on('SIGINT', () => { shutdown('SIGINT'); });
}

main();
