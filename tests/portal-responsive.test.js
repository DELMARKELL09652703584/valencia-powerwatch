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
  assert.match(styles, /@media \(max-width: 360px\)\s*\{\s*body\.admin-body \.login-page\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);/s);
  assert.match(styles, /body\.admin-body \.login-page \.social-row\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
  assert.match(communityPage, /\/app\/portal-polish\.css\?v=48/);
  assert.match(adminPage, /\/app\/portal-polish\.css\?v=37/);
});
