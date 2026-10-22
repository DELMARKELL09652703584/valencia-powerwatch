const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { createResidentStore } = require('../server/resident-store');

const ROOT = path.resolve(__dirname, '..');

test('Render uses free Neon snapshot persistence for production data', () => {
  const renderConfig = fs.readFileSync(path.join(ROOT, 'render.yaml'), 'utf8');
  const deploymentGuide = fs.readFileSync(path.join(ROOT, 'SYSTEM_DEPLOYMENT_AND_USER_GUIDE.md'), 'utf8');

  assert.match(renderConfig, /^\s+branch: main$/m);
  assert.match(renderConfig, /^\s+plan: free$/m);
  assert.doesNotMatch(renderConfig, /^\s+disk:\s*$/m);
  assert.match(renderConfig, /^\s+startCommand: node server\/start\.js$/m);
  assert.match(renderConfig, /key: POWERWATCH_SNAPSHOT_ENABLED\s*\n\s+value: "true"/);
  assert.match(renderConfig, /key: NEON_DATABASE_URL\s*\n\s+sync: false/);
  assert.doesNotMatch(renderConfig, /^\s+key: PERSISTENT_AUTH_REQUIRED$/m);
  assert.match(deploymentGuide, /Neon PostgreSQL stores compressed (?:SQLite )?snapshots/);
});

test('resident account credentials survive a database process restart', () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'powerwatch-process-retention-'));
  const email = 'persistent-resident@example.test';
  const password = 'persistent-resident-password';
  const writeScript = `
    const { db, hashPassword, checkpointDb } = require('./server/db');
    db.prepare(\`
      INSERT INTO users (full_name, email, password_hash, role, status, created_at)
      VALUES (?, ?, ?, 'resident', 'Active', ?)
    \`).run('Persistent Resident', ${JSON.stringify(email)}, hashPassword(${JSON.stringify(password)}), new Date().toISOString());
    checkpointDb();
    db.close();
  `;
  const verifyScript = `
    const assert = require('node:assert/strict');
    const { db } = require('./server/db');
    const { verifyPassword } = require('./server/auth');
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(${JSON.stringify(email)});
    assert.ok(user);
    assert.equal(user.role, 'resident');
    assert.equal(user.status, 'Active');
    assert.equal(verifyPassword(${JSON.stringify(password)}, user.password_hash), true);
    db.close();
  `;
  const childEnv = {
    ...process.env,
    NODE_ENV: 'production',
    NEON_DATABASE_URL: '',
    POWERWATCH_DATA_DIR: dataDirectory,
    POWERWATCH_MIGRATE_LOCAL_DB: 'false',
  };

  try {
    const writeResult = spawnSync(process.execPath, ['-e', writeScript], {
      cwd: ROOT,
      encoding: 'utf8',
      env: childEnv,
    });
    assert.equal(writeResult.status, 0, writeResult.stderr || writeResult.stdout);

    const verifyResult = spawnSync(process.execPath, ['-e', verifyScript], {
      cwd: ROOT,
      encoding: 'utf8',
      env: childEnv,
    });
    assert.equal(verifyResult.status, 0, verifyResult.stderr || verifyResult.stdout);
  } finally {
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test('Neon resident account and session records survive store reinitialization', async () => {
  const accounts = new Map();
  const sessions = new Map();
  const pool = {
    async query(sql, values = []) {
      if (/^\s*CREATE TABLE|^\s*CREATE INDEX/i.test(sql)) return { rows: [] };
      if (/INSERT INTO resident_accounts/i.test(sql) && /RETURNING \*/i.test(sql)) {
        const row = {
          id: '49a7a08f-7c2c-4a7a-b5c2-d0fb9f2b57d1',
          full_name: values[0],
          username: values[1],
          email: values[2],
          role: 'resident',
          contact_number: values[3],
          address: values[4],
          barangay: values[5],
          password_hash: values[6],
          status: 'Active',
          profile_photo_path: null,
          created_at: values[7],
          last_login: null,
        };
        if (accounts.has(row.email.toLowerCase())) {
          const error = new Error('duplicate key');
          error.code = '23505';
          throw error;
        }
        accounts.set(row.email.toLowerCase(), row);
        return { rows: [row] };
      }
      if (/SELECT \* FROM resident_accounts WHERE LOWER\(email\)/i.test(sql)) {
        const row = accounts.get(String(values[0]).toLowerCase());
        return { rows: row ? [row] : [] };
      }
      if (/INSERT INTO resident_sessions/i.test(sql) && /VALUES/i.test(sql)) {
        sessions.set(values[0], {
          token: values[0],
          user_id: values[1],
          created_at: values[2],
          expires_at: values[3],
        });
        return { rows: [] };
      }
      if (/SELECT a\.\* FROM resident_sessions/i.test(sql)) {
        const session = sessions.get(values[0]);
        const account = session && new Date(session.expires_at) > new Date(values[1])
          ? [...accounts.values()].find((row) => row.id === session.user_id)
          : null;
        return { rows: account ? [account] : [] };
      }
      throw new Error(`Unexpected resident-store query: ${sql}`);
    },
  };

  const password = 'persisted-resident-password';
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
  const originalStore = createResidentStore(pool);
  const account = await originalStore.createAccount({
    full_name: 'Persisted Resident',
    username: 'persisted-resident',
    email: 'persisted-resident@example.test',
    contact_number: null,
    address: null,
    barangay: null,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  });
  await originalStore.createSession('persistent-session-token', account.id, new Date().toISOString(), new Date(Date.now() + 60_000).toISOString());

  const restartedStore = createResidentStore(pool);
  const restored = await restartedStore.findByEmail(account.email);
  const sessionUser = await restartedStore.findUserByToken('persistent-session-token', new Date().toISOString());
  assert.equal(restored.id, account.id);
  assert.equal(restored.password_hash, passwordHash);
  assert.equal(sessionUser.email, account.email);
});

test('database startup preserves existing accounts and credentials', () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'powerwatch-user-retention-'));
  const script = `
    const assert = require('node:assert/strict');
    const { db, ensureAdminAccount, hashPassword } = require('./server/db');
    const { verifyPassword } = require('./server/auth');
    const timestamp = new Date().toISOString();
    const addUser = db.prepare(\`
      INSERT INTO users (id, full_name, username, email, password_hash, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    \`);
    const residentPassword = 'resident-password-stays-valid';
    const residentHash = hashPassword(residentPassword);
    addUser.run(9, 'Existing Resident', 'existing-resident', 'existing-resident@example.test', residentHash, 'resident', 'Active', timestamp);

    const adminPassword = 'admin-password-was-changed';
    const demoPassword = 'demo-password-was-changed';
    db.prepare("UPDATE users SET password_hash = ?, status = 'Inactive' WHERE LOWER(email) = LOWER(?)")
      .run(hashPassword(adminPassword), 'dsaroay@gmail.com');
    db.prepare("UPDATE users SET password_hash = ?, status = 'Inactive' WHERE LOWER(email) = LOWER(?)")
      .run(hashPassword(demoPassword), 'admin@powerwatch.ph');

    ensureAdminAccount();

    const resident = db.prepare('SELECT * FROM users WHERE id = 9').get();
    assert.equal(resident.email, 'existing-resident@example.test');
    assert.equal(resident.status, 'Active');
    assert.equal(verifyPassword(residentPassword, resident.password_hash), true);

    const admin = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get('dsaroay@gmail.com');
    assert.equal(admin.username, 'DELMARKEL2003');
    assert.equal(admin.role, 'administrator');
    assert.equal(admin.status, 'Inactive');
    assert.equal(verifyPassword(adminPassword, admin.password_hash), true);

    const demo = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get('admin@powerwatch.ph');
    assert.equal(demo.status, 'Inactive');
    assert.equal(verifyPassword(demoPassword, demo.password_hash), true);
  `;

  try {
    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        NEON_DATABASE_URL: '',
        POWERWATCH_DATA_DIR: dataDirectory,
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test('persistent data directory migration retains legacy registered users', () => {
  const runtimeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'powerwatch-db-migration-'));
  fs.cpSync(path.join(ROOT, 'server'), path.join(runtimeDirectory, 'server'), { recursive: true });
  fs.writeFileSync(path.join(runtimeDirectory, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const legacyDataDirectory = path.join(runtimeDirectory, 'data');
  const persistentDataDirectory = path.join(runtimeDirectory, 'persistent-data');
  const seedScript = `
    const { db, hashPassword } = require('./server/db');
    db.prepare(\`
      INSERT INTO users (full_name, username, email, password_hash, role, status, created_at)
      VALUES (?, ?, ?, ?, 'resident', 'Active', ?)
    \`).run('Migrated Resident', 'migrated-resident', 'migrated-resident@example.test', hashPassword('migrated-password'), new Date().toISOString());
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  `;
  const verifyScript = `
    const assert = require('node:assert/strict');
    const { db } = require('./server/db');
    const { verifyPassword } = require('./server/auth');
    const resident = db.prepare('SELECT * FROM users WHERE email = ?').get('migrated-resident@example.test');
    assert.ok(resident);
    assert.equal(resident.status, 'Active');
    assert.equal(verifyPassword('migrated-password', resident.password_hash), true);
  `;

  try {
    const seedResult = spawnSync(process.execPath, ['-e', seedScript], {
      cwd: runtimeDirectory,
      encoding: 'utf8',
      env: {
        ...process.env,
        NEON_DATABASE_URL: '',
        POWERWATCH_DATA_DIR: legacyDataDirectory,
        POWERWATCH_MIGRATE_LOCAL_DB: 'false',
        NODE_PATH: path.join(ROOT, 'node_modules'),
      },
    });
    assert.equal(seedResult.status, 0, seedResult.stderr || seedResult.stdout);

    const migrationResult = spawnSync(process.execPath, ['-e', verifyScript], {
      cwd: runtimeDirectory,
      encoding: 'utf8',
      env: {
        ...process.env,
        NEON_DATABASE_URL: '',
        POWERWATCH_DATA_DIR: persistentDataDirectory,
        POWERWATCH_MIGRATE_LOCAL_DB: 'true',
        NODE_PATH: path.join(ROOT, 'node_modules'),
      },
    });
    assert.equal(migrationResult.status, 0, migrationResult.stderr || migrationResult.stdout);
  } finally {
    fs.rmSync(runtimeDirectory, { recursive: true, force: true });
  }
});
