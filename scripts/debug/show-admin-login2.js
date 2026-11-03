const fs = require('fs');
const p = 'app/main.js';
let c = fs.readFileSync(p, 'utf8');
const idx = c.indexOf('IS_ADMIN');
if(idx>=0){
  const idx2 = c.lastIndexOf('function ', idx);
  const idx3 = c.indexOf('\nfunction ', idx2+1);
  console.log(c.substring(idx2, idx3));
}
