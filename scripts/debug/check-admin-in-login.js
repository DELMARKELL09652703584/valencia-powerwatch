const fs = require('fs');
const m = fs.readFileSync('app/main.js','utf8');
const idx = m.indexOf('function renderLogin');
const end = m.indexOf('function renderAdminRestrictedAccess');
const func = m.substring(idx, end);
const adminStart = func.indexOf('if (IS_ADMIN)');
if(adminStart === -1) {
  console.log('NO_ADMIN_CHECK');
  console.log('len', func.length);
} else {
  console.log('HAS_ADMIN_CHECK');
  console.log(func.substring(adminStart, adminStart+220));
}
