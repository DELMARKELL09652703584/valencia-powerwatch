const fs = require('fs');
const p = 'app/staff.js';
let c = fs.readFileSync(p, 'utf8');
const idx = c.indexOf('const renderHome');
console.log(c.substring(idx, idx+600));
