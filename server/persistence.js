const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const DEFAULT_INTERVAL_MS = 15000;
const DEFAULT_MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
const DEFAULT_RESTORE_TIMEOUT_MS = 20000;

let pool = null;
let tablesReady = false;

const log = (...args) => console.log('[persist]', ...args);
const warn = (...args) => console.warn('[persist]', ...args);

function config() {
  return {
    enabled: String(process.env.POWERWATCH_SNAPSHOT_ENABLED || '').toLowerCase() === 'true',
    connectionString: process.env.NEON_DATABASE_URL || '',
    id: process.env.POWERWATCH_SNAPSHOT_ID || 'main',
    intervalMs: Number(process.env.POWERWATCH_SNAPSHOT_INTERVAL_MS || DEFAULT_INTERVAL_MS),
  };
}

function maxUploadBytes() {
  return Number(process.env.POWERWATCH_SNAPSHOT_MAX_UPLOAD_BYTES || DEFAULT_MAX_UPLOAD_BYTES);
}

function getPool() {
  if (!pool) {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: config().connectionString,
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      query_timeout: 20000,
      allowExitOnIdle: true,
    });
    pool.on('error', (error) => warn('Neon pool error:', error.message));
  }
  return pool;
}

async function ensureTables(client) {
  if (tablesReady) return;
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_snapshots (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      size BIGINT NOT NULL,
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS app_snapshot_files (
      snapshot_id TEXT NOT NULL,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      size BIGINT NOT NULL,
      data BYTEA NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (snapshot_id, name)
    );
  `);
  tablesReady = true;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function withTimeout(promise, ms) {
  let timer = null;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function safeJoin(base, name) {
  const target = path.resolve(base, name);
  const relative = path.relative(base, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return target;
}

function walkFiles(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, base, out);
    else if (entry.isFile()) out.push({ full, name: path.relative(base, full).split(path.sep).join('/') });
  }
  return out;
}

async function restoreFromNeon({ dbPath, uploadDir, snapshotId } = {}) {
  const settings = config();
  if (!settings.enabled) return { restored: false, reason: 'disabled' };
  if (!settings.connectionString) {
    warn('NEON_DATABASE_URL is missing; snapshot restore skipped.');
    return { restored: false, reason: 'no-connection' };
  }
  if (!dbPath || !uploadDir) throw new Error('restoreFromNeon requires dbPath and uploadDir');

  const targetId = snapshotId || settings.id;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });

  try {
    const result = await withTimeout((async () => {
      const client = await getPool().connect();
      try {
        await ensureTables(client);
        const snapshot = await client.query(
          'SELECT checksum, size, data, created_at FROM app_snapshots WHERE id = $1',
          [targetId]
        );
        if (!snapshot.rowCount) return { restored: false, reason: 'empty' };

        const raw = await gunzip(snapshot.rows[0].data);
        const tempPath = `${dbPath}.restore-${process.pid}-${Date.now()}`;
        fs.writeFileSync(tempPath, raw);
        for (const suffix of ['-wal', '-shm']) {
          try { fs.unlinkSync(`${dbPath}${suffix}`); } catch (err) {}
        }
        fs.copyFileSync(tempPath, dbPath);
        fs.unlinkSync(tempPath);

        const files = await client.query(
          'SELECT name, data FROM app_snapshot_files WHERE snapshot_id = $1 ORDER BY name',
          [targetId]
        );
        let restoredFiles = 0;
        for (const row of files.rows) {
          const target = safeJoin(uploadDir, row.name);
          if (!target) {
            warn(`skipping unsafe upload path: ${row.name}`);
            continue;
          }
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, row.data);
          restoredFiles += 1;
        }
        return {
          restored: true,
          bytes: raw.length,
          createdAt: snapshot.rows[0].created_at,
          files: restoredFiles,
        };
      } finally {
        client.release();
      }
    })(), Number(process.env.POWERWATCH_SNAPSHOT_RESTORE_TIMEOUT_MS || DEFAULT_RESTORE_TIMEOUT_MS));

    if (!result.restored) {
      log(`no Neon snapshot for "${targetId}" (${result.reason}); starting with local data.`);
      return result;
    }
    const when = result.createdAt instanceof Date ? result.createdAt.toISOString() : String(result.createdAt);
    log(`restored "${targetId}" from Neon: db ${formatBytes(result.bytes)}, ${result.files} upload file(s), saved ${when}.`);
    return result;
  } catch (error) {
    warn(`restore skipped: ${error.message}`);
    return { restored: false, reason: error.message };
  }
}

function createSnapshotStore({ db, dbPath, uploadDir, snapshotId } = {}) {
  const settings = config();
  const targetId = snapshotId || settings.id;
  let timer = null;
  let running = false;
  let stopped = false;
  let lastSignature = null;
  let fileChecksums = null;
  let lastError = '';
  let uploadLimitWarned = false;

  const signature = () => {
    const parts = [];
    for (const file of [dbPath, `${dbPath}-wal`]) {
      try {
        const stat = fs.statSync(file);
        parts.push(`${stat.size}:${stat.mtimeMs}`);
      } catch (error) {
        parts.push('0:0');
      }
    }
    return parts.join('|');
  };

  async function uploadChangedFiles(client) {
    const limit = maxUploadBytes();
    const files = walkFiles(uploadDir);
    let total = 0;
    for (const file of files) {
      try { total += fs.statSync(file.full).size; } catch (error) {}
    }
    if (total > limit) {
      if (!uploadLimitWarned) {
        warn(`uploads total ${formatBytes(total)} exceeds ${formatBytes(limit)}; upload snapshots skipped.`);
        uploadLimitWarned = true;
      }
      return { saved: 0, names: [] };
    }

    if (fileChecksums === null) {
      fileChecksums = new Map();
      const existing = await client.query(
        'SELECT name, checksum FROM app_snapshot_files WHERE snapshot_id = $1',
        [targetId]
      );
      for (const row of existing.rows) fileChecksums.set(row.name, row.checksum);
    }

    const names = files.map((file) => file.name);
    let saved = 0;
    for (const file of files) {
      let raw;
      try { raw = fs.readFileSync(file.full); } catch (error) { continue; }
      const checksum = sha256(raw);
      if (fileChecksums.get(file.name) === checksum) continue;
      try {
        await client.query(
          `INSERT INTO app_snapshot_files (snapshot_id, name, checksum, size, data)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (snapshot_id, name) DO UPDATE
           SET checksum = EXCLUDED.checksum, size = EXCLUDED.size, data = EXCLUDED.data, updated_at = now()
           WHERE app_snapshot_files.checksum IS DISTINCT FROM EXCLUDED.checksum`,
          [targetId, file.name, checksum, raw.length, raw]
        );
        fileChecksums.set(file.name, checksum);
        saved += 1;
      } catch (error) {
        warn(`upload snapshot failed for ${file.name}: ${error.message}`);
      }
    }
    return { saved, names };
  }

  async function pruneFiles(client, names) {
    if (fileChecksums === null) return 0;
    const keep = new Set(names);
    if (!keep.size) {
      const result = await client.query(
        'DELETE FROM app_snapshot_files WHERE snapshot_id = $1',
        [targetId]
      );
      fileChecksums.clear();
      return result.rowCount;
    }
    const result = await client.query(
      'DELETE FROM app_snapshot_files WHERE snapshot_id = $1 AND NOT (name = ANY($2::text[]))',
      [targetId, names]
    );
    for (const name of Array.from(fileChecksums.keys())) {
      if (!keep.has(name)) fileChecksums.delete(name);
    }
    return result.rowCount;
  }

  async function snapshotNow({ force = false } = {}) {
    if (!settings.enabled) return { saved: false, reason: 'disabled' };
    if (!settings.connectionString) {
      if (lastError !== 'no-connection') {
        warn('NEON_DATABASE_URL is missing; snapshots disabled.');
        lastError = 'no-connection';
      }
      return { saved: false, reason: 'no-connection' };
    }
    if (running) return { saved: false, reason: 'busy' };
    if (stopped && !force) return { saved: false, reason: 'stopped' };

    const before = signature();
    if (!force && before === lastSignature) return { saved: false, reason: 'unchanged' };

    running = true;
    const startedAt = Date.now();
    const tempPath = path.join(
      path.dirname(dbPath),
      `.powerwatch-snapshot-${process.pid}-${Date.now()}.db`
    );

    try {
      try { fs.unlinkSync(tempPath); } catch (error) {}
      db.exec(`VACUUM INTO '${tempPath.replace(/'/g, "''")}'`);
      const raw = fs.readFileSync(tempPath);
      const checksum = sha256(raw);
      const compressed = await gzip(raw, { level: 6 });

      const client = await getPool().connect();
      let dbSaved = false;
      let fileResult = { saved: 0, names: [] };
      try {
        await ensureTables(client);
        fileResult = await uploadChangedFiles(client);
        const result = await client.query(
          `INSERT INTO app_snapshots (id, checksum, size, data)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE
           SET checksum = EXCLUDED.checksum, size = EXCLUDED.size, data = EXCLUDED.data, created_at = now()
           WHERE app_snapshots.checksum IS DISTINCT FROM EXCLUDED.checksum
           RETURNING id`,
          [targetId, checksum, raw.length, compressed]
        );
        dbSaved = result.rowCount > 0;
        await pruneFiles(client, fileResult.names);
      } finally {
        client.release();
      }

      lastSignature = before;
      if (lastError && lastError !== 'no-connection') log('Neon snapshot recovered.');
      lastError = '';
      if (dbSaved || fileResult.saved > 0) {
        const dbNote = dbSaved
          ? `db ${formatBytes(raw.length)} (${formatBytes(compressed.length)} gzip)`
          : 'db unchanged';
        log(`snapshot saved: ${dbNote}, ${fileResult.saved} upload file(s), ${Date.now() - startedAt}ms.`);
      }
      return {
        saved: dbSaved || fileResult.saved > 0,
        dbSaved,
        files: fileResult.saved,
        bytes: raw.length,
      };
    } catch (error) {
      if (lastError !== error.message) {
        warn(`snapshot failed: ${error.message}`);
        lastError = error.message;
      }
      return { saved: false, reason: error.message };
    } finally {
      try { fs.unlinkSync(tempPath); } catch (error) {}
      running = false;
    }
  }

  function start() {
    if (!settings.enabled || timer) return;
    const seconds = Math.max(5, Math.round(settings.intervalMs / 1000));
    log(`auto-snapshot "${targetId}" to Neon every ${seconds}s.`);
    const tick = () => { snapshotNow().catch((error) => warn(error.message)); };
    timer = setInterval(tick, Math.max(5000, settings.intervalMs));
    if (typeof timer.unref === 'function') timer.unref();
    const first = setTimeout(tick, 3000);
    if (typeof first.unref === 'function') first.unref();
  }

  async function stop() {
    stopped = true;
    if (timer) clearInterval(timer);
    timer = null;
  }

  return {
    enabled: settings.enabled,
    targetId,
    snapshotNow,
    start,
    stop,
  };
}

async function endPool() {
  if (!pool) return;
  const current = pool;
  pool = null;
  tablesReady = false;
  try {
    await current.end();
  } catch (error) {
    warn('Neon pool shutdown error:', error.message);
  }
}

module.exports = {
  config,
  createSnapshotStore,
  endPool,
  restoreFromNeon,
};
