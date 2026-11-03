const fs = require('fs');
const p = 'app/main.js';
let c = fs.readFileSync(p, 'utf8');
const idx = c.indexOf('data-form="login"');
console.log(c.substring(idx, idx+500));
