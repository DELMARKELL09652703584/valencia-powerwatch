const { Client } = require('pg');
const { loadEnvironment, describeDatabase } = require('./neon-staging-common');
const { getDatabaseUrl } = require('../../server/config/database-url');
const { EXPECTED_TABLES, verify } = require('./neon-deploy-schema');

const countRows = async (client, name, sql) => {
  const result = await client.query(sql);
  const count = Number(result.rows[0]?.count || 0);
  console.log(`${count === 0 ? 'PASS' : 'FAIL'} ${name}: ${count}`);
  return count;
};

const run = async () => {
  loadEnvironment();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Run this audit from a trusted operator environment, not inside the production service.');
  }
  const connectionString = process.env.POWERWATCH_AUDIT_DATABASE_URL || getDatabaseUrl();
  if (!connectionString) throw new Error('DATABASE_URL or NEON_DATABASE_URL is required.');
  const target = new URL(connectionString);
  if (!target.hostname.endsWith('.neon.tech')) {
    throw new Error('Refusing to run: the configured database host is not a Neon endpoint.');
  }

  const client = new Client({
    connectionString,
    application_name: 'powerwatch-neon-readonly-audit',
    connectionTimeoutMillis: 15_000,
    statement_timeout: 60_000,
  });

  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    console.log(`Read-only audit target: ${describeDatabase(connectionString)}`);

    const { passes, failures } = await verify(client);
    for (const pass of passes) console.log(`PASS ${pass}`);
    for (const failure of failures) console.error(`FAIL ${failure}`);

    const tableSummary = await client.query(`
      SELECT c.relname AS table_name,
             count(DISTINCT a.attnum)::int AS column_count,
             count(DISTINCT i.indexrelid)::int AS index_count,
             count(DISTINCT con.oid) FILTER (WHERE con.contype = 'p')::int AS primary_key_count,
             count(DISTINCT con.oid) FILTER (WHERE con.contype = 'f')::int AS foreign_key_count,
             count(DISTINCT con.oid) FILTER (WHERE con.contype = 'c')::int AS check_count,
             count(DISTINCT con.oid) FILTER (WHERE con.contype <> 'p' AND NOT con.convalidated)::int AS unvalidated_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
      LEFT JOIN pg_index i ON i.indrelid = c.oid
      LEFT JOIN pg_constraint con ON con.conrelid = c.oid
      WHERE n.nspname = 'public' AND c.relname = ANY($1::text[]) AND c.relkind = 'r'
      GROUP BY c.relname
      ORDER BY c.relname
    `, [EXPECTED_TABLES]);

    const tableSet = new Set(tableSummary.rows.map((row) => row.table_name));
    const missingTables = EXPECTED_TABLES.filter((name) => !tableSet.has(name));
    console.log(`Schema detail: ${tableSummary.rowCount}/${EXPECTED_TABLES.length} required tables summarized`);
    for (const row of tableSummary.rows) {
      console.log(
        `  ${row.table_name}: ${row.column_count} columns, PK ${row.primary_key_count}, `
        + `${row.foreign_key_count} FKs, ${row.check_count} checks, ${row.index_count} indexes, `
        + `${row.unvalidated_count} unvalidated constraints`,
      );
    }
    if (missingTables.length) console.error(`FAIL missing tables: ${missingTables.join(', ')}`);

    if (process.argv.includes('--details')) {
      const [columns, constraints, indexes] = await Promise.all([
        client.query(`
          SELECT table_name, column_name, data_type, is_nullable, column_default, is_identity
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ANY($1::text[])
          ORDER BY table_name, ordinal_position
        `, [EXPECTED_TABLES]),
        client.query(`
          SELECT r.relname AS table_name, c.conname AS constraint_name,
                 c.contype AS constraint_type, c.convalidated AS validated,
                 pg_get_constraintdef(c.oid) AS definition
          FROM pg_constraint c
          JOIN pg_class r ON r.oid = c.conrelid
          JOIN pg_namespace n ON n.oid = r.relnamespace
          WHERE n.nspname = 'public' AND r.relname = ANY($1::text[])
          ORDER BY r.relname, c.contype, c.conname
        `, [EXPECTED_TABLES]),
        client.query(`
          SELECT tablename AS table_name, indexname, indexdef
          FROM pg_indexes
          WHERE schemaname = 'public' AND tablename = ANY($1::text[])
          ORDER BY tablename, indexname
        `, [EXPECTED_TABLES]),
      ]);
      console.log('Column definitions:');
      for (const row of columns.rows) {
        console.log(`  ${row.table_name}.${row.column_name} ${row.data_type} `
          + `${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`
          + `${row.is_identity === 'YES' ? ' IDENTITY' : ''}`
          + `${row.column_default ? ` DEFAULT ${row.column_default}` : ''}`);
      }
      console.log('Constraints:');
      for (const row of constraints.rows) {
        console.log(`  ${row.table_name}.${row.constraint_name} `
          + `[${row.constraint_type}; ${row.validated ? 'validated' : 'NOT VALID'}] ${row.definition}`);
      }
      console.log('Indexes:');
      for (const row of indexes.rows) console.log(`  ${row.table_name}.${row.indexname}: ${row.indexdef}`);
    }

    const diagnostics = [
      ['users without profile', `
        SELECT count(*)::int AS count FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id WHERE p.user_id IS NULL
      `],
      ['users without role', `
        SELECT count(*)::int AS count FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id WHERE ur.user_id IS NULL
      `],
      ['primary role mismatch', `
        SELECT count(*)::int AS count FROM users u
        LEFT JOIN roles r ON r.role_name = u.role
        LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.role_id = r.id
        WHERE ur.user_id IS NULL
      `],
      ['reports with missing reporter', `
        SELECT count(*)::int AS count FROM reports r
        LEFT JOIN users u ON u.id = r.reporter_id WHERE u.id IS NULL
      `],
      ['stale report incident pointers', `
        SELECT count(*)::int AS count FROM reports r
        LEFT JOIN incidents i ON i.id = r.incident_id
        WHERE r.incident_id IS NOT NULL AND i.id IS NULL
      `],
      ['case-insensitive duplicate account emails', `
        SELECT count(*)::int AS count FROM (
          SELECT lower(email) FROM users GROUP BY lower(email) HAVING count(*) > 1
        ) duplicates
      `],
      ['case-insensitive duplicate barangays', `
        SELECT count(*)::int AS count FROM (
          SELECT lower(barangay_name) FROM barangays GROUP BY lower(barangay_name) HAVING count(*) > 1
        ) duplicates
      `],
    ];

    let dataIssues = 0;
    for (const [name, sql] of diagnostics) dataIssues += await countRows(client, name, sql);
    if (missingTables.length) dataIssues += missingTables.length;
    if (failures.length) dataIssues += failures.length;

    const migrationTable = await client.query(
      "SELECT to_regclass('public.schema_migrations') AS table_name",
    );
    if (migrationTable.rows[0]?.table_name) {
      const migrations = await client.query(`
        SELECT version FROM schema_migrations
        WHERE version ~ '^00[1-8]_'
        ORDER BY version
      `);
      console.log(`Recorded app migrations: ${migrations.rows.map((row) => row.version).join(', ') || 'none'}`);
    } else {
      console.warn('schema_migrations table not found; migration history not verified.');
    }

    await client.query('ROLLBACK');
    if (dataIssues) {
      console.error(`READ-ONLY AUDIT FAILED: ${dataIssues} issue(s) reported.`);
      process.exitCode = 1;
    } else {
      console.log('READ-ONLY AUDIT PASSED.');
    }
  } finally {
    await client.end();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error(`Read-only Neon audit failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { run };
