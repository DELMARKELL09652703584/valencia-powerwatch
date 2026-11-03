const fs=require('fs');
const s=fs.readFileSync('style.css','utf8');
console.log(s.includes('auth-divider'));
const at=fs.readFileSync('app/admin-theme.css','utf8');
console.log(at.includes('auth-divider'));
console.log(at.includes('.password-control'));
