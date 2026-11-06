const fs = require('fs');

const communityJs = fs.readFileSync('client/js/community/community.js', 'utf8');
const adminJs = fs.readFileSync('client/js/admin/admin.js', 'utf8');
const mainJs = fs.readFileSync('client/js/shared/main.js', 'utf8');
const coreJs = fs.readFileSync('client/js/shared/core.js', 'utf8');
const staffJs = fs.readFileSync('client/js/staff/staff.js', 'utf8');

const allSharedCode = communityJs + '\n' + adminJs + '\n' + mainJs + '\n' + coreJs;

function findActions(text) {
  const actions = new Set();
  const regex = /data-action=["']([^"']+)["']/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (!m[1].includes('${')) {
      actions.add(m[1]);
    }
  }
  return actions;
}

const communityActions = findActions(communityJs);
const adminActions = findActions(adminJs);
const mainActions = findActions(mainJs);

console.log('=== COMMUNITY PORTAL ACTIONS AUDIT ===');
const unhandledCommunity = [];
for (const act of communityActions) {
  const pattern = new RegExp(`['"\`]${act}['"\`]|action\\s*===\\s*['"]${act}['"]|closest\\(\\[data-action=["']${act}["']\\]\\)`, 'g');
  const count = (allSharedCode.match(pattern) || []).length;
  // If count is only 1, it only appears where the button is defined in HTML!
  if (count <= 1) {
    unhandledCommunity.push(act);
  }
}
console.log('Community data-actions total:', communityActions.size);
console.log('Unhandled in Community:', unhandledCommunity);

console.log('\n=== ADMIN PORTAL ACTIONS AUDIT ===');
const unhandledAdmin = [];
for (const act of adminActions) {
  const pattern = new RegExp(`['"\`]${act}['"\`]|action\\s*===\\s*['"]${act}['"]|closest\\(\\[data-action=["']${act}["']\\]\\)`, 'g');
  const count = (allSharedCode.match(pattern) || []).length;
  if (count <= 1) {
    unhandledAdmin.push(act);
  }
}
console.log('Admin data-actions total:', adminActions.size);
console.log('Unhandled in Admin:', unhandledAdmin);

console.log('\n=== STAFF PORTAL ACTIONS AUDIT ===');
const staffActions = new Set();
const sRegex = /data-(?:action|staff-action)=["']([^"']+)["']/g;
let sm;
while ((sm = sRegex.exec(staffJs)) !== null) {
  if (!sm[1].includes('${')) staffActions.add(sm[1]);
}
const unhandledStaff = [];
for (const act of staffActions) {
  const pattern = new RegExp(`['"\`]${act}['"\`]|action\\s*===\\s*['"]${act}['"]|closest\\(\\[data-(?:action|staff-action)=["']${act}["']\\]\\)`, 'g');
  const count = (staffJs.match(pattern) || []).length;
  if (count <= 1) {
    unhandledStaff.push(act);
  }
}
console.log('Staff data-actions total:', staffActions.size);
console.log('Unhandled in Staff:', unhandledStaff);
