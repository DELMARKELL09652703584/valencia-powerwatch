const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const TEST_TIMEOUT_MS = 30_000;

let runtimeDirectory;
let dataDirectory;
let mockStorage;
let port;
let baseUrl;
let serverProcess;
let serverOutput = '';

const getAvailablePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close((error) => error ? reject(error) : resolve(address.port));
  });
});

const startServer = async () => {
  const bootstrap = `
    const Module = require('node:module');
    const originalLoad = Module._load;
    Module._load = function(request, parent, isMain) {
      if (request === 'pg') return originalLoad(process.env.NEON_MOCK_MODULE, parent, isMain);
      return originalLoad(request, parent, isMain);
    };
    require('./server/index');
  `;
  serverOutput = '';
  serverProcess = spawn(process.execPath, ['-e', bootstrap], {
    cwd: runtimeDirectory,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      DATABASE_URL: '',
      POWERWATCH_DATA_DIR: dataDirectory,
      POWERWATCH_UPLOAD_DIR: path.join(runtimeDirectory, 'uploads'),
      NEON_DATABASE_URL: 'postgresql://mock:mock@localhost/mock',
      NEON_MOCK_STORAGE: mockStorage,
      NEON_MOCK_MODULE: path.join(ROOT, 'tests', 'fixtures', 'neon-pg-mock.js'),
      PERSISTENT_AUTH_REQUIRED: 'true',
      NODE_PATH: path.join(ROOT, 'node_modules'),
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
  throw new Error(`Neon-backed test server did not become healthy.\n${serverOutput}`);
};

const stopServer = async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill();
    await new Promise((resolve) => serverProcess.once('exit', resolve));
  }
  serverProcess = null;
};

const postJson = async (route, body, cookie) => {
  const response = await fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
};

const cookieFrom = (response) => response.headers.get('set-cookie')?.split(';', 1)[0];

before(async () => {
  runtimeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'powerwatch-neon-auth-test-'));
  dataDirectory = path.join(runtimeDirectory, 'data');
  mockStorage = path.join(runtimeDirectory, 'neon-store.json');
  fs.mkdirSync(dataDirectory, { recursive: true });
  fs.mkdirSync(path.join(runtimeDirectory, 'uploads'), { recursive: true });
  fs.writeFileSync(path.join(runtimeDirectory, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  fs.cpSync(path.join(ROOT, 'server'), path.join(runtimeDirectory, 'server'), { recursive: true });
  port = await getAvailablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer();
});

after(async () => {
  await stopServer();
  if (runtimeDirectory && fs.existsSync(runtimeDirectory)) {
    fs.rmSync(runtimeDirectory, { recursive: true, force: true });
  }
});

test('resident can register, logout, log in again after restart, and avoid duplicate registration', {
  timeout: TEST_TIMEOUT_MS,
}, async () => {
  const healthResponse = await fetch(`${baseUrl}/api/health`);
  const health = await healthResponse.json();
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(health.residentAuth, {
    persistentRequired: true,
    persistentConfigured: true,
  });

  const email = `neon-resident-${Date.now()}@example.test`;
  const password = 'neon-resident-password';

  const registration = await postJson('/api/auth/register', {
    full_name: 'Neon Persistent Resident',
    email,
    password,
    barangay: 'Poblacion',
  });
  assert.equal(registration.response.status, 200);
  const initialCookie = cookieFrom(registration.response);
  assert.ok(initialCookie);

  const firstLogout = await postJson('/api/auth/logout', {}, initialCookie);
  assert.equal(firstLogout.response.status, 200);

  const firstLogin = await postJson('/api/auth/login', { email, password, portal: 'community' });
  assert.equal(firstLogin.response.status, 200);
  const firstLoginCookie = cookieFrom(firstLogin.response);
  assert.ok(firstLoginCookie);

  await stopServer();
  for (const filename of ['powerwatch.db', 'powerwatch.db-shm', 'powerwatch.db-wal']) {
    fs.rmSync(path.join(dataDirectory, filename), { force: true });
  }
  await startServer();

  const secondLogin = await postJson('/api/auth/login', { email, password, portal: 'community' });
  assert.equal(secondLogin.response.status, 200);
  const secondLoginCookie = cookieFrom(secondLogin.response);
  assert.ok(secondLoginCookie);

  const meResponse = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: secondLoginCookie } });
  assert.equal(meResponse.status, 200);
  assert.equal((await meResponse.json()).user.email, email);

  const duplicate = await postJson('/api/auth/register', {
    full_name: 'Duplicate Resident',
    email,
    password,
  });
  assert.equal(duplicate.response.status, 409);

  const secondLogout = await postJson('/api/auth/logout', {}, secondLoginCookie);
  assert.equal(secondLogout.response.status, 200);
  const returningLogin = await postJson('/api/auth/login', { email, password, portal: 'community' });
  assert.equal(returningLogin.response.status, 200);
});
