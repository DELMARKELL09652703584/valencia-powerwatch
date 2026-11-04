const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const adminSource = fs.readFileSync(path.join(ROOT, 'client', 'js', 'admin', 'admin.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'main.js'), 'utf8');
const adminHtml = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'admin.html'), 'utf8');
const communityHtml = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');
const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'style.css'), 'utf8');

test('Admin navigation consolidates report verification and incident operations', () => {
  const nav = adminSource.match(/const ADMIN_NAV = \[([\s\S]*?)\n\];/)?.[1] || '';
  assert.match(nav, /key: 'reports', label: 'Incidents & Reports'/);
  assert.doesNotMatch(nav, /key: 'verification'|key: 'incidents'/);
  assert.match(adminSource, /renderCaseManagementTabs\('verification'\)/);
  assert.match(adminSource, /renderCaseManagementTabs\('incidents'\)/);
  assert.match(mainSource, /reports: renderAdminUnifiedCases/);
});

test('Unified case list groups linked reports beneath incidents without hiding standalone reports', () => {
  assert.match(adminSource, /const reportsByIncident = new Map\(\)/);
  assert.match(adminSource, /const linkedReportIds = new Set\(\)/);
  assert.match(adminSource, /if \(linkedReportIds\.has\(Number\(report\.id\)\)\) continue/);
  assert.match(adminSource, /linked\.push\(report\)/);
  assert.match(adminSource, /Verification queue/);
  assert.match(adminSource, /Verified \/ ready for dispatch/);
  assert.match(adminSource, /Active incidents/);
  assert.match(adminSource, /Resolved/);
});

test('Report verification updates the authoritative report without creating a duplicate incident', () => {
  assert.match(mainSource, /type === 'verify-report'/);
  assert.match(mainSource, /status: 'Verified'/);
  assert.doesNotMatch(mainSource, /type === 'verify-create-incident'/);
  assert.match(adminSource, /Verify Report/);
  assert.match(adminHtml, /client\/js\/admin\/admin\.js\?v=38/);
  assert.match(adminHtml, /client\/js\/shared\/main\.js\?v=37/);
  assert.match(adminHtml, /admin-theme\.css\?v=16/);
});

test('Staff account form requires matching initial and confirmation passwords', () => {
  assert.match(mainSource, /name="password" minlength="6" autocomplete="new-password" required/);
  assert.match(mainSource, /name="confirm_password" minlength="6" autocomplete="new-password" required/);
  assert.match(mainSource, /values\.password !== values\.confirm_password/);
  assert.match(mainSource, /confirm_password: values\.confirm_password/);
});

test('Admin login does not expose seeded credentials and hides unconfigured OAuth providers', () => {
  assert.doesNotMatch(mainSource, /autofill-admin-login|data-pass="(?:ADMIN2023\*|admin123)"/);
  assert.match(mainSource, /function syncOAuthProviderControls\(\)/);
  assert.match(mainSource, /button\.hidden = !state\.oauthProviders\?\.\[`\\?\$\{button\.dataset\.provider\}Live`\\?\]/);
  assert.match(mainSource, /row\.hidden = !hasAvailableProvider/);
  assert.match(mainSource, /app\.innerHTML = `<main class="login-page">[\s\S]*?syncOAuthProviderControls\(\);\s*\}/);
  assert.match(styles, /\.social-row\[hidden\],[\s\S]*?\.social-btn\[hidden\],[\s\S]*?\.auth-divider\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
  assert.match(communityHtml, /\/style\.css\?v=51/);
});

test('built-in Admin settings hide ordinary profile and password editing', () => {
  assert.match(adminSource, /u\.is_built_in_admin \? `<div class="panel">/);
  assert.match(adminSource, /Permanent Admin account/);
  assert.match(adminSource, /This built-in account is managed by system configuration/);
  assert.match(adminSource, /state\.user\.is_built_in_admin \? '<p class="muted">The built-in Admin password is managed by system configuration/);
  assert.match(adminSource, /Use the secure recovery link from the Admin sign-in page/);
  assert.match(adminSource, /Email recovery is unavailable until SMTP is configured on the server/);
  assert.match(adminHtml, /client\/js\/admin\/admin\.js\?v=38/);
});
