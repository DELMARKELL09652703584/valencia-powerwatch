const fs=require('fs');
const m=fs.readFileSync('app/main.js','utf8');
const idx = m.indexOf('function renderLogin');
const idx2 = m.indexOf('function renderAdminRestrictedAccess');
const func = m.substring(idx, idx2);
const last = func.lastIndexOf('login-page');
const sync = func.indexOf('syncOAuthProviderControls()', last);
console.log(func.substring(last-10, sync+80));
