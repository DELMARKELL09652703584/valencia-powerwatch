const fs = require('fs');
const main = fs.readFileSync('app/main.js','utf8');
const idx = main.indexOf('function renderLogin');
const idx2 = main.indexOf('function renderAdminRestrictedAccess');
const loginFunc = main.substring(idx, idx2);
console.log(loginFunc.includes('if (IS_ADMIN)'));
console.log(loginFunc.includes('login-form') || loginFunc.includes('login-page'));
console.log(loginFunc.indexOf('IS_ADMIN'));
console.log(loginFunc.indexOf('IS_COMMUNITY'));
