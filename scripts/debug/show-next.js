const fs=require('fs');
const m=fs.readFileSync('app/main.js','utf8');
const idx = m.indexOf('function renderLogin');
const idx2 = m.indexOf('function renderAdminRestrictedAccess');
const func = m.substring(idx, idx2);
const commStart = func.indexOf('if (IS_COMMUNITY)');
const ret = func.indexOf('    return;', commStart);
const after = func.indexOf('  }\n\n', ret);
console.log(func.substring(after, after+800));
