const fs = require('fs');
const p = 'app/staff.js';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/<span class="staff-next-task-label">[^<]*<\/span>/g, '<span class="staff-next-task-label">Next field action</span>');
fs.writeFileSync(p, c, 'utf8');
console.log('done');
