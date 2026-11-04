const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');

test('portal theme stylesheet keeps mobile home actions styled in both themes', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');

  assert.match(styles, /body\.community-body \.home-report-action\s*\{/);
  assert.match(styles, /body\.community-body \.home-track-action svg\s*\{[^}]*width:\s*20px;[^}]*height:\s*20px;[^}]*fill:\s*none;/s);
  assert.match(styles, /body\.community-body \.home-shortcut-icon svg\s*\{[^}]*width:\s*19px;[^}]*height:\s*19px;/s);
});

test('community colors follow the app theme toggle instead of system dark mode', () => {
  const themeStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'theme.css'), 'utf8');
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');

  assert.doesNotMatch(themeStyles, /prefers-color-scheme:\s*dark/i);
  assert.doesNotMatch(portalStyles, /@media\s*\(prefers-color-scheme:\s*dark\)[^{]*\{[^}]*body\.community-body/s);
  assert.match(portalStyles, /body\.community-body\s*\{[^}]*--pw-panel:\s*#fff;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body\s*\{[^}]*--pw-panel:\s*#142238;/s);
  assert.match(portalStyles, /body\.dark-mode\.community-body \.mobile-card\s*\{[^}]*background:\s*#0f172a;/s);
});

test('resident report detail and live tracking cards grow to fit on mobile', () => {
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');

  assert.match(portalStyles, /#app > \.mobile-shell:has\(\.report-detail-card\)\s*\{[^}]*height:\s*auto;[^}]*flex:\s*0 0 auto;/s);
  assert.match(portalStyles, /#app > \.mobile-shell:has\(\.report-detail-card\) > \.mobile-content\s*\{[^}]*flex:\s*0 0 auto;[^}]*grid-auto-rows:\s*max-content;/s);
  assert.match(portalStyles, /\.report-detail-card,\s*body\.community-body \.resident-tracking-card\s*\{[^}]*max-height:\s*none;[^}]*overflow:\s*visible;/s);
  assert.match(portalStyles, /body\.community-body \.resident-tracking-map\s*\{[^}]*height:\s*clamp\(250px, 42vh, 340px\);[^}]*min-height:\s*250px;/s);
});

test('resident tracking map uses clear live staff and incident markers', () => {
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');

  assert.match(portalStyles, /resident-tracking-marker-staff\s*\{[^}]*border-radius:\s*50%;[^}]*background:\s*rgba\(14, 165, 233, \.14\);/s);
  assert.match(portalStyles, /resident-tracking-marker-pulse\s*\{[^}]*animation:\s*resident-tracking-pulse 1\.8s ease-out infinite;/s);
  assert.match(portalStyles, /resident-tracking-marker-incident\s*\{[^}]*background:\s*#e11d48;/s);
  assert.match(portalStyles, /prefers-reduced-motion:\s*reduce\)[\s\S]*?resident-tracking-marker-pulse\s*\{\s*animation:\s*none;/s);
});

test('community dashboard weather card follows the resident mobile reference layout', () => {
  const portalStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');

  assert.match(portalStyles, /body\.community-body \.home-dashboard \.mobile-weather\s*\{[^}]*min-height:\s*88px;[^}]*width:\s*100%;[^}]*padding:\s*10px 16px;[^}]*background:\s*#fff;/s);
  assert.match(portalStyles, /body\.community-body \.home-dashboard \.mobile-weather-icon\s*\{[^}]*width:\s*46px;[^}]*height:\s*46px;/s);
  assert.match(portalStyles, /body\.community-body \.home-dashboard \.mobile-weather-copy\s*\{[^}]*display:\s*grid;/s);
  assert.match(portalStyles, /body\.community-body \.mobile-tab\[data-mobile-tab="notifications"\] \.mobile-tab-label/);
});

test('portal layouts remain constrained on narrow mobile screens', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'admin.html'), 'utf8');

  assert.match(styles, /@media \(max-width: 600px\)\s*\{\s*body\.community-body \.mobile-home-header\s*\{[^}]*display:\s*flex;[^}]*min-height:\s*62px;[^}]*align-items:\s*center;/s);
  assert.match(styles, /@media \(max-width: 600px\)\s*\{\s*body\.community-body \.mobile-home-header\s*\{[^}]*gap:\s*10px;[^}]*padding:\s*9px 14px;/s);
  assert.match(styles, /@media \(max-width: 360px\)\s*\{\s*body\.admin-body \.login-page\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);/s);
  assert.match(styles, /body\.admin-body \.login-page \.social-row\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
  assert.match(communityPage, /\/client\/css\/portal-polish\.css\?v=\d+/);
  assert.match(adminPage, /\/client\/css\/portal-polish\.css\?v=38/);
});

test('report wizard content can scroll above the fixed bottom navigation', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');
  const mobileContentRule = styles.match(/\.community-body \.mobile-content\s*\{([^}]*)\}/)?.[1] || '';

  assert.match(mobileContentRule, /padding-bottom:\s*calc\(98px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(communityPage, /\/client\/css\/portal-polish\.css\?v=\d+/);
});

test('report evidence buttons and subpage title remain legible on mobile', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');

  assert.match(styles, /body\.community-body \.mobile-subpage-header \.mobile-header-title\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/s);
  assert.match(styles, /body\.community-body \.report-evidence-step \.report-evidence-picker\s*\{[^}]*color:\s*#1265ad !important;/s);
  assert.match(styles, /body\.dark-mode\.community-body \.report-evidence-step \.report-evidence-picker\s*\{[^}]*background:\s*var\(--pw-raised\) !important;[^}]*color:\s*#9dd6ff !important;/s);
  assert.match(communityPage, /\/client\/css\/portal-polish\.css\?v=\d+/);
});

test('Admin dashboard releases its fixed desktop frame for mobile page scrolling', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'style.css'), 'utf8');
  const staffStyles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'staff.css'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'admin.html'), 'utf8');
  const mobileAdminStyles = styles.slice(styles.indexOf('@media (max-width: 900px)', styles.indexOf('/* Admin command-center visual system */')));

  assert.match(mobileAdminStyles, /body\.admin-body\s*\{[^}]*height:\s*auto !important;[^}]*max-height:\s*none !important;[^}]*overflow-y:\s*auto !important;/s);
  assert.match(mobileAdminStyles, /\.admin-shell\s*\{[^}]*height:\s*auto;[^}]*max-height:\s*none;[^}]*overflow:\s*visible;/s);
  assert.match(mobileAdminStyles, /\.admin-shell \.admin-main\s*\{[^}]*height:\s*auto;[^}]*max-height:\s*none;[^}]*overflow:\s*visible;/s);
  assert.match(adminPage, /\/style\.css\?v=45/);
  assert.match(staffStyles, /\.staff-main\s*\{[^}]*overflow-y:\s*auto;/s);
  assert.match(staffStyles, /\.staff-bottom-nav\s*\{[^}]*position:\s*static;/s);
});

test('Admin login design adapts to mobile and Night Ops themes', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'admin-theme.css'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'admin.html'), 'utf8');

  assert.match(styles, /body\.admin-body \.login-page \.login-panel \.login-content\s*\{[^}]*border-radius:\s*22px;[^}]*background:\s*#fff;/s);
  assert.match(styles, /body\.dark-mode\.admin-body \.login-page \.login-panel \.login-content\s*\{[^}]*background:\s*var\(--pw-panel\);/s);
  assert.match(styles, /@media \(max-width: 900px\)\s*\{[\s\S]*?body\.admin-body \.login-page \.login-panel\s*\{[^}]*margin-top:\s*-22px;/);
  assert.match(styles, /@media \(max-width: 600px\)\s*\{[\s\S]*?body\.admin-body \.login-page \.login-panel \.login-content\s*\{[^}]*padding:\s*27px 21px;/);
  assert.match(styles, /body\.admin-body \.login-page \.login-panel \.admin-login-options input\[type="checkbox"\]\s*\{[^}]*width:\s*18px;[^}]*height:\s*18px;[^}]*min-height:\s*18px;/s);
  assert.match(adminPage, /\/client\/css\/admin-theme\.css\?v=16/);
});

test('Admin dashboard report charts use live data and remain responsive in both themes', () => {
  const adminScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'admin', 'admin.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'admin-theme.css'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'admin.html'), 'utf8');

  assert.match(adminScript, /api\('\/api\/analytics\/dashboard-report-distribution'\)/);
  assert.match(adminScript, /item\.count \/ total/);
  assert.match(adminScript, /data-report-status-detail aria-live="polite"/);
  assert.match(adminScript, /Loading report analytics/);
  assert.match(adminScript, /Could not load report analytics/);
  assert.match(adminScript, /No outage reports yet/);
  assert.match(adminScript, /class="report-status-hole"/);
  assert.match(adminScript, /style="--chart-enter-delay:\$\{index \* 65\}ms"/);
  assert.match(adminScript, /--chart-enter-delay:\$\{index \* 75\}ms;width:/);
  assert.match(adminScript, /class="report-status-orbit"/);
  assert.match(adminScript, /class="report-status-chip"><svg viewBox="0 0 20 20" aria-hidden="true">/);
  assert.match(adminScript, /<\/svg><i><\/i> LIVE MONITOR/);
  assert.match(adminScript, /data-report-center-count/);
  assert.doesNotMatch(adminScript, /report-status-center-label"[^>]*textLength=/);
  assert.match(adminScript, /const zeroStatusList = zeroStatuses\.length \? `<details class="report-status-zero-list">/);
  assert.match(adminScript, /Date\.now\(\) - lastReportDistributionRefreshAt >= 30000/);
  assert.match(styles, /body\.admin-body \.admin-dashboard-page > \[data-report-distribution\]\s*\{\s*order:\s*7;/);
  assert.match(styles, /\.report-status-hole\s*\{[^}]*fill:\s*var\(--admin-canvas/);
  assert.match(styles, /\.report-status-pie\s*\{[^}]*width:\s*min\(100%,\s*224px\)/);
  assert.match(styles, /\.report-status-card::before\s*\{/);
  assert.match(styles, /\.report-status-orbit\s*\{[^}]*stroke-dasharray:\s*2 7/);
  assert.match(styles, /@keyframes report-orbit-spin/);
  assert.match(styles, /@keyframes report-monitor-pulse/);
  assert.match(styles, /@keyframes report-bar-appear/);
  assert.match(styles, /\.report-status-slice\s*\{[^}]*animation-delay:\s*var\(--chart-enter-delay/);
  assert.match(styles, /\.report-type-track span\s*\{[^}]*animation-delay:\s*var\(--chart-enter-delay/);
  assert.match(styles, /\.report-type-row:hover \.report-type-track span\s*\{/);
  assert.match(styles, /\.report-status-chip svg\s*\{/);
  assert.match(styles, /\.report-status-legend-item\s*\{[^}]*border:\s*1px solid/);
  assert.match(styles, /\.report-type-list\s*\{[^}]*align-content:\s*center/);
  assert.match(styles, /\.report-distribution-total strong\s*\{[^}]*font-size:\s*1\.2rem/);
  assert.match(styles, /body\.dark-mode\.admin-body \.report-status-hole\s*\{[^}]*fill:\s*var\(--pw-bg\)/);
  assert.match(styles, /body\.dark-mode\.admin-body \.report-status-legend-item\s*\{/);
  assert.match(styles, /body\.dark-mode\.admin-body \.report-status-orbit\s*\{/);
  assert.match(styles, /body\.admin-body \.report-status-orbit,/);
  assert.match(styles, /\.report-status-zero-list summary\s*\{/);
  assert.match(styles, /@media \(max-width: 600px\)\s*\{[\s\S]*?\.report-status-chart-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  assert.match(styles, /body\.dark-mode\.admin-body \.report-distribution-panel/);
  assert.match(adminPage, /\/client\/css\/admin-theme\.css\?v=16/);
  assert.match(adminPage, /\/client\/js\/admin\/admin\.js\?v=40/);
});

test('Analytics & Reports charts use matching HUD styling in both themes', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'admin-theme.css'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'admin.html'), 'utf8');

  assert.match(styles, /\.admin-shell\.page-analytics \.analytics-chart-panel\s*\{[^}]*isolation:\s*isolate/s);
  assert.match(styles, /\.admin-shell\.page-analytics \.analytics-bar-track i\s*\{[^}]*analytics-bar-rise/);
  assert.match(styles, /\.admin-shell\.page-analytics \.analytics-donut::after\s*\{[^}]*analytics-donut-orbit/);
  assert.match(styles, /body\.dark-mode\.admin-body \.admin-shell\.page-analytics \.analytics-chart-panel\s*\{/);
  assert.match(styles, /body\.dark-mode\.admin-body \.admin-shell\.page-analytics \.analytics-donut-legend li\s*\{/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce[\s\S]*?page-analytics \.analytics-donut::after/);
  assert.match(adminPage, /\/client\/css\/admin-theme\.css\?v=16/);
});

test('Admin dashboard right-side command actions stay compact and usable on mobile', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'admin-theme.css'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'admin.html'), 'utf8');

  assert.match(styles, /body\.admin-body \.admin-shell\.page-admin-dashboard \.admin-dashboard-page \.command-header-actions \.button\s*\{[^}]*min-height:\s*38px;[^}]*padding:\s*4px 8px;[^}]*font-size:\s*\.72rem;/s);
  assert.match(styles, /@media \(max-width: 760px\)\s*\{[\s\S]*?body\.admin-body \.admin-shell\.page-admin-dashboard \.admin-dashboard-page \.command-header-actions \.button\s*\{[^}]*min-height:\s*38px;[^}]*font-size:\s*\.68rem !important;/);
  assert.match(adminPage, /\/client\/css\/admin-theme\.css\?v=16/);
});

test('home weather widget stays compact in Light Mode and Night Ops', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');

  assert.match(styles, /body\.community-body \.home-dashboard \.mobile-weather\s*\{[^}]*min-height:\s*88px;[^}]*gap:\s*14px;[^}]*padding:\s*10px 16px;[^}]*border-radius:\s*18px;/s);
  assert.match(styles, /body\.community-body \.home-dashboard \.mobile-weather-copy\s*\{[^}]*display:\s*grid;[^}]*gap:\s*2px;/s);
  assert.match(styles, /body\.community-body \.home-dashboard \.mobile-weather-copy small:first-of-type\s*\{\s*display:\s*block;/s);
  assert.match(styles, /body\.community-body \.home-dashboard \.mobile-weather-copy small:last-of-type\s*\{\s*display:\s*none;/s);
  assert.match(styles, /body\.dark-mode\.community-body \.home-dashboard \.mobile-weather\s*\{[^}]*background:\s*var\(--pw-panel\)\s*!important;/s);
});

test('Night Ops outage trends toggle stays on the right when its text wraps', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');

  assert.match(styles, /body\.dark-mode\.community-body \.home-trends > summary\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;[^}]*grid-template-rows:\s*auto auto;/s);
  assert.match(styles, /body\.dark-mode\.community-body \.home-trends > summary::after\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1 \/ span 2;[^}]*justify-self:\s*end;/s);
});

test('Admin route guide text remains readable in dark mode', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'portal-polish.css'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'admin.html'), 'utf8');
  const coreScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'core.js'), 'utf8');

  assert.match(coreScript, /Navigation Route Guide/);
  assert.match(styles, /body\.dark-mode\.admin-body \.map-route-hud\s*\{[^}]*background:\s*rgba\(13,\s*25,\s*44,\s*\.98\);/s);
  assert.match(styles, /body\.dark-mode\.admin-body \.map-route-hud-endpoints :where\(span, strong\)\s*\{[^}]*color:\s*#d2deee\s*!important;/s);
  assert.match(styles, /body\.dark-mode\.admin-body \.map-route-hud-details :where\(span, strong\)\s*\{[^}]*color:\s*#bfdbfe\s*!important;/s);
  assert.match(styles, /body\.dark-mode\.admin-body \.map-route-hud \.map-route-hud-btn:not\(\.secondary\) :where\(span\)\s*\{\s*color:\s*#fff\s*!important;/s);
  assert.match(adminPage, /\/client\/css\/portal-polish\.css\?v=38/);
});

test('route guide is draggable, viewport-bounded, collapsible, and remembers its position', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'style.css'), 'utf8');
  const coreScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'core.js'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'admin.html'), 'utf8');
  const communityPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'community.html'), 'utf8');

  assert.match(styles, /\.map-route-hud\s*\{[^}]*position:\s*fixed;[^}]*max-height:\s*calc\(100dvh - 16px\);/s);
  assert.match(styles, /\.map-route-hud-header\s*\{[^}]*touch-action:\s*none;/s);
  assert.match(styles, /\.map-route-hud-content\[hidden\]\s*\{\s*display:\s*none;/s);
  assert.match(coreScript, /ROUTE_GUIDE_POSITION_KEY\s*=\s*'powerwatch-route-guide-position'/);
  assert.match(coreScript, /header\.addEventListener\('pointerdown'/);
  assert.match(coreScript, /header\.addEventListener\('pointermove'/);
  assert.match(coreScript, /header\.addEventListener\('pointerup'/);
  assert.match(coreScript, /clampRouteGuidePosition/);
  assert.match(coreScript, /data-route-guide-minimize/);
  assert.match(coreScript, /data-action="sim-crew-dispatch"/);
  assert.match(coreScript, /<span>🚀 Crew Tracker<\/span>/);
  assert.match(coreScript, /data-action="clear-route-guide"/);
  assert.match(adminPage, /\/client\/js\/shared\/core\.js\?v=24/);
  assert.match(communityPage, /\/client\/js\/shared\/core\.js\?v=25/);
});

test('route guide card is compact while keeping actions easy to tap', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'style.css'), 'utf8');

  assert.match(styles, /\.map-route-hud\s*\{[^}]*width:\s*min\(300px,\s*calc\(100vw - 16px\)\);[^}]*height:\s*170px;[^}]*padding:\s*6px 7px;/s);
  assert.match(styles, /\.map-route-hud-btn\s*\{[^}]*min-height:\s*28px;[^}]*font-size:\s*0\.64rem;/s);
  assert.match(styles, /\.map-route-hud\.is-minimized\s*\{\s*height:\s*auto;/);
});

test('Admin map removes the top barangay finder and keeps sidebar map focus', () => {
  const adminScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'admin', 'admin.js'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'admin.html'), 'utf8');

  assert.doesNotMatch(adminScript, /Find a barangay|data-map-focus|power-map-focus/);
  assert.match(adminScript, /id="map-fly-select"/);
  assert.match(adminPage, /\/client\/js\/admin\/admin\.js\?v=40/);
});

test('Admin notifications use readable theme-specific unread colors', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'style.css'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'admin.html'), 'utf8');

  assert.match(styles, /body\.admin-body:not\(\.dark-mode\) \.admin-notification-panel \.notification-panel-item\.unread\s*\{[^}]*background:\s*#f1f7ff\s*!important;/s);
  assert.match(styles, /body\.admin-body:not\(\.dark-mode\) \.admin-notification-panel \.notification-panel-open strong\s*\{[^}]*color:\s*#173859\s*!important;/s);
  assert.match(styles, /body\.admin-body:not\(\.dark-mode\) \.admin-notification-panel \.notification-panel-open > span\s*\{[^}]*color:\s*#425b73\s*!important;/s);
  assert.match(styles, /body\.dark-mode\.admin-body \.admin-notification-panel \.notification-panel-open strong\s*\{[^}]*color:\s*#f1f5ff\s*!important;/s);
  assert.match(adminPage, /\/style\.css\?v=45/);
});

test('dispatch eligibility offers a direct path to staff access settings', () => {
  const mainScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'main.js'), 'utf8');

  assert.match(mainScript, /data-action="open-staff-access">Open Manage Staff Team Access/);
  assert.match(mainScript, /case 'open-staff-access':\s*\{\s*closeDialog\(\);\s*await goToPage\('dispatch'\);/);
  assert.match(mainScript, /staffAccess\.open = true;/);
});

test('staff logout clears account-scoped notification state and refresh flags', () => {
  const staffScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'staff', 'staff.js'), 'utf8');
  const logout = staffScript.match(/action === 'logout'[\s\S]*?renderLogin\(\);/);

  assert.ok(logout, 'staff logout handler should remain present');
  assert.match(logout[0], /state\.notifications = \[\];/);
  assert.match(logout[0], /state\.notificationIds = \[\];/);
  assert.match(logout[0], /state\.unreadNotifications = 0;/);
  assert.match(logout[0], /state\.assignmentsLoaded = false;/);
  assert.match(logout[0], /state\.notificationsLoaded = false;/);
});

test('staff checkbox accent uses a defined token and refreshed shell assets', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'client', 'css', 'staff.css'), 'utf8');
  const staffPage = fs.readFileSync(path.join(ROOT, 'client', 'pages', 'staff.html'), 'utf8');
  const staffWorker = fs.readFileSync(path.join(ROOT, 'client', 'pwa', 'staff-sw.js'), 'utf8');

  assert.match(styles, /accent-color:\s*var\(--staff-blue,\s*#1675df\);/);
  assert.match(staffPage, /\/client\/css\/staff\.css\?v=19/);
  assert.match(staffPage, /\/client\/js\/staff\/staff\.js\?v=20/);
  assert.match(staffWorker, /\/client\/css\/staff\.css\?v=19/);
  assert.match(staffWorker, /\/client\/js\/staff\/staff\.js\?v=20/);
});

test('community notification category controls use pressed button semantics', () => {
  const communityScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'community', 'community.js'), 'utf8');

  assert.match(communityScript, /class="mobile-segments notification-category-tabs" role="group" aria-label="Notification categories"/);
  assert.match(communityScript, /class="mobile-segment \$\{category === key \? 'active' : ''\}" aria-pressed="\$\{category === key\}"/);
  assert.match(communityScript, /data-action="mobile-notification-category" data-value="\$\{key\}"/);
  assert.doesNotMatch(communityScript, /notification-category-tabs" role="tablist"|role="tab" aria-selected=/);
});

test('community boot failure provides a safe offline retry state', () => {
  const mainScript = fs.readFileSync(path.join(ROOT, 'client', 'js', 'shared', 'main.js'), 'utf8');

  assert.match(mainScript, /const offline = navigator\.onLine === false;/);
  assert.match(mainScript, /const heading = offline \? 'You are offline' : 'Cannot reach the server';/);
  assert.match(mainScript, /Account and report data cannot be loaded without an internet connection\./);
  assert.match(mainScript, /data-action="reload">\$\{retryLabel\}/);
  assert.match(mainScript, /if \(event\.target\.closest\('\[data-action="reload"\]'\)\) \{\s*window\.location\.reload\(\);/);
});
