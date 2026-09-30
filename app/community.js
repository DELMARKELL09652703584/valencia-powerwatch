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
    key: 'notifications',
    label: 'Notifications',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
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
        <div class="mobile-header-right">
          ${subpageHeader.rightAction || ''}
        </div>
      </header>`;
  } else if (homeHeader) {
    headerMarkup = `
      <header class="mobile-header mobile-home-header">
        <div class="mobile-home-identity">
          ${user.profile_photo_path ? `<img class="dashboard-avatar" src="${escapeHtml(user.profile_photo_path)}" alt="">` : `<span class="dashboard-avatar">${escapeHtml((user.full_name || '?').charAt(0).toUpperCase())}</span>`}
          <span class="mobile-home-greeting"><span>${greeting}</span><strong>${escapeHtml(user.full_name || 'Resident')}</strong></span>
        </div>
        <button class="mobile-bell" data-mobile-tab="notifications" aria-label="Notifications${unread ? `, ${unread} unread` : ''}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          ${unread ? '<span class="mobile-bell-dot"></span>' : ''}
        </button>
      </header>`;
  } else {
    headerMarkup = `
      <header class="mobile-header">
        <div class="mobile-header-brand">
          ${info.logoData ? `<img class="mobile-logo" src="${escapeHtml(info.logoData)}" alt="System logo">` : '<img class="mobile-logo" src="/assets/powerwatch-logo.svg" alt="Valencia PowerWatch logo">'}
          <div><strong>Valencia</strong><b>PowerWatch</b></div>
        </div>
        <button class="mobile-bell" data-mobile-tab="notifications" aria-label="Notifications${unread ? `, ${unread} unread` : ''}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          ${unread ? '<span class="mobile-bell-dot"></span>' : ''}
        </button>
      </header>`;
  }

  app.innerHTML = `<div class="mobile-shell">
    ${statusBarMarkup}
    ${headerMarkup}
    <main class="mobile-content ${subpageHeader ? 'mobile-content-subpage' : ''}" id="mobile-content">${content}</main>
    ${showTabs ? `<nav class="mobile-tabs">${MOBILE_TABS.map((tab) => `<button class="mobile-tab ${activeTab === tab.key ? 'active' : ''}" data-mobile-tab="${tab.key}">
      <span class="mobile-tab-icon">${tab.icon}</span><span>${escapeHtml(tab.label)}</span>
    </button>`).join('')}</nav>` : ''}
  </div>
  ${dialogMarkup()}
  <div class="toast" role="status" hidden></div>`;
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
  const [{ stats }, { notifications }] = await Promise.all([
    api('/api/analytics/dashboard'),
    api('/api/notifications'),
  ]);
  state.mobileNotifications = notifications;
  const dashboardCards = [
    { label: 'Active Outages', value: stats.active_incidents, icon: '🔔', tone: 'danger', tab: 'outages' },
    { label: 'Pending Reports', value: stats.reports_pending, icon: '▣', tone: 'warning', action: 'dashboard-pending-reports' },
    { label: 'Resolved Today', value: stats.resolved_today, icon: '⬡', tone: 'success', tab: 'history' },
    { label: 'Total Reports', value: stats.reports_total, icon: '✦', tone: 'primary', tab: 'reports' },
  ];
  const updates = notifications.slice(0, 3);

  mobileShell(`
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
    <section class="recent-updates">
      <header class="recent-updates-head"><h2>Recent Updates</h2><button type="button" class="link-button" data-mobile-tab="notifications">View All</button></header>
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
      }).join('') : `<p class="recent-updates-empty">No recent updates.</p>`}
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
  const types = activeOutageTypes();
  const draft = state.mobileReportDraft || {};
  const step = state.mobileReportStep || 1;
  const locationMode = state.mobileLocationMode || 'map';
  const attachments = draft.attachments || [];
  const stepNames = ['Location', 'Details', 'Evidence', 'Review'];
  const stepper = `<div class="stepper">${stepNames.map((name, index) => `
    <div class="step ${step === index + 1 ? 'active' : ''} ${step > index + 1 ? 'complete' : ''}"><span class="step-number">${step > index + 1 ? '✓' : index + 1}</span><span>${name}</span></div>
  `).join('')}</div>`;
  const hidden = ['barangay', 'location', 'affected_area', 'date_time_noticed', 'possible_outage_type', 'description', 'latitude', 'longitude', 'remarks']
    .map((name) => `<input type="hidden" name="${name}" value="${escapeHtml(draft[name] || '')}">`).join('');
  let formBody = '';

  if (step === 1) {
    formBody = `<h2>Location</h2>
      <p class="report-step-hint">Pin the outage on the map or enter its address.</p>
      <div class="mobile-segments report-location-modes" role="group" aria-label="Location method">
        <button type="button" class="mobile-segment ${locationMode === 'map' ? 'active' : ''}" data-action="set-report-location-mode" data-value="map">Map</button>
        <button type="button" class="mobile-segment ${locationMode === 'address' ? 'active' : ''}" data-action="set-report-location-mode" data-value="address">Address</button>
      </div>
      <label>Search barangay<input type="search" name="barangay" list="report-barangay-options" data-location-search placeholder="Search barangay..." value="${escapeHtml(draft.barangay || state.user.barangay || '')}" required></label>
      <datalist id="report-barangay-options">${state.barangays.map((barangay) => `<option value="${escapeHtml(barangay)}">`).join('')}</datalist>
      ${locationMode === 'map' ? '<div class="report-location-map" id="report-location-map" aria-label="Tap to select outage location"></div>' : ''}
      <label>${locationMode === 'map' ? 'Selected coordinates' : 'Street address or landmark'}<input name="location" value="${escapeHtml(draft.location || '')}" placeholder="${locationMode === 'map' ? 'Tap the map to place a pin' : 'Purok, street, or nearby landmark'}" ${locationMode === 'map' ? 'readonly' : ''} required></label>
      <div class="mobile-gps">
        <button type="button" class="button ghost block" data-action="capture-gps">📍 Use current location</button>
        <input type="hidden" name="latitude" data-gps="latitude" value="${escapeHtml(draft.latitude || '')}">
        <input type="hidden" name="longitude" data-gps="longitude" value="${escapeHtml(draft.longitude || '')}">
        <span class="muted small" data-gps="status">${draft.latitude ? `Location attached: ${escapeHtml(draft.latitude)}, ${escapeHtml(draft.longitude)}` : 'Choose a map point or use GPS'}</span>
      </div>
      <button type="button" class="button primary block" data-action="next-report-step">Next</button>`;
  } else if (step === 2) {
    formBody = `<h2>Interruption Details</h2>
      <label>Affected area<input name="affected_area" value="${escapeHtml(draft.affected_area || '')}" placeholder="Nearby streets or sitios"></label>
      <label>Date and time noticed<input type="datetime-local" name="date_time_noticed" value="${escapeHtml(draft.date_time_noticed || toLocalInputValue(new Date()))}" required></label>
      <label>Interruption type<select name="possible_outage_type"><option value="">Select a type</option>${types.map((type) => `<option ${draft.possible_outage_type === type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select></label>
      <label>Description<textarea name="description" rows="4" placeholder="Describe what happened" required>${escapeHtml(draft.description || '')}</textarea></label>
      <label>Additional remarks (optional)<textarea name="remarks" rows="2">${escapeHtml(draft.remarks || '')}</textarea></label>
      <div class="dual-action-row"><button type="button" class="button ghost" data-action="previous-report-step">Back</button><button type="button" class="button primary" data-action="next-report-step">Next</button></div>`;
  } else if (step === 3) {
    formBody = `<h2>Add Evidence</h2>
      <p class="report-step-hint">Upload up to five photos or MP4 videos (10 MB each).</p>
      <div class="report-attachment-previews">${attachments.map((attachment, index) => `
        <div class="report-attachment-preview">
          ${attachment.type.startsWith('video/')
            ? `<video src="${escapeHtml(attachment.data)}" controls aria-label="${escapeHtml(attachment.name)}"></video>`
            : `<img src="${escapeHtml(attachment.data)}" alt="${escapeHtml(attachment.name)}">`}
          <button type="button" data-action="remove-report-attachment" data-index="${index}" aria-label="Remove ${escapeHtml(attachment.name)}">×</button>
          <span>${escapeHtml(attachment.name)}</span>
        </div>`).join('')}</div>
      <label class="mobile-photo-field">Add photos or videos<input type="file" name="attachments" accept="image/jpeg,image/png,video/mp4" multiple></label>
      <div id="resident-evidence-preview" class="mobile-photo-preview"></div>
      <p class="muted small">Supported: JPG, PNG, MP4. Up to five files, 10 MB each.</p>
      <div class="dual-action-row"><button type="button" class="button ghost" data-action="previous-report-step">Back</button><button type="button" class="button primary" data-action="next-report-step">Next</button></div>`;
  } else {
    formBody = `<h2>Review Your Report</h2>
      <div class="review-list">
        <div class="review-item"><span class="review-label">Interruption Type</span><span class="review-value">${escapeHtml(draft.possible_outage_type || 'Power interruption')}</span></div>
        <div class="review-item"><span class="review-label">Barangay</span><span class="review-value">${escapeHtml(draft.barangay || '')}</span></div>
        <div class="review-item"><span class="review-label">Location</span><span class="review-value">${escapeHtml(draft.location || '')}</span></div>
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
    ${mobileHero('Report Power Interruption', 'Share accurate details so your report can be verified.')}
    ${stepper}
    <form class="mobile-form report-step-form" data-form="report" ${step === 4 ? 'hidden' : ''}>${step === 4 ? '' : formBody}</form>
    ${step === 4 ? formBody : ''}
  `, { activeTab: 'reports' });

  if (state.reportLocationMap) {
    state.reportLocationMap.remove();
    state.reportLocationMap = null;
    state.reportLocationMarker = null;
    state.reportLocationSetPin = null;
  }
  if (step === 1 && locationMode === 'map') {
    await ensureLeaflet();
    const { barangays: locations } = await api('/api/barangays/locations');
    state.barangayLocations = locations;
    const mapElement = document.getElementById('report-location-map');
    if (!mapElement) return;
    const initialBarangay = locations.find((item) => item.name === (draft.barangay || state.user.barangay));
    const map = L.map(mapElement, { zoomControl: false }).setView(
      initialBarangay && hasCoordinates(initialBarangay)
        ? [Number(initialBarangay.latitude), Number(initialBarangay.longitude)]
        : [7.9111239, 125.0933669],
      14,
    );
    state.reportLocationMap = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    const setPin = (latitude, longitude) => {
      const point = [Number(latitude), Number(longitude)];
      if (state.reportLocationMarker) state.reportLocationMarker.setLatLng(point);
      else state.reportLocationMarker = L.marker(point).addTo(map);
      const latitudeInput = document.querySelector('[data-gps="latitude"]');
      const longitudeInput = document.querySelector('[data-gps="longitude"]');
      const locationInput = document.querySelector('input[name="location"]');
      const status = document.querySelector('[data-gps="status"]');
      if (latitudeInput) latitudeInput.value = Number(latitude).toFixed(6);
      if (longitudeInput) longitudeInput.value = Number(longitude).toFixed(6);
      if (locationInput) locationInput.value = `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`;
      if (status) status.textContent = `Pin selected: ${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
    };
    state.reportLocationSetPin = setPin;
    if (draft.latitude && draft.longitude) setPin(draft.latitude, draft.longitude);
    map.on('click', (event) => setPin(event.latlng.lat, event.latlng.lng));
    window.requestAnimationFrame(() => map.invalidateSize());
  }
}

async function moveMobileReportStep(direction) {
  const form = document.querySelector('form[data-form="report"]');
  if (!form) return;
  if (direction > 0 && !form.reportValidity()) return;
  const values = Object.fromEntries([...new FormData(form).entries()].filter(([name, value]) => name !== 'attachments' && !(value instanceof File)));
  const files = [...(form.querySelector('input[name="attachments"]')?.files || [])];
  const currentAttachments = state.mobileReportDraft?.attachments || [];
  if (currentAttachments.length + files.length > 5) throw new Error('You can attach up to five files.');
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'video/mp4'].includes(file.type)) throw new Error('Choose JPG, PNG, or MP4 files.');
    if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} exceeds the 10 MB limit.`);
  }
  const addedAttachments = await Promise.all(files.map(async (file) => ({
    name: file.name,
    type: file.type,
    size: file.size,
    data: await readPhoto(file),
  })));
  state.mobileReportDraft = { ...(state.mobileReportDraft || {}), ...values };
  state.mobileReportDraft.attachments = [...currentAttachments, ...addedAttachments];
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
        <button type="button" class="button ghost block" data-action="view-incident-details" data-id="${i.id}">View Details</button>
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
    ${mobileHero('My Reports', 'Track reports you have submitted and their verification status.')}
    <div class="mobile-report-actions">
      <button class="button primary block" data-action="compose-report">＋ Report an interruption</button>
      <button class="button ghost block" data-mobile-tab="history">View outage history</button>
    </div>
    <div class="mobile-segments" role="group" aria-label="Filter reports">
      ${['', 'pending', 'Verified', 'Resolved'].map((status) => `
        <button class="mobile-segment ${selectedStatus === status ? 'active' : ''}" data-action="filter-my-reports" data-value="${escapeHtml(status)}">${escapeHtml(status === 'pending' ? 'Pending' : status || 'All')}</button>
      `).join('')}
    </div>
    ${reportsForStatus.length ? reportsForStatus.map((report) => `
      <button class="mobile-report-item" data-action="view-my-report" data-id="${report.id}">
        <span class="mobile-report-pin">⌖</span>
        <span class="mobile-report-copy">
          <strong>${escapeHtml(report.report_code)}</strong>
          <span>${escapeHtml(formatDateTime(report.date_time_noticed))}</span>
          <span>${escapeHtml(report.barangay)}</span>
        </span>
        ${statusPill(report.status)}
      </button>
    `).join('') : `<div class="mobile-card">${emptyState('No reports yet', 'Your submitted interruption reports will appear here.', '📝')}</div>`}
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
  const steps = [
    ['Report Submitted', report.reported_at],
    ['Under Verification', ['Under Review', 'Verified', 'Officially Confirmed', 'Resolved'].includes(report.status) ? report.updated_at : null],
    ['Verified', ['Verified', 'Officially Confirmed', 'Resolved'].includes(report.status) ? report.updated_at : null],
    ['In Progress', report.incident?.status === 'Ongoing' || report.incident?.status === 'Restoration in Progress' ? report.updated_at : null],
    ['Resolved', report.status === 'Resolved' || report.incident?.status === 'Closed' ? report.updated_at : null],
  ];
  mobileShell(`
    <section class="mobile-card report-detail-card">
      <div class="mobile-detail-top"><span class="mobile-report-pin large">⌖</span><div><strong>${escapeHtml(report.report_code)}</strong><span>${escapeHtml(formatDateTime(report.date_time_noticed))}</span></div>${statusPill(report.status)}</div>
      <div class="mobile-detail-row"><strong>Interruption Type</strong><span>${escapeHtml(report.possible_outage_type || 'Power outage')}</span></div>
      <div class="mobile-detail-row"><strong>Barangay</strong><span>${escapeHtml(report.barangay)}</span></div>
      <div class="mobile-detail-row"><strong>Location</strong><span>${escapeHtml(report.location || (hasCoordinates(report) ? `${report.latitude}, ${report.longitude}` : 'Not provided'))}</span></div>
      <h2>Description</h2><p>${escapeHtml(report.description || '')}</p>
      ${report.remarks ? `<h2>Additional notes</h2><p>${escapeHtml(report.remarks)}</p>` : ''}
      ${report.staff_remarks ? `<h2>Review update</h2><p>${escapeHtml(report.staff_remarks)}</p>` : ''}
      ${report.attachments?.length ? `<h2>Attachments</h2><div class="report-attachment-previews">${report.attachments.map((attachment) => attachment.mime_type.startsWith('video/')
        ? `<video src="${escapeHtml(attachment.file_path)}" controls aria-label="${escapeHtml(attachment.original_name)}"></video>`
        : `<img src="${escapeHtml(attachment.file_path)}" alt="${escapeHtml(attachment.original_name)}">`).join('')}</div>`
        : report.photo_path ? `<h2>Attachments</h2><img class="mobile-report-photo" src="${escapeHtml(report.photo_path)}" alt="Evidence attached to this report">` : ''}
      <h2>Status Timeline</h2>
      <div class="mobile-timeline">${steps.map(([label, date], index) => `
        <div class="mobile-timeline-item ${date ? 'complete' : ''}"><span class="timeline-marker">${date ? '✓' : ''}</span><strong>${escapeHtml(label)}</strong><time>${date ? escapeHtml(formatDateTime(date)) : 'Pending'}</time></div>
      `).join('')}</div>
    </section>
  `, {
    activeTab: 'reports',
    subpageHeader: {
      title: 'Report Details',
      backAction: 'back-to-reports',
    },
  });
}

async function renderMobileMap() {
  const [{ incidents }, { scheduled }, { barangays: barangayLocations }, { reports }] = await Promise.all([
    api('/api/incidents'),
    api('/api/scheduled/upcoming'),
    api('/api/barangays/locations'),
    api('/api/reports').catch(() => ({ reports: [] })),
  ]);
  const isHeatmap = state.mobileMapMode === 'heat';

  const legendMarkup = isHeatmap ? `
    <div class="mobile-map-legend" style="display:flex;align-items:center;gap:10px;">
      <span style="font-weight:700;color:#c93b2b;">🔥 Outage Density:</span>
      <span class="heatmap-gradient-bar" style="width:110px;height:8px;display:inline-block;" aria-hidden="true"></span>
      <span style="font-size:0.72rem;color:#64748b;">(Cool → Hot)</span>
    </div>
  ` : `
    <div class="mobile-map-legend">
      <span><i class="legend-dot red"></i>Active outage</span>
      <span><i class="legend-dot blue"></i>Scheduled</span>
    </div>
  `;

  mobileShell(`
    ${mobileHero('Power Outage Map', 'Explore active interruptions and outage density across Valencia City.')}
    <div class="mobile-segments" role="group" aria-label="Map display mode" style="margin-bottom:8px;">
      <button type="button" class="mobile-segment ${!isHeatmap ? 'active' : ''}" data-action="set-mobile-map-mode" data-value="markers">📍 Outage Pins</button>
      <button type="button" class="mobile-segment ${isHeatmap ? 'active' : ''}" data-action="set-mobile-map-mode" data-value="heat">🔥 Hotspot Heatmap</button>
    </div>
    ${legendMarkup}
    <div class="community-map" id="community-map" aria-label="Map of Valencia City outages"></div>
    <section class="mobile-card"><header class="mobile-card-head"><h2>Active Outages</h2><button class="link-button" data-mobile-tab="outages">View all</button></header>
      <div class="mobile-card-body">${incidents.length ? incidents.slice(0, 4).map((incident) => `
        <div class="mobile-list-item"><div class="mobile-list-main"><strong>${escapeHtml(incident.title)}</strong><span>${escapeHtml((incident.affected_barangays || [incident.barangay]).join(', '))}</span></div>${statusPill(incident.status)}<button type="button" class="link-button" data-action="view-incident-details" data-id="${incident.id}" aria-label="View ${escapeHtml(incident.title)} details">›</button></div>
      `).join('') : '<p class="muted small">No active outage locations are available.</p>'}</div>
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
  const map = L.map(mapElement, { zoomControl: false }).setView([7.906, 125.094], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  const coordinatesFor = (item) => {
    if (hasCoordinates(item)) return [Number(item.latitude), Number(item.longitude)];
    const barangay = barangayLocations.find((location) => location.name === item.barangay);
    return hasCoordinates(barangay) ? [Number(barangay.latitude), Number(barangay.longitude)] : null;
  };

  if (isHeatmap) {
    const heatPoints = [];
    const addHeat = (item, intensity) => {
      const coords = coordinatesFor(item);
      if (coords) heatPoints.push([coords[0], coords[1], intensity]);
    };
    incidents.forEach((i) => addHeat(i, 1.0));
    (reports || []).forEach((r) => addHeat(r, 0.7));
    scheduled.forEach((s) => addHeat(s, 0.35));
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
    incidents.forEach((incident) => {
      const coordinates = coordinatesFor(incident);
      if (!coordinates) return;
      L.circleMarker(coordinates, { radius: 9, color: '#b72832', fillColor: '#e5484d', fillOpacity: .9, weight: 2 })
        .addTo(map).bindPopup(`<strong>${escapeHtml(incident.title)}</strong><br>${escapeHtml(incident.barangay)} · ${escapeHtml(incident.status)}`);
    });
    scheduled.forEach((item) => {
      const coordinates = coordinatesFor(item);
      if (!coordinates) return;
      L.circleMarker(coordinates, { radius: 8, color: '#145d9e', fillColor: '#2789dd', fillOpacity: .9, weight: 2 })
        .addTo(map).bindPopup(`<strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.barangay)} · ${escapeHtml(item.status)}`);
    });
  }
  window.requestAnimationFrame(() => map.invalidateSize());
}

async function renderMobileNotifications() {
  const { notifications } = await api('/api/notifications');
  const preferences = readNotificationPreferences();
  const visibleNotifications = notifications.filter((notice) => {
    if (notice.type === 'report') return preferences.reportUpdates;
    if (notice.type === 'incident') return preferences.outageAlerts;
    if (notice.type === 'scheduled') return preferences.scheduledOutages;
    if (notice.type === 'announcement') return preferences.announcements;
    return preferences.general;
  });
  state.mobileNotifications = visibleNotifications;
  mobileShell(`
    ${mobileHero('Notifications', 'Updates about your reports and local power interruptions.')}
    ${mobileCard('Alerts', visibleNotifications.length ? visibleNotifications.map((notice) => `
      <button type="button" class="mobile-list-item mobile-notification-item ${notice.read ? '' : 'unread'}" data-action="view-notification" data-id="${notice.id}">
        <span class="mobile-notice-icon">${notice.type === 'report' ? '⌖' : notice.type === 'incident' ? '⚡' : 'i'}</span>
        <div class="mobile-list-main"><strong>${escapeHtml(notice.title)}</strong><span>${escapeHtml(notice.message)}</span><span class="muted small">${escapeHtml(formatDateTime(notice.created_at))}</span></div>
        ${notice.read ? '' : '<span class="unread-dot"></span>'}
      </button>`).join('') : '<p class="muted small">No notifications yet.</p>',
    visibleNotifications.some((notice) => !notice.read) ? '<button class="link-button" data-action="mark-all-read">Mark all read</button>' : '')}
  `, { activeTab: 'notifications' });
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
        <span class="mobile-settings-label">Language 🌐</span>
        <span class="mobile-settings-val-link">English ${chevronSvg}</span>
      </button>

      <button type="button" class="mobile-settings-row static" data-action="show-version-info">
        <span class="mobile-settings-icon-wrap">${icons.version}</span>
        <span class="mobile-settings-label">App Version</span>
        <span class="mobile-settings-version">v1.0.0</span>
      </button>

      <button type="button" class="mobile-settings-row" data-action="show-support">
        <span class="mobile-settings-icon-wrap">${icons.support}</span>
        <span class="mobile-settings-label">Help &amp; Support</span>
        ${chevronSvg}
      </button>

      <button type="button" class="mobile-settings-row" data-action="show-about">
        <span class="mobile-settings-icon-wrap">${icons.about}</span>
        <span class="mobile-settings-label">About Valencia PowerWatch</span>
        ${chevronSvg}
      </button>
    </div>

    <button type="button" class="mobile-logout-pill-btn" data-action="logout">
      ${icons.logout}
      <span>Log Out</span>
    </button>
  `, {
    activeTab: 'profile',
    showTabs: false,
    subpageHeader: {
      title: 'Settings',
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
