const {
  loadEnvironment,
  describeDatabase,
  openSqliteReadOnly,
} = require('./neon-staging-common');
const { Client } = require('pg');

// Seeds reference data into the normalized Neon schema:
//   - the 31 Valencia City barangays from the local SQLite source
//   - system settings that describe configuration (not demo bookkeeping)
//
// It never touches user, report, incident, or snapshot tables. Re-running it is
// safe: rows are matched on their natural keys and updated in place.
//
// Usage:
//   node scripts/neon-seed-reference.js            # dry run, rolls back
//   node scripts/neon-seed-reference.js --apply    # commits
//
// Requires POWERWATCH_ALLOW_PRODUCTION_SEED=1 for the target to be writable.
const EXCLUDED_SETTINGS = new Set(['demo_cleanup_version', 'seed_version']);

const requireSeedEnvironment = () => {
  loadEnvironment();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed with NODE_ENV=production.');
  }
  if (process.env.POWERWATCH_ALLOW_PRODUCTION_SEED !== '1') {
    throw new Error('Set POWERWATCH_ALLOW_PRODUCTION_SEED=1 to allow writing reference data.');
  }
  const target = process.env.NEON_DATABASE_URL;
  if (!target) throw new Error('NEON_DATABASE_URL is required.');
  const host = new URL(target).hostname;
  if (!host.endsWith('.neon.tech')) throw new Error(`Refusing to run: ${host} does not look like a Neon endpoint.`);
  return target;
};

const readSource = () => {
  const db = openSqliteReadOnly(process.env.POWERWATCH_SQLITE_PATH || 'data/powerwatch.db');
  try {
    const barangays = db.prepare(`
      SELECT name, area_description, population, latitude, longitude, status
      FROM barangays
      ORDER BY id
    `).all();
    const settings = db.prepare('SELECT key, value FROM settings ORDER BY key').all()
      .filter((row) => !EXCLUDED_SETTINGS.has(row.key));
    return { barangays, settings };
  } finally {
    db.close();
  }
};

const run = async () => {
  const apply = process.argv.includes('--apply');
  const connectionString = requireSeedEnvironment();
  const { barangays, settings } = readSource();

  console.log(`Target : ${describeDatabase(connectionString)}`);
  console.log(`Mode   : ${apply ? 'APPLY (commit)' : 'DRY RUN (rollback)'}`);
  console.log(`Source : ${barangays.length} barangays, ${settings.length} settings (excluded: ${[...EXCLUDED_SETTINGS].join(', ')})`);

  const client = new Client({ connectionString, application_name: 'powerwatch-neon-seed', connectionTimeoutMillis: 20_000 });
  await client.connect();
  try {
    const present = (await client.query(`SELECT to_regclass('public.barangays') b, to_regclass('public.settings') s`)).rows[0];
    if (!present.b || !present.s) throw new Error('barangays/settings tables are missing. Deploy the schema first (npm run db:deploy:apply).');

    await client.query('BEGIN');

    for (const row of barangays) {
      await client.query(`
        INSERT INTO barangays (barangay_name, area_description, population, latitude, longitude, status)
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Active'))
        ON CONFLICT (barangay_name) DO UPDATE
        SET area_description = COALESCE(EXCLUDED.area_description, barangays.area_description),
            population = COALESCE(EXCLUDED.population, barangays.population),
            latitude = COALESCE(EXCLUDED.latitude, barangays.latitude),
            longitude = COALESCE(EXCLUDED.longitude, barangays.longitude),
            status = EXCLUDED.status,
            updated_at = now()
      `, [row.name, row.area_description, row.population, row.latitude, row.longitude, row.status]);
    }

    for (const row of settings) {
      await client.query(`
        INSERT INTO settings (key, value) VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `, [row.key, String(row.value)]);
    }

    const counts = (await client.query(`
      SELECT (SELECT count(*) FROM barangays)::int AS barangays,
             (SELECT count(*) FROM settings)::int AS settings,
             (SELECT count(*) FROM barangays WHERE latitude IS NULL OR longitude IS NULL)::int AS no_coords
    `)).rows[0];

    const failures = [];
    if (counts.barangays < barangays.length) failures.push(`barangays: expected at least ${barangays.length}, found ${counts.barangays}`);
    if (counts.settings < settings.length) failures.push(`settings: expected at least ${settings.length}, found ${counts.settings}`);
    if (counts.no_coords > 0) failures.push(`${counts.no_coords} barangay rows without coordinates`);

    console.log(`\nAfter  : ${counts.barangays} barangays, ${counts.settings} settings, ${counts.no_coords} without coordinates`);
    for (const problem of failures) console.log(`  FAIL ${problem}`);
    if (!failures.length) console.log('  PASS reference data present');

    if (failures.length) {
      await client.query('ROLLBACK');
      throw new Error(`Seed verification failed (${failures.length} problem(s)); rolled back.`);
    }

    if (apply) {
      await client.query('COMMIT');
      console.log('\nCommitted reference data.');
    } else {
      await client.query('ROLLBACK');
      console.log('\nDry run complete; rolled back. Re-run with --apply to commit.');
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
    console.error(`\nReference seed failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { run, EXCLUDED_SETTINGS };
