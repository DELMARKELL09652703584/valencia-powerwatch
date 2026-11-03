const fs=require('fs');
const m=fs.readFileSync('app/main.js','utf8');
const idx = m.indexOf('function renderLogin');
const idx2 = m.indexOf('function renderAdminRestrictedAccess');
const func = m.substring(idx, idx2);
const pos = func.indexOf('admin-login-art');
console.log(func.substring(pos-60, pos+150));
console.log('===SEP===');
console.log(func.substring(pos+150, pos+350));
