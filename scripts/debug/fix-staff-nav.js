const fs = require('fs');
const p = 'app/staff.js';
let c = fs.readFileSync(p, 'utf8');
const start = c.indexOf('<div class="staff-quick-nav"');
if (start === -1) { console.log('no'); process.exit(0); }
const end = c.indexOf('</div>', c.indexOf('</div>', start) + 6) + 6;
const neu = `  <div class="staff-quick-nav" aria-label="Quick Navigation">\n    <button class="staff-quick-pill" type="button" data-action="show-area-reports">\n      <span class="staff-quick-icon">${'${icon(\'clipboard\')}'}</span>\n      <span class="staff-quick-text"><strong>Reports</strong><small>Resident reports</small></span>\n    </button>\n    <button class="staff-quick-pill" type="button" data-action="navigate" data-page="tasks">\n      <span class="staff-quick-icon">${'${icon(\'alert\')}'}</span>\n      <span class="staff-quick-text"><strong>Incidents</strong><small>${'${active.length}'} active cases</small></span>\n    </button>\n    <button class="staff-quick-pill" type="button" data-action="navigate" data-page="map">\n      <span class="staff-quick-icon">${'${icon(\'map\')}'}</span>\n      <span class="staff-quick-text"><strong>Map</strong><small>Navigate to a site</small></span>\n    </button>\n    <button class="staff-quick-pill" type="button" data-action="navigate" data-page="alerts">\n      <span class="staff-quick-icon">${'${icon(\'bell\')}'}${'${state.unreadNotifications ? `<span class="staff-pill-badge">${state.unreadNotifications}</span>` : \'\'}'}</span>\n      <span class="staff-quick-text"><strong>Updates</strong><small>${'${state.unreadNotifications ? `${state.unreadNotifications} unread` : \'All caught up\'}'}</small></span>\n    </button>\n  </div>`;
c = c.substring(0, start) + neu + c.substring(end);
fs.writeFileSync(p, c, 'utf8');
console.log('done');
