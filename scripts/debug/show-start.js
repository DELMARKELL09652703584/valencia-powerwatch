const fs = require('fs');
const p = 'app/main.js';
let c = fs.readFileSync(p, 'utf8');
console.log(c.substring(0, 500));
