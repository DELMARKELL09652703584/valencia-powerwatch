/* Admin / Staff portal - desktop layout */

const ADMIN_NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'reports', label: 'Reports', roles: STAFF_ROLES },
  { key: 'verification', label: 'Verification', roles: STAFF_ROLES },
  { key: 'incidents', label: 'Incidents' },
  { key: 'outage-monitoring', label: 'Outage Monitoring', roles: STAFF_ROLES },
  { key: 'map', label: 'Map / GIS', roles: STAFF_ROLES },
  { key: 'scheduled', label: 'Scheduled Outages', roles: STAFF_ROLES },
  { key: 'announcements', label: 'Announcements', roles: STAFF_ROLES },
  { key: 'history', label: 'Outage History' },
  { key: 'users', label: 'Users', roles: ['administrator'] },
  { key: 'barangays', label: 'Barangays', roles: ['administrator'] },
  { key: 'analytics', label: 'Analytics & Reports', roles: STAFF_ROLES },
  { key: 'audit', label: 'Audit Logs', roles: ['administrator'] },
  { key: 'settings', label: 'Settings', roles: ['administrator'] },
];

const visibleAdminNav = () => ADMIN_NAV.filter((item) => !item.roles || item.roles.includes(state.user?.role));

function adminNavIcon(key) {
  const paths = {
    dashboard: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"></path>',
    reports: '<path d="M8 4h11a2 2 0 0 1 2 2v14H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1"></path><path d="M8 2v4M9 10h8M9 14h8M9 18h5"></path>',
    verification: '<path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z"></path><path d="m8.5 12 2.2 2.2 4.8-5"></path>',
    incidents: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"></path><path d="m13 7-3 6h4l-3 5"></path>',
    'outage-monitoring': '<path d="M12 3v2m0 14v2M4.2 6.2l1.4 1.4m12.8 8.8 1.4 1.4M3 12h2m14 0h2M4.2 17.8l1.4-1.4m12.8-8.8 1.4-1.4"></path><circle cx="12" cy="12" r="5"></circle>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"></path><path d="M9 3v15m6-12v15"></path><circle cx="12" cy="10" r="2"></circle>',
    scheduled: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path>',
    announcements: '<path d="M3 11v2a2 2 0 0 0 2 2h2l3 5h3l-2-6 8 3V7l-8 3H5a2 2 0 0 0-2 1z"></path>',
    notifications: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path>',
    history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"></path><path d="M3 3v5h5m4-1v5l3 2"></path>',
    analytics: '<path d="M4 20V10m5 10V4m5 16v-7m5 7V7"></path><path d="M2 20h20"></path>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="10" cy="7" r="4"></circle><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"></path>',
    barangays: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z"></path><circle cx="12" cy="10" r="2.5"></circle>',
    audit: '<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"></path><path d="M8 2h8v4H8zM7 11h6m-6 4h4"></path><circle cx="17" cy="13" r="4"></circle><path d="m20 16 2 2"></path>',
    settings: '<circle cx="12" cy="12" r="3"></circle><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2z"></path>',
  };
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key] || paths.dashboard}</svg>`;
}

function adminShell(content) {
  const nav = visibleAdminNav();
  const info = state.config.system_info || {};
  const groups = nav.map((item) => {
    return `<button type="button" class="nav-item ${state.page === item.key ? 'active' : ''}" data-page="${item.key}" aria-current="${state.page === item.key ? 'page' : 'false'}">
      <span class="nav-icon">${adminNavIcon(item.key)}</span><span>${escapeHtml(item.label)}</span>
    </button>`;
  }).join('');

  app.innerHTML = `<div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="admin-brand">
        ${info.logoData ? `<img class="admin-logo" src="${escapeHtml(info.logoData)}" alt="System logo">` : '<img class="admin-logo" src="/assets/powerwatch-logo.svg" alt="Valencia PowerWatch">'}
        <div><strong>Valencia</strong><b>PowerWatch</b><small>Admin / Staff Portal</small></div>
      </div>
      <nav class="admin-nav">${groups}</nav>
      <div class="admin-sidebar-foot">
        <button type="button" class="admin-user" data-page="profile" aria-label="Open profile for ${escapeHtml(state.user.full_name)}">
          <div class="avatar">${escapeHtml((state.user.full_name || '?').charAt(0).toUpperCase())}</div>
          <div class="admin-user-meta"><strong>${escapeHtml(state.user.full_name)}</strong><span>${escapeHtml(roleLabel(state.user.role))}</span></div>
        </button>
        <button class="button ghost block" data-action="logout">Sign out</button>
      </div>
    </aside>
    <main class="admin-main">
      <header class="admin-topbar">
        <div>
          <h1>${escapeHtml(nav.find((n) => n.key === state.page)?.label || (state.page === 'notifications' ? 'Notifications' : state.page === 'profile' ? 'My Profile' : 'Dashboard'))}</h1>
          <p class="topbar-sub">${escapeHtml(info.locality || 'Valencia City, Bukidnon')}</p>
        </div>
        <div class="topbar-right" style="display:flex;align-items:center;gap:10px;">
          <div class="grid-pulse-bar ${Number(state.activeIncidentsCount || 0) > 0 ? 'has-outage' : ''}" title="Valencia Grid Health Status">
            <span class="pulse-dot"></span>
            <span>${Number(state.activeIncidentsCount || 0) > 0 ? `${state.activeIncidentsCount} Outage${state.activeIncidentsCount > 1 ? 's' : ''} Active` : 'Grid Online: 99.2% Normal'}</span>
          </div>
          <button type="button" class="topbar-search-trigger" data-action="open-command-palette" title="Quick Search (Ctrl + K)">
            <span>🔍 Search...</span>
            <kbd>Ctrl K</kbd>
          </button>
          <button type="button" class="theme-toggle-btn" data-action="toggle-admin-theme" title="Toggle Command Center Night Ops Mode">
            <span id="theme-btn-icon">${document.documentElement.classList.contains('dark-mode') ? '☀️' : '🌙'}</span>
            <span id="theme-btn-text">${document.documentElement.classList.contains('dark-mode') ? 'Light' : 'Night Ops'}</span>
          </button>
          <div class="notification-menu">
            <button type="button" class="icon-button notification-bell" data-action="toggle-notification-panel" aria-label="Notifications${state.unread ? `, ${state.unread} unread` : ''}" aria-haspopup="dialog" aria-expanded="${Boolean(state.notificationPanelOpen)}" aria-controls="admin-notification-panel" title="Notifications">
              ${adminNavIcon('notifications')}${state.unread ? `<span class="notification-badge">${state.unread > 99 ? '99+' : state.unread}</span>` : ''}
            </button>
            ${state.notificationPanelOpen ? `<section class="admin-notification-panel" id="admin-notification-panel" role="dialog" aria-label="Recent notifications">
              <header class="notification-panel-heading"><div><h2>Notifications</h2><span>${state.unread ? `${state.unread} unread` : 'You are all caught up'}</span></div><button type="button" class="notification-panel-close" data-action="close-notification-panel" aria-label="Close notifications">×</button></header>
              ${state.unread ? '<button type="button" class="notification-panel-mark-all" data-action="mark-all-read">Mark all as read</button>' : ''}
              <div class="notification-panel-list" aria-live="polite">${state.notificationPreview.length ? state.notificationPreview.map((notice) => `<article class="notification-panel-item ${notice.read ? 'read' : 'unread'}">
                <span class="notification-panel-type ${escapeHtml(notice.type || 'general')}" aria-hidden="true"></span>
                <button type="button" class="notification-panel-open" data-action="view-admin-notification" data-id="${notice.id}"><strong>${escapeHtml(notice.title)}</strong><span>${escapeHtml(notice.message || '')}</span><time datetime="${escapeHtml(notice.created_at || '')}">${escapeHtml(formatDateTime(notice.created_at))}</time></button>
                ${!notice.read ? '<button type="button" class="notification-panel-read" data-action="toggle-admin-notification" data-id="' + notice.id + '" data-value="read" aria-label="Mark ' + escapeHtml(notice.title) + ' as read" title="Mark as read">✓</button>' : ''}
              </article>`).join('') : '<p class="notification-panel-empty">No notifications yet.</p>'}</div>
              <footer class="notification-panel-footer"><button type="button" data-action="view-all-notifications">View all notifications</button></footer>
            </section>` : ''}
          </div>
        </div>
      </header>
      <section class="admin-content" id="admin-content">${content}</section>
    </main>
  </div>
  ${dialogMarkup()}
  <div class="toast" role="status" hidden></div>`;
}
function dialogMarkup() {
  return `<dialog id="action-dialog" class="action-dialog"><form method="dialog" id="dialog-form">
    <header class="dialog-head"><h3 id="dialog-title">Action</h3><button type="button" class="dialog-close" data-action="close-dialog" aria-label="Close">×</button></header>
    <div class="dialog-body" id="dialog-body"></div>
    <footer class="dialog-foot" id="dialog-foot"></footer>
  </form></dialog>`;
}

function openDialog(title, bodyHtml, submitLabel = 'Save', { form, id } = {}) {
  const dialog = document.getElementById('action-dialog');
  if (!dialog) return;
  const dialogForm = document.getElementById('dialog-form');
  if (form) dialogForm.dataset.form = form;
  else delete dialogForm.dataset.form;
  if (id) dialogForm.dataset.id = id;
  else delete dialogForm.dataset.id;
  document.getElementById('dialog-title').textContent = title;
  document.getElementById('dialog-body').innerHTML = bodyHtml;
  document.getElementById('dialog-foot').innerHTML = `<button type="button" class="button ghost" data-action="close-dialog">Cancel</button><button type="submit" form="dialog-form" class="button primary">${escapeHtml(submitLabel)}</button>`;
  dialog.showModal();
}

function setDialogFooter(html) {
  const foot = document.getElementById('dialog-foot');
  if (foot) foot.innerHTML = html;
}

function closeDialog() {
  const dialog = document.getElementById('action-dialog');
  if (dialog && dialog.open) dialog.close();
}

function statCards(stats) {
  const cards = [
    { label: 'Total reports', value: stats.reports_total, tone: 'blue', icon: '📋' },
    { label: 'Pending review', value: stats.reports_pending, tone: 'amber', icon: '⏳' },
    { label: 'Under review', value: stats.reports_under_review, tone: 'violet', icon: '🔍' },
    { label: 'Verified', value: stats.reports_verified, tone: 'green', icon: '✅' },
    { label: 'Active incidents', value: stats.active_incidents, tone: 'red', icon: '⚡' },
    { label: 'Ongoing', value: stats.ongoing, tone: 'orange', icon: '🔴' },
    { label: 'Restored', value: stats.restored, tone: 'teal', icon: '🌤️' },
    { label: 'Scheduled', value: stats.scheduled, tone: 'indigo', icon: '🗓' },
  ];
  return `<div class="stat-grid">${cards.map((card) => `<div class="stat-card stat-${card.tone}">
    <span class="stat-icon">${card.icon}</span>
    <span class="stat-label">${escapeHtml(card.label)}</span>
    <strong class="stat-value">${escapeHtml(String(card.value ?? 0))}</strong>
  </div>`).join('')}</div>`;
}

async function renderAdminDashboard() {
  adminShell(loadingState('Loading dashboard…'));
  const [{ stats }, monthly, barangay, incidentStatus] = await Promise.all([
    api('/api/analytics/dashboard'),
    api('/api/analytics/monthly'),
    api('/api/analytics/barangay'),
    api('/api/analytics/status'),
  ]);
  const recent = canManage() ? (await api('/api/reports')).reports.slice(0, 6) : [];
  const active = (await api('/api/incidents')).incidents.slice(0, 4);
  const resolvedCount = Number(stats.resolved || 0) + Number(stats.restored || 0);
  state.activeIncidentsCount = Number(stats.ongoing || stats.active_incidents || 0);
  const cards = [
    { label: 'Total Reports', value: stats.reports_total, icon: '♙', tone: 'blue', page: 'reports' },
    { label: 'Pending Verification', value: Number(stats.reports_pending || 0) + Number(stats.reports_under_review || 0), icon: '▣', tone: 'amber', page: 'verification' },
    { label: 'Active Outages', value: stats.ongoing, icon: '⚡', tone: 'red', page: 'outage-monitoring' },
    { label: 'Scheduled Outages', value: stats.scheduled, icon: '♟', tone: 'violet', page: 'scheduled' },
    { label: 'Resolved Incidents', value: resolvedCount, icon: '✓', tone: 'green', page: 'history' },
  ];

  const barangayRows = (barangay.data || []).slice(0, 6).map((row) => ({ label: row.barangay, value: Number(row.c) || 0 }));
  const otherCount = (barangay.data || []).slice(6).reduce((sum, row) => sum + (Number(row.c) || 0), 0);
  if (otherCount) barangayRows.push({ label: 'Others', value: otherCount });
  const barMaximum = Math.max(1, ...barangayRows.map((row) => row.value));
  const barTicks = Array.from({ length: 5 }, (_, index) => Math.ceil(barMaximum * (4 - index) / 4));
  const barangayBars = barangayRows.map((row) => `<div class="dashboard-bar-item" title="${escapeHtml(row.label)}: ${row.value}"><strong>${row.value}</strong><div><i style="height:${Math.max(3, row.value / barMaximum * 100)}%"></i></div><span>${escapeHtml(row.label)}</span></div>`).join('');

  const monthlyRows = (monthly.data || []).slice(-12);
  const trendMaximum = Math.max(1, ...monthlyRows.flatMap((row) => [Number(row.scheduled) || 0, Number(row.unexpected) || 0]));
  const chartX = (index) => monthlyRows.length < 2 ? 300 : 34 + index / (monthlyRows.length - 1) * 532;
  const chartY = (value) => 205 - (Number(value) || 0) / trendMaximum * 170;
  const scheduledPoints = monthlyRows.map((row, index) => `${chartX(index)},${chartY(row.scheduled)}`).join(' ');
  const unexpectedPoints = monthlyRows.map((row, index) => `${chartX(index)},${chartY(row.unexpected)}`).join(' ');
  const trendChart = monthlyRows.length ? `<div class="dashboard-trend-legend"><span><i class="scheduled-key"></i>Scheduled</span><span><i class="unexpected-key"></i>Unexpected</span></div>
    <svg class="dashboard-trend-svg" viewBox="0 0 600 250" role="img" aria-label="Monthly scheduled and unexpected outage trend">
      ${[0, 1, 2, 3, 4].map((index) => { const y = 205 - index * 42.5; const value = Math.round(trendMaximum * index / 4); return `<line x1="32" y1="${y}" x2="570" y2="${y}" class="trend-grid-line"></line><text x="25" y="${y + 4}" text-anchor="end" class="trend-axis-label">${value}</text>`; }).join('')}
      ${scheduledPoints ? `<polyline points="${scheduledPoints}" class="trend-line scheduled"></polyline>` : ''}${unexpectedPoints ? `<polyline points="${unexpectedPoints}" class="trend-line unexpected"></polyline>` : ''}
      ${monthlyRows.map((row, index) => `<circle cx="${chartX(index)}" cy="${chartY(row.scheduled)}" r="4" class="trend-point scheduled"></circle><circle cx="${chartX(index)}" cy="${chartY(row.unexpected)}" r="4" class="trend-point unexpected"></circle><text x="${chartX(index)}" y="236" text-anchor="middle" class="trend-month-label">${escapeHtml(String(row.month).split(' ')[0])}</text>`).join('')}
    </svg>` : emptyState('No monthly outage trend', 'Outage trend appears when incidents have a start date.', '📈');

  const statusRows = (incidentStatus.data || []).filter((row) => Number(row.c) > 0);
  const statusTotal = statusRows.reduce((sum, row) => sum + Number(row.c), 0);
  const statusColors = ['#1676df', '#169b78', '#efaa20', '#dd4c4e', '#7966c3', '#1aa8c9'];
  let statusOffset = 0;
  const statusSlices = statusRows.map((row, index) => {
    const start = statusOffset;
    statusOffset += statusTotal ? Number(row.c) / statusTotal * 100 : 0;
    return { ...row, color: statusColors[index % statusColors.length], start, end: statusOffset, percent: statusTotal ? Math.round(Number(row.c) / statusTotal * 100) : 0 };
  });
  const statusGradient = statusSlices.length ? `conic-gradient(${statusSlices.map((slice) => `${slice.color} ${slice.start}% ${slice.end}%`).join(', ')})` : 'conic-gradient(#e5edf3 0 100%)';

  adminShell(`<section class="admin-dashboard-page">
    <header class="dashboard-welcome"><div><p class="dashboard-welcome-label">DASHBOARD</p><h2>Welcome back, <strong>${escapeHtml(state.user?.full_name || 'Administrator')}</strong></h2><span>${escapeHtml(roleLabel(state.user?.role))}</span></div></header>
    <div class="dashboard-stat-grid">${cards.map((card) => `<button type="button" class="dashboard-stat-card ${card.tone}" data-page="${card.page}"><span class="dashboard-stat-icon">${card.icon}</span><span class="dashboard-stat-label">${escapeHtml(card.label)}</span><strong>${escapeHtml(Number(card.value || 0).toLocaleString())}</strong></button>`).join('')}</div>
    <div class="dashboard-visual-grid">
      <section class="dashboard-visual-panel dashboard-bar-panel"><header><h3>Reports by Barangay</h3><span>${stats.reports_total} reports</span></header>
        ${barangayRows.length ? `<div class="dashboard-bar-chart"><div class="dashboard-bar-axis">${barTicks.map((tick) => `<span>${tick}</span>`).join('')}</div><div class="dashboard-bar-plot">${barangayBars}</div></div>` : `<div class="dashboard-chart-empty">${emptyState('No reports by barangay', 'Barangay totals appear when residents submit reports.', '📊')}</div>`}
      </section>
      <section class="dashboard-visual-panel dashboard-trend-panel"><header><h3>Monthly Outage Trend</h3></header>${trendChart}</section>
      <section class="dashboard-visual-panel dashboard-status-panel"><header><h3>Incident Status</h3></header>
        ${statusSlices.length ? `<div class="dashboard-status-layout"><div class="dashboard-status-donut" style="--status-chart:${statusGradient}" role="img" aria-label="Incident status breakdown"><div><strong>${statusTotal}</strong><span>Incidents</span></div></div><ul>${statusSlices.map((slice) => `<li><i style="--status-color:${slice.color}"></i><span>${escapeHtml(slice.status)}</span><b>${slice.percent}%</b></li>`).join('')}</ul></div>` : `<div class="dashboard-chart-empty">${emptyState('No incident status data', 'Status breakdown appears when incidents are recorded.', '◌')}</div>`}
      </section>
    </div>
    <div class="dashboard-activity-grid">
      <section class="panel"><div class="panel-head"><h2>Recent reports</h2>${canManage() ? '<button class="link-button" data-page="reports">View all</button>' : ''}</div>
        ${recent.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>Code</th><th>Barangay</th><th>Reporter</th><th>Status</th><th>Reported</th></tr></thead><tbody>${recent.map((row) => `<tr><td class="mono">${escapeHtml(row.report_code)}</td><td>${escapeHtml(row.barangay)}</td><td>${escapeHtml(row.reporter_name)}</td><td>${statusPill(row.status)}</td><td class="muted">${escapeHtml(formatDateTime(row.reported_at))}</td></tr>`).join('')}</tbody></table></div>` : emptyState('No reports yet', 'Resident reports will appear here once submitted.', '📋')}
      </section>
      <section class="panel"><div class="panel-head"><h2>Active incidents</h2><button class="link-button" data-page="incidents">View all</button></div>
        ${active.length ? `<ul class="feed-list">${active.map((item) => `<li><div><strong>${escapeHtml(item.incident_code)}</strong> — ${escapeHtml(item.title)}</div><div class="feed-meta">${escapeHtml(item.barangay)} · ${statusPill(item.status)}</div><div class="muted small">${escapeHtml(formatDateTime(item.start_time))}</div></li>`).join('')}</ul>` : emptyState('No active incidents', 'The city currently has no ongoing interruptions.', '⚡')}
      </section>
    </div>
  </section>`);
}

async function renderAdminReports() {
  const f = state.filters;
  const params = query({ status: f.reportStatus, verification: f.reportVerification, barangay: f.reportBarangay, q: f.reportSearch });
  const [{ reports, statuses }, data] = await Promise.all([api(`/api/reports${params}`), api('/api/reports')]);
  const reportTabs = [['All Reports', ''], ['Pending', 'Submitted'], ['Under Review', 'Under Review'], ['Verified', 'Verified'], ['Rejected', 'Rejected'], ['Duplicate', 'Duplicate']];

  const visibleReports = reports.filter((row) => (!f.reportFrom || String(row.reported_at).slice(0, 10) >= f.reportFrom)
    && (!f.reportTo || String(row.reported_at).slice(0, 10) <= f.reportTo));

  const statusCounts = (status) => (status ? data.reports.filter((row) => row.status === status).length : data.reports.length);
  const pageSize = 8;
  const page = Math.max(1, Number(state.reportPage || 1));
  const totalPages = Math.max(1, Math.ceil(visibleReports.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageRows = visibleReports.slice(startIndex, startIndex + pageSize);

  const tabMarkup = reportTabs.map(([label, status]) => {
    const count = statusCounts(status);
    return `<button class="report-tab ${f.reportStatus === status ? 'active' : ''}" data-action="filter-report-status" data-value="${status}">${label} <span>(${count})</span></button>`;
  }).join('');

  const badgeClass = (value) => {
    const status = String(value || '').toLowerCase();
    if (status === 'under review' || status === 'under verification') return 'report-status review';
    if (status === 'verified' || status === 'officially confirmed' || status === 'resolved') return 'report-status verified';
    if (status === 'rejected' || status === 'duplicate') return 'report-status rejected';
    if (status === 'submitted' || status === 'pending') return 'report-status pending';
    return 'report-status neutral';
  };

  const pagination = Array.from({ length: totalPages }, (_, index) => index + 1).map((n) => `
    <button type="button" class="page-number ${n === safePage ? 'active' : ''}" data-action="report-page" data-value="${n}">${n}</button>
  `).join('');

  adminShell(`
    <div class="reports-management-shell">
      <div class="reports-page-header">
        <h1>Reports Management</h1>
        <button class="reports-close" type="button" data-action="close-dialog" aria-label="Close reports management">×</button>
      </div>

      <div class="reports-tabs-wrap">
        <div class="segmented reports-tabs">${tabMarkup}</div>
      </div>

      <div class="reports-controls">
        <label class="reports-search-field" aria-label="Search reports">
          <span class="field-icon search-icon">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20L16.65 16.65"></path></svg>
          </span>
          <input type="search" placeholder="Search by report ID, location, barangay..." value="${escapeHtml(f.reportSearch || '')}" data-filter="reportSearch">
        </label>

        <label class="reports-date-field" aria-label="From date">
          <span class="field-icon">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>
          </span>
          <input type="date" value="${escapeHtml(f.reportFrom || '')}" data-filter="reportFrom">
        </label>

        <label class="reports-date-field" aria-label="To date">
          <span class="field-icon">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>
          </span>
          <input type="date" value="${escapeHtml(f.reportTo || '')}" data-filter="reportTo">
        </label>

        <button class="reports-filter-btn" type="button" data-action="apply-report-filters">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M7 12h10M10 18h4"></path></svg>
          Filter
        </button>
      </div>

      <div class="reports-table-wrap">
        <table class="reports-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date & Time</th>
              <th>Location</th>
              <th>Barangay</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pageRows.length ? pageRows.map((row) => `
              <tr>
                <td class="report-id-cell">${escapeHtml(row.report_code)}</td>
                <td class="report-date-cell">${escapeHtml(formatDate(row.reported_at))}<br><span>${escapeHtml(formatTime(row.reported_at))}</span></td>
                <td>${escapeHtml(row.location || row.affected_area || '—')}</td>
                <td>${escapeHtml(row.barangay || '—')}</td>
                <td>${escapeHtml(row.possible_outage_type || '—')}</td>
                <td><span class="${badgeClass(row.status)}">${escapeHtml(row.status || 'Pending')}</span></td>
                <td class="report-actions-cell">
                  <button class="report-action-btn" type="button" data-action="view-report" data-id="${row.id}" aria-label="View report ${escapeHtml(row.report_code)}">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                  <button class="report-action-btn" type="button" data-action="update-report-status" data-id="${row.id}" aria-label="Update status for ${escapeHtml(row.report_code)}">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>
                  </button>
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="7">
                  <div class="reports-empty-state">${emptyState('No reports match', 'Adjust the filters to see more results.', '🔍')}</div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <div class="reports-pagination">
        <button class="page-arrow" type="button" data-action="report-page" data-value="${Math.max(1, safePage - 1)}" aria-label="Previous page">‹</button>
        ${pagination}
        <button class="page-arrow" type="button" data-action="report-page" data-value="${Math.min(totalPages, safePage + 1)}" aria-label="Next page">›</button>
      </div>
    </div>
  `);

  void statuses;
}

async function renderAdminVerification() {
  const [{ reports }, { incidents }, { barangays }] = await Promise.all([
    api('/api/reports'), api('/api/incidents'), api('/api/barangays/locations'),
  ]);
  const reportFilter = state.filters.verificationStatus || '';
  const search = String(state.filters.verificationSearch || '').trim().toLowerCase();
  const filters = [
    ['All reports', ''], ['Pending', 'Submitted'], ['Under review', 'Under Review'],
    ['Verified', 'Verified'], ['Rejected', 'Rejected'], ['Duplicate', 'Duplicate'],
  ];
  const statusGroups = {
    Submitted: ['Submitted', 'Pending'],
    Verified: ['Verified', 'Officially Confirmed', 'Resolved'],
  };
  const filteredReports = reports.filter((report) => {
    const matchesStatus = !reportFilter || (statusGroups[reportFilter] || [reportFilter]).includes(report.status);
    const searchable = [report.report_code, report.reporter_name, report.location, report.affected_area,
      report.barangay, report.possible_outage_type, report.description].join(' ').toLowerCase();
    return matchesStatus && (!search || searchable.includes(search));
  });
  const defaultReport = filteredReports.find((report) => ['Submitted', 'Pending'].includes(report.status))
    || filteredReports.find((report) => report.status === 'Under Review')
    || filteredReports[0];
  const selectedId = filteredReports.some((report) => String(report.id) === String(state.verificationReportId))
    ? state.verificationReportId
    : defaultReport?.id;
  state.verificationReportId = selectedId || null;
  const selectedRow = filteredReports.find((report) => String(report.id) === String(selectedId));
  let report = null;
  if (selectedRow) {
    const result = await api(`/api/reports/${selectedRow.id}`);
    report = result.report;
  }

  const statusLabels = { Submitted: 'Pending', 'Under Review': 'Under Review', Verified: 'Verified', 'Officially Confirmed': 'Verified', Rejected: 'Rejected', Duplicate: 'Duplicate', Resolved: 'Verified' };
  const statusClass = (status) => {
    if (status === 'Submitted' || status === 'Pending') return 'pending';
    if (status === 'Under Review') return 'review';
    if (['Verified', 'Officially Confirmed', 'Resolved'].includes(status)) return 'verified';
    if (['Rejected', 'Duplicate'].includes(status)) return 'rejected';
    return 'neutral';
  };
  const reportStatus = report?.status || '';
  const reviewStatus = report?.verification_status || reportStatus || 'Pending';
  const attachments = report ? [...(report.attachments || [])] : [];
  if (report?.photo_path && !attachments.some((attachment) => attachment.file_path === report.photo_path)) {
    attachments.unshift({ file_path: report.photo_path, mime_type: 'image/jpeg', original_name: 'Report photo' });
  }
  const coordinates = report && hasCoordinates(report)
    ? { latitude: Number(report.latitude), longitude: Number(report.longitude), exact: true }
    : (() => {
      const center = barangays.find((item) => item.name === report?.barangay && hasCoordinates(item));
      return center ? { latitude: Number(center.latitude), longitude: Number(center.longitude), exact: false } : null;
    })();
  const distanceKm = (first, second) => {
    const radians = (degrees) => degrees * Math.PI / 180;
    const latDelta = radians(Number(first.latitude) - Number(second.latitude));
    const lngDelta = radians(Number(first.longitude) - Number(second.longitude));
    const value = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(Number(second.latitude)))
      * Math.cos(radians(Number(first.latitude))) * Math.sin(lngDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  };
  const nearbyReports = report ? reports.filter((item) => String(item.id) !== String(report.id))
    .map((item) => {
      if (hasCoordinates(report) && hasCoordinates(item)) return { ...item, distance: distanceKm(report, item) };
      return item.barangay === report.barangay ? { ...item, distance: null } : null;
    }).filter(Boolean).sort((first, second) => {
      if (first.distance === null) return second.distance === null ? 0 : 1;
      if (second.distance === null) return -1;
      return first.distance - second.distance;
    }).slice(0, 3) : [];
  const canVerify = report && !['Verified', 'Officially Confirmed', 'Resolved', 'Duplicate', 'Rejected'].includes(reportStatus);
  const canReject = report && !['Rejected', 'Duplicate'].includes(reportStatus);
  const canLinkIncident = canReject && ['administrator', 'personnel'].includes(state.user?.role);
  const canMarkDuplicate = report && !['Rejected', 'Duplicate'].includes(reportStatus)
    && ['administrator', 'personnel'].includes(state.user?.role);
  const icon = (name) => {
    const paths = {
      check: '<path d="m5 12 4 4L19 6"></path>',
      duplicate: '<path d="M8 8h12v12H8z"></path><path d="M4 16V4h12"></path>',
      reject: '<circle cx="12" cy="12" r="9"></circle><path d="m9 9 6 6m0-6-6 6"></path>',
      link: '<path d="M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7"></path><path d="M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7"></path>',
    };
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  };
  const filterMarkup = filters.map(([label, status]) => {
    const count = status ? reports.filter((item) => (statusGroups[status] || [status]).includes(item.status)).length : reports.length;
    return `<button type="button" class="verification-tab ${reportFilter === status ? 'active' : ''}" data-action="filter-verification" data-value="${status}">${label}<span>${count}</span></button>`;
  }).join('');
  const evidenceMarkup = attachments.length ? attachments.slice(0, 2).map((attachment) => `
    <button type="button" class="verification-evidence-thumb" data-action="verification-view-evidence" data-id="${report.id}" aria-label="View evidence ${escapeHtml(attachment.original_name || '')}">
      ${String(attachment.mime_type || '').startsWith('video/')
        ? `<video src="${escapeHtml(attachment.file_path)}" muted preload="metadata"></video><span class="video-indicator">Video</span>`
        : `<img src="${escapeHtml(attachment.file_path)}" alt="${escapeHtml(attachment.original_name || 'Report evidence')}">`}
    </button>`).join('') : '<p class="verification-no-evidence">No evidence attachments were submitted with this report.</p>';

  adminShell(`<section class="verification-page">
    <div class="verification-heading-row">
      <div><p class="verification-eyebrow">REPORT REVIEW</p><h2>Report Verification</h2></div>
      <div class="verification-heading-actions">
        <button type="button" class="verification-icon-btn" data-action="verification-refresh" aria-label="Refresh report data" title="Refresh">⟳</button>
        <button type="button" class="verification-icon-btn" data-page="notifications" aria-label="Open notifications" title="Notifications"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg></button>
      </div>
    </div>

    <div class="verification-toolbar">
      <div class="verification-tabs">${filterMarkup}</div>
      <label class="verification-search" aria-label="Search reports">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
        <input type="search" data-filter="verificationSearch" value="${escapeHtml(state.filters.verificationSearch || '')}" placeholder="Search report ID, location, barangay...">
      </label>
    </div>

    ${report ? `<article class="verification-detail">
      <header class="verification-report-summary">
        <div>
          <p class="verification-report-id">Report ID: <strong>${escapeHtml(report.report_code)}</strong></p>
          <p class="verification-reported-at"><span aria-hidden="true">◷</span>${escapeHtml(formatDateTime(report.reported_at))}</p>
        </div>
        <span class="verification-status-badge ${statusClass(reviewStatus)}">${escapeHtml(statusLabels[reviewStatus] || reviewStatus)}</span>
      </header>

      <div class="verification-detail-grid">
        <section class="verification-left-column">
          <div class="verification-report-facts">
            <div><span>Reporter:</span><strong>${escapeHtml(report.reporter_name || 'Unknown reporter')}</strong></div>
            <div><span>Location:</span><strong>${escapeHtml(report.location || report.affected_area || report.barangay || 'Not provided')}</strong></div>
            <div><span>Barangay:</span><strong>${escapeHtml(report.barangay || 'Not provided')}</strong></div>
            <div><span>Type:</span><strong>${escapeHtml(report.possible_outage_type || 'Power Outage')}</strong></div>
            <div class="description-row"><span>Description:</span><strong>${escapeHtml(report.description || 'No description provided.')}</strong></div>
          </div>

          <section class="verification-evidence-block">
            <div class="verification-section-heading"><h3>Evidence (${attachments.length})</h3>${attachments.length ? `<button type="button" data-action="verification-view-evidence" data-id="${report.id}">View all</button>` : ''}</div>
            <div class="verification-evidence-grid">${evidenceMarkup}</div>
          </section>
        </section>

        <aside class="verification-right-column">
          <section class="verification-map-card">
            ${coordinates ? `<div class="verification-map" id="verification-map" aria-label="Map showing the report location"></div><p class="verification-map-caption">${coordinates.exact ? 'Reported GPS location' : 'Approximate barangay center'} · ${escapeHtml(report.barangay || '')}</p>` : `<div class="verification-map-unavailable"><span>⌖</span><strong>Location map unavailable</strong><small>This report has no GPS coordinates or mapped barangay center.</small></div>`}
          </section>
          <section class="verification-nearby">
            <h3>Nearby Reports <span>(${nearbyReports.length})</span></h3>
            ${nearbyReports.length ? `<ul>${nearbyReports.map((item) => `<li><button type="button" class="nearby-report-link" data-action="verification-select-report" data-id="${item.id}"><span class="nearby-marker">⌖</span><span>${escapeHtml(item.report_code)}</span></button><span class="nearby-distance">${item.distance === null ? 'Same barangay' : `${item.distance.toFixed(1)} km`}</span></li>`).join('')}</ul>` : '<p class="verification-nearby-empty">No other reports to compare yet.</p>'}
          </section>
        </aside>
      </div>

      <footer class="verification-actions">
        ${canVerify ? `<button type="button" class="verification-action verify" data-action="verify-report" data-id="${report.id}">${icon('check')}Verify</button>` : ''}
        ${canMarkDuplicate ? `<button type="button" class="verification-action duplicate" data-action="verification-duplicate" data-id="${report.id}">${icon('duplicate')}Mark Duplicate</button>` : ''}
        ${canReject ? `<button type="button" class="verification-action reject" data-action="verification-reject" data-id="${report.id}">${icon('reject')}Reject</button>` : ''}
        ${canLinkIncident ? `<button type="button" class="verification-action link-incident" data-action="verification-link-incident" data-id="${report.id}">${icon('link')}Link to Incident</button>` : ''}
      </footer>
    </article>` : `<div class="verification-empty">${emptyState('No reports to review', search || reportFilter ? 'Clear your search or select another status to show reports.' : 'Submitted community reports will appear here for review.', '📋')}</div>`}
  </section>`);

  if (coordinates) {
    const mapElement = document.getElementById('verification-map');
    try {
      await loadAdminMapLibrary();
      if (!mapElement?.isConnected) return;
      const map = L.map(mapElement, { zoomControl: false, scrollWheelZoom: false }).setView([coordinates.latitude, coordinates.longitude], coordinates.exact ? 15 : 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.circleMarker([coordinates.latitude, coordinates.longitude], { radius: 10, color: '#ffffff', weight: 3, fillColor: '#e43232', fillOpacity: 1 }).addTo(map);
    } catch {
      if (mapElement?.isConnected) mapElement.innerHTML = '<p class="verification-map-fallback">Map tiles could not be loaded. The report coordinates remain available in the report record.</p>';
    }
  }
}

async function renderAdminOutageMonitoring() {
  const scheduledView = state.adminOutageView === 'scheduled';
  const filterStatusKey = scheduledView ? 'monitoringScheduledStatus' : 'monitoringIncidentStatus';
  const filterStatus = state.filters[filterStatusKey] || '';
  const params = query({ status: filterStatus, barangay: state.filters.monitoringBarangay, include_closed: 'true' });
  const [incidentData, scheduleData] = await Promise.all([
    api(`/api/incidents${scheduledView ? '' : params}`),
    api(`/api/scheduled${scheduledView ? params : ''}`),
  ]);
  const incidents = incidentData.incidents || [];
  const scheduled = scheduleData.scheduled || [];
  const sourceRows = scheduledView ? scheduled : incidents;
  const search = String(state.filters.monitoringSearch || '').trim().toLowerCase();
  const visibleRows = sourceRows.filter((item) => !search || [
    scheduledView ? item.schedule_code : item.incident_code, item.title, item.location, item.affected_area,
    item.barangay, item.outage_type, item.incident_type, item.status, item.reason,
  ].filter(Boolean).join(' ').toLowerCase().includes(search));
  const activeIncidents = incidents.filter((incident) => !['Restored', 'Closed', 'Resolved'].includes(incident.status));
  const activeAreas = new Set(activeIncidents.flatMap((incident) => incident.affected_barangays || [incident.barangay]));
  const customersAffected = activeIncidents.reduce((total, incident) => total + Number(incident.customers_affected || 0), 0);
  const progressRows = activeIncidents.filter((incident) => incident.restoration_progress !== null && incident.restoration_progress !== undefined);
  const averageProgress = progressRows.length
    ? Math.round(progressRows.reduce((sum, incident) => sum + Number(incident.restoration_progress), 0) / progressRows.length)
    : 0;
  const upcomingSchedules = scheduled.filter((item) => ['Scheduled', 'In Preparation'].includes(item.status)
    && new Date(`${item.outage_date}T${item.start_time || '00:00'}`) >= new Date());
  const affectedScheduledAreas = new Set(scheduled.map((item) => item.barangay));
  const cards = scheduledView ? [
    { label: 'Scheduled Outages', value: scheduled.length },
    { label: 'Affected Barangays', value: affectedScheduledAreas.size },
    { label: 'Upcoming', value: upcomingSchedules.length },
    { label: 'Active Incidents', value: activeIncidents.length },
  ] : [
    { label: 'Active Outages', value: activeIncidents.length },
    { label: 'Affected Barangays', value: activeAreas.size },
    { label: 'Customers Affected', value: customersAffected.toLocaleString() },
    { label: 'Restoration Progress', value: `${averageProgress}%` },
  ];
  const statuses = scheduledView ? (scheduleData.statuses || []) : (incidentData.statuses || []);
  const statusClass = (status) => {
    if (['Ongoing', 'Restoration in Progress', 'Being Implemented'].includes(status)) return 'ongoing';
    if (['Reported', 'Under Verification', 'Verified', 'Scheduled', 'In Preparation'].includes(status)) return 'monitoring-review';
    if (['Restored', 'Resolved', 'Closed', 'Completed'].includes(status)) return 'resolved';
    if (status === 'Cancelled') return 'cancelled';
    return 'neutral';
  };
  const icon = (name) => {
    const paths = {
      view: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle>',
      edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>',
      start: '<path d="m8 5 11 7-11 7z"></path>',
    };
    return `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  };
  const areaOptions = state.barangays.map((barangay) => `<option value="${escapeHtml(barangay)}" ${state.filters.monitoringBarangay === barangay ? 'selected' : ''}>${escapeHtml(barangay)}</option>`).join('');
  const rowsMarkup = visibleRows.map((item) => {
    const code = scheduledView ? item.schedule_code : item.incident_code;
    const location = item.location || item.area || item.affected_area || item.title || item.barangay;
    const outageType = item.outage_type || item.incident_type || item.reason || 'Power Outage';
    const start = scheduledView ? `${item.outage_date}T${String(item.start_time || '00:00').slice(0, 5)}` : item.start_time;
    const progress = Math.max(0, Math.min(100, Number(item.restoration_progress ?? (['Restored', 'Closed'].includes(item.status) ? 100 : 0))));
    const actions = scheduledView
      ? `<button type="button" class="monitoring-icon-action" data-action="view-schedule-details" data-id="${item.id}" aria-label="View ${escapeHtml(code)}" title="View schedule">${icon('view')}</button>
        ${canManage() ? `<button type="button" class="monitoring-icon-action" data-action="edit-schedule" data-id="${item.id}" aria-label="Edit ${escapeHtml(code)}" title="Edit schedule">${icon('edit')}</button><button type="button" class="monitoring-icon-action" data-action="update-schedule-status" data-id="${item.id}" aria-label="Update status for ${escapeHtml(code)}" title="Update status">${icon('edit')}</button>` : ''}
        ${isOfficial() && ['Scheduled', 'In Preparation'].includes(item.status) ? `<button type="button" class="monitoring-icon-action start" data-action="trigger-incident" data-id="${item.id}" aria-label="Start monitoring ${escapeHtml(code)}" title="Start as active incident">${icon('start')}</button>` : ''}`
      : `<button type="button" class="monitoring-icon-action" data-action="view-incident" data-id="${item.id}" aria-label="View ${escapeHtml(code)}" title="View incident">${icon('view')}</button>
        ${canManage() ? `<button type="button" class="monitoring-icon-action" data-action="update-incident-status" data-id="${item.id}" aria-label="Update ${escapeHtml(code)}" title="Update incident status">${icon('edit')}</button>` : ''}`;
    return `<tr>
      <td class="monitoring-code">${escapeHtml(code)}</td>
      <td>${escapeHtml(location || '—')}</td>
      <td>${escapeHtml(item.barangay || '—')}</td>
      <td>${escapeHtml(outageType)}</td>
      <td class="monitoring-start-time">${escapeHtml(formatDateTime(start))}</td>
      <td><span class="monitoring-status ${statusClass(item.status)}">${escapeHtml(item.status || 'Unknown')}</span></td>
      ${scheduledView ? '' : `<td><div class="monitor-progress"><span>${progress}%</span><div><i style="width:${progress}%"></i></div></div></td>`}
      <td><div class="monitoring-actions">${actions}</div></td>
    </tr>`;
  }).join('');
  const tableColumns = scheduledView ? 7 : 8;

  adminShell(`<section class="outage-monitoring-page">
    <header class="outage-monitoring-heading"><div><p class="outage-monitoring-eyebrow">OPERATIONS</p><h2>Outage Monitors</h2></div><button type="button" class="outage-close-button" data-page="incidents" aria-label="Close outage monitoring" title="Back to incidents">×</button></header>
    <div class="outage-view-tabs" role="tablist" aria-label="Outage monitoring view">
      <button type="button" class="outage-view-tab ${!scheduledView ? 'active' : ''}" role="tab" aria-selected="${!scheduledView}" data-action="admin-outage-view" data-value="active">Active Outages</button>
      <button type="button" class="outage-view-tab ${scheduledView ? 'active' : ''}" role="tab" aria-selected="${scheduledView}" data-action="admin-outage-view" data-value="scheduled">Scheduled Outages</button>
    </div>
    <div class="monitoring-stat-grid">${cards.map((card) => `<article class="monitoring-stat-card"><span>${escapeHtml(card.label)}</span><strong>${escapeHtml(String(card.value))}</strong></article>`).join('')}</div>
    <div class="monitoring-toolbar">
      <label class="monitoring-search" aria-label="Search outages"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><input class="input" type="search" data-filter="monitoringSearch" value="${escapeHtml(state.filters.monitoringSearch || '')}" placeholder="Search outage..."></label>
      <label class="monitoring-filter-select" aria-label="Filter by status"><select class="input" data-filter="${filterStatusKey}"><option value="">All Statuses</option>${statuses.map((status) => `<option value="${escapeHtml(status)}" ${filterStatus === status ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}</select></label>
      <label class="monitoring-filter-select" aria-label="Filter by barangay"><select class="input" data-filter="monitoringBarangay"><option value="">All Barangays</option>${areaOptions}</select></label>
      <button type="button" class="monitoring-reset-button" data-action="reset-outage-monitoring-filters">Reset</button>
      <span class="monitoring-result-count">${visibleRows.length} record${visibleRows.length === 1 ? '' : 's'}</span>
    </div>
    <div class="monitoring-table-wrap"><div class="table-scroll"><table class="monitoring-table">
      <thead><tr>${scheduledView ? '<th>ID</th><th>Location</th><th>Barangay</th><th>Type</th><th>Start Time</th><th>Status</th><th>Actions</th>' : '<th>ID</th><th>Location</th><th>Barangay</th><th>Type</th><th>Start Time</th><th>Status</th><th>Progress</th><th>Actions</th>'}</tr></thead>
      <tbody>${rowsMarkup || `<tr><td colspan="${tableColumns}" class="monitoring-empty">${emptyState(search || filterStatus || state.filters.monitoringBarangay ? 'No outages match' : scheduledView ? 'No scheduled outages' : 'No active incidents', 'Adjust your filters or create an outage record to see it here.', '⚡')}</td></tr>`}</tbody>
    </table></div></div>
  </section>`);
}

let adminMapLibraryPromise;
function loadAdminMapLibrary() {
  if (window.L && typeof window.L.heatLayer === 'function') return Promise.resolve();
  if (adminMapLibraryPromise) return adminMapLibraryPromise;
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/vendor/leaflet/leaflet.css';
  const styleReady = new Promise((resolve, reject) => {
    stylesheet.onload = resolve;
    stylesheet.onerror = () => reject(new Error('Map styles could not be loaded.'));
  });
  document.head.append(stylesheet);

  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.append(s);
  });

  adminMapLibraryPromise = styleReady
    .then(() => (window.L ? Promise.resolve() : loadScript('/vendor/leaflet/leaflet.js')))
    .then(() => (typeof window.L?.heatLayer === 'function' ? Promise.resolve() : loadScript('/assets/leaflet-heat.js').catch(() => loadScript('https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js'))))
    .then(() => undefined);

  return adminMapLibraryPromise;
}

async function renderAdminMap() {
  const [{ incidents }, { scheduled: allSchedules }, { barangays }, { reports }] = await Promise.all([
    api('/api/incidents?include_closed=true'), api('/api/scheduled'), api('/api/barangays/locations'), api('/api/reports'),
  ]);
  const scheduled = allSchedules.filter((item) => ['Scheduled', 'In Preparation'].includes(item.status));
  const mapSettings = state.config.map_settings || { latitude: 7.906, longitude: 125.094, zoom: 12, activeOutages: true, scheduledOutages: true, barangayCenters: false, satellite: false };
  let savedLayers = {};
  try {
    savedLayers = JSON.parse(localStorage.getItem(`powerwatch.map-layers.${state.user?.id || 'default'}`) || '{}');
  } catch {
    savedLayers = {};
  }
  const layers = {
    heatmap: savedLayers.heatmap !== undefined ? savedLayers.heatmap : true,
    active: mapSettings.activeOutages !== false,
    verification: true,
    resolved: true,
    scheduled: mapSettings.scheduledOutages !== false,
    barangays: mapSettings.barangayCenters === true,
    roads: true,
    rivers: true,
    satellite: mapSettings.satellite === true,
    ...savedLayers,
  };
  const activeIncidents = incidents.filter((item) => !['Restored', 'Closed', 'Resolved', 'Reported', 'Under Verification'].includes(item.status));
  const verificationReports = reports.filter((item) => !item.incident_id && ['Submitted', 'Under Review', 'Under Verification'].includes(item.status));
  const verificationIncidents = incidents.filter((item) => ['Reported', 'Under Verification'].includes(item.status));
  const verificationRecords = [...verificationReports, ...verificationIncidents];
  const resolvedIncidents = incidents.filter((item) => ['Restored', 'Closed', 'Resolved'].includes(item.status));
  const mapCenter = [Number(mapSettings.latitude) || 7.906, Number(mapSettings.longitude) || 125.094];
  const marker = (color, radius = 9) => `<span class="map-legend-marker" style="--marker-color:${color};--marker-size:${radius * 2}px"></span>`;
  const countWithCoordinates = (records) => records.filter((item) => hasCoordinates(item)
    || barangays.some((center) => center.name === item.barangay && hasCoordinates(center))).length;

  const barangayCounts = {};
  [...incidents, ...reports].forEach((item) => {
    if (item.barangay) {
      barangayCounts[item.barangay] = (barangayCounts[item.barangay] || 0) + 1;
    }
  });
  const topHotspots = Object.entries(barangayCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  adminShell(`<section class="power-map-page">
    <header class="power-map-heading"><div><p class="power-map-eyebrow">OPERATIONS</p><h2>Power Outage Map &amp; GIS Hotspots</h2></div><button type="button" class="power-map-close" data-page="dashboard" aria-label="Close map" title="Back to dashboard">×</button></header>
    <div class="power-map-layout">
      <div class="power-map-canvas-wrap">
        <div class="admin-map" id="admin-outage-map" aria-label="Interactive power outage map of Valencia City"></div>
        <div class="power-map-controls" aria-label="Map navigation controls">
          <button type="button" data-map-home aria-label="Return to Valencia City extent" title="Return to Valencia City">⌂</button>
          <button type="button" data-map-geolocate aria-label="Show my current location" title="Show my location">◎</button>
          <button type="button" data-map-toggle-heat aria-label="Toggle Outage Heatmap" title="Toggle Outage Heatmap" class="${layers.heatmap ? 'active' : ''}">🔥</button>
        </div>
        <label class="power-map-focus"><span>⌖</span><select data-map-focus aria-label="Focus map on a barangay"><option value="">Find a barangay</option>${barangays.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join('')}</select></label>
      </div>
      <aside class="power-map-sidebar">
        <section class="power-map-panel">
          <h3>Legend</h3>
          <ul class="power-map-legend">
            <li>${marker('#e5484d')}<span>Active Outage</span><b>${activeIncidents.length}</b></li>
            <li>${marker('#147bd1')}<span>Scheduled Outage</span><b>${scheduled.length}</b></li>
            <li>${marker('#f0a629')}<span>Under Verification</span><b>${countWithCoordinates(verificationRecords)}</b></li>
            <li>${marker('#25a66a')}<span>Resolved Incident</span><b>${resolvedIncidents.length}</b></li>
            <li><span class="map-boundary-key" aria-hidden="true"></span><span>Barangay Centers</span><b>${barangays.length}</b></li>
            <li class="power-map-legend-heatmap">
              <div style="display:flex;justify-content:space-between;width:100%;align-items:center;font-size:0.78rem;font-weight:700;color:#c93b2b;">
                <span>🔥 Outage Density Heatmap</span>
              </div>
              <span class="heatmap-gradient-bar" aria-hidden="true"></span>
              <div class="heatmap-gradient-labels">
                <span>Low</span>
                <span>Moderate</span>
                <span>Critical Hotspot</span>
              </div>
            </li>
          </ul>
        </section>
        <section class="power-map-panel power-map-layer-panel">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <h3 style="margin:0;">Map Controls</h3>
            <button type="button" class="link-button" id="toggle-fullscreen-btn" style="font-size:0.78rem;font-weight:700;">⛶ Fullscreen</button>
          </div>
          <div style="margin-bottom:10px;">
            <label style="font-size:0.78rem;font-weight:600;color:var(--ink-soft);display:block;margin-bottom:4px;">🎯 Fly to Barangay:</label>
            <select class="input small" id="map-fly-select" style="width:100%;font-size:0.82rem;padding:6px 8px;">
              <option value="">Select a barangay to focus...</option>
              ${barangays.map((b) => `<option value="${b.latitude},${b.longitude},${escapeHtml(b.name)}">${escapeHtml(b.name)}</option>`).join('')}
            </select>
          </div>
          <h3>Layers</h3>
          <label style="background:#fff5f5;border:1px solid #fecaca;padding:6px 9px;border-radius:7px;margin-bottom:4px;">
            <input type="checkbox" data-map-layer="heatmap" ${layers.heatmap ? 'checked' : ''}>
            <span style="font-weight:700;color:#b91c1c;">🔥 Outage Density Heatmap</span>
            <b class="heatmap-badge">Live</b>
          </label>
          <label><input type="checkbox" data-map-layer="active" ${layers.active ? 'checked' : ''}><span>Active Outages</span><b>${countWithCoordinates(activeIncidents)}</b></label>
          <label><input type="checkbox" data-map-layer="verification" ${layers.verification ? 'checked' : ''}><span>Under Verification</span><b>${countWithCoordinates(verificationRecords)}</b></label>
          <label><input type="checkbox" data-map-layer="resolved" ${layers.resolved ? 'checked' : ''}><span>Resolved Incidents</span><b>${countWithCoordinates(resolvedIncidents)}</b></label>
          <label><input type="checkbox" data-map-layer="scheduled" ${layers.scheduled ? 'checked' : ''}><span>Scheduled Outages</span><b>${countWithCoordinates(scheduled)}</b></label>
          <label><input type="checkbox" data-map-layer="barangays" ${layers.barangays ? 'checked' : ''}><span>Barangay Centers</span><b>${barangays.length}</b></label>
          <label><input type="checkbox" data-map-layer="roads" ${layers.roads ? 'checked' : ''}><span>Roads</span></label>
          <label><input type="checkbox" data-map-street-features ${layers.rivers ? 'checked' : ''}><span>Rivers</span></label>
          <label><input type="checkbox" data-map-satellite ${layers.satellite ? 'checked' : ''}><span>Satellite View</span></label>
          <p class="map-boundary-note">Rivers are shown on the OpenStreetMap street basemap. Satellite imagery and the street basemap are alternate backgrounds. Official barangay boundary polygons are not configured; barangay centers are shown instead.</p>
        </section>
        ${topHotspots.length ? `
        <section class="power-map-panel power-map-hotspots-panel">
          <h3>🔥 Top Outage Hotspots</h3>
          <ul class="power-map-legend" style="gap:7px;">
            ${topHotspots.map(([brgy, count], idx) => `
              <li style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:0.83rem;font-weight:600;"><span style="color:#e5484d;font-weight:800;margin-right:6px;">#${idx + 1}</span>${escapeHtml(brgy)}</span>
                <b style="font-size:0.78rem;background:#f1f5f9;padding:2px 7px;border-radius:6px;color:#1e293b;">${count} incident${count === 1 ? '' : 's'}</b>
              </li>
            `).join('')}
          </ul>
        </section>` : ''}
        <button type="button" class="power-map-monitoring-link" data-page="outage-monitoring">Open outage monitoring <span aria-hidden="true">→</span></button>
      </aside>
    </div>
  </section>`);

  await loadAdminMapLibrary();
  const mapElement = document.getElementById('admin-outage-map');
  if (!mapElement) return;
  const map = L.map(mapElement, {
    zoomControl: false,
    minZoom: 11,
    maxZoom: 18,
    maxBounds: [[7.6, 124.8], [8.2, 125.4]],
  }).setView(mapCenter, Math.max(13, Number(mapSettings.zoom) || 13));
  map.createPane('mapBasemap');
  map.getPane('mapBasemap').style.zIndex = 200;
  map.createPane('mapReferenceOverlays');
  map.getPane('mapReferenceOverlays').style.zIndex = 250;
  const streetTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    subdomains: 'abc',
    maxZoom: 18,
    pane: 'mapBasemap',
    attribution: '&copy; OpenStreetMap contributors',
  });
  const satelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    maxNativeZoom: 18,
    pane: 'mapBasemap',
    attribution: 'Tiles &copy; Esri',
  });
  const roadsTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    maxNativeZoom: 18,
    pane: 'mapReferenceOverlays',
    opacity: 0.95,
    attribution: 'Labels &copy; Esri',
  });
  (layers.satellite ? satelliteTiles : streetTiles).addTo(map);
  L.control.zoom({ position: 'topleft' }).addTo(map);

  const locationFor = (item) => {
    if (hasCoordinates(item)) return [Number(item.latitude), Number(item.longitude)];
    const center = barangays.find((row) => row.name === item.barangay);
    return center && hasCoordinates(center) ? [Number(center.latitude), Number(center.longitude)] : null;
  };

  const heatPoints = [];
  const addHeatItem = (item, intensity) => {
    const coords = locationFor(item);
    if (!coords) return;
    heatPoints.push([coords[0], coords[1], intensity]);
  };
  activeIncidents.forEach((item) => addHeatItem(item, 1.0));
  verificationRecords.forEach((item) => addHeatItem(item, 0.75));
  resolvedIncidents.forEach((item) => addHeatItem(item, 0.45));
  scheduled.forEach((item) => addHeatItem(item, 0.35));

  const heatLayer = (typeof L.heatLayer === 'function' && heatPoints.length) ? L.heatLayer(heatPoints, {
    radius: 32,
    blur: 20,
    maxZoom: 16,
    max: 1.0,
    minOpacity: 0.35,
    gradient: {
      0.2: '#0055ff',
      0.4: '#00d4ff',
      0.6: '#00ff66',
      0.8: '#ffcc00',
      1.0: '#ff1100',
    },
  }) : L.layerGroup();

  const layerGroups = {
    heatmap: heatLayer,
    active: L.layerGroup(), verification: L.layerGroup(), resolved: L.layerGroup(),
    scheduled: L.layerGroup(), barangays: L.layerGroup(), roads: roadsTiles,
  };
  Object.entries(layerGroups).forEach(([name, layer]) => { if (layers[name]) layer.addTo(map); });
  const incidentLayer = (item) => ['Restored', 'Closed', 'Resolved'].includes(item.status)
    ? { layer: layerGroups.resolved, color: '#25a66a', label: 'Resolved Incident' }
    : ['Reported', 'Under Verification'].includes(item.status)
      ? { layer: layerGroups.verification, color: '#f0a629', label: 'Under Verification' }
      : { layer: layerGroups.active, color: '#e5484d', label: 'Active Outage' };
  incidents.forEach((item) => {
    const coordinates = locationFor(item);
    if (!coordinates) return;
    const category = incidentLayer(item);
    const adminSev = item.severity || (String(item.incident_type || '').includes('Line Down') ? 'Critical' : String(item.incident_type || '').includes('Total') ? 'High' : 'Moderate');
    const adminSevStyle = adminSev === 'Critical' ? 'background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;' : adminSev === 'High' ? 'background:#fff7ed;color:#ea580c;border:1px solid #fdba74;' : 'background:#fefce8;color:#ca8a04;border:1px solid #fde047;';
    const adminEtr = item.estimated_restoration_time ? new Date(item.estimated_restoration_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending field assessment';

    const adminPopup = `
      <div class="map-popup-card">
        <div class="map-popup-header">
          <span class="map-popup-code">${escapeHtml(item.incident_code || 'OUTAGE')}</span>
          <span class="map-popup-badge" style="${adminSevStyle}">${escapeHtml(adminSev)}</span>
        </div>
        <h4 class="map-popup-title">${escapeHtml(item.title)}</h4>
        <div class="map-popup-meta">
          <div class="map-popup-row"><span class="map-popup-icon">📍</span><span><strong>${escapeHtml(item.barangay)}</strong></span></div>
          <div class="map-popup-row"><span class="map-popup-icon">⚡</span><span>${escapeHtml(item.incident_type || 'Outage Incident')}</span></div>
          <div class="map-popup-row"><span class="map-popup-icon">⏳</span><span><strong>ETR:</strong> <span class="map-popup-etr">${escapeHtml(adminEtr)}</span></span></div>
          <div class="map-popup-row"><span class="map-popup-icon">🔄</span><span>Status: <strong style="color:${category.color}">${escapeHtml(item.status)}</strong></span></div>
        </div>
        <button type="button" class="map-popup-btn" data-action="view-incident-details" data-id="${item.id}">Inspect Incident Record ›</button>
      </div>
    `;

    L.circleMarker(coordinates, { pane: 'markerPane', radius: 9, color: '#fff', fillColor: category.color, fillOpacity: .98, weight: 2.5 })
      .addTo(category.layer).bindPopup(adminPopup, { maxWidth: 280 });
  });
  verificationReports.forEach((report) => {
    const coordinates = locationFor(report);
    if (coordinates) L.circleMarker(coordinates, { pane: 'markerPane', radius: 8, color: '#fff', fillColor: '#f0a629', fillOpacity: .98, weight: 2.5 })
      .addTo(layerGroups.verification).bindPopup(`<strong>${escapeHtml(report.report_code)}</strong><br>${escapeHtml(report.barangay)} · ${escapeHtml(report.status)}<br>${escapeHtml(report.description || '')}`);
  });
  scheduled.forEach((item) => {
    const coordinates = locationFor(item);
    if (coordinates) L.circleMarker(coordinates, { pane: 'markerPane', radius: 8, color: '#fff', fillColor: '#147bd1', fillOpacity: .98, weight: 2.5 })
      .addTo(layerGroups.scheduled).bindPopup(`<strong>${escapeHtml(item.schedule_code)}</strong><br>${escapeHtml(item.title)}<br>${escapeHtml(item.barangay)} · ${escapeHtml(item.status)}`);
  });
  barangays.forEach((item) => {
    if (hasCoordinates(item)) L.circleMarker([Number(item.latitude), Number(item.longitude)], { pane: 'markerPane', radius: 5, color: '#fff', fillColor: '#25a66a', fillOpacity: .95, weight: 2 })
      .addTo(layerGroups.barangays).bindPopup(`<strong>${escapeHtml(item.name)}</strong><br>Barangay center`);
  });

  const saveLayerPreference = () => {
    try { localStorage.setItem(`powerwatch.map-layers.${state.user?.id || 'default'}`, JSON.stringify(layers)); } catch {}
  };
  document.querySelectorAll('[data-map-layer]').forEach((control) => control.addEventListener('change', () => {
    const layer = layerGroups[control.dataset.mapLayer];
    layers[control.dataset.mapLayer] = control.checked;
    if (control.checked) layer.addTo(map);
    else map.removeLayer(layer);
    if (control.dataset.mapLayer === 'heatmap') {
      document.querySelector('[data-map-toggle-heat]')?.classList.toggle('active', control.checked);
    }
    saveLayerPreference();
  }));
  document.querySelector('[data-map-toggle-heat]')?.addEventListener('click', (event) => {
    const checkbox = document.querySelector('[data-map-layer="heatmap"]');
    const newState = !layers.heatmap;
    layers.heatmap = newState;
    if (checkbox) checkbox.checked = newState;
    event.currentTarget.classList.toggle('active', newState);
    if (newState) heatLayer.addTo(map);
    else map.removeLayer(heatLayer);
    saveLayerPreference();
    setToast(newState ? '🔥 Outage Density Heatmap enabled' : 'Outage Density Heatmap hidden');
  });
  document.querySelector('[data-map-satellite]')?.addEventListener('change', (event) => {
    layers.satellite = event.currentTarget.checked;
    layers.rivers = !layers.satellite;
    const riversControl = document.querySelector('[data-map-street-features]');
    if (riversControl) riversControl.checked = layers.rivers;
    if (layers.satellite) { map.removeLayer(streetTiles); satelliteTiles.addTo(map); }
    else { map.removeLayer(satelliteTiles); streetTiles.addTo(map); }
    saveLayerPreference();
  });
  document.querySelector('[data-map-street-features]')?.addEventListener('change', (event) => {
    layers.rivers = event.currentTarget.checked;
    layers.satellite = !layers.rivers;
    const satelliteControl = document.querySelector('[data-map-satellite]');
    if (satelliteControl) satelliteControl.checked = layers.satellite;
    if (layers.rivers) { map.removeLayer(satelliteTiles); streetTiles.addTo(map); }
    else { map.removeLayer(streetTiles); satelliteTiles.addTo(map); }
    saveLayerPreference();
  });
  document.querySelector('[data-map-focus]')?.addEventListener('change', (event) => {
    const barangay = barangays.find((item) => item.name === event.currentTarget.value);
    if (barangay && hasCoordinates(barangay)) map.flyTo([Number(barangay.latitude), Number(barangay.longitude)], 15, { duration: .6 });
    else if (barangay) setToast(`Map coordinates are not set for ${barangay.name}.`);
  });
  document.querySelector('[data-map-home]')?.addEventListener('click', () => map.flyTo(mapCenter, Number(mapSettings.zoom) || 12, { duration: .6 }));
  document.querySelector('[data-map-geolocate]')?.addEventListener('click', () => {
    if (!navigator.geolocation) { setToast('Location is not available in this browser.'); return; }
    navigator.geolocation.getCurrentPosition((position) => {
      map.flyTo([position.coords.latitude, position.coords.longitude], 15, { duration: .6 });
      L.circleMarker([position.coords.latitude, position.coords.longitude], { pane: 'markerPane', radius: 8, color: '#fff', fillColor: '#145dd1', fillOpacity: 1, weight: 3 }).addTo(map)
        .bindPopup('Your current location').openPopup();
    }, () => setToast('Could not access your location. Check browser permissions.'), { enableHighAccuracy: true, timeout: 10000 });
  });
  document.getElementById('map-fly-select')?.addEventListener('change', (event) => {
    if (!event.target.value) return;
    const parts = event.target.value.split(',');
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    const name = parts[2] || 'Barangay';
    if (!isNaN(lat) && !isNaN(lng)) {
      map.flyTo([lat, lng], 15, { duration: 1.2 });
      L.popup()
        .setLatLng([lat, lng])
        .setContent(`<div style="padding:4px;"><strong style="color:#0369a1;font-size:0.95rem;">📍 Brgy. ${escapeHtml(name)}</strong><p style="margin:2px 0 0;font-size:0.78rem;color:#64748b;">Valencia City, Bukidnon</p></div>`)
        .openOn(map);
    }
  });

  document.getElementById('toggle-fullscreen-btn')?.addEventListener('click', () => {
    const mapContainer = document.querySelector('.power-map-shell') || mapElement;
    if (!document.fullscreenElement) {
      mapContainer.requestFullscreen().catch(() => setToast('Fullscreen mode not permitted.'));
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  window.requestAnimationFrame(() => map.invalidateSize());
}

async function renderAdminNotifications() {
  const { notifications } = await api('/api/notifications');
  state.adminNotifications = notifications;
  const filter = state.adminNotificationFilter || 'All';
  const search = String(state.filters.adminNotificationSearch || '').trim().toLowerCase();
  const visible = notifications.filter((notice) => (filter === 'All' || (filter === 'Unread' ? !notice.read : Boolean(notice.read)))
    && (!search || `${notice.title} ${notice.message} ${notice.type}`.toLowerCase().includes(search)));
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const page = Math.min(Math.max(1, Number(state.adminNotificationPage || 1)), totalPages);
  state.adminNotificationPage = page;
  const pageRows = visible.slice((page - 1) * pageSize, page * pageSize);
  const pageButtons = Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => `<button type="button" class="notification-page-number ${number === page ? 'active' : ''}" data-action="admin-notification-page" data-value="${number}" aria-label="Page ${number}" aria-current="${number === page ? 'page' : 'false'}">${number}</button>`).join('');
  const typeNames = { incident: 'Incident', scheduled: 'Scheduled outage', report: 'Report', announcement: 'Announcement', system: 'System', general: 'General' };
  const typeIcon = (type) => {
    const paths = {
      incident: '<path d="M12 3v3m0 12v3M3 12h3m12 0h3"></path><circle cx="12" cy="12" r="7"></circle>',
      scheduled: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path>',
      report: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6M8 13h8M8 17h8"></path>',
      announcement: '<path d="M3 11v2a2 2 0 0 0 2 2h2l3 5h3l-2-6 8 3V7l-8 3H5a2 2 0 0 0-2 1z"></path>',
      system: '<path d="M12 8v4l3 2"></path><circle cx="12" cy="12" r="9"></circle>',
    };
    return `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[type] || '<circle cx="12" cy="12" r="9"></circle>'}</svg>`;
  };
  const counts = { All: notifications.length, Unread: notifications.filter((notice) => !notice.read).length, Read: notifications.filter((notice) => notice.read).length };
  adminShell(`<section class="admin-notifications-page">
    <header class="admin-notifications-heading"><h2>Notifications</h2>${canManage() ? `<button type="button" class="notification-create-button" data-action="new-notification"><span aria-hidden="true">+</span>Create Notification</button>` : ''}</header>
    <div class="notifications-controls">
      <div class="notification-filter-tabs" role="tablist" aria-label="Notification status">${Object.keys(counts).map((item) => `<button type="button" class="notification-filter-tab ${filter === item ? 'active' : ''}" role="tab" aria-selected="${filter === item}" data-action="filter-admin-notifications" data-value="${item}">${item}<span>${counts[item]}</span></button>`).join('')}</div>
      <label class="notification-search" aria-label="Search notifications"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><input type="search" data-filter="adminNotificationSearch" value="${escapeHtml(state.filters.adminNotificationSearch || '')}" placeholder="Search notifications..."></label>
      ${counts.Unread ? `<button type="button" class="notification-mark-all" data-action="mark-all-read">Mark all read</button>` : ''}
    </div>
    <div class="notification-feed">
    ${pageRows.map((notice) => `<article class="notification-feed-row ${notice.read ? 'read' : 'unread'}">
      <button type="button" class="notification-row-open" data-action="view-admin-notification" data-id="${notice.id}" aria-label="Open ${escapeHtml(notice.title)}">
        <span class="notification-type-icon ${escapeHtml(notice.type || 'general')}" title="${escapeHtml(typeNames[notice.type] || 'Notification')}">${typeIcon(notice.type)}</span>
        <span class="notification-copy"><strong>${escapeHtml(notice.title)}</strong><span>${escapeHtml(notice.message)}</span></span>
      </button>
      <time class="notification-time" datetime="${escapeHtml(notice.created_at || '')}">${escapeHtml(formatDateTime(notice.created_at))}</time>
      <button type="button" class="notification-read-toggle ${notice.read ? 'is-read' : ''}" data-action="toggle-admin-notification" data-id="${notice.id}" data-value="${notice.read ? 'unread' : 'read'}" aria-label="Mark ${escapeHtml(notice.title)} as ${notice.read ? 'unread' : 'read'}" title="Mark ${notice.read ? 'unread' : 'read'}"><span></span></button>
    </article>`).join('') || `<div class="notification-empty">${emptyState(search || filter !== 'All' ? 'No notifications found' : 'No notifications yet', 'System and outage updates will appear here.', '🔔')}</div>`}
    </div>
    ${visible.length ? `<nav class="notification-pagination" aria-label="Notification pages"><button type="button" class="notification-page-arrow" data-action="admin-notification-page" data-value="${Math.max(1, page - 1)}" aria-label="Previous page" ${page === 1 ? 'disabled' : ''}>‹</button>${pageButtons}<button type="button" class="notification-page-arrow" data-action="admin-notification-page" data-value="${Math.min(totalPages, page + 1)}" aria-label="Next page" ${page === totalPages ? 'disabled' : ''}>›</button></nav>` : ''}
  </section>`);
}

async function renderAdminIncidents() {
  const f = state.filters;
  const { incidents, statuses } = await api(
    `/api/incidents${query({ barangay: f.incidentBarangay, type: f.incidentType, status: f.incidentStatus, include_closed: 'true' })}`,
  );
  const search = String(f.incidentSearch || '').trim().toLowerCase();
  const canCreateIncident = ['administrator', 'personnel'].includes(state.user?.role);
  const visibleIncidents = incidents.filter((item) => !search || [item.incident_code, item.title, item.barangay,
    item.location, item.affected_area, item.outage_type, item.incident_type, item.status, item.description]
    .filter(Boolean).join(' ').toLowerCase().includes(search));
  const incidentStatusClass = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (['ongoing', 'restoration in progress'].includes(normalized)) return 'ongoing';
    if (['reported', 'under verification', 'verified'].includes(normalized)) return 'review';
    if (['restored', 'closed', 'resolved'].includes(normalized)) return 'resolved';
    return 'neutral';
  };
  const icon = (name) => {
    const paths = {
      view: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle>',
      edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>',
      link: '<path d="M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7"></path><path d="M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7"></path>',
    };
    return `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  };

  adminShell(`<section class="incident-management-page">
    <header class="incident-page-heading">
      <h2>Incident Management</h2>
      ${canCreateIncident ? `<button type="button" class="incident-create-button" data-action="new-incident"><span aria-hidden="true">+</span>Create Incident</button>` : ''}
    </header>

    <div class="incident-controls">
      <label class="incident-search" aria-label="Search incidents">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
        <input class="input" type="search" placeholder="Search incident..." value="${escapeHtml(f.incidentSearch || '')}" data-filter="incidentSearch">
      </label>
      <label class="incident-select-wrap" aria-label="Filter by status"><select class="input" data-filter="incidentStatus"><option value="">All Statuses</option>${statuses.map((status) => `<option value="${escapeHtml(status)}" ${f.incidentStatus === status ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}</select></label>
      <label class="incident-select-wrap" aria-label="Filter by incident type"><select class="input" data-filter="incidentType"><option value="">All Types</option>${[...new Set(incidents.map((item) => item.incident_type).filter(Boolean))].map((type) => `<option value="${escapeHtml(type)}" ${f.incidentType === type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select></label>
      <label class="incident-select-wrap incident-barangay-select" aria-label="Filter by barangay"><select class="input" data-filter="incidentBarangay"><option value="">All Barangays</option>${state.barangays.map((barangay) => `<option value="${escapeHtml(barangay)}" ${f.incidentBarangay === barangay ? 'selected' : ''}>${escapeHtml(barangay)}</option>`).join('')}</select></label>
      <button type="button" class="incident-reset-button" data-action="reset-incident-filters" title="Reset filters">Reset</button>
      <span class="incident-result-count">${visibleIncidents.length} incident${visibleIncidents.length === 1 ? '' : 's'}</span>
    </div>

    <div class="incident-table-wrap">
      <div class="table-scroll"><table class="incident-management-table">
        <thead><tr><th>ID</th><th>Date &amp; Time</th><th>Location</th><th>Barangay</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${visibleIncidents.map((item) => `<tr>
          <td class="incident-code-cell">${escapeHtml(item.incident_code)}</td>
          <td class="incident-date-cell">${escapeHtml(formatDateTime(item.start_time))}</td>
          <td>${escapeHtml(item.location || item.affected_area || item.title || '—')}</td>
          <td>${escapeHtml(item.barangay || '—')}</td>
          <td>${escapeHtml(item.outage_type || item.incident_type || 'Power Outage')}</td>
          <td><span class="incident-status-badge ${incidentStatusClass(item.status)}">${escapeHtml(item.status || 'Reported')}</span></td>
          <td><div class="incident-row-actions">
            <button type="button" class="incident-icon-action" data-action="view-incident" data-id="${item.id}" aria-label="View ${escapeHtml(item.incident_code)}" title="View incident">${icon('view')}</button>
            ${canManage() ? `<button type="button" class="incident-icon-action" data-action="update-incident-status" data-id="${item.id}" aria-label="Update ${escapeHtml(item.incident_code)}" title="Update incident status">${icon('edit')}</button>` : ''}
            ${['administrator', 'personnel'].includes(state.user?.role) ? `<button type="button" class="incident-icon-action" data-action="link-report" data-id="${item.id}" aria-label="Link a report to ${escapeHtml(item.incident_code)}" title="Link report">${icon('link')}</button>` : ''}
          </div></td>
        </tr>`).join('') || `<tr><td class="incident-table-empty" colspan="7">${emptyState(search || f.incidentStatus || f.incidentType || f.incidentBarangay ? 'No incidents match' : 'No incidents yet', 'Adjust your filters or create an incident to see it here.', '⚡')}</td></tr>`}</tbody>
      </table></div>
    </div>
  </section>`);
}

async function renderAdminScheduled() {
  const f = state.filters;
  const { scheduled, statuses } = await api(`/api/scheduled${query({ barangay: f.schedBarangay, status: f.schedStatus })}`);
  const search = String(f.schedSearch || '').trim().toLowerCase();
  const visibleSchedules = scheduled.filter((row) => !search || [row.schedule_code, row.title, row.area, row.reason,
    row.barangay, row.status, row.outage_date].filter(Boolean).join(' ').toLowerCase().includes(search));
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(visibleSchedules.length / pageSize));
  const page = Math.min(Math.max(1, Number(state.scheduledPage || 1)), totalPages);
  state.scheduledPage = page;
  const startIndex = (page - 1) * pageSize;
  const pageRows = visibleSchedules.slice(startIndex, startIndex + pageSize);
  const durationLabel = (startTime, endTime) => {
    if (!startTime || !endTime) return '—';
    const minutesFor = (time) => {
      const [hours, minutes] = String(time).split(':').map(Number);
      return hours * 60 + minutes;
    };
    let minutes = minutesFor(endTime) - minutesFor(startTime);
    if (!Number.isFinite(minutes) || minutes === 0) return '—';
    if (minutes < 0) minutes += 24 * 60;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours ? `${hours} hr${hours === 1 ? '' : 's'}` : ''}${hours && remainingMinutes ? ' ' : ''}${remainingMinutes ? `${remainingMinutes} min` : ''}`;
  };
  const statusClass = (status) => ({
    Scheduled: 'scheduled', 'In Preparation': 'preparing', 'Being Implemented': 'implementing',
    Completed: 'completed', Cancelled: 'cancelled',
  }[status] || 'scheduled');
  const icon = (name) => {
    const paths = {
      view: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle>',
      edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>',
      start: '<path d="m8 5 11 7-11 7z"></path>',
    };
    return `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  };
  const pageButtons = Array.from({ length: totalPages }, (_, index) => index + 1)
    .map((number) => `<button type="button" class="scheduled-page-number ${number === page ? 'active' : ''}" data-action="scheduled-page" data-value="${number}" aria-label="Page ${number}" aria-current="${number === page ? 'page' : 'false'}">${number}</button>`).join('');
  const rowsMarkup = pageRows.map((row) => {
    const startTime = String(row.start_time || '').slice(0, 5);
    const dateTime = `${row.outage_date}T${startTime || '00:00'}`;
    const location = row.area || row.barangay || row.title;
    const type = row.reason || 'Scheduled Outage';
    return `<tr>
      <td class="scheduled-date-cell"><strong>${escapeHtml(formatSystemDate(row.outage_date))}</strong><span>${escapeHtml(startTime ? formatSystemTime(dateTime) : 'Time not set')}</span><small>${escapeHtml(row.schedule_code)}</small></td>
      <td class="scheduled-location-cell"><strong>${escapeHtml(location || '—')}</strong>${row.title && row.title !== location ? `<span>${escapeHtml(row.title)}</span>` : ''}</td>
      <td>${escapeHtml(row.barangay || '—')}</td>
      <td>${escapeHtml(type)}</td>
      <td class="scheduled-duration-cell">${escapeHtml(durationLabel(row.start_time, row.expected_end_time))}</td>
      <td><span class="scheduled-status-badge ${statusClass(row.status)}">${escapeHtml(row.status || 'Scheduled')}</span></td>
      <td><div class="scheduled-row-actions">
        <button type="button" class="scheduled-icon-action" data-action="view-schedule-details" data-id="${row.id}" aria-label="View ${escapeHtml(row.schedule_code)}" title="View schedule">${icon('view')}</button>
        ${canManage() ? `<button type="button" class="scheduled-icon-action" data-action="edit-schedule" data-id="${row.id}" aria-label="Edit ${escapeHtml(row.schedule_code)}" title="Edit schedule">${icon('edit')}</button><button type="button" class="scheduled-icon-action" data-action="update-schedule-status" data-id="${row.id}" aria-label="Update ${escapeHtml(row.schedule_code)} status" title="Update status">${icon('edit')}</button>` : ''}
        ${isOfficial() && !['Cancelled', 'Completed', 'Being Implemented'].includes(row.status) ? `<button type="button" class="scheduled-icon-action start" data-action="trigger-incident" data-id="${row.id}" aria-label="Start ${escapeHtml(row.schedule_code)} now" title="Start as active incident">${icon('start')}</button>` : ''}
      </div></td>
    </tr>`;
  }).join('');

  adminShell(`<section class="scheduled-outages-page">
    <header class="scheduled-page-heading"><h2>Scheduled Outages</h2>${canManage() ? `<button type="button" class="scheduled-add-button" data-action="new-schedule"><span aria-hidden="true">+</span>Add Schedule</button>` : ''}</header>
    <div class="scheduled-controls">
      <label class="scheduled-search" aria-label="Search schedules"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><input type="search" data-filter="schedSearch" value="${escapeHtml(f.schedSearch || '')}" placeholder="Search schedules..."></label>
      <label class="scheduled-select-wrap" aria-label="Filter by status"><select class="input" data-filter="schedStatus"><option value="">All Statuses</option>${statuses.map((status) => `<option value="${escapeHtml(status)}" ${f.schedStatus === status ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}</select></label>
      <label class="scheduled-select-wrap" aria-label="Filter by barangay"><select class="input" data-filter="schedBarangay"><option value="">All Barangays</option>${state.barangays.map((barangay) => `<option value="${escapeHtml(barangay)}" ${f.schedBarangay === barangay ? 'selected' : ''}>${escapeHtml(barangay)}</option>`).join('')}</select></label>
      <button type="button" class="scheduled-reset-button" data-action="reset-sched-filters">Reset</button>
      <span class="scheduled-result-count">${visibleSchedules.length} schedule${visibleSchedules.length === 1 ? '' : 's'}</span>
    </div>
    <div class="scheduled-table-wrap"><div class="table-scroll"><table class="scheduled-outages-table">
      <thead><tr><th>Date &amp; Time</th><th>Location</th><th>Barangay</th><th>Type</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${rowsMarkup || `<tr><td colspan="7" class="scheduled-empty">${emptyState('No schedules found', search || f.schedStatus || f.schedBarangay ? 'Adjust the filters to see other scheduled outages.' : 'Add a schedule to notify residents in advance.', '🗓')}</td></tr>`}</tbody>
    </table></div></div>
    ${visibleSchedules.length ? `<nav class="scheduled-pagination" aria-label="Schedule pages">
      <button type="button" class="scheduled-page-arrow" data-action="scheduled-page" data-value="${Math.max(1, page - 1)}" aria-label="Previous page" ${page === 1 ? 'disabled' : ''}>‹</button>
      ${pageButtons}
      <button type="button" class="scheduled-page-arrow" data-action="scheduled-page" data-value="${Math.min(totalPages, page + 1)}" aria-label="Next page" ${page === totalPages ? 'disabled' : ''}>›</button>
    </nav>` : ''}
  </section>`);
}

async function renderAdminAnnouncements() {
  const manage = canManage();
  const { announcements, categories } = await api(manage ? '/api/announcements/manage' : '/api/announcements');
  const statusFilter = state.filters.announcementFilter || '';
  const categoryFilter = state.filters.announcementCategory || '';
  const search = String(state.filters.announcementSearch || '').trim().toLowerCase();
  const visibleAnnouncements = announcements.filter((announcement) => (!statusFilter || announcement.status === statusFilter)
    && (!categoryFilter || announcement.category === categoryFilter)
    && (!search || `${announcement.title} ${announcement.category} ${announcement.content} ${announcement.author_name || ''}`.toLowerCase().includes(search)));
  const statusCounts = Object.fromEntries(['Published', 'Draft', 'Archived'].map((status) => [status, announcements.filter((row) => row.status === status).length]));
  const hasFilters = Boolean(statusFilter || categoryFilter || search);
  const statusTabs = [
    { label: 'All', value: '', count: announcements.length },
    { label: 'Published', value: 'Published', count: statusCounts.Published },
    { label: 'Drafts', value: 'Draft', count: statusCounts.Draft },
    { label: 'Archived', value: 'Archived', count: statusCounts.Archived },
  ];

  adminShell(`<section class="announcement-management">
    <div class="announcement-toolbar">
      <label class="announcement-search">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
        <input type="search" aria-label="Search announcements" placeholder="Search title, description, or author" value="${escapeHtml(state.filters.announcementSearch || '')}" data-filter="announcementSearch">
      </label>
      <label class="announcement-category-filter"><span class="visually-hidden">Filter by category</span>
        <select class="input" aria-label="Filter by category" data-filter="announcementCategory"><option value="">All categories</option>${categories.map((category) => `<option value="${escapeHtml(category)}" ${categoryFilter === category ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('')}</select>
      </label>
      ${manage ? '<button type="button" class="button primary announcement-create" data-action="new-announcement"><span aria-hidden="true">+</span> New announcement</button>' : ''}
    </div>
    <div class="announcement-list-heading">
      <div class="segmented announcement-status-tabs" role="group" aria-label="Filter announcements by status">
        ${statusTabs.map((tab) => `<button type="button" class="seg ${statusFilter === tab.value ? 'active' : ''}" data-action="filter-announcements" data-value="${tab.value}" aria-pressed="${statusFilter === tab.value}">${tab.label}<span>${tab.count}</span></button>`).join('')}
      </div>
      <span class="announcement-result-count" aria-live="polite">${visibleAnnouncements.length} of ${announcements.length} announcement${announcements.length === 1 ? '' : 's'}</span>
      ${hasFilters ? '<button type="button" class="announcement-clear-filters" data-action="reset-announcement-filters">Clear filters</button>' : ''}
    </div>
    ${visibleAnnouncements.length
      ? `<div class="announcement-card-grid">${visibleAnnouncements.map((row) => `<article class="announcement-manage-card">
          ${row.image_path ? `<img class="announcement-card-image" src="${escapeHtml(row.image_path)}" alt="${escapeHtml(row.title)}">` : ''}
          <div class="announcement-card-topline"><span class="tag">${escapeHtml(row.category)}</span>${statusPill(row.status)}</div>
          <button type="button" class="announcement-card-title" data-action="view-announcement" data-id="${row.id}">${escapeHtml(row.title)}</button>
          <p class="announcement-card-description">${escapeHtml(row.content)}</p>
          <div class="announcement-card-meta"><span>By ${escapeHtml(row.author_name || 'System')}</span><time datetime="${escapeHtml(row.published_at || row.created_at || '')}">${escapeHtml(formatDateTime(row.published_at || row.created_at))}</time></div>
          <div class="announcement-card-actions">
            <button type="button" class="link-button" data-action="view-announcement" data-id="${row.id}">View</button>
            ${manage ? `<button type="button" class="link-button" data-action="edit-announcement" data-id="${row.id}">Edit</button>
              ${row.status !== 'Published' ? `<button type="button" class="link-button" data-action="announcement-status" data-id="${row.id}" data-value="Published">Publish</button>` : ''}
              ${row.status !== 'Archived' ? `<button type="button" class="link-button" data-action="announcement-status" data-id="${row.id}" data-value="Archived">Archive</button>` : ''}
              <button type="button" class="link-button danger" data-action="delete-announcement" data-id="${row.id}">Delete</button>` : ''}
          </div>
        </article>`).join('')}</div>`
      : `<div class="announcement-empty-state"><span class="announcement-empty-mark" aria-hidden="true">!</span><h3>${hasFilters ? 'No matching announcements' : 'No announcements yet'}</h3><p>${hasFilters ? 'Try another search or clear the selected filters.' : 'Published advisories and service updates will appear here.'}</p>${hasFilters ? '<button type="button" class="button ghost" data-action="reset-announcement-filters">Clear filters</button>' : (manage ? '<button type="button" class="button primary" data-action="new-announcement">Create announcement</button>' : '')}</div>`}
  </section>`);
}

async function renderAdminHistory() {
  const f = state.filters;
  const { history } = await api(`/api/history${query({ barangay: f.historyBarangay, type: f.historyType, from: f.historyFrom, to: f.historyTo, q: f.historySearch })}`);

  adminShell(`<div class="toolbar">
    <input class="input" type="search" placeholder="Search code, title, area…" value="${escapeHtml(f.historySearch || '')}" data-filter="historySearch">
    <select class="input" data-filter="historyBarangay"><option value="">All barangays</option>${state.barangays.map((b) => `<option ${f.historyBarangay === b ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')}</select>
    <select class="input" data-filter="historyType"><option value="">All types</option><option value="Scheduled" ${f.historyType === 'Scheduled' ? 'selected' : ''}>Scheduled</option><option value="Unexpected" ${f.historyType === 'Unexpected' ? 'selected' : ''}>Unexpected</option></select>
    <input class="input" type="date" data-filter="historyFrom" value="${escapeHtml(f.historyFrom || '')}">
    <input class="input" type="date" data-filter="historyTo" value="${escapeHtml(f.historyTo || '')}">
    <a class="button ghost" href="/api/history/export.csv${query({ barangay: f.historyBarangay, type: f.historyType, from: f.historyFrom, to: f.historyTo, q: f.historySearch })}">Export CSV</a>
    <button class="button ghost" data-action="reset-history-filters">Reset</button>
  </div>
  ${history.length ? `<div class="panel"><table class="data-table">
    <thead><tr><th>Code</th><th>Title</th><th>Barangay</th><th>Type</th><th>Start</th><th>Closed</th><th>Duration</th></tr></thead>
    <tbody>${history.map((row) => `<tr>
      <td class="mono">${escapeHtml(row.incident_code)}</td>
      <td>${escapeHtml(row.title)}<div class="muted small">${escapeHtml(row.affected_area || '')}</div></td>
      <td>${escapeHtml(row.barangay)}</td>
      <td>${escapeHtml(row.incident_type)}</td>
      <td class="muted">${escapeHtml(formatDateTime(row.start_time))}</td>
      <td class="muted">${escapeHtml(formatDateTime(row.closed_at))}</td>
      <td><strong>${escapeHtml(row.duration_display || '—')}</strong></td>
    </tr>`).join('')}</tbody>
  </table></div>` : `<div class="panel">${emptyState('No closed incidents', 'History shows incidents that have been restored and closed.', '🕘')}</div>`}`);
}

async function renderAdminAnalytics() {
  const range = query(state.analyticsRange);
  const [summary, monthly, barangay, types, status, feedbackData] = await Promise.all([
    api(`/api/analytics/summary${range}`),
    api(`/api/analytics/monthly${range}`),
    api(`/api/analytics/barangay${range}`),
    api(`/api/analytics/types${range}`),
    api(`/api/analytics/status${range}`),
    api('/api/feedback/summary').catch(() => ({ total: 0, average: 5.0, breakdown: {}, confirmed_rate: 100, recent: [] })),
  ]);
  state.analyticsExportData = { summary: summary.summary, monthly: monthly.data, barangay: barangay.data, types: types.data.categories || [], status: status.data };
  const summaryValues = summary.summary;
  const cards = [
    { label: 'Total Reports', value: summaryValues.reports_total, tone: 'blue' },
    { label: 'Verified', value: summaryValues.verified, tone: 'green' },
    { label: 'Active Incidents', value: summaryValues.active, tone: 'amber' },
    { label: 'Resolved', value: summaryValues.resolved, tone: 'teal' },
  ];
  const topRows = (barangay.data || []).slice(0, 6).map((row) => ({ label: row.barangay, value: Number(row.c) || 0 }));
  const remaining = (barangay.data || []).slice(6).reduce((sum, row) => sum + (Number(row.c) || 0), 0);
  if (remaining) topRows.push({ label: 'Others', value: remaining });
  const maximum = Math.max(1, ...topRows.map((row) => row.value));
  const ticks = Array.from({ length: 5 }, (_, index) => Math.ceil(maximum * (4 - index) / 4));
  const barRows = topRows.map((row) => `<div class="analytics-bar-item" title="${escapeHtml(row.label)}: ${row.value}">
    <strong>${row.value}</strong><div class="analytics-bar-track"><i style="height:${Math.max(3, row.value / maximum * 100)}%"></i></div><span>${escapeHtml(row.label)}</span>
  </div>`).join('');
  const typeRows = (types.data.categories || []).filter((row) => Number(row.count) > 0);
  const typeTotal = typeRows.reduce((sum, row) => sum + Number(row.count), 0);
  const palette = ['#159b79', '#1675df', '#18a9cf', '#eea51c', '#dd4551', '#7b79cf', '#64a95c', '#e17836'];
  let cursor = 0;
  const slices = typeRows.map((row, index) => {
    const from = cursor;
    cursor += typeTotal ? Number(row.count) / typeTotal * 100 : 0;
    return { ...row, color: palette[index % palette.length], from, to: cursor, percent: typeTotal ? Math.round(Number(row.count) / typeTotal * 100) : 0 };
  });
  const donutStyle = slices.length
    ? `conic-gradient(${slices.map((slice) => `${slice.color} ${slice.from}% ${slice.to}%`).join(', ')})`
    : 'conic-gradient(#e5edf3 0 100%)';
  const legend = slices.map((slice) => `<li><i style="--type-color:${slice.color}"></i><span>${escapeHtml(slice.type)}</span><b>${slice.percent}%</b></li>`).join('');

  adminShell(`<section class="analytics-page">
    <header class="analytics-page-heading"><div><p class="analytics-eyebrow">SYSTEM REPORTS</p><h2>Analytics &amp; Reports</h2></div></header>
    <div class="analytics-controls">
      <label class="analytics-date-field"><span>From</span><input class="input" type="date" aria-label="Start date" data-range="from" value="${escapeHtml(state.analyticsRange.from)}"></label>
      <label class="analytics-date-field"><span>To</span><input class="input" type="date" aria-label="End date" data-range="to" value="${escapeHtml(state.analyticsRange.to)}"></label>
      <button type="button" class="analytics-reset-button" data-action="reset-analytics">Reset</button>
      <button type="button" class="analytics-export-button" data-action="export-analytics"><span aria-hidden="true">↓</span>Export CSV</button>
    </div>
    <div class="analytics-charts-grid">
      <section class="analytics-chart-panel reports-by-barangay-panel">
        <header><h3>Reports by Barangay</h3><span>${summaryValues.reports_total} total reports</span></header>
        ${topRows.length ? `<div class="analytics-bar-chart"><div class="analytics-chart-axis">${ticks.map((tick) => `<span>${tick}</span>`).join('')}</div><div class="analytics-bar-plot">${barRows}</div></div>` : `<div class="analytics-chart-empty">${emptyState('No reports in this range', 'Choose another date range to view barangay reports.', '📊')}</div>`}
      </section>
      <section class="analytics-chart-panel outage-types-panel">
        <header><h3>Outage Types</h3><span>${typeTotal} reports</span></header>
        ${slices.length ? `<div class="analytics-donut-layout"><div class="analytics-donut" style="--donut-data:${donutStyle}" role="img" aria-label="Outage type distribution"><div><strong>${typeTotal}</strong><span>Reports</span></div></div><ul class="analytics-donut-legend">${legend}</ul></div>` : `<div class="analytics-chart-empty">${emptyState('No outage types recorded', 'Type breakdown appears when reports include outage categories.', '◌')}</div>`}
      </section>
    </div>
    <div class="analytics-metrics-grid">${cards.map((card) => `<article class="analytics-metric-card ${card.tone}"><span>${escapeHtml(card.label)}</span><strong>${escapeHtml(Number(card.value || 0).toLocaleString())}</strong></article>`).join('')}</div>
    <section class="panel" style="margin-top:20px;padding:20px;border-radius:12px;background:#fff;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <h3 style="margin:0;font-size:1.15rem;color:#0f2942;display:flex;align-items:center;gap:8px;">
            <span>⭐</span> Citizen Satisfaction &amp; Restoration Verification
          </h3>
          <p class="muted small" style="margin:4px 0 0 0;">Community ratings and post-restoration power verification directly from Valencia residents.</p>
        </div>
        <div style="text-align:right;">
          <div style="font-size:1.6rem;font-weight:800;color:#f59e0b;">★ ${feedbackData.average.toFixed(1)} <small style="font-size:0.9rem;color:#64748b;">/ 5.0</small></div>
          <span class="muted small">${feedbackData.total} reviews recorded</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;margin-bottom:16px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px;">
          <span class="muted small" style="text-transform:uppercase;font-weight:700;">Power Return Rate</span>
          <strong style="display:block;font-size:1.4rem;color:#10b981;margin-top:4px;">${feedbackData.confirmed_rate}%</strong>
          <small class="muted">Residents confirmed lights on</small>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px;">
          <span class="muted small" style="text-transform:uppercase;font-weight:700;">5-Star Reviews</span>
          <strong style="display:block;font-size:1.4rem;color:#f59e0b;margin-top:4px;">${feedbackData.breakdown['5'] || 0}</strong>
          <small class="muted">Highest satisfaction</small>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px;">
          <span class="muted small" style="text-transform:uppercase;font-weight:700;">4-Star Reviews</span>
          <strong style="display:block;font-size:1.4rem;color:#3b82f6;margin-top:4px;">${feedbackData.breakdown['4'] || 0}</strong>
          <small class="muted">Good experience</small>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px;">
          <span class="muted small" style="text-transform:uppercase;font-weight:700;">Critical (1-2 Stars)</span>
          <strong style="display:block;font-size:1.4rem;color:#ef4444;margin-top:4px;">${(feedbackData.breakdown['1'] || 0) + (feedbackData.breakdown['2'] || 0)}</strong>
          <small class="muted">Follow-up needed</small>
        </div>
      </div>
      <h4 style="font-size:0.9rem;margin:16px 0 8px 0;color:#334155;">Recent Resident Reviews &amp; Testimonials</h4>
      <div style="display:grid;gap:8px;max-height:220px;overflow-y:auto;">
        ${feedbackData.recent?.length ? feedbackData.recent.slice(0, 6).map((f) => `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 14px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong style="font-size:0.88rem;color:#0f2942;">${escapeHtml(f.user_name)}</strong>
              <span class="muted small"> · ${escapeHtml(f.barangay)}</span>
              <p style="margin:3px 0 0 0;font-size:0.82rem;color:#475569;">"${escapeHtml(f.feedback_text || 'Power restored successfully. Salamat!')}"</p>
            </div>
            <div style="text-align:right;">
              <span style="color:#f59e0b;font-weight:700;">${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}</span>
              <span style="display:block;font-size:0.72rem;color:#64748b;">${escapeHtml(formatDateTime(f.created_at))}</span>
            </div>
          </div>
        `).join('') : '<p class="muted small">No citizen reviews recorded yet.</p>'}
      </div>
    </section>
  </section>`);
}

async function renderAdminUsers() {
  const f = state.filters;
  const { users, roles } = await api(`/api/admin/users${query({ status: f.userStatus || 'all', q: f.userSearch })}`);
  const groups = [
    ['All Users', null], ['Residents', ['resident']], ['Staff', ['personnel', 'administrator']],
    ['Verifiers', ['personnel']], ['Authorized', ['utility', 'administrator']],
  ];
  const activeGroup = state.adminUserGroup || 'All Users';
  const groupRoles = groups.find(([label]) => label === activeGroup)?.[1];
  const visibleUsers = users.filter((user) => !groupRoles || groupRoles.includes(user.role));
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / pageSize));
  const page = Math.min(Math.max(1, Number(state.adminUserPage || 1)), totalPages);
  state.adminUserPage = page;
  const pageRows = visibleUsers.slice((page - 1) * pageSize, page * pageSize);
  const pageButtons = Array.from({ length: totalPages }, (_, index) => index + 1)
    .map((number) => `<button type="button" class="user-page-number ${number === page ? 'active' : ''}" data-action="admin-user-page" data-value="${number}" aria-label="Page ${number}" aria-current="${number === page ? 'page' : 'false'}">${number}</button>`).join('');

  const groupTabs = groups.map(([label, allowedRoles]) => {
    const count = users.filter((user) => !allowedRoles || allowedRoles.includes(user.role)).length;
    return `<button type="button" class="user-role-tab ${activeGroup === label ? 'active' : ''}" role="tab" aria-selected="${activeGroup === label}" data-action="filter-admin-users" data-value="${label}">${label}<span>${count}</span></button>`;
  }).join('');
  const rows = pageRows.map((user) => `<tr>
    <td class="user-name-cell"><strong>${escapeHtml(user.full_name)}</strong>${user.contact_number ? `<span>${escapeHtml(user.contact_number)}</span>` : ''}</td>
    <td class="user-email-cell">${escapeHtml(user.email)}</td>
    <td>${escapeHtml(roles[user.role] || roleLabel(user.role))}</td>
    <td><span class="user-status-badge ${user.status === 'Active' ? 'active' : 'inactive'}">${escapeHtml(user.status)}</span></td>
    <td><div class="user-row-actions">
      <button type="button" class="user-view-action" data-action="view-user" data-id="${user.id}" aria-label="View ${escapeHtml(user.full_name)}" title="View account">↗</button>
      <details class="user-action-menu"><summary aria-label="More actions for ${escapeHtml(user.full_name)}" title="More actions">⋯</summary>
        <div class="user-action-menu-items" role="menu">
          <button type="button" role="menuitem" data-action="edit-user" data-id="${user.id}">Edit account</button>
          <button type="button" role="menuitem" data-action="change-role" data-id="${user.id}">Change role</button>
          <button type="button" role="menuitem" data-action="reset-password" data-id="${user.id}">Reset password</button>
          <button type="button" role="menuitem" data-action="toggle-user-status" data-id="${user.id}" data-value="${user.status === 'Active' ? 'Inactive' : 'Active'}">${user.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
          ${Number(user.id) !== Number(state.user.id) ? `<button type="button" class="danger" role="menuitem" data-action="delete-user" data-id="${user.id}">Delete account</button>` : ''}
        </div>
      </details>
    </div></td>
  </tr>`).join('');

  adminShell(`<section class="user-management-page">
    <header class="user-management-heading">
      <label class="user-management-search" aria-label="Search users"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><input type="search" data-filter="userSearch" value="${escapeHtml(f.userSearch || '')}" placeholder="Search name, email, contact..."></label>
      <button type="button" class="user-add-button" data-action="new-user"><span aria-hidden="true">+</span>Add User</button>
    </header>
    <div class="user-management-tabs" role="tablist" aria-label="Filter users by role">${groupTabs}</div>
    <div class="user-table-tools"><label class="user-status-filter" aria-label="Filter users by account status"><span>Status</span><select data-filter="userStatus"><option value="all" ${!f.userStatus || f.userStatus === 'all' ? 'selected' : ''}>All Statuses</option><option value="Active" ${f.userStatus === 'Active' ? 'selected' : ''}>Active</option><option value="Inactive" ${f.userStatus === 'Inactive' ? 'selected' : ''}>Inactive</option></select></label><span class="user-result-count">${visibleUsers.length} user${visibleUsers.length === 1 ? '' : 's'}</span></div>
    <div class="user-table-wrap"><div class="table-scroll"><table class="user-management-table">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="5" class="user-table-empty">${emptyState('No users found', 'Adjust the search or role filters to see accounts.', '👥')}</td></tr>`}</tbody>
    </table></div></div>
    ${visibleUsers.length ? `<nav class="user-pagination" aria-label="User pages"><button type="button" class="user-page-arrow" data-action="admin-user-page" data-value="${Math.max(1, page - 1)}" aria-label="Previous page" ${page === 1 ? 'disabled' : ''}>‹</button>${pageButtons}<button type="button" class="user-page-arrow" data-action="admin-user-page" data-value="${Math.min(totalPages, page + 1)}" aria-label="Next page" ${page === totalPages ? 'disabled' : ''}>›</button></nav>` : ''}
  </section>`);
}

async function renderAdminBarangays() {
  const f = state.filters;
  const { barangays } = await api('/api/admin/barangays');
  const statusFilter = f.barangayStatus || 'Active';
  const search = String(f.barangaySearch || '').trim().toLowerCase();
  const visibleBarangays = barangays.filter((row) => (statusFilter === 'all' || row.status === statusFilter)
    && (!search || `${row.name} ${row.area_description || ''}`.toLowerCase().includes(search)));
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(visibleBarangays.length / pageSize));
  const page = Math.min(Math.max(1, Number(state.barangayPage || 1)), totalPages);
  state.barangayPage = page;
  const pageRows = visibleBarangays.slice((page - 1) * pageSize, page * pageSize);
  const pageButtons = Array.from({ length: totalPages }, (_, index) => index + 1)
    .map((number) => `<button type="button" class="barangay-page-number ${number === page ? 'active' : ''}" data-action="admin-barangay-page" data-value="${number}" aria-label="Page ${number}" aria-current="${number === page ? 'page' : 'false'}">${number}</button>`).join('');
  const rows = pageRows.map((row) => `<tr>
    <td class="barangay-name-cell"><strong>${escapeHtml(row.name)}</strong>${row.area_description ? `<span>${escapeHtml(row.area_description)}</span>` : ''}</td>
    <td>${row.population === null || row.population === undefined ? '—' : escapeHtml(Number(row.population).toLocaleString())}</td>
    <td>${escapeHtml(String(row.personnel_count ?? 0))}</td>
    <td>${escapeHtml(String(row.report_count ?? 0))}</td>
    <td><span class="barangay-status-badge ${row.status === 'Active' ? 'active' : 'inactive'}">${escapeHtml(row.status || 'Inactive')}</span></td>
    <td><div class="barangay-row-actions">
      <button type="button" class="barangay-view-action" data-action="view-barangay" data-id="${row.id}" aria-label="View ${escapeHtml(row.name)}" title="View barangay">View</button>
      <details class="barangay-action-menu"><summary aria-label="More actions for ${escapeHtml(row.name)}" title="More actions">⋯</summary>
        <div class="barangay-action-menu-items" role="menu">
          <button type="button" role="menuitem" data-action="edit-barangay" data-id="${row.id}">Edit barangay</button>
          <button type="button" role="menuitem" data-action="toggle-barangay-status" data-id="${row.id}" data-value="${row.status === 'Active' ? 'Inactive' : 'Active'}">${row.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
        </div>
      </details>
    </div></td>
  </tr>`).join('');

  adminShell(`<section class="barangay-management-page">
    <header class="barangay-page-heading"><h2>Barangay Management</h2><button type="button" class="barangay-add-button" data-action="new-barangay"><span aria-hidden="true">+</span>Add Barangay</button></header>
    <div class="barangay-controls">
      <label class="barangay-search" aria-label="Search barangays"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><input type="search" data-filter="barangaySearch" value="${escapeHtml(f.barangaySearch || '')}" placeholder="Search barangays..."></label>
      <label class="barangay-status-filter" aria-label="Filter barangay status"><select data-filter="barangayStatus"><option value="Active" ${statusFilter === 'Active' ? 'selected' : ''}>Active</option><option value="Inactive" ${statusFilter === 'Inactive' ? 'selected' : ''}>Inactive</option><option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All Statuses</option></select></label>
      <button type="button" class="barangay-reset-button" data-action="reset-barangay-filters">Reset</button>
      <span class="barangay-result-count">${visibleBarangays.length} barangay${visibleBarangays.length === 1 ? '' : 's'}</span>
    </div>
    <div class="barangay-table-wrap"><div class="table-scroll"><table class="barangay-management-table">
      <thead><tr><th>Barangay</th><th>Population</th><th>Assigned Personnel</th><th>Reports</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6" class="barangay-table-empty">${emptyState('No barangays found', 'Adjust the search or status filter to see barangays.', '📍')}</td></tr>`}</tbody>
    </table></div></div>
    ${visibleBarangays.length ? `<nav class="barangay-pagination" aria-label="Barangay pages"><button type="button" class="barangay-page-arrow" data-action="admin-barangay-page" data-value="${Math.max(1, page - 1)}" aria-label="Previous page" ${page === 1 ? 'disabled' : ''}>‹</button>${pageButtons}<button type="button" class="barangay-page-arrow" data-action="admin-barangay-page" data-value="${Math.min(totalPages, page + 1)}" aria-label="Next page" ${page === totalPages ? 'disabled' : ''}>›</button></nav>` : ''}
  </section>`);
}

function auditModuleName(action = '') {
  const value = String(action).toLowerCase();
  if (/schedule/.test(value)) return 'Scheduled Outages';
  if (/report|verification|duplicate/.test(value)) return 'Verification';
  if (/incident|outage/.test(value)) return 'Incidents';
  if (/announcement/.test(value)) return 'Announcements';
  if (/user|role|account|password/.test(value)) return 'User Management';
  if (/barangay|location/.test(value)) return 'Barangays';
  if (/notification/.test(value)) return 'Notifications';
  if (/setting|backup|maintenance|reset/.test(value)) return 'Settings';
  if (/login|logout|session|oauth/.test(value)) return 'Authentication';
  return 'System';
}

async function renderAdminAudit() {
  const f = state.filters;
  const params = query({ q: f.auditSearch, from: f.auditFrom, to: f.auditTo, page: state.auditPage, pageSize: state.auditPageSize });
  const { logs, total, page, pageCount } = await api(`/api/admin/audit-logs${params}`);
  state.auditPage = page;
  const pageSizeOptions = [5, 10, 25, 50].map((size) => `<option value="${size}" ${state.auditPageSize === size ? 'selected' : ''}>${size} per page</option>`).join('');

  adminShell(`<section class="audit-management-page">
    <header class="audit-page-heading"><h2>Audit Logs</h2><button type="button" class="audit-close-button" data-page="dashboard" aria-label="Close audit logs" title="Back to dashboard">×</button></header>
    <div class="audit-controls">
      <label class="audit-search" aria-label="Search audit logs"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><input type="search" data-filter="auditSearch" value="${escapeHtml(f.auditSearch || '')}" placeholder="Search user, action, detail, IP..."></label>
      <label class="audit-date-filter" aria-label="Filter from date"><span>From</span><input type="date" data-filter="auditFrom" value="${escapeHtml(f.auditFrom || '')}"></label>
      <label class="audit-date-filter" aria-label="Filter to date"><span>To</span><input type="date" data-filter="auditTo" value="${escapeHtml(f.auditTo || '')}"></label>
      <label class="audit-page-size" aria-label="Rows per page"><select data-audit-page-size>${pageSizeOptions}</select></label>
      <button type="button" class="audit-reset-button" data-action="reset-audit-filters">Reset</button>
      <button type="button" class="audit-export-button" data-action="export-audit-logs"><span aria-hidden="true">⇩</span>Export</button>
      <span class="audit-result-count">${total} record${total === 1 ? '' : 's'}</span>
    </div>
    <div class="audit-table-wrap"><div class="table-scroll"><table class="audit-management-table">
      <thead><tr><th>Date &amp; Time</th><th>User</th><th>Action</th><th>Module</th><th>IP Address</th></tr></thead>
      <tbody>${logs.map((row) => `<tr>
        <td class="audit-time-cell">${escapeHtml(formatDateTime(row.created_at))}</td>
        <td class="audit-user-cell"><strong>${escapeHtml(row.user_name || 'System')}</strong>${row.role ? `<span>${escapeHtml(roleLabel(row.role))}</span>` : ''}</td>
        <td class="audit-action-cell"><strong>${escapeHtml(row.action)}</strong>${row.detail ? `<span>${escapeHtml(row.detail)}</span>` : ''}</td>
        <td><span class="audit-module-label">${escapeHtml(auditModuleName(row.action))}</span></td>
        <td class="audit-ip-cell">${escapeHtml(row.ip_address || '—')}</td>
      </tr>`).join('') || `<tr><td colspan="5" class="audit-empty">${emptyState('No audit logs found', 'Adjust the search or date range to see records.', '🛡')}</td></tr>`}</tbody>
    </table></div></div>
    ${total ? `<nav class="audit-pagination" aria-label="Audit log pages"><button type="button" class="audit-page-arrow" data-action="audit-page" data-value="${page - 1}" aria-label="Previous page" ${page <= 1 ? 'disabled' : ''}>‹</button><span>Page ${page} of ${pageCount}</span><button type="button" class="audit-page-arrow" data-action="audit-page" data-value="${page + 1}" aria-label="Next page" ${page >= pageCount ? 'disabled' : ''}>›</button></nav>` : ''}
  </section>`);
}

async function renderAdminSettings() {
  const [{ settings, available_barangays }, reportData, incidentData, scheduleData] = await Promise.all([
    api('/api/admin/settings'), api('/api/reports'), api('/api/incidents'), api('/api/scheduled'),
  ]);
  state.config = { ...state.config, ...settings };
  const info = settings.system_info || {};
  const notifications = settings.notification_settings || { inApp: 'on', web: 'on', email: 'off', sms: 'off' };
  const map = settings.map_settings || { latitude: 7.906, longitude: 125.094, zoom: 12, activeOutages: true, scheduledOutages: true, barangayCenters: false, satellite: false };
  const outageTypes = settings.outage_types || [];
  const inactiveOutageTypes = new Set(settings.inactive_outage_types || []);
  const selectedTab = state.adminSettingsTab || 'general';
  const tabs = [['general', 'General'], ['categories', 'Categories'], ['status', 'Status'], ['notifications', 'Notifications'], ['map', 'Map'], ['security', 'Security']];
  const listEditor = (name, key, values) => `<div class="setting-block">
    <div class="setting-head"><h3>${escapeHtml(name)}</h3></div>
    <div class="list-editor" data-list-key="${key}">
      ${(values || []).map((v, i) => `<div class="list-row"><input class="input" data-list-value="${escapeHtml(v)}" value="${escapeHtml(v)}"><button type="button" class="link-button danger" data-action="remove-list-row">Remove</button></div>`).join('')}
      <div class="list-row"><input class="input" placeholder="Add new entry" data-list-new><button type="button" class="button ghost" data-action="add-list-row">Add</button></div>
    </div>
    <button class="button primary" data-action="save-list" data-key="${key}">Save list</button>
  </div>`;
  const statusSection = (title, statuses) => `<section class="setting-block"><h3>${escapeHtml(title)}</h3><div class="setting-status-list">${statuses.map((status) => statusPill(status)).join('')}</div></section>`;

  adminShell(`<nav class="setting-tabs segmented" aria-label="System settings sections">${tabs.map(([key, label]) => `<button class="seg ${selectedTab === key ? 'active' : ''}" data-action="admin-settings-tab" data-value="${key}">${label}</button>`).join('')}</nav>
  ${selectedTab === 'general' ? `<div class="settings-general-layout">
    <section class="panel settings-general-panel"><div class="panel-head"><h2>System Configuration</h2></div>
      <form class="form-stack settings-general-form" data-form="settings-info">
        <div class="settings-general-fields">
          <label>System Name<input class="input" name="systemName" value="${escapeHtml(info.systemName || 'Valencia PowerWatch')}"></label>
          <label>Timezone<select class="input" name="timezone">${['Asia/Manila', 'Asia/Singapore', 'UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'America/New_York', 'Europe/London'].map((zone) => `<option value="${zone}" ${(info.timezone || 'Asia/Manila') === zone ? 'selected' : ''}>${zone}${zone === 'Asia/Manila' ? ' (GMT+8)' : ''}</option>`).join('')}</select></label>
          <label>Date Format<select class="input" name="dateFormat"><option value="YYYY-MM-DD" ${(info.dateFormat || 'YYYY-MM-DD') === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option><option value="MM/DD/YYYY" ${info.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option><option value="DD/MM/YYYY" ${info.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option></select></label>
          <label>Time Format<select class="input" name="timeFormat"><option value="12 Hour" ${(info.timeFormat || '12 Hour') === '12 Hour' ? 'selected' : ''}>12 Hour</option><option value="24 Hour" ${info.timeFormat === '24 Hour' ? 'selected' : ''}>24 Hour</option></select></label>
          <div class="setting-logo-preview settings-logo-field"><img src="${info.logoData ? escapeHtml(info.logoData) : '/assets/powerwatch-logo.svg'}" alt="Current system logo"><label class="button ghost">Change Logo<input class="visually-hidden" type="file" name="logoFile" accept="image/png,image/jpeg,image/webp"></label></div>
        </div>
        <details class="settings-extra-fields"><summary>Additional system information</summary><div class="settings-general-fields">
          <label>Tagline<input class="input" name="tagline" value="${escapeHtml(info.tagline || '')}"></label>
          <label>Locality<input class="input" name="locality" value="${escapeHtml(info.locality || '')}"></label>
          <label>Hotline<input class="input" name="hotline" value="${escapeHtml(info.hotline || '')}"></label>
          <label>Contact Email<input class="input" name="contactEmail" type="email" value="${escapeHtml(info.contactEmail || '')}"></label>
          <label class="wide-field">About<textarea class="input" name="about" rows="3">${escapeHtml(info.about || '')}</textarea></label>
        </div></details>
        <button class="button primary settings-save-button" type="submit">Save Changes</button>
      </form>
    </section>
    <section class="panel settings-report-categories"><div class="panel-head"><h2>Report Categories</h2><span class="muted small">${outageTypes.length} categories</span></div>
      <div class="settings-category-list">${outageTypes.map((type, index) => {
        const inactive = inactiveOutageTypes.has(type);
        return `<div class="settings-category-row"><span class="settings-category-icon tone-${index % 5}" aria-hidden="true">${index % 2 ? 'ϟ' : '◉'}</span><strong>${escapeHtml(type)}</strong><span class="settings-category-state ${inactive ? 'inactive' : ''}">${inactive ? 'Inactive' : 'Active'}</span><button type="button" class="settings-category-toggle ${inactive ? 'off' : 'on'}" data-action="toggle-outage-category" data-value="${escapeHtml(type)}" aria-pressed="${!inactive}" aria-label="${inactive ? 'Activate' : 'Deactivate'} ${escapeHtml(type)}" title="${inactive ? 'Activate' : 'Deactivate'} category"><span></span></button></div>`;
      }).join('') || emptyState('No report categories', 'Add outage types in the Categories tab.', '⚡')}</div>
    </section>
  </div>
  <section class="panel settings-maintenance-panel"><div><h2>Data Maintenance</h2><p class="muted small">Download a database backup or reset system to a fresh state.</p></div><div class="row-actions"><button class="button primary" data-action="backup">Download backup</button><button class="button danger" data-action="seed-reset">Reset system data</button></div><div class="danger-zone"><strong>Warning</strong><p class="muted small">Resetting clears all reports, incidents, schedules, announcements, notifications, feedback, and user submissions.</p></div></section>` : ''}
  ${selectedTab === 'categories' ? `<div class="panel-row wrap"><div class="panel"><div class="panel-head"><h2>Report Categories</h2></div>
    ${listEditor('Outage types', 'outage_types', settings.outage_types)}${listEditor('Inactive outage types', 'inactive_outage_types', settings.inactive_outage_types)}
    ${listEditor('Incident cause categories', 'incident_categories', settings.incident_categories)}${listEditor('Announcement categories', 'announcement_categories', settings.announcement_categories)}
    <div class="setting-block"><div class="setting-head"><h3>Reference barangay list</h3><p class="muted small">${escapeHtml((available_barangays || []).join(', '))}</p></div></div>
  </div></div>` : ''}
  ${selectedTab === 'status' ? `<div class="panel settings-status-panel"><div class="panel-head"><h2>Current status values</h2></div>
    ${statusSection('Report status', reportData.statuses)}${statusSection('Incident status', incidentData.statuses)}${statusSection('Scheduled outage status', scheduleData.statuses)}
  </div>` : ''}
  ${selectedTab === 'notifications' ? `
    <div class="panel-row wrap" style="display:grid;grid-template-columns:1fr 1.3fr;gap:20px;">
      <div class="panel settings-channel-panel">
        <div class="panel-head"><h2>Notification Channels</h2></div>
        <form class="form-stack" data-form="notification-settings">
          <label class="checkbox-field"><input type="checkbox" name="inApp" ${notifications.inApp === 'on' ? 'checked' : ''}> In-app notifications</label>
          <label class="checkbox-field"><input type="checkbox" name="web" ${notifications.web === 'on' ? 'checked' : ''}> Web notifications</label>
          <label class="checkbox-field"><input type="checkbox" name="email" ${notifications.email === 'on' ? 'checked' : ''}> Email notifications</label>
          <label class="checkbox-field"><input type="checkbox" name="sms" ${notifications.sms === 'on' ? 'checked' : ''}> SMS notifications</label>
          <p class="muted small">SMS Gateway supports Semaphore API with local test-simulation fallback.</p>
          <button class="button primary" type="submit">Save Changes</button>
        </form>
        <hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0;">
        <div class="panel-head"><h3>Broadcast Test SMS</h3></div>
        <form class="form-stack" data-form="test-sms">
          <label>Recipient Mobile Number<input class="input" name="phone_number" placeholder="09171234567" required></label>
          <label>Message Content<textarea class="input" name="message" rows="2" required placeholder="Valencia PowerWatch: Power restored in Barangay Poblacion."></textarea></label>
          <button class="button ghost" type="submit">🚀 Dispatch Test SMS</button>
        </form>
      </div>
      <div class="panel">
        <div class="panel-head" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h2>SMS Gateway Transmission Monitor</h2>
            <span class="muted small">Engine: <strong>Semaphore API + Demo Gateway</strong></span>
          </div>
          <button class="button ghost small" data-action="refresh-sms-logs">↻ Refresh</button>
        </div>
        <div class="table-container" style="max-height:380px;overflow-y:auto;margin-top:12px;">
          <table class="data-table" style="font-size:0.82rem;">
            <thead>
              <tr><th>Date/Time</th><th>Phone Number</th><th>Event</th><th>Status</th><th>Message</th></tr>
            </thead>
            <tbody id="sms-logs-tbody">
              <tr><td colspan="5" class="muted small">Loading SMS Gateway transmission logs…</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ` : ''}
  ${selectedTab === 'map' ? `<div class="panel settings-map-panel"><div class="panel-head"><h2>Map / GIS defaults</h2></div>
    <form class="form-stack" data-form="map-settings">
      <div class="form-grid"><label>Default latitude<input class="input" type="number" step="any" name="latitude" value="${escapeHtml(String(map.latitude))}" required></label><label>Default longitude<input class="input" type="number" step="any" name="longitude" value="${escapeHtml(String(map.longitude))}" required></label><label>Default zoom<input class="input" type="number" min="3" max="18" name="zoom" value="${escapeHtml(String(map.zoom))}" required></label></div>
      <label class="checkbox-field"><input type="checkbox" name="activeOutages" ${map.activeOutages ? 'checked' : ''}> Show active outages</label>
      <label class="checkbox-field"><input type="checkbox" name="scheduledOutages" ${map.scheduledOutages ? 'checked' : ''}> Show scheduled outages</label>
      <label class="checkbox-field"><input type="checkbox" name="barangayCenters" ${map.barangayCenters ? 'checked' : ''}> Show barangay centers</label>
      <label class="checkbox-field"><input type="checkbox" name="satellite" ${map.satellite ? 'checked' : ''}> Satellite view</label>
      <button class="button primary" type="submit">Save Changes</button>
    </form>
  </div>` : ''}
  ${selectedTab === 'security' ? `<div class="panel settings-security-panel"><div class="panel-head"><h2>Security</h2></div>
    <div class="detail-grid"><div><span>Account role</span><strong>${escapeHtml(roleLabel(state.user.role))}</strong></div><div><span>Password recovery</span><strong>${state.passwordRecoveryEnabled ? 'Email recovery configured' : 'SMTP not configured'}</strong></div><div><span>Access control</span><strong>Role-based permissions enabled</strong></div><div><span>Password policy</span><strong>Minimum 6 characters</strong></div></div>
    <button class="button ghost" data-page="profile">Manage account password</button>
  </div>` : ''}`);

  if (selectedTab === 'notifications') {
    api('/api/sms/logs').then(({ logs }) => {
      const tbody = document.getElementById('sms-logs-tbody');
      if (!tbody) return;
      if (!logs?.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="muted small">No SMS dispatches recorded yet. Try sending a test SMS or verifying an incident.</td></tr>';
        return;
      }
      tbody.innerHTML = logs.map((log) => `
        <tr>
          <td style="white-space:nowrap;">${escapeHtml(formatDateTime(log.created_at))}</td>
          <td style="font-weight:600;">${escapeHtml(log.phone_number)}</td>
          <td><span class="pill pill-neutral">${escapeHtml(log.event_type || 'dispatch')}</span></td>
          <td><span class="pill pill-${log.status === 'delivered' || log.status === 'simulated' ? 'ok' : 'bad'}">${escapeHtml(log.status)}</span></td>
          <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(log.message)}">${escapeHtml(log.message)}</td>
        </tr>
      `).join('');
    }).catch(() => {});
  }
}

async function renderAdminProfile() {
  const u = state.user;
  adminShell(`<div class="panel-row wrap">
    <div class="panel">
      <div class="panel-head"><h2>Profile details</h2></div>
      <form class="form-stack" data-form="profile">
        <label>Full name<input class="input" name="full_name" value="${escapeHtml(u.full_name || '')}" required></label>
        <label>Email<input class="input" value="${escapeHtml(u.email || '')}" disabled></label>
        <label>Contact number<input class="input" name="contact_number" value="${escapeHtml(u.contact_number || '')}"></label>
        <label>Barangay<select class="input" name="barangay"><option value="">None</option>${state.barangays.map((b) => `<option ${u.barangay === b ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')}</select></label>
        <label class="wide-field">Address<input class="input" name="address" value="${escapeHtml(u.address || '')}"></label>
        <button class="button primary" type="submit">Save profile</button>
      </form>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Change password</h2></div>
      <form class="form-stack" data-form="password">
        <label>Current password<input class="input" type="password" name="current_password" required></label>
        <label>New password<input class="input" type="password" name="new_password" minlength="6" required></label>
        <label>Confirm new password<input class="input" type="password" name="confirm_password" minlength="6" required></label>
        <button class="button primary" type="submit">Update password</button>
      </form>
      <div class="danger-zone"><strong>Signed in as</strong><p class="muted small">${escapeHtml(roleLabel(u.role))} · last login ${escapeHtml(formatDateTime(u.last_login))}</p></div>
    </div>
  </div>`);
}
