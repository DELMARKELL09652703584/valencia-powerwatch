const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
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
let unrelatedResidentCookie;
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

const cookieFrom = (response) => response.headers.get('set-cookie')?.split(';', 1)[0];

const submitReport = async (cookie, description) => {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    location: 'Brgy. Poblacion, Valencia City (7.906, 125.094)',
    latitude: '7.906',
    longitude: '125.094',
    location_source: 'map_pin',
    barangay: 'Poblacion',
    purok: 'Functional audit test site',
    date_time_noticed: new Date().toISOString(),
    description,
    possible_outage_type: 'Line Fault',
  })) form.append(key, value);

  const response = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: { cookie },
    body: form,
  });
  assert.equal(response.status, 201);
  return (await response.json()).report;
};

const getReport = async (cookie, reportId) => {
  const response = await fetch(`${baseUrl}/api/reports/${reportId}`, { headers: { cookie } });
  assert.equal(response.status, 200);
  return (await response.json()).report;
};

before(async () => {
  testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'valencia-powerwatch-workflow-test-'));
  const runtimeRoot = path.join(testDirectory, 'runtime');
  fs.mkdirSync(path.join(runtimeRoot, 'data'), { recursive: true });
  fs.mkdirSync(path.join(runtimeRoot, 'uploads'), { recursive: true });
  fs.writeFileSync(path.join(runtimeRoot, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  fs.cpSync(path.join(ROOT, 'server'), path.join(runtimeRoot, 'server'), { recursive: true });

  const port = await getAvailablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, ['server/index.js'], {
    cwd: runtimeRoot,
    env: {
      ...process.env,
      PORT: String(port),
      POWERWATCH_DATA_DIR: path.join(runtimeRoot, 'data'),
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      FACEBOOK_CLIENT_ID: '',
      FACEBOOK_CLIENT_SECRET: '',
      NODE_PATH: process.env.NODE_PATH || path.join(ROOT, 'node_modules'),
    },
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

  for (const [email, full_name] of [
    [`linked-${Date.now()}@example.test`, 'Linked Report Resident'],
    [`unlinked-${Date.now()}@example.test`, 'Unlinked Report Resident'],
  ]) {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ full_name, email, password: 'test-password-123', barangay: 'Poblacion' }),
    });
    assert.equal(response.status, 200);
    if (full_name.startsWith('Linked')) residentCookie = cookieFrom(response);
    else unrelatedResidentCookie = cookieFrom(response);
  }

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@powerwatch.ph', password: 'admin123' }),
  });
  assert.equal(loginResponse.status, 200);
  adminCookie = cookieFrom(loginResponse);
  assert.ok(residentCookie && unrelatedResidentCookie && adminCookie);
});

after(async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill();
    await new Promise((resolve) => serverProcess.once('exit', resolve));
  }
  if (testDirectory && fs.existsSync(testDirectory)) fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('resident credentials still work after logout terminates the session', { timeout: TEST_TIMEOUT_MS }, async () => {
  const email = `returning-resident-${Date.now()}@example.test`;
  const password = 'returning-resident-password';
  const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Returning Resident',
      email,
      password,
      barangay: 'Poblacion',
    }),
  });
  assert.equal(registerResponse.status, 200);
  const initialCookie = cookieFrom(registerResponse);
  assert.ok(initialCookie);

  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { cookie: initialCookie },
  });
  assert.equal(logoutResponse.status, 200);
  const expiredSession = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: initialCookie } });
  assert.equal(expiredSession.status, 401);

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(loginResponse.status, 200);
  const newCookie = cookieFrom(loginResponse);
  assert.ok(newCookie);
  const activeSession = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: newCookie } });
  assert.equal(activeSession.status, 200);
  assert.equal((await activeSession.json()).user.email, email);
});

test('unverified social-login claims cannot create accounts or sessions', { timeout: TEST_TIMEOUT_MS }, async () => {
  const authConfigResponse = await fetch(`${baseUrl}/api/auth/demo`);
  assert.equal(authConfigResponse.status, 200);
  const authConfig = await authConfigResponse.json();
  assert.equal(authConfig.oauthProviders.googleLive, false);
  assert.equal(authConfig.oauthProviders.facebookLive, false);
  assert.equal(authConfig.passwordRecoveryEnabled, false);

  const unavailableProviderResponses = await Promise.all([
    fetch(`${baseUrl}/api/auth/oauth/google`),
    fetch(`${baseUrl}/api/auth/oauth/facebook`),
  ]);
  assert.deepEqual(unavailableProviderResponses.map((response) => response.status), [503, 503]);

  const response = await fetch(`${baseUrl}/api/auth/oauth/social-login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      provider: 'google',
      email: 'admin@powerwatch.ph',
      name: 'Spoofed Administrator',
      provider_user_id: 'attacker-controlled-id',
    }),
  });
  assert.equal(response.status, 410);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.match((await response.json()).error, /official Google or Facebook authorization flow/);

  const sessionResponse = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(sessionResponse.status, 401);
});

test('feedback is validated, stored, and included in staff analytics', { timeout: TEST_TIMEOUT_MS }, async () => {
  const invalidRatingResponse = await fetch(`${baseUrl}/api/feedback`, {
    method: 'POST',
    headers: { cookie: residentCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ rating: 6, comments: 'Outside the allowed range.' }),
  });
  assert.equal(invalidRatingResponse.status, 400);

  const feedbackResponse = await fetch(`${baseUrl}/api/feedback`, {
    method: 'POST',
    headers: { cookie: residentCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ rating: 4, feedback_text: 'The report flow was clear.' }),
  });
  const feedbackResult = await feedbackResponse.json();
  assert.equal(feedbackResponse.status, 201, `${JSON.stringify(feedbackResult)}\n${serverOutput}`);
  assert.equal(feedbackResult.success, true);

  const summaryResponse = await fetch(`${baseUrl}/api/feedback/summary`, { headers: { cookie: adminCookie } });
  assert.equal(summaryResponse.status, 200);
  const summary = await summaryResponse.json();
  assert.ok(summary.total >= 1);
  assert.ok(summary.recent.some((item) => item.feedback_text === 'The report flow was clear.' && item.rating === 4));

  const report = await submitReport(residentCookie, 'Feedback ownership and restoration workflow test.');
  const resolveResponse = await fetch(`${baseUrl}/api/reports/${report.id}/status`, {
    method: 'PUT',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'Resolved' }),
  });
  assert.equal(resolveResponse.status, 409, 'resolution requires a completed assignment and Admin review notes');

  const unauthorizedResponse = await fetch(`${baseUrl}/api/feedback`, {
    method: 'POST',
    headers: { cookie: unrelatedResidentCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ report_id: report.id, rating: 5, restoration_confirmed: 1 }),
  });
  assert.equal(unauthorizedResponse.status, 403);

  const restorationFeedbackResponse = await fetch(`${baseUrl}/api/feedback`, {
    method: 'POST',
    headers: { cookie: residentCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ report_id: report.id, rating: 5, restoration_confirmed: '0' }),
  });
  assert.equal(restorationFeedbackResponse.status, 400, 'residents cannot submit restoration feedback before resolution');
  const updatedSummary = await (await fetch(`${baseUrl}/api/feedback/summary`, { headers: { cookie: adminCookie } })).json();
  assert.ok(!updatedSummary.recent.some((item) => item.report_id === report.id));
});

test('grouped incidents do not bypass report-level resolution review', { timeout: TEST_TIMEOUT_MS }, async () => {
  const linkedReport = await submitReport(residentCookie, 'Linked incident lifecycle test.');
  const secondLinkedReport = await submitReport(unrelatedResidentCookie, 'Second report grouped into the same incident.');
  const unrelatedReport = await submitReport(unrelatedResidentCookie, 'Unrelated report in the same barangay.');

  const createResponse = await fetch(`${baseUrl}/api/incidents`, {
    method: 'POST',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Functional audit linked outage',
      barangay: 'Poblacion',
      start_time: new Date().toISOString(),
      outage_type: 'Line Fault',
      incident_type: 'Unexpected',
      description: 'Isolated test incident grouping multiple resident reports.',
      related_report_ids: [linkedReport.id, secondLinkedReport.id],
      initial_status: 'Verified',
      priority: 'Critical',
    }),
  });
  assert.equal(createResponse.status, 201);
  const { incident } = await createResponse.json();
  assert.equal(incident.status, 'Verified');
  assert.equal(incident.priority, 'Critical');
  const convertedReport = await getReport(adminCookie, linkedReport.id);
  assert.equal(convertedReport.status, 'Verified');
  assert.equal(convertedReport.verification_status, 'Verified');
  assert.equal(Number(convertedReport.incident_id), Number(incident.id));
  assert.equal(convertedReport.incident.incident_code, incident.incident_code);
  assert.equal((await getReport(adminCookie, secondLinkedReport.id)).status, 'Verified');

  const ongoingResponse = await fetch(`${baseUrl}/api/incidents/${incident.id}/status`, {
    method: 'PUT',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'Ongoing' }),
  });
  assert.equal(ongoingResponse.status, 200);
  assert.equal((await getReport(adminCookie, linkedReport.id)).status, 'Verified');
  assert.equal((await getReport(adminCookie, secondLinkedReport.id)).status, 'Verified');
  assert.equal((await getReport(adminCookie, unrelatedReport.id)).status, 'Submitted');

  const [telemetryResponse, analyticsResponse] = await Promise.all([
    fetch(`${baseUrl}/api/admin/telemetry-heartbeat`, { headers: { cookie: adminCookie } }),
    fetch(`${baseUrl}/api/analytics/dashboard`, { headers: { cookie: adminCookie } }),
  ]);
  assert.equal(telemetryResponse.status, 200);
  assert.equal(analyticsResponse.status, 200);
  const { metrics } = await telemetryResponse.json();
  const { stats } = await analyticsResponse.json();
  assert.equal(metrics.activeIncidents, stats.ongoing);

  const restoreResponse = await fetch(`${baseUrl}/api/incidents/${incident.id}/status`, {
    method: 'PUT',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'Restored', remarks: 'Admin review attempted before individual report resolution.' }),
  });
  assert.equal(restoreResponse.status, 409);
  const closeResponse = await fetch(`${baseUrl}/api/incidents/${incident.id}/status`, {
    method: 'PUT',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'Closed' }),
  });
  assert.equal(closeResponse.status, 409);
  assert.equal((await getReport(adminCookie, linkedReport.id)).status, 'Verified');
  assert.equal((await getReport(adminCookie, secondLinkedReport.id)).status, 'Verified');
  assert.equal((await getReport(adminCookie, unrelatedReport.id)).status, 'Submitted');
});
