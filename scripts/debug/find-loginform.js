const fs=require('fs');
const m=fs.readFileSync('app/main.js','utf8');
const idx=m.indexOf('loginForm');
if(idx>=0) console.log(m.substring(idx-40, idx+150));
else console.log('none');
