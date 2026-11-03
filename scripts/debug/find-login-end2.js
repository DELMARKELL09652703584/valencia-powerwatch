const fs = require('fs');
const p = 'app/main.js';
let c = fs.readFileSync(p, 'utf8');
const idx = c.indexOf('function renderLogin');
const idx2 = c.indexOf('\nfunction ', idx+1);
console.log(c.substring(idx2-40, idx2+80));
