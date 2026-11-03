const fs=require('fs');
const m=fs.readFileSync('app/main.js','utf8');
const idx = m.indexOf('function renderLogin');
const idx2 = m.indexOf('function renderAdminRestrictedAccess');
const func = m.substring(idx, idx2);
console.log(func.split('app.innerHTML').length);
console.log(func.includes('syncOAuthProviderControls()'));
console.log(func.indexOf('syncOAuthProviderControls()'));
console.log(func.length);
