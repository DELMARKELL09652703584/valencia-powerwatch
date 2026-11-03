const fs = require('fs');
const p = 'app/staff.js';
let c = fs.readFileSync(p, 'utf8');
const idx = c.indexOf('prioritySorted');
if(idx>=0) console.log(c.substring(idx-80, idx+250));
