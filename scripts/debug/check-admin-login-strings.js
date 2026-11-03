const fs=require('fs'); 
const s=fs.readFileSync('app/main.js','utf8'); 
console.log(s.includes('login-form'));
console.log(s.includes('admin-login'));
console.log(s.includes('login-panel'));
console.log(s.includes('form-stack'));
console.log(s.includes('data-form="login"'));
console.log(s.match(/data-form="login"/g)?.length);
