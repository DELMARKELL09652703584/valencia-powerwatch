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
  testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'valencia-powerwatch-map-test-'));
  const runtimeRoot = path.join(testDirectory, 'runtime');
  fs.mkdirSync(path.join(runtimeRoot, 'data'), { recursive: true });
  fs.mkdirSync(path.join(runtimeRoot, 'uploads'), { recursive: true });
  fs.writeFileSync(path.join(runtimeRoot, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  for (const directory of ['server', 'app', 'assets', 'vendor']) {
    const source = path.join(ROOT, directory);
    if (fs.existsSync(source)) fs.cpSync(source, path.join(runtimeRoot, directory), { recursive: true });
  }
  const port = await getAvailablePort();
  baseUrl = `http://127.0.0.1:${port}`;

  serverProcess = spawn(process.execPath, ['server/index.js'], {
    cwd: runtimeRoot,
    env: {
      ...process.env,
      PORT: String(port),
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
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Test server did not become healthy.\n${serverOutput}`);
});

after(() => {
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill();
  if (testDirectory && fs.existsSync(testDirectory)) fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('map reports include incident linkage and mapped location data', { timeout: TEST_TIMEOUT_MS }, async () => {
  const email = `map-test-${Date.now()}@example.test`;
  const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Map Test Resident',
      email,
      password: 'test-password-123',
      barangay: 'Poblacion',
    }),
  });
  assert.equal(registerResponse.status, 200);
  const cookie = registerResponse.headers.get('set-cookie')?.split(';', 1)[0];
  assert.ok(cookie);

  const form = new FormData();
  for (const [key, value] of Object.entries({
    location: 'Near the community hall',
    latitude: '7.906',
    longitude: '125.094',
    location_source: 'map_pin',
    location_confirmed: 'true',
    barangay: 'Poblacion',
    purok: 'Purok 1',
    date_time_noticed: new Date().toISOString(),
    description: 'Map integration test report.',
    possible_outage_type: 'Unexpected',
  })) {
    form.append(key, value);
  }
  const reportResponse = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: { cookie },
    body: form,
  });
  assert.equal(reportResponse.status, 201);
  const { report } = await reportResponse.json();

  const mapResponse = await fetch(`${baseUrl}/api/reports/map`, { headers: { cookie } });
  assert.equal(mapResponse.status, 200);
  const { reports } = await mapResponse.json();
  const mappedReport = reports.find((item) => item.id === report.id);
  assert.ok(mappedReport, 'the open report should be available to map views');
  assert.equal(mappedReport.incident_id, null);
  assert.equal(mappedReport.latitude, 7.906);
  assert.equal(mappedReport.longitude, 125.094);
  assert.equal(mappedReport.location_confirmed, 1);
});

test('exact-pin reports require confirmation and out-of-area reverse lookup does not guess', { timeout: TEST_TIMEOUT_MS }, async () => {
  const email = `location-test-${Date.now()}@example.test`;
  const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Location Confirmation Test',
      email,
      password: 'test-password-123',
      barangay: 'Poblacion',
    }),
  });
  assert.equal(registerResponse.status, 200);
  const cookie = registerResponse.headers.get('set-cookie')?.split(';', 1)[0];
  assert.ok(cookie);

  const unconfirmed = new FormData();
  for (const [key, value] of Object.entries({
    location: 'Map pin',
    latitude: '7.906',
    longitude: '125.094',
    location_source: 'map_pin',
    location_confirmed: 'false',
    barangay: 'Poblacion',
    purok: 'Purok 1',
    date_time_noticed: new Date().toISOString(),
    description: 'Unconfirmed exact-pin submission.',
    possible_outage_type: 'Unexpected',
  })) unconfirmed.append(key, value);
  const rejectedReport = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: { cookie },
    body: unconfirmed,
  });
  assert.equal(rejectedReport.status, 400);
  assert.match((await rejectedReport.json()).error, /confirm the report location/i);

  const outsideResponse = await fetch(`${baseUrl}/api/barangays/reverse-geocode?lat=7.5&lon=125.1`, { headers: { cookie } });
  assert.equal(outsideResponse.status, 200);
  assert.deepEqual(await outsideResponse.json(), {
    status: 'outside_city',
    barangay: null,
    provider: 'OpenStreetMap Nominatim',
  });

  const invalidResponse = await fetch(`${baseUrl}/api/barangays/reverse-geocode?lat=invalid&lon=125.1`, { headers: { cookie } });
  assert.equal(invalidResponse.status, 400);
});
