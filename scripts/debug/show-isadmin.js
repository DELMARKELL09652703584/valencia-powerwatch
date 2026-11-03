const fs=require('fs');
const core=fs.readFileSync('app/core.js','utf8');
const idx = core.indexOf('const IS_ADMIN');
console.log(core.substring(idx, idx+60));
console.log(core.substring(idx-80, idx));
