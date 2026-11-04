const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');

test('community dashboard shows public updates without exposing personal notifications', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');
  const homeRendererStart = communityScript.indexOf('async function renderMobileHome()');
  const homeRendererEnd = communityScript.indexOf('\nasync function renderMobileReportForm()', homeRendererStart);
  const homeRenderer = communityScript.slice(homeRendererStart, homeRendererEnd);

  assert.ok(homeRendererStart >= 0);
  assert.ok(homeRendererEnd > homeRendererStart);
  assert.doesNotMatch(homeRenderer, /\/api\/notifications/);
  assert.match(homeRenderer, /\/api\/announcements/);
  assert.match(homeRenderer, /class="recent-updates"/);
  assert.match(communityPage, /\/client\/js\/community\/community\.js\?v=\d+/);
  assert.match(communityPage, /\/client\/js\/shared\/main\.js\?v=\d+/);
  assert.match(communityPage, /\/client\/css\/portal-polish\.css\?v=\d+/);
  assert.match(communityPage, /\/style\.css\?v=51/);
  assert.match(portalStyles, /body\.community-body \.home-report-action\s*\{/);
  assert.match(portalStyles, /body\.community-body \.home-track-action svg\s*\{[^}]*width:\s*20px;[^}]*height:\s*20px;[^}]*fill:\s*none;/s);
  assert.match(portalStyles, /@media \(max-width: 600px\)\s*\{\s*body\.community-body \.mobile-home-header\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s);
});

test('community outage list keeps barangay scope and supports an explicit city-wide view', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const mainScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'main.js'), 'utf8');
  const helperStart = communityScript.indexOf('function filterMobileIncidentsByBarangay(');
  const helperEnd = communityScript.indexOf('\nasync function renderMobileOutages()', helperStart);
  const helperSource = communityScript.slice(helperStart, helperEnd);
  const filterIncidents = vm.runInNewContext(`${helperSource}; filterMobileIncidentsByBarangay`);
  const incidents = [
    { id: 1, barangay: 'Centro', affected_barangays: ['Centro', 'Poblacion'] },
    { id: 2, barangay: 'Lourdes', affected_barangays: ['Lourdes'] },
    { id: 3, barangay: 'Poblacion' },
  ];

  assert.ok(helperStart >= 0);
  assert.ok(helperEnd > helperStart);
  assert.deepEqual(Array.from(filterIncidents(incidents, 'poblacion')).map((incident) => incident.id), [1, 3]);
  assert.deepEqual(Array.from(filterIncidents(incidents, 'No Match')).map((incident) => incident.id), []);
  assert.deepEqual(Array.from(filterIncidents(incidents, '', true)).map((incident) => incident.id), [1, 2, 3]);
  assert.match(communityScript, /const list = filterMobileIncidentsByBarangay\(incidents, scopeBarangay, showingAllBarangays\);/);
  assert.doesNotMatch(communityScript, /scoped\.length \? scoped : incidents/);
  assert.match(mainScript, /case 'clear-mobile-scope':\s*state\.filters\.mobileBarangay = 'all';/);
  assert.match(mainScript, /case 'set-mobile-my-scope':\s*state\.filters\.mobileBarangay = 'mine';/);
});

test('report submission announces progress and errors without discarding the draft', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const mainScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'main.js'), 'utf8');
  const submitHandlerStart = mainScript.indexOf("document.addEventListener('submit', async (event) => {");
  const submitHandlerEnd = mainScript.indexOf("\ndocument.addEventListener('change', async (event) => {", submitHandlerStart);
  const submitHandler = mainScript.slice(submitHandlerStart, submitHandlerEnd);
  const reportSubmitStart = mainScript.indexOf("if (type === 'report') {");
  const reportSubmitEnd = mainScript.indexOf("\n  if (type === 'settings-info')", reportSubmitStart);
  const reportSubmit = mainScript.slice(reportSubmitStart, reportSubmitEnd);

  assert.match(communityScript, /data-form="report" aria-busy="false"/);
  assert.match(communityScript, /data-form-feedback role="status" aria-live="polite" aria-atomic="true" tabindex="-1" hidden/);
  assert.match(communityScript, /<button class="button primary" type="submit">Confirm &amp; submit report<\/button>/);
  assert.match(submitHandler, /if \(form\.dataset\.submitting === 'true'\) return;/);
  assert.match(submitHandler, /form\.setAttribute\('aria-busy', 'true'\)/);
  assert.match(submitHandler, /Submitting your report… Please wait\./);
  assert.match(submitHandler, /feedback\.setAttribute\('role', 'alert'\)/);
  assert.match(submitHandler, /feedback\.setAttribute\('aria-live', 'assertive'\)/);
  assert.match(submitHandler, /feedback\.focus\(\)/);
  assert.match(submitHandler, /Your entered details are still here; please try again\./);
  assert.ok(reportSubmit.indexOf("await api('/api/reports'") < reportSubmit.indexOf('state.mobileReportDraft = null;'));
});

test('home report action shows a visible label and retains an accessible name', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');
  const reportsStart = communityScript.indexOf('async function renderMobileReports()');
  const reportsEnd = communityScript.indexOf('\nasync function renderMobileReportDetail()', reportsStart);
  const reportsRenderer = communityScript.slice(reportsStart, reportsEnd);

  assert.ok(reportsStart >= 0);
  assert.ok(reportsEnd > reportsStart);
  assert.match(reportsRenderer, /<button[^>]*data-action="compose-report"[^>]*>/);
  assert.match(reportsRenderer, /Report an interruption/);
  assert.match(portalStyles, /body\.community-body \.home-report-label\s*\{[^}]*font-size:\s*15px;[^}]*font-weight:\s*750;/s);
  assert.match(portalStyles, /body\.community-body \.home-report-icon\s*\{[^}]*width:\s*28px;[^}]*height:\s*28px;[^}]*stroke:\s*currentColor;/s);
});

test('resident navigation exposes reporting, announcements, and outage history', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const mainScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'main.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');

  assert.match(communityScript, /key: 'reports',\s*label: 'Reports'/);
  assert.match(communityScript, /label: 'Announcements'.*action: 'open-announcements'/);
  assert.match(communityScript, /label: 'Outage history'.*tab: 'history'/);
  assert.match(mainScript, /case 'open-announcements':\s*state\.mobileNotificationCategory = 'announcements';\s*await goToTab\('notifications'\)/);
  assert.match(mainScript, /data-action="retry-current-tab"/);
  assert.match(mainScript, /case 'retry-current-tab':\s*await goToTab\(state\.mobileTab\)/);
  assert.match(communityPage, /portal-polish\.css\?v=89/);
  assert.match(communityPage, /community\.js\?v=48/);
  assert.match(communityPage, /main\.js\?v=48/);
  assert.match(mainScript, /coordinates shown above will be included with your location description/);
  assert.match(mainScript, /case 'open-notification-settings':\s*state\.mobileNotificationSettingsReturnTab = state\.mobileTab;/);
  assert.match(mainScript, /case 'back-from-notification-settings':\s*await goToTab\(state\.mobileNotificationSettingsReturnTab \|\| 'settings'\)/);
  assert.match(communityScript, /backAction: 'back-from-notification-settings'/);
  assert.match(mainScript, /state\.mobileReportDraft = null;\s*state\.mobileReportStep = 1;\s*state\.mobileLocationMode = 'address';/);
  assert.match(mainScript, /case 'compose-report':\s*state\.mobileReportStep = 1;\s*state\.mobileReportDraft = \{\};\s*state\.mobileLocationMode = 'address';/);
  assert.match(mainScript, /async function goToTab\(tab\) \{[\s\S]*?state\.mobileTab === 'report'[\s\S]*?state\.mobileReportDraft = \{ \.\.\.\(state\.mobileReportDraft \|\| \{\}\), \.\.\.values \};[\s\S]*?state\.mobileTab = tab;/);
});

test('report form starts with a text location and offers the map as an alternative', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');

  assert.match(communityScript, /const locationMode = state\.mobileLocationMode \|\| 'address';/);
  assert.match(communityScript, /location-mode-\$\{locationMode\}/);
  assert.match(communityScript, /const stepNames = \['Details', 'Location', 'Evidence', 'Review'\];/);
  assert.match(communityScript, /if \(step === 1\) \{\s*formBody = `<h2>Interruption Details<\/h2>/);
  assert.match(communityScript, /if \(step === 2\) \{\s*formBody = `<h2>Location<\/h2>/);
  assert.match(communityScript, /activeTab: 'report',\s*showTabs: true/);
  assert.match(communityScript, /Tell us when the interruption started and what you noticed\./);
  assert.match(communityScript, /Specific purok or sitio <span class="muted small">\(optional\)<\/span>/);
  assert.match(communityScript, /Choose your barangay and describe the location\./);
  assert.match(communityScript, /Choose a barangay from the official suggestions before continuing\./);
  assert.match(communityScript, /Describe the outage location, or add a map pin before continuing\./);
  assert.match(communityScript, /Barangay where the interruption happened/);
  assert.match(communityScript, /Other affected streets or sitios <span class="muted small">\(optional\)<\/span>/);
  assert.match(communityScript, /if \(step === 2 && locationMode === 'map'\) \{\s*await ensureLeaflet\(\)/);
  assert.match(communityScript, /\$\{locationMode === 'map' \? '<button type="button" class="button ghost block" data-action="capture-gps"/);
  assert.match(portalStyles, /report-step-form\.location-mode-address #report-location-map\s*\{\s*display:\s*none;/);
  assert.match(portalStyles, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
});

test('community map uses exact outage coordinates and functional base-layer controls', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const mainScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'main.js'), 'utf8');
  const mapStart = communityScript.indexOf('async function renderMobileMap()');
  const mapEnd = communityScript.indexOf('\nfunction filterMobileNotifications', mapStart);
  const mapRenderer = communityScript.slice(mapStart, mapEnd);

  assert.ok(mapStart >= 0);
  assert.ok(mapEnd > mapStart);
  assert.match(mapRenderer, /const coordinatesFor = \(item\) => hasCoordinates\(item\)\s*\? \[Number\(item\.latitude\), Number\(item\.longitude\)\]\s*: null;/);
  assert.match(mapRenderer, /const reportCoordinatesFor = \(report\) => hasCoordinates\(report\) && Number\(report\.location_confirmed\) === 1/);
  assert.doesNotMatch(mapRenderer, /barangayLocations/);
  assert.match(mapRenderer, /No active incidents or confirmed open reports have exact mappable coordinates yet\./);
  assert.match(mapRenderer, /Reported: \$\{escapeHtml\(formatDate\(rep\.reported_at\)\)\}/);
  assert.match(mapRenderer, /Incident started: \$\{escapeHtml\(formatDate\(incident\.start_time\)\)\}/);
  assert.match(mapRenderer, /https:\/\/\{s\}\.tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  assert.match(mapRenderer, /World_Imagery\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}/);
  assert.match(mainScript, /case 'set-mobile-map-mode':[\s\S]*?powerwatch\.mobile-map-mode/);
  assert.match(mainScript, /case 'set-mobile-map-layer':[\s\S]*?powerwatch\.mobile-map-layer/);
});

test('community report location remains readable in Night Ops mode', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');

  assert.match(communityScript, /class="stepper"/);
  assert.match(communityScript, /id="report-assigned-barangay-badge"/);
  assert.match(communityScript, /id="assigned-barangay-name"/);
  assert.match(communityScript, /class="mobile-gps"/);
  assert.match(communityPage, /\/client\/css\/portal-polish\.css\?v=\d+/);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.stepper \.step > span:last-child\s*\{[^}]*color:\s*var\(--pw-body\)\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.stepper \.step\.active \.step-number\s*\{[^}]*background:\s*var\(--pw-primary\);/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body #report-assigned-barangay-badge\s*\{[^}]*background:\s*#10352b\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-gps\s*\{[^}]*background:\s*var\(--pw-panel\);/s);
});

test('community report review notices have readable Night Ops colors', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');

  assert.match(communityScript, /class="possible-duplicate-notice is-unavailable"/);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.possible-duplicate-notice\.is-unavailable\s*\{[^}]*background:\s*#3a211e\s*!important;[^}]*color:\s*#ffd2c8\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.possible-duplicate-notice\.is-unavailable p\s*\{[^}]*color:\s*#f0c9c0\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.possible-duplicate-notice,\s*body\.dark-mode\.community-body \.possible-duplicate-clear\s*\{[^}]*background:\s*#332a1a\s*!important;/s);
  assert.match(communityPage, /\/client\/css\/portal-polish\.css\?v=\d+/);
});

test('community report review keeps the Back button label visible in both themes', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');

  assert.match(communityScript, /class="button ghost" data-action="previous-report-step">Back<\/button>/);
  assert.match(portalStyles, /body\.community-body \.mobile-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\):not\(\.report-evidence-picker\),\s*body\.community-body \.mobile-auth-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\)\s*\{\s*color:\s*#fff\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\):not\(\.report-evidence-picker\),\s*body\.dark-mode\.community-body \.mobile-auth-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\)\s*\{/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \:is\(\.button\.primary, \.mobile-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\):not\(\.report-evidence-picker\), \.mobile-auth-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\)\)\s*\{/s);
  assert.match(communityPage, /\/client\/css\/portal-polish\.css\?v=\d+/);
});

test('community report location method buttons retain their theme colors', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');

  assert.match(communityScript, /class="mobile-segment \$\{locationMode === 'map' \? 'active' : ''\}" data-action="set-report-location-mode" data-value="map">Map pin<\/button>/);
  assert.match(communityScript, /class="mobile-segment \$\{locationMode === 'address' \? 'active' : ''\}" data-action="set-report-location-mode" data-value="address">Address<\/button>/);
  assert.match(portalStyles, /body\.community-body \.mobile-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\)/);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-form button:not\(\.button\.ghost\):not\(\.button\.secondary\):not\(\.mobile-segment\)/);
  assert.match(portalStyles, /body\.community-body \.mobile-tab\.active,\s*body\.community-body \.mobile-segment\.active\s*\{[^}]*color:\s*var\(--pw-primary\);/s);
  assert.match(communityPage, /\/client\/css\/portal-polish\.css\?v=\d+/);
});

test('community home greeting stays legible in Light and Night Ops themes', () => {
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');

  assert.match(portalStyles, /body\.community-body:not\(\.dark-mode\) \.mobile-home-greeting > span\s*\{[^}]*color:\s*#5c7185 !important;/s);
  assert.match(portalStyles, /body\.community-body:not\(\.dark-mode\) \.mobile-home-greeting strong\s*\{[^}]*color:\s*#173752 !important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-home-greeting > span\s*\{[^}]*color:\s*#d3e6f5\s*!important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-home-greeting strong\s*\{[^}]*color:\s*#fff\s*!important;/s);
});

test('report details activity, ETR, and feedback remain readable in Night Ops mode', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const baseStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'style.css'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');

  assert.match(communityScript, /class="mobile-etr-badge is-restored"/);
  assert.match(communityScript, /class="mobile-etr-badge is-pending"/);
  assert.match(communityScript, /class="mobile-card report-feedback-card"/);
  assert.match(baseStyles, /\.community-body \.mobile-etr-badge\.is-restored\s*\{[^}]*background:\s*#ecfdf5;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-report-timeline\s*\{[^}]*background:\s*var\(--pw-panel\);/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-etr-badge\.is-restored\s*\{[^}]*background:\s*#0d302b;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.report-feedback-question,\s*body\.dark-mode\.community-body \.report-feedback-rating-label\s*\{[^}]*color:\s*var\(--pw-text\);/s);
  assert.match(communityPage, /\/style\.css\?v=51/);
  assert.match(communityPage, /\/client\/css\/portal-polish\.css\?v=\d+/);
});

test('community notification panel preserves readable text in Light and Night Ops themes', () => {
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');
  const baseStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'style.css'), 'utf8');

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
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');
  const themeToggleStart = communityScript.indexOf('function mobileThemeToggle()');
  const themeToggleEnd = communityScript.indexOf('\nfunction mobileNotificationPanelMarkup()', themeToggleStart);
  const themeToggle = communityScript.slice(themeToggleStart, themeToggleEnd);
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');

  assert.ok(themeToggleStart >= 0);
  assert.ok(themeToggleEnd > themeToggleStart);
  assert.match(themeToggle, /class="mobile-theme-toggle"[^>]*aria-pressed="\$\{isDark\}" aria-label="\$\{label\}"/);
  assert.match(themeToggle, /<span id="theme-btn-icon" aria-hidden="true">\$\{isDark \? mobileIcon\('settings', 16\) : mobileIcon\('crew', 16\)\}<\/span>/);
  assert.doesNotMatch(themeToggle, /theme-btn-text|Night Ops<\/span>|Light<\/span>/);
  assert.match(portalStyles, /\.community-body \.mobile-theme-toggle\s*\{[^}]*width:\s*42px;[^}]*min-width:\s*42px;[^}]*min-height:\s*42px;/s);
  assert.match(communityPage, /\/client\/css\/portal-polish\.css\?v=\d+/);
});

test('community bottom navigation shows accessible icon and text labels', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');
  const navigationStart = communityScript.indexOf('<nav class="mobile-tabs"');
  const navigationEnd = communityScript.indexOf('</nav>', navigationStart);
  const navigationMarkup = communityScript.slice(navigationStart, navigationEnd);

  assert.ok(navigationStart >= 0);
  assert.ok(navigationEnd > navigationStart);
  assert.match(navigationMarkup, /aria-label="Main navigation"/);
  assert.match(navigationMarkup, /aria-current="\$\{activeTab === tab\.key \? 'page' : 'false'\}"/);
  assert.match(navigationMarkup, /class="mobile-tab-icon" aria-hidden="true"/);
  assert.match(navigationMarkup, /class="mobile-tab-label"/);
  assert.match(communityScript, /key: 'map',\s*label: 'Map'/);
  assert.match(communityScript, /key: 'profile',\s*label: 'Profile'/);
  assert.doesNotMatch(navigationMarkup, /data-mobile-tab="notifications"/);
  assert.match(communityScript, /function mobileNotificationBell\(\)[\s\S]*?data-action="toggle-mobile-notification-panel"[\s\S]*?aria-label="Notifications/);
  assert.match(communityScript, /data-action="view-all-mobile-notifications"/);
  assert.match(portalStyles, /body\.community-body #app > \.mobile-shell \.mobile-tabs\s*\{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab\s*\{[^}]*grid-template-rows:\s*24px auto;[^}]*font-size:\s*0\.75rem;/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab\s*\{[^}]*background:\s*transparent !important;[^}]*box-shadow:\s*none !important;/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab\.active\s*\{[^}]*border-color:\s*transparent !important;[^}]*background:\s*transparent !important;[^}]*box-shadow:\s*none !important;[^}]*color:\s*#0b74d1 !important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-tab\.active\s*\{[^}]*border-color:\s*transparent !important;[^}]*background:\s*transparent !important;[^}]*color:\s*#67e8f9 !important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-tab\.active \.mobile-tab-icon,\s*body\.dark-mode\.community-body \.mobile-tab\.active \.mobile-tab-label\s*\{\s*color:\s*#67e8f9 !important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-tab\.active::after\s*\{[^}]*background:\s*#67e8f9;[^}]*box-shadow:\s*0 0 7px rgba\(103, 232, 249, \.7\);/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab:active\s*\{[^}]*transform:\s*scale\(\.94\);/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab:active\s*\{[^}]*color:\s*var\(--pw-accent\) !important;/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab:active \.mobile-tab-icon\s*\{[^}]*filter:\s*drop-shadow\(/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab:active::after\s*\{\s*background:\s*var\(--pw-accent\);/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab\.active::after\s*\{[^}]*transform:\s*translateX\(50%\) scaleX\(1\);/s);
  assert.match(portalStyles, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*body\.community-body \.mobile-tab,/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab-icon,\s*body\.community-body \.mobile-tab-icon svg\s*\{[^}]*width:\s*22px;[^}]*height:\s*22px;/s);
  assert.match(communityPage, /\/client\/js\/community\/community\.js\?v=\d+/);
  assert.match(communityPage, /\/client\/css\/portal-polish\.css\?v=\d+/);
});

test('resident dashboard shows live summary counts and recent public updates', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const homeStart = communityScript.indexOf('async function renderMobileHome()');
  const homeEnd = communityScript.indexOf('\nasync function renderMobileReportForm()', homeStart);
  const homeRenderer = communityScript.slice(homeStart, homeEnd);

  assert.ok(homeStart >= 0);
  assert.ok(homeEnd > homeStart);
  assert.match(homeRenderer, /stats\.active_incidents/);
  assert.match(homeRenderer, /stats\.reports_pending/);
  assert.match(homeRenderer, /stats\.resolved_today/);
  assert.match(homeRenderer, /stats\.reports_total/);
  assert.match(homeRenderer, /api\('\/api\/announcements'\)/);
  assert.match(homeRenderer, /class="recent-updates"/);
  assert.match(homeRenderer, /data-action="view-all-mobile-notifications"/);
  assert.match(homeRenderer, /view-incident-details/);
  assert.match(homeRenderer, /view-schedule-details/);
});

test('Community login preserves the Valencia panorama backdrop and caches it for offline launch', () => {
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'style.css'), 'utf8');
  const worker = fs.readFileSync(path.join(ROOT, 'client', 'pwa', 'sw.js'), 'utf8');
  const loginRuleStart = styles.indexOf('.community-body .mobile-auth-page {');
  const loginRuleEnd = styles.indexOf('\n}', loginRuleStart);
  const loginRule = styles.slice(loginRuleStart, loginRuleEnd);

  assert.ok(loginRuleStart >= 0);
  assert.ok(loginRuleEnd > loginRuleStart);
  assert.match(loginRule, /url\('\/assets\/valencia-city-panorama\.jpg'\) center \/ cover no-repeat/);
  assert.match(worker, /'\/assets\/valencia-city-panorama\.jpg'/);
  assert.ok(worker.includes('/\\.(?:jpe?g|png|svg|webp|woff2?)$/.test(pathname)'));
  assert.ok(fs.existsSync(path.join(ROOT, 'client', 'assets', 'valencia-city-panorama.jpg')));
});

test('Community login uses the responsive branded card layout and preserves auth actions', () => {
  const mainScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'main.js'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');
  const loginStart = mainScript.indexOf('function renderLogin(');
  const loginEnd = mainScript.indexOf('\nfunction ', loginStart + 1);
  const loginRenderer = mainScript.slice(loginStart, loginEnd);

  assert.ok(loginStart >= 0);
  assert.ok(loginEnd > loginStart);
  assert.match(loginRenderer, /class="mobile-auth-page community-login-page"/);
  assert.match(loginRenderer, /class="community-login-hero"/);
  assert.match(loginRenderer, /class="community-login-hero-actions"[^>]*>\$\{mobileThemeToggle\(\)\}\$\{mobileInstallButton\(\)\}/);
  assert.match(loginRenderer, /class="mobile-auth-content community-login-card"/);
  assert.match(loginRenderer, /<input name="password" type="password"[^>]*autocomplete="current-password"/);
  assert.match(loginRenderer, /Login to your Valencia PowerWatch account/);
  assert.match(loginRenderer, /Email or Mobile Number/);
  assert.match(loginRenderer, /class="community-login-password-heading"[^>]*>[\s\S]*?data-action="forgot-password"/);
  assert.match(loginRenderer, /data-form="login"/);
  assert.match(loginRenderer, /data-action="toggle-password"/);
  assert.match(loginRenderer, /data-action="start-oauth"/);
  assert.match(loginRenderer, /Don't have an account\?[\s\S]*?data-action="go-register">Register/);
  assert.match(portalStyles, /body\.community-body \.community-login-page[^}]*100dvh/s);
  assert.match(portalStyles, /body\.community-body \.community-login-card\s*\{/);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.community-login-card,/);
  assert.match(portalStyles, /body\.community-body \.community-login-register\s*\{[^}]*background:\s*rgba\(255, 255, 255, \.96\);[^}]*color:\s*#102b45;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.community-login-register\s*\{[^}]*background:\s*rgba\(13, 25, 42, \.96\);[^}]*color:\s*#d2deee;/s);
  assert.match(portalStyles, /body\.community-body #app \.mobile-auth-page \.community-login-card \.mobile-auth-form \.mobile-auth-submit\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*52px;[^}]*background:\s*linear-gradient\(135deg,\s*#1688ed,\s*#0864c4\) !important;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body #app \.mobile-auth-page \.community-login-card \.mobile-auth-form \.mobile-auth-submit\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*#2563eb,\s*#087eac\) !important;/s);
  assert.match(portalStyles, /body\.community-body #app \.community-login-register > button\s*\{[^}]*min-height:\s*44px;[^}]*background:\s*transparent !important;[^}]*color:\s*#0879e5 !important;/s);
  assert.match(portalStyles, /body\.community-body #app \.community-login-register > button:focus-visible\s*\{[^}]*outline:\s*2px solid #0879e5;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body #app \.community-login-register > button\s*\{/);
  assert.match(portalStyles, /#app \.mobile-auth-page \.community-login-card \.mobile-auth-form \.community-login-password-heading > button\s*\{[^}]*color:\s*#17658f !important;/s);
  assert.match(portalStyles, /community-login-input-wrap input\s*\{[^}]*border:\s*0 !important;[^}]*background:\s*transparent !important;/s);
  assert.match(portalStyles, /env\(safe-area-inset-top\)/);
});

test('Community account creation uses the light mobile form design and preserves registration actions', () => {
  const mainScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'main.js'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');
  const registerStart = mainScript.indexOf('function renderRegister(');
  const registerEnd = mainScript.indexOf('\nconst ADMIN_PAGES', registerStart + 1);
  const registerRenderer = mainScript.slice(registerStart, registerEnd);

  assert.ok(registerStart >= 0);
  assert.ok(registerEnd > registerStart);
  assert.match(registerRenderer, /class="mobile-auth-page community-register-page"/);
  assert.match(registerRenderer, /class="mobile-auth-header community-register-header"/);
  assert.match(registerRenderer, /class="mobile-auth-content community-register-content"/);
  assert.match(registerRenderer, /class="mobile-auth-form community-register-form" data-form="register"/);
  assert.match(registerRenderer, /name="full_name"/);
  assert.match(registerRenderer, /name="email" type="email"/);
  assert.match(registerRenderer, /name="contact_number" type="tel"/);
  assert.match(registerRenderer, /name="barangay"/);
  assert.match(registerRenderer, /name="password" type="password" minlength="6"/);
  assert.match(registerRenderer, /name="confirm_password" type="password" minlength="6"/);
  assert.match(registerRenderer, /data-action="toggle-password"/);
  assert.match(registerRenderer, /data-action="start-oauth"/);
  assert.match(registerRenderer, /Already have an account\?[\s\S]*?data-action="back-login">Login/);
  assert.match(portalStyles, /body\.community-body \.community-register-page\s*\{[^}]*background:\s*#f2f7fc;/s);
  assert.match(portalStyles, /body\.community-body \.community-register-form > label > input,[\s\S]*?border-radius:\s*13px;[\s\S]*?background:\s*#fff;/s);
  assert.match(portalStyles, /body\.community-body \.community-register-form \.mobile-auth-submit\s*\{[^}]*background:\s*linear-gradient\(135deg, #1688ed, #0864c4\);/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.community-register-page/);
  assert.match(communityPage, /portal-polish\.css\?v=89/);
  assert.match(communityPage, /shared\/main\.js\?v=48/);
});

test('User Portal provides an accessible PWA install button', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');
  const mainScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'main.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');

  assert.match(communityScript, /function mobileInstallButton\(\)\s*\{[^}]*data-action="install-app"[^}]*aria-label="Install Valencia PowerWatch"/s);
  assert.match(communityScript, /data-action="install-app"[\s\S]*?<span>Install<\/span>/);
  assert.match(mainScript, /case 'install-app':\s*\{[\s\S]*?installPrompt\.prompt\(\)/);
  assert.match(mainScript, /window\.addEventListener\('beforeinstallprompt'/);
  assert.match(communityPage, /\/client\/js\/community\/community\.js\?v=\d+/);
  assert.match(communityPage, /\/client\/js\/community\/pwa-update\.js\?v=3/);
});

test('User Portal PWA is distinct from Staff and preserves its own cache during updates', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'client', 'pwa', 'manifest.json'), 'utf8'));
  const staffManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'client', 'pwa', 'staff-manifest.json'), 'utf8'));
  const worker = fs.readFileSync(path.join(ROOT, 'client', 'pwa', 'sw.js'), 'utf8');
  const staffWorker = fs.readFileSync(path.join(ROOT, 'client', 'pwa', 'staff-sw.js'), 'utf8');
  const pwaUpdate = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'pwa-update.js'), 'utf8');
  const server = fs.readFileSync(path.join(ROOT, 'server', 'index.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');
  const staffPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'staff.html'), 'utf8');

  assert.equal(manifest.start_url, '/community');
  assert.equal(manifest.scope, '/community');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.name, 'Valencia PowerWatch');
  assert.equal(manifest.id, '/community');
  assert.equal(staffManifest.name, 'Valencia PowerWatch Field');
  assert.equal(staffManifest.start_url, '/staff');
  assert.equal(staffManifest.scope, '/staff');
  assert.equal(staffManifest.id, '/staff');
  assert.notEqual(manifest.id, staffManifest.id);
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
  assert.ok(manifest.icons.every((icon) => !icon.src.includes('powerwatch-field-icon')));
  assert.ok(staffManifest.icons.every((icon) => icon.src.includes('powerwatch-field-icon')));
  assert.match(communityPage, /href="\/manifest\.json"/);
  assert.match(communityPage, /\/style\.css\?v=51/);
  assert.match(staffPage, /href="\/staff-manifest\.json"/);
  assert.match(staffPage, /rel="icon" type="image\/png" sizes="192x192" href="\/assets\/powerwatch-field-icon-192\.png"/);
  assert.match(staffPage, /rel="apple-touch-icon" sizes="180x180" href="\/assets\/powerwatch-field-icon-180\.png"/);
  assert.match(staffPage, /\/client\/js\/staff\/staff-pwa-update\.js\?v=1/);
  assert.ok(worker.includes("['/', '/index.html'"));
  assert.ok(worker.includes("'/client/js/community/community.js'"));
  assert.ok(!worker.includes("'/client/js/admin/admin.js'"));
  assert.ok(worker.includes("const COMMUNITY_CACHE_PREFIX = 'powerwatch-community-'"));
  assert.ok(worker.includes("name.startsWith(COMMUNITY_CACHE_PREFIX)"));
  assert.ok(!worker.includes("name.startsWith('powerwatch-')"));
  assert.ok(staffWorker.includes("key.startsWith('powerwatch-field-')"));
  assert.ok(!worker.includes("powerwatch-field-"));
  assert.match(pwaUpdate, /new URL\('\/community', window\.location\.origin\)/);
  assert.match(pwaUpdate, /existingRegistration\.scope !== userPortalScope/);
  assert.match(server, /Service-Worker-Allowed', '\/community'/);
  assert.match(server, /app\.get\('\/sw\.js'/);
  assert.match(server, /app\.get\('\/staff-sw\.js'/);
  assert.match(server, /Service-Worker-Allowed', '\/staff'/);
  assert.match(server, /Cache-Control', 'no-cache, must-revalidate'/);
});
