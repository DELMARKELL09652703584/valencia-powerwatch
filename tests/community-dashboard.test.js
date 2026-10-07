const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');

test('community dashboard keeps personal notifications out of the home feed', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'app', 'community.js'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'community.html'), 'utf8');
  const homeRendererStart = communityScript.indexOf('async function renderMobileHome()');
  const homeRendererEnd = communityScript.indexOf('\nasync function renderMobileReportForm()', homeRendererStart);
  const homeRenderer = communityScript.slice(homeRendererStart, homeRendererEnd);

  assert.ok(homeRendererStart >= 0);
  assert.ok(homeRendererEnd > homeRendererStart);
  assert.doesNotMatch(homeRenderer, /\/api\/(?:notifications|announcements)/);
  assert.doesNotMatch(communityScript, /class="recent-updates"/);
  assert.match(communityPage, /\/app\/community\.js\?v=26/);
});
