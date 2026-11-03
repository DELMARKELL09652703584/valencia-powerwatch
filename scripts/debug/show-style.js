const fs = require('fs');
const s = fs.readFileSync('style.css','utf8');
const idx = s.indexOf('.login-page');
console.log(s.substring(idx, idx+300));
