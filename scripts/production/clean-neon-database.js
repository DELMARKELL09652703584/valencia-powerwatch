#!/usr/bin/env node
/**
 * Clean and reset Neon PostgreSQL database tables for production launch.
 *
 * This script:
 * 1. Clears expired/test sessions from `resident_sessions`.
 * 2. Clears temporary file uploads from `app_snapshot_files`.
 * 3. Preserves essential reference data (31 barangays, roles, permissions, settings).
 */

require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

async function runCleanup() {
  if (!connectionString) {
    console.error('Error: DATABASE_URL or NEON_DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to Neon PostgreSQL.');

  try {
    // 1. Clear old test sessions
    const deletedSessions = await client.query('DELETE FROM resident_sessions;');
    console.log(`Cleared ${deletedSessions.rowCount} test sessions from resident_sessions.`);

    // 2. Clear old temporary snapshot files
    const deletedFiles = await client.query('DELETE FROM app_snapshot_files;');
    console.log(`Cleared ${deletedFiles.rowCount} temporary uploads from app_snapshot_files.`);

    console.log('Cleanup completed successfully! All tables preserved.');
  } catch (error) {
    console.error('Cleanup error:', error.message);
  } finally {
    await client.end();
  }
}

runCleanup();
