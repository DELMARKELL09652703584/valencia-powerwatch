const fs = require('fs');
const p = 'app/main.js';
let c = fs.readFileSync(p, 'utf8');
const idx = c.indexOf('renderForgotPassword');
if(idx>=0){
  const idx2 = c.indexOf('if (IS_ADMIN)', idx);
  console.log(c.substring(idx2, idx2+1000));
}
