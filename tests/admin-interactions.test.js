const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');

test('SCADA Verify in Queue dismisses its banner and opens the verification queue', () => {
  const adminScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'admin', 'admin.js'), 'utf8');
  const mainScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'main.js'), 'utf8');
  const button = adminScript.match(/<button[^>]*class="button small primary scada-banner-cta"[^>]*>[\s\S]*?Verify in Queue[\s\S]*?<\/button>/)?.[0];

  assert.ok(button);
  assert.match(button, /data-action="verify-in-queue"/);
  assert.doesNotMatch(button, /data-page=/);
  assert.match(mainScript, /case 'verify-in-queue':\s*\{[\s\S]*?banner\.classList\.add\('fading'\);[\s\S]*?setTimeout\(\(\) => banner\.remove\(\), 250\);[\s\S]*?goToPage\('verification'\);[\s\S]*?return;/);
});

test('Admin portal UX includes loading states and inline feedback for async actions', () => {
  const adminStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'admin-theme.css'), 'utf8');
  const adminApp = fs.readFileSync(path.join(ROOT, 'client', 'js', 'admin', 'admin.js'), 'utf8');
  const mainApp = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'main.js'), 'utf8');

  // Loading state styles
  assert.match(adminStyles, /\.admin-btn--loading\s*\{/s);
  assert.match(adminStyles, /\.admin-inline-feedback\s*\{/s);
  assert.match(adminStyles, /\.admin-inline-success\s*\{/s);
  assert.match(adminStyles, /\.admin-inline-error\s*\{/s);
  assert.match(adminStyles, /@keyframes\s+admin-slideDown/);

  // Inline feedback element in staff-membership form
  assert.match(adminApp, /data-staff-membership-feedback/);

  // Loading state handling in main.js
  assert.match(mainApp, /admin-btn--loading/);
  assert.match(mainApp, /classList\.add\('admin-btn--loading'\)/);
  assert.match(mainApp, /classList\.remove\('admin-btn--loading'\)/);

  // Inline feedback rendering in admin.js
  assert.match(adminApp, /admin-inline-success/);
  assert.match(adminApp, /admin-inline-error/);
  assert.match(adminApp, /setAttribute\('open', ''\)/);

  // Mutation actions have loading states
  assert.match(mainApp, /case 'toggle-user-status'/);
  assert.match(mainApp, /case 'delete-user'/);
  assert.match(mainApp, /case 'toggle-barangay-status'/);
  assert.match(mainApp, /case 'dispatch-update-status'/);
  assert.match(mainApp, /case 'update-repair-team-gps'/);
  assert.match(mainApp, /case 'toggle-admin-notification'/);
  assert.match(mainApp, /case 'announcement-status'/);
  assert.match(mainApp, /case 'delete-announcement'/);
  assert.match(mainApp, /case 'save-list'/);
  assert.match(mainApp, /case 'trigger-incident'/);
  assert.match(mainApp, /case 'clear-audit-logs'/);
  assert.match(mainApp, /case 'toggle-outage-category'/);
  assert.match(mainApp, /admin-btn--loading/);
  assert.match(mainApp, /classList\.add\('admin-btn--loading'\)/);
  assert.match(mainApp, /classList\.remove\('admin-btn--loading'\)/);

  // Staff-membership submit has loading + inline feedback
  assert.match(adminApp, /admin-btn--loading/);
  assert.match(adminApp, /admin-inline-success/);
  assert.match(adminApp, /admin-inline-error/);
});

test('refreshConfig requests settings from /api/auth/settings, not /api/settings', () => {
  const mainApp = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'main.js'), 'utf8');
  assert.match(mainApp, /api\('\/api\/auth\/settings'\)/);
  assert.doesNotMatch(mainApp, /api\('\/api\/settings'\)/);
});

test('delete-announcement disables the delete-announcement button, not announcement-status', () => {
  const mainApp = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'main.js'), 'utf8');
  assert.match(mainApp, /case 'delete-announcement':/);
  const deleteBlock = mainApp.match(/case 'delete-announcement':[\s\S]*?case 'new-user':/)?.[0];
  assert.ok(deleteBlock, 'delete-announcement case block found');
  assert.match(deleteBlock, /data-action="delete-announcement"\]\[data-id/);
  assert.doesNotMatch(deleteBlock, /data-action="announcement-status"\]\[data-id/);
});
