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
  assert.match(communityPage, /\/app\/community\.js\?v=27/);
  assert.match(communityPage, /\/app\/portal-polish\.css\?v=52/);
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
  assert.match(communityPage, /\/app\/portal-polish\.css\?v=52/);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.stepper \.step > span:last-child\s*\{[^}]*color:\s*var\(--pw-body\)\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.stepper \.step\.active \.step-number\s*\{[^}]*background:\s*var\(--pw-primary\);/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body #report-assigned-barangay-badge\s*\{[^}]*background:\s*#10352b\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-gps\s*\{[^}]*background:\s*var\(--pw-panel\);/s);
});

test('community report review notices have readable Night Ops colors', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'app', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'community.html'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'app', 'portal-polish.css'), 'utf8');

  assert.match(communityScript, /class="possible-duplicate-notice is-unavailable"/);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.possible-duplicate-notice\.is-unavailable\s*\{[^}]*background:\s*#3a211e\s*!important;[^}]*color:\s*#ffd2c8\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.possible-duplicate-notice\.is-unavailable p\s*\{[^}]*color:\s*#f0c9c0\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.possible-duplicate-notice,\s*body\.dark-mode\.community-body \.possible-duplicate-clear\s*\{[^}]*background:\s*#332a1a\s*!important;/s);
  assert.match(communityPage, /\/app\/portal-polish\.css\?v=52/);
});

test('community report review keeps the Back button label visible in both themes', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'app', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'community.html'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'app', 'portal-polish.css'), 'utf8');

  assert.match(communityScript, /class="button ghost" data-action="previous-report-step">Back<\/button>/);
  assert.match(portalStyles, /body\.community-body \.mobile-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\),\s*body\.community-body \.mobile-auth-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\)\s*\{\s*color:\s*#fff\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\),\s*body\.dark-mode\.community-body \.mobile-auth-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\)\s*\{/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \:is\(\.button\.primary, \.mobile-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\), \.mobile-auth-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\)\)\s*\{/s);
  assert.match(communityPage, /\/app\/portal-polish\.css\?v=52/);
});

test('community report location method buttons retain their theme colors', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'app', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'community.html'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'app', 'portal-polish.css'), 'utf8');

  assert.match(communityScript, /class="mobile-segment \$\{locationMode === 'map' \? 'active' : ''\}" data-action="set-report-location-mode" data-value="map">Map<\/button>/);
  assert.match(communityScript, /class="mobile-segment \$\{locationMode === 'address' \? 'active' : ''\}" data-action="set-report-location-mode" data-value="address">Address<\/button>/);
  assert.match(portalStyles, /body\.community-body \.mobile-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\)/);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\)/);
  assert.match(portalStyles, /body\.community-body \.mobile-tab\.active,\s*body\.community-body \.mobile-segment\.active\s*\{[^}]*color:\s*var\(--pw-primary\);/s);
  assert.match(communityPage, /\/app\/portal-polish\.css\?v=52/);
});

test('community home greeting stays legible over the Night Ops header', () => {
  const portalStyles = fs.readFileSync(path.join(ROOT, 'app', 'portal-polish.css'), 'utf8');

  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-home-greeting > span\s*\{[^}]*color:\s*#d3e6f5\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-home-greeting strong\s*\{[^}]*color:\s*#fff\s*!important;/s);
});

test('community notification panel preserves readable text in Light and Night Ops themes', () => {
  const portalStyles = fs.readFileSync(path.join(ROOT, 'app', 'portal-polish.css'), 'utf8');
  const baseStyles = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');

  assert.match(baseStyles, /\.notif-panel-title-row strong\s*\{[^}]*color:\s*#13395c;/s);
  assert.match(baseStyles, /\.notif-item-title\s*\{[^}]*color:\s*#173859;/s);
  assert.match(baseStyles, /\.notif-item-msg\s*\{[^}]*color:\s*#556e82;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.notif-panel-title-row strong\s*\{[^}]*color:\s*#f1f7ff\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.notif-item-title\s*\{[^}]*color:\s*#f1f7ff\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.notif-item-time,\s*body\.dark-mode\.community-body \.notif-item-msg\s*\{[^}]*color:\s*#c2d0e2\s*!important;/s);
  assert.doesNotMatch(portalStyles, /body\.community-body \.notif-item-title\s*\{/);
  assert.doesNotMatch(portalStyles, /body\.community-body \.notif-item-time,\s*body\.community-body \.notif-item-msg\s*\{/);
});

test('community theme toggle is an accessible icon-only control', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'app', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'community.html'), 'utf8');
  const themeToggleStart = communityScript.indexOf('function mobileThemeToggle()');
  const themeToggleEnd = communityScript.indexOf('\nfunction mobileNotificationPanelMarkup()', themeToggleStart);
  const themeToggle = communityScript.slice(themeToggleStart, themeToggleEnd);
  const portalStyles = fs.readFileSync(path.join(ROOT, 'app', 'portal-polish.css'), 'utf8');

  assert.ok(themeToggleStart >= 0);
  assert.ok(themeToggleEnd > themeToggleStart);
  assert.match(themeToggle, /class="mobile-theme-toggle"[^>]*aria-pressed="\$\{isDark\}" aria-label="\$\{label\}"/);
  assert.match(themeToggle, /<span id="theme-btn-icon" aria-hidden="true">\$\{isDark \? '☀️' : '🌙'\}<\/span>/);
  assert.doesNotMatch(themeToggle, /theme-btn-text|Night Ops<\/span>|Light<\/span>/);
  assert.match(portalStyles, /\.community-body \.mobile-theme-toggle\s*\{[^}]*width:\s*42px;[^}]*min-width:\s*42px;[^}]*min-height:\s*42px;/s);
  assert.match(communityPage, /\/app\/portal-polish\.css\?v=52/);
});

test('community bottom navigation shows accessible icon and text labels', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'app', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'community.html'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'app', 'portal-polish.css'), 'utf8');
  const navigationStart = communityScript.indexOf('<nav class="mobile-tabs"');
  const navigationEnd = communityScript.indexOf('</nav>', navigationStart);
  const navigationMarkup = communityScript.slice(navigationStart, navigationEnd);

  assert.ok(navigationStart >= 0);
  assert.ok(navigationEnd > navigationStart);
  assert.match(navigationMarkup, /aria-label="Main navigation"/);
  assert.match(navigationMarkup, /aria-current="\$\{activeTab === tab\.key \? 'page' : 'false'\}"/);
  assert.match(navigationMarkup, /class="mobile-tab-icon" aria-hidden="true"/);
  assert.match(navigationMarkup, /class="mobile-tab-label"/);
  assert.match(portalStyles, /body\.community-body \.mobile-tab\s*\{[^}]*grid-template-rows:\s*24px auto;[^}]*font-size:\s*0\.75rem;/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab\s*\{[^}]*background:\s*transparent !important;[^}]*box-shadow:\s*none !important;/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab\.active\s*\{[^}]*border-color:\s*transparent !important;[^}]*background:\s*transparent !important;[^}]*box-shadow:\s*none !important;[^}]*color:\s*#0b74d1 !important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-tab\.active\s*\{[^}]*border-color:\s*transparent !important;[^}]*background:\s*transparent !important;[^}]*color:\s*#67e8f9 !important;/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab:active\s*\{[^}]*transform:\s*scale\(\.94\);/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab:active\s*\{[^}]*color:\s*var\(--pw-accent\) !important;/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab:active \.mobile-tab-icon\s*\{[^}]*filter:\s*drop-shadow\(/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab:active::after\s*\{\s*background:\s*var\(--pw-accent\);/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab\.active::after\s*\{[^}]*transform:\s*translateX\(50%\) scaleX\(1\);/s);
  assert.match(portalStyles, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*body\.community-body \.mobile-tab,/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab-icon,\s*body\.community-body \.mobile-tab-icon svg\s*\{[^}]*width:\s*22px;[^}]*height:\s*22px;/s);
  assert.match(communityPage, /\/app\/community\.js\?v=27/);
  assert.match(communityPage, /\/app\/portal-polish\.css\?v=52/);
});
