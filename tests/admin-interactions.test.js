const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');

test('SCADA Verify in Queue dismisses its banner and opens the verification queue', () => {
  const adminScript = fs.readFileSync(path.join(ROOT, 'app', 'admin.js'), 'utf8');
  const mainScript = fs.readFileSync(path.join(ROOT, 'app', 'main.js'), 'utf8');
  const button = adminScript.match(/<button[^>]*class="button small primary scada-banner-cta"[^>]*>[\s\S]*?Verify in Queue[\s\S]*?<\/button>/)?.[0];

  assert.ok(button);
  assert.match(button, /data-action="verify-in-queue"/);
  assert.doesNotMatch(button, /data-page=/);
  assert.match(mainScript, /case 'verify-in-queue':\s*\{[\s\S]*?banner\.classList\.add\('fading'\);[\s\S]*?setTimeout\(\(\) => banner\.remove\(\), 250\);[\s\S]*?goToPage\('verification'\);[\s\S]*?return;/);
});
