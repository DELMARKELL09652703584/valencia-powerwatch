const fs = require('fs');
const path = require('path');

function analyzeFile(filePath, label) {
  console.log(`\n=================== ${label} (${filePath}) ===================`);
  const content = fs.readFileSync(filePath, 'utf8');

  // Find all data-action attributes in HTML templates
  const dataActions = new Set();
  const actionRegex = /data-action=["']([^"']+)["']/g;
  let m;
  while ((m = actionRegex.exec(content)) !== null) {
    dataActions.add(m[1]);
  }

  // Find all data-admin-action
  const adminActions = new Set();
  const adminActionRegex = /data-admin-action=["']([^"']+)["']/g;
  while ((m = adminActionRegex.exec(content)) !== null) {
    adminActions.add(m[1]);
  }

  // Find all data-staff-action
  const staffActions = new Set();
  const staffActionRegex = /data-staff-action=["']([^"']+)["']/g;
  while ((m = staffActionRegex.exec(content)) !== null) {
    staffActions.add(m[1]);
  }

  // Find all data-nav or data-view
  const dataViews = new Set();
  const viewRegex = /data-(?:nav|view)=["']([^"']+)["']/g;
  while ((m = viewRegex.exec(content)) !== null) {
    dataViews.add(m[1]);
  }

  console.log(`Total data-action: ${dataActions.size}`);
  if (adminActions.size) console.log(`Total data-admin-action: ${adminActions.size}`);
  if (staffActions.size) console.log(`Total data-staff-action: ${staffActions.size}`);
  if (dataViews.size) console.log(`Total data-nav/view: ${dataViews.size}`);

  // Check which actions are handled in code
  const allActions = [...dataActions, ...adminActions, ...staffActions];
  const missingHandlers = [];

  for (const act of allActions) {
    // Check if the action string appears elsewhere in the file (e.g. case 'foo': or action === 'foo' or act in an object)
    const escaped = act.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const handlerRegex = new RegExp(`['"\`]${escaped}['"\`]|\\bcase\\s+['"]${escaped}['"]`, 'g');
    const occurrences = (content.match(handlerRegex) || []).length;
    // We expect at least 2 occurrences: 1 where it's defined in the template, and at least 1 in the event handler/router
    if (occurrences < 2) {
      missingHandlers.push(act);
    }
  }

  if (missingHandlers.length > 0) {
    console.log(`POTENTIAL UNHANDLED ACTIONS (${missingHandlers.length}):`, missingHandlers);
  } else {
    console.log(`All ${allActions.length} actions have corresponding handlers in code!`);
  }

  return { total: allActions.length, missing: missingHandlers };
}

analyzeFile('client/js/community/community.js', 'Community Portal');
analyzeFile('client/js/staff/staff.js', 'Staff Portal');
analyzeFile('client/js/admin/admin.js', 'Admin Portal');
analyzeFile('client/js/shared/main.js', 'Main Shared');
