const fs=require('fs');
const s=fs.readFileSync('app/admin-theme.css','utf8');
const idx = s.indexOf('.login-page');
if(idx>=0) {
  let depth=0, i=idx;
  let end=idx;
  while(i<s.length) {
    if(s[i]==='{') depth++;
    else if(s[i]==='}') { depth--; if(depth===0){end=i; break;}}
    i++;
  }
  console.log(s.substring(idx, end+1));
}
