const fs = require('fs');
const p = 'app/staff.js';
let c = fs.readFileSync(p, 'utf8');
if(!c.includes('Next field action')){
  c = c.replace(/<span class="staff-next-task-label">[^<]*<\/span>/, '<span class="staff-next-task-label">Next field action</span>');
}
fs.writeFileSync(p, c, 'utf8');
console.log(c.includes('Next field action'));
