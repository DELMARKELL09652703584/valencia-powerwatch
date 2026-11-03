const fs=require('fs');
const s=fs.readFileSync('style.css','utf8');
const idx = s.indexOf('.password-control');
if(idx>=0) console.log(s.substring(idx, idx+200));
else console.log('no');
console.log('---');
console.log(s.includes('.admin-login-options'));
console.log(s.includes('.login-panel'));
