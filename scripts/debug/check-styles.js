const fs = require('fs');
const s = fs.readFileSync('style.css','utf8');
console.log(s.includes('login-page'));
console.log((s.match(/login/g)||[]).length);
console.log(s.includes('.login-panel'));
console.log(s.includes('.login-art'));
console.log(s.includes('.form-stack'));
