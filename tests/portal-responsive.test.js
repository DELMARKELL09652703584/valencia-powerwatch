const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');

test('portal theme stylesheet keeps mobile home actions styled in both themes', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'app', 'portal-polish.css'), 'utf8');

  assert.match(styles, /body\.community-body \.home-report-action\s*\{/);
  assert.match(styles, /body\.community-body \.home-track-action svg\s*\{[^}]*width:\s*20px;[^}]*height:\s*20px;[^}]*fill:\s*none;/s);
  assert.match(styles, /body\.community-body \.home-shortcut-icon svg\s*\{[^}]*width:\s*19px;[^}]*height:\s*19px;/s);
});

test('portal layouts remain constrained on narrow mobile screens', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'app', 'portal-polish.css'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'community.html'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');

  assert.match(styles, /@media \(max-width: 600px\)\s*\{\s*body\.community-body \.mobile-home-header\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s);
  assert.match(styles, /@media \(max-width: 600px\)\s*\{\s*body\.community-body \.mobile-home-header\s*\{[^}]*gap:\s*4px;[^}]*padding:\s*6px 14px 8px;/s);
  assert.match(styles, /@media \(max-width: 360px\)\s*\{\s*body\.admin-body \.login-page\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);/s);
  assert.match(styles, /body\.admin-body \.login-page \.social-row\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
  assert.match(communityPage, /\/app\/portal-polish\.css\?v=68/);
  assert.match(adminPage, /\/app\/portal-polish\.css\?v=38/);
});

test('Admin login design adapts to mobile and Night Ops themes', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'app', 'admin-theme.css'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');

  assert.match(styles, /body\.admin-body \.login-page \.login-panel \.login-content\s*\{[^}]*border-radius:\s*22px;[^}]*background:\s*#fff;/s);
  assert.match(styles, /body\.dark-mode\.admin-body \.login-page \.login-panel \.login-content\s*\{[^}]*background:\s*var\(--pw-panel\);/s);
  assert.match(styles, /@media \(max-width: 900px\)\s*\{[\s\S]*?body\.admin-body \.login-page \.login-panel\s*\{[^}]*margin-top:\s*-22px;/);
  assert.match(styles, /@media \(max-width: 600px\)\s*\{[\s\S]*?body\.admin-body \.login-page \.login-panel \.login-content\s*\{[^}]*padding:\s*27px 21px;/);
  assert.match(styles, /body\.admin-body \.login-page \.login-panel \.admin-login-options input\[type="checkbox"\]\s*\{[^}]*width:\s*18px;[^}]*height:\s*18px;[^}]*min-height:\s*18px;/s);
  assert.match(adminPage, /\/app\/admin-theme\.css\?v=6/);
});

test('Admin dashboard report charts use live data and remain responsive in both themes', () => {
  const adminScript = fs.readFileSync(path.join(ROOT, 'app', 'admin.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'app', 'admin-theme.css'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');

  assert.match(adminScript, /api\('\/api\/analytics\/dashboard-report-distribution'\)/);
  assert.match(adminScript, /item\.count \/ total/);
  assert.match(adminScript, /data-report-status-detail aria-live="polite"/);
  assert.match(adminScript, /Loading report analytics/);
  assert.match(adminScript, /Could not load report analytics/);
  assert.match(adminScript, /No outage reports yet/);
  assert.match(adminScript, /Date\.now\(\) - lastReportDistributionRefreshAt >= 30000/);
  assert.match(styles, /@media \(max-width: 600px\)\s*\{[\s\S]*?\.report-status-chart-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  assert.match(styles, /body\.dark-mode\.admin-body \.report-distribution-panel/);
  assert.match(adminPage, /\/app\/admin-theme\.css\?v=6/);
  assert.match(adminPage, /\/app\/admin\.js\?v=32/);
});

test('home weather widget stays compact in Light Mode and Night Ops', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'app', 'portal-polish.css'), 'utf8');

  assert.match(styles, /body\.community-body \.home-dashboard \.mobile-weather\s*\{[^}]*min-height:\s*0;[^}]*gap:\s*7px;[^}]*padding:\s*6px 10px;[^}]*border-radius:\s*999px;/s);
  assert.match(styles, /body\.community-body \.home-dashboard \.mobile-weather-copy\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*baseline;/s);
  assert.match(styles, /body\.community-body \.home-dashboard \.mobile-weather-copy small\s*\{\s*display:\s*none;/s);
  assert.match(styles, /body\.dark-mode\.community-body \.home-dashboard \.mobile-weather\s*\{[^}]*background:\s*var\(--pw-panel\)\s*!important;/s);
});

test('Night Ops outage trends toggle stays on the right when its text wraps', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'app', 'portal-polish.css'), 'utf8');

  assert.match(styles, /body\.dark-mode\.community-body \.home-trends > summary\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;[^}]*grid-template-rows:\s*auto auto;/s);
  assert.match(styles, /body\.dark-mode\.community-body \.home-trends > summary::after\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1 \/ span 2;[^}]*justify-self:\s*end;/s);
});

test('Admin route guide text remains readable in dark mode', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'app', 'portal-polish.css'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
  const coreScript = fs.readFileSync(path.join(ROOT, 'app', 'core.js'), 'utf8');

  assert.match(coreScript, /Navigation Route Guide/);
  assert.match(styles, /body\.dark-mode\.admin-body \.map-route-hud\s*\{[^}]*background:\s*rgba\(13,\s*25,\s*44,\s*\.98\);/s);
  assert.match(styles, /body\.dark-mode\.admin-body \.map-route-hud-endpoints :where\(span, strong\)\s*\{[^}]*color:\s*#d2deee\s*!important;/s);
  assert.match(styles, /body\.dark-mode\.admin-body \.map-route-hud-details :where\(span, strong\)\s*\{[^}]*color:\s*#bfdbfe\s*!important;/s);
  assert.match(styles, /body\.dark-mode\.admin-body \.map-route-hud \.map-route-hud-btn:not\(\.secondary\) :where\(span\)\s*\{\s*color:\s*#fff\s*!important;/s);
  assert.match(adminPage, /\/app\/portal-polish\.css\?v=38/);
});

test('route guide is draggable, viewport-bounded, collapsible, and remembers its position', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  const coreScript = fs.readFileSync(path.join(ROOT, 'app', 'core.js'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'community.html'), 'utf8');

  assert.match(styles, /\.map-route-hud\s*\{[^}]*position:\s*fixed;[^}]*max-height:\s*calc\(100dvh - 16px\);/s);
  assert.match(styles, /\.map-route-hud-header\s*\{[^}]*touch-action:\s*none;/s);
  assert.match(styles, /\.map-route-hud-content\[hidden\]\s*\{\s*display:\s*none;/s);
  assert.match(coreScript, /ROUTE_GUIDE_POSITION_KEY\s*=\s*'powerwatch-route-guide-position'/);
  assert.match(coreScript, /header\.addEventListener\('pointerdown'/);
  assert.match(coreScript, /header\.addEventListener\('pointermove'/);
  assert.match(coreScript, /header\.addEventListener\('pointerup'/);
  assert.match(coreScript, /clampRouteGuidePosition/);
  assert.match(coreScript, /data-route-guide-minimize/);
  assert.match(coreScript, /data-action="sim-crew-dispatch"/);
  assert.match(coreScript, /<span>🚀 Crew Tracker<\/span>/);
  assert.match(coreScript, /data-action="clear-route-guide"/);
  assert.match(adminPage, /\/app\/core\.js\?v=23/);
  assert.match(communityPage, /\/app\/core\.js\?v=23/);
});

test('route guide card is compact while keeping actions easy to tap', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');

  assert.match(styles, /\.map-route-hud\s*\{[^}]*width:\s*min\(300px,\s*calc\(100vw - 16px\)\);[^}]*height:\s*170px;[^}]*padding:\s*6px 7px;/s);
  assert.match(styles, /\.map-route-hud-btn\s*\{[^}]*min-height:\s*28px;[^}]*font-size:\s*0\.64rem;/s);
  assert.match(styles, /\.map-route-hud\.is-minimized\s*\{\s*height:\s*auto;/);
});

test('Admin map removes the top barangay finder and keeps sidebar map focus', () => {
  const adminScript = fs.readFileSync(path.join(ROOT, 'app', 'admin.js'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');

  assert.doesNotMatch(adminScript, /Find a barangay|data-map-focus|power-map-focus/);
  assert.match(adminScript, /id="map-fly-select"/);
  assert.match(adminPage, /\/app\/admin\.js\?v=32/);
});

test('Admin notifications use readable theme-specific unread colors', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');

  assert.match(styles, /body\.admin-body:not\(\.dark-mode\) \.admin-notification-panel \.notification-panel-item\.unread\s*\{[^}]*background:\s*#f1f7ff\s*!important;/s);
  assert.match(styles, /body\.admin-body:not\(\.dark-mode\) \.admin-notification-panel \.notification-panel-open strong\s*\{[^}]*color:\s*#173859\s*!important;/s);
  assert.match(styles, /body\.admin-body:not\(\.dark-mode\) \.admin-notification-panel \.notification-panel-open > span\s*\{[^}]*color:\s*#425b73\s*!important;/s);
  assert.match(styles, /body\.dark-mode\.admin-body \.admin-notification-panel \.notification-panel-open strong\s*\{[^}]*color:\s*#f1f5ff\s*!important;/s);
  assert.match(adminPage, /\/style\.css\?v=44/);
});

test('dispatch eligibility offers a direct path to staff access settings', () => {
  const mainScript = fs.readFileSync(path.join(ROOT, 'app', 'main.js'), 'utf8');

  assert.match(mainScript, /data-action="open-staff-access">Open Manage Staff Team Access/);
  assert.match(mainScript, /case 'open-staff-access':\s*\{\s*closeDialog\(\);\s*await goToPage\('dispatch'\);/);
  assert.match(mainScript, /staffAccess\.open = true;/);
});
