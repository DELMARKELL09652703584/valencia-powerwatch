const fs = require('fs');
const p = 'app/main.js';
let c = fs.readFileSync(p, 'utf8');
const idx = c.indexOf('function renderLogin');
for(let i=idx;i<c.length;i++){
  if(c.substr(i,9)==='\nfunction'){ console.log(c.substring(i-50,i+60)); break; }
}
