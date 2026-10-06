const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');
let serverProcess;
let serverOutput = '';
let baseUrl;
let testDirectory;

const getAvailablePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close((error) => error ? reject(error) : resolve(port));
  });
});

const waitForHealth = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Test server exited early.\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Test server did not become healthy.\n${serverOutput}`);
};

const createResidentSession = async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Chatbot Test Resident',
      email: `chatbot-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`,
      password: 'test-password-123',
      barangay: 'Poblacion',
    }),
  });
  assert.equal(response.status, 200, await response.text());
  return response.headers.get('set-cookie')?.split(';', 1)[0];
};

const createResidentReport = async (cookie) => {
  const form = new FormData();
  const fields = {
    location: 'Near the community hall',
    latitude: '7.906',
    longitude: '125.094',
    location_source: 'map_pin',
    barangay: 'Poblacion',
    date_time_noticed: new Date().toISOString(),
    description: 'A test interruption near the community hall.',
    affected_area: 'Purok 1',
    purok: 'Purok 1',
    possible_outage_type: 'Unexpected',
  };
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  const response = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: { cookie },
    body: form,
  });
  const result = await response.json();
  assert.equal(response.status, 201, JSON.stringify(result));
  return result;
};

const ask = (cookie, question) => fetch(`${baseUrl}/api/chatbot`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  body: JSON.stringify({ question }),
});

before(async () => {
  testDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'powerwatch-chatbot-'));
  const port = await getAvailablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), POWERWATCH_DATA_DIR: testDirectory },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProcess.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
  serverProcess.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });
  await waitForHealth();
});

after(async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill();
    await new Promise((resolve) => serverProcess.once('exit', resolve));
  }
  if (testDirectory) await fs.rm(testDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test('chatbot endpoint requires an authenticated resident account', async () => {
  const response = await ask(null, 'How do I report an outage?');
  assert.equal(response.status, 401);
});

test('chatbot gives in-app feature guidance with navigation actions', async () => {
  const cookie = await createResidentSession();
  const response = await ask(cookie, 'How do I report an outage?');
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.match(result.answer, /GPS or a map pin/i);
  assert.equal(result.source, 'PowerWatch help guide');
  assert.deepEqual(result.action, { label: 'Open report form', tab: 'report' });
});

test('chatbot explicitly distinguishes live system data from unknown information', async () => {
  const cookie = await createResidentSession();
  const outageResponse = await ask(cookie, 'Are there current outages right now?');
  const outage = await outageResponse.json();
  assert.equal(outage.source, 'live-system-data');
  assert.match(outage.answer, /no active outage incidents recorded/i);

  const unknownResponse = await ask(cookie, 'What will the weather be in 2040?');
  const unknown = await unknownResponse.json();
  assert.match(unknown.answer, /do not have reliable information/i);
});

test('chatbot reports only the signed-in resident’s own report status', async () => {
  const ownerCookie = await createResidentSession();
  const report = await createResidentReport(ownerCookie);
  const ownerResponse = await ask(ownerCookie, 'What is my latest report?');
  const ownerAnswer = await ownerResponse.json();
  assert.match(ownerAnswer.answer, new RegExp(report.report.report_code));
  assert.equal(ownerAnswer.source, 'your-report-records');

  const otherCookie = await createResidentSession();
  const otherResponse = await ask(otherCookie, `What is my report ${report.report.report_code}?`);
  const otherAnswer = await otherResponse.json();
  assert.match(otherAnswer.answer, /could not find report/i);
});

test('chatbot validates empty and oversized questions', async () => {
  const cookie = await createResidentSession();
  const emptyResponse = await ask(cookie, '   ');
  assert.equal(emptyResponse.status, 400);

  const oversizedResponse = await ask(cookie, 'x'.repeat(3000));
  assert.equal(oversizedResponse.status, 413);
});

test('chatbot assets are loaded only by the User Portal', async () => {
  const [community, admin, script] = await Promise.all([
    fetch(`${baseUrl}/community`).then((response) => response.text()),
    fetch(`${baseUrl}/admin`).then((response) => response.text()),
    fetch(`${baseUrl}/app/chatbot.js`).then((response) => response.text()),
  ]);
  assert.match(community, /\/app\/chatbot\.js\?v=1/);
  assert.doesNotMatch(admin, /\/app\/chatbot\.js/);
  assert.match(script, /\/api\/chatbot/);
});
