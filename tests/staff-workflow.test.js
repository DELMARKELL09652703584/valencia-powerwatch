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
let adminCookie;
let adminLoginUser;
let staffCookie;
let staffLoginUser;
let unassignedCookie;
let residentCookie;
let residentLoginUser;
let portalLoginEmails = {};
let assignmentId;
let evidenceId;
let teamId;
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

const jsonRequest = (url, cookie, method = 'GET', body) => fetch(`${baseUrl}${url}`, {
  method,
  headers: {
    ...(cookie ? { cookie } : {}),
    ...(body ? { 'content-type': 'application/json' } : {}),
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

const createPersonnel = async (name, email) => {
  const response = await jsonRequest('/api/admin/users', adminCookie, 'POST', {
    full_name: name,
    email,
    password: 'field-password-123',
    role: 'personnel',
  });
  assert.equal(response.status, 201);
  return (await response.json()).user;
};

const login = async (email, password, portal) => {
  const response = await jsonRequest('/api/auth/login', '', 'POST', { email, password, portal });
  assert.equal(response.status, 200);
  const result = await response.json();
  return { cookie: cookieFrom(response), user: result.user };
};

const submitReport = async () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    location: 'Brgy. Poblacion, Valencia City',
    latitude: '7.906',
    longitude: '125.094',
    location_source: 'map_pin',
    barangay: 'Poblacion',
    purok: 'Field Workflow Test Site',
    date_time_noticed: new Date().toISOString(),
    description: 'A fallen line caused a power interruption near the test site.',
    possible_outage_type: 'Line Fault',
  })) form.append(key, value);
  form.append('photoData', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/5QAAAABJRU5ErkJggg==');
  const response = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: { cookie: residentCookie },
    body: form,
  });
  assert.equal(response.status, 201);
  return (await response.json()).report;
};

before(async () => {
  testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'valencia-powerwatch-staff-test-'));
  const runtimeRoot = path.join(testDirectory, 'runtime');
  fs.mkdirSync(path.join(runtimeRoot, 'data'), { recursive: true });
  fs.mkdirSync(path.join(runtimeRoot, 'uploads'), { recursive: true });
  fs.mkdirSync(path.join(runtimeRoot, 'app'), { recursive: true });
  fs.mkdirSync(path.join(runtimeRoot, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(runtimeRoot, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  fs.cpSync(path.join(ROOT, 'server'), path.join(runtimeRoot, 'server'), { recursive: true });
  for (const file of ['community.html', 'admin.html', 'staff.html', 'staff-manifest.json', 'staff-sw.js']) {
    fs.copyFileSync(path.join(ROOT, file), path.join(runtimeRoot, file));
  }
  for (const file of ['staff.css', 'staff.js']) {
    fs.copyFileSync(path.join(ROOT, 'app', file), path.join(runtimeRoot, 'app', file));
  }
  fs.copyFileSync(path.join(ROOT, 'assets', 'powerwatch-logo.svg'), path.join(runtimeRoot, 'assets', 'powerwatch-logo.svg'));
  for (const file of ['powerwatch-icon-180.png', 'powerwatch-icon-192.png', 'powerwatch-icon-512.png', 'powerwatch-icon-maskable-512.png']) {
    fs.copyFileSync(path.join(ROOT, 'assets', file), path.join(runtimeRoot, 'assets', file));
  }

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
  const adminLogin = await jsonRequest('/api/auth/login', '', 'POST', {
    email: 'admin@powerwatch.ph',
    password: 'admin123',
    portal: 'admin',
  });
  const adminLoginResult = await adminLogin.json();
  assert.equal(adminLogin.status, 200, `Could not authenticate test admin: ${JSON.stringify(adminLoginResult)}\n${serverOutput}`);
  adminLoginUser = adminLoginResult.user;
  adminCookie = cookieFrom(adminLogin);
  const resident = await jsonRequest('/api/auth/register', '', 'POST', {
    full_name: 'Assigned Incident Resident',
    email: `staff-test-${Date.now()}@example.test`,
    password: 'resident-password-123',
    barangay: 'Poblacion',
  });
  assert.equal(resident.status, 200);
  const residentUser = (await resident.json()).user;
  residentCookie = cookieFrom(resident);
  portalLoginEmails.resident = residentUser.email;

  const teamResponse = await jsonRequest('/api/repair-teams', adminCookie, 'POST', {
    name: 'Test Field Crew',
    lead_technician: 'Test Crew Lead',
    vehicle_type: 'Service Vehicle',
    base_station: 'Poblacion',
  });
  assert.equal(teamResponse.status, 201);
  const team = (await teamResponse.json()).team;
  teamId = team.id;

  const staff = await createPersonnel('Assigned Field Staff', `assigned-field-${Date.now()}@example.test`);
  const unassigned = await createPersonnel('Unassigned Field Staff', `unassigned-field-${Date.now()}@example.test`);
  const membershipResponse = await jsonRequest(`/api/admin/staff-memberships/${staff.id}`, adminCookie, 'PUT', {
    team_ids: [team.id],
  });
  assert.equal(membershipResponse.status, 200);

  const report = await submitReport();
  const dispatchResponse = await jsonRequest('/api/repair/assign', adminCookie, 'POST', {
    team_id: team.id,
    report_id: report.id,
    dispatch_notes: 'Bring protective equipment and confirm the line is isolated.',
    priority: 'Critical',
  });
  assert.equal(dispatchResponse.status, 201);
  assignmentId = (await dispatchResponse.json()).assignment.id;
  portalLoginEmails.staff = staff.email;
  const staffLogin = await login(staff.email, 'field-password-123', 'staff');
  staffCookie = staffLogin.cookie;
  staffLoginUser = staffLogin.user;
  unassignedCookie = (await login(unassigned.email, 'field-password-123')).cookie;
  const residentLogin = await login(portalLoginEmails.resident, 'resident-password-123', 'community');
  residentCookie = residentLogin.cookie;
  residentLoginUser = residentLogin.user;
});

after(async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill();
    await new Promise((resolve) => serverProcess.once('exit', resolve));
  }
  if (testDirectory && fs.existsSync(testDirectory)) fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('Staff PWA has an isolated install route, manifest, and service-worker scope', { timeout: TEST_TIMEOUT_MS }, async () => {
  const [pageResponse, manifestResponse, workerResponse, cssResponse, jsResponse, iconResponses] = await Promise.all([
    fetch(`${baseUrl}/staff`),
    fetch(`${baseUrl}/staff-manifest.json`),
    fetch(`${baseUrl}/staff-sw.js`),
    fetch(`${baseUrl}/app/staff.css?v=4`),
    fetch(`${baseUrl}/app/staff.js?v=3`),
    Promise.all([
      'powerwatch-icon-192.png',
      'powerwatch-icon-512.png',
      'powerwatch-icon-maskable-512.png',
    ].map((icon) => fetch(`${baseUrl}/assets/${icon}`))),
  ]);
  assert.equal(pageResponse.status, 200);
  assert.match(await pageResponse.text(), /Field Staff/);
  assert.equal(manifestResponse.status, 200);
  const manifest = await manifestResponse.json();
  assert.equal(manifest.start_url, '/staff');
  assert.equal(manifest.scope, '/staff');
  assert.equal(manifest.display, 'standalone');
  assert.equal(workerResponse.status, 200);
  assert.equal(workerResponse.headers.get('service-worker-allowed'), '/staff');
  assert.equal(cssResponse.status, 200);
  assert.equal(jsResponse.status, 200);
  assert.ok(iconResponses.every((response) => response.status === 200));
  const staffStyles = await cssResponse.text();
  assert.match(staffStyles, /width: min\(100%, 430px\)/);
  assert.match(staffStyles, /@media \(min-width: 560px\)/);
  assert.match(staffStyles, /place-items: center/);
  assert.match(staffStyles, /grid-template-columns: repeat\(2, minmax\(0,1fr\)\)/);
  assert.doesNotMatch(staffStyles, /grid-template-columns: repeat\(4, minmax\(0,1fr\)\)/);
  assert.match(staffStyles, /staff-stage-progress/);
  assert.match(staffStyles, /staff-upload-drop/);
  const workerSource = await workerResponse.text();
  const shellAssets = workerSource.match(/const STAFF_SHELL = \[[\s\S]*?\];/)?.[0] || '';
  assert.doesNotMatch(shellAssets, /\/api\/|\/admin/);
});

test('verified database roles assign each account its own portal after login', { timeout: TEST_TIMEOUT_MS }, async () => {
  assert.equal(adminLoginUser.role, 'administrator');
  assert.equal(adminLoginUser.portal_path, '/admin');
  assert.equal(staffLoginUser.role, 'personnel');
  assert.equal(staffLoginUser.portal_path, '/staff');
  assert.equal(residentLoginUser.role, 'resident');
  assert.equal(residentLoginUser.portal_path, '/community');
  const [adminSession, staffSession, residentSession] = await Promise.all([
    jsonRequest('/api/auth/me', adminCookie),
    jsonRequest('/api/auth/me', staffCookie),
    jsonRequest('/api/auth/me', residentCookie),
  ]);
  assert.equal((await adminSession.json()).user.portal_path, '/admin');
  assert.equal((await staffSession.json()).user.portal_path, '/staff');
  assert.equal((await residentSession.json()).user.portal_path, '/community');
  assert.equal((await jsonRequest('/api/admin/users', adminCookie)).status, 200);
  assert.equal((await jsonRequest('/api/admin/users', staffCookie)).status, 403);
  assert.equal((await jsonRequest('/api/admin/users', residentCookie)).status, 403);

  const mismatchedPortalAttempts = await Promise.all([
    jsonRequest('/api/auth/login', '', 'POST', { email: portalLoginEmails.resident, password: 'resident-password-123', portal: 'admin' }),
    jsonRequest('/api/auth/login', '', 'POST', { email: portalLoginEmails.resident, password: 'resident-password-123', portal: 'staff' }),
    jsonRequest('/api/auth/login', '', 'POST', { email: portalLoginEmails.staff, password: 'field-password-123', portal: 'admin' }),
    jsonRequest('/api/auth/login', '', 'POST', { email: portalLoginEmails.staff, password: 'field-password-123', portal: 'community' }),
    jsonRequest('/api/auth/login', '', 'POST', { email: 'admin@powerwatch.ph', password: 'admin123', portal: 'staff' }),
    jsonRequest('/api/auth/login', '', 'POST', { email: 'admin@powerwatch.ph', password: 'admin123', portal: 'community' }),
  ]);
  assert.ok(mismatchedPortalAttempts.every((response) => response.status === 403));

  const portalPages = await Promise.all([
    fetch(`${baseUrl}/community`, { headers: { cookie: adminCookie } }),
    fetch(`${baseUrl}/staff`, { headers: { cookie: residentCookie } }),
    fetch(`${baseUrl}/admin`, { headers: { cookie: staffCookie } }),
  ]);
  assert.ok(portalPages.every((response) => response.status === 200));
  assert.match(await portalPages[0].text(), /Community User App/);
  assert.match(await portalPages[1].text(), /Field Staff/);
  assert.match(await portalPages[2].text(), /Admin Web Portal/);

  const adminBoot = fs.readFileSync(path.join(ROOT, 'app', 'main.js'), 'utf8');
  const staffApp = fs.readFileSync(path.join(ROOT, 'app', 'staff.js'), 'utf8');
  assert.match(staffApp, /Acknowledged: 'Accept assignment'/);
  assert.match(staffApp, /data-action="advance-stage"/);
  assert.match(staffApp, /data-action="read-notification"/);
  assert.match(staffApp, /data-action="read-all-notifications"/);
  assert.match(staffApp, /data-action="open-history"/);
  assert.match(staffApp, /renderStageProgress\(assignment\)/);
  assert.doesNotMatch(adminBoot, /window\.location\.replace\(user\.portal_path\)/);
  assert.match(adminBoot, /state\.user = result\.user;\s*await afterLogin\(\);/);
  assert.match(adminBoot, /if \(IS_COMMUNITY && user\.role !== 'resident'\)\s*\{\s*state\.user = null;\s*state\.mobileAuthScreen = 'login';\s*renderLogin\(/);
  assert.match(adminBoot, /portal: IS_COMMUNITY \? 'community' : 'admin'/);
  assert.doesNotMatch(staffApp, /window\.location\.replace\(portalPath\)/);
  assert.match(staffApp, /portal: 'staff'/);
  assert.match(staffApp, /user\.role !== 'personnel'/);
});

test('built-in administrator account remains active and protected from account changes', { timeout: TEST_TIMEOUT_MS }, async () => {
  const usersResponse = await jsonRequest('/api/admin/users?status=all', adminCookie);
  assert.equal(usersResponse.status, 200);
  const users = (await usersResponse.json()).users;
  const builtInUser = users.find((user) => user.username === 'DELMARKEL2003');
  assert.ok(builtInUser);
  const staffUser = users.find((user) => user.email === portalLoginEmails.staff);
  assert.ok(staffUser);
  const userId = builtInUser.id;

  const protectedAccountChanges = await Promise.all([
    jsonRequest(`/api/admin/users/${userId}`, adminCookie, 'PUT', { email: 'replaced@example.test', contact_number: '09170000000' }),
    jsonRequest(`/api/admin/users/${userId}/status`, adminCookie, 'PUT', { status: 'Inactive' }),
    jsonRequest(`/api/admin/users/${userId}/role`, adminCookie, 'PUT', { role: 'resident' }),
    jsonRequest(`/api/admin/users/${userId}/reset`, adminCookie, 'PUT', { new_password: 'replacement-password' }),
    jsonRequest(`/api/admin/users/${userId}`, adminCookie, 'DELETE'),
  ]);
  assert.ok(protectedAccountChanges.every((response) => response.status === 403));

  assert.equal(builtInUser.role, 'administrator');
  assert.equal(builtInUser.status, 'Active');

  const reservedAccounts = await Promise.all([
    jsonRequest('/api/auth/register', '', 'POST', {
      full_name: 'Reserved Username Attempt',
      email: `reserved-username-${Date.now()}@example.test`,
      username: 'DELMARKEL2003',
      password: 'resident-password-123',
    }),
    jsonRequest('/api/auth/register', '', 'POST', {
      full_name: 'Reserved Phone Attempt',
      email: `reserved-phone-${Date.now()}@example.test`,
      contact_number: '09652703584',
      password: 'resident-password-123',
    }),
    jsonRequest('/api/admin/users', adminCookie, 'POST', {
      full_name: 'Reserved Admin Identifier Attempt',
      email: `new-${Date.now()}@example.test`,
      contact_number: '+639652703584',
      password: 'field-password-123',
      role: 'personnel',
    }),
    jsonRequest('/api/profile', residentCookie, 'PUT', {
      full_name: 'Resident Contact Collision',
      contact_number: '09652703584',
    }),
    jsonRequest(`/api/admin/users/${staffUser.id}`, adminCookie, 'PUT', {
      contact_number: '+639652703584',
    }),
  ]);
  assert.ok(reservedAccounts.every((response) => response.status === 409));
});

test('Staff API scopes assignments and report evidence to assigned personnel teams', { timeout: TEST_TIMEOUT_MS }, async () => {
  const residentRequest = await jsonRequest('/api/staff/assignments', residentCookie);
  assert.equal(residentRequest.status, 403);
  assert.equal((await jsonRequest('/api/staff/assignments', adminCookie)).status, 403);

  const allAssignmentsResponse = await jsonRequest('/api/staff/assignments', staffCookie);
  assert.equal(allAssignmentsResponse.status, 200);
  const allAssignments = (await allAssignmentsResponse.json()).assignments;
  assert.equal(allAssignments.length, 1);
  assert.equal(Number(allAssignments[0].id), Number(assignmentId));
  assert.equal(allAssignments[0].latest_stage, 'Assigned');
  assert.match(allAssignments[0].dispatch_notes, /protective equipment/);
  assert.equal(Object.hasOwn(allAssignments[0], 'reporter_email'), false);
  const reportPhoto = allAssignments[0].attachments.find((attachment) => attachment.original_name === 'Report photo')
    || allAssignments[0].attachments[0];
  assert.ok(reportPhoto?.file_path);
  assert.equal((await fetch(`${baseUrl}${reportPhoto.file_path}`, { headers: { cookie: staffCookie } })).status, 200);
  assert.equal((await fetch(`${baseUrl}${reportPhoto.file_path}`, { headers: { cookie: unassignedCookie } })).status, 403);

  const unassignedResponse = await jsonRequest('/api/staff/assignments', unassignedCookie);
  assert.equal(unassignedResponse.status, 200);
  assert.deepEqual((await unassignedResponse.json()).assignments, []);
  const deniedDetail = await jsonRequest(`/api/staff/assignments/${assignmentId}`, unassignedCookie);
  assert.equal(deniedDetail.status, 404);
  assert.equal((await jsonRequest('/api/reports', staffCookie)).status, 403);
  assert.equal((await jsonRequest(`/api/repair/assignments/${assignmentId}`, staffCookie)).status, 403);
  assert.equal((await jsonRequest('/api/admin/staff-memberships', staffCookie)).status, 403);
});

test('Staff response stages are ordered, documented, and notify the reporting resident', { timeout: TEST_TIMEOUT_MS }, async () => {
  const outOfOrder = await jsonRequest(`/api/staff/assignments/${assignmentId}/updates`, staffCookie, 'POST', {
    stage: 'On the Way',
  });
  assert.equal(outOfOrder.status, 409);

  const accepted = await jsonRequest(`/api/staff/assignments/${assignmentId}/updates`, staffCookie, 'POST', {
    stage: 'Acknowledged',
    notes: 'Assignment accepted. Preparing equipment.',
  });
  assert.equal(accepted.status, 201);

  const enRoute = await jsonRequest(`/api/staff/assignments/${assignmentId}/updates`, staffCookie, 'POST', {
    stage: 'On the Way',
    notes: 'Crew is traveling to the reported location.',
    latitude: 7.906,
    longitude: 125.094,
  });
  assert.equal(enRoute.status, 201);
  const current = await jsonRequest(`/api/staff/assignments/${assignmentId}`, staffCookie);
  assert.equal((await current.json()).assignment.latest_stage, 'On the Way');
  const notices = await jsonRequest('/api/notifications', residentCookie);
  assert.match(JSON.stringify(await notices.json()), /field crew/i);

  const evidenceForm = new FormData();
  evidenceForm.append('evidence', new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' }), 'inspection.png');
  const upload = await fetch(`${baseUrl}/api/staff/assignments/${assignmentId}/evidence`, {
    method: 'POST',
    headers: { cookie: staffCookie },
    body: evidenceForm,
  });
  assert.equal(upload.status, 201);
  evidenceId = (await upload.json()).evidence.id;
  const ownEvidence = await fetch(`${baseUrl}/api/staff/evidence/${evidenceId}`, { headers: { cookie: staffCookie } });
  assert.equal(ownEvidence.status, 200);
  const otherEvidence = await fetch(`${baseUrl}/api/staff/evidence/${evidenceId}`, { headers: { cookie: unassignedCookie } });
  assert.equal(otherEvidence.status, 404);

  for (const stage of ['Arrived', 'Inspecting', 'Repairing', 'Completed']) {
    const response = await jsonRequest(`/api/staff/assignments/${assignmentId}/updates`, staffCookie, 'POST', {
      stage,
      notes: `${stage} update from the field team.`,
    });
    assert.equal(response.status, 201);
  }
  const completedResponse = await jsonRequest(`/api/staff/assignments/${assignmentId}`, staffCookie);
  const completed = (await completedResponse.json()).assignment;
  assert.equal(completed.status, 'Completed');
  assert.equal(completed.latest_stage, 'Completed');
  const verified = await jsonRequest(`/api/repair/assignments/${assignmentId}/status`, adminCookie, 'PUT', {
    status: 'Resolved',
    crew_report: 'Field evidence reviewed and restoration confirmed.',
  });
  assert.equal(verified.status, 200);
  const closedUpdate = await jsonRequest(`/api/staff/assignments/${assignmentId}/updates`, staffCookie, 'POST', {
    stage: 'Completed',
    notes: 'A late update should not change a closed assignment.',
  });
  assert.equal(closedUpdate.status, 409);

  const locationUpdate = await jsonRequest(`/api/staff/teams/${teamId}/location`, staffCookie, 'PUT', {
    latitude: 7.907,
    longitude: 125.095,
  });
  assert.equal(locationUpdate.status, 200);
  const deniedLocationUpdate = await jsonRequest(`/api/staff/teams/${teamId}/location`, unassignedCookie, 'PUT', {
    latitude: 7.907,
    longitude: 125.095,
  });
  assert.equal(deniedLocationUpdate.status, 404);
});
