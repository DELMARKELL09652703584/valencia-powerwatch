const fs = require('fs');
const p = 'app/staff.js';
let c = fs.readFileSync(p, 'utf8');
const lines = c.split(/\r?\n/);
let count = 0;
lines.forEach((l, i) => { if(l.includes('Next')) { count++; console.log(i+1+':'+l); }});
console.log('total', count);
