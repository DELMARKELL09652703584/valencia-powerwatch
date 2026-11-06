require('dotenv').config();
const { Client } = require('pg');

const { getDatabaseUrl } = require('../server/config/database-url');

async function check() {
  const connectionString = getDatabaseUrl();
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Neon successfully!');

    const fkRes = await client.query("SELECT count(*)::int AS count FROM pg_constraint WHERE contype = 'f';");
    const pkRes = await client.query("SELECT count(*)::int AS count FROM pg_constraint WHERE contype = 'p';");
    const checkRes = await client.query("SELECT count(*)::int AS count FROM pg_constraint WHERE contype = 'c';");
    const uqRes = await client.query("SELECT count(*)::int AS count FROM pg_constraint WHERE contype = 'u';");

    console.log('Live Neon Constraints:');
    console.log('  Foreign Keys (FK):', fkRes.rows[0].count);
    console.log('  Primary Keys (PK):', pkRes.rows[0].count);
    console.log('  Check Constraints:', checkRes.rows[0].count);
    console.log('  Unique Constraints:', uqRes.rows[0].count);

    // List any tables in public schema that have NO foreign keys (either incoming or outgoing)
    const tablesQuery = `
      SELECT t.table_name
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name;
    `;
    const tablesRes = await client.query(tablesQuery);
    console.log(`Total public tables: ${tablesRes.rows.length}`);

    // Check FKs specifically
    const fkDetailsQuery = `
      SELECT
        conrelid::regclass AS table_name,
        conname AS fk_name,
        pg_get_constraintdef(c.oid) AS fk_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE c.contype = 'f' AND n.nspname = 'public'
      ORDER BY table_name, fk_name;
    `;
    const fkDetails = await client.query(fkDetailsQuery);
    console.log(`Public schema foreign keys count: ${fkDetails.rows.length}`);

    // Check columns of resident_sessions
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'resident_sessions';
    `);
    console.log('resident_sessions columns:', cols.rows.map(r => r.column_name));

    // Check orphan records if any exist in resident_sessions
    const orphanSessions = await client.query(`
      SELECT count(*)::int AS orphans
      FROM resident_sessions s
      LEFT JOIN resident_accounts a ON s.user_id = a.id
      WHERE a.id IS NULL;
    `);
    console.log('Orphan resident sessions:', orphanSessions.rows[0].orphans);

    await client.end();
  } catch (err) {
    console.error('Error during Neon check:', err);
    process.exit(1);
  }
}

check();
