const fs = require('fs');
const p = 'app/staff.js';
let c = fs.readFileSync(p, 'utf8');
c = c.replace("['home', 'home', 'Home']", "['home', 'home', 'Today']");
c = c.replace("['tasks', 'clipboard', 'Assignments']", "['tasks', 'clipboard', 'Tasks']");
c = c.replace(/Assigned Reports/gi, 'Assigned Reports');
c = c.replace(/Assignments<\/strong><small>\$\{active\.length\} active cases<\/small>/g, 'Assignments</strong><small>${active.length} active cases</small>');
fs.writeFileSync(p, c, 'utf8');
console.log('done');
