const fs = require('fs');
const p = 'app/staff.js';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/Next[^\<\>]+action/g, 'Next field action');
fs.writeFileSync(p, c, 'utf8');
console.log(c.includes('Next field action'));
