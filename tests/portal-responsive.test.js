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
  assert.match(communityPage, /\/app\/portal-polish\.css\?v=58/);
  assert.match(adminPage, /\/app\/portal-polish\.css\?v=38/);
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
