const fs=require('fs');
const m=fs.readFileSync('app/main.js','utf8');
const boot = m.indexOf('async function boot');
const end = m.indexOf('document.addEventListener', boot);
const b = m.substring(boot, end);
console.log(b.includes('renderLogin()'));
console.log((b.match(/renderLogin/g)||[]).length);
console.log((b.match(/renderWelcomeScreen/g)||[]).length);
console.log((b.match(/renderAdminRestrictedAccess/g)||[]).length);
