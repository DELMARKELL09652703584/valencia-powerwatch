const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');

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
        POWERWATCH_DATA_DIR: dataDirectory,
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});
