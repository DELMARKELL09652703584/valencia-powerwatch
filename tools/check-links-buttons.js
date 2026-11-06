const fs = require('fs');
const path = require('path');

const filesToInspect = [
  'client/pages/community.html',
  'client/pages/staff.html',
  'client/pages/admin.html',
  'client/pages/download.html',
  'client/pages/index.html',
  'client/js/community/community.js',
  'client/js/staff/staff.js',
  'client/js/admin/admin.js',
  'client/js/shared/main.js',
  'client/js/shared/core.js',
  'client/js/community/chatbot.js'
];

console.log('=== CHECKING FOR BROKEN LINKS (# or javascript:void) ===');
for (const f of filesToInspect) {
  const content = fs.readFileSync(f, 'utf8');
  const brokenLinks = [...content.matchAll(/href=["'](#|javascript:void\(0\);?)["']/g)];
  if (brokenLinks.length > 0) {
    console.log(`${f}: ${brokenLinks.length} empty/dead hrefs found!`);
  }
}

console.log('\n=== CHECKING HTML PAGES FOR RAW BUTTONS WITHOUT ACTIONS ===');
const htmlPages = [
  'client/pages/community.html',
  'client/pages/staff.html',
  'client/pages/admin.html',
  'client/pages/download.html',
  'client/pages/index.html'
];
for (const p of htmlPages) {
  const content = fs.readFileSync(p, 'utf8');
  const buttons = [...content.matchAll(/<button\b([^>]*)>/g)];
  for (const b of buttons) {
    const attr = b[1];
    if (!attr.includes('data-action') && !attr.includes('type="submit"') && !attr.includes('data-staff-update') && !attr.includes('data-')) {
      console.log(`Potential orphan button in ${p}: ${b[0]}`);
    }
  }
}
console.log('HTML pages button check complete.');
