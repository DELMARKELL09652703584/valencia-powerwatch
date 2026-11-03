const fs=require('fs');
const m=fs.readFileSync('app/main.js','utf8');
const idx = m.indexOf('function renderLogin');
const idx2 = m.indexOf('function renderAdminRestrictedAccess');
const func = m.substring(idx, idx2);
const p0 = func.split('app.innerHTML')[0];
console.log(p0);
console.log('===END===');
