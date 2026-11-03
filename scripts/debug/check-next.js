const fs = require('fs');
const m = fs.readFileSync('app/main.js','utf8');
const idx = m.indexOf('function renderLogin');
const next = m.indexOf('\nfunction ', idx+1);
console.log(m.substring(next, next+60));
