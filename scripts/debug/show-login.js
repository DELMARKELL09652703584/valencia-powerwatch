const fs = require('fs');
const p = 'app/main.js';
let c = fs.readFileSync(p, 'utf8');
const idx = c.indexOf('renderLogin');
console.log(c.substring(idx, idx+400));
