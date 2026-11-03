const fs = require('fs');
const main = fs.readFileSync('app/main.js','utf8');
const idx = main.indexOf('function renderLogin');
const idx2 = main.indexOf('function renderAdminRestrictedAccess');
const func = main.substring(idx, idx2);
// Look for pattern after community block
const marker = "syncOAuthProviderControls();\n    return;";
const m = func.indexOf(marker);
if(m >= 0) {
  console.log(func.substring(m+marker.length, m+marker.length+400));
}
