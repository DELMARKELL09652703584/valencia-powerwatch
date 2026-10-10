const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '..');
const TEST_TIMEOUT_MS = 30000;
const testAdminEmail = 'dsaroay@gmail.com';
const testAdminPassword = `${crypto.randomUUID()}Aa1!`;
let serverProcess;
let baseUrl;
let testDirectory;
let testDatabasePath;
let adminCookie;
let adminLoginUser;
let staffCookie;
let staffLoginUser;
let unassignedCookie;
let residentCookie;
let residentLoginUser;
let portalLoginEmails = {};
let assignmentId;
let primaryReportId;
let areaReviewReportId;
let evidenceId;
let teamId;
let alternateTeamId;
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

const createPersonnel = async (name, email, { teamId: assignedTeamId = teamId, barangays = ['Poblacion'] } = {}) => {
  const response = await jsonRequest('/api/admin/users', adminCookie, 'POST', {
    full_name: name,
    email,
    password: 'field-password-123',
    confirm_password: 'field-password-123',
    role: 'personnel',
    team_ids: [assignedTeamId],
    barangay_names: barangays,
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

const submitReport = async ({ barangay = 'Poblacion', purok = 'Field Workflow Test Site', withCoordinates = true } = {}) => {
  const form = new FormData();
  const fields = {
    location: `Brgy. ${barangay}, Valencia City`,
    barangay,
    purok,
    date_time_noticed: new Date().toISOString(),
    description: 'A fallen line caused a power interruption near the test site.',
    possible_outage_type: 'Line Fault',
  };
  if (withCoordinates) Object.assign(fields, {
    latitude: '7.906',
    longitude: '125.094',
    location_source: 'map_pin',
  });
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
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
  testDatabasePath = path.join(runtimeRoot, 'data', 'powerwatch.db');
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
      NODE_ENV: 'test',
      PORT: String(port),
      POWERWATCH_DATA_DIR: path.join(runtimeRoot, 'data'),
      POWERWATCH_ADMIN_EMAIL: testAdminEmail,
      POWERWATCH_ADMIN_PASSWORD: testAdminPassword,
      POWERWATCH_ADMIN_NAME: 'Isolated Test Administrator',
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
    email: testAdminEmail,
    password: testAdminPassword,
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
    role: 'personnel',
  });
  assert.equal(resident.status, 200, `Resident registration failed: ${JSON.stringify(await resident.clone().json())}`);
  const residentUser = (await resident.json()).user;
  assert.equal(residentUser.role, 'resident', 'self-registration must ignore any requested privileged role');
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
  const alternateTeamResponse = await jsonRequest('/api/repair-teams', adminCookie, 'POST', {
    name: 'Test Out-of-Area Crew',
    lead_technician: 'Alternate Crew Lead',
    vehicle_type: 'Service Vehicle',
    base_station: 'Bagontaas',
  });
  assert.equal(alternateTeamResponse.status, 201);
  alternateTeamId = (await alternateTeamResponse.json()).team.id;

  const staff = await createPersonnel('Assigned Field Staff', `assigned-field-${Date.now()}@example.test`);
  const unassigned = await createPersonnel('Out-of-Area Field Staff', `unassigned-field-${Date.now()}@example.test`, {
    teamId: alternateTeamId,
    barangays: ['Bagontaas'],
  });
  const membershipResponse = await jsonRequest(`/api/admin/staff-memberships/${staff.id}`, adminCookie, 'PUT', {
    team_ids: [team.id],
    barangay_names: ['Poblacion'],
  });
  assert.equal(membershipResponse.status, 200);

  const report = await submitReport();
  primaryReportId = report.id;
  assert.equal(report.status, 'Submitted');
  assert.equal(report.verification_status, 'Pending');
  const noCoordinateReport = await submitReport({ purok: 'Text-only location test', withCoordinates: false });
  assert.equal(noCoordinateReport.latitude, null);
  assert.equal(noCoordinateReport.longitude, null);
  assert.equal(noCoordinateReport.status, 'Submitted');
  const outsideAreaReport = await submitReport({ barangay: 'Bagontaas', purok: 'Out-of-area Test Site' });
  portalLoginEmails.outsideAreaReportId = String(outsideAreaReport.id);
  areaReviewReportId = (await submitReport({ purok: 'Assigned Area Review Site' })).id;
  const unverifiedDispatch = await jsonRequest('/api/repair/assign', adminCookie, 'POST', {
    team_id: team.id,
    report_id: report.id,
    dispatch_notes: 'Dispatch must wait for report verification.',
  });
  assert.equal(unverifiedDispatch.status, 409);
  const verification = await jsonRequest(`/api/reports/${report.id}/status`, adminCookie, 'PUT', {
    status: 'Verified',
    priority: 'High',
    remarks: 'Report checked for workflow test.',
  });
  assert.equal(verification.status, 200);
  const eligibilityResponse = await jsonRequest(`/api/repair/dispatch-eligibility?report_id=${report.id}`, adminCookie);
  assert.equal(eligibilityResponse.status, 200);
  assert.equal((await jsonRequest('/api/repair/dispatch-eligibility?report_id=invalid', adminCookie)).status, 400);
  assert.equal((await jsonRequest(`/api/repair/dispatch-eligibility?report_id=${report.id}&incident_id=1`, adminCookie)).status, 400);
  const eligibility = await eligibilityResponse.json();
  assert.equal(eligibility.verified, true);
  assert.equal(eligibility.active_staff_in_barangay, 1);
  assert.equal(eligibility.reason, null);
  assert.equal(eligibility.teams.find((responseTeam) => responseTeam.id === team.id).eligible_staff_count, 1);

  const membershipDb = new DatabaseSync(testDatabasePath);
  try {
    membershipDb.prepare('DELETE FROM staff_team_members WHERE user_id = ?').run(staff.id);
  } finally {
    membershipDb.close();
  }
  const ineligibleResponse = await jsonRequest(`/api/repair/dispatch-eligibility?report_id=${report.id}`, adminCookie);
  assert.equal((await ineligibleResponse.json()).reason, 'staff_not_assigned_to_team');
  assert.equal(ineligibleResponse.status, 200);
  assert.equal((await jsonRequest(`/api/repair/dispatch-eligibility?report_id=${report.id}`, residentCookie)).status, 403);

  const restoredMembership = await jsonRequest(`/api/admin/staff-memberships/${staff.id}`, adminCookie, 'PUT', {
    team_ids: [team.id],
    barangay_names: ['Poblacion'],
  });
  assert.equal(restoredMembership.status, 200);
  const legacyMembershipDb = new DatabaseSync(testDatabasePath);
  try {
    legacyMembershipDb.prepare('UPDATE staff_barangay_assignments SET barangay = ? WHERE user_id = ?')
      .run(' POBLACION ', staff.id);
  } finally {
    legacyMembershipDb.close();
  }
  const normalizedEligibilityResponse = await jsonRequest(`/api/repair/dispatch-eligibility?report_id=${report.id}`, adminCookie);
  const normalizedEligibility = await normalizedEligibilityResponse.json();
  assert.equal(normalizedEligibility.reason, null, 'legacy case and whitespace differences must not block dispatch');
  assert.equal(normalizedEligibility.teams.find((responseTeam) => responseTeam.id === team.id).eligible_staff_count, 1);
  const staffMembershipView = await (await jsonRequest('/api/admin/staff-memberships', adminCookie)).json();
  assert.deepEqual(staffMembershipView.staff.find((member) => member.id === staff.id).barangay_names, ['Poblacion']);
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
    fetch(`${baseUrl}/app/staff.css?v=7`),
    fetch(`${baseUrl}/app/staff.js?v=10`),
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
  const staffSource = await jsResponse.text();
  assert.match(staffSource, /const renderLogin/);
  assert.match(staffSource, /Next field action/);
  assert.match(staffSource, /Tasks without GPS/);
  assert.match(staffSource, /Upload complete\./);
  assert.match(staffSource, /You are offline\./);
  assert.match(staffSource, /new XMLHttpRequest\(\)/);
  assert.match(staffSource, /const hasValidCoordinates = \(latitude, longitude\)/);
  assert.match(staffSource, /\[null, undefined, ''\]\.includes\(latitude\)/);
  assert.match(staffSource, /GPS is not available for mapping or directions yet/);
  assert.doesNotMatch(staffSource, /<a href="\/">User Portal<\/a>|<a href="\/admin">Admin Portal<\/a>/);
  assert.ok(iconResponses.every((response) => response.status === 200));
  const staffStyles = await cssResponse.text();
  assert.match(staffStyles, /width: min\(100%, 430px\)/);
  assert.match(staffStyles, /@media \(min-width: 560px\)/);
  assert.match(staffStyles, /place-items: center/);
  assert.match(staffStyles, /grid-template-columns: repeat\(2, minmax\(0,1fr\)\)/);
  assert.doesNotMatch(staffStyles, /grid-template-columns: repeat\(4, minmax\(0,1fr\)\)/);
  assert.match(staffStyles, /staff-stage-progress/);
  assert.match(staffStyles, /staff-progress-scroll \.staff-stage-progress/);
  assert.match(staffStyles, /staff-evidence-preview/);
  assert.match(staffStyles, /staff-upload-drop/);
  const workerSource = await workerResponse.text();
  const shellAssets = workerSource.match(/const STAFF_SHELL = \[[\s\S]*?\];/)?.[0] || '';
  assert.doesNotMatch(shellAssets, /\/api\/|\/admin/);
  assert.match(shellAssets, /staff\.css\?v=7/);
  assert.match(shellAssets, /staff\.js\?v=10/);
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
  const staffSummary = (await (await jsonRequest('/api/admin/users?status=all', adminCookie)).json()).staff_summary;
  assert.equal(staffSummary.total, 2);
  assert.equal(staffSummary.active, 2);
  assert.equal(staffSummary.inactive, 0);
  assert.equal(staffSummary.assigned_teams, 2);
  assert.equal(staffSummary.assigned_barangays, 2);
  assert.equal(staffSummary.account_limit, null);
  const staffDb = new DatabaseSync(testDatabasePath);
  try {
    const storedPassword = staffDb.prepare('SELECT password_hash FROM users WHERE id = ?').get(staffLoginUser.id).password_hash;
    assert.notEqual(storedPassword, 'field-password-123');
    assert.match(storedPassword, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  } finally {
    staffDb.close();
  }
  const staffLogout = await jsonRequest('/api/auth/logout', staffCookie, 'POST');
  assert.equal(staffLogout.status, 200);
  const repeatStaffLogin = await login(portalLoginEmails.staff, 'field-password-123', 'staff');
  staffCookie = repeatStaffLogin.cookie;
  assert.equal(repeatStaffLogin.user.role, 'personnel');
  assert.equal(repeatStaffLogin.user.portal_path, '/staff');
  assert.equal((await jsonRequest('/api/auth/me', staffCookie)).status, 200);
  const mismatchedPasswordCreation = await jsonRequest('/api/admin/users', adminCookie, 'POST', {
    full_name: 'Mismatched Password Staff',
    email: `mismatched-password-${Date.now()}@example.test`,
    password: 'field-password-123',
    confirm_password: 'different-password-123',
    role: 'personnel',
  });
  assert.equal(mismatchedPasswordCreation.status, 400);
  assert.equal((await mismatchedPasswordCreation.json()).error, 'Passwords do not match.');
  const missingConfirmationCreation = await jsonRequest('/api/admin/users', adminCookie, 'POST', {
    full_name: 'Missing Confirmation Staff',
    email: `missing-confirmation-${Date.now()}@example.test`,
    password: 'field-password-123',
    role: 'personnel',
  });
  assert.equal(missingConfirmationCreation.status, 400);
  const unauthorizedStaffCreation = await Promise.all([
    jsonRequest('/api/admin/users', staffCookie, 'POST', {
      full_name: 'Staff-Created Account',
      email: `staff-created-${Date.now()}@example.test`,
      password: 'field-password-123',
      role: 'personnel',
    }),
    jsonRequest('/api/admin/users', residentCookie, 'POST', {
      full_name: 'Resident-Created Account',
      email: `resident-created-${Date.now()}@example.test`,
      password: 'field-password-123',
      role: 'personnel',
    }),
  ]);
  assert.ok(unauthorizedStaffCreation.every((response) => response.status === 403));
  const rejectedStaffCreation = await Promise.all([
    jsonRequest('/api/admin/users', adminCookie, 'POST', {
      full_name: 'Missing Area Assignment',
      email: `missing-area-${Date.now()}@example.test`,
      password: 'field-password-123',
      confirm_password: 'field-password-123',
      role: 'personnel',
      team_ids: [teamId],
      barangay_names: [],
    }),
    jsonRequest('/api/admin/users', adminCookie, 'POST', {
      full_name: 'Invalid Email Staff',
      email: 'not-an-email',
      password: 'field-password-123',
      confirm_password: 'field-password-123',
      role: 'personnel',
      team_ids: [teamId],
      barangay_names: ['Poblacion'],
    }),
  ]);
  assert.ok(rejectedStaffCreation.every((response) => response.status === 400));
  assert.equal((await jsonRequest(`/api/admin/users/${residentLoginUser.id}/role`, adminCookie, 'PUT', { role: 'personnel' })).status, 409);
  const attemptedResidentProvisioning = await jsonRequest('/api/admin/users', adminCookie, 'POST', {
    full_name: 'Admin-Provisioned Resident',
    email: `admin-resident-${Date.now()}@example.test`,
    password: 'resident-password-123',
    role: 'resident',
  });
  assert.equal(attemptedResidentProvisioning.status, 403);

  const staffAssignments = await jsonRequest('/api/admin/staff-memberships', adminCookie);
  assert.equal(staffAssignments.status, 200);
  const assignments = await staffAssignments.json();
  const configuredStaff = assignments.staff.find((member) => Number(member.id) === Number(staffLoginUser.id));
  assert.deepEqual(configuredStaff.barangay_names, ['Poblacion']);
  assert.ok(assignments.barangays.includes('Bagontaas'));
  assert.equal((await jsonRequest(`/api/admin/staff-memberships/${staffLoginUser.id}`, adminCookie, 'PUT', {
    team_ids: [],
    barangay_names: ['Poblacion'],
  })).status, 400);
  assert.equal((await jsonRequest(`/api/admin/staff-memberships/${staffLoginUser.id}`, adminCookie, 'PUT', {
    team_ids: [teamId],
    barangay_names: [],
  })).status, 400);

  const mismatchedPortalAttempts = await Promise.all([
    jsonRequest('/api/auth/login', '', 'POST', { email: portalLoginEmails.resident, password: 'resident-password-123', portal: 'admin' }),
    jsonRequest('/api/auth/login', '', 'POST', { email: portalLoginEmails.resident, password: 'resident-password-123', portal: 'staff' }),
    jsonRequest('/api/auth/login', '', 'POST', { email: portalLoginEmails.staff, password: 'field-password-123', portal: 'admin' }),
    jsonRequest('/api/auth/login', '', 'POST', { email: portalLoginEmails.staff, password: 'field-password-123', portal: 'community' }),
    jsonRequest('/api/auth/login', '', 'POST', { email: testAdminEmail, password: testAdminPassword, portal: 'staff' }),
    jsonRequest('/api/auth/login', '', 'POST', { email: testAdminEmail, password: testAdminPassword, portal: 'community' }),
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
  assert.match(staffApp, /video\/mp4,video\/quicktime/);
  assert.match(staffApp, /controls preload="metadata"/);
  assert.match(staffApp, /data-action="open-history"/);
  assert.match(staffApp, /Resident reports/);
  assert.match(staffApp, /data-action="update-report-status"/);
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
  const builtInUser = users.find((user) => user.email === testAdminEmail);
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
      confirm_password: 'field-password-123',
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

test('Staff API scopes assignments, reports, evidence, and incidents to authorized teams and barangays', { timeout: TEST_TIMEOUT_MS }, async () => {
  const residentRequest = await jsonRequest('/api/staff/assignments', residentCookie);
  assert.equal(residentRequest.status, 403);
  assert.equal((await jsonRequest('/api/staff/assignments', adminCookie)).status, 403);

  const allAssignmentsResponse = await jsonRequest('/api/staff/assignments', staffCookie);
  assert.equal(allAssignmentsResponse.status, 200);
  const allAssignments = (await allAssignmentsResponse.json()).assignments;
  assert.equal(allAssignments.length, 1);
  assert.equal(Number(allAssignments[0].id), Number(assignmentId));
  assert.equal(allAssignments[0].latest_stage, 'Assigned');
  assert.equal(allAssignments[0].incident_id, null, 'dispatching a single report must not create a duplicate incident');
  assert.equal(allAssignments[0].report_incident_id, null);
  const reportDetail = await jsonRequest(`/api/reports/${primaryReportId}`, adminCookie);
  assert.equal((await reportDetail.json()).report.incident, null);
  const singleReportIncident = await jsonRequest('/api/incidents', adminCookie, 'POST', {
    title: 'Duplicate single-report incident attempt',
    barangay: 'Poblacion',
    start_time: new Date().toISOString(),
    outage_type: 'Line Fault',
    description: 'A single report must remain the authoritative case record.',
    report_id: primaryReportId,
  });
  assert.equal(singleReportIncident.status, 409);
  const fixtureDb = new DatabaseSync(testDatabasePath);
  try {
    assert.equal(fixtureDb.prepare('SELECT COUNT(*) AS count FROM incident_links WHERE report_id = ?').get(primaryReportId).count, 0);
  } finally {
    fixtureDb.close();
  }
  assert.match(allAssignments[0].dispatch_notes, /protective equipment/);
  assert.equal(Object.hasOwn(allAssignments[0], 'reporter_email'), false);
  const reportPhoto = allAssignments[0].attachments.find((attachment) => attachment.original_name === 'Report photo')
    || allAssignments[0].attachments[0];
  assert.ok(reportPhoto?.file_path);
  assert.equal((await fetch(`${baseUrl}${reportPhoto.file_path}`, { headers: { cookie: staffCookie } })).status, 200);
  assert.equal((await fetch(`${baseUrl}${reportPhoto.file_path}`, { headers: { cookie: unassignedCookie } })).status, 403);
  assert.equal((await jsonRequest(`/api/staff/assignments/${assignmentId}/verify`, unassignedCookie, 'POST', {})).status, 404);
  const alreadyVerified = await jsonRequest(`/api/staff/assignments/${assignmentId}/verify`, staffCookie, 'POST', {});
  assert.equal(alreadyVerified.status, 409);

  const unassignedResponse = await jsonRequest('/api/staff/assignments', unassignedCookie);
  assert.equal(unassignedResponse.status, 200);
  assert.deepEqual((await unassignedResponse.json()).assignments, []);
  const otherAreaReports = await (await jsonRequest('/api/reports', unassignedCookie)).json();
  assert.ok(otherAreaReports.reports.length > 0);
  assert.ok(otherAreaReports.reports.every((report) => report.barangay === 'Bagontaas'));
  assert.equal((await jsonRequest(`/api/reports/${primaryReportId}`, unassignedCookie)).status, 404);
  assert.deepEqual((await (await jsonRequest('/api/incidents?include_closed=true', unassignedCookie)).json()).incidents, []);
  const deniedDetail = await jsonRequest(`/api/staff/assignments/${assignmentId}`, unassignedCookie);
  assert.equal(deniedDetail.status, 404);
  const areaReportsResponse = await jsonRequest('/api/reports', staffCookie);
  assert.equal(areaReportsResponse.status, 200);
  const areaReports = (await areaReportsResponse.json()).reports;
  assert.ok(areaReports.every((report) => report.barangay === 'Poblacion'));
  assert.ok(areaReports.some((report) => Number(report.id) !== Number(portalLoginEmails.outsideAreaReportId)));
  const areaMapResponse = await jsonRequest('/api/reports/map', staffCookie);
  assert.equal(areaMapResponse.status, 200);
  assert.ok((await areaMapResponse.json()).reports.every((report) => report.barangay === 'Poblacion'));
  const staffReview = await jsonRequest(`/api/reports/${areaReviewReportId}/status`, staffCookie, 'PUT', { status: 'Under Review' });
  assert.equal(staffReview.status, 200);
  const residentReportTracking = await jsonRequest('/api/reports/mine', residentCookie);
  assert.equal((await residentReportTracking.json()).reports.find((report) => Number(report.id) === Number(areaReviewReportId)).status, 'Under Review');
  assert.equal((await jsonRequest(`/api/reports/${portalLoginEmails.outsideAreaReportId}`, staffCookie)).status, 404);
  assert.equal((await jsonRequest(`/api/reports/${portalLoginEmails.outsideAreaReportId}/status`, staffCookie, 'PUT', { status: 'Verified' })).status, 404);
  const staffIncidentList = await jsonRequest('/api/incidents?include_closed=true', staffCookie);
  assert.equal(staffIncidentList.status, 200);
  assert.ok((await staffIncidentList.json()).incidents.every((incident) => incident.barangay === 'Poblacion'
    || incident.affected_barangays?.includes('Poblacion')));
  const outsideIncidentResponse = await jsonRequest('/api/incidents', adminCookie, 'POST', {
    title: 'Out-of-area access test',
    barangay: 'Bagontaas',
    start_time: new Date().toISOString(),
    outage_type: 'Line Fault',
    description: 'Used to verify staff area authorization.',
    latitude: 7.91,
    longitude: 125.10,
  });
  assert.equal(outsideIncidentResponse.status, 201);
  const outsideIncident = (await outsideIncidentResponse.json()).incident;
  assert.equal((await jsonRequest(`/api/incidents/${outsideIncident.id}`, staffCookie)).status, 404);
  assert.equal((await jsonRequest(`/api/incidents/${outsideIncident.id}/status`, staffCookie, 'PUT', { status: 'Ongoing' })).status, 404);
  const switchedAreaResponse = await jsonRequest(`/api/admin/staff-memberships/${staffLoginUser.id}`, adminCookie, 'PUT', {
    team_ids: [teamId],
    barangay_names: ['Bagontaas'],
  });
  assert.equal(switchedAreaResponse.status, 200);
  const switchedReports = await jsonRequest('/api/reports', staffCookie);
  assert.ok((await switchedReports.json()).reports.every((report) => report.barangay === 'Bagontaas'));
  const restoredAreaResponse = await jsonRequest(`/api/admin/staff-memberships/${staffLoginUser.id}`, adminCookie, 'PUT', {
    team_ids: [teamId],
    barangay_names: ['Poblacion'],
  });
  assert.equal(restoredAreaResponse.status, 200);
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
  const acceptedBody = await accepted.json();
  assert.equal(accepted.status, 201, JSON.stringify(acceptedBody));

  const enRoute = await jsonRequest(`/api/staff/assignments/${assignmentId}/updates`, staffCookie, 'POST', {
    stage: 'On the Way',
    notes: 'Crew is traveling to the reported location.',
    latitude: 7.906,
    longitude: 125.094,
  });
  const enRouteBody = await enRoute.json();
  assert.equal(enRoute.status, 201, JSON.stringify(enRouteBody));
  const current = await jsonRequest(`/api/staff/assignments/${assignmentId}`, staffCookie);
  assert.equal((await current.json()).assignment.latest_stage, 'On the Way');
  const residentReports = await jsonRequest('/api/reports/mine', residentCookie);
  const residentReport = (await residentReports.json()).reports.find((item) => Number(item.id) === Number(primaryReportId));
  assert.equal(residentReport.status, 'In Progress');
  assert.equal(residentReport.repair_status, 'En Route');
  assert.equal(residentReport.incident_id, null);
  assert.ok(residentReport.timeline.some((event) => event.to_status === 'In Progress' && event.actor_name === 'Assigned Field Staff'));
  assert.equal(Object.hasOwn(residentReport, 'staff_remarks'), false);
  assert.ok(residentReport.timeline.every((event) => !Object.hasOwn(event, 'details') && !Object.hasOwn(event, 'actor_user_id')));
  const timelineDb = new DatabaseSync(testDatabasePath);
  try {
    assert.equal(timelineDb.prepare(`
      SELECT actor_user_id FROM report_status_history
      WHERE report_id = ? AND to_status = 'In Progress' AND actor_user_id = ?
      ORDER BY id DESC LIMIT 1
    `).get(primaryReportId, staffLoginUser.id).actor_user_id, staffLoginUser.id);
  } finally {
    timelineDb.close();
  }
  const notices = await jsonRequest('/api/notifications', residentCookie);
  assert.match(JSON.stringify(await notices.json()), /field response/i);

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

  const videoForm = new FormData();
  const mp4Header = Uint8Array.from([0, 0, 0, 16, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  videoForm.append('evidence', new Blob([mp4Header], { type: 'video/mp4' }), 'inspection.mp4');
  const videoUpload = await fetch(`${baseUrl}/api/staff/assignments/${assignmentId}/evidence`, {
    method: 'POST',
    headers: { cookie: staffCookie },
    body: videoForm,
  });
  assert.equal(videoUpload.status, 201);
  const videoEvidence = (await videoUpload.json()).evidence;
  const videoResponse = await fetch(`${baseUrl}${videoEvidence.url}`, { headers: { cookie: staffCookie } });
  assert.equal(videoResponse.status, 200);
  assert.equal(videoResponse.headers.get('content-type'), 'video/mp4');
  assert.deepEqual(new Uint8Array(await videoResponse.arrayBuffer()), mp4Header);

  const invalidVideoForm = new FormData();
  invalidVideoForm.append('evidence', new Blob(['not a video'], { type: 'video/mp4' }), 'invalid.mp4');
  const invalidVideoUpload = await fetch(`${baseUrl}/api/staff/assignments/${assignmentId}/evidence`, {
    method: 'POST',
    headers: { cookie: staffCookie },
    body: invalidVideoForm,
  });
  assert.equal(invalidVideoUpload.status, 400);

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
  const missingReviewNotes = await jsonRequest(`/api/repair/assignments/${assignmentId}/status`, adminCookie, 'PUT', {
    status: 'Resolved',
  });
  assert.equal(missingReviewNotes.status, 400);
  const verified = await jsonRequest(`/api/reports/${primaryReportId}/status`, adminCookie, 'PUT', {
    status: 'Resolved',
    remarks: 'Admin reviewed field evidence and approved this response.',
  });
  assert.equal(verified.status, 200);
  assert.equal((await jsonRequest(`/api/reports/${primaryReportId}`, adminCookie).then((response) => response.json())).report.status, 'Resolved');
  const resolvedAssignment = await jsonRequest(`/api/repair/assignments/${assignmentId}`, adminCookie);
  assert.equal((await resolvedAssignment.json()).assignment.status, 'Resolved');
  const closure = await jsonRequest(`/api/reports/${primaryReportId}/status`, adminCookie, 'PUT', {
    status: 'Closed',
    remarks: 'Admin completed final review and closed this report.',
  });
  assert.equal(closure.status, 200);
  const residentTracking = await jsonRequest('/api/reports/mine', residentCookie);
  const closedResidentReport = (await residentTracking.json()).reports.find((report) => Number(report.id) === Number(primaryReportId));
  assert.equal(closedResidentReport.status, 'Closed');
  assert.ok(closedResidentReport.timeline.some((event) => event.to_status === 'Closed' && event.actor_name === adminLoginUser.full_name));
  assert.equal(Object.hasOwn(closedResidentReport, 'staff_remarks'), false);
  const adminReportDetail = await jsonRequest(`/api/reports/${primaryReportId}`, adminCookie);
  assert.ok((await adminReportDetail.json()).report.timeline.some((event) => /Admin reviewed field evidence/.test(event.details || '')
    && event.actor_user_id === adminLoginUser.id));
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

test('Staff account limit is administrator-configurable and enforced by the server', { timeout: TEST_TIMEOUT_MS }, async () => {
  const summaryResponse = await jsonRequest('/api/admin/users?status=all', adminCookie);
  assert.equal(summaryResponse.status, 200);
  const { staff_summary: summary } = await summaryResponse.json();
  assert.ok(summary.total > 0);

  const invalidLimits = await Promise.all([
    jsonRequest('/api/admin/settings', adminCookie, 'PUT', { key: 'staff_account_limit', value: -1 }),
    jsonRequest('/api/admin/settings', adminCookie, 'PUT', { key: 'staff_account_limit', value: 2.5 }),
    jsonRequest('/api/admin/settings', adminCookie, 'PUT', { key: 'staff_account_limit', value: '5' }),
    jsonRequest('/api/admin/settings', staffCookie, 'PUT', { key: 'staff_account_limit', value: 10 }),
  ]);
  assert.deepEqual(invalidLimits.map((response) => response.status), [400, 400, 400, 403]);

  const belowCurrentCount = await jsonRequest('/api/admin/settings', adminCookie, 'PUT', {
    key: 'staff_account_limit',
    value: summary.total - 1,
  });
  assert.equal(belowCurrentCount.status, 409);
  const configuredLimit = await jsonRequest('/api/admin/settings', adminCookie, 'PUT', {
    key: 'staff_account_limit',
    value: summary.total,
  });
  assert.equal(configuredLimit.status, 200);

  const blockedCreation = await jsonRequest('/api/admin/users', adminCookie, 'POST', {
    full_name: 'Over Limit Staff',
    email: `over-limit-${Date.now()}@example.test`,
    password: 'field-password-123',
    confirm_password: 'field-password-123',
    role: 'personnel',
    team_ids: [teamId],
    barangay_names: ['Poblacion'],
  });
  assert.equal(blockedCreation.status, 409);

  const unlimited = await jsonRequest('/api/admin/settings', adminCookie, 'PUT', {
    key: 'staff_account_limit',
    value: null,
  });
  assert.equal(unlimited.status, 200);
  const settings = await jsonRequest('/api/admin/settings', adminCookie);
  assert.equal((await settings.json()).settings.staff_account_limit, null);
  await createPersonnel('Unlimited Test Staff', `unlimited-${Date.now()}@example.test`);
});
