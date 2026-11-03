const fs=require('fs');
const s=fs.readFileSync('app/admin-theme.css','utf8');
console.log(s.includes('.login-panel'));
console.log(s.includes('.login-content'));
console.log(s.includes('.form-stack'));
console.log(s.includes('.password-control'));
console.log(s.includes('.admin-login-options'));
console.log(s.includes('.social-btn'));
console.log(s.includes('.auth-divider'));
