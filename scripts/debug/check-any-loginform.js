const fs=require('fs');
const m=fs.readFileSync('app/main.js','utf8');
console.log(m.includes('loginForm.addEventListener'));
console.log(m.includes('data-form="login"'));
console.log(m.match(/data-form="login"/g)?.length);
