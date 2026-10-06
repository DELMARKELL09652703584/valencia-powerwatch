const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const TEST_TIMEOUT_MS = 30000;

let serverProcess;
let baseUrl;
let testDirectory;
let residentCookie;
let adminCookie;
let serverOutput = '';

const getAvailablePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close((error) => error ? reject(error) : resolve(port));
  });
});

before(async () => {
  testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'valencia-powerwatch-insights-test-'));
  const runtimeRoot = path.join(testDirectory, 'runtime');
  fs.mkdirSync(path.join(runtimeRoot, 'data'), { recursive: true });
  fs.mkdirSync(path.join(runtimeRoot, 'uploads'), { recursive: true });
  fs.writeFileSync(path.join(runtimeRoot, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  fs.cpSync(path.join(ROOT, 'server'), path.join(runtimeRoot, 'server'), { recursive: true });

  const seedScript = `
    const { db } = require('./server/db');
    const now = new Date();
    const timestamp = (date) => date.toISOString();
    const adminId = Number(db.prepare("INSERT INTO users (full_name, email, password_hash, role, status, barangay, created_at) VALUES ('Analytics Admin', 'analytics-admin@example.test', 'test', 'administrator', 'Active', 'Poblacion', ?)").run(timestamp(now)).lastInsertRowid);
    const residentId = Number(db.prepare("INSERT INTO users (full_name, email, password_hash, role, status, barangay, created_at) VALUES ('Poblacion Resident', 'poblacion@example.test', 'test', 'resident', 'Active', 'Poblacion', ?)").run(timestamp(now)).lastInsertRowid);
    const otherResidentId = Number(db.prepare("INSERT INTO users (full_name, email, password_hash, role, status, barangay, created_at) VALUES ('Banlag Resident', 'banlag@example.test', 'test', 'resident', 'Active', 'Banlag', ?)").run(timestamp(now)).lastInsertRowid);
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run('resident-test-token', residentId, timestamp(now), timestamp(new Date(now.getTime() + 86400000)));
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run('admin-test-token', adminId, timestamp(now), timestamp(new Date(now.getTime() + 86400000)));
    const insertIncident = db.prepare('INSERT INTO outage_incidents (incident_code, title, barangay, incident_type, status, start_time, end_time, created_by, created_at, updated_at, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const monthDate = new Date(now.getTime() + 8 * 3600000);
    for (let offset = 6; offset >= 4; offset -= 1) {
      const date = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() - offset, 15, 4));
      for (let copy = 0; copy < 4; copy += 1) {
        const start = timestamp(new Date(date.getTime() + copy * 3600000));
        insertIncident.run('HIST-' + offset + '-' + copy, 'Historical outage', 'Poblacion', 'Unexpected', 'Closed', start, timestamp(new Date(new Date(start).getTime() + 3600000)), adminId, timestamp(now), timestamp(now), timestamp(new Date(new Date(start).getTime() + 3600000)));
      }
    }
    const recent = timestamp(new Date(now.getTime() - 5 * 86400000));
    insertIncident.run('RECENT-POB', 'Recent Poblacion outage', 'Poblacion', 'Unexpected', 'Ongoing', recent, null, adminId, timestamp(now), timestamp(now), null);
    insertIncident.run('RECENT-BAN', 'Recent Banlag outage', 'Banlag', 'Unexpected', 'Ongoing', recent, null, adminId, timestamp(now), timestamp(now), null);
    insertIncident.run('UNVERIFIED-POB', 'Unverified Poblacion report', 'Poblacion', 'Unexpected', 'Reported', recent, null, adminId, timestamp(now), timestamp(now), null);
    const restoredStart = new Date(now.getTime() - 20 * 86400000);
    const restoredEnd = new Date(restoredStart.getTime() + 5 * 3600000);
    insertIncident.run('RESTORED-POB', 'Restored Poblacion outage', 'Poblacion', 'Unexpected', 'Restored', timestamp(restoredStart), timestamp(restoredEnd), adminId, timestamp(now), timestamp(now), timestamp(restoredEnd));
    const prior = timestamp(new Date(now.getTime() - 120 * 86400000));
    insertIncident.run('PRIOR-POB', 'Previous Poblacion outage', 'Poblacion', 'Unexpected', 'Closed', prior, timestamp(new Date(new Date(prior).getTime() + 3600000)), adminId, timestamp(now), timestamp(now), timestamp(new Date(new Date(prior).getTime() + 3600000)));
    db.prepare("INSERT INTO outage_reports (report_code, reporter_id, barangay, date_time_noticed, description, status, verification_status, reported_at, updated_at) VALUES ('VPR-POB', ?, 'Poblacion', ?, 'Open local report', 'Submitted', 'Pending', ?, ?)").run(residentId, timestamp(now), timestamp(now), timestamp(now));
    db.prepare("INSERT INTO outage_reports (report_code, reporter_id, barangay, date_time_noticed, description, status, verification_status, reported_at, updated_at) VALUES ('VPR-BAN', ?, 'Banlag', ?, 'Other barangay report', 'Submitted', 'Pending', ?, ?)").run(otherResidentId, timestamp(now), timestamp(now), timestamp(now));
    const teamId = Number(db.prepare("INSERT INTO repair_teams (team_code, name, lead_technician, created_at) VALUES ('TEAM-TEST', 'Test team', 'Test lead', ?)").run(timestamp(now)).lastInsertRowid);
    const dispatched = new Date(now.getTime() - 4 * 3600000);
    const arrived = new Date(now.getTime() - 2 * 3600000);
    db.prepare("INSERT INTO repair_assignments (assignment_code, team_id, assigned_by, status, target_barangay, dispatched_at, arrived_at, updated_at) VALUES ('ASG-TEST', ?, ?, 'Arrived On Site', 'Poblacion', ?, ?, ?)").run(teamId, adminId, timestamp(dispatched), timestamp(arrived), timestamp(arrived));
    console.log(JSON.stringify({ adminId, residentId }));
    db.close();
  `;
  const seeded = spawnSync(process.execPath, ['-e', seedScript], {
    cwd: runtimeRoot,
    env: { ...process.env, NODE_PATH: process.env.NODE_PATH || path.join(ROOT, 'node_modules') },
    encoding: 'utf8',
    timeout: TEST_TIMEOUT_MS,
  });
  assert.equal(seeded.status, 0, seeded.stderr || seeded.stdout);

  const port = await getAvailablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, ['server/index.js'], {
    cwd: runtimeRoot,
    env: { ...process.env, PORT: String(port), NODE_PATH: process.env.NODE_PATH || path.join(ROOT, 'node_modules') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProcess.stdout.setEncoding('utf8').on('data', (chunk) => { serverOutput += chunk; });
  serverProcess.stderr.setEncoding('utf8').on('data', (chunk) => { serverOutput += chunk; });
  const deadline = Date.now() + TEST_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error(`Test server exited before becoming healthy.\n${serverOutput}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (serverProcess.exitCode !== null) throw new Error(`Test server exited before becoming healthy.\n${serverOutput}`);
  residentCookie = 'pw_session=resident-test-token';
  adminCookie = 'pw_session=admin-test-token';
});

after(async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill();
    await new Promise((resolve) => serverProcess.once('exit', resolve));
  }
  if (testDirectory && fs.existsSync(testDirectory)) fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('insights are authenticated, barangay-scoped for residents, and explain the baseline', { timeout: TEST_TIMEOUT_MS }, async () => {
  const anonymous = await fetch(`${baseUrl}/api/analytics/insights`);
  assert.equal(anonymous.status, 401);

  const residentResponse = await fetch(`${baseUrl}/api/analytics/insights`, { headers: { cookie: residentCookie } });
  assert.equal(residentResponse.status, 200);
  const resident = await residentResponse.json();
  assert.deepEqual(resident.scope, { type: 'barangay', name: 'Poblacion' });
  assert.equal(resident.current.unexpected_incidents, 2);
  assert.ok(resident.previous.unexpected_incidents >= 1);
  assert.equal(resident.current.active_incidents, 2);
  assert.equal(resident.current.open_unlinked_reports, 1);
  assert.equal(resident.current.median_restoration_hours, 5);
  assert.equal(resident.current.restoration_sample_size, 1);
  assert.equal(resident.current.median_dispatch_response_hours, 2);
  assert.equal(resident.current.response_sample_size, 1);
  assert.deepEqual(resident.hotspots, [{ barangay: 'Poblacion', incidents: 2 }]);
  assert.equal(resident.projection.status, 'available');
  assert.ok(resident.projection.sample_incidents >= 12);
  assert.ok(resident.projection.sample_months >= 3);

  const adminResponse = await fetch(`${baseUrl}/api/analytics/insights`, { headers: { cookie: adminCookie } });
  assert.equal(adminResponse.status, 200);
  const admin = await adminResponse.json();
  assert.deepEqual(admin.scope, { type: 'city', name: 'Valencia City' });
  assert.equal(admin.current.unexpected_incidents, 3);
  assert.ok(admin.hotspots.some((item) => item.barangay === 'Banlag'));
});
