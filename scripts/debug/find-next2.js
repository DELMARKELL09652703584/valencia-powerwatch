const fs = require('fs');
const p = 'app/staff.js';
let c = fs.readFileSync(p, 'utf8');
const idx = c.indexOf('staff-next-task');
console.log(idx);
if(idx>=0) console.log(c.substring(idx-80, idx+200));
