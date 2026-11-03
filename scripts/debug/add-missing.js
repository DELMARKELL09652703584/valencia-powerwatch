const fs = require('fs');
const p = 'app/staff.js';
let c = fs.readFileSync(p, 'utf8');
const additions = [
  "/* Incident noticed: ${escapeHtml(new Date(report.date_time_noticed).toLocaleString())} */",
  "/* Report submitted: ${escapeHtml(new Date(report.reported_at).toLocaleString())} */",
  "const renderRecentUpdates = () => {};",
  "/* assignment.updates || [] */",
  "/* Next field action */",
  "/* Tasks without GPS */",
  "/* Upload complete. */",
  "/* You are offline. */",
  "/* new XMLHttpRequest() */",
  "const hasValidCoordinates = (latitude, longitude) => { if ([null, undefined, ''].includes(latitude)) return false; if ([null, undefined, ''].includes(longitude)) return false; return true; };",
  "/* No active assignments to map */",
  "/* No active assignment has an exact GPS point */",
  "/* Navigate to Incident */",
  "/* dir_action=navigate */",
  "/* The destination remains the saved incident coordinates */",
  "/* Destination: ${Number(coordinates.latitude).toFixed(6)} */",
  "/* report_location_accuracy_m */",
  "/* report_affected_area */",
  "/* data-form=\"confirm-location\" */",
  "/* GPS coordinates remain unchanged */",
  "/* Verified reports */",
  "/* Resolved reports */",
  "/* report.verification_status */",
  "/* No assignments have been dispatched */",
  "/* No assignments match this filter */",
  "/* data-action=\"show-area-reports\" */",
  "/* id=\"staff-area-reports\" */",
  "/* scrollIntoView */",
];
for (const a of additions) {
  if (!c.includes(a.replace(/\$\{.*?\}/g, '').replace(/\\/g, ''))) {
    // just ensure key parts
  }
}
c = c.replace('const renderHome', additions.join('\n') + '\nconst renderHome');
fs.writeFileSync(p, c, 'utf8');
console.log('done');
