const fs = require('fs');
const p = 'app/staff.js';
let c = fs.readFileSync(p, 'utf8');
const neu = [
  "  <div class=\"staff-quick-nav\" aria-label=\"Quick Navigation\">",
  "    <button class=\"staff-quick-pill\" type=\"button\" data-action=\"show-area-reports\">",
  "      <span class=\"staff-quick-icon\">${icon('clipboard')}</span>",
  "      <span class=\"staff-quick-text\"><strong>Reports</strong><small>Resident reports</small></span>",
  "    </button>",
  "    <button class=\"staff-quick-pill\" type=\"button\" data-action=\"navigate\" data-page=\"tasks\">",
  "      <span class=\"staff-quick-icon\">${icon('alert')}</span>",
  "      <span class=\"staff-quick-text\"><strong>Incidents</strong><small>${active.length} active cases</small></span>",
  "    </button>",
  "    <button class=\"staff-quick-pill\" type=\"button\" data-action=\"navigate\" data-page=\"map\">",
  "      <span class=\"staff-quick-icon\">${icon('map')}</span>",
  "      <span class=\"staff-quick-text\"><strong>Map</strong><small>Navigate to a site</small></span>",
  "    </button>",
  "    <button class=\"staff-quick-pill\" type=\"button\" data-action=\"navigate\" data-page=\"alerts\">",
  "      <span class=\"staff-quick-icon\">${icon('bell')}${state.unreadNotifications ? `<span class=\"staff-pill-badge\">${state.unreadNotifications}</span>` : ''}</span>",
  "      <span class=\"staff-quick-text\"><strong>Updates</strong><small>${state.unreadNotifications ? `${state.unreadNotifications} unread` : 'All caught up'}</small></span>",
  "    </button>",
  "  </div>",
].join('\n');
const start = c.indexOf('<div class="staff-quick-nav"');
if (start === -1) { console.log('no'); process.exit(0); }
const end = c.indexOf('</div>', start);
let depth = 0;
for (let i = start; i < c.length; i++) {
  if (c.substr(i,4) === '<div') depth++;
  if (c.substr(i,6) === '</div>') { depth--; if (depth === 0) { const e2 = i+6; c = c.substring(0,start) + neu + c.substring(e2); break; } }
}
fs.writeFileSync(p, c, 'utf8');
console.log('done');
