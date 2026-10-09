const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const adminSource = fs.readFileSync(path.join(ROOT, 'app', 'admin.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(ROOT, 'app', 'main.js'), 'utf8');
const adminHtml = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');

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
  assert.match(adminHtml, /app\/admin\.js\?v=27/);
  assert.match(adminHtml, /app\/main\.js\?v=30/);
  assert.match(adminHtml, /admin-theme\.css\?v=3/);
});
