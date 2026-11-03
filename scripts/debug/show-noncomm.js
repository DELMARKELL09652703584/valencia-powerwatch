const fs = require('fs');
const main = fs.readFileSync('app/main.js','utf8');
const idx = main.indexOf('function renderLogin');
const idx2 = main.indexOf('function renderAdminRestrictedAccess');
const func = main.substring(idx, idx2);
const adminBranch = func.indexOf('if (IS_COMMUNITY)');
console.log(adminBranch);
if(adminBranch >= 0) {
  console.log(func.substring(adminBranch, adminBranch+500));
}
