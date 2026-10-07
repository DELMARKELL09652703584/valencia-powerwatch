const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');

test('community dashboard keeps personal notifications out of the home feed', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'app', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'community.html'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'app', 'portal-polish.css'), 'utf8');
  const homeRendererStart = communityScript.indexOf('async function renderMobileHome()');
  const homeRendererEnd = communityScript.indexOf('\nasync function renderMobileReportForm()', homeRendererStart);
  const homeRenderer = communityScript.slice(homeRendererStart, homeRendererEnd);

  assert.ok(homeRendererStart >= 0);
  assert.ok(homeRendererEnd > homeRendererStart);
  assert.doesNotMatch(homeRenderer, /\/api\/(?:notifications|announcements)/);
  assert.doesNotMatch(communityScript, /class="recent-updates"/);
  assert.match(communityPage, /\/app\/community\.js\?v=26/);
  assert.match(communityPage, /\/app\/portal-polish\.css\?v=40/);
  assert.match(portalStyles, /body\.community-body \.home-report-action\s*\{/);
  assert.match(portalStyles, /body\.community-body \.home-track-action svg\s*\{[^}]*width:\s*20px;[^}]*height:\s*20px;[^}]*fill:\s*none;/s);
  assert.match(portalStyles, /@media \(max-width: 600px\)\s*\{\s*body\.community-body \.mobile-home-header\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s);
});

test('community report location remains readable in Night Ops mode', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'app', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'community.html'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'app', 'portal-polish.css'), 'utf8');

  assert.match(communityScript, /class="stepper"/);
  assert.match(communityScript, /id="report-assigned-barangay-badge"/);
  assert.match(communityScript, /id="assigned-barangay-name"/);
  assert.match(communityScript, /class="mobile-gps"/);
  assert.match(communityPage, /\/app\/portal-polish\.css\?v=40/);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.stepper \.step > span:last-child\s*\{[^}]*color:\s*var\(--pw-body\)\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.stepper \.step\.active \.step-number\s*\{[^}]*background:\s*var\(--pw-primary\);/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body #report-assigned-barangay-badge\s*\{[^}]*background:\s*#10352b\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-gps\s*\{[^}]*background:\s*var\(--pw-panel\);/s);
});
