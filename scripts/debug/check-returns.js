const fs=require('fs');
const m=fs.readFileSync('app/main.js','utf8');
const idx = m.indexOf('function renderLogin');
const idx2 = m.indexOf('function renderAdminRestrictedAccess');
const func = m.substring(idx, idx2);
console.log(func.split('    return;').length);
console.log(func.split('  return;').length);
console.log(func.split('return;').length);
console.log(func.match(/return;/g)?.length);
