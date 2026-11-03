const fs = require('fs');
const main = fs.readFileSync('app/main.js','utf8');
const idx = main.indexOf('function renderLogin');
const idx2 = main.indexOf('function renderAdminRestrictedAccess');
const func = main.substring(idx, idx2);
const commEnd = func.indexOf('  syncOAuthProviderControls();\n    return;\n  }\n\n', 100);
if(commEnd > 0) {
  console.log(func.substring(commEnd+50, commEnd+650));
} else {
  // try simpler
  const m = func.match(/return;\n  }\n\n([\s\S]{0,700})/);
  if(m) console.log(m[1]);
}
