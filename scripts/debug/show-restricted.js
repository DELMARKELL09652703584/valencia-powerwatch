const fs=require('fs');
const m=fs.readFileSync('app/main.js','utf8');
const idx = m.indexOf('function renderAdminRestrictedAccess');
console.log(m.substring(idx, idx+300));
