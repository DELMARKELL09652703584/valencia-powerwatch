/* Valencia PowerWatch - shared core: portal routing, state, API client, helpers */

const app = document.getElementById('app');

// Strict portal separation based on URL path or explicit configuration
const pathname = (window.location.pathname || '').toLowerCase();
const PORTAL = window.POWERWATCH_PORTAL === 'admin' || pathname.startsWith('/admin')
  ? 'admin'
  : 'community';
const IS_COMMUNITY = PORTAL === 'community';
const IS_ADMIN = PORTAL === 'admin';

const STAFF_ROLES = ['personnel', 'administrator', 'utility'];
const OFFICIAL_ROLES = ['administrator', 'utility'];
const roleNames = {
  resident: 'Resident',
  personnel: 'System Personnel',
  administrator: 'Administrator',
  utility: 'Authorized Utility Personnel',
};

const state = {
  user: null,
  page: 'dashboard',
  config: {},
  barangays: [],
  barangayLocations: [],
  demos: [],
  oauthProviders: {},
  passwordRecoveryEnabled: false,
  unread: 0,
  notificationPanelOpen: false,
  notificationPreview: [],
  filters: {},
  analyticsRange: { from: '', to: '' },
  reportPage: 1,
  auditPage: 1,
  auditPageSize: 5,
  mobileTab: 'home',
  mobileMapMode: localStorage.getItem('powerwatch.mobile-map-mode') === 'heat' ? 'heat' : 'pins',
  mobileMapLayer: localStorage.getItem('powerwatch.mobile-map-layer') === 'satellite' ? 'satellite' : 'street',
  adminMapMode: 'pins',
  mobileNotificationPanelOpen: false,
  mobileNotificationPreview: [],
  bootError: '',
  language: localStorage.getItem('powerwatch.language') || 'en',
};

const LANG_STORAGE_KEY = 'powerwatch.language';
const TRANSLATIONS = {
  en: {
    home: 'Home',
    reports: 'Reports',
    map: 'Map',
    notifications: 'Notifications',
    profile: 'Profile',
    active_outages: 'Active Outages',
    pending_reports: 'Pending Reports',
    resolved_today: 'Resolved Today',
    total_reports: 'Total Reports',
    recent_updates: 'Recent Updates',
    view_all: 'View All',
    no_recent_updates: 'No recent updates.',
    report_interruption: '＋ Report an Interruption',
    outage_history: 'Outage History',
    my_reports: 'My Reports',
    my_reports_sub: 'Track reports you have submitted and their verification status.',
    announcements: 'Announcements',
    scheduled_outages: 'Scheduled Outages',
    settings: 'Settings',
    account_security: 'Account Security',
    notification_settings: 'Notification Settings',
    location_services: 'Location Services',
    language: 'Language / Pinulongan',
    app_version: 'App Version',
    help_support: 'Help & Support',
    about_powerwatch: 'About Valencia PowerWatch',
    logout: 'Log Out',
    etr_label: 'Estimated Restoration (ETR)',
    rate_service: 'Rate Restoration Service',
    power_restored_q: 'Was electrical power restored at your residence?',
    yes_restored: 'Yes, Power Restored',
    not_yet: 'Not Yet Restored',
    comments_optional: 'Additional comments or feedback (optional)…',
    send_feedback: 'Submit Feedback & Rating',
    feedback_success: 'Thank you for your feedback! Help us keep Valencia powered.',
    outage_map: 'Power Outage Map',
    outage_map_sub: 'Explore active interruptions and outage density across Valencia City.',
    pins: '📍 Outage Pins',
    heatmap: '🔥 Hotspot Heatmap',
  },
  ceb: {
    home: 'Panimalay',
    reports: 'Mga Report',
    map: 'Mapa',
    notifications: 'Pahibalo',
    profile: 'Akawnt',
    active_outages: 'Kasamtangang Brownout',
    pending_reports: 'Gahulat nga Report',
    resolved_today: 'Naayo Karon',
    total_reports: 'Tanan nga Report',
    recent_updates: 'Bag-ong mga Update',
    view_all: 'Tan-awa Tanan',
    no_recent_updates: 'Walay bag-ong mga pahibalo.',
    report_interruption: '＋ Mag-report og Brownout',
    outage_history: 'Kaagi sa Brownout',
    my_reports: 'Akong mga Report',
    my_reports_sub: 'Bantayi ang mga report nga imong gipadala ug ang status sa pag-verify.',
    announcements: 'Mga Pahibalo sa Komunidad',
    scheduled_outages: 'Naka-eskedyul nga Brownout',
    settings: 'Mga Setting',
    account_security: 'Seguridad sa Akawnt',
    notification_settings: 'Setting sa Pahibalo',
    location_services: 'Serbisyo sa Lokasyon (GPS)',
    language: 'Pinulongan (Language)',
    app_version: 'Bersyon sa App',
    help_support: 'Tabang ug Suporta',
    about_powerwatch: 'Mahitungod sa Valencia PowerWatch',
    logout: 'Gawas sa Akawnt',
    etr_label: 'Gilauman nga Pag-ayo (ETR)',
    rate_service: 'I-rate ang Serbisyo sa Pag-ayo',
    power_restored_q: 'Nibalik na ba ang kuryente sa inyong panimalay?',
    yes_restored: 'Oo, Nibalik na ang Kuryente',
    not_yet: 'Wala pa nibalik',
    comments_optional: 'Dugang komento o kasinatian (opsyonal)…',
    send_feedback: 'Ipadala ang Rating ug Feedback',
    feedback_success: 'Daghang salamat sa imong feedback ug kooperasyon!',
    outage_map: 'Mapa sa Brownout sa Valencia',
    outage_map_sub: 'Susiha ang mga apektadong lugar ug density sa brownout sa tibuok Valencia.',
    pins: '📍 Mga Lokasyon sa Outage',
    heatmap: '🔥 Hotspot Heatmap',
  }
};

function getLanguage() {
  return localStorage.getItem(LANG_STORAGE_KEY) || state.language || 'en';
}

function setLanguage(lang) {
  const code = lang === 'ceb' ? 'ceb' : 'en';
  localStorage.setItem(LANG_STORAGE_KEY, code);
  state.language = code;
}

function t(key, fallback = '') {
  const lang = getLanguage();
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || (TRANSLATIONS.en && TRANSLATIONS.en[key]) || fallback || key;
}

const canManage = () => !!state.user && STAFF_ROLES.includes(state.user.role);
const isAdmin = () => state.user?.role === 'administrator';
const isOfficial = () => !!state.user && OFFICIAL_ROLES.includes(state.user.role);
const roleLabel = (role) => roleNames[role] || role || '';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function systemTimeZone() {
  return state.config.system_info?.timezone || 'Asia/Manila';
}

function systemDateParts(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: systemTimeZone(), year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function formatSystemDate(value) {
  const parts = systemDateParts(value);
  if (!parts) return 'Not set';
  const format = state.config.system_info?.dateFormat || 'YYYY-MM-DD';
  if (format === 'MM/DD/YYYY') return `${parts.month}/${parts.day}/${parts.year}`;
  if (format === 'DD/MM/YYYY') return `${parts.day}/${parts.month}/${parts.year}`;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatSystemTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: systemTimeZone(),
    hour: 'numeric',
    minute: '2-digit',
    hour12: (state.config.system_info?.timeFormat || '12 Hour') !== '24 Hour',
  }).format(date);
}

const formatDateTime = (value) => (value ? `${formatSystemDate(value)}, ${formatSystemTime(value)}` : 'Not set');
const formatDate = (value) => (value ? formatSystemDate(value) : 'Not set');
const formatTime = (value) => (value ? formatSystemTime(value) : 'Not set');

function toLocalInputValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const activeOutageTypes = () => {
  const inactive = new Set(state.config.inactive_outage_types || []);
  return (state.config.outage_types || []).filter((type) => !inactive.has(type));
};

const hasCoordinates = (item) => {
  if (!item) return false;
  const { latitude: lat, longitude: lng } = item;
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (String(lat).trim() === '' || String(lng).trim() === '') return false;
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
};

const distanceKm = (first, second) => {
  if (!first || !second) return Infinity;
  const radians = (degrees) => degrees * Math.PI / 180;
  const latDelta = radians(Number(first.latitude) - Number(second.latitude));
  const lngDelta = radians(Number(first.longitude) - Number(second.longitude));
  const value = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(Number(second.latitude)))
    * Math.cos(radians(Number(first.latitude))) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const findNearestBarangay = (latitude, longitude, barangayList) => {
  const list = barangayList || state.barangayLocations || [];
  let nearest = null;
  let minDistance = Infinity;
  for (const b of list) {
    if (!hasCoordinates(b)) continue;
    const dist = distanceKm({ latitude, longitude }, { latitude: Number(b.latitude), longitude: Number(b.longitude) });
    if (dist < minDistance) {
      minDistance = dist;
      nearest = b;
    }
  }
  return nearest ? { name: nearest.name, distanceKm: minDistance } : null;
};

const VALENCIA_HQ_COORDINATES = {
  latitude: 7.9135,
  longitude: 125.0934,
  label: 'FIBECO Valencia Substation / HQ'
};

const getUserLocation = () => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve(null);
  navigator.geolocation.getCurrentPosition(
    (pos) => resolve({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      label: 'Your Current GPS Location'
    }),
    () => resolve(null),
    { timeout: 5000, enableHighAccuracy: true }
  );
});

async function fetchRouteWaypoints(startLat, startLng, destLat, destLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error('OSRM status ' + res.status);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const waypoints = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      return {
        waypoints,
        distanceKm: (route.distance / 1000).toFixed(1),
        durationMins: Math.max(1, Math.round(route.duration / 60)),
        isRealRoute: true
      };
    }
  } catch (err) {
    console.warn('Routing API fallback to straight line:', err);
  }
  const dist = distanceKm({ latitude: startLat, longitude: startLng }, { latitude: destLat, longitude: destLng });
  return {
    waypoints: [[startLat, startLng], [destLat, destLng]],
    distanceKm: dist.toFixed(1),
    durationMins: Math.max(1, Math.round((dist / 35) * 60)),
    isRealRoute: false
  };
}

let activeRouteGuideLayer = null;

async function renderRouteGuideOnMap({
  map,
  destLat,
  destLng,
  destLabel,
  container,
  origin = null
}) {
  if (!map) return;
  setToast('Calculating road route navigation guide...');

  if (!origin) {
    const userGps = await getUserLocation();
    origin = userGps || VALENCIA_HQ_COORDINATES;
  }

  if (activeRouteGuideLayer) {
    try { map.removeLayer(activeRouteGuideLayer); } catch {}
  }
  activeRouteGuideLayer = L.layerGroup().addTo(map);

  const routeData = await fetchRouteWaypoints(origin.latitude, origin.longitude, destLat, destLng);

  // Outer border (navy blue stroke for navigation polyline contrast)
  L.polyline(routeData.waypoints, {
    color: '#1e3a8a',
    weight: 9,
    opacity: 0.9,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(activeRouteGuideLayer);

  // Inner core (vibrant Google Maps blue line)
  const corePolyline = L.polyline(routeData.waypoints, {
    color: '#2563eb',
    weight: 5.5,
    opacity: 1.0,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(activeRouteGuideLayer);

  // Origin marker
  const startIcon = L.divIcon({
    className: 'route-start-pin-wrap',
    html: '<div style="background:#0284c7;color:#fff;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px;border:2.5px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.35);">🟢</div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
  L.marker([origin.latitude, origin.longitude], { icon: startIcon })
    .addTo(activeRouteGuideLayer)
    .bindPopup(`<strong>📍 Start / Dispatch Location</strong><br>${escapeHtml(origin.label)}`);

  // Destination marker
  const destIcon = L.divIcon({
    className: 'route-dest-pin-wrap',
    html: '<div class="route-dest-pin">📍</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 26]
  });
  L.marker([destLat, destLng], { icon: destIcon })
    .addTo(activeRouteGuideLayer)
    .bindPopup(`<strong>⚡ Outage Destination</strong><br>${escapeHtml(destLabel)}`);

  // Fit bounds to entire route
  map.fitBounds(corePolyline.getBounds(), { padding: [50, 50] });

  // Floating Navigation HUD
  const targetContainer = container || map.getContainer()?.parentElement;
  if (targetContainer) {
    targetContainer.querySelector('.map-route-hud')?.remove();
    const hud = document.createElement('aside');
    hud.className = 'map-route-hud';
    hud.setAttribute('role', 'region');
    hud.setAttribute('aria-label', 'Road Route Navigation Guide');
    hud.innerHTML = `
      <div class="map-route-hud-header">
        <div class="map-route-hud-title">
          <span>🧭</span>
          <span>Navigation Route Guide</span>
        </div>
        <button type="button" class="map-route-hud-close" data-action="clear-route-guide" title="Close and clear route" aria-label="Close route guide">✕</button>
      </div>
      <div class="map-route-hud-endpoints">
        <div class="map-route-hud-point">
          <span>🟢</span>
          <span><strong>From:</strong> ${escapeHtml(origin.label)}</span>
        </div>
        <div class="map-route-hud-point">
          <span>🔴</span>
          <span><strong>To:</strong> ${escapeHtml(destLabel)}</span>
        </div>
      </div>
      <div class="map-route-hud-details">
        <div class="map-route-hud-stat">
          <span>📏</span>
          <span>${escapeHtml(routeData.distanceKm)} km</span>
        </div>
        <div class="map-route-hud-stat">
          <span>⏱️</span>
          <span>~${escapeHtml(String(routeData.durationMins))} mins drive</span>
        </div>
        <div class="map-route-hud-stat">
          <span>${routeData.isRealRoute ? '🛣️ Road Route' : '📍 Direct'}</span>
        </div>
      </div>
      <div class="map-route-hud-actions" style="flex-wrap:wrap;gap:6px;">
        <button type="button" class="map-route-hud-btn" data-action="sim-crew-dispatch" style="background:#0284c7;color:#fff;box-shadow:0 0 10px rgba(2,132,199,0.5);flex:1 1 100%;">
          <span>🚀 Simulate Crew Dispatch (2030 Live Tracker)</span>
        </button>
        <a href="https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destLat},${destLng}&travelmode=driving" 
           target="_blank" rel="noopener noreferrer" class="map-route-hud-btn primary">
          <span>🗺️ Google Maps</span>
        </a>
        <button type="button" class="map-route-hud-btn secondary" data-action="clear-route-guide">
          <span>Clear Route</span>
        </button>
      </div>
    `;
    targetContainer.appendChild(hud);
  }

  state.activeRouteWaypoints = routeData.waypoints;
  state.activeRouteDestLabel = destLabel;
  setToast(`Route guide active: ${routeData.distanceKm} km · ~${routeData.durationMins} mins`);
}

function clearRouteGuideOnMap(map, container) {
  if (activeRouteGuideLayer) {
    try { map?.removeLayer(activeRouteGuideLayer); } catch {}
    activeRouteGuideLayer = null;
  }
  stopCrewDispatchSimulation(map);
  const targetContainer = container || map?.getContainer()?.parentElement || document;
  targetContainer?.querySelector('.map-route-hud')?.remove();
  setToast('Route guide cleared.');
}

// ==========================================================================
// 2030 SMART ELECTRICAL GRID FEEDER NETWORK & SIMULATION ENGINE
// ==========================================================================

const VALENCIA_ELECTRIC_FEEDERS = [
  {
    id: 'FDR-01',
    name: 'Sayre Highway North Trunk (13.2kV)',
    voltage: '13.2 kV',
    loadMw: '18.4 MW',
    freq: '60.01 Hz',
    substation: 'Valencia Central Substation',
    status: 'Energized (Nominal)',
    color: '#06b6d4',
    isFaulted: false,
    path: [
      [7.9135, 125.0934], // Central Substation
      [7.9111, 125.0934], // Poblacion
      [7.9304, 125.1077], // Bagontaas
      [7.9432, 125.1189], // Sugod
      [7.9497, 125.1235], // Kahapunan
      [7.9734, 125.0747], // Colonia
      [7.9839, 125.0872]  // Mailag
    ]
  },
  {
    id: 'FDR-02',
    name: 'Sayre Highway South Corridor (13.2kV)',
    voltage: '13.2 kV',
    loadMw: '16.2 MW',
    freq: '60.02 Hz',
    substation: 'Valencia Central Substation',
    status: 'Energized (Nominal)',
    color: '#3b82f6',
    isFaulted: false,
    path: [
      [7.9135, 125.0934], // Central Substation
      [7.9042, 125.1128], // San Isidro
      [7.8938, 125.0752], // Lumbo
      [7.8881, 125.1038], // Pinatilan
      [7.8924, 125.1328], // Batangan
      [7.8717, 125.1419]  // Sinayawan
    ]
  },
  {
    id: 'FDR-03',
    name: 'Guinoyuran Western Radial Trunk (13.2kV)',
    voltage: '0.0 kV (Tripped)',
    loadMw: '0.0 MW (Lockout)',
    freq: '0.00 Hz',
    substation: 'Valencia Central Substation',
    status: 'De-energized (Fault Detected)',
    color: '#ef4444',
    isFaulted: true,
    path: [
      [7.9135, 125.0934], // Central Substation
      [7.9142, 125.0389], // Tongantongan
      [7.8986, 125.0478], // Catumbalon
      [7.8761, 125.0125], // Guinoyuran Fault Point!
      [7.8631, 125.0381]  // Dagat-Kidavao
    ]
  },
  {
    id: 'FDR-04',
    name: 'Eastern Agribusiness Sector Trunk (13.2kV)',
    voltage: '13.2 kV',
    loadMw: '14.1 MW',
    freq: '60.01 Hz',
    substation: 'Valencia Central Substation',
    status: 'Energized (Nominal)',
    color: '#10b981',
    isFaulted: false,
    path: [
      [7.9135, 125.0934], // Central Substation
      [7.9197, 125.1647], // San Carlos
      [7.9547, 125.1558], // Banlag
      [7.8821, 125.1632], // Lumbayao
      [7.8789, 125.1258]  // Sinabuagan
    ]
  }
];

let activeElectricFeedersLayer = null;

function renderElectricFeedersOnMap(map) {
  if (!map) return;
  if (activeElectricFeedersLayer) {
    try { map.removeLayer(activeElectricFeedersLayer); } catch {}
  }
  activeElectricFeedersLayer = L.layerGroup().addTo(map);

  VALENCIA_ELECTRIC_FEEDERS.forEach((feeder) => {
    // 1. Dark glowing backing stroke
    L.polyline(feeder.path, {
      color: feeder.isFaulted ? '#7f1d1d' : '#0f172a',
      weight: 7,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(activeElectricFeedersLayer);

    // 2. Neon animated pulsing core line
    const neonLine = L.polyline(feeder.path, {
      color: feeder.color,
      weight: 3.5,
      opacity: 0.95,
      className: `electric-feeder-pulse ${feeder.isFaulted ? 'fault' : ''}`
    }).addTo(activeElectricFeedersLayer);

    // Telemetry popup on feeder click
    neonLine.bindPopup(`
      <div class="map-popup-card holographic" style="min-width:240px;">
        <div class="map-popup-header">
          <span class="scada-telemetry-badge">${escapeHtml(feeder.id)}</span>
          <span class="map-popup-badge" style="${feeder.isFaulted ? 'background:#ef4444;color:#fff;' : 'background:#10b981;color:#fff;'}">${escapeHtml(feeder.status)}</span>
        </div>
        <h4 class="map-popup-title" style="margin:4px 0;">⚡ ${escapeHtml(feeder.name)}</h4>
        <div class="map-popup-meta" style="font-size:0.75rem;display:flex;flex-direction:column;gap:4px;padding:8px;">
          <div>📡 <strong>Grid Source:</strong> ${escapeHtml(feeder.substation)}</div>
          <div>⚡ <strong>Voltage:</strong> <span style="color:${feeder.isFaulted ? '#f87171' : '#38bdf8'};font-weight:800;">${escapeHtml(feeder.voltage)}</span></div>
          <div>🔋 <strong>Load Capacity:</strong> ${escapeHtml(feeder.loadMw)}</div>
          <div>📊 <strong>Frequency:</strong> ${escapeHtml(feeder.freq)}</div>
        </div>
      </div>
    `);

    // Substation / Terminal marker
    feeder.path.forEach((pt, idx) => {
      if (idx === 0) {
        L.circleMarker(pt, {
          radius: 6,
          fillColor: '#38bdf8',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 1
        }).addTo(activeElectricFeedersLayer).bindPopup(`<strong>⚡ ${escapeHtml(feeder.substation)}</strong><br>Valencia Main SCADA Dispatch Node`);
      }
    });
  });
}

function clearElectricFeedersOnMap(map) {
  if (activeElectricFeedersLayer) {
    try { map?.removeLayer(activeElectricFeedersLayer); } catch {}
    activeElectricFeedersLayer = null;
  }
}

// ---------------- Real-Time Emergency Response Crew Dispatch GPS Simulator
let crewSimulationTimer = null;
let crewSimulationMarker = null;

function startCrewDispatchSimulation(map, waypoints, onUpdate, onComplete) {
  if (!map || !waypoints || waypoints.length < 2) {
    setToast('No route waypoints available for simulation.');
    return;
  }
  stopCrewDispatchSimulation(map);

  let currentIndex = 0;
  const total = waypoints.length;
  const startPt = waypoints[0];

  const crewIcon = L.divIcon({
    className: 'sim-crew-marker-wrap',
    html: `
      <div class="sim-crew-marker">
        <div class="sim-crew-icon">⚡🚒</div>
        <div class="sim-crew-badge">FIBECO RESCUE-01</div>
      </div>
    `,
    iconSize: [44, 52],
    iconAnchor: [22, 26]
  });

  crewSimulationMarker = L.marker(startPt, { icon: crewIcon }).addTo(map);
  map.panTo(startPt);
  setToast('🚀 Response Crew RESCUE-01 Dispatched! En route to outage location...');

  crewSimulationTimer = setInterval(() => {
    currentIndex = Math.min(total - 1, currentIndex + Math.max(1, Math.floor(total / 65)));
    const curPt = waypoints[currentIndex];
    crewSimulationMarker.setLatLng(curPt);

    const progressPct = Math.round((currentIndex / (total - 1)) * 100);
    const speed = 40 + Math.floor(Math.sin(currentIndex) * 8);

    if (onUpdate) {
      onUpdate({
        index: currentIndex,
        total,
        percent: progressPct,
        coords: curPt,
        speed
      });
    }

    if (currentIndex >= total - 1) {
      clearInterval(crewSimulationTimer);
      crewSimulationTimer = null;
      setToast('🎯 CREW ARRIVED ON-SITE! Commencing emergency repairs.');
      if (onComplete) onComplete();
    }
  }, 75);
}

function stopCrewDispatchSimulation(map) {
  if (crewSimulationTimer) {
    clearInterval(crewSimulationTimer);
    crewSimulationTimer = null;
  }
  if (crewSimulationMarker) {
    try { map?.removeLayer(crewSimulationMarker); } catch {}
    crewSimulationMarker = null;
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const type = response.headers.get('content-type') || '';
  const result = type.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error((result && result.error) || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return result;
}

const send = (path, method, body) => api(path, {
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

function setToast(message) {
  const toast = document.querySelector('.toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add('toast-visible');
  window.clearTimeout(setToast.timer);
  setToast.timer = window.setTimeout(() => {
    toast.classList.remove('toast-visible');
    window.setTimeout(() => { toast.hidden = true; }, 250);
  }, 3600);
}

function statusTone(status = '') {
  const value = String(status).toLowerCase();
  if (['critical'].some((k) => value.includes(k))) return 'critical';
  if (['pending', 'submitted', 'awaiting verification', 'awaiting review', 'scheduled', 'planned'].some((k) => value.includes(k))) return 'pending';
  if (['under review', 'under verification', 'review', 'preparing', 'in preparation', 'draft'].some((k) => value.includes(k))) return 'review';
  if (['ongoing', 'in progress', 'restoration in progress', 'being implemented', 'implementing'].some((k) => value.includes(k))) return 'ongoing';
  if (['verified', 'officially confirmed', 'published'].some((k) => value.includes(k))) return 'verified';
  if (['resolved', 'restored', 'completed'].some((k) => value.includes(k)) || (value.includes('active') && !value.includes('inactive'))) return 'resolved';
  if (['cancelled', 'rejected', 'duplicate', 'inactive', 'deleted'].some((k) => value.includes(k))) return 'rejected';
  return 'neutral';
}

function statusPill(status) {
  if (!status) return '<span class="pill pill-neutral">Unknown</span>';
  return `<span class="pill pill-${statusTone(status)}">${escapeHtml(status)}</span>`;
}

function priorityTone(priority = '') {
  const value = String(priority).toLowerCase();
  if (value === 'critical' || value === 'high') return 'bad';
  if (value === 'medium') return 'busy';
  return 'ok';
}

function emptyState(title, message, icon = '📭') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p></div>`;
}

function loadingState(message = 'Loading…') {
  return `<div class="loading-state"><div class="spinner"></div><p>${escapeHtml(message)}</p></div>`;
}

function barChart(data, { labelKey = 'label', valueKey = 'value', color = 'var(--primary)', max } = {}) {
  if (!data.length) return emptyState('No data yet', 'There is nothing to chart for the current filters.', '📊');
  const ceiling = max ?? Math.max(...data.map((row) => Number(row[valueKey]) || 0), 1);
  return `<div class="bar-chart">${data.map((row) => {
    const value = Number(row[valueKey]) || 0;
    const height = Math.max(3, Math.round((value / ceiling) * 100));
    return `<div class="bar-item" title="${escapeHtml(String(row[labelKey]))}: ${escapeHtml(String(value))}">
      <div class="bar-value">${escapeHtml(String(value))}</div>
      <div class="bar-track"><div class="bar-fill" style="height:${height}%;background:${color}"></div></div>
      <div class="bar-label">${escapeHtml(String(row[labelKey]))}</div>
    </div>`;
  }).join('')}</div>`;
}

async function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(file);
  });
}

function captureLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

const query = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== '' && value !== null && value !== undefined) search.set(key, value);
  }
  const string = search.toString();
  return string ? `?${string}` : '';
};

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
