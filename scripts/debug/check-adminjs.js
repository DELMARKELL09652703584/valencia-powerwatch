const fs = require('fs');
const p = 'app/admin.js';
console.log(fs.existsSync(p));
const c = fs.readFileSync(p,'utf8');
console.log(c.length);
console.log(c.slice(0,80));
console.log(c.includes('renderAdminDashboard'));
console.log(c.includes('login'));
