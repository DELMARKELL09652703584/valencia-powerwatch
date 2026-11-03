const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { Client } = require('pg');

const ROOT = path.resolve(__dirname, '..', '..');
const STAGING_ENV_PATH = path.join(ROOT, '.env.staging.local');

const loadEnvironment = () => {
  require('dotenv').config({ path: STAGING_ENV_PATH, quiet: true });
  require('dotenv').config({ path: path.join(ROOT, '.env'), quiet: true });
};

const parsedUrl = (value, label) => {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${label} is not a valid PostgreSQL connection URL.`);
  }
};

const describeDatabase = (value) => {
  const url = parsedUrl(value, 'Database URL');
  const database = url.pathname.replace(/^\//, '') || '(default)';
  return `${url.hostname}/${database}`;
};

const requireStagingEnvironment = () => {
  loadEnvironment();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run a staging migration with NODE_ENV=production.');
  }
  if (process.env.POWERWATCH_ALLOW_NEON_DEV !== '1') {
    throw new Error('Refusing to run: set POWERWATCH_ALLOW_NEON_DEV=1 only for an isolated Neon development branch.');
  }
  const target = process.env.NEON_DEV_DATABASE_URL;
  if (!target) {
    throw new Error('NEON_DEV_DATABASE_URL is required. It must point to the Neon development branch, never production.');
  }
  const targetUrl = parsedUrl(target, 'NEON_DEV_DATABASE_URL');
  if (!/^postgres(ql)?:$/.test(targetUrl.protocol)) {
    throw new Error('NEON_DEV_DATABASE_URL must use the postgres:// or postgresql:// protocol.');
  }
  for (const productionName of ['NEON_DATABASE_URL', 'NEON_SOURCE_DATABASE_URL']) {
    const production = process.env[productionName];
    if (production && target === production) {
      throw new Error(`Refusing to run: NEON_DEV_DATABASE_URL is identical to ${productionName}.`);
    }
    if (production && parsedUrl(production, productionName).hostname === targetUrl.hostname) {
      throw new Error(`Refusing to run: the development URL uses the same Neon endpoint as ${productionName}.`);
    }
  }
  return target;
};

const createStagingClient = (connectionString) => new Client({
  connectionString,
  application_name: 'powerwatch-neon-staging',
  connectionTimeoutMillis: 15_000,
  statement_timeout: 60_000,
});

const openSqliteReadOnly = (sqlitePath) => {
  const resolved = path.resolve(sqlitePath || path.join(ROOT, 'data', 'powerwatch.db'));
  if (!fs.existsSync(resolved)) {
    throw new Error(`SQLite source not found: ${resolved}`);
  }
  return new DatabaseSync(resolved, { readOnly: true });
};

const toIso = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const combineDateTime = (dateValue, timeValue) => {
  if (!dateValue) return null;
  const dateText = String(dateValue).trim();
  if (dateText.includes('T')) return toIso(dateText);
  const timeText = String(timeValue || '00:00').trim();
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?/.exec(timeText);
  if (!match) return null;
  const time = `${match[1]}:${match[2]}:${match[3] || '00'}+08:00`;
  return toIso(`${dateText}T${time}`);
};

const validSessionHash = (value) => /^[0-9a-f]{64}$/i.test(String(value || ''));

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const quoteIdentifier = (value) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
  return `"${value}"`;
};

const syncIdentity = async (client, table, idColumn = 'id') => {
  const safeTable = quoteIdentifier(table);
  const safeColumn = quoteIdentifier(idColumn);
  await client.query(`
    SELECT setval(
      pg_get_serial_sequence($1, $2),
      COALESCE((SELECT MAX(${safeColumn}) FROM ${safeTable}), 1),
      (SELECT COUNT(*) > 0 FROM ${safeTable})
    )
  `, [table, idColumn]);
};

const readMigrations = (directory = path.join(ROOT, 'database', 'migrations')) => {
  if (!fs.existsSync(directory)) {
    throw new Error(`Migration directory not found: ${directory}`);
  }
  return fs.readdirSync(directory)
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort()
    .map((name) => {
      const sql = fs.readFileSync(path.join(directory, name), 'utf8');
      return { name, sql, checksum: sha256(sql) };
    });
};

module.exports = {
  ROOT,
  STAGING_ENV_PATH,
  loadEnvironment,
  describeDatabase,
  requireStagingEnvironment,
  createStagingClient,
  openSqliteReadOnly,
  toIso,
  combineDateTime,
  validSessionHash,
  sha256,
  quoteIdentifier,
  syncIdentity,
  readMigrations,
};
