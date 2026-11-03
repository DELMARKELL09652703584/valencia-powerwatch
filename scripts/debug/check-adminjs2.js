const fs=require('fs');
const a=fs.readFileSync('app/admin.js','utf8');
console.log(a.includes('renderAdminLogin'));
console.log(a.includes('renderLogin'));
console.log(a.includes('loginForm'));
console.log(a.includes('data-form="login"'));
console.log(a.includes('admin-login'));
console.log(a.match(/login/g)?.length);
