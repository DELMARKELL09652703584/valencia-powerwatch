const fs=require('fs');
const m=fs.readFileSync('app/main.js','utf8');
const core=fs.readFileSync('app/core.js','utf8');
console.log('core has IS_ADMIN:', core.includes('IS_ADMIN'));
console.log('main has IS_ADMIN:', m.includes('IS_ADMIN'));
