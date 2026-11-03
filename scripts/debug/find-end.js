const fs=require('fs');
const m=fs.readFileSync('app/main.js','utf8');
const idx = m.indexOf('function renderLogin');
const idx2 = m.indexOf('function renderAdminRestrictedAccess');
const func = m.substring(idx, idx2);
const s = func;
// look for the structure
if(s.includes('if (IS_COMMUNITY)')) {
  const comm = s.indexOf('if (IS_COMMUNITY)');
  // find end of community block by looking for return; followed by pattern
  const ret = s.indexOf('    return;', comm);
  if(ret>=0) {
    const after = s.indexOf('  }\n\n', ret);
    if(after>=0) {
      console.log(s.substring(after, after+300));
    } else {
      console.log(s.substring(ret, ret+200));
    }
  }
}
