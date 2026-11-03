const fs = require('fs');
const main = fs.readFileSync('app/main.js','utf8');
const idx = main.indexOf('function renderLogin');
const idx2 = main.indexOf('function renderAdminRestrictedAccess');
const func = main.substring(idx, idx2);
const loginPage = func.indexOf('login-page');
console.log(loginPage);
if(loginPage >= 0) {
  console.log(func.substring(loginPage-150, loginPage+500));
}
