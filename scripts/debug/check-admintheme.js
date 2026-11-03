const fs=require('fs');
const s=fs.readFileSync('app/admin-theme.css','utf8');
console.log(s.includes('login-page'));
console.log(s.includes('login-panel'));
console.log(s.includes('form-stack'));
console.log(s.includes('.login-art'));
console.log(s.includes('.admin-login-art'));
console.log(s.length);
