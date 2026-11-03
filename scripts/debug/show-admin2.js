const fs = require('fs');
const p = 'app/main.js';
let c = fs.readFileSync(p, 'utf8');
const idx = c.indexOf('IS_ADMIN');
console.log(c.substring(idx-50, idx+400));
