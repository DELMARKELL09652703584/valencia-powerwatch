const fs = require('fs');
const p = 'app/staff.js';
let c = fs.readFileSync(p, 'utf8');
const re = /Next[^\n<]{0,60}/g;
let m;
while((m=re.exec(c))!==null){
  console.log(m[0]);
}
if(c.includes('Next')) console.log('has Next');
if(c.includes('field action')) console.log('has field action');
