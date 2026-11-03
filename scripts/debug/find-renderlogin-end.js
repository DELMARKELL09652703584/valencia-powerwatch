const fs = require('fs');
const m = fs.readFileSync('app/main.js','utf8');
const idx = m.indexOf('function renderLogin');
const end = m.indexOf('function renderAdminRestrictedAccess');
const func = m.substring(idx, end);
console.log(func.slice(-400));
console.log('---');
console.log(func.includes('syncOAuthProviderControls()'));
