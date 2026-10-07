/* Community / User mobile portal */

const MOBILE_TABS = [
  {
    key: 'home',
    label: 'Home',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>',
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 14l2 2 4-4"/></svg>',
  },
  {
    key: 'map',
    label: 'Map',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  },
];

function weatherDescription(code) {
  if (code === 0) return 'Clear sky';
  if ([1, 2].includes(code)) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Weather unavailable';
}

let leafletLoadPromise;
function ensureLeaflet() {
  if (window.L && typeof window.L.heatLayer === 'function') return Promise.resolve();
  if (leafletLoadPromise) return leafletLoadPromise;
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/vendor/leaflet/leaflet.css';
  const styleReady = new Promise((resolve, reject) => {
    stylesheet.onload = resolve;
    stylesheet.onerror = () => reject(new Error('The map styles could not be loaded.'));
  });
  document.head.append(stylesheet);

  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.append(script);
  });

  leafletLoadPromise = styleReady
    .then(() => (window.L ? Promise.resolve() : loadScript('/vendor/leaflet/leaflet.js')))
    .then(() => (typeof window.L?.heatLayer === 'function' ? Promise.resolve() : loadScript('/assets/leaflet-heat.js').catch(() => loadScript('https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js'))))
    .then(() => undefined);

  return leafletLoadPromise;
}

const WEATHER_CACHE_KEY = 'powerwatch.weather.valencia';
const WEATHER_CACHE_TTL = 15 * 60 * 1000;
const NOTIFICATION_PREFERENCES_KEY = 'powerwatch.notification-preferences';
const DEFAULT_NOTIFICATION_PREFERENCES = {
  reportUpdates: true,
  outageAlerts: true,
  scheduledOutages: true,
  announcements: true,
  general: true,
};

function readNotificationPreferences() {
  try {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(localStorage.getItem(NOTIFICATION_PREFERENCES_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

function readWeatherCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(WEATHER_CACHE_KEY) || 'null');
    return cached?.data?.current && Number.isFinite(cached.data.current.temperature_2m) ? cached : null;
  } catch {
    return null;
  }
}

function weatherWidgetMarkup(weather, loading = false) {
  const code = weather?.current?.weather_code;
  const icon = weather ? ([95, 96, 99].includes(code) ? '⛈' : [61, 63, 65, 80, 81, 82].includes(code) ? '🌧' : [1, 2, 3].includes(code) ? '⛅' : '☀') : '☁';
  const temperature = weather ? `${Math.round(weather.current.temperature_2m)}°C` : '—°C';
  const description = weather ? weatherDescription(code) : loading ? 'Loading local weather…' : 'Weather unavailable';
  return `<span class="mobile-weather-icon">${icon}</span><span class="mobile-weather-copy"><strong>${temperature}</strong><span>Valencia City · ${description}</span><small>Weather by Open-Meteo</small></span>`;
}

async function requestCurrentWeather() {
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=7.906&longitude=125.094&current=temperature_2m%2Cweather_code&timezone=Asia%2FManila', {
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(6500) : undefined,
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Number.isFinite(data.current?.temperature_2m)) return null;
    try {
      sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
    } catch {
      return data;
    }
    return data;
  } catch {
    return null;
  }
}

function notificationTypeIcon(type) {
  switch (type) {
    case 'incident':
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';
    case 'report':
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 14l2 2 4-4"/></svg>';
    case 'scheduled':
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
    case 'announcement':
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11v3a2 2 0 002 2h2l3 5h3l-2-7 8 3V7l-8 3H5a2 2 0 00-2 1z"></path></svg>';
    default:
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>';
  }
}

function mobileNotificationBell() {
  const count = Number(state.unread || 0);
  const badgeLabel = count > 99 ? '99+' : String(count);
  return `<button type="button" class="mobile-bell" data-action="toggle-mobile-notification-panel" aria-label="Notifications${count ? `, ${count} unread` : ''}" aria-haspopup="dialog" aria-expanded="${Boolean(state.mobileNotificationPanelOpen)}" aria-controls="mobile-notification-panel" title="Notifications">
    <svg class="mobile-bell-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
    ${count > 0 ? `<span class="mobile-bell-dot" aria-hidden="true">${badgeLabel}</span>` : ''}
  </button>`;
}

function mobileInstallButton() {
  const installed = navigator.standalone === true
    || window.matchMedia?.('(display-mode: standalone)').matches
    || document.documentElement.classList.contains('pwa-installed');
  if (installed) return '';
  return `<button type="button" class="mobile-install-button" data-action="install-app" aria-label="Install Valencia PowerWatch" title="Install Valencia PowerWatch">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 18v3h14v-3"></path>
    </svg>
    <span>Install</span>
  </button>`;
}

function mobileNotificationPanelMarkup() {
  if (!state.mobileNotificationPanelOpen) return '';
  const notices = (state.mobileNotificationPreview || []).slice(0, 6);
  const unreadCount = Number(state.unread || 0);
  return `
    <div class="mobile-notification-backdrop" data-action="close-mobile-notification-panel" aria-hidden="true"></div>
    <section class="mobile-notification-panel" id="mobile-notification-panel" role="dialog" aria-modal="true" aria-label="Recent notifications">
      <header class="mobile-notification-panel-head">
        <div class="notif-panel-title-wrap">
          <div class="notif-panel-title-row">
            <strong>${t('notifications', 'Notifications')}</strong>
            ${unreadCount > 0 ? `<span class="notif-badge-pill">${unreadCount} new</span>` : '<span class="notif-badge-pill notif-badge-done">All read</span>'}
          </div>
          <span class="notif-panel-sub">${unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'You are all caught up'}</span>
        </div>
        <div class="notif-panel-head-actions">
          ${unreadCount > 0 ? '<button type="button" class="mobile-notification-mark-all" data-action="mark-all-read" title="Mark all notifications as read">Mark all read</button>' : ''}
          <button type="button" class="mobile-notification-panel-close" data-action="close-mobile-notification-panel" aria-label="Close notifications" title="Close">✕</button>
        </div>
      </header>
      <div class="mobile-notification-panel-list" aria-live="polite">
        ${notices.length ? notices.map((notice) => `
          <article class="mobile-notification-preview ${notice.read ? 'read' : 'unread'}">
            <span class="mobile-notif-type-icon ${escapeHtml(notice.type || 'general')}">
              ${notificationTypeIcon(notice.type)}
            </span>
            <button type="button" class="mobile-notification-preview-open" data-action="view-notification" data-id="${notice.id}">
              <div class="notif-item-top">
                <strong class="notif-item-title">${escapeHtml(notice.title)}</strong>
                <time class="notif-item-time">${escapeHtml(formatRelativeTime(notice.created_at))}</time>
              </div>
              <span class="notif-item-msg">${escapeHtml(notice.message || '')}</span>
            </button>
            <div class="notif-item-actions">
              ${!notice.read ? `
                <button type="button" class="mobile-notification-preview-read" data-action="mark-mobile-notification-read" data-id="${notice.id}" aria-label="Mark ${escapeHtml(notice.title)} as read" title="Mark as read">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
              ` : `
                <span class="notif-item-read-icon" title="Read" aria-hidden="true">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </span>
              `}
            </div>
          </article>
        `).join('') : `
          <div class="mobile-notification-panel-empty">
            <div class="notif-empty-icon">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <strong>No notifications yet</strong>
            <p>You'll see alerts, report verification updates, and advisories here.</p>
          </div>
        `}
      </div>
      <footer class="mobile-notification-panel-footer">
        <button type="button" class="notif-view-all-link" data-action="view-all-mobile-notifications">
          <span>View all notifications</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
        <button type="button" class="notif-settings-link" data-action="open-notification-settings" title="Notification Preferences" aria-label="Notification Preferences">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
      </footer>
    </section>
  `;
}

function mobileShell(content, { activeTab = state.mobileTab, showTabs = true, homeHeader = false, subpageHeader = null } = {}) {
  const info = state.config.system_info || {};
  const unread = state.unread;
  const user = state.user || {};
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning,' : hour < 18 ? 'Good afternoon,' : 'Good evening,';

  const statusBarMarkup = (homeHeader || subpageHeader) ? `
    <div class="mobile-phone-status-bar">
      <span class="phone-time">9:41</span>
      <div class="phone-status-icons" aria-hidden="true">
        <svg class="phone-status-icon" width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <rect x="0" y="8" width="2.8" height="3" rx="0.5"/>
          <rect x="4.5" y="5.5" width="2.8" height="5.5" rx="0.5"/>
          <rect x="9" y="3" width="2.8" height="8" rx="0.5"/>
          <rect x="13.5" y="0.5" width="2.8" height="10.5" rx="0.5"/>
        </svg>
        <svg class="phone-status-icon" width="15" height="11" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C7.31 3 3.07 4.9 0 7.98L12 21 24 7.98C20.93 4.9 16.69 3 12 3z"/>
        </svg>
        <svg class="phone-status-icon" width="21" height="11" viewBox="0 0 24 12" fill="none">
          <rect x="0.8" y="0.8" width="19.4" height="10.4" rx="2.8" stroke="currentColor" stroke-width="1.4"/>
          <rect x="2.5" y="2.5" width="13" height="7" rx="1.5" fill="currentColor"/>
          <path d="M22 4.2v3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </div>
    </div>` : '';

  let headerMarkup = '';
  if (subpageHeader) {
    headerMarkup = `
      <header class="mobile-header mobile-subpage-header">
        <button type="button" class="mobile-header-back" data-action="${subpageHeader.backAction}" aria-label="Go back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 class="mobile-header-title">${escapeHtml(subpageHeader.title)}</h1>
        <div class="mobile-header-right">${subpageHeader.rightAction || `${mobileInstallButton()}${mobileNotificationBell()}`}</div>
        ${mobileNotificationPanelMarkup()}
      </header>`;
  } else if (homeHeader) {
    headerMarkup = `
      <header class="mobile-header mobile-home-header">
        <div class="mobile-home-identity">
          ${user.profile_photo_path ? `<img class="dashboard-avatar" src="${escapeHtml(user.profile_photo_path)}" alt="">` : `<span class="dashboard-avatar">${escapeHtml((user.full_name || '?').charAt(0).toUpperCase())}</span>`}
          <span class="mobile-home-greeting"><span>${greeting}</span><strong>${escapeHtml(user.full_name || 'Resident')}</strong></span>
        </div>
        <div class="mobile-header-actions">
          ${mobileInstallButton()}
          <button type="button" class="mobile-lang-chip" data-action="toggle-mobile-language" title="English / Sinugbuanong Binisaya">
            <span>${getLanguage() === 'ceb' ? '🇵🇭 CEB' : '🇺🇸 EN'}</span>
          </button>
          ${mobileNotificationBell()}
        </div>
        ${mobileNotificationPanelMarkup()}
      </header>`;
  } else {
    headerMarkup = `
      <header class="mobile-header">
        <div class="mobile-header-brand">
          ${info.logoData ? `<img class="mobile-logo" src="${escapeHtml(info.logoData)}" alt="System logo">` : '<img class="mobile-logo" src="/assets/powerwatch-logo.svg" alt="Valencia PowerWatch logo">'}
          <div><strong>Valencia</strong><b>PowerWatch</b></div>
        </div>
        <div class="mobile-header-actions">
          ${mobileInstallButton()}
          <button type="button" class="mobile-lang-chip" data-action="toggle-mobile-language" title="English / Sinugbuanong Binisaya">
            <span>${getLanguage() === 'ceb' ? '🇵🇭 CEB' : '🇺🇸 EN'}</span>
          </button>
          ${mobileNotificationBell()}
        </div>
        ${mobileNotificationPanelMarkup()}
      </header>`;
  }

  app.innerHTML = `<div class="mobile-shell">
    ${!navigator.onLine ? '<div class="offline-banner" id="mobile-offline-banner"><span>Offline: reports are not saved or sent. Reconnect before submitting.</span></div>' : ''}
    ${statusBarMarkup}
    ${headerMarkup}
    <main class="mobile-content ${subpageHeader ? 'mobile-content-subpage' : ''}" id="mobile-content">${content}</main>
    ${showTabs ? `<nav class="mobile-tabs">${MOBILE_TABS.map((tab) => `<button class="mobile-tab ${activeTab === tab.key ? 'active' : ''}" data-mobile-tab="${tab.key}">
      <span class="mobile-tab-icon">${tab.icon}</span><span>${escapeHtml(t(tab.key, tab.label))}</span>
    </button>`).join('')}</nav>` : ''}
    ${user.role === 'resident' ? `<section class="powerwatch-chatbot" id="powerwatch-chatbot">
      <section class="powerwatch-chat-panel" id="powerwatch-chat-panel" role="dialog" aria-label="PowerWatch assistant" aria-modal="false" hidden>
        <header class="powerwatch-chat-header">
          <span class="powerwatch-chat-avatar" aria-hidden="true">⚡</span>
          <div><strong>PowerWatch Assistant</strong><span>System help and current information</span></div>
          <button type="button" class="powerwatch-chat-close" data-chatbot-action="close" aria-label="Close assistant">×</button>
        </header>
        <div class="powerwatch-chat-messages" id="powerwatch-chat-messages" aria-live="polite" aria-relevant="additions text"></div>
        <div class="powerwatch-chat-prompts" id="powerwatch-chat-prompts">
          <button type="button" data-chatbot-prompt="How do I report an outage?">Report an outage</button>
          <button type="button" data-chatbot-prompt="How do I track my report?">Track my report</button>
          <button type="button" data-chatbot-prompt="Are there current outages or schedules?">Current outages</button>
        </div>
        <form class="powerwatch-chat-form" id="powerwatch-chat-form">
          <label class="visually-hidden" for="powerwatch-chat-input">Ask the PowerWatch assistant</label>
          <textarea id="powerwatch-chat-input" name="question" rows="1" maxlength="500" placeholder="Ask about reports, outages, or the app…" required></textarea>
          <button type="submit" aria-label="Send message">Send</button>
        </form>
        <p class="powerwatch-chat-disclaimer">System answers use PowerWatch records and help guides. For emergencies, contact the proper local service.</p>
      </section>
      <button type="button" class="powerwatch-chat-launcher" data-chatbot-action="toggle" aria-controls="powerwatch-chat-panel" aria-expanded="false" aria-label="Ask PowerWatch Assistant" title="Drag to move · Tap to chat">
        <span class="powerwatch-chat-launcher-icon" aria-hidden="true">✦</span><span>Ask PowerWatch</span>
      </button>
    </section>` : ''}
  </div>
  ${dialogMarkup()}
  <div class="toast" role="status" hidden></div>`;
  document.dispatchEvent(new Event('powerwatch:portal-rendered'));
}

function mobileHero(title, subtitle, tone = 'blue') {
  return `<section class="mobile-hero hero-${tone}">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(subtitle)}</p>
  </section>`;
}

function mobileCard(title, bodyHtml, actionHtml = '') {
  return `<section class="mobile-card">
    ${title ? `<header class="mobile-card-head"><h2>${escapeHtml(title)}</h2>${actionHtml}</header>` : ''}
    <div class="mobile-card-body">${bodyHtml}</div>
  </section>`;
}

function formatRelativeTime(value) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (!Number.isFinite(elapsedMinutes)) return formatDateTime(value);
  if (elapsedMinutes < 60) return `${Math.max(1, elapsedMinutes)} minute${elapsedMinutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

async function renderMobileHome() {
  const cachedWeather = readWeatherCache();
  const [{ stats }, { notifications }, { announcements }, { incidents = [] }, { scheduled = [] }, outageInsights] = await Promise.all([
    api('/api/analytics/dashboard'),
    api('/api/notifications'),
    api('/api/announcements').catch(() => ({ announcements: [] })),
    api('/api/incidents').catch(() => ({ incidents: [] })),
    api('/api/scheduled/upcoming').catch(() => ({ scheduled: [] })),
    api('/api/analytics/insights'),
  ]);
  state.mobileNotifications = notifications;

  const userBarangay = state.user?.barangay || 'Poblacion';
  const myIncident = incidents.find((inc) => (inc.affected_barangays || [inc.barangay]).some((b) => b && b.toLowerCase() === userBarangay.toLowerCase())
    && !['Closed', 'Restored', 'Resolved'].includes(inc.status));
  const myScheduled = scheduled.find((s) => s.barangay && s.barangay.toLowerCase() === userBarangay.toLowerCase() && s.status !== 'Completed');

  let barangayHeroMarkup = '';
  if (myIncident) {
    barangayHeroMarkup = `
      <section class="barangay-status-hero hero-outage">
        <div class="bsh-header">
          <span class="bsh-pulse red"></span>
          <span class="bsh-badge">Interruption Alert</span>
          <span class="bsh-barangay">Brgy. ${escapeHtml(userBarangay)}</span>
        </div>
        <h3>${escapeHtml(myIncident.title || 'Power Outage Reported')}</h3>
        <p>${escapeHtml(myIncident.description || 'Line crews have been notified. Response and field assessment ongoing.')}</p>
        <div class="bsh-actions">
          <button type="button" class="button danger small" data-mobile-tab="outages">Track Outage &rarr;</button>
          <button type="button" class="button ghost small" data-mobile-tab="map">View Map</button>
        </div>
      </section>
    `;
  } else if (myScheduled) {
    barangayHeroMarkup = `
      <section class="barangay-status-hero hero-scheduled">
        <div class="bsh-header">
          <span class="bsh-pulse amber"></span>
          <span class="bsh-badge">Scheduled Maintenance</span>
          <span class="bsh-barangay">Brgy. ${escapeHtml(userBarangay)}</span>
        </div>
        <h3>Advisory: Upcoming Maintenance</h3>
        <p>Interruption scheduled on ${escapeHtml(formatSystemDate(myScheduled.outage_date))} (${escapeHtml(String(myScheduled.start_time || '').slice(0, 5))} - ${escapeHtml(String(myScheduled.expected_end_time || '').slice(0, 5))}).</p>
        <div class="bsh-actions">
          <button type="button" class="button secondary small" data-mobile-tab="outages">View Advisory &rarr;</button>
        </div>
      </section>
    `;
  } else {
    barangayHeroMarkup = `
      <section class="barangay-status-hero hero-normal">
        <div class="bsh-header">
          <span class="bsh-pulse green"></span>
          <span class="bsh-badge">Grid Normal</span>
          <span class="bsh-barangay">Brgy. ${escapeHtml(userBarangay)}</span>
        </div>
        <h3>No active outage incidents recorded</h3>
        <p>Walay active outage incident nga naa sa system para sa imong barangay karon. Dili kini real-time voltage reading.</p>
        <div class="bsh-actions">
          <button type="button" class="button ghost small" data-mobile-tab="report">⚡ Report Outage</button>
          <button type="button" class="button ghost small" data-mobile-tab="map">🗺️ Live Map</button>
        </div>
      </section>
    `;
  }

  const dashboardCards = [
    { label: t('active_outages', 'Active Outages'), value: stats.active_incidents, icon: '🔔', tone: 'danger', tab: 'outages' },
    { label: t('pending_reports', 'Pending Reports'), value: stats.reports_pending, icon: '▣', tone: 'warning', action: 'dashboard-pending-reports' },
    { label: t('resolved_today', 'Resolved Today'), value: stats.resolved_today, icon: '⬡', tone: 'success', tab: 'history' },
    { label: t('total_reports', 'Total Reports'), value: stats.reports_total, icon: '✦', tone: 'primary', tab: 'reports' },
  ];
  const monthlyMaximum = Math.max(1, ...outageInsights.monthly.map((item) => Number(item.count) || 0));
  const trendCopy = outageInsights.trend.direction === 'up'
    ? `${outageInsights.current.unexpected_incidents} confirmed unexpected incidents in the last 90 days, up ${outageInsights.trend.change_percent}% from the previous 90 days.`
    : outageInsights.trend.direction === 'down'
      ? `${outageInsights.current.unexpected_incidents} confirmed unexpected incidents in the last 90 days, down ${Math.abs(outageInsights.trend.change_percent)}% from the previous 90 days.`
      : outageInsights.trend.direction === 'new_activity'
        ? `${outageInsights.current.unexpected_incidents} confirmed unexpected incidents in the last 90 days; none were recorded in the previous 90-day comparison period.`
        : `${outageInsights.current.unexpected_incidents} confirmed unexpected incidents in the last 90 days, the same as the previous 90 days.`;
  const forecastCopy = outageInsights.projection.status === 'available'
    ? `Baseline estimate: about ${outageInsights.projection.next_month_unexpected_incidents} confirmed unexpected incidents next month, using the average of six complete months (${outageInsights.projection.sample_incidents} incidents across ${outageInsights.projection.sample_months} active months). This is not an official outage notice.`
    : `No forecast yet. Six complete months contain ${outageInsights.projection.sample_incidents} confirmed unexpected incidents across ${outageInsights.projection.sample_months} active months; the baseline requires at least 12 incidents across 3 months.`;
  const updates = notifications.slice(0, 3);

  mobileShell(`
    ${barangayHeroMarkup}
    <section class="mobile-weather" id="home-weather" aria-label="Current weather in Valencia City" aria-live="polite">
      ${weatherWidgetMarkup(cachedWeather?.data, !cachedWeather)}
    </section>
    <div class="mobile-dashboard-grid">
      ${dashboardCards.map((card) => `<button type="button" class="mobile-dashboard-card" data-dashboard-tone="${card.tone}" ${card.action ? `data-action="${card.action}"` : `data-mobile-tab="${card.tab}"`}>
        <span class="dashboard-card-icon" aria-hidden="true">${card.icon}</span>
        <span class="dashboard-card-label">${card.label}</span>
        <strong>${escapeHtml(String(card.value))}</strong>
      </button>`).join('')}
    </div>
    <section class="bi-insights-panel" aria-labelledby="community-bi-title">
      <header class="bi-insights-header">
        <div><span class="bi-eyebrow">DATA-BASED INSIGHT · ${escapeHtml(userBarangay)}</span><h2 id="community-bi-title">Local outage trends</h2></div>
        <span class="bi-period">Last 90 days</span>
      </header>
      <p class="bi-insight-summary">${escapeHtml(trendCopy)}</p>
      <div class="bi-monthly-chart" role="img" aria-label="Monthly unexpected incidents in ${escapeHtml(userBarangay)} for the last six complete months">
        ${outageInsights.monthly.map((item) => `<div class="bi-month-column" title="${escapeHtml(item.month)}: ${item.count} unexpected incidents">
          <b>${item.count}</b><span style="height:${Math.max(4, (item.count / monthlyMaximum) * 54)}px"></span><small>${escapeHtml(item.month.split(' ')[0])}</small>
        </div>`).join('')}
      </div>
      <div class="bi-metric-row">
        <div><span>Active incidents</span><strong>${outageInsights.current.active_incidents}</strong></div>
        <div><span>Open community reports</span><strong>${outageInsights.current.open_unlinked_reports}</strong></div>
        <div><span>Median repair arrival</span><strong>${outageInsights.current.median_dispatch_response_hours === null ? 'No data' : `${outageInsights.current.median_dispatch_response_hours}h`}</strong></div>
      </div>
      <p class="bi-projection ${outageInsights.projection.status === 'available' ? 'available' : 'limited'}">${escapeHtml(forecastCopy)}</p>
      <small class="bi-data-note">Based on system incidents and reports for your barangay. Averages/medians describe recorded cases only; this is not a utility voltage monitor.</small>
    </section>
    <section class="recent-updates">
      <header class="recent-updates-head"><h2>${t('recent_updates', 'Recent Updates')}</h2><button type="button" class="link-button" data-mobile-tab="notifications">${t('view_all', 'View All')}</button></header>
      ${updates.length ? updates.map((notice) => {
        const restored = /restor|resolved|complete/i.test(`${notice.title} ${notice.message || ''}`);
        const scheduledNotice = notice.type === 'scheduled' || /scheduled/i.test(notice.title);
        const tone = restored ? 'success' : scheduledNotice ? 'info' : 'danger';
        const icon = restored ? '⌖' : scheduledNotice ? 'i' : '⚠';
        return `<button type="button" class="recent-update-row" data-action="view-notification" data-id="${notice.id}">
          <span class="recent-update-icon" data-update-tone="${tone}">${icon}</span>
          <span class="recent-update-copy"><strong>${escapeHtml(notice.title)}</strong><small>${escapeHtml(notice.message || '')}</small><time>${escapeHtml(formatRelativeTime(notice.created_at))}</time></span>
          <span class="recent-update-chevron" aria-hidden="true">›</span>
        </button>`;
      }).join('') : `<p class="recent-updates-empty">${t('no_recent_updates', 'No recent updates.')}</p>`}
    </section>
    <section class="recent-updates home-announcements">
      <header class="recent-updates-head"><h2>Announcements</h2><button type="button" class="link-button" data-mobile-tab="announcements">View all</button></header>
      ${announcements.length ? announcements.slice(0, 3).map((announcement) => `
        <button type="button" class="recent-update-row" data-action="view-announcement" data-id="${announcement.id}">
          <span class="recent-update-icon announcement-update-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a2 2 0 0 0 2 2h2l3 5h3l-2-6 8 3V7l-8 3H5a2 2 0 0 0-2 1z"></path></svg></span>
          <span class="recent-update-copy"><strong>${escapeHtml(announcement.title)}</strong><small>${escapeHtml(announcement.category)}</small><time>${escapeHtml(formatRelativeTime(announcement.published_at || announcement.created_at))}</time></span>
          <span class="recent-update-chevron" aria-hidden="true">›</span>
        </button>`).join('') : '<p class="recent-updates-empty">No announcements right now.</p>'}
    </section>
  `, { activeTab: 'home', homeHeader: true });

  if (!cachedWeather || Date.now() - cachedWeather.savedAt >= WEATHER_CACHE_TTL) {
    requestCurrentWeather().then((weather) => {
      const weatherWidget = document.getElementById('home-weather');
      if (weatherWidget && state.mobileTab === 'home') weatherWidget.innerHTML = weatherWidgetMarkup(weather);
    });
  }
}

async function renderMobileReportForm() {
  if (!state.barangayLocations || !state.barangayLocations.length) {
    try {
      const { barangays: locations } = await api('/api/barangays/locations');
      state.barangayLocations = locations;
    } catch {}
  }
  const types = activeOutageTypes();
  const draft = state.mobileReportDraft || {};
  const step = state.mobileReportStep || 1;
  const locationMode = state.mobileLocationMode || 'map';
  const attachments = draft.attachments || [];

  // Default to user's registered barangay or Poblacion
  const defaultBarangay = draft.barangay || state.user?.barangay || 'Poblacion';
  if (!draft.barangay) draft.barangay = defaultBarangay;

  if (!['gps', 'map_pin'].includes(draft.location_source)) {
    delete draft.latitude;
    delete draft.longitude;
    delete draft.location_accuracy_m;
  }
  state.mobileReportDraft = draft;

  const stepNames = ['Location', 'Details', 'Evidence', 'Review'];
  const stepper = `<div class="stepper">${stepNames.map((name, index) => `
    <div class="step ${step === index + 1 ? 'active' : ''} ${step > index + 1 ? 'complete' : ''}"><span class="step-number">${step > index + 1 ? '✓' : index + 1}</span><span>${name}</span></div>
  `).join('')}</div>`;
  const hidden = ['barangay', 'location', 'purok', 'affected_area', 'date_time_noticed', 'possible_outage_type', 'description', 'latitude', 'longitude', 'location_source', 'location_accuracy_m', 'remarks']
    .map((name) => `<input type="hidden" name="${name}" value="${escapeHtml(draft[name] || '')}">`).join('');
  let formBody = '';
  const possibleDuplicates = state.mobilePossibleDuplicates || [];
  const duplicateWarning = state.mobileDuplicateCheckError
    ? `<aside class="possible-duplicate-notice is-unavailable" role="status"><strong>Similar-report check unavailable</strong><p>${escapeHtml(state.mobileDuplicateCheckError)} You can still submit; authorized staff will review your report.</p></aside>`
    : possibleDuplicates.length
      ? `<aside class="possible-duplicate-notice" role="status">
          <strong>Possible nearby reports found</strong>
          <p>These active reports were submitted within 1 km of your pin during the last 72 hours. They are suggestions only; your report will not be marked duplicate automatically.</p>
          <ul>${possibleDuplicates.map((candidate) => `
            <li><span><strong>${escapeHtml(candidate.report_code)}</strong> · ${escapeHtml(candidate.possible_outage_type || 'Power interruption')} · ${escapeHtml(candidate.status)}</span>
              <small>${candidate.distance_m < 1000 ? `${candidate.distance_m} m away` : `${(candidate.distance_m / 1000).toFixed(1)} km away`} · ${escapeHtml(formatDateTime(candidate.reported_at))}</small>
            </li>`).join('')}</ul>
          <p>If one describes the same interruption, you can go back instead. If your report is separate, continue submitting.</p>
        </aside>`
      : '<p class="possible-duplicate-clear" role="status">No similar active reports were found nearby in the last 72 hours.</p>';

  if (step === 1) {
    formBody = `<h2>Location</h2>
      <p class="report-step-hint">Use GPS or tap the exact spot on the map before continuing. The barangay is estimated from the nearest barangay center; confirm it and enter the specific purok or landmark.</p>
      <div class="mobile-segments report-location-modes" role="group" aria-label="Location method">
        <button type="button" class="mobile-segment ${locationMode === 'map' ? 'active' : ''}" data-action="set-report-location-mode" data-value="map">Map</button>
        <button type="button" class="mobile-segment ${locationMode === 'address' ? 'active' : ''}" data-action="set-report-location-mode" data-value="address">Address</button>
      </div>
      <label>Search barangay<input type="search" name="barangay" list="report-barangay-options" data-location-search placeholder="Search barangay..." value="${escapeHtml(draft.barangay || state.user?.barangay || 'Poblacion')}" required></label>
      <datalist id="report-barangay-options">${state.barangays.map((barangay) => `<option value="${escapeHtml(barangay)}">`).join('')}</datalist>
      ${locationMode === 'map' ? '<div class="report-location-map" id="report-location-map" aria-label="Tap to select outage location"></div>' : ''}
      
      <div id="report-assigned-barangay-badge" style="margin: 8px 0; padding: 10px 14px; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:1.25rem;">🏛️</span>
          <div>
            <div style="font-size:0.75rem;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">Barangay estimate:</div>
            <strong id="assigned-barangay-name" style="font-size:0.95rem;color:#14532d;">Brgy. ${escapeHtml(draft.barangay || state.user?.barangay || 'Poblacion')}</strong>
          </div>
        </div>
        <span class="pill pill-ok" style="font-size:0.75rem;font-weight:750;">Nearest center</span>
      </div>

      <label>📍 Specific Purok / Sitio / Landmark (Precise Location)<input name="purok" value="${escapeHtml(draft.purok || draft.affected_area || '')}" placeholder="e.g. Purok 4, Crossing, Near San Agustin Chapel" required></label>

      <label>${locationMode === 'map' ? '📍 Pinned location' : 'Street address / full location'}<input name="location" value="${escapeHtml(draft.location || '')}" placeholder="${locationMode === 'map' ? 'Tap the map or use GPS to confirm a location' : 'Purok, street, or nearby landmark'}" ${locationMode === 'map' ? 'readonly' : ''} required></label>
      <div class="mobile-gps">
        <button type="button" class="button ghost block" data-action="capture-gps">📍 Use current location (GPS)</button>
        <input type="hidden" name="latitude" data-gps="latitude" value="${escapeHtml(draft.latitude || '')}">
        <input type="hidden" name="longitude" data-gps="longitude" value="${escapeHtml(draft.longitude || '')}">
        <input type="hidden" name="location_source" value="${escapeHtml(draft.location_source || '')}">
        <input type="hidden" name="location_accuracy_m" value="${escapeHtml(draft.location_accuracy_m || '')}">
        <span class="muted small" data-gps="status">${draft.location_source && draft.latitude ? `📍 ${draft.location_source === 'gps' ? 'GPS fix' : 'Map pin'}: ${Number(draft.latitude).toFixed(5)}, ${Number(draft.longitude).toFixed(5)} · Barangay estimate: ${escapeHtml(draft.barangay || 'Valencia')}` : 'Location not confirmed. Tap the map or use GPS; barangay-center previews are not report locations.'}</span>
      </div>
      <button type="button" class="button primary block" data-action="next-report-step">Next</button>`;
  } else if (step === 2) {
    formBody = `<h2>Interruption Details</h2>
      <label>Affected area / Purok note<input name="affected_area" value="${escapeHtml(draft.affected_area || draft.purok || '')}" placeholder="Nearby streets, purok, or sitios"></label>
      <label>Date and time noticed<input type="datetime-local" name="date_time_noticed" value="${escapeHtml(draft.date_time_noticed || toLocalInputValue(new Date()))}" required></label>
      <label>Interruption type<select name="possible_outage_type"><option value="">Select a type</option>${types.map((type) => `<option ${draft.possible_outage_type === type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select></label>
      <label>Description<textarea name="description" rows="4" placeholder="Describe what happened" required>${escapeHtml(draft.description || '')}</textarea></label>
      <label>Additional remarks (optional)<textarea name="remarks" rows="2">${escapeHtml(draft.remarks || '')}</textarea></label>
      <div class="dual-action-row"><button type="button" class="button ghost" data-action="previous-report-step">Back</button><button type="button" class="button primary" data-action="next-report-step">Next</button></div>`;
  } else if (step === 3) {
    formBody = `<h2>Add Evidence</h2>
      <p class="report-step-hint">Add photos or videos of the power interruption. Evidence is optional (up to five files).</p>
      <div class="report-attachment-previews">${attachments.map((attachment, index) => `
        <div class="report-attachment-preview">
          ${attachment.type.startsWith('video/')
            ? `<video src="${escapeHtml(attachment.data)}" muted playsinline preload="metadata" aria-label="${escapeHtml(attachment.name)}"></video>`
            : `<img src="${escapeHtml(attachment.data)}" alt="${escapeHtml(attachment.name)}">`}
          <button type="button" data-action="remove-report-attachment" data-index="${index}" aria-label="Remove ${escapeHtml(attachment.name)}">×</button>
        </div>`).join('')}</div>
      <div class="report-evidence-pickers">
        <button type="button" class="report-evidence-picker" data-action="pick-report-attachment" data-value="photo"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></svg><span>Add Photo</span></button>
        <button type="button" class="report-evidence-picker" data-action="pick-report-attachment" data-value="video"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m10 9 5 3-5 3z"></path></svg><span>Add Video</span></button>
      </div>
      <input class="visually-hidden" type="file" name="attachments" data-attachment-kind="photo" accept="image/jpeg,image/png,image/webp" capture="environment" multiple tabindex="-1" aria-hidden="true">
      <input class="visually-hidden" type="file" name="attachments" data-attachment-kind="video" accept="video/mp4,video/quicktime" capture="environment" multiple tabindex="-1" aria-hidden="true">
      <p class="report-evidence-hint">Supported: JPG, PNG, WebP, MP4, MOV (Video: 5–10 mins max, up to 50 MB)</p>
      <button type="button" class="button primary block report-evidence-next" data-action="next-report-step">Next</button>`;
  } else {
    formBody = `<h2>Review Your Report</h2>
      ${duplicateWarning}
      <div class="review-list">
        <div class="review-item"><span class="review-label">Interruption Type</span><span class="review-value">${escapeHtml(draft.possible_outage_type || 'Power interruption')}</span></div>
        <div class="review-item"><span class="review-label">Barangay</span><span class="review-value">${escapeHtml(draft.barangay || '')}</span></div>
        <div class="review-item"><span class="review-label">Purok / Area</span><span class="review-value">${escapeHtml(draft.purok || draft.affected_area || 'Not specified')}</span></div>
        <div class="review-item"><span class="review-label">Confirmed Location</span><span class="review-value">${draft.latitude && draft.longitude ? `${draft.location_source === 'gps' ? 'GPS' : 'Map pin'} · (${Number(draft.latitude).toFixed(5)}, ${Number(draft.longitude).toFixed(5)})${draft.location_accuracy_m ? ` · ±${Math.round(Number(draft.location_accuracy_m))} m` : ''}` : escapeHtml(draft.location || '')}</span></div>
        <div class="review-item"><span class="review-label">Date &amp; Time</span><span class="review-value">${escapeHtml(draft.date_time_noticed || '')}</span></div>
        <div class="review-item"><span class="review-label">Description</span><span class="review-value">${escapeHtml(draft.description || '')}</span></div>
        ${attachments.length ? `<div class="report-attachment-previews">${attachments.map((attachment) => attachment.type.startsWith('video/')
          ? `<video src="${escapeHtml(attachment.data)}" controls aria-label="${escapeHtml(attachment.name)}"></video>`
          : `<img src="${escapeHtml(attachment.data)}" alt="${escapeHtml(attachment.name)}">`).join('')}</div>` : '<p class="muted small">No evidence attached.</p>'}
      </div>
      <form class="mobile-form" data-form="report">${hidden}<input type="hidden" name="photoData" value="${escapeHtml(draft.photoData || '')}">
        <div class="dual-action-row"><button type="button" class="button ghost" data-action="previous-report-step">Back</button><button class="button primary" type="submit">Submit report</button></div>
      </form>
      <p class="muted small">Reports are reviewed by authorized personnel before confirmation.</p>`;
  }

  mobileShell(`
    ${step === 3 ? '' : mobileHero('Report Power Interruption', 'Share accurate details so your report can be verified.')}
    ${step === 3 ? '' : stepper}
    <form class="mobile-form report-step-form ${step === 3 ? 'report-evidence-step' : ''}" data-form="report" ${step === 4 ? 'hidden' : ''}>${step === 4 ? '' : formBody}</form>
    ${step === 4 ? formBody : ''}
  `, {
    activeTab: 'reports',
    showTabs: step !== 3,
    subpageHeader: step === 3 ? { title: 'Add Evidence (Optional)', backAction: 'previous-report-step' } : null,
  });

  if (state.reportLocationMap) {
    state.reportLocationMap.remove();
    state.reportLocationMap = null;
    state.reportLocationMarker = null;
    state.reportLocationSetPin = null;
  }
  if (step === 1 && locationMode === 'map') {
    await ensureLeaflet();
    const locations = state.barangayLocations || [];
    const mapElement = document.getElementById('report-location-map');
    if (!mapElement) return;
    const initialBarangay = locations.find((item) => item.name === (draft.barangay || state.user?.barangay)) || locations[0];
    const initialCoords = (initialBarangay && hasCoordinates(initialBarangay))
      ? [Number(initialBarangay.latitude), Number(initialBarangay.longitude)]
      : [7.9111239, 125.0933669];

    const map = L.map(mapElement, {
      zoomControl: false,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: [[7.6, 124.8], [8.2, 125.4]],
    }).setView(
      draft.latitude && draft.longitude
        ? [Number(draft.latitude), Number(draft.longitude)]
        : initialCoords,
      14,
    );
    state.reportLocationMap = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc',
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const setPin = (latitude, longitude, customBarangayName = null, source = 'map_pin', accuracy = null) => {
      const lat = Number(latitude);
      const lng = Number(longitude);
      const point = [lat, lng];
      if (state.reportLocationMarker) state.reportLocationMarker.setLatLng(point);
      else state.reportLocationMarker = L.marker(point).addTo(map);

      const latitudeInput = document.querySelector('[data-gps="latitude"]');
      const longitudeInput = document.querySelector('[data-gps="longitude"]');
      const sourceInput = document.querySelector('[name="location_source"]');
      const accuracyInput = document.querySelector('[name="location_accuracy_m"]');
      const locationInput = document.querySelector('input[name="location"]');
      const barangayInput = document.querySelector('input[name="barangay"]');
      const status = document.querySelector('[data-gps="status"]');
      const badgeName = document.getElementById('assigned-barangay-name');

      const latStr = lat.toFixed(6);
      const lngStr = lng.toFixed(6);
      if (latitudeInput) latitudeInput.value = latStr;
      if (longitudeInput) longitudeInput.value = lngStr;
      if (sourceInput) sourceInput.value = source;
      if (accuracyInput) accuracyInput.value = accuracy !== null && accuracy !== undefined && accuracy !== ''
        && Number.isFinite(Number(accuracy)) ? String(Number(accuracy)) : '';

      // Automatically detect and assign the nearest Barangay!
      let assignedName = customBarangayName;
      if (!assignedName) {
        const nearest = findNearestBarangay(lat, lng, state.barangayLocations);
        if (nearest && nearest.name) assignedName = nearest.name;
        else assignedName = barangayInput?.value || 'Poblacion';
      }

      const formattedLocation = `Brgy. ${assignedName}, Valencia City (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

      if (locationInput && (state.mobileLocationMode || 'map') === 'map') locationInput.value = formattedLocation;
      if (barangayInput && barangayInput.value !== assignedName) {
        barangayInput.value = assignedName;
      }
      if (badgeName) badgeName.textContent = `Brgy. ${assignedName}`;

      if (state.mobileReportDraft) {
        state.mobileReportDraft.barangay = assignedName;
        state.mobileReportDraft.latitude = latStr;
        state.mobileReportDraft.longitude = lngStr;
        state.mobileReportDraft.location_source = source;
        state.mobileReportDraft.location_accuracy_m = accuracy !== null && accuracy !== undefined && accuracy !== ''
          && Number.isFinite(Number(accuracy)) ? String(Number(accuracy)) : '';
        if ((state.mobileLocationMode || 'map') === 'map') state.mobileReportDraft.location = formattedLocation;
      }
      if (status) status.innerHTML = `📍 ${source === 'gps' ? 'GPS fix' : 'Map pin'}: <strong>${lat.toFixed(5)}, ${lng.toFixed(5)}</strong> · Barangay estimate: ${escapeHtml(assignedName)}`;
    };

    state.reportLocationSetPin = setPin;
    state.reportLocationClearPin = () => {
      if (state.reportLocationMarker) {
        map.removeLayer(state.reportLocationMarker);
        state.reportLocationMarker = null;
      }
      for (const selector of ['[data-gps="latitude"]', '[data-gps="longitude"]', '[name="location_source"]', '[name="location_accuracy_m"]']) {
        const input = document.querySelector(selector);
        if (input) input.value = '';
      }
      if (state.mobileReportDraft) {
        delete state.mobileReportDraft.latitude;
        delete state.mobileReportDraft.longitude;
        delete state.mobileReportDraft.location_source;
        delete state.mobileReportDraft.location_accuracy_m;
      }
      const locationInput = document.querySelector('input[name="location"]');
      const status = document.querySelector('[data-gps="status"]');
      if (locationInput && (state.mobileLocationMode || 'map') === 'map') locationInput.value = '';
      if (state.mobileReportDraft && (state.mobileLocationMode || 'map') === 'map') state.mobileReportDraft.location = '';
      if (status) status.textContent = 'Location not confirmed. Tap the map or use GPS; barangay-center previews are not report locations.';
    };

    if (['gps', 'map_pin'].includes(draft.location_source) && draft.latitude && draft.longitude) {
      setPin(Number(draft.latitude), Number(draft.longitude), draft.barangay || null, draft.location_source, draft.location_accuracy_m);
    }

    map.on('click', (event) => setPin(event.latlng.lat, event.latlng.lng, null, 'map_pin'));
    window.requestAnimationFrame(() => map.invalidateSize());
  }
}

function getVideoDuration(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('video/')) return resolve(null);
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    video.src = objectUrl;
  });
}

async function moveMobileReportStep(direction) {
  const form = document.querySelector('form[data-form="report"]');
  if (!form) return;
  if (direction > 0 && !form.reportValidity()) return;
  if (direction > 0 && (state.mobileReportStep || 1) === 1) {
    const values = new FormData(form);
    const latitudes = values.getAll('latitude');
    const longitudes = values.getAll('longitude');
    if (!['gps', 'map_pin'].includes(values.get('location_source'))
      || !latitudes.at(-1) || !longitudes.at(-1)) {
      throw new Error('Confirm the outage location with GPS or a map pin before continuing.');
    }
  }
  const values = Object.fromEntries([...new FormData(form).entries()].filter(([name, value]) => name !== 'attachments' && !(value instanceof File)));
  const files = [...form.querySelectorAll('input[name="attachments"]')].flatMap((input) => [...input.files]);
  const currentAttachments = state.mobileReportDraft?.attachments || [];
  if (currentAttachments.length + files.length > 5) throw new Error('You can attach up to five files.');
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'].includes(file.type)) {
      throw new Error('Palihog pagpili og JPG, PNG, WebP, MP4, o MOV nga files.');
    }
    if (file.type.startsWith('video/')) {
      if (file.size > 50 * 1024 * 1024) {
        throw new Error(`${file.name} exceeds the 50 MB limit. Palihog gamita ang mas mubo o compressed nga video.`);
      }
      const duration = await getVideoDuration(file);
      if (duration && duration > 600) {
        const mins = Math.ceil(duration / 60);
        throw new Error(`Ang gi-upload nga video (${mins} mins) milapas sa 10 minutos nga limit. Ang gitugot nga video duration kay hangtod 5-10 minutos lamang.`);
      }
    } else {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`${file.name} exceeds the 10 MB limit.`);
      }
    }
  }
  const addedAttachments = await Promise.all(files.map(async (file) => ({
    name: file.name,
    type: file.type,
    size: file.size,
    data: await readPhoto(file),
  })));
  state.mobileReportDraft = { ...(state.mobileReportDraft || {}), ...values };
  state.mobileReportDraft.attachments = [...currentAttachments, ...addedAttachments];
  if (direction > 0 && (state.mobileReportStep || 1) === 3) {
    state.mobilePossibleDuplicates = [];
    state.mobileDuplicateCheckError = '';
    const draft = state.mobileReportDraft;
    const params = new URLSearchParams({
      barangay: String(draft.barangay || ''),
      latitude: String(draft.latitude || ''),
      longitude: String(draft.longitude || ''),
    });
    try {
      const { possible_duplicates: matches } = await api(`/api/reports/possible-duplicates?${params}`);
      state.mobilePossibleDuplicates = matches;
    } catch (error) {
      state.mobileDuplicateCheckError = error.message || 'Please try again later.';
    }
  }
  state.mobileReportStep = Math.max(1, Math.min(4, (state.mobileReportStep || 1) + direction));
  await render();
}

async function renderMobileOutages() {
  const f = state.filters;
  const { incidents } = await api(`/api/incidents${query({ barangay: f.mobileBarangay, type: f.mobileType })}`);
  const mine = state.user.barangay;
  const scoped = mine ? incidents.filter((i) => (i.affected_barangays || []).includes(mine)) : incidents;
  const list = scoped.length ? scoped : incidents;

  mobileShell(`
    ${mobileHero('Active outages', 'Live status of reported and verified interruptions.', 'amber')}
    <div class="mobile-filters">
      <select class="input" data-filter="mobileBarangay"><option value="">All barangays</option>${state.barangays.map((b) => `<option ${f.mobileBarangay === b ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')}</select>
      <select class="input" data-filter="mobileType"><option value="">All types</option><option ${f.mobileType === 'Unexpected' ? 'selected' : ''}>Unexpected</option><option ${f.mobileType === 'Scheduled' ? 'selected' : ''}>Scheduled</option></select>
    </div>
    ${mine ? `<div class="mobile-scope-note">Showing outages affecting <strong>${escapeHtml(mine)}</strong>. <button class="link-button" data-action="clear-mobile-scope">View all</button></div>` : ''}
    ${list.length ? list.map((i) => `
      <section class="mobile-outage-card">
        <header><div><span class="mono muted small">${escapeHtml(i.incident_code)}</span><h3>${escapeHtml(i.title)}</h3></div>${statusPill(i.status)}</header>
        <p class="muted small">📍 ${escapeHtml((i.affected_barangays || [i.barangay]).join(', '))}</p>
        ${i.description ? `<p>${escapeHtml(i.description)}</p>` : ''}
        <div class="mobile-outage-meta">
          <span>🏷 ${escapeHtml(i.incident_type)}</span>
          <span>⏱ ${escapeHtml(i.duration_display || 'Ongoing')}</span>
        </div>
        ${i.restoration_progress !== null && i.restoration_progress !== undefined ? `<div class="progress"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, Number(i.restoration_progress)))}%"></div><span>${escapeHtml(String(i.restoration_progress))}% restored</span></div>` : ''}
        <footer class="muted small">Started ${escapeHtml(formatDateTime(i.start_time))}</footer>
        <div class="neighbor-affected-row">
          <button type="button" class="neighbor-affected-btn ${(state.userAffectedIncidents && state.userAffectedIncidents[i.id]) ? 'confirmed' : ''}" data-action="confirm-affected" data-id="${i.id}">
            <span>👥 ${(state.userAffectedIncidents && state.userAffectedIncidents[i.id]) ? '✓ Gikumpirma nimo' : 'Affected sab ko (+1)'}</span>
            <span class="affected-count-badge">${((i.affected_count || 1) + ((state.userAffectedIncidents && state.userAffectedIncidents[i.id]) ? 1 : 0))} household${((i.affected_count || 1) + ((state.userAffectedIncidents && state.userAffectedIncidents[i.id]) ? 1 : 0)) > 1 ? 's' : ''}</span>
          </button>
          <button type="button" class="button ghost small" data-action="view-incident-details" data-id="${i.id}">Details &rarr;</button>
        </div>
      </section>`).join('') : `<div class="mobile-card">${emptyState('No active outages', 'There are no ongoing interruptions right now.', '⚡')}</div>`}
  `, { activeTab: 'outages' });
}

async function renderMobileAnnouncements() {
  const { announcements } = await api('/api/announcements');
  const filter = state.filters.announcementFilter || 'all';
  const visibleAnnouncements = announcements.filter((item) => {
    if (filter === 'important') return ['Scheduled Outage', 'Emergency Advisory', 'Service Advisory'].includes(item.category);
    if (filter === 'maintenance') return /maintenance|repair|upgrade/i.test(`${item.category} ${item.title} ${item.content}`);
    return true;
  });
  mobileShell(`
    ${mobileHero('Announcements', 'Service advisories and interruption notices for Valencia City.')}
    <div class="mobile-segments" role="group" aria-label="Filter announcements">
      ${[['all', 'All'], ['important', 'Important'], ['maintenance', 'Maintenance']].map(([key, label]) => `
        <button class="mobile-segment ${filter === key ? 'active' : ''}" data-action="filter-announcements" data-value="${key}">${label}</button>
      `).join('')}
    </div>
    ${mobileCard('', visibleAnnouncements.length ? visibleAnnouncements.map((a) => `
      <div class="mobile-announcement">
        ${a.image_path ? `<img class="mobile-announcement-image" src="${escapeHtml(a.image_path)}" alt="${escapeHtml(a.title)}">` : ''}
        <span class="tag">${escapeHtml(a.category)}</span>
        <strong>${escapeHtml(a.title)}</strong>
        <p>${escapeHtml(a.content)}</p>
        <span class="muted small">${escapeHtml(formatDateTime(a.published_at || a.created_at))}</span>
        <button type="button" class="link-button" data-action="view-announcement" data-id="${a.id}">View Details</button>
      </div>`).join('') : `<p class="muted small">${filter === 'maintenance' ? 'No maintenance announcements.' : 'No announcements match this filter.'}</p>`)}
  `, { activeTab: 'home' });
}

async function renderMobileProfile() {
  const u = state.user;
  const [mine, notifications] = await Promise.all([api('/api/reports/mine'), api('/api/notifications')]);
  const feedbackRating = state.feedbackRating || 5;

  mobileShell(`
    <section class="mobile-profile-head">
      ${u.profile_photo_path ? `<img class="avatar big profile-photo" src="${escapeHtml(u.profile_photo_path)}" alt="Profile photo of ${escapeHtml(u.full_name)}">` : `<div class="avatar big">${escapeHtml((u.full_name || '?').charAt(0).toUpperCase())}</div>`}
      <div><h1>${escapeHtml(u.full_name)}</h1><p class="muted small">${escapeHtml(u.email)}</p><span class="pill pill-neutral">${escapeHtml(roleLabel(u.role))}</span></div>
    </section>
    <button class="button ghost block" data-action="open-settings">⚙ Settings</button>
    ${mobileCard('My reports', mine.reports.length ? mine.reports.slice(0, 6).map((r) => `
      <div class="mobile-list-item">
        <div class="mobile-list-main"><strong>${escapeHtml(r.report_code)}</strong><span class="muted small">${escapeHtml(r.barangay)} · ${escapeHtml(formatDateTime(r.date_time_noticed))}</span></div>
        ${statusPill(r.status)}
      </div>`).join('') : `<p class="muted small">You have not submitted any reports yet.</p>`)}
    ${mobileCard('Edit details', `<form class="mobile-form" data-form="profile">
      <label class="mobile-photo-field">Profile photo<input type="file" data-profile-photo accept="image/png,image/jpeg,image/webp"></label>
      <label>Full name<input name="full_name" value="${escapeHtml(u.full_name || '')}" required></label>
      <label>Contact number<input name="contact_number" value="${escapeHtml(u.contact_number || '')}"></label>
      <label>Barangay<select name="barangay"><option value="">None</option>${state.barangays.map((b) => `<option ${u.barangay === b ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')}</select></label>
      <label>Address<input name="address" value="${escapeHtml(u.address || '')}"></label>
      <button class="button primary block" type="submit">Save</button>
    </form>`)}
    <div id="account-security">${mobileCard('Change password', `<form class="mobile-form" data-form="password">
      <label>Current password<input type="password" name="current_password" required></label>
      <label>New password<input type="password" name="new_password" minlength="6" required></label>
      <label>Confirm password<input type="password" name="confirm_password" minlength="6" required></label>
      <button class="button primary block" type="submit">Update password</button>
    </form>`)}</div>
    ${mobileCard('Rate the app', `<form class="mobile-form" data-form="feedback">
      <div class="feedback-star-control"><span>Rate your experience</span><div class="feedback-stars" role="group" aria-label="Choose a rating">
        ${[1, 2, 3, 4, 5].map((rating) => `<button type="button" class="feedback-star ${rating <= feedbackRating ? 'selected' : ''}" data-action="feedback-star" data-value="${rating}" aria-label="${rating} star${rating === 1 ? '' : 's'}" aria-pressed="${rating === feedbackRating}">★</button>`).join('')}
      </div><input type="hidden" name="rating" value="${feedbackRating}"></div>
      <label>Comments<textarea name="comments" rows="3" maxlength="1000"></textarea></label>
      <button class="button primary block" type="submit">Send feedback</button>
    </form>`)}
    <div class="mobile-card">
      <div class="mobile-list-item"><div class="mobile-list-main"><span>Alerts received</span></div><strong>${escapeHtml(String(notifications.notifications.length))}</strong></div>
      <button class="button danger block" data-action="logout">Sign out</button>
    </div>
  `, { activeTab: 'profile' });
}

function computeReportProgressStage(report) {
  const rStatus = String(report.status || '').trim();
  const incStatus = String(report.incident?.status || '').trim();
  const repStatus = String(report.repair_status || '').trim();
  const isResolved = rStatus === 'Resolved' || ['Closed', 'Restored', 'Resolved'].includes(incStatus) || repStatus === 'Resolved';
  const isCrew = isResolved
    || ['In Progress', 'Ongoing', 'Restoration in Progress'].includes(rStatus)
    || ['Ongoing', 'Restoration in Progress', 'Closed', 'Restored', 'Resolved'].includes(incStatus)
    || ['Dispatched', 'En Route', 'Arrived On Site', 'In Progress', 'Resolved'].includes(repStatus)
    || Boolean(report.assigned_team_name || report.repair_team_id);
  const isVerified = isCrew
    || ['Verified', 'Officially Confirmed', 'Under Review'].includes(rStatus)
    || ['Verified', 'Officially Confirmed', 'Under Review'].includes(report.verification_status);

  if (isResolved) return { stage: 4, label: 'Power Restored', bisaya: 'Nauli Na', tone: 'emerald', icon: '⚡' };
  if (isCrew) return { stage: 3, label: 'Crew Dispatched', bisaya: 'On-site Repair', tone: 'blue', icon: '👷' };
  if (isVerified) return { stage: 2, label: 'Under Verification', bisaya: 'Gi-verify', tone: 'amber', icon: '🔍' };
  return { stage: 1, label: 'Report Submitted', bisaya: 'Nadawat', tone: 'slate', icon: '📝' };
}

async function renderMobileReports() {
  const [{ reports }, { history }] = await Promise.all([
    api('/api/reports/mine'),
    api('/api/history'),
  ]);
  const selectedStatus = state.filters.myReportStatus || '';
  const reportsForStatus = selectedStatus === 'pending'
    ? reports.filter((report) => ['Submitted', 'Under Review'].includes(report.status))
    : selectedStatus
    ? reports.filter((report) => report.status === selectedStatus)
    : reports;

  mobileShell(`
    ${mobileHero(t('my_reports', 'My Reports'), t('my_reports_sub', 'Track reports you have submitted and their verification status.'))}
    <div class="mobile-report-actions">
      <button class="button primary block" data-action="compose-report">${t('report_interruption', '＋ Report an interruption')}</button>
      <button class="button ghost block" data-mobile-tab="history">${t('outage_history', 'View outage history')}</button>
    </div>
    <div class="mobile-segments" role="group" aria-label="Filter reports">
      ${['', 'pending', 'Verified', 'In Progress', 'Resolved'].map((status) => `
        <button class="mobile-segment ${selectedStatus === status ? 'active' : ''}" data-action="filter-my-reports" data-value="${escapeHtml(status)}">${escapeHtml(status === 'pending' ? 'Pending' : status || 'All')}</button>
      `).join('')}
    </div>
    ${reportsForStatus.length ? reportsForStatus.map((report) => {
      const prog = computeReportProgressStage(report);
      return `<button class="mobile-report-item" data-action="view-my-report" data-id="${report.id}">
        <div class="mobile-report-item-top">
          <span class="mobile-report-pin">⌖</span>
          <span class="mobile-report-copy">
            <strong>${escapeHtml(report.report_code)}</strong>
            <span>${escapeHtml(formatDateTime(report.date_time_noticed))}</span>
            <span>📍 ${escapeHtml(report.barangay)}</span>
          </span>
          ${statusPill(report.status)}
        </div>
        <div class="report-mini-stepper">
          <div class="mini-stepper-track">
            <span class="mini-stepper-seg ${prog.stage >= 1 ? 'filled' : ''} ${prog.stage === 1 ? 'active' : ''}"></span>
            <span class="mini-stepper-seg ${prog.stage >= 2 ? 'filled' : ''} ${prog.stage === 2 ? 'active' : ''}"></span>
            <span class="mini-stepper-seg ${prog.stage >= 3 ? 'filled' : ''} ${prog.stage === 3 ? 'active' : ''}"></span>
            <span class="mini-stepper-seg ${prog.stage >= 4 ? 'filled' : ''} ${prog.stage === 4 ? 'active' : ''}"></span>
          </div>
          <div class="mini-stepper-meta">
            <span class="mini-stepper-label tone-${prog.tone}">
              <span>${prog.icon}</span>
              <strong>${prog.label}</strong> <small>(${prog.bisaya})</small>
            </span>
            <span class="mini-stepper-step">Hakbang ${prog.stage}/4</span>
          </div>
        </div>
      </button>`;
    }).join('') : `<div class="mobile-card">${emptyState('No reports yet', 'Your submitted interruption reports will appear here.', '📝')}</div>`}
    ${history.length ? `<section class="mobile-card mobile-history-summary">
      <header class="mobile-card-head"><h2>Recent outage history</h2><button class="link-button" data-mobile-tab="history">View all</button></header>
      <div class="mobile-card-body">${history.slice(0, 2).map((incident) => `
        <div class="mobile-list-item"><div class="mobile-list-main"><strong>${escapeHtml(incident.barangay)}</strong><span>${escapeHtml(incident.duration_display || 'Duration unavailable')}</span></div>${statusPill('Resolved')}</div>
      `).join('')}</div>
    </section>` : ''}
  `, { activeTab: 'reports' });
}

async function renderMobileReportDetail() {
  const { report } = await api(`/api/reports/${Number(state.mobileReportId)}`);
  const prog = computeReportProgressStage(report);
  const isResolved = prog.stage === 4;
  const timeline = report.timeline?.length ? report.timeline : [{
    event_type: 'submitted',
    title: 'Report submitted',
    details: 'Your report was received and is pending review.',
    created_at: report.reported_at,
  }];
  const timelineMarkup = timeline.map((event, index) => {
    const icon = event.event_type === 'submitted' ? '📝'
      : event.event_type === 'repair' ? '🛠️'
        : event.event_type === 'incident' ? '⚡' : '↻';
    const statusText = event.from_status && event.to_status
      ? `${event.from_status} → ${event.to_status}`
      : event.to_status || '';
    return `<li class="report-timeline-item ${index === timeline.length - 1 ? 'is-latest' : ''}">
      <span class="report-timeline-icon" aria-hidden="true">${icon}</span>
      <div class="report-timeline-content">
        <strong>${escapeHtml(event.title)}</strong>
        ${statusText ? `<span class="report-timeline-status">${escapeHtml(statusText)}</span>` : ''}
        ${event.details ? `<p>${escapeHtml(event.details)}</p>` : ''}
        <small>${escapeHtml(formatDateTime(event.created_at))}${event.actor_name ? ` · Updated by ${escapeHtml(event.actor_name)}` : ''}</small>
      </div>
    </li>`;
  }).join('');

  const etrTime = report.incident?.estimated_restoration || report.estimated_restoration;
  const etrMarkup = isResolved ? `
    <div class="mobile-etr-badge" style="background:#ecfdf5;border:1.5px solid #10b981;border-radius:10px;padding:12px;margin:12px 0;">
      <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#047857;">
        <span>⚡</span>
        <span>${t('etr_label', 'Estimated Restoration (ETR)')}: Restored</span>
      </div>
      <p style="margin:4px 0 0;font-size:0.82rem;color:#065f46;">Power restoration completed and verified.</p>
    </div>` : `
    <div class="mobile-etr-badge" style="background:#eef7ff;border:1.5px solid #0284c7;border-radius:10px;padding:12px;margin:12px 0;">
      <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#0369a1;">
        <span>⏱️</span>
        <span>${t('etr_label', 'Estimated Restoration (ETR)')}: ${etrTime ? formatDateTime(etrTime) : 'No estimate available yet'}</span>
      </div>
      <p style="margin:4px 0 0;font-size:0.82rem;color:#334155;">
        ${escapeHtml(report.incident?.etr_reason || 'An estimate will appear here if authorized staff records one for the linked incident.')}
      </p>
    </div>`;

  const feedbackCardMarkup = isResolved ? `
    <section class="mobile-card" style="border:1.5px solid #10b981;background:#f8fafc;border-radius:12px;padding:16px;margin-top:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <header style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:1.3rem;">⭐</span>
        <h3 style="margin:0;font-size:1rem;color:#0f172a;">${t('rate_service', 'Rate Restoration Service')}</h3>
      </header>
      <p style="margin:0 0 12px 0;font-size:0.85rem;color:#475569;">${t('power_restored_q', 'Was electrical power restored at your residence?')}</p>
      <form class="mobile-form" data-form="citizen-report-feedback" data-report-id="${report.id}" data-incident-id="${report.incident_id || ''}">
        <div style="display:flex;gap:16px;margin-bottom:12px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:0.88rem;cursor:pointer;font-weight:600;color:#059669;">
            <input type="radio" name="restoration_confirmed" value="1" checked> ${t('yes_restored', 'Yes, Power Restored')}
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:0.88rem;cursor:pointer;font-weight:600;color:#dc2626;">
            <input type="radio" name="restoration_confirmed" value="0"> ${t('not_yet', 'Not Yet Restored')}
          </label>
        </div>
        <div class="feedback-star-control" style="margin-bottom:10px;">
          <span style="font-size:0.85rem;font-weight:600;color:#334155;margin-bottom:4px;display:block;">Satisfaction Rating:</span>
          <div class="feedback-stars" role="group" aria-label="Choose a rating">
            ${[1, 2, 3, 4, 5].map((rating) => `<button type="button" class="feedback-star ${rating <= (state.citizenRating || 5) ? 'selected' : ''}" data-action="citizen-feedback-star" data-value="${rating}" aria-label="${rating} star${rating === 1 ? '' : 's'}">★</button>`).join('')}
          </div>
          <input type="hidden" name="rating" value="${state.citizenRating || 5}">
        </div>
        <label style="margin-bottom:12px;display:block;">
          <textarea name="feedback_text" class="input" rows="2" placeholder="${t('comments_optional', 'Additional comments or feedback (optional)…')}" style="width:100%;margin-top:4px;border-radius:8px;font-size:0.85rem;"></textarea>
        </label>
        <button class="button primary block" type="submit" style="background:#059669;border-color:#059669;font-weight:700;">
          ${t('send_feedback', 'Submit Feedback & Rating')}
        </button>
      </form>
    </section>` : '';

  mobileShell(`
    <section class="mobile-card report-detail-card">
      <div class="mobile-detail-top"><span class="mobile-report-pin large">⌖</span><div><strong>${escapeHtml(report.report_code)}</strong><span>${escapeHtml(formatDateTime(report.date_time_noticed))}</span></div>${statusPill(report.status)}</div>
      ${etrMarkup}

      <section class="mobile-report-timeline" aria-labelledby="report-timeline-heading">
        <header><div><span class="report-timeline-eyebrow">REPORT ACTIVITY</span><h3 id="report-timeline-heading">Status timeline</h3></div>${statusPill(report.status)}</header>
        <ol>${timelineMarkup}</ol>
      </section>

      <div class="mobile-detail-row"><strong>Interruption Type</strong><span>${escapeHtml(report.possible_outage_type || 'Power outage')}</span></div>
      <div class="mobile-detail-row"><strong>Barangay</strong><span>${escapeHtml(report.barangay)}</span></div>
      <div class="mobile-detail-row"><strong>Location</strong><span>${escapeHtml(report.location || (hasCoordinates(report) ? `${report.latitude}, ${report.longitude}` : 'Not provided'))}</span></div>
      <div class="mobile-detail-row"><strong>Pin / GPS</strong><span>${hasCoordinates(report) ? `${report.location_source === 'gps' ? 'GPS' : report.location_source === 'map_pin' ? 'Map pin' : 'Source not recorded'} · ${Number(report.latitude).toFixed(5)}, ${Number(report.longitude).toFixed(5)}${report.location_accuracy_m ? ` · ±${Math.round(Number(report.location_accuracy_m))} m` : ''}` : 'Exact location not available'}</span></div>
      <h2>Description</h2><p>${escapeHtml(report.description || '')}</p>
      ${report.remarks ? `<h2>Additional notes</h2><p>${escapeHtml(report.remarks)}</p>` : ''}
      ${report.staff_remarks ? `<h2>Review update</h2><p>${escapeHtml(report.staff_remarks)}</p>` : ''}
      ${report.attachments?.length ? `<h2>Attachments</h2><div class="report-attachment-previews">${report.attachments.map((attachment) => attachment.mime_type.startsWith('video/')
        ? `<video src="${escapeHtml(attachment.file_path)}" controls aria-label="${escapeHtml(attachment.original_name)}"></video>`
        : `<img src="${escapeHtml(attachment.file_path)}" alt="${escapeHtml(attachment.original_name)}">`).join('')}</div>`
        : report.photo_path ? `<h2>Attachments</h2><img class="mobile-report-photo" src="${escapeHtml(report.photo_path)}" alt="Evidence attached to this report">` : ''}
    </section>
    ${feedbackCardMarkup}
  `, {
    activeTab: 'reports',
    subpageHeader: {
      title: 'Report Details',
      backAction: 'back-to-reports',
    },
  });
}

async function renderMobileMap() {
  const [{ incidents }, { scheduled }, { barangays: barangayLocations }, { reports = [] }, { reports: myReports = [] }] = await Promise.all([
    api('/api/incidents'),
    api('/api/scheduled/upcoming'),
    api('/api/barangays/locations'),
    api('/api/reports/map').catch(() => ({ reports: [] })),
    api('/api/reports/mine').catch(() => ({ reports: [] })),
  ]);
  const isHeatmap = state.mobileMapMode === 'heat';
  const isSatellite = state.mobileMapLayer === 'satellite';
  const activeIncidents = incidents.filter((item) => !['Restored', 'Resolved', 'Closed'].includes(item.status));
  const activeIncidentIds = new Set(activeIncidents.map((item) => Number(item.id)));
  const activeUnlinkedReports = (reports || []).filter((item) => !activeIncidentIds.has(Number(item.incident_id)));

  const coordinatesFor = (item) => {
    if (hasCoordinates(item)) return [Number(item.latitude), Number(item.longitude)];
    const barangay = (barangayLocations || []).find((location) => location.name === item.barangay);
    return hasCoordinates(barangay) ? [Number(barangay.latitude), Number(barangay.longitude)] : null;
  };
  const reportCoordinatesFor = (report) => hasCoordinates(report)
    ? [Number(report.latitude), Number(report.longitude)]
    : null;
  const activeMapSignals = [
    ...activeIncidents.map((item) => ({ coordinates: coordinatesFor(item), barangay: item.barangay })),
    ...activeUnlinkedReports.map((item) => ({ coordinates: reportCoordinatesFor(item), barangay: item.barangay })),
  ].filter((item) => item.coordinates);
  const hotspotsByBarangay = [...activeMapSignals.reduce((areas, item) => {
    const name = item.barangay || 'Valencia City';
    const current = areas.get(name) || { count: 0, latitude: 0, longitude: 0 };
    current.count += 1;
    current.latitude += item.coordinates[0];
    current.longitude += item.coordinates[1];
    areas.set(name, current);
    return areas;
  }, new Map()).entries()]
    .map(([barangay, area]) => ({
      barangay,
      count: area.count,
      latitude: area.latitude / area.count,
      longitude: area.longitude / area.count,
    }))
    .sort((a, b) => b.count - a.count || a.barangay.localeCompare(b.barangay));

  const formatEtr = (val) => {
    if (!val) return 'Assessing field repair window';
    const d = new Date(val);
    return isNaN(d) ? String(val) : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getSeverity = (inc) => inc.severity || (String(inc.incident_type || '').includes('Line Down') ? 'Critical' : String(inc.incident_type || '').includes('Total') ? 'High' : 'Moderate');
  const getSeverityStyle = (sev) => {
    if (sev === 'Critical') return 'background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;';
    if (sev === 'High') return 'background:#fff7ed;color:#ea580c;border:1px solid #fdba74;';
    if (sev === 'Moderate') return 'background:#fefce8;color:#ca8a04;border:1px solid #fde047;';
    return 'background:#f0fdf4;color:#16a34a;border:1px solid #86efac;';
  };

  const legendMarkup = isHeatmap ? `
    <div class="mobile-map-legend" style="display:flex;align-items:center;gap:10px;">
      <span style="font-weight:700;color:#c93b2b;">🔥 Outage Density:</span>
      <span class="heatmap-gradient-bar" style="width:110px;height:8px;display:inline-block;" aria-hidden="true"></span>
      <span style="font-size:0.72rem;color:#64748b;">Cool = fewer nearby records · Hot = more</span>
    </div>
  ` : `
    <div class="mobile-map-legend" style="display:flex;flex-wrap:wrap;gap:8px 12px;font-size:0.75rem;">
      <span><i class="legend-dot red"></i>Active Incident</span>
      <span><i class="legend-dot orange"></i>My Report / Submitted</span>
      <span><i class="legend-dot blue"></i>Scheduled</span>
    </div>
  `;

  mobileShell(`
    ${mobileHero('Power Outage Map', 'Explore active interruptions, your submitted reports, and maintenance across Valencia City.')}

    <div class="mobile-map-controls" style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center;">
      <div class="mobile-segments" role="group" aria-label="Map display mode" style="flex:1;min-width:180px;margin-bottom:0;">
        <button type="button" class="mobile-segment ${!isHeatmap ? 'active' : ''}" data-action="set-mobile-map-mode" data-value="pins" aria-pressed="${!isHeatmap}">📍 Outage Pins</button>
        <button type="button" class="mobile-segment ${isHeatmap ? 'active' : ''}" data-action="set-mobile-map-mode" data-value="heat" aria-pressed="${isHeatmap}">🔥 Hotspot Heatmap</button>
      </div>
      <div class="mobile-segments" role="group" aria-label="Base map layer" style="margin-bottom:0;">
        <button type="button" class="mobile-segment ${!isSatellite ? 'active' : ''}" data-action="set-mobile-map-layer" data-value="street" title="Roads and place labels for finding an area" aria-pressed="${!isSatellite}">🗺️ Street</button>
        <button type="button" class="mobile-segment ${isSatellite ? 'active' : ''}" data-action="set-mobile-map-layer" data-value="satellite" title="Aerial imagery and road labels for field context" aria-pressed="${isSatellite}">🛰️ Satellite</button>
      </div>
    </div>
    <p class="mobile-map-help">${isHeatmap
      ? `Heat shows ${activeMapSignals.length} mapped active incidents and open reports not yet linked to an incident. Scheduled outages are excluded. Choose a barangay below to zoom in.`
      : 'Tap a pin for its status and location details. Your reports include verification and repair information; incident pins open outage details.'}</p>
    <p class="mobile-map-help">Street map emphasizes roads and place labels for locating an area; it is not 360-degree Street View. Satellite view adds aerial context and road labels; imagery is not live outage evidence.</p>
    ${legendMarkup}
    <div class="community-map" id="community-map" aria-label="Map of Valencia City outages"></div>
    ${isHeatmap ? `<section class="mobile-card map-hotspot-list">
      <header class="mobile-card-head"><h2>Active outage hotspots</h2><span>${activeMapSignals.length} mapped records</span></header>
      <div class="mobile-card-body">${hotspotsByBarangay.length ? hotspotsByBarangay.slice(0, 6).map((area) => `
        <button type="button" class="map-hotspot-row" data-action="focus-community-map" data-lat="${area.latitude}" data-lng="${area.longitude}">
          <span><strong>${escapeHtml(area.barangay)}</strong><small>Tap to focus map</small></span>
          <b>${area.count} active record${area.count === 1 ? '' : 's'}</b>
        </button>`).join('') : '<p class="muted small">No active outage records with mappable locations are available.</p>'}</div>
    </section>` : ''}

    ${myReports.length ? `
    <section class="mobile-card" style="border:1.5px solid #fed7aa;background:#fffaf5;">
      <header class="mobile-card-head" style="border-bottom:1px solid #ffedd5;">
        <h2 style="color:#c2410c;">📌 My Submitted Reports (${myReports.length})</h2>
        <button class="link-button" data-mobile-tab="reports">View all</button>
      </header>
      <div class="mobile-card-body">
        ${myReports.map((item) => {
          const coords = reportCoordinatesFor(item);
          const isDispatched = item.repair_status && item.repair_status !== 'Pending Assignment';
          return `
            <div class="mobile-list-item" style="flex-wrap:wrap;gap:8px;padding:12px 10px;border-bottom:1px solid #ffedd5;">
              <div class="mobile-list-main" style="flex:1;min-width:180px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                  <strong style="color:#ea580c;font-size:0.92rem;">${escapeHtml(item.report_code)}</strong>
                  <span class="pill pill-neutral" style="font-size:0.7rem;">${escapeHtml(item.possible_outage_type || 'Power Outage')}</span>
                </div>
                <div style="font-size:0.83rem;color:#334155;">📍 <strong>Brgy. ${escapeHtml(item.barangay)}</strong>${item.purok ? ` · <span style="color:#0284c7;font-weight:600;">${escapeHtml(item.purok)}</span>` : ''}</div>
                ${isDispatched ? `<div style="font-size:0.78rem;color:#0284c7;font-weight:700;margin-top:2px;">🛠️ Crew: ${escapeHtml(item.assigned_team_name || 'Assigned')} (${escapeHtml(item.repair_status)})</div>` : ''}
              </div>
              ${statusPill(item.status)}
              <div style="display:flex;gap:6px;width:100%;margin-top:6px;">
                <button type="button" class="button ghost small" data-action="view-my-report" data-id="${item.id}">Details ›</button>
                ${coords ? `<button type="button" class="button small" data-action="focus-community-map" data-lat="${coords[0]}" data-lng="${coords[1]}" style="background:#ea580c;color:#fff;border-radius:8px;font-weight:600;">📍 Focus on Map</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>
    ` : ''}

    <section class="mobile-card"><header class="mobile-card-head"><h2>Active Outages</h2><button class="link-button" data-mobile-tab="outages">View all</button></header>
      <div class="mobile-card-body">${incidents.length ? incidents.map((incident) => {
        const coords = coordinatesFor(incident);
        return `
          <div class="mobile-list-item" style="flex-wrap:wrap;gap:8px;padding:12px 10px;border-bottom:1px solid #f1f5f9;">
            <div class="mobile-list-main" style="flex:1;min-width:180px;">
              <strong>${escapeHtml(incident.title)}</strong>
              <span>📍 ${escapeHtml((incident.affected_barangays || [incident.barangay]).join(', '))}</span>
            </div>
            ${statusPill(incident.status)}
            <div style="display:flex;gap:6px;width:100%;margin-top:6px;">
              <button type="button" class="button ghost small" data-action="view-incident-details" data-id="${incident.id}">Details ›</button>
              ${coords ? `<button type="button" class="button small" data-action="focus-community-map" data-lat="${coords[0]}" data-lng="${coords[1]}" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;border-radius:8px;font-weight:600;">📍 Focus on Map</button>` : ''}
            </div>
          </div>
        `;
      }).join('') : '<p class="muted small">No active outage locations are available.</p>'}</div>
    </section>
    <section class="mobile-card"><header class="mobile-card-head"><h2>Scheduled Outages</h2><button class="link-button" data-mobile-tab="scheduled">View all</button></header>
      <div class="mobile-card-body">${scheduled.length ? scheduled.slice(0, 3).map((item) => `
        <div class="mobile-list-item"><div class="mobile-list-main"><strong>${escapeHtml(item.barangay)}</strong><span>${escapeHtml(formatSystemDate(item.outage_date))} · ${escapeHtml(String(item.start_time || '').slice(0, 5))}</span></div>${statusPill(item.status)}<button type="button" class="link-button" data-action="view-schedule-details" data-id="${item.id}" aria-label="View scheduled outage details">›</button></div>
      `).join('') : '<p class="muted small">No upcoming scheduled outages.</p>'}</div>
    </section>
  `, { activeTab: 'map' });

  const mapElement = document.getElementById('community-map');
  if (!mapElement) return;
  await ensureLeaflet();

  state.communityOutageMap?.remove();
  const map = L.map(mapElement, {
    zoomControl: false,
    minZoom: 11,
    maxZoom: 18,
    maxBounds: [[7.6, 124.8], [8.2, 125.4]],
  }).setView([7.9064, 125.0941], 13.5);
  state.communityOutageMap = map;

  if (isSatellite) {
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      maxNativeZoom: 18,
      attribution: 'Tiles &copy; Esri',
    }).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      maxNativeZoom: 18,
      opacity: 0.95,
      attribution: 'Labels &copy; Esri',
    }).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      maxNativeZoom: 18,
      opacity: 0.85,
      attribution: 'Roads &copy; Esri',
    }).addTo(map);
  } else {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc',
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
  }

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  if (isHeatmap) {
    const heatPoints = activeMapSignals.map(({ coordinates }) => [coordinates[0], coordinates[1], 1]);
    if (typeof L.heatLayer === 'function' && heatPoints.length) {
      L.heatLayer(heatPoints, {
        radius: 30,
        blur: 18,
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
      }).addTo(map);
    }
  } else {
    // 1. Plot user's own reports with prominent amber/orange markers
    myReports.forEach((myRep) => {
      const coordinates = reportCoordinatesFor(myRep);
      if (!coordinates) return;
      const isResolved = myRep.status === 'Resolved';
      const isProgress = myRep.status === 'In Progress' || ['Team Dispatched', 'En Route', 'Arrived On Site', 'In Progress'].includes(myRep.repair_status);
      const markerColor = isResolved ? '#16a34a' : isProgress ? '#f59e0b' : '#ea580c';

      const myPopupHtml = `
        <div class="map-popup-card">
          <div class="map-popup-header">
            <span class="map-popup-code" style="background:#fef3c7;color:#b45309;border:1px solid #fde68a;">📌 MY REPORT</span>
            <span class="map-popup-badge" style="background:#fff7ed;color:#c2410c;border:1px solid #ffedd5;">${escapeHtml(myRep.status)}</span>
          </div>
          <h4 class="map-popup-title">📍 ${escapeHtml(myRep.report_code)} · ${escapeHtml(myRep.possible_outage_type || 'Power Outage')}</h4>
          <div class="map-popup-meta">
            <div class="map-popup-row">
              <span class="map-popup-icon">🏛️</span>
              <span><strong>Brgy. ${escapeHtml(myRep.barangay || 'Valencia City')}</strong></span>
            </div>
            <div class="map-popup-row">
              <span class="map-popup-icon">🎯</span>
              <span>${myRep.location_source === 'gps' ? 'GPS location' : myRep.location_source === 'map_pin' ? 'User-placed map pin' : 'Location source not recorded'}${myRep.location_accuracy_m ? ` · ±${Math.round(Number(myRep.location_accuracy_m))} m reported GPS accuracy` : ''}</span>
            </div>
            ${myRep.purok || myRep.affected_area ? `
            <div class="map-popup-row">
              <span class="map-popup-icon">📍</span>
              <span>Purok/Area: <strong style="color:#0284c7;">${escapeHtml(myRep.purok || myRep.affected_area)}</strong></span>
            </div>` : ''}
            <div class="map-popup-row">
              <span class="map-popup-icon">✅</span>
              <span>Verification: <strong>${escapeHtml(myRep.verification_status || 'Pending')}</strong></span>
            </div>
            <div class="map-popup-row">
              <span class="map-popup-icon">🛠️</span>
              <span>Repair Status: <strong style="color:${isProgress ? '#d97706' : isResolved ? '#16a34a' : '#64748b'};">${escapeHtml(myRep.repair_status || 'Pending Assignment')}</strong></span>
            </div>
            ${myRep.assigned_team_name ? `
            <div class="map-popup-row">
              <span class="map-popup-icon">🚚</span>
              <span>Assigned Crew: <strong style="color:#2563eb;">${escapeHtml(myRep.assigned_team_name)}</strong></span>
            </div>` : ''}
            <div class="map-popup-row">
              <span class="map-popup-icon">🕒</span>
              <span>Reported: ${escapeHtml(formatDate(myRep.reported_at))}</span>
            </div>
          </div>
          <button type="button" class="map-popup-btn" style="background:#ea580c;color:#fff;" data-action="view-my-report" data-id="${myRep.id}">Track My Report Details ›</button>
        </div>
      `;

      L.circleMarker(coordinates, {
        radius: 11,
        color: '#ffffff',
        fillColor: markerColor,
        fillOpacity: 1.0,
        weight: 3.5,
      }).addTo(map).bindPopup(myPopupHtml, { maxWidth: 290 });
    });

    // 2. Plot community reports not in user's reports
    (reports || []).filter((r) => !myReports.some((m) => m.id === r.id)).forEach((rep) => {
      const coordinates = reportCoordinatesFor(rep);
      if (!coordinates) return;
      const isProgress = rep.status === 'In Progress' || ['Team Dispatched', 'En Route', 'Arrived On Site'].includes(rep.repair_status);
      const markerColor = isProgress ? '#f59e0b' : '#f97316';

      const repPopupHtml = `
        <div class="map-popup-card">
          <div class="map-popup-header">
            <span class="map-popup-code">${escapeHtml(rep.report_code)}</span>
            <span class="map-popup-badge" style="background:#fff7ed;color:#ea580c;border:1px solid #fdba74;">${escapeHtml(rep.status)}</span>
          </div>
          <h4 class="map-popup-title">⚡ ${escapeHtml(rep.possible_outage_type || 'Reported Outage')}</h4>
          <div class="map-popup-meta">
            <div class="map-popup-row">
              <span class="map-popup-icon">📍</span>
              <span><strong>Brgy. ${escapeHtml(rep.barangay || 'Valencia')}</strong>${rep.purok ? ` · ${escapeHtml(rep.purok)}` : ''}</span>
            </div>
            ${rep.assigned_team_name ? `
            <div class="map-popup-row">
              <span class="map-popup-icon">🛠️</span>
              <span>Crew: <strong style="color:#0284c7;">${escapeHtml(rep.assigned_team_name)}</strong></span>
            </div>` : ''}
            <div class="map-popup-row">
              <span class="map-popup-icon">🔄</span>
              <span>Status: <strong>${escapeHtml(rep.repair_status || rep.status)}</strong></span>
            </div>
            <div class="map-popup-row">
              <span class="map-popup-icon">✅</span>
              <span>Verification: <strong>${escapeHtml(rep.verification_status || 'Pending')}</strong></span>
            </div>
          </div>
        </div>
      `;

      L.circleMarker(coordinates, {
        radius: 8,
        color: '#ffffff',
        fillColor: markerColor,
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map).bindPopup(repPopupHtml, { maxWidth: 270 });
    });

    // 3. Plot active incidents
    activeIncidents.forEach((incident) => {
      const coordinates = coordinatesFor(incident);
      if (!coordinates) return;
      const sev = getSeverity(incident);
      const markerColor = sev === 'Critical' ? '#b91c1c' : '#e11d48';

      const popupHtml = `
        <div class="map-popup-card">
          <div class="map-popup-header">
            <span class="map-popup-code">${escapeHtml(incident.incident_code || 'OUTAGE')}</span>
            <span class="map-popup-badge" style="${getSeverityStyle(sev)}">${escapeHtml(sev)}</span>
          </div>
          <h4 class="map-popup-title">⚡ ${escapeHtml(incident.title)}</h4>
          <div class="map-popup-meta">
            <div class="map-popup-row">
              <span class="map-popup-icon">📍</span>
              <span><strong>${escapeHtml(incident.barangay || 'Valencia City')}</strong></span>
            </div>
            <div class="map-popup-row">
              <span class="map-popup-icon">⏳</span>
              <span><strong>Estimated Restoration:</strong> <span style="color:#0284c7;font-weight:600;">${escapeHtml(formatEtr(incident.estimated_restoration_time))}</span></span>
            </div>
            <div class="map-popup-row">
              <span class="map-popup-icon">🔄</span>
              <span>Status: <strong style="color:${incident.status === 'Restored' ? '#22c55e' : '#ef4444'}">${escapeHtml(incident.status)}</strong></span>
            </div>
          </div>
          <button type="button" class="map-popup-btn" style="background:#0284c7;color:#fff;" data-action="view-incident-details" data-id="${incident.id}">View Outage Details ›</button>
        </div>
      `;

      L.circleMarker(coordinates, {
        radius: 9,
        color: '#ffffff',
        fillColor: markerColor,
        fillOpacity: 0.95,
        weight: 2.5
      }).addTo(map).bindPopup(popupHtml, { maxWidth: 280 });
    });

    // 4. Plot scheduled outages
    scheduled.forEach((item) => {
      const coordinates = coordinatesFor(item);
      if (!coordinates) return;

      const schedPopupHtml = `
        <div class="map-popup-card">
          <div class="map-popup-header">
            <span class="map-popup-code">${escapeHtml(item.schedule_code || 'SCHEDULED')}</span>
            <span class="map-popup-badge" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;">Scheduled</span>
          </div>
          <h4 class="map-popup-title">${escapeHtml(item.title || 'Planned Maintenance')}</h4>
          <div class="map-popup-meta">
            <div class="map-popup-row">
              <span class="map-popup-icon">📍</span>
              <span><strong>${escapeHtml(item.barangay)}</strong></span>
            </div>
            <div class="map-popup-row">
              <span class="map-popup-icon">📅</span>
              <span>${escapeHtml(formatSystemDate(item.outage_date))} (${escapeHtml(String(item.start_time || '').slice(0, 5))} - ${escapeHtml(String(item.expected_end_time || item.end_time || '').slice(0, 5))})</span>
            </div>
            ${item.reason ? `<div class="map-popup-row"><span class="map-popup-icon">ℹ️</span><span>${escapeHtml(item.reason)}</span></div>` : ''}
          </div>
          <button type="button" class="map-popup-btn sched" data-action="view-schedule-details" data-id="${item.id}">View Schedule Details ›</button>
        </div>
      `;

      L.circleMarker(coordinates, { radius: 9, color: '#fff', fillColor: '#0284c7', fillOpacity: 0.95, weight: 2.5 })
        .addTo(map).bindPopup(schedPopupHtml, { maxWidth: 280 });
    });
  }
  window.requestAnimationFrame(() => map.invalidateSize());
}

function filterMobileNotifications(notifications) {
  const preferences = readNotificationPreferences();
  return notifications.filter((notice) => {
    if (notice.type === 'report') return preferences.reportUpdates;
    if (notice.type === 'incident') return preferences.outageAlerts;
    if (notice.type === 'scheduled') return preferences.scheduledOutages;
    if (notice.type === 'announcement') return preferences.announcements;
    return preferences.general;
  });
}

async function renderMobileNotifications() {
  const { notifications } = await api('/api/notifications');
  const visibleNotifications = filterMobileNotifications(notifications);
  state.mobileNotifications = visibleNotifications;
  mobileShell(`
    ${mobileHero('Notifications', 'Updates about your reports, power advisories, and outages.')}
    <div class="mobile-notification-full-wrap">
      ${mobileCard('Alerts & Updates', visibleNotifications.length ? visibleNotifications.map((notice) => `
        <article class="mobile-notification-full-row ${notice.read ? 'read' : 'unread'}">
          <span class="mobile-notif-type-icon ${escapeHtml(notice.type || 'general')}">
            ${notificationTypeIcon(notice.type)}
          </span>
          <button type="button" class="mobile-notif-full-main" data-action="view-notification" data-id="${notice.id}">
            <div class="notif-item-top">
              <strong class="notif-item-title">${escapeHtml(notice.title)}</strong>
              <time class="notif-item-time">${escapeHtml(formatRelativeTime(notice.created_at))}</time>
            </div>
            <p class="notif-full-msg">${escapeHtml(notice.message || '')}</p>
          </button>
          <div class="notif-item-actions">
            ${!notice.read ? `
              <button type="button" class="mobile-notification-preview-read" data-action="mark-mobile-notification-read" data-id="${notice.id}" aria-label="Mark ${escapeHtml(notice.title)} as read" title="Mark as read">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </button>
            ` : `
              <span class="notif-item-read-icon" title="Read" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </span>
            `}
          </div>
        </article>
      `).join('') : '<p class="muted small" style="text-align: center; padding: 24px 0;">No notifications found.</p>',
      visibleNotifications.some((notice) => !notice.read) ? '<button class="link-button" data-action="mark-all-read">Mark all as read</button>' : '')}
    </div>
  `, {
    showTabs: false,
    subpageHeader: {
      title: 'Notifications',
      backAction: 'back-home',
      rightAction: `<button type="button" class="mobile-bell" data-action="open-notification-settings" aria-label="Notification Preferences" title="Notification Preferences">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>`,
    },
  });
}

async function renderMobileScheduled() {
  const allSchedules = Boolean(state.mobileScheduleAll);
  const { scheduled } = await api(allSchedules ? '/api/scheduled' : '/api/scheduled/upcoming');
  mobileShell(`
    <div class="mobile-segments"><button class="mobile-segment ${allSchedules ? '' : 'active'}" data-action="show-upcoming-schedules">Upcoming</button><button class="mobile-segment ${allSchedules ? 'active' : ''}" data-action="show-all-schedules">All</button></div>
    ${scheduled.length ? scheduled.map((item) => `
      <section class="mobile-outage-card"><header><div><h3>${escapeHtml(item.barangay)}</h3><p>${escapeHtml(formatSystemDate(item.outage_date))} · ${escapeHtml(String(item.start_time || '').slice(0, 5))}–${escapeHtml(String(item.expected_end_time || '').slice(0, 5) || '?')}</p></div>${statusPill(item.status)}</header>
      <p>${escapeHtml(item.reason || item.title || 'Scheduled maintenance')}</p><button type="button" class="button ghost block" data-action="view-schedule-details" data-id="${item.id}">View Details</button></section>
    `).join('') : `<div class="mobile-card">${emptyState('No scheduled outages', 'There are no upcoming interruptions announced.', '🗓')}</div>`}
  `, {
    activeTab: 'home',
    showTabs: true,
    subpageHeader: {
      title: 'Scheduled Outages',
      backAction: 'back-home',
    },
  });
}

async function renderMobileHistory() {
  const filter = state.mobileHistoryFilter || 'all';
  const [{ history }, { scheduled: cancelled }] = await Promise.all([
    api('/api/history'),
    filter === 'all' || filter === 'cancelled' ? api('/api/scheduled?status=Cancelled') : Promise.resolve({ scheduled: [] }),
  ]);
  const completedItems = history.map((item) => ({
    ...item,
    historyCode: item.incident_code,
    historyDate: item.start_time,
    historyStatus: 'Resolved',
    historyDuration: item.duration_display || 'Duration unavailable',
  }));
  const cancelledItems = cancelled.map((item) => ({
    ...item,
    historyCode: item.schedule_code,
    historyDate: item.outage_date,
    historyStatus: 'Cancelled',
    historyDuration: 'Scheduled outage',
  }));
  const items = filter === 'cancelled' ? cancelledItems
    : filter === 'completed' ? completedItems
      : [...completedItems, ...cancelledItems];
  mobileShell(`
    <div class="mobile-segments"><button class="mobile-segment ${filter === 'all' ? 'active' : ''}" data-action="filter-history" data-value="all">All</button><button class="mobile-segment ${filter === 'completed' ? 'active' : ''}" data-action="filter-history" data-value="completed">Completed</button><button class="mobile-segment ${filter === 'cancelled' ? 'active' : ''}" data-action="filter-history" data-value="cancelled">Cancelled</button></div>
    ${items.length ? items.map((item) => `
      <button type="button" class="mobile-history-item" data-action="${item.historyStatus === 'Cancelled' ? 'view-schedule-details' : 'view-incident-details'}" data-id="${item.id}"><span class="mobile-report-pin">⌖</span><span class="mobile-list-main"><strong>${escapeHtml(item.barangay)}</strong><span>${escapeHtml(item.historyCode)} · ${escapeHtml(item.historyDuration)}</span><span>${escapeHtml(formatDateTime(item.historyDate))}</span></span>${statusPill(item.historyStatus)}</button>
    `).join('') : `<div class="mobile-card">${emptyState('No outage history', 'Resolved and closed outages will appear here.', '↻')}</div>`}
  `, {
    activeTab: 'home',
    showTabs: true,
    subpageHeader: {
      title: 'Outage History',
      backAction: 'back-home',
    },
  });
}

function renderMobileSettings() {
  const chevronSvg = `<svg class="mobile-settings-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0265a8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

  const icons = {
    security: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v2h-2V7zm0 4h2v6h-2v-6z"/></svg>`,
    notifications: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>`,
    location: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
    language: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 00-1.38-3.56A8.03 8.03 0 0118.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 015.08 16zm2.95-8H5.08a7.987 7.987 0 013.7-3.56A15.65 15.65 0 007.4 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 01-3.7 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>`,
    version: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M16.01 7L16 3h-2v4h-4V3H8v4h-.01C6.89 7 6 7.89 6 8.99v5.49L9.5 18v3h5v-3l3.5-3.51v-5.5c0-1.1-.89-2-1.99-2z"/></svg>`,
    support: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
    about: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
    logout: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  };

  mobileShell(`
    <div class="mobile-settings-card">
      <button type="button" class="mobile-settings-row" data-action="open-security">
        <span class="mobile-settings-icon-wrap">${icons.security}</span>
        <span class="mobile-settings-label">Account Security</span>
        ${chevronSvg}
      </button>

      <button type="button" class="mobile-settings-row" data-action="open-notification-settings">
        <span class="mobile-settings-icon-wrap">${icons.notifications}</span>
        <span class="mobile-settings-label">Notifications Settings</span>
        ${chevronSvg}
      </button>

      <button type="button" class="mobile-settings-row" data-action="check-location">
        <span class="mobile-settings-icon-wrap">${icons.location}</span>
        <span class="mobile-settings-label">Location Services</span>
        ${chevronSvg}
      </button>

      <button type="button" class="mobile-settings-row" data-action="open-language-dialog">
        <span class="mobile-settings-icon-wrap">${icons.language}</span>
        <span class="mobile-settings-label">${t('language', 'Language / Pinulongan')}</span>
        <span class="mobile-settings-val-link">${getLanguage() === 'ceb' ? 'Sinugbuanong Binisaya 🇵🇭' : 'English 🇺🇸'} ${chevronSvg}</span>
      </button>

      <button type="button" class="mobile-settings-row static" data-action="show-version-info">
        <span class="mobile-settings-icon-wrap">${icons.version}</span>
        <span class="mobile-settings-label">${t('app_version', 'App Version')}</span>
        <span class="mobile-settings-version">v1.0.0</span>
      </button>

      <button type="button" class="mobile-settings-row" data-action="show-support">
        <span class="mobile-settings-icon-wrap">${icons.support}</span>
        <span class="mobile-settings-label">${t('help_support', 'Help & Support')}</span>
        ${chevronSvg}
      </button>

      <button type="button" class="mobile-settings-row" data-action="show-about">
        <span class="mobile-settings-icon-wrap">${icons.about}</span>
        <span class="mobile-settings-label">${t('about_powerwatch', 'About Valencia PowerWatch')}</span>
        ${chevronSvg}
      </button>
    </div>

    <button type="button" class="mobile-logout-pill-btn" data-action="logout">
      ${icons.logout}
      <span>${t('logout', 'Log Out')}</span>
    </button>
  `, {
    activeTab: 'profile',
    showTabs: false,
    subpageHeader: {
      title: t('settings', 'Settings'),
      backAction: 'back-to-profile',
    },
  });
}

function renderMobileNotificationSettings() {
  const preferences = readNotificationPreferences();
  const options = [
    ['reportUpdates', 'Report status updates', 'Reviews, verification, and resolution of your reports.'],
    ['outageAlerts', 'Outage alerts', 'Active outages and restoration progress.'],
    ['scheduledOutages', 'Scheduled outages', 'Planned service interruptions and schedule changes.'],
    ['announcements', 'Announcements', 'Community advisories and service notices.'],
    ['general', 'General updates', 'Other account and system notifications.'],
  ];
  mobileShell(`
    <form class="notification-preferences-list" data-form="notification-preferences">
      <div class="mobile-settings-card">
        ${options.map(([name, label, description]) => `
          <label class="notification-preference-row">
            <span><strong>${label}</strong><small>${description}</small></span>
            <input type="checkbox" name="${name}" ${preferences[name] ? 'checked' : ''}>
          </label>
        `).join('')}
      </div>
      <button class="button primary block" type="submit" style="margin-top:16px;">Save Preferences</button>
    </form>
  `, {
    activeTab: 'profile',
    showTabs: false,
    subpageHeader: {
      title: 'Notifications Settings',
      backAction: 'back-to-settings',
    },
  });
}
