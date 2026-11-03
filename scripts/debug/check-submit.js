const fs = require('fs');
const m = fs.readFileSync('app/main.js','utf8');
const idx = m.indexOf("document.addEventListener('submit'");
const end = m.indexOf("document.addEventListener('change'", idx);
console.log(m.substring(idx, Math.min(end, idx+200)));
console.log('---');
console.log(m.substring(idx, idx+800));
