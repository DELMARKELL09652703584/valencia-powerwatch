const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { getDatabaseUrl } = require('../server/database-url');

const ROOT = path.resolve(__dirname, '..');

test('DATABASE_URL takes precedence over the legacy Neon variable', () => {
  assert.equal(getDatabaseUrl({
    DATABASE_URL: 'postgres://current.example/db',
    NEON_DATABASE_URL: 'postgres://legacy.example/db',
  }), 'postgres://current.example/db');
});

test('NEON_DATABASE_URL remains a backward-compatible fallback', () => {
  assert.equal(getDatabaseUrl({
    DATABASE_URL: '',
    NEON_DATABASE_URL: 'postgres://legacy.example/db',
  }), 'postgres://legacy.example/db');
});

test('database URL resolver returns empty when no database URL is configured', () => {
  assert.equal(getDatabaseUrl({}), '');
});

test('Render uses NEON_DATABASE_URL and requires persistent resident authentication storage', () => {
  const renderConfig = fs.readFileSync(path.join(ROOT, 'render.yaml'), 'utf8');

  assert.match(renderConfig, /key: NEON_DATABASE_URL\s*\n\s+sync: false/);
  assert.match(renderConfig, /key: PERSISTENT_AUTH_REQUIRED\s*\n\s*value: "true"/);
});
