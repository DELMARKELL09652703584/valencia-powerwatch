/* Admin / Staff portal - desktop layout */

const ADMIN_NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'reports', label: 'Reports', roles: STAFF_ROLES },
  { key: 'verification', label: 'Verification', roles: STAFF_ROLES },
  { key: 'dispatch', label: 'Repair & Dispatch', roles: STAFF_ROLES },
  { key: 'incidents', label: 'Incidents' },
  { key: 'outage-monitoring', label: 'Outage Monitoring', roles: STAFF_ROLES },
  { key: 'map', label: 'Map / GIS', roles: STAFF_ROLES },
  { key: 'scheduled', label: 'Scheduled Outages', roles: STAFF_ROLES },
  { key: 'history', label: 'Outage History' },
  { key: 'users', label: 'Users', roles: ['administrator'] },
  { key: 'barangays', label: 'Barangays', roles: ['administrator'] },
  { key: 'analytics', label: 'Analytics & Reports', roles: STAFF_ROLES },
  { key: 'audit', label: 'Audit Logs', roles: ['administrator'] },
  { key: 'settings', label: 'Settings', roles: ['administrator'] },
];

const visibleAdminNav = () => ADMIN_NAV.filter((item) => !item.roles || item.roles.includes(state.user?.role));

function adminNotificationCategory(notice) {
  const text = `${notice.title || ''} ${notice.message || ''}`;
  if (/verif|verified|rejected|pending review/i.test(text)) return 'verification';
  if (/dispatch|repair|crew|team|arrived|technician/i.test(text)) return 'repairs';
  if (/restor|resolved|power restored|service resumed/i.test(text)) return 'restoration';
  if (['incident', 'scheduled'].includes(notice.type) || /outage|interruption|blackout/i.test(text)) return 'outages';
  if (notice.type === 'report') return 'reports';
  return 'system';
}

function adminNavIcon(key) {
  const paths = {
    dashboard: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"></path>',
    reports: '<path d="M8 4h11a2 2 0 0 1 2 2v14H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1"></path><path d="M8 2v4M9 10h8M9 14h8M9 18h5"></path>',
    verification: '<path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z"></path><path d="m8.5 12 2.2 2.2 4.8-5"></path>',
    dispatch: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path><circle cx="5" cy="19" r="2"></circle>',
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

// ==========================================================================
// SCADA 2030 REAL-TIME TELEMETRY, WEB AUDIO PING & LIVE ALERTS ENGINE
// ==========================================================================
let scadaAudioContext = null;
let adminTelemetryInterval = null;
let lastPolledReportId = 0;
let isHeartbeatInitialized = false;
let scadaBannerDismissTimer = null;

function isScadaAudioMuted() {
  try {
    return localStorage.getItem('powerwatch_scada_muted') === 'true';
  } catch (e) {
    return false;
  }
}

function setScadaAudioMuted(muted) {
  try {
    localStorage.setItem('powerwatch_scada_muted', muted ? 'true' : 'false');
  } catch (e) {}
  updateScadaAudioButtonsUI();
}

function updateScadaAudioButtonsUI() {
  const muted = isScadaAudioMuted();
  document.querySelectorAll('[data-action="toggle-admin-sound"]').forEach((btn) => {
    btn.classList.toggle('muted', muted);
    btn.classList.toggle('active', !muted);
    btn.title = muted ? 'Audio Alerts: MUTED (Click to activate audio telemetry chime)' : 'Audio Alerts: ACTIVE (Click to mute)';
    const icon = btn.querySelector('.sound-btn-icon');
    const text = btn.querySelector('.sound-btn-text');
    if (icon) icon.textContent = muted ? '🔇' : '🔊';
    if (text) text.textContent = muted ? 'Muted' : 'Sound: ON';
  });
}

function getScadaAudioContext() {
  try {
    if (!scadaAudioContext) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        scadaAudioContext = new AudioCtxClass();
      }
    }
    if (scadaAudioContext && scadaAudioContext.state === 'suspended') {
      scadaAudioContext.resume().catch(() => {});
    }
    return scadaAudioContext;
  } catch (e) {
    return null;
  }
}

function playScadaAlertChime(urgency = 'high') {
  if (isScadaAudioMuted()) return;
  try {
    const ctx = getScadaAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // Harmonic 1: Primary crystal sine frequency (880 Hz -> 1046.5 Hz - A5 to C6)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, t);
    osc1.frequency.exponentialRampToValueAtTime(1046.5, t + 0.16);

    gain1.gain.setValueAtTime(0.001, t);
    gain1.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.39);

    // Harmonic 2: SCADA telemetry bell harmonic (1320 Hz -> 1760 Hz - E6 to A6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, t + 0.11);
    osc2.frequency.exponentialRampToValueAtTime(1760, t + 0.26);

    gain2.gain.setValueAtTime(0.001, t + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.22, t + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.52);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.11);
    osc2.stop(t + 0.53);
  } catch (err) {
    console.warn('[SCADA Telemetry] Web Audio ping synthesis suppressed:', err);
  }
}

function showScadaEmergencyBanner(newReports = []) {
  if (!newReports || !newReports.length) return;
  const existing = document.getElementById('scada-emergency-banner');
  if (existing) existing.remove();
  if (scadaBannerDismissTimer) clearTimeout(scadaBannerDismissTimer);

  const latest = newReports[0];
  const count = newReports.length;

  const banner = document.createElement('aside');
  banner.id = 'scada-emergency-banner';
  banner.className = 'scada-emergency-banner';
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'assertive');

  banner.innerHTML = `
    <div class="scada-banner-inner">
      <div class="scada-banner-left">
        <span class="scada-banner-beacon"></span>
        <span class="scada-banner-icon">🚨</span>
        <div class="scada-banner-info">
          <div class="scada-banner-head">
            <strong>REAL-TIME OUTAGE INTAKE ALERT</strong>
            <span class="scada-banner-badge">${count > 1 ? `+${count} New Reports Received` : 'New Report Received'}</span>
            <span class="scada-banner-time">⚡ Just now</span>
          </div>
          <div class="scada-banner-body">
            <span class="scada-banner-loc">📍 Brgy. <strong>${escapeHtml(latest.barangay)}</strong></span>
            ${latest.location ? `<span class="scada-banner-subloc">(${escapeHtml(latest.location)})</span>` : ''}
            <span class="scada-banner-desc">— "${escapeHtml(latest.description || latest.possible_outage_type || 'Unspecified power interruption')}"</span>
            <span class="scada-banner-code">${escapeHtml(latest.report_code)}</span>
          </div>
        </div>
      </div>
      <div class="scada-banner-actions">
        <button type="button" class="button small primary scada-banner-cta" data-page="verification" data-action="dismiss-scada-banner">
          🔍 Verify in Queue (${count})
        </button>
        <button type="button" class="scada-banner-close" data-action="dismiss-scada-banner" aria-label="Dismiss alert" title="Dismiss">
          ✕
        </button>
      </div>
    </div>
  `;

  const adminMain = document.querySelector('.admin-main');
  if (adminMain) {
    adminMain.prepend(banner);
  } else {
    document.body.prepend(banner);
  }

  scadaBannerDismissTimer = setTimeout(() => {
    banner.classList.add('fading');
    setTimeout(() => banner.remove(), 350);
  }, 14000);
}

async function tickAdminTelemetry() {
  if (!IS_ADMIN || !state.user || !STAFF_ROLES.includes(state.user.role)) return;
  if (document.hidden) return;

  try {
    const url = `/api/admin/telemetry-heartbeat?since_report_id=${lastPolledReportId}`;
    const data = await api(url);
    if (!data) return;

    if (!isHeartbeatInitialized) {
      lastPolledReportId = data.latestReportId || 0;
      isHeartbeatInitialized = true;
      return;
    }

    if (data.newReports && data.newReports.length > 0) {
      lastPolledReportId = Math.max(lastPolledReportId, data.latestReportId || 0);
      playScadaAlertChime('high');
      showScadaEmergencyBanner(data.newReports);
      setToast(`🚨 Bag-ong Report: Brgy. ${data.newReports[0].barangay} (${data.newReports[0].report_code})`);
    } else if (data.latestReportId) {
      lastPolledReportId = Math.max(lastPolledReportId, data.latestReportId);
    }

    if (data.metrics) {
      // 1. Unread notifications bell
      if (typeof data.metrics.unreadNotifications === 'number') {
        state.unread = data.metrics.unreadNotifications;
        const bell = document.querySelector('.notification-bell');
        if (bell) {
          let badge = bell.querySelector('.notification-badge');
          if (state.unread > 0) {
            if (!badge) {
              badge = document.createElement('span');
              badge.className = 'notification-badge';
              bell.appendChild(badge);
            }
            badge.textContent = state.unread > 99 ? '99+' : state.unread;
          } else if (badge) {
            badge.remove();
          }
        }
      }

      // 2. Active Outages Pulse Bar
      if (typeof data.metrics.activeIncidents === 'number') {
        state.activeIncidentsCount = data.metrics.activeIncidents;
        const pulseBar = document.querySelector('.grid-pulse-bar');
        if (pulseBar) {
          const hasOutage = state.activeIncidentsCount > 0;
          pulseBar.classList.toggle('has-outage', hasOutage);
          const pulseText = pulseBar.querySelector('span:last-child');
          if (pulseText) {
            pulseText.textContent = hasOutage
              ? `${state.activeIncidentsCount} Outage${state.activeIncidentsCount > 1 ? 's' : ''} Active`
              : 'Grid Online: 99.2% Normal';
          }
        }
      }

      // 3. Live Dashboard Metric Numbers if active on dashboard
      if (state.page === 'dashboard') {
        const triageVal = document.querySelector('[data-scada-stat="triage"] .scada-card-value');
        if (triageVal && typeof data.metrics.pendingReports === 'number') {
          triageVal.textContent = data.metrics.pendingReports.toLocaleString();
        }
        const outageVal = document.querySelector('[data-scada-stat="outage"] .scada-card-value');
        if (outageVal && typeof data.metrics.activeIncidents === 'number') {
          outageVal.textContent = data.metrics.activeIncidents.toLocaleString();
        }
        const dispatchVal = document.querySelector('[data-scada-stat="dispatch"] .scada-card-value');
        if (dispatchVal && typeof data.metrics.ongoingRepairs === 'number') {
          dispatchVal.textContent = data.metrics.ongoingRepairs.toLocaleString();
        }
      }
    }
  } catch (err) {
    // Intermittent network blip; retry on next tick
  }
}

function startAdminTelemetryHeartbeat() {
  if (adminTelemetryInterval) clearInterval(adminTelemetryInterval);
  isHeartbeatInitialized = false;
  lastPolledReportId = 0;
  tickAdminTelemetry();
  adminTelemetryInterval = setInterval(tickAdminTelemetry, 7000);
}

function stopAdminTelemetryHeartbeat() {
  if (adminTelemetryInterval) {
    clearInterval(adminTelemetryInterval);
    adminTelemetryInterval = null;
  }
  isHeartbeatInitialized = false;
  const banner = document.getElementById('scada-emergency-banner');
  if (banner) banner.remove();
}

window.isScadaAudioMuted = isScadaAudioMuted;
window.setScadaAudioMuted = setScadaAudioMuted;
window.updateScadaAudioButtonsUI = updateScadaAudioButtonsUI;
window.playScadaAlertChime = playScadaAlertChime;
window.showScadaEmergencyBanner = showScadaEmergencyBanner;
window.startAdminTelemetryHeartbeat = startAdminTelemetryHeartbeat;
window.stopAdminTelemetryHeartbeat = stopAdminTelemetryHeartbeat;

function adminNotificationMenuContent() {
  return `
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
    </section>` : ''}`;
}

function adminShell(content) {
  const nav = visibleAdminNav();
  const info = state.config.system_info || {};
  const currentNav = nav.find((n) => n.key === state.page);
  const currentTitle = currentNav?.label || (state.page === 'notifications' ? 'Notifications' : state.page === 'profile' ? 'My Profile' : 'Dashboard');
  const currentLocality = info.locality || 'Valencia City, Bukidnon';

  const existingShell = app.querySelector('.admin-shell');
  if (existingShell) {
    // 1. Update active state of all nav items without destroying DOM or moving sidebar scroll position
    const navItems = existingShell.querySelectorAll('.admin-nav .nav-item');
    navItems.forEach((btn) => {
      const pageKey = btn.dataset.page;
      const isActive = state.page === pageKey;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // 2. Update topbar title & locality
    const topbarTitle = existingShell.querySelector('.admin-topbar h1');
    if (topbarTitle) topbarTitle.textContent = currentTitle;
    const topbarSub = existingShell.querySelector('.admin-topbar .topbar-sub');
    if (topbarSub) topbarSub.textContent = currentLocality;

    const notificationMenu = existingShell.querySelector('.notification-menu');
    if (notificationMenu) notificationMenu.innerHTML = adminNotificationMenuContent();

    // 3. Update topbar status pulse bar
    const pulseBar = existingShell.querySelector('.grid-pulse-bar');
    if (pulseBar) {
      const hasOutage = Number(state.activeIncidentsCount || 0) > 0;
      pulseBar.classList.toggle('has-outage', hasOutage);
      const pulseText = pulseBar.querySelector('span:last-child');
      if (pulseText) {
        pulseText.textContent = hasOutage
          ? `${state.activeIncidentsCount} Outage${state.activeIncidentsCount > 1 ? 's' : ''} Active`
          : 'Grid Online: 99.2% Normal';
      }
    }

    // 3.5 Update sound toggle button state
    const soundBtn = existingShell.querySelector('[data-action="toggle-admin-sound"]');
    if (soundBtn) {
      const isMuted = isScadaAudioMuted();
      soundBtn.classList.toggle('muted', isMuted);
      soundBtn.classList.toggle('active', !isMuted);
      soundBtn.title = isMuted ? 'Audio Alerts: MUTED (Click to activate audio telemetry chime)' : 'Audio Alerts: ACTIVE (Click to mute)';
      const icon = soundBtn.querySelector('.sound-btn-icon');
      const text = soundBtn.querySelector('.sound-btn-text');
      if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
      if (text) text.textContent = isMuted ? 'Muted' : 'Sound: ON';
    }

    // 4. Update main content only & reset ONLY main content scroll to top
    const contentArea = document.getElementById('admin-content');
    if (contentArea) {
      contentArea.innerHTML = content;
      contentArea.scrollTop = 0;
    }
    return;
  }

  // Initial full render when opening Admin portal for the first time
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
      <nav class="admin-nav" id="admin-nav-menu">${groups}</nav>
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
          <h1>${escapeHtml(currentTitle)}</h1>
          <p class="topbar-sub">${escapeHtml(currentLocality)}</p>
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
          <button type="button" class="topbar-sound-btn ${isScadaAudioMuted() ? 'muted' : 'active'}" data-action="toggle-admin-sound" title="${isScadaAudioMuted() ? 'Audio Alerts: MUTED (Click to activate audio telemetry chime)' : 'Audio Alerts: ACTIVE (Click to mute)'}">
            <span class="sound-btn-icon">${isScadaAudioMuted() ? '🔇' : '🔊'}</span>
            <span class="sound-btn-text">${isScadaAudioMuted() ? 'Muted' : 'Sound: ON'}</span>
          </button>
          <button type="button" class="theme-toggle-btn" data-action="toggle-admin-theme" aria-pressed="${document.documentElement.classList.contains('dark-mode')}" aria-label="${document.documentElement.classList.contains('dark-mode') ? 'Switch to light mode' : 'Switch to Night Ops dark mode'}" title="${document.documentElement.classList.contains('dark-mode') ? 'Switch to light mode' : 'Switch to Night Ops dark mode'}">
            <span id="theme-btn-icon" aria-hidden="true">${document.documentElement.classList.contains('dark-mode') ? '☀️' : '🌙'}</span>
            <span id="theme-btn-text">${document.documentElement.classList.contains('dark-mode') ? 'Light mode' : 'Night Ops'}</span>
          </button>
          <div class="notification-menu">${adminNotificationMenuContent()}</div>
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
  adminShell(loadingState('Connecting to Valencia Smart Grid Command Center…'));
  const [{ stats }, monthly, barangay, incidentStatus, repRes, incRes, teamRes, insightsRes] = await Promise.all([
    api('/api/analytics/dashboard'),
    api('/api/analytics/monthly'),
    api('/api/analytics/barangay'),
    api('/api/analytics/status'),
    api('/api/reports'),
    api('/api/incidents'),
    api('/api/repair-teams'),
    api('/api/analytics/insights'),
  ]);

  const allReports = repRes.reports || [];
  const allIncidents = incRes.incidents || [];
  const teams = teamRes.teams || [];
  const insights = insightsRes;
  const recent = allReports.slice(0, 6);
  const active = allIncidents.filter((i) => !['Closed', 'Restored', 'Resolved'].includes(i.status)).slice(0, 5);
  const resolvedCount = Number(stats.resolved || 0) + Number(stats.restored || 0);
  state.activeIncidentsCount = Number(stats.ongoing || stats.active_incidents || 0);

  const cards = [
    { label: 'Citizen Reports', value: stats.reports_total, tag: 'INTAKE', sub: `${stats.reports_verified || 0} Verified · ${stats.reports_pending || 0} Pending`, tone: 'blue', page: 'reports', icon: '📋' },
    { label: 'Pending Triage', value: Number(stats.reports_pending || 0) + Number(stats.reports_under_review || 0), tag: 'TRIAGE', sub: 'Requires inspection', tone: 'amber', page: 'verification', icon: '⏳' },
    { label: 'Active Outages', value: state.activeIncidentsCount, tag: 'OUTAGE', sub: `${stats.affected_customers || 0} Affected Accounts`, tone: 'red', page: 'outage-monitoring', icon: '⚡' },
    { label: 'Field Repair Units', value: stats.active_dispatches || 0, tag: 'DISPATCH', sub: `${stats.available_crews || 0}/${stats.total_crews || 4} Crews Ready`, tone: 'emerald', page: 'dispatch', icon: '🚛' },
    { label: 'Scheduled Work', value: stats.scheduled || 0, tag: 'PREVENTIVE', sub: 'Planned Feeder Windows', tone: 'violet', page: 'scheduled', icon: '🗓️' },
    { label: 'Grid Restored', value: resolvedCount, tag: 'RESTORED', sub: `Avg ETR: ${stats.avg_duration_hours ? stats.avg_duration_hours + 'h' : 'Optimal'}`, tone: 'teal', page: 'history', icon: '✅' },
  ];

  const topBarangays = (barangay.data || []).slice(0, 3);
  const focusCards = [
    { icon: '📊', label: 'Customer Impact', value: `${stats.affected_customers || 0}`, sub: 'affected accounts', tone: 'critical' },
    { icon: '🚨', label: 'Priority Areas', value: topBarangays.length ? `${topBarangays[0]?.barangay || 'N/A'}` : 'No active alert', sub: topBarangays.length > 1 ? `${topBarangays[1]?.barangay || 'Monitoring stable'}` : 'Monitoring stable', tone: 'warning' },
    { icon: '🛠️', label: 'Crew Readiness', value: `${stats.available_crews || 0}/${stats.total_crews || 4}`, sub: 'units on standby', tone: 'success' },
  ];

  const barangayRows = (barangay.data || []).slice(0, 6).map((row) => ({ label: row.barangay, value: Number(row.c) || 0 }));
  const otherCount = (barangay.data || []).slice(6).reduce((sum, row) => sum + (Number(row.c) || 0), 0);
  if (otherCount) barangayRows.push({ label: 'Others', value: otherCount });
  const barMaximum = Math.max(1, ...barangayRows.map((row) => row.value));
  const barTicks = Array.from({ length: 5 }, (_, index) => Math.ceil(barMaximum * (4 - index) / 4));
  const barangayBars = barangayRows.map((row) => `
    <div class="dashboard-bar-item" title="${escapeHtml(row.label)}: ${row.value} reports" data-page="reports" style="cursor:pointer;">
      <strong style="color:var(--admin-blue-deep);">${row.value}</strong>
      <div><i style="height:${Math.max(4, (row.value / barMaximum) * 100)}%;"></i></div>
      <span>${escapeHtml(row.label)}</span>
    </div>
  `).join('');

  const monthlyRows = (monthly.data || []).slice(-12);
  const trendCopy = insights.trend.direction === 'up'
    ? `${insights.current.unexpected_incidents} confirmed unexpected incidents in the last 90 days, up ${insights.trend.change_percent}% from the previous 90 days.`
    : insights.trend.direction === 'down'
      ? `${insights.current.unexpected_incidents} confirmed unexpected incidents in the last 90 days, down ${Math.abs(insights.trend.change_percent)}% from the previous 90 days.`
      : insights.trend.direction === 'new_activity'
        ? `${insights.current.unexpected_incidents} confirmed unexpected incidents in the last 90 days; none were recorded in the previous comparison period.`
        : `${insights.current.unexpected_incidents} confirmed unexpected incidents in the last 90 days, unchanged from the previous 90 days.`;
  const forecastCopy = insights.projection.status === 'available'
    ? `Baseline estimate: about ${insights.projection.next_month_unexpected_incidents} confirmed unexpected incidents next month, calculated as the six-month average (${insights.projection.sample_incidents} incidents across ${insights.projection.sample_months} active months). It is not a scheduled outage or certainty.`
    : `Forecast withheld: the six complete months contain ${insights.projection.sample_incidents} confirmed unexpected incidents across ${insights.projection.sample_months} active months. At least 12 incidents across 3 months are required.`;
  const medianHours = (value) => value === null ? 'No data' : `${value}h`;
  const trendMaximum = Math.max(1, ...monthlyRows.flatMap((row) => [Number(row.scheduled) || 0, Number(row.unexpected) || 0]));
  const chartX = (index) => monthlyRows.length < 2 ? 300 : 34 + (index / (monthlyRows.length - 1)) * 532;
  const chartY = (value) => 205 - ((Number(value) || 0) / trendMaximum) * 170;
  const scheduledPoints = monthlyRows.map((row, index) => `${chartX(index)},${chartY(row.scheduled)}`).join(' ');
  const unexpectedPoints = monthlyRows.map((row, index) => `${chartX(index)},${chartY(row.unexpected)}`).join(' ');
  const trendChart = monthlyRows.length ? `<div class="dashboard-trend-legend">
      <span><i class="scheduled-key"></i>Scheduled Maintenance</span>
      <span><i class="unexpected-key"></i>Unexpected Faults</span>
    </div>
    <svg class="dashboard-trend-svg" viewBox="0 0 600 250" role="img" aria-label="Monthly scheduled and unexpected outage trend">
      ${[0, 1, 2, 3, 4].map((index) => {
        const y = 205 - index * 42.5;
        const value = Math.round(trendMaximum * index / 4);
        return `<line x1="32" y1="${y}" x2="570" y2="${y}" class="trend-grid-line"></line><text x="25" y="${y + 4}" text-anchor="end" class="trend-axis-label">${value}</text>`;
      }).join('')}
      ${scheduledPoints ? `<polyline points="${scheduledPoints}" class="trend-line scheduled"></polyline>` : ''}
      ${unexpectedPoints ? `<polyline points="${unexpectedPoints}" class="trend-line unexpected"></polyline>` : ''}
      ${monthlyRows.map((row, index) => `
        <circle cx="${chartX(index)}" cy="${chartY(row.scheduled)}" r="4.5" class="trend-point scheduled"></circle>
        <circle cx="${chartX(index)}" cy="${chartY(row.unexpected)}" r="4.5" class="trend-point unexpected"></circle>
        <text x="${chartX(index)}" y="236" text-anchor="middle" class="trend-month-label">${escapeHtml(String(row.month).split(' ')[0])}</text>
      `).join('')}
    </svg>` : emptyState('No monthly outage trend', 'Outage trend appears when incidents have a start date.', '📈');

  const nowPst = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date());

  adminShell(`<section class="admin-dashboard-page">
    <header class="dashboard-welcome command-center-header">
      <div class="command-header-main">
        <div class="command-badge-row">
          <span class="command-badge"><span class="command-badge-dot"></span> CITY POWER OPERATIONS</span>
          <span class="command-timestamp">🕒 ${nowPst} PST (UTC+8)</span>
        </div>
        <h2>Valencia Smart Grid Operations</h2>
        <div class="command-telemetry-status">
          ${state.activeIncidentsCount > 0
            ? `<span class="telemetry-pill alert"><span class="pulse-dot red"></span> <strong>${state.activeIncidentsCount} Grid Outages Active</strong> · ${stats.active_dispatches || 0} Response Units Deployed</span>`
            : `<span class="telemetry-pill normal"><span class="pulse-dot green"></span> <strong>No active incidents recorded</strong> · Status reflects PowerWatch records, not live grid telemetry</span>`}
        </div>
      </div>
      <div class="command-header-actions">
        <button type="button" class="button small primary" data-action="new-incident" style="display:inline-flex;align-items:center;gap:6px;font-weight:700;">
          <span>⚡</span> Log Interruption
        </button>
        <button type="button" class="button small ghost" data-action="new-announcement" style="display:inline-flex;align-items:center;gap:6px;">
          <span>📢</span> Broadcast Alert
        </button>
        <button type="button" class="button small ghost" data-page="dispatch" style="display:inline-flex;align-items:center;gap:6px;">
          <span>🚛</span> Dispatch Center
        </button>
        <button type="button" class="button small ghost" data-action="export-situation-report" style="display:inline-flex;align-items:center;gap:6px;" title="Export Executive Situation Report CSV">
          <span>📊</span> SitRep CSV
        </button>
      </div>
    </header>

    <div class="dashboard-stat-grid scada-stat-grid">
      ${cards.map((card) => `
        <button type="button" class="dashboard-stat-card scada-card tone-${card.tone}" data-scada-stat="${card.tag.toLowerCase()}" data-page="${card.page}" title="Open ${escapeHtml(card.label)} module">
          <div class="scada-card-head">
            <span class="scada-card-icon">${card.icon}</span>
            <span class="scada-card-tag">${card.tag}</span>
          </div>
          <strong class="scada-card-value">${escapeHtml(Number(card.value || 0).toLocaleString())}</strong>
          <span class="scada-card-label">${escapeHtml(card.label)}</span>
          <span class="scada-card-sub">${escapeHtml(card.sub)}</span>
        </button>
      `).join('')}
    </div>

    <section class="dashboard-focus-grid" aria-label="Operational snapshot">
      <h2 class="dashboard-section-label">Operational snapshot</h2>
      ${focusCards.map((item) => `
        <div class="dashboard-focus-item focus-${item.tone}">
          <div class="focus-item-header">
            <span class="focus-icon">${item.icon}</span>
            <span>${escapeHtml(item.label)}</span>
          </div>
          <strong>${escapeHtml(item.value)}</strong>
          <small>${escapeHtml(item.sub)}</small>
        </div>
      `).join('')}
    </section>

    <section class="bi-insights-panel admin-bi-panel" aria-labelledby="admin-bi-title">
      <header class="bi-insights-header">
        <div><span class="bi-eyebrow">EXPLAINABLE BUSINESS INTELLIGENCE · ${escapeHtml(insights.scope.name)}</span><h2 id="admin-bi-title">Operational trends &amp; response insights</h2></div>
        <span class="bi-period">90-day comparison</span>
      </header>
      <p class="bi-insight-summary">${escapeHtml(trendCopy)}</p>
      <div class="bi-insight-grid">
        <article><span>Unexpected incidents</span><strong>${insights.current.unexpected_incidents}</strong><small>Previous 90 days: ${insights.previous.unexpected_incidents}</small></article>
        <article><span>Leading current hotspot</span><strong>${escapeHtml(insights.hotspots[0]?.barangay || 'No incidents')}</strong><small>${insights.hotspots[0] ? `${insights.hotspots[0].incidents} unexpected incidents in 90 days` : 'No mapped incident history for this period'}</small></article>
        <article><span>Median dispatch → arrival</span><strong>${escapeHtml(medianHours(insights.current.median_dispatch_response_hours))}</strong><small>${insights.current.response_sample_size} completed arrival records</small></article>
        <article><span>Median restoration time</span><strong>${escapeHtml(medianHours(insights.current.median_restoration_hours))}</strong><small>${insights.current.restoration_sample_size} completed restoration records</small></article>
      </div>
      <p class="bi-projection ${insights.projection.status === 'available' ? 'available' : 'limited'}">${escapeHtml(forecastCopy)}</p>
      <small class="bi-data-note">Source: recorded system incidents, open resident reports, and repair assignments. Comparison uses the prior 90 days; medians use completed cases. Estimates are descriptive, not official outage advisories.</small>
    </section>

    <div class="dashboard-visual-grid scada-visual-grid">
      <!-- PANEL 1: GIS Outage Radar Map -->
      <section class="dashboard-visual-panel radar-map-panel">
        <header>
          <div>
            <h3>📍 Incident &amp; Repair Team Map</h3>
            <span style="font-size:0.75rem;color:var(--admin-muted);">Reported locations and available crews</span>
          </div>
          <button type="button" class="link-button" data-page="map" style="font-size:0.78rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;">
            Open Full GIS Map &rarr;
          </button>
        </header>
        <div class="dashboard-radar-canvas" id="dashboard-radar-map" style="height:280px;border-radius:12px;overflow:hidden;border:1px solid var(--admin-line);"></div>
        <footer style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;font-size:0.75rem;color:#64748b;">
          <span>⚡ Active Outage Marker</span>
          <span>📌 Citizen Report Pin</span>
          <span>🚒 Emergency Response Unit</span>
        </footer>
      </section>

      <!-- PANEL 2: Barangay Impact Ranking -->
      <section class="dashboard-visual-panel dashboard-bar-panel">
        <header>
          <div>
            <h3>🏛️ Reports by Barangay</h3>
            <span style="font-size:0.75rem;color:var(--admin-muted);">${stats.reports_total || 0} total reported interruptions</span>
          </div>
          <button type="button" class="link-button" data-page="reports" style="font-size:0.78rem;">View in Reports &rarr;</button>
        </header>
        ${barangayRows.length
          ? `<div class="dashboard-bar-chart"><div class="dashboard-bar-axis">${barTicks.map((tick) => `<span>${tick}</span>`).join('')}</div><div class="dashboard-bar-plot">${barangayBars}</div></div>`
          : `<div class="dashboard-chart-empty">${emptyState('No reports by barangay', 'Barangay totals appear when residents submit reports.', '📊')}</div>`}
      </section>

      <!-- PANEL 3: Monthly & 24H Outage Trend -->
      <section class="dashboard-visual-panel dashboard-trend-panel">
        <header>
          <div>
            <h3>📈 Monthly Outage Trends</h3>
            <span style="font-size:0.75rem;color:var(--admin-muted);">Scheduled maintenance vs unexpected faults</span>
          </div>
          <button type="button" class="link-button" data-page="analytics" style="font-size:0.78rem;">Analytics &rarr;</button>
        </header>
        ${trendChart}
      </section>

      <!-- PANEL 4: Emergency Response Fleet Status -->
      <section class="dashboard-visual-panel fleet-status-panel">
        <header>
          <div>
            <h3>🚒 Repair Team Readiness</h3>
            <span style="font-size:0.75rem;color:var(--admin-muted);">${teams.length} Valencia City utility units</span>
          </div>
          <button type="button" class="link-button" data-page="dispatch" style="font-size:0.78rem;font-weight:700;">
            Manage Fleet &rarr;
          </button>
        </header>
        <div class="fleet-units-list" style="display:flex;flex-direction:column;gap:10px;margin-top:4px;">
          ${teams.length ? teams.map((t) => {
            const isAvail = t.status === 'Available';
            const statusColor = isAvail ? '#10b981' : t.status === 'Dispatched' ? '#0284c7' : '#f59e0b';
            return `
              <div class="fleet-unit-card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border:1px solid var(--admin-line);border-radius:10px;background:rgba(255,255,255,0.7);">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:34px;height:34px;border-radius:9px;background:${isAvail ? '#ecfdf5' : '#f0f9ff'};border:1px solid ${isAvail ? '#a7f3d0' : '#bae6fd'};display:grid;place-items:center;font-size:16px;">🚒</div>
                  <div>
                    <strong style="font-size:0.86rem;display:block;color:var(--admin-ink);">${escapeHtml(t.name)}</strong>
                    <span style="font-size:0.74rem;color:#64748b;">${escapeHtml(t.vehicle_type)} · Lead: ${escapeHtml(t.lead_technician)}</span>
                  </div>
                </div>
                <div style="text-align:right;">
                  <span style="display:inline-flex;align-items:center;gap:5px;font-size:0.74rem;font-weight:700;color:${statusColor};background:${isAvail ? '#ecfdf5' : '#eff6ff'};padding:3px 8px;border-radius:6px;border:1px solid ${isAvail ? '#a7f3d0' : '#bfdbfe'};">
                    <span style="width:6px;height:6px;border-radius:50%;background:${statusColor};"></span>
                    ${escapeHtml(t.status)}
                  </span>
                  <div style="font-size:0.7rem;color:#94a3b8;margin-top:2px;">${escapeHtml(t.base_station?.split(',')[0] || 'Base')}</div>
                </div>
              </div>
            `;
          }).join('') : '<p class="muted small">No repair crews registered in database.</p>'}
        </div>
      </section>
    </div>

    <div class="dashboard-activity-grid">
      <!-- QUEUE 1: Recent Citizen Reports -->
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Recent Citizen Reports</h2>
            <span style="font-size:0.75rem;color:var(--admin-muted);">Incoming resident interruption reports</span>
          </div>
          ${canManage() ? '<button class="link-button" data-page="reports">View all &rarr;</button>' : ''}
        </div>
        ${recent.length ? `
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Report Code</th>
                  <th>Barangay &amp; Purok</th>
                  <th>Location Type</th>
                  <th>Reporter</th>
                  <th>Status</th>
                  <th>Reported Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${recent.map((row) => `
                  <tr>
                    <td class="mono" style="font-weight:700;color:#0284c7;">${escapeHtml(row.report_code)}</td>
                    <td>
                      <strong>Brgy. ${escapeHtml(row.barangay)}</strong>
                      ${row.purok ? `<div style="font-size:0.75rem;color:#0369a1;">📍 ${escapeHtml(row.purok)}</div>` : ''}
                    </td>
                    <td>
                      ${row.latitude && row.longitude
                        ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;padding:2px 6px;border-radius:4px;font-weight:600;">📍 GPS (${Number(row.latitude).toFixed(3)}, ${Number(row.longitude).toFixed(3)})</span>`
                        : '<span style="font-size:0.72rem;color:#94a3b8;">Centroid</span>'}
                    </td>
                    <td>${escapeHtml(row.reporter_name || 'Resident')}</td>
                    <td>${statusPill(row.status)}</td>
                    <td class="muted" style="font-size:0.78rem;">${escapeHtml(formatDateTime(row.reported_at))}</td>
                    <td>
                      <button type="button" class="button ghost small" data-action="open-assign-repair-modal" data-id="${row.id}" style="font-size:0.72rem;padding:3px 7px;">
                        Triage ›
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : emptyState('No reports yet', 'Resident reports will appear here once submitted.', '📋')}
      </section>

      <!-- QUEUE 2: Active Grid Incidents -->
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Active Grid Outages</h2>
            <span style="font-size:0.75rem;color:var(--admin-muted);">Confirmed power interruptions in progress</span>
          </div>
          <button class="link-button" data-page="incidents">View all &rarr;</button>
        </div>
        ${active.length ? `
          <ul class="feed-list" style="margin:0;padding:0;list-style:none;">
            ${active.map((item) => `
              <li style="padding:12px;border-bottom:1px solid var(--admin-line);display:flex;align-items:center;justify-content:space-between;gap:12px;">
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px;">
                    <strong style="color:#e11d48;font-size:0.88rem;">⚡ ${escapeHtml(item.incident_code)}</strong>
                    <span style="font-weight:700;font-size:0.84rem;color:var(--admin-ink);">${escapeHtml(item.title)}</span>
                  </div>
                  <div class="feed-meta" style="font-size:0.78rem;color:#64748b;">
                    <span>📍 Brgy. ${escapeHtml(item.barangay)}</span>
                    ${item.customers_affected ? ` · <span>👥 ${item.customers_affected} affected accounts</span>` : ''}
                    ${item.estimated_restoration ? ` · <span style="color:#0284c7;font-weight:600;">⏱️ ETR: ${escapeHtml(item.estimated_restoration)}</span>` : ''}
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  ${statusPill(item.status)}
                  <button type="button" class="button ghost small" data-action="view-incident-details" data-id="${item.id}" style="font-size:0.72rem;padding:3px 8px;">
                    Details ›
                  </button>
                </div>
              </li>
            `).join('')}
          </ul>
        ` : emptyState('No active grid outages', 'The city currently has no ongoing unscheduled interruptions.', '⚡')}
      </section>
    </div>
  </section>`);

  // Initialize interactive GIS Radar Mini-Map
  const radarElement = document.getElementById('dashboard-radar-map');
  if (radarElement) {
    try {
      await loadAdminMapLibrary();
      const radarMap = L.map(radarElement, {
        zoomControl: true,
        minZoom: 10,
        maxZoom: 18,
        attributionControl: false
      }).setView([7.9064, 125.0941], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: 'abc',
        maxZoom: 18
      }).addTo(radarMap);

      // Plot active reports with coordinates
      allReports.filter((r) => r.latitude && r.longitude && r.status !== 'Resolved').forEach((r) => {
        L.circleMarker([Number(r.latitude), Number(r.longitude)], {
          radius: 7,
          color: '#ffffff',
          fillColor: '#ea580c',
          fillOpacity: 0.95,
          weight: 2
        }).addTo(radarMap).bindPopup(`
          <div style="font-family:sans-serif;font-size:0.82rem;">
            <strong style="color:#ea580c;">📌 ${escapeHtml(r.report_code)}</strong><br>
            <strong>Brgy. ${escapeHtml(r.barangay)}</strong>${r.purok ? ' · ' + escapeHtml(r.purok) : ''}<br>
            <span>Status: ${escapeHtml(r.status)}</span>
          </div>
        `);
      });

      // Plot active incidents
      allIncidents.filter((i) => i.latitude && i.longitude && i.status !== 'Closed').forEach((i) => {
        L.circleMarker([Number(i.latitude), Number(i.longitude)], {
          radius: 9,
          color: '#ffffff',
          fillColor: '#e11d48',
          fillOpacity: 1,
          weight: 2.5
        }).addTo(radarMap).bindPopup(`
          <div style="font-family:sans-serif;font-size:0.82rem;">
            <strong style="color:#b91c1c;">⚡ ${escapeHtml(i.incident_code)}</strong><br>
            <strong>${escapeHtml(i.title)}</strong><br>
            <span>Brgy. ${escapeHtml(i.barangay)}</span><br>
            <span>Status: ${escapeHtml(i.status)}</span>
          </div>
        `);
      });

      // Plot repair teams
      teams.forEach((t) => {
        if (!t.current_latitude || !t.current_longitude) return;
        const isAvail = t.status === 'Available';
        const truckIcon = L.divIcon({
          className: 'crew-truck-radar-marker',
          html: `<div style="background:${isAvail ? '#059669' : '#0284c7'};color:#fff;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:12px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);" title="${escapeHtml(t.name)}">🚒</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
        L.marker([Number(t.current_latitude), Number(t.current_longitude)], { icon: truckIcon })
          .addTo(radarMap)
          .bindPopup(`
            <div style="font-family:sans-serif;font-size:0.82rem;">
              <strong style="color:#0f172a;">🚒 ${escapeHtml(t.name)}</strong><br>
              <span>${escapeHtml(t.vehicle_type)}</span><br>
              <span style="color:${isAvail ? '#059669' : '#0284c7'};font-weight:700;">Status: ${escapeHtml(t.status)}</span>
            </div>
          `);
      });

      window.setTimeout(() => radarMap.invalidateSize(), 200);
    } catch (e) {
      console.warn('Radar map load warning:', e);
    }
  }
}

async function renderAdminReports() {
  const f = state.filters;
  const params = query({ status: f.reportStatus, verification: f.reportVerification, barangay: f.reportBarangay, q: f.reportSearch });
  const [{ reports, statuses }, data] = await Promise.all([api(`/api/reports${params}`), api('/api/reports')]);
  const reportTabs = [
    ['All Reports', ''],
    ['Pending', 'Submitted'],
    ['Under Review', 'Under Review'],
    ['Verified', 'Verified'],
    ['In Progress', 'In Progress'],
    ['Resolved', 'Resolved'],
    ['Rejected', 'Rejected'],
    ['Duplicate', 'Duplicate']
  ];

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
    if (status === 'in progress' || status === 'ongoing') return 'report-status ongoing';
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
    : null;
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
            <div><span>Barangay:</span><strong>Brgy. ${escapeHtml(report.barangay || 'Not provided')}</strong></div>
            <div><span>Purok / Area:</span><strong style="color:#0284c7;">📍 ${escapeHtml(report.purok || report.affected_area || 'Specific Purok Not Specified')}</strong></div>
            <div><span>Location source:</span><strong>${report.location_source === 'gps' ? `GPS${report.location_accuracy_m ? ` (±${Math.round(Number(report.location_accuracy_m))} m)` : ''}` : report.location_source === 'map_pin' ? 'User-placed map pin' : 'Not recorded'}</strong></div>
            <div><span>Coordinates:</span><strong>${hasCoordinates(report) ? `${Number(report.latitude).toFixed(5)}, ${Number(report.longitude).toFixed(5)}` : 'Exact pin unavailable'}</strong></div>
            <div><span>Assigned Crew:</span><strong>${report.assigned_team_name ? `<span style="color:#059669;font-weight:700;">🚛 ${escapeHtml(report.assigned_team_name)}</span> <span style="background:#e0f2fe;color:#0284c7;font-size:0.75rem;padding:2px 7px;border-radius:4px;font-weight:700;margin-left:4px;">${escapeHtml(report.repair_status || 'Dispatched')}</span>` : '<span style="color:#64748b;font-weight:500;">None (Unassigned)</span>'}</strong></div>
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
            ${coordinates ? `<div class="verification-map" id="verification-map" aria-label="Map showing the report location"></div><p class="verification-map-caption">${report.location_source === 'gps' ? 'User GPS location' : report.location_source === 'map_pin' ? 'User-placed map pin' : 'Location source not recorded'} · Brgy. ${escapeHtml(report.barangay || '')} · ${escapeHtml(report.purok || report.affected_area || 'Specific area not entered')}</p>` : `<div class="verification-map-unavailable"><span>⌖</span><strong>Exact location pin unavailable</strong><small>Do not route this legacy report until its exact location is confirmed.</small></div>`}
          </section>
          <section class="verification-nearby">
            <h3>Nearby Reports <span>(${nearbyReports.length})</span></h3>
            ${nearbyReports.length ? `<ul>${nearbyReports.map((item) => `<li><button type="button" class="nearby-report-link" data-action="verification-select-report" data-id="${item.id}"><span class="nearby-marker">⌖</span><span>${escapeHtml(item.report_code)}</span></button><span class="nearby-distance">${item.distance === null ? 'Same barangay' : `${item.distance.toFixed(1)} km`}</span></li>`).join('')}</ul>` : '<p class="verification-nearby-empty">No other reports to compare yet.</p>'}
          </section>
        </aside>
      </div>

      <footer class="verification-actions" style="flex-wrap:wrap;gap:8px;">
        ${canVerify ? `<button type="button" class="verification-action verify" data-action="verify-report" data-id="${report.id}">${icon('check')}Verify</button>` : ''}
        <button type="button" class="verification-action" style="background:#0284c7;color:#fff;" data-action="open-assign-repair-modal" data-id="${report.id}" ${hasCoordinates(report) ? '' : 'disabled title="Exact report coordinates are required before dispatch."'} >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          ${report.assigned_team_name ? 'Reassign Crew' : 'Assign Repair Team'}
        </button>
        ${report.assigned_team_name ? `<button type="button" class="verification-action" style="background:#4f46e5;color:#fff;" data-action="view-crew-route" data-id="${report.id}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          Track Crew Route
        </button>` : ''}
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

async function renderAdminDispatch() {
  const [{ teams }, { assignments }, { reports }] = await Promise.all([
    api('/api/repair-teams'),
    api('/api/repair/assignments'),
    api('/api/reports')
  ]);

  const filter = state.filters.dispatchStatus || '';
  const search = String(state.filters.dispatchSearch || '').trim().toLowerCase();

  const filteredAssignments = assignments.filter((a) => {
    const matchesStatus = !filter || (filter === 'Active' ? ['Dispatched', 'En Route', 'Arrived On Site', 'In Progress'].includes(a.status) : a.status === filter);
    const searchable = [a.assignment_code, a.team_name, a.target_barangay, a.target_purok, a.target_location, a.lead_technician, a.status].join(' ').toLowerCase();
    return matchesStatus && (!search || searchable.includes(search));
  });

  const availableTeams = teams.filter((t) => t.status === 'Available');
  const activeAssignments = assignments.filter((a) => ['Dispatched', 'En Route', 'Arrived On Site', 'In Progress'].includes(a.status));
  const resolvedAssignments = assignments.filter((a) => a.status === 'Resolved');

  const selectedAssignment = filteredAssignments.find((a) => String(a.id) === String(state.selectedDispatchId))
    || activeAssignments[0]
    || filteredAssignments[0];
  state.selectedDispatchId = selectedAssignment?.id || null;

  const unassignedReports = reports.filter((r) => ['Submitted', 'Under Review', 'Verified', 'In Progress'].includes(r.status) && !r.assigned_team_id);

  const statusBadge = (st) => {
    if (st === 'En Route') return '<span class="dispatch-badge en-route">🚀 En Route</span>';
    if (st === 'Arrived On Site') return '<span class="dispatch-badge arrived">📍 Arrived On Site</span>';
    if (st === 'In Progress') return '<span class="dispatch-badge in-progress">⚡ In Progress</span>';
    if (st === 'Resolved') return '<span class="dispatch-badge resolved">✅ Resolved</span>';
    return '<span class="dispatch-badge dispatched">📋 Dispatched</span>';
  };

  const priorityBadge = (pr) => {
    if (pr === 'Critical') return '<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:800;">🚨 Critical</span>';
    if (pr === 'High') return '<span style="background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:800;">⚡ High</span>';
    return '<span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;">Normal</span>';
  };

  const tabs = [
    ['All Dispatches', '', assignments.length],
    ['Active Response', 'Active', activeAssignments.length],
    ['En Route', 'En Route', assignments.filter(a => a.status === 'En Route').length],
    ['On-Site', 'Arrived On Site', assignments.filter(a => a.status === 'Arrived On Site').length],
    ['In Progress', 'In Progress', assignments.filter(a => a.status === 'In Progress').length],
    ['Resolved', 'Resolved', resolvedAssignments.length],
  ];

  const tabMarkup = tabs.map(([label, val, count]) => `
    <button type="button" class="verification-tab ${(filter === val || (val === 'Active' && ['Dispatched','En Route','Arrived On Site','In Progress'].includes(filter))) ? 'active' : ''}" data-action="filter-dispatch-status" data-value="${val}">
      ${label} <span>(${count})</span>
    </button>
  `).join('');

  adminShell(`
    <section class="dispatch-page">
      <div class="verification-heading-row">
        <div>
          <p class="verification-eyebrow">COMMAND CENTER &amp; EMERGENCY RESPONSE</p>
          <h2>Repair Teams &amp; Dispatch Control</h2>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <button type="button" class="button primary" data-action="open-quick-dispatch-modal" style="display:inline-flex;align-items:center;gap:6px;font-weight:750;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            Dispatch Response Crew
          </button>
          <button type="button" class="verification-icon-btn" data-action="dispatch-refresh" title="Refresh Live State">⟳</button>
        </div>
      </div>

      <div class="dispatch-metrics">
        <div class="dispatch-stat-card">
          <span class="dispatch-stat-label">Response Fleet</span>
          <span class="dispatch-stat-value">${teams.length} Crews</span>
          <span class="dispatch-stat-sub">${availableTeams.length} Standby / Ready</span>
        </div>
        <div class="dispatch-stat-card" style="border-left:4px solid #0284c7;">
          <span class="dispatch-stat-label">Active Field Dispatches</span>
          <span class="dispatch-stat-value" style="color:#0284c7;">${activeAssignments.length}</span>
          <span class="dispatch-stat-sub">Units navigating / working on-site</span>
        </div>
        <div class="dispatch-stat-card" style="border-left:4px solid #f59e0b;">
          <span class="dispatch-stat-label">Pending Outage Reports</span>
          <span class="dispatch-stat-value" style="color:#f59e0b;">${unassignedReports.length}</span>
          <span class="dispatch-stat-sub">Citizens awaiting response</span>
        </div>
        <div class="dispatch-stat-card" style="border-left:4px solid #10b981;">
          <span class="dispatch-stat-label">Restored Outages</span>
          <span class="dispatch-stat-value" style="color:#10b981;">${resolvedAssignments.length}</span>
          <span class="dispatch-stat-sub">Repaired &amp; closed successfully</span>
        </div>
      </div>

      <div style="background:#fff;border:1px solid #d9e6f1;border-radius:10px;padding:12px 16px;box-shadow:0 2px 6px rgba(0,0,0,0.02);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <span style="font-size:0.8rem;font-weight:750;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.05em;">🚒 Emergency Response Units Status</span>
          <span style="font-size:0.75rem;color:#64748b;">Valencia PowerWatch Fleet Monitoring</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:10px;">
          ${teams.map((t) => {
            const isAvail = t.status === 'Available';
            const dotColor = isAvail ? '#10b981' : '#f59e0b';
            return `
              <div style="border:1px solid ${isAvail ? '#e2e8f0' : '#bae6fd'};background:${isAvail ? '#f8fafc' : '#f0f9ff'};border-radius:8px;padding:9px 12px;display:flex;flex-direction:column;gap:3px;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <strong style="font-size:0.85rem;color:#0f172a;">${escapeHtml(t.name)}</strong>
                  <span style="display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;font-weight:750;color:${isAvail ? '#059669' : '#0369a1'};">
                    <span style="width:7px;height:7px;border-radius:50%;background:${dotColor};"></span>
                    ${escapeHtml(t.status)}
                  </span>
                </div>
                <div style="font-size:0.75rem;color:#475569;">
                  <span>Lead: ${escapeHtml(t.lead_technician)}</span> · <span>${escapeHtml(t.vehicle_type)}</span>
                </div>
                <div style="font-size:0.72rem;color:#64748b;">
                  <span>Base: ${escapeHtml(t.base_station)}</span> · <span>📞 ${escapeHtml(t.contact_number)}</span>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:5px;">
                  <span style="font-size:0.7rem;color:#64748b;">${t.location_updated_at ? `GPS updated ${escapeHtml(formatDateTime(t.location_updated_at))}` : (t.current_latitude ? 'Base station GPS active' : 'GPS not set')}</span>
                  <button type="button" class="button ghost small" data-action="update-repair-team-gps" data-id="${t.id}" style="font-size:0.7rem;padding:3px 7px;">Update GPS</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="verification-toolbar">
        <div class="verification-tabs">${tabMarkup}</div>
        <label class="verification-search">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
          <input type="search" data-filter="dispatchSearch" value="${escapeHtml(state.filters.dispatchSearch || '')}" placeholder="Search crew, barangay, purok, assignment code...">
        </label>
      </div>

      <div class="dispatch-work-grid">
        <div class="dispatch-map-wrap">
          <div class="dispatch-map-head">
            <div style="display:flex;align-items:center;gap:8px;">
              <span>🧭</span>
              <h3>Tactical Dispatch Map &amp; Route Guidance</h3>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              ${selectedAssignment ? `<span style="font-size:0.76rem;background:#dbeafe;color:#1e40af;padding:3px 8px;border-radius:6px;font-weight:700;">Target: Brgy. ${escapeHtml(selectedAssignment.target_barangay)} · ${escapeHtml(selectedAssignment.target_purok || 'Site')}</span>` : ''}
              <button type="button" class="button ghost small" data-action="reset-dispatch-map" style="font-size:0.74rem;padding:4px 8px;">Center Map</button>
            </div>
          </div>
          <div class="dispatch-map-canvas" id="admin-dispatch-map" aria-label="Interactive tactical map for repair dispatch"></div>
        </div>

        <div class="dispatch-queue-wrap">
          ${unassignedReports.length ? `
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;margin-bottom:4px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <strong style="font-size:0.83rem;color:#92400e;display:flex;align-items:center;gap:6px;">
                  <span>⚠️</span> Unassigned Verified Reports (${unassignedReports.length})
                </strong>
                <span style="font-size:0.72rem;color:#b45309;">Needs Crew Dispatch</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto;">
                ${unassignedReports.slice(0, 4).map((r) => `
                  <div style="background:#fff;border:1px solid #fef3c7;border-radius:6px;padding:7px 10px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <div style="font-size:0.78rem;line-height:1.3;">
                      <strong>${escapeHtml(r.report_code)}</strong> · <span>Brgy. ${escapeHtml(r.barangay)}</span>
                      <div style="color:#0284c7;font-weight:600;">📍 ${escapeHtml(r.purok || r.affected_area || 'Specific Purok Not Specified')}</div>
                    </div>
                    ${hasCoordinates(r)
                      ? `<button type="button" class="button small primary" data-action="open-assign-repair-modal" data-id="${r.id}" style="font-size:0.72rem;padding:4px 9px;white-space:nowrap;">Assign Crew</button>`
                      : '<span title="Exact report coordinates are required before dispatch." style="font-size:0.7rem;color:#92400e;">Location pin required</span>'}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
            <span style="font-size:0.84rem;font-weight:750;color:#1e3a8a;">Dispatched Deployments (${filteredAssignments.length})</span>
            <span style="font-size:0.74rem;color:#64748b;">Click card or Navigate to plot live route</span>
          </div>

          ${filteredAssignments.length ? filteredAssignments.map((a) => {
            const isSelected = String(a.id) === String(state.selectedDispatchId);
            const team = teams.find(t => t.id === a.team_id) || {};
            const attachments = a.attachments || [];
            const hasTargetCoordinates = hasCoordinates({ latitude: a.target_latitude, longitude: a.target_longitude });
            if (a.photo_path && !attachments.some(att => att.file_path === a.photo_path)) {
              attachments.unshift({ file_path: a.photo_path, mime_type: 'image/jpeg', original_name: 'Outage Photo' });
            }

            return `
              <article class="dispatch-card ${isSelected ? 'active-target' : ''}" id="assignment-card-${a.id}">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                  <div style="display:flex;align-items:center;gap:7px;">
                    <strong style="font-family:var(--mono);font-size:0.92rem;color:#0369a1;">${escapeHtml(a.assignment_code)}</strong>
                    ${priorityBadge(a.priority)}
                  </div>
                  ${statusBadge(a.status)}
                </div>

                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;display:grid;gap:5px;font-size:0.83rem;">
                  <div>
                    <span style="color:#64748b;">Target Location:</span>
                    <strong style="color:#0f172a;font-size:0.88rem;">Brgy. ${escapeHtml(a.target_barangay || 'Valencia')} · <span style="color:#0284c7;">📍 ${escapeHtml(a.target_purok || a.target_location || 'Area')}</span></strong>
                  </div>
                  <div>
                    <span style="color:#64748b;">GPS Coordinates:</span>
                    <strong style="font-family:var(--mono);font-size:0.79rem;color:#334155;">${hasTargetCoordinates ? `${Number(a.target_latitude).toFixed(5)}, ${Number(a.target_longitude).toFixed(5)}` : 'Exact coordinates unavailable'}</strong>
                  </div>
                  <div>
                    <span style="color:#64748b;">Assigned Crew:</span>
                    <strong style="color:#0369a1;">🚒 ${escapeHtml(a.team_name || team.name || 'Crew')}</strong>
                    <span style="color:#475569;font-size:0.75rem;"> (Lead: ${escapeHtml(a.lead_technician || team.lead_technician || 'Technician')}, 📞 ${escapeHtml(a.contact_number || team.contact_number || '')})</span>
                  </div>
                  ${a.dispatch_notes ? `
                    <div style="margin-top:2px;font-size:0.78rem;color:#475569;background:#fff;padding:6px 8px;border-radius:5px;border:1px solid #e2e8f0;">
                      <strong>Notes:</strong> ${escapeHtml(a.dispatch_notes)}
                    </div>
                  ` : ''}
                  ${a.crew_report ? `
                    <div style="margin-top:2px;font-size:0.78rem;color:#047857;background:#ecfdf5;padding:6px 8px;border-radius:5px;border:1px solid #a7f3d0;">
                      <strong>Restoration Summary:</strong> ${escapeHtml(a.crew_report)}
                    </div>
                  ` : ''}
                </div>

                ${attachments.length ? `
                  <div style="display:flex;align-items:center;justify-content:space-between;background:#f0f9ff;border:1px solid #bae6fd;border-radius:7px;padding:6px 10px;">
                    <div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:#0369a1;font-weight:650;">
                      <span>📷</span> <span>Attached Evidence (${attachments.length})</span>
                    </div>
                    <button type="button" class="button small ghost" data-action="dispatch-view-evidence" data-id="${a.report_id || a.id}" style="font-size:0.73rem;padding:3px 7px;">
                      View Photos / Video
                    </button>
                  </div>
                ` : ''}

                <div class="dispatch-actions-bar">
                  ${hasTargetCoordinates
                    ? `<button type="button" class="dispatch-btn route" data-action="focus-repair-route" data-id="${a.id}" title="Calculate &amp; render road route to site">🧭 <span>Navigate to Site</span></button>`
                    : '<button type="button" class="dispatch-btn route" disabled title="Exact target coordinates are unavailable.">📍 <span>Route unavailable</span></button>'}
                  ${a.status === 'Dispatched' ? `
                    <button type="button" class="dispatch-btn status-step" data-action="dispatch-update-status" data-id="${a.id}" data-status="En Route" style="background:#e0f2fe;color:#0369a1;border-color:#7dd3fc;">
                      🚀 Mark En Route
                    </button>
                  ` : ''}
                  ${['Dispatched', 'En Route'].includes(a.status) ? `
                    <button type="button" class="dispatch-btn status-step" data-action="dispatch-update-status" data-id="${a.id}" data-status="Arrived On Site" style="background:#fef3c7;color:#b45309;border-color:#fcd34d;">
                      📍 Arrived On Site
                    </button>
                  ` : ''}
                  ${['Dispatched', 'En Route', 'Arrived On Site'].includes(a.status) ? `
                    <button type="button" class="dispatch-btn status-step" data-action="dispatch-update-status" data-id="${a.id}" data-status="In Progress" style="background:#f3e8ff;color:#7e22ce;border-color:#d8b4fe;">
                      ⚡ In Progress
                    </button>
                  ` : ''}
                  ${a.status !== 'Resolved' ? `
                    <button type="button" class="dispatch-btn resolve" data-action="dispatch-update-status" data-id="${a.id}" data-status="Resolved">
                      ✅ Mark Resolved
                    </button>
                  ` : ''}
                </div>
              </article>
            `;
          }).join('') : `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:32px 16px;text-align:center;color:#64748b;">
              <span style="font-size:2rem;display:block;margin-bottom:8px;">🚒</span>
              <strong>No dispatch assignments match this filter.</strong>
              <p style="font-size:0.8rem;margin:6px 0 0 0;">Select "All Dispatches" or dispatch a repair crew to an open report.</p>
            </div>
          `}
        </div>
      </div>
    </section>
  `);

  await loadAdminMapLibrary();
  const mapElement = document.getElementById('admin-dispatch-map');
  if (!mapElement?.isConnected) return;

  const mapCenter = [8.1250, 125.0933];
  const map = L.map(mapElement, {
    zoomControl: false,
    minZoom: 11,
    maxZoom: 18,
  }).setView(mapCenter, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  state.adminDispatchMap = map;

  teams.forEach((t) => {
    if (!t.current_latitude || !t.current_longitude) return;
    const isAvail = t.status === 'Available';
    const truckIcon = L.divIcon({
      className: 'crew-truck-marker',
      html: `<div style="background:${isAvail ? '#059669' : '#0284c7'};color:#fff;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:15px;border:2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.35);" title="${escapeHtml(t.name)}">🚒</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    L.marker([t.current_latitude, t.current_longitude], { icon: truckIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:sans-serif;font-size:0.83rem;">
          <strong style="color:#0f172a;font-size:0.9rem;">🚒 ${escapeHtml(t.name)}</strong><br>
          <span style="color:#64748b;">Vehicle: ${escapeHtml(t.vehicle_type)}</span><br>
          <span style="color:#64748b;">Lead: ${escapeHtml(t.lead_technician)} (📞 ${escapeHtml(t.contact_number)})</span><br>
          <span style="color:#64748b;">Base: ${escapeHtml(t.base_station)}</span><br>
          <div style="margin-top:6px;font-weight:700;color:${isAvail ? '#059669' : '#0284c7'};">Status: ${escapeHtml(t.status)}</div>
        </div>
      `);
  });

  assignments.forEach((a) => {
    if (!a.target_latitude || !a.target_longitude) return;
    const isDone = a.status === 'Resolved';
    const pinIcon = L.divIcon({
      className: 'outage-target-pin',
      html: `<div style="background:${isDone ? '#10b981' : '#e11d48'};color:#fff;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:14px;border:2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.35);" title="Target: ${escapeHtml(a.target_barangay)}">⚡</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    L.marker([a.target_latitude, a.target_longitude], { icon: pinIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:sans-serif;font-size:0.83rem;">
          <strong style="color:#b91c1c;">⚡ ${escapeHtml(a.assignment_code)}</strong><br>
          <strong>Brgy. ${escapeHtml(a.target_barangay)}</strong><br>
          <span style="color:#0284c7;font-weight:700;">📍 ${escapeHtml(a.target_purok || a.target_location || 'Area')}</span><br>
          <span style="color:#64748b;">Crew: ${escapeHtml(a.team_name || 'Assigned')}</span><br>
          <span style="font-weight:700;">Status: ${escapeHtml(a.status)}</span><br>
          <button type="button" class="button small primary" data-action="focus-repair-route" data-id="${a.id}" style="margin-top:8px;width:100%;font-size:0.75rem;padding:4px 8px;">
            🧭 Navigate Here
          </button>
        </div>
      `);
  });

  window.drawDispatchRoute = async (assignmentId) => {
    const a = assignments.find((item) => String(item.id) === String(assignmentId));
    if (!a || !a.target_latitude || !a.target_longitude) return;
    const team = teams.find((t) => t.id === a.team_id);
    const origin = (team && team.current_latitude && team.current_longitude)
      ? {
          latitude: Number(team.current_latitude),
          longitude: Number(team.current_longitude),
          label: `${team.name} · ${team.location_updated_at ? 'GPS as of ' + formatDateTime(team.location_updated_at) : (team.base_station || 'Base')}`
        }
      : VALENCIA_HQ_COORDINATES;

    await renderRouteGuideOnMap({
      map,
      destLat: Number(a.target_latitude),
      destLng: Number(a.target_longitude),
      destLabel: `Brgy. ${a.target_barangay} · ${a.target_purok || 'Incident Site'}`,
      origin,
      container: mapElement.parentElement
    });
  };

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
  const verificationIncidents = incidents.filter((item) => ['Reported', 'Under Verification'].includes(item.status));
  const openReports = reports.filter((item) => !item.incident_id && !['Rejected', 'Duplicate', 'Resolved'].includes(item.status));
  const resolvedIncidents = incidents.filter((item) => ['Restored', 'Closed', 'Resolved'].includes(item.status));
  const heatIncidents = [...activeIncidents, ...verificationIncidents];
  const heatReports = openReports;
  const heatSignals = [...heatIncidents, ...heatReports];
  const mapCenter = [Number(mapSettings.latitude) || 7.906, Number(mapSettings.longitude) || 125.094];
  const marker = (color, radius = 9) => `<span class="map-legend-marker" style="--marker-color:${color};--marker-size:${radius * 2}px"></span>`;
  const countWithCoordinates = (records) => records.filter((item) => hasCoordinates(item)
    || (!item.report_code && barangays.some((center) => center.name === item.barangay && hasCoordinates(center)))).length;

  const barangayCounts = {};
  heatSignals.forEach((item) => {
    const hasMapLocation = hasCoordinates(item)
      || (!item.report_code && barangays.some((center) => center.name === item.barangay && hasCoordinates(center)));
    if (item.barangay && hasMapLocation) {
      barangayCounts[item.barangay] = (barangayCounts[item.barangay] || 0) + 1;
    }
  });
  const topHotspots = Object.entries(barangayCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  adminShell(`<section class="power-map-page">
    <header class="power-map-heading"><div><p class="power-map-eyebrow">OPERATIONS</p><h2>Power Outage Map &amp; GIS Hotspots</h2></div><button type="button" class="power-map-close" data-page="dashboard" aria-label="Close map" title="Back to dashboard">×</button></header>
    
    <!-- 2030 Smart Grid SCADA Strip -->
    <div class="scada-telemetry-strip" style="margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.12);">
      <div class="scada-stat">
        <span class="scada-led ${activeIncidents.length ? 'pulse' : ''}"></span>
        <span class="scada-label">SCADA GRID:</span>
        <span class="scada-val ${activeIncidents.length ? 'warn' : 'ok'}">${activeIncidents.length ? 'DEGRADED (FAULT)' : 'NOMINAL 100%'}</span>
      </div>
      <div class="scada-stat">
        <span class="scada-label">LOAD:</span>
        <span class="scada-val cyan">68.4 MW / 75.0 MW</span>
      </div>
      <div class="scada-stat">
        <span class="scada-label">FREQ:</span>
        <span class="scada-val">60.01 Hz</span>
      </div>
      <div class="scada-stat">
        <span class="scada-label">FEEDERS:</span>
        <span class="scada-val ${activeIncidents.length ? 'warn' : 'cyan'}">3/4 OK · 1 FAULT (FDR-03)</span>
      </div>
      <div class="scada-stat">
        <span class="scada-label">NODES:</span>
        <span class="scada-val cyan">${barangays.length}/31 BGRYS SYNCED</span>
      </div>
      <div class="scada-stat">
        <span class="scada-label">AI ENGINE:</span>
        <span class="scada-val cyan">OPTIMAL (99.4%)</span>
      </div>
    </div>

    <div class="power-map-layout">
      <div class="power-map-canvas-wrap">
        <div class="admin-map ${state.adminCyberMode ? 'cyber-mode' : ''}" id="admin-outage-map" aria-label="Interactive power outage map of Valencia City"></div>
        <div class="power-map-controls" aria-label="Map navigation controls">
          <button type="button" data-map-home aria-label="Return to Valencia City extent" title="Return to Valencia City">⌂</button>
          <button type="button" data-map-geolocate aria-label="Show my current location" title="Show my location">◎</button>
          <button type="button" data-map-toggle-heat aria-label="Toggle Outage Heatmap" title="Toggle Outage Heatmap" class="${layers.heatmap ? 'active' : ''}">🔥</button>
          <button type="button" class="map-control-route" data-action="toggle-admin-route" aria-label="Toggle Blue Route Guide" title="Toggle Blue Route Guide">🧭</button>
          <button type="button" class="map-control-cyber ${state.adminCyberMode ? 'active' : ''}" data-action="toggle-admin-cyber" aria-label="Toggle Cyber 2030 Dark Matrix" title="Cyber 2030 Dark Mode">🌌</button>
          <button type="button" class="map-control-feeders ${state.adminFeedersMode !== false ? 'active' : ''}" data-action="toggle-admin-feeders" aria-label="Toggle Smart Grid Feeder Lines" title="Toggle 13.2kV Distribution Feeders">⚡</button>
        </div>
        <label class="power-map-focus"><span>⌖</span><select data-map-focus aria-label="Focus map on a barangay"><option value="">Find a barangay</option>${barangays.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join('')}</select></label>
      </div>
      <aside class="power-map-sidebar">
        <section class="power-map-panel">
          <h3>Legend</h3>
          <ul class="power-map-legend">
            <li>${marker('#e5484d')}<span>Active Outage</span><b>${activeIncidents.length}</b></li>
            <li>${marker('#147bd1')}<span>Scheduled Outage</span><b>${scheduled.length}</b></li>
            <li>${marker('#f0a629')}<span>Open Reports &amp; Verification</span><b>${countWithCoordinates([...openReports, ...verificationIncidents])}</b></li>
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
              <small>Current incidents and open unlinked reports only; scheduled and resolved outages are excluded.</small>
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
          <h3>Layers &amp; Smart Grid</h3>
          <label class="map-layer-option map-layer-option-feeders">
            <input type="checkbox" data-action="toggle-admin-feeders" ${state.adminFeedersMode !== false ? 'checked' : ''}>
            <span>⚡ 13.2kV Feeders (Pulsing)</span>
            <b class="heatmap-badge">2030</b>
          </label>
          <label class="map-layer-option map-layer-option-cyber">
            <input type="checkbox" data-action="toggle-admin-cyber" ${state.adminCyberMode ? 'checked' : ''}>
            <span>🌌 Cyber 2030 Dark Matrix</span>
            <b class="heatmap-badge">Sci-Fi</b>
          </label>
          <label class="map-layer-option map-layer-option-heatmap">
            <input type="checkbox" data-map-layer="heatmap" ${layers.heatmap ? 'checked' : ''}>
            <span>🔥 Outage Density Heatmap</span>
            <b class="heatmap-badge">Current</b>
          </label>
          <label class="map-layer-option"><input type="checkbox" data-map-layer="active" ${layers.active ? 'checked' : ''}><span>Active Outages</span><b>${countWithCoordinates(activeIncidents)}</b></label>
          <label class="map-layer-option"><input type="checkbox" data-map-layer="verification" ${layers.verification ? 'checked' : ''}><span>Open Reports &amp; Verification</span><b>${countWithCoordinates([...openReports, ...verificationIncidents])}</b></label>
          <label class="map-layer-option"><input type="checkbox" data-map-layer="resolved" ${layers.resolved ? 'checked' : ''}><span>Resolved Incidents</span><b>${countWithCoordinates(resolvedIncidents)}</b></label>
          <label class="map-layer-option"><input type="checkbox" data-map-layer="scheduled" ${layers.scheduled ? 'checked' : ''}><span>Scheduled Outages</span><b>${countWithCoordinates(scheduled)}</b></label>
          <label class="map-layer-option"><input type="checkbox" data-map-layer="barangays" ${layers.barangays ? 'checked' : ''}><span>Barangay Centers</span><b>${barangays.length}</b></label>
          <label class="map-layer-option"><input type="checkbox" data-map-layer="roads" ${layers.roads ? 'checked' : ''}><span>Roads</span></label>
          <label class="map-layer-option"><input type="checkbox" data-map-street-features ${layers.rivers ? 'checked' : ''}><span>Street Map</span></label>
          <label class="map-layer-option"><input type="checkbox" data-map-satellite ${layers.satellite ? 'checked' : ''}><span>Satellite View</span></label>
          <p class="map-boundary-note">Pins open individual outage or report details and dispatch actions. Heatmap shows current incidents and open unlinked reports; scheduled and resolved outages are excluded. Street Map uses labeled roads and places, not 360-degree Street View; Satellite View adds aerial context for field response. Official barangay boundary polygons are not configured; barangay centers are shown instead.</p>
        </section>
        ${topHotspots.length ? `
        <section class="power-map-panel power-map-hotspots-panel">
          <h3>🔥 Top Outage Hotspots</h3>
          <ul class="power-map-legend" style="gap:7px;">
            ${topHotspots.map(([brgy, count], idx) => `
              <li>
                <button type="button" class="map-hotspot-row" data-map-hotspot="${escapeHtml(brgy)}">
                <span style="font-size:0.83rem;font-weight:600;"><span style="color:#e5484d;font-weight:800;margin-right:6px;">#${idx + 1}</span>${escapeHtml(brgy)}</span>
                <b style="font-size:0.78rem;background:#f1f5f9;padding:2px 7px;border-radius:6px;color:#1e293b;">${count} active record${count === 1 ? '' : 's'}</b>
                </button>
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
  state.adminOutageMapInstance = map;
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
    if (item.report_code) return null;
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
  verificationIncidents.forEach((item) => addHeatItem(item, 0.75));
  heatReports.forEach((item) => addHeatItem(item, 0.75));

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
  if (state.adminFeedersMode !== false) {
    renderElectricFeedersOnMap(map);
  }
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
      <div class="map-popup-card holographic">
        <div class="map-popup-header">
          <span class="scada-telemetry-badge">${escapeHtml(item.incident_code || 'OUTAGE')}</span>
          <span class="map-popup-badge" style="${adminSevStyle}">${escapeHtml(adminSev)}</span>
        </div>
        <h4 class="map-popup-title">⚡ ${escapeHtml(item.title)}</h4>
        <div class="map-popup-meta">
          <div class="map-popup-row"><span class="map-popup-icon">📍</span><span><strong>${escapeHtml(item.barangay)}</strong></span></div>
          <div class="map-popup-row"><span class="map-popup-icon">⚡</span><span>${escapeHtml(item.incident_type || 'Outage Incident')}</span></div>
          <div class="map-popup-row"><span class="map-popup-icon">⏳</span><span><strong>AI Predicted ETR:</strong> <span class="map-popup-etr" style="color:#38bdf8;">${escapeHtml(adminEtr)}</span></span></div>
          <div class="map-popup-row"><span class="map-popup-icon">🔄</span><span>Status: <strong style="color:${category.color}">${escapeHtml(item.status)}</strong></span></div>
        </div>
        <button type="button" class="map-popup-btn route-btn" data-action="show-admin-route" data-lat="${coordinates[0]}" data-lng="${coordinates[1]}" data-label="${escapeHtml(item.title)} (${escapeHtml(item.barangay)})">🧭 Dispatch Route Guide</button>
        <button type="button" class="map-popup-btn sim-btn" data-action="sim-crew-direct" data-lat="${coordinates[0]}" data-lng="${coordinates[1]}" data-label="${escapeHtml(item.title)}">🚀 Simulate Crew Dispatch (GPS)</button>
        <button type="button" class="map-popup-btn" style="background:#334155;" data-action="view-incident-details" data-id="${item.id}">Inspect Incident Record ›</button>
      </div>
    `;

    if (category.label === 'Active Outage') {
      const sonarIcon = L.divIcon({
        className: 'sonar-marker-wrap',
        html: `
          <div class="sonar-ring"></div>
          <div class="sonar-ring delay-1"></div>
          <div class="sonar-ring delay-2"></div>
          <div class="sonar-pin-center" style="background:#ef4444;"></div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      L.marker(coordinates, { icon: sonarIcon, pane: 'markerPane' })
        .addTo(category.layer).bindPopup(adminPopup, { maxWidth: 300 });
    } else {
      L.circleMarker(coordinates, { pane: 'markerPane', radius: 9, color: '#fff', fillColor: category.color, fillOpacity: .98, weight: 2.5 })
        .addTo(category.layer).bindPopup(adminPopup, { maxWidth: 280 });
    }
  });
  openReports.forEach((report) => {
    const coordinates = locationFor(report);
    if (coordinates) {
      const repPopup = `
        <div class="map-popup-card">
          <strong>${escapeHtml(report.report_code)}</strong>
          <div>${escapeHtml(report.barangay)} · ${escapeHtml(report.status)}</div>
          <small class="muted">Verification: ${escapeHtml(report.verification_status || 'Pending')} · Repair: ${escapeHtml(report.repair_status || 'Not assigned')}</small>
          <small class="muted">${escapeHtml(report.description || '')}</small>
          <button type="button" class="map-popup-btn route-btn" data-action="show-admin-route" data-lat="${coordinates[0]}" data-lng="${coordinates[1]}" data-label="Report ${escapeHtml(report.report_code)} (${escapeHtml(report.barangay)})">🧭 Dispatch Route Guide</button>
          <button type="button" class="map-popup-btn" style="background:#334155;" data-action="view-report" data-id="${report.id}">Inspect Report Record ›</button>
          ${['Submitted', 'Under Review', 'Under Verification'].includes(report.status)
            ? `<button type="button" class="map-popup-btn" data-action="verify-report" data-id="${report.id}">Verify Report</button>` : ''}
        </div>
      `;
      L.circleMarker(coordinates, { pane: 'markerPane', radius: 8, color: '#fff', fillColor: '#f0a629', fillOpacity: .98, weight: 2.5 })
        .addTo(layerGroups.verification).bindPopup(repPopup, { maxWidth: 260 });
    }
  });
  scheduled.forEach((item) => {
    const coordinates = locationFor(item);
    if (coordinates) {
      const schedPopup = `
        <div class="map-popup-card">
          <strong>${escapeHtml(item.schedule_code)}</strong>
          <div>${escapeHtml(item.title)}</div>
          <small class="muted">${escapeHtml(item.barangay)} · ${escapeHtml(item.status)}</small>
          <button type="button" class="map-popup-btn route-btn" data-action="show-admin-route" data-lat="${coordinates[0]}" data-lng="${coordinates[1]}" data-label="${escapeHtml(item.title)} (${escapeHtml(item.barangay)})">🧭 Route Guide</button>
        </div>
      `;
      L.circleMarker(coordinates, { pane: 'markerPane', radius: 8, color: '#fff', fillColor: '#147bd1', fillOpacity: .98, weight: 2.5 })
        .addTo(layerGroups.scheduled).bindPopup(schedPopup, { maxWidth: 260 });
    }
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
  document.querySelectorAll('[data-map-hotspot]').forEach((button) => {
    button.addEventListener('click', () => {
      const barangay = barangays.find((item) => item.name === button.dataset.mapHotspot);
      if (barangay && hasCoordinates(barangay)) {
        map.flyTo([Number(barangay.latitude), Number(barangay.longitude)], 15, { duration: .6 });
      } else if (barangay) {
        setToast(`Map coordinates are not set for ${barangay.name}.`);
      }
    });
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

  // Automatically activate the blue dispatch route guide for primary active incident immediately on load!
  const primaryIncident = activeIncidents[0] || incidents[0];
  if (primaryIncident) {
    const coords = locationFor(primaryIncident);
    if (coords) {
      setTimeout(() => {
        const container = document.querySelector('.power-map-canvas-wrap');
        renderRouteGuideOnMap({
          map,
          destLat: coords[0],
          destLng: coords[1],
          destLabel: `${primaryIncident.title} (${primaryIncident.barangay || 'Valencia'})`,
          container,
          origin: VALENCIA_HQ_COORDINATES
        });
      }, 400);
    }
  }
}

async function renderAdminNotifications() {
  if (state.adminNotificationSection === 'announcements') return renderAdminAnnouncements();
  const { notifications } = await api('/api/notifications');
  state.adminNotifications = notifications;
  const filter = state.adminNotificationFilter || 'All';
  const category = state.adminNotificationCategory || 'all';
  const search = String(state.filters.adminNotificationSearch || '').trim().toLowerCase();
  const visible = notifications.filter((notice) => (filter === 'All' || (filter === 'Unread' ? !notice.read : Boolean(notice.read)))
    && (category === 'all' || adminNotificationCategory(notice) === category)
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
  const categoryTabs = [
    ['all', 'All updates'],
    ['reports', 'Reports'],
    ['outages', 'Outage updates'],
    ['verification', 'Verification'],
    ['repairs', 'Dispatch / repair'],
    ['restoration', 'Restoration'],
    ['system', 'System'],
  ];
  adminShell(`<section class="admin-notifications-page">
    <header class="admin-notifications-heading"><h2>Notifications</h2>${canManage() ? `<button type="button" class="notification-create-button" data-action="new-notification"><span aria-hidden="true">+</span>Create Notification</button>` : ''}</header>
    <div class="notification-category-tabs" role="tablist" aria-label="Notification categories">
      <button type="button" class="notification-category-tab active" role="tab" aria-selected="true" data-action="admin-notification-section" data-value="notifications">System / Report Notifications</button>
      <button type="button" class="notification-category-tab" role="tab" aria-selected="false" data-action="admin-notification-section" data-value="announcements">Announcements</button>
    </div>
    <div class="notifications-controls">
      <div class="notification-filter-tabs" role="tablist" aria-label="Notification status">${Object.keys(counts).map((item) => `<button type="button" class="notification-filter-tab ${filter === item ? 'active' : ''}" role="tab" aria-selected="${filter === item}" data-action="filter-admin-notifications" data-value="${item}">${item}<span>${counts[item]}</span></button>`).join('')}</div>
      <div class="notification-detail-category-tabs" role="tablist" aria-label="Notification categories">${categoryTabs.map(([key, label]) => {
        const count = key === 'all' ? notifications.length : notifications.filter((notice) => adminNotificationCategory(notice) === key).length;
        return `<button type="button" class="notification-detail-category-tab ${category === key ? 'active' : ''}" role="tab" aria-selected="${category === key}" data-action="filter-admin-notification-category" data-value="${key}">${label}<span>${count}</span></button>`;
      }).join('')}</div>
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
    <div class="notification-category-tabs" role="tablist" aria-label="Notification categories">
      <button type="button" class="notification-category-tab" role="tab" aria-selected="false" data-action="admin-notification-section" data-value="notifications">System / Report Notifications</button>
      <button type="button" class="notification-category-tab active" role="tab" aria-selected="true" data-action="admin-notification-section" data-value="announcements">Announcements</button>
    </div>
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
    <section class="panel analytics-feedback-panel" style="margin-top:20px;padding:20px;border-radius:12px;background:#fff;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
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
      <button type="button" class="button danger small" data-action="clear-audit-logs" style="margin-left:6px;padding:6px 12px;font-size:0.82rem;">Clear Logs</button>
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
