const fs = require('fs');
const p = 'app/staff.js';
let c = fs.readFileSync(p, 'utf8');
if(!c.includes('show-area-reports')){ c = c.replace('const root', 'data-action="show-area-reports"\nconst root'); fs.writeFileSync(p,c,'utf8'); console.log('ok'); } else console.log('has');
