const fs=require('fs');
const m=fs.readFileSync('app/main.js','utf8');
let idx = m.indexOf('data-form="login"');
let count = 0;
while(idx >= 0 && count < 5) {
  console.log('===', count, '===');
  console.log(m.substring(idx-60, idx+80));
  idx = m.indexOf('data-form="login"', idx+1);
  count++;
}
