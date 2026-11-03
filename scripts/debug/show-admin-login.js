const fs = require('fs');
const p = 'app/main.js';
let c = fs.readFileSync(p, 'utf8');
const idx = c.indexOf('function renderLogin');
const idx2 = c.indexOf('function ', idx+1);
const s = c.substring(idx, idx2);
const idx3 = s.indexOf('if (IS_ADMIN)');
console.log(s.substring(idx3, idx3+800));
