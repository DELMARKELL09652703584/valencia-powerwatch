const root = document.getElementById('staff-app');
const toast = document.getElementById('staff-toast');
let refreshTimer = null;
let evidencePreviewUrl = null;
const activeStages = ['Dispatched', 'En Route', 'Arrived On Site', 'In Progress'];
const stages = ['Assigned', 'Acknowledged', 'On the Way', 'Arrived', 'Inspecting', 'Repairing', 'Completed'];
const pages = [
  ['home', 'home', 'Home'],
  ['tasks', 'clipboard', 'Tasks'],
  ['map', 'map', 'Map'],
  ['alerts', 'bell', 'Updates'],
  ['profile', 'user', 'Profile'],
];
const state = {
  user: null,
  assignments: [],
  reports: [],
  teams: [],
  notifications: [],
  notificationIds: [],
  unreadNotifications: 0,
  page: 'home',
  selectedId: null,
  filter: 'Active',
  installPrompt: null,
  assignmentsLoaded: false,
  notificationsLoaded: false,
};
let staffLocationWatchId = null;
let staffLocationPollTimer = null;
let staffLocationPollInFlight = false;
let staffLocationAssignmentId = null;
let staffLocationLastSentAt = 0;
let staffLocationRequestInFlight = false;
let staffLocationUpdatePromise = null;
let staffMap = null;
let staffDestinationMarker = null;
let staffCurrentMarker = null;
let staffRouteLine = null;
let staffRouteRequestedAt = 0;
let staffLeafletPromise = null;
let staffMapGeneration = 0;

const supportedEvidenceTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']);
const maxEvidenceBytes = 8 * 1024 * 1024;

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const icon = (name) => {
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1ZM8 10h8M8 14h8M8 18h5"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15m6-12v15"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    route: '<path d="M4 19c4-8 12-8 16-14M4 5h5M4 5v5m16 9h-5m5 0v-5"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
    camera: '<path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  };
  return `<svg class="staff-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.alert}</svg>`;
};

const api = async (url, options = {}) => {
  const response = await fetch(url, {
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
};

const send = (url, method, body) => api(url, {
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

const showToast = (message) => {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 3600);
};

const showConfirm = (title, message, onConfirm, onCancel) => {
  const existing = document.getElementById('staff-confirm-dialog');
  if (existing) existing.remove();
  const dialog = document.createElement('section');
  dialog.id = 'staff-confirm-dialog';
  dialog.className = 'staff-confirm-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'staff-confirm-title');
  dialog.innerHTML = `
    <div class="staff-confirm-backdrop" data-action="cancel-confirm" aria-hidden="true"></div>
    <article class="staff-confirm-card">
      <header class="staff-confirm-head">
        <h2 id="staff-confirm-title" class="staff-confirm-title">${escapeHtml(title)}</h2>
        <button type="button" class="staff-confirm-close" data-action="cancel-confirm" aria-label="Close">✕</button>
      </header>
      <div class="staff-confirm-body">${escapeHtml(message)}</div>
      <footer class="staff-confirm-foot">
        <button type="button" class="staff-btn staff-btn-quiet" data-action="cancel-confirm">Cancel</button>
        <button type="button" class="staff-btn staff-btn-danger" data-action="confirm-action">${onConfirm}</button>
      </footer>
    </article>
  `;
  document.body.appendChild(dialog);
  dialog.querySelector('[data-action="confirm-action"]').textContent = onConfirm;
  const confirmBtn = dialog.querySelector('[data-action="confirm-action"]');
  confirmBtn.addEventListener('click', () => { dialog.remove(); onConfirm(); });
  dialog.querySelectorAll('[data-action="cancel-confirm"]').forEach((btn) => {
    btn.addEventListener('click', () => { dialog.remove(); if (onCancel) onCancel(); });
  });
  return dialog;
};

const activeIncidents = () => state.assignments.filter((assignment) => activeStages.includes(assignment.status));
const stageIndex = (assignment) => Math.max(0, stages.indexOf(assignment.latest_stage || 'Assigned'));
const nextStage = (assignment) => stages[Math.min(stages.length - 1, stageIndex(assignment) + 1)];
const stageLabel = (stage) => stage === 'Assigned' ? 'Assigned'
  : stage === 'Acknowledged' ? 'Acknowledged'
    : stage;
const priorityClass = (priority) => String(priority || '').toLowerCase() === 'critical'
  ? 'staff-priority-critical'
  : String(priority || '').toLowerCase() === 'high'
    ? 'staff-priority-high'
    : 'staff-priority-normal';
const statusClass = (status) => status === 'Resolved'
  || status === 'Completed'
  ? 'staff-status-done'
  : activeStages.includes(status)
    ? 'staff-status-active'
    : '';
const displayLocation = (assignment) => [
  assignment.target_location || assignment.report_location,
  assignment.target_purok && `Purok ${assignment.target_purok}`,
  assignment.target_barangay && `Barangay ${assignment.target_barangay}`,
].filter(Boolean).join(', ') || 'Location details not supplied';

const hasValidCoordinates = (latitude, longitude) => {
  if ([null, undefined, ''].includes(latitude) || [null, undefined, ''].includes(longitude)) return false;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90
    && Number.isFinite(lng) && lng >= -180 && lng <= 180;
};

const valenciaMap = (latitude, longitude) => {
  if (!hasValidCoordinates(latitude, longitude)) return '';
  const lat = Number(latitude);
  const lng = Number(longitude);
  const bounds = `${lng - 0.006},${lat - 0.004},${lng + 0.006},${lat + 0.004}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bounds)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
};

const taskCoordinates = (assignment) => ({
  latitude: assignment.target_latitude ?? assignment.report_latitude,
  longitude: assignment.target_longitude ?? assignment.report_longitude,
});

const routeUrl = (assignment) => {
  const { latitude, longitude } = taskCoordinates(assignment);
  if (!hasValidCoordinates(latitude, longitude)) return '';
  const lat = Number(latitude);
  const lng = Number(longitude);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}&travelmode=driving&dir_action=navigate`;
};

const ensureStaffLeaflet = () => {
  if (window.L) return Promise.resolve();
  if (staffLeafletPromise) return staffLeafletPromise;
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/vendor/leaflet/leaflet.css';
  const styleReady = new Promise((resolve, reject) => {
    stylesheet.onload = resolve;
    stylesheet.onerror = () => reject(new Error('The map styles could not be loaded.'));
  });
  document.head.append(stylesheet);
  staffLeafletPromise = styleReady.then(() => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/vendor/leaflet/leaflet.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('The interactive map could not be loaded.'));
    document.head.append(script);
  }));
  return staffLeafletPromise;
};

const staffMapStatus = (message) => {
  const status = root.querySelector('[data-live-location-status]');
  if (status) status.textContent = message;
};

const setStaffSharingButton = () => {
  const button = root.querySelector('[data-action="start-location-sharing"], [data-action="stop-location-sharing"]');
  if (!button) return;
  const isSharing = staffLocationAssignmentId === String(button.dataset.id);
  button.dataset.action = isSharing ? 'stop-location-sharing' : 'start-location-sharing';
  button.classList.toggle('staff-btn-danger', isSharing);
  button.classList.toggle('staff-btn-primary', !isSharing);
  button.textContent = isSharing ? 'Stop sharing my location' : 'Start sharing my location';
  button.disabled = !navigator.onLine && !isSharing;
};

const drawStaffRoute = async (position, destination) => {
  if (!staffMap || !window.L || !hasValidCoordinates(destination.latitude, destination.longitude)) return;
  const mapAtStart = staffMap;
  const current = [Number(position.latitude), Number(position.longitude)];
  const target = [Number(destination.latitude), Number(destination.longitude)];
  if (!staffCurrentMarker) {
    staffCurrentMarker = L.circleMarker(current, {
      radius: 9, color: '#075985', weight: 3, fillColor: '#38bdf8', fillOpacity: 1,
    }).addTo(staffMap).bindPopup('Your current location');
  } else staffCurrentMarker.setLatLng(current);
  if (!staffDestinationMarker) {
    staffDestinationMarker = L.marker(target).addTo(staffMap).bindPopup('Reported incident location');
  } else staffDestinationMarker.setLatLng(target);
  if (!staffRouteLine) {
    staffRouteLine = L.polyline([current, target], { color: '#2563eb', weight: 5, opacity: 0.8, dashArray: '8 7' }).addTo(staffMap);
  } else staffRouteLine.setLatLngs([current, target]);

  if (!staffMap._powerwatchHasFramedRoute) {
    staffMap.fitBounds(L.latLngBounds([current, target]), { padding: [28, 28], maxZoom: 15 });
    staffMap._powerwatchHasFramedRoute = true;
  }
  const nowMs = Date.now();
  if (nowMs - staffRouteRequestedAt < 30000) return;
  staffRouteRequestedAt = nowMs;
  const status = root.querySelector('[data-live-location-status]');
  if (status) status.textContent = 'GPS is sharing. Loading route distance and ETA…';
  try {
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${current[1]},${current[0]};${target[1]},${target[0]}?overview=full&geometries=geojson`, {
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(8000) : undefined,
    });
    if (!response.ok) throw new Error('Route service unavailable.');
    const result = await response.json();
    const route = result.routes?.[0];
    if (!route?.geometry?.coordinates?.length) throw new Error('No driving route is available.');
    if (staffMap !== mapAtStart) return;
    if (staffRouteLine) staffRouteLine.setLatLngs(route.geometry.coordinates.map(([lng, lat]) => [lat, lng])).setStyle({ dashArray: null });
    const distance = route.distance >= 1000 ? `${(route.distance / 1000).toFixed(1)} km` : `${Math.round(route.distance)} m`;
    const eta = `${Math.max(1, Math.round(route.duration / 60))} min estimated`;
    staffMapStatus(`GPS is sharing · ${distance} · ${eta}. Keep the Staff App open and visible for updates.`);
  } catch {
    staffMapStatus('GPS is sharing. A driving route or ETA is temporarily unavailable; the map shows a direct guide.');
  }
};

const stopStaffLocationSharing = async ({ remove = true } = {}) => {
  const assignmentId = staffLocationAssignmentId;
  if (staffLocationWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(staffLocationWatchId);
  if (staffLocationPollTimer) window.clearInterval(staffLocationPollTimer);
  staffLocationWatchId = null;
  staffLocationPollTimer = null;
  staffLocationPollInFlight = false;
  staffLocationAssignmentId = null;
  staffLocationLastSentAt = 0;
  staffLocationRequestInFlight = false;
  state.liveLocation = null;
  if (staffCurrentMarker && staffMap) staffMap.removeLayer(staffCurrentMarker);
  if (staffRouteLine && staffMap) staffMap.removeLayer(staffRouteLine);
  staffCurrentMarker = null;
  staffRouteLine = null;
  staffRouteRequestedAt = 0;
  setStaffSharingButton();
  if (assignmentId && remove && state.user && staffLocationUpdatePromise) {
    await staffLocationUpdatePromise.catch(() => {});
  }
  if (assignmentId && remove && state.user) {
    await api(`/api/staff/assignments/${encodeURIComponent(assignmentId)}/live-location`, { method: 'DELETE' });
  }
  staffMapStatus('Location sharing is off. Start sharing to show your live GPS position for this assignment.');
};

const startStaffLocationSharing = (assignmentId) => {
  if (!navigator.geolocation) throw new Error('This browser does not support GPS location.');
  if (!navigator.onLine) throw new Error('Reconnect to the internet before sharing your location.');
  if (staffLocationAssignmentId) throw new Error('Stop location sharing for the current assignment first.');
  const assignment = state.assignments.find((item) => String(item.id) === String(assignmentId));
  if (!assignment || !activeStages.includes(assignment.status)) throw new Error('This assignment is no longer active. Refresh the Staff App.');
  staffLocationAssignmentId = String(assignment.id);
  state.liveLocation = null;
  setStaffSharingButton();
  staffMapStatus('Waiting for GPS permission and a location fix…');
  const handlePosition = async (position) => {
    if (staffLocationAssignmentId !== String(assignment.id)) return;
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy_m: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
    };
    state.liveLocation = location;
    const destination = taskCoordinates(assignment);
    drawStaffRoute(location, destination).catch((error) => staffMapStatus(`The map route could not be updated: ${error.message}`));
    if (location.accuracy_m > 10000) {
      staffMapStatus('GPS accuracy is too low to share this fix. Move to a clearer area and wait for an improved GPS reading.');
      return;
    }
    const nowMs = Date.now();
    if (staffLocationRequestInFlight || nowMs - staffLocationLastSentAt < 15000) return;
    staffLocationRequestInFlight = true;
    staffLocationLastSentAt = nowMs;
    try {
      const request = send(`/api/staff/assignments/${encodeURIComponent(assignment.id)}/live-location`, 'POST', location);
      staffLocationUpdatePromise = request;
      await request;
      if (staffLocationAssignmentId === String(assignment.id)) {
        staffMapStatus(`Sharing your GPS location${location.accuracy_m ? ` (±${Math.round(location.accuracy_m)} m)` : ''}. Keep the Staff App open and visible for updates.`);
      }
    } catch (error) {
      staffMapStatus(`Location update failed: ${error.message}. Check your connection and keep sharing enabled to retry.`);
      if (error.status === 409) {
        await stopStaffLocationSharing({ remove: false });
        showToast('Location sharing stopped because this assignment is closed.');
      }
    } finally {
      staffLocationRequestInFlight = false;
      staffLocationUpdatePromise = null;
    }
  };
  const handleLocationError = async (error) => {
    if (staffLocationAssignmentId !== String(assignment.id)) return;
    if (error.code === 1) {
      const message = 'Location permission was denied. Allow GPS access in browser settings and try again.';
      try {
        await stopStaffLocationSharing();
      } catch (stopError) {
        showToast(`${message} Server cleanup could not be confirmed: ${stopError.message}`);
        return;
      }
      showToast(message);
      return;
    }
    staffMapStatus(error.code === 3
      ? 'GPS timed out. Check device location services; location sharing will retry automatically.'
      : 'The device could not determine a GPS location. Check location services; sharing will retry automatically.');
  };
  try {
    staffLocationWatchId = navigator.geolocation.watchPosition(handlePosition, handleLocationError, {
      enableHighAccuracy: true, maximumAge: 5000, timeout: 20000,
    });
    staffLocationPollTimer = window.setInterval(() => {
      if (staffLocationAssignmentId !== String(assignment.id) || staffLocationPollInFlight) return;
      staffLocationPollInFlight = true;
      navigator.geolocation.getCurrentPosition((position) => {
        staffLocationPollInFlight = false;
        handlePosition(position);
      }, (error) => {
        staffLocationPollInFlight = false;
        handleLocationError(error);
      }, {
        enableHighAccuracy: true, maximumAge: 5000, timeout: 20000,
      });
    }, 15000);
  } catch (error) {
    staffLocationAssignmentId = null;
    setStaffSharingButton();
    throw new Error(`GPS sharing could not start: ${error.message}`);
  }
};

const stageButtons = (assignment) => {
  const next = nextStage(assignment);
  if (next === assignment.latest_stage) return '';
  const labels = {
    Acknowledged: 'Accept assignment',
    'On the Way': 'Mark on the way',
    Arrived: 'Mark arrived',
    Inspecting: 'Start inspection',
    Repairing: 'Begin repair',
    Completed: 'Mark completed',
  };
  const isAccept = next === 'Acknowledged';
  return `<button class="staff-btn staff-btn-primary" type="button" data-action="advance-stage" data-id="${assignment.id}" data-stage="${escapeHtml(next)}">${isAccept ? icon('check') : icon('arrowRight')}${escapeHtml(labels[next] || next)}</button>`;
};

const assignmentCard = (assignment, { compact = false } = {}) => {
  const destination = routeUrl(assignment);
  const coordinates = taskCoordinates(assignment);
  const hasCoordinates = hasValidCoordinates(coordinates.latitude, coordinates.longitude);
  const isTerminal = ['Completed', 'Resolved', 'Cancelled'].includes(assignment.status);
  const confirmedLocation = assignment.location_confirmation;
  const title = assignment.incident_title || assignment.report_code || assignment.incident_code || assignment.assignment_code;
  const stage = assignment.latest_stage || 'Assigned';
  const priorityTone = String(assignment.priority).toLowerCase() === 'critical' ? 'staff-assignment-critical' : '';
  const barangay = assignment.target_barangay || 'Valencia City';
  const purok = assignment.target_purok ? `Purok ${assignment.target_purok}` : '';
  const locationText = [purok, barangay].filter(Boolean).join(', ');
  const statusLabel = statusClass(assignment.status)
    ? (assignment.status === 'Resolved' || assignment.status === 'Completed' ? 'Completed' : activeStages.includes(assignment.status) ? 'Active' : 'Pending')
    : 'Pending';
  const statusClassName = statusClass(assignment.status)
    ? (assignment.status === 'Resolved' || assignment.status === 'Completed' ? 'staff-key-status-done' : activeStages.includes(assignment.status) ? 'staff-key-status-active' : 'staff-key-status-normal')
    : 'staff-key-status-normal';
  const actionMarkup = `<div class="staff-assignment-actions">
    ${compact
      ? `<button class="staff-btn staff-btn-quiet" type="button" data-action="view-assignment" data-id="${assignment.id}">Review assignment</button>`
      : `${destination ? `<div class="staff-assignment-map-action"><a class="staff-btn staff-btn-route" href="${escapeHtml(destination)}" target="_blank" rel="noopener">${icon('route')}Navigate to site</a></div>` : '<span class="staff-muted staff-no-pin">No GPS pin provided.</span>'}${isTerminal ? '' : stageButtons(assignment)}`}
  </div>`;
  return `<article class="staff-card staff-assignment ${compact ? 'staff-assignment-compact' : ''} ${priorityTone}">
    ${!compact ? `<div class="staff-assignment-key-info">
      <div>
        <span class="staff-key-label">Assignment</span>
        <div class="staff-key-value">${escapeHtml(assignment.assignment_code || 'FIELD ASSIGNMENT')}</div>
      </div>
      <div>
        <span class="staff-key-label">Status</span>
        <span class="staff-key-status ${statusClassName}">${icon('clock')}${escapeHtml(statusLabel)}</span>
      </div>
      <div>
        <span class="staff-key-label">Barangay / Purok</span>
        <div class="staff-key-value">${escapeHtml(locationText || 'Location details not supplied')}</div>
      </div>
    </div>` : ''}
    <div class="staff-assignment-top">
      <div>
        <div class="staff-assignment-code">${escapeHtml(assignment.assignment_code || 'FIELD ASSIGNMENT')}</div>
        <h2>${escapeHtml(title || 'Power interruption response')}</h2>
      </div>
      <span class="staff-priority ${priorityClass(assignment.priority)}">${escapeHtml(assignment.priority || 'Normal')}</span>
    </div>
    <div class="staff-assignment-meta">
      <span class="staff-status ${statusClass(assignment.status)}">${icon('clock')}${escapeHtml(stageLabel(stage))}</span>
      <span class="staff-status staff-team-pill">${icon('user')}${escapeHtml(assignment.team_name || 'Assigned crew')}</span>
    </div>
    <div class="staff-place">${icon('pin')}<span>${escapeHtml(locationText || 'Location details not supplied')}</span></div>
    ${actionMarkup}
    ${!compact ? `<hr class="staff-section-divider">` : ''}
    ${!compact ? `<section class="staff-incident-summary">
      <div class="staff-detail-grid">
        <div><dt>Reference</dt><dd>${escapeHtml(assignment.report_code || assignment.incident_code || 'Linked outage')}</dd></div>
        <div><dt>Problem type</dt><dd>${escapeHtml(assignment.possible_outage_type || assignment.outage_type || assignment.incident_type || 'Power interruption')}</dd></div>
        <div><dt>Barangay</dt><dd>${escapeHtml(assignment.target_barangay || 'Not specified')}</dd></div>
        <div><dt>Purok / Sitio</dt><dd>${escapeHtml(confirmedLocation?.confirmed_purok || assignment.target_purok || 'Not specified')}</dd></div>
        ${hasCoordinates
          ? `<div><dt>GPS coordinates</dt><dd>${Number(coordinates.latitude).toFixed(5)}, ${Number(coordinates.longitude).toFixed(5)} · ${assignment.incident_id ? 'Incident location' : assignment.report_location_confirmed ? 'Resident-confirmed pin' : 'Resident-reported, unconfirmed'}</dd></div>` : '<div><dt>GPS coordinates</dt><dd>No exact coordinates supplied; confirm the site with dispatch before travel.</dd></div>'}
        ${assignment.report_location_accuracy_m !== null && assignment.report_location_accuracy_m !== undefined
          ? `<div><dt>GPS accuracy</dt><dd>About ${Math.round(Number(assignment.report_location_accuracy_m))} m</dd></div>` : ''}
      </div>
      <div class="staff-detail-copy">
        <div><dt>Report details</dt><dd>${escapeHtml(assignment.report_description || assignment.incident_description || 'No description supplied.')}</dd></div>
        ${confirmedLocation?.confirmed_location
          ? `<div><dt>Field-confirmed directions</dt><dd>${escapeHtml(confirmedLocation.confirmed_location)}</dd></div>`
          : assignment.report_affected_area && assignment.report_affected_area !== assignment.report_purok
          ? `<div><dt>Additional directions</dt><dd>${escapeHtml(assignment.report_affected_area)}</dd></div>` : ''}
        ${assignment.reporter_name ? `<div><dt>Reported by</dt><dd>${escapeHtml(assignment.reporter_name)}</dd></div>` : ''}
        ${assignment.reporter_contact ? `<div><dt>Authorized contact</dt><dd><a class="staff-contact-link" href="tel:${escapeHtml(assignment.reporter_contact)}">${icon('phone')}${escapeHtml(assignment.reporter_contact)}</a></dd></div>` : ''}
        <div><dt>Dispatch instructions</dt><dd>${escapeHtml(assignment.dispatch_notes || 'No additional instructions.')}</dd></div>
        ${assignment.date_time_noticed ? `<div><dt>Interruption noticed</dt><dd>${escapeHtml(new Date(assignment.date_time_noticed).toLocaleString())}</dd></div>` : ''}
        ${(assignment.reported_at || assignment.incident_start_time) ? `<div><dt>${assignment.reported_at ? 'Report submitted' : 'Incident started'}</dt><dd>${escapeHtml(new Date(assignment.reported_at || assignment.incident_start_time).toLocaleString())}</dd></div>` : ''}
      </div>
      ${confirmedLocation
        ? `<p class="staff-muted staff-confirmed-note" role="status">${icon('check')} Location confirmed by ${escapeHtml(confirmedLocation.staff_name)} · ${escapeHtml(new Date(confirmedLocation.created_at).toLocaleString())}</p>`
        : '<p class="staff-muted staff-unconfirmed-note">Purok and location are resident-reported and have not been field-confirmed.</p>'}
      ${!isTerminal ? `<form class="staff-note-form staff-confirm-form" data-form="confirm-location" data-id="${assignment.id}">
        <h3 class="staff-section-title">Confirm location details</h3>
        <label class="staff-field">Confirmed purok or sitio
          <input name="purok" minlength="2" maxlength="120" value="${escapeHtml(confirmedLocation?.confirmed_purok || assignment.target_purok || '')}" required>
        </label>
        <label class="staff-field">Street, landmark, or directions
          <textarea name="location" minlength="2" maxlength="300" required>${escapeHtml(confirmedLocation?.confirmed_location || assignment.target_location || assignment.report_location || '')}</textarea>
        </label>
        <label class="staff-checkbox"><input type="checkbox" name="confirmed" required>
          <span>I verified these details with the resident or at the site. This does not change the GPS pin.</span>
        </label>
        <div data-location-feedback class="staff-inline-feedback" hidden></div>
        <button class="staff-btn staff-btn-quiet" type="submit">Save confirmed details</button>
      </form>` : ''}
      ${!compact && assignment.report_id && !['Verified', 'Officially Confirmed'].includes(assignment.verification_status) && !assignment.incident_id
        && !isTerminal
        && !['Resolved', 'Rejected', 'Duplicate'].includes(assignment.report_status)
        ? `<div class="staff-case-verification"><div><strong>Verify this report</strong><span>Confirm this resident report on site; no separate incident record will be created.</span></div><button class="staff-btn staff-btn-primary" type="button" data-action="verify-assigned-report" data-id="${assignment.id}">Verify report</button></div>`
        : assignment.incident_code ? `<div class="staff-case-linked"><strong>Verified incident</strong><span>${escapeHtml(assignment.incident_code)} · ${escapeHtml(assignment.incident_title || '')}</span></div>` : ''}
      ${renderStageProgress(assignment)}
      ${assignment.updates?.[0] ? `<div class="staff-latest-update"><span>Latest update · ${escapeHtml(assignment.updates[0].stage)}</span><p>${escapeHtml(assignment.updates[0].notes || 'No field note attached.')}</p></div>` : ''}
    </section>` : ''}
    ${!compact && !isTerminal ? `<div data-stage-feedback class="staff-inline-feedback" hidden></div>` : ''}
    ${compact ? '' : renderEvidence(assignment, { readOnly: isTerminal })}
    ${compact ? '' : renderUpdateForm(assignment, { readOnly: isTerminal })}
  </article>`;
};

const renderStageProgress = (assignment) => {
  if (assignment.status === 'Cancelled') {
    return '<p class="staff-cancelled-note" role="status">This assignment was cancelled by dispatch. Contact your administrator if you need clarification.</p>';
  }
  const current = stageIndex(assignment);
  const currentStageName = stages[current] || 'Assigned';
  const progress = stages.map((stage, index) => `<li class="${index < current ? 'is-complete' : index === current ? 'is-current' : ''}" ${index === current ? 'aria-current="step"' : ''}>
    <span>${index < current ? icon('check') : index + 1}</span><small>${escapeHtml(stage)}</small>
  </li>`).join('');
  return `<div class="staff-stage-wrapper">
    <div class="staff-stage-summary">
      <span class="staff-stage-step-tag">Step ${current + 1} of ${stages.length}</span>
      <strong>${escapeHtml(currentStageName)}</strong>
    </div>
    <div class="staff-progress-scroll"><ol class="staff-stage-progress" aria-label="Response progress">${progress}</ol></div>
  </div>`;
};

const renderEvidence = (assignment, { readOnly = false } = {}) => {
  const reportEvidence = (assignment.attachments || []).map((item) => {
    const url = String(item.file_path || '');
    const mimeType = String(item.mime_type || '');
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${isImage
      ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(item.original_name || 'Resident evidence')}" loading="lazy">`
      : isVideo
        ? `<video src="${escapeHtml(url)}" controls preload="metadata" aria-label="${escapeHtml(item.original_name || 'Resident video evidence')}"></video>`
        : `View ${escapeHtml(item.original_name || 'resident evidence')}`}</a>`;
  }).join('');
  const staffEvidence = (assignment.evidence || []).map((item) => {
    const url = escapeHtml(item.url);
    const description = `Field evidence uploaded ${escapeHtml(new Date(item.created_at).toLocaleString())}`;
    const media = String(item.mime_type || '').startsWith('video/')
      ? `<video src="${url}" controls preload="metadata" aria-label="${description}"></video>`
      : `<img src="${url}" alt="${description}" loading="lazy">`;
    return `<a href="${url}" target="_blank" rel="noopener">${media}</a>`;
  }).join('');
  return `<section class="staff-card staff-evidence-card">
    <div class="staff-section-heading"><div>${icon('camera')}<h3>Evidence</h3></div><span>${(assignment.attachments || []).length + (assignment.evidence || []).length} files</span></div>
    ${(reportEvidence || staffEvidence) ? `<div class="staff-evidence-list">${reportEvidence}${staffEvidence}</div>` : '<p class="staff-muted">No evidence photos or videos are attached yet.</p>'}
    ${readOnly ? '' : `<form class="staff-note-form" data-form="evidence" data-id="${assignment.id}">
      <label class="staff-upload-drop"><input type="file" name="evidence" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" capture="environment" required>
        <span class="staff-upload-icon">${icon('camera')}</span><strong>Take or choose field evidence</strong><small>Photo or video · JPG, PNG, WebP, MP4 or MOV · max 8 MB</small>
      </label>
      <div class="staff-evidence-preview" data-evidence-preview aria-live="polite"></div>
      <div class="staff-upload-progress" data-upload-progress hidden aria-live="polite">
        <div><span data-upload-message>Preparing upload…</span><strong data-upload-percent>0%</strong></div>
        <progress max="100" value="0" data-upload-bar></progress>
      </div>
      <p class="staff-upload-confirmation" data-upload-confirmation role="status" hidden></p>
      <button class="staff-btn staff-btn-primary" type="submit" disabled>Upload evidence</button>
    </form>`}
  </section>`;
};

const renderUpdateForm = (assignment, { readOnly = false } = {}) => `<section class="staff-card staff-notes-card">
  <h3 class="staff-section-title" style="margin-top:0">Response progress &amp; field notes</h3>
  ${readOnly ? '' : `<form class="staff-note-form" data-form="update" data-id="${assignment.id}">
    <label class="staff-field">Field note
      <textarea name="notes" maxlength="2000" placeholder="Inspection findings, work completed, safety risks, or parts needed…"></textarea>
    </label>
    <div data-update-feedback class="staff-inline-feedback" hidden></div>
    <button class="staff-btn staff-btn-quiet" type="submit" data-action="save-note">Save field note</button>
  </form>`}
  ${assignment.updates?.length ? `<h4 class="staff-section-title">Response timeline</h4><div class="staff-notice-list">
    ${assignment.updates.map((update) => `<article class="staff-card staff-notice">
      <strong>${escapeHtml(update.stage)} · ${escapeHtml(update.staff_name || 'Field staff')}</strong>
      ${update.notes ? `<p>${escapeHtml(update.notes)}</p>` : ''}
      <time>${escapeHtml(new Date(update.created_at).toLocaleString())}</time>
    </article>`).join('')}
  </div>` : ''}
</section>`;

const renderStats = () => {
  const assignments = state.assignments;
  const active = activeIncidents();
  const critical = active.filter((assignment) => String(assignment.priority).toLowerCase() === 'critical').length;
  const awaiting = assignments.filter((assignment) => assignment.latest_stage === 'Assigned').length;
  const repairing = assignments.filter((assignment) => assignment.latest_stage === 'Repairing').length;
  const completed = assignments.filter((assignment) => ['Completed', 'Resolved'].includes(assignment.status)).length;
  const verified = state.reports.filter((report) =>
    ['Verified', 'Officially Confirmed'].includes(report.verification_status)).length;
  const resolvedReports = state.reports.filter((report) =>
    ['Resolved', 'Closed'].includes(report.status)).length;
  return `<div class="staff-stats">
    <div class="staff-stat staff-stat-new"><span>Needs acknowledgment</span><strong>${awaiting}</strong></div>
    <div class="staff-stat staff-stat-active"><span>Active assignments</span><strong>${active.length}</strong></div>
    <div class="staff-stat"><span>Verified reports</span><strong>${verified}</strong></div>
    <div class="staff-stat staff-stat-repair"><span>In repair</span><strong>${repairing}</strong></div>
    <div class="staff-stat staff-stat-critical"><span>Critical priority</span><strong>${critical}</strong></div>
    <div class="staff-stat staff-stat-done"><span>Resolved reports</span><strong>${resolvedReports}</strong></div>
  </div><button class="staff-completed-summary" type="button" data-action="open-history" aria-label="View completed assignments">
    <span>${icon('check')} Completed assignments</span><strong>${completed}<span aria-hidden="true">›</span></strong>
  </button>`;
};

const renderRecentUpdates = () => {
  const updates = state.assignments.flatMap((assignment) => (assignment.updates || []).map((update) => ({
    ...update,
    assignment_code: assignment.assignment_code,
    barangay: assignment.target_barangay,
  }))).sort((first, second) => new Date(second.created_at) - new Date(first.created_at)).slice(0, 4);
  return `<section class="staff-recent-updates">
    <div class="staff-section-heading staff-priority-heading"><div><span class="staff-section-kicker">Field activity</span><h2>Recent updates</h2></div></div>
    ${updates.length ? `<div class="staff-notice-list">${updates.map((update) => `<article class="staff-card staff-notice">
      <strong>${escapeHtml(update.assignment_code || 'Assignment')} · ${escapeHtml(update.stage)}</strong>
      <p>${escapeHtml(update.notes || `${update.staff_name || 'Field staff'} updated the response.`)}</p>
      <div class="staff-notice-footer"><span>${escapeHtml(update.barangay || 'Valencia City')}</span><time>${escapeHtml(update.created_at ? new Date(update.created_at).toLocaleString() : '')}</time></div>
    </article>`).join('')}</div>` : '<div class="staff-card staff-empty"><strong>No field progress updates yet</strong>Updates from your assigned teams will appear here.</div>'}
  </section>`;
};

/* data-action="show-area-reports" */
const renderAreaReports = () => {
  const reports = state.reports.filter((report) => !['Resolved', 'Rejected', 'Duplicate'].includes(report.status));
  const cards = reports.slice(0, 8).map((report) => {
    const nextStatus = report.status === 'Submitted' ? 'Under Review'
      : report.status === 'Under Review' ? 'Verified' : null;
    const evidence = (report.attachments || []).map((attachment) => {
      const url = escapeHtml(attachment.file_path);
      const media = String(attachment.mime_type || '').startsWith('video/')
        ? `<video src="${url}" controls preload="metadata" aria-label="${escapeHtml(attachment.original_name || 'Report video evidence')}"></video>`
        : `<img src="${url}" alt="${escapeHtml(attachment.original_name || 'Report photo evidence')}" loading="lazy">`;
      return `<a href="${url}" target="_blank" rel="noopener">${media}</a>`;
    }).join('');
    return `<article class="staff-card staff-area-report-card">
      <div class="staff-assignment-top"><div><div class="staff-assignment-code">${escapeHtml(report.report_code || 'RESIDENT REPORT')}</div>
        <h2>${escapeHtml(report.possible_outage_type || 'Power interruption')}</h2></div>
        <span class="staff-status ${statusClass(report.status)}">${escapeHtml(report.status)}</span></div>
      <p class="staff-location">${icon('pin')} ${escapeHtml([report.purok && `Purok ${report.purok}`, report.barangay].filter(Boolean).join(' · '))}</p>
      <p class="staff-location-address">${escapeHtml(report.location || report.affected_area || 'Location details not supplied')}</p>
      ${report.date_time_noticed ? `<p class="staff-muted">Incident noticed: ${escapeHtml(new Date(report.date_time_noticed).toLocaleString())}</p>` : ''}
      ${report.reported_at ? `<p class="staff-muted">Report submitted: ${escapeHtml(new Date(report.reported_at).toLocaleString())}</p>` : ''}
      <p class="staff-muted staff-report-desc">${escapeHtml(report.description || 'No report description supplied.')}</p>
      ${evidence ? `<div class="staff-evidence-list">${evidence}</div>` : '<p class="staff-muted">No photo or video evidence attached.</p>'}
      ${nextStatus ? `<button class="staff-btn staff-btn-primary" type="button" data-action="update-report-status" data-id="${report.id}" data-status="${nextStatus}">${nextStatus === 'Verified' ? 'Verify report' : 'Start review'}</button>` : ''}
    </article>`;
  }).join('');
  return `<section class="staff-area-reports" id="staff-area-reports">
    <div class="staff-section-heading staff-priority-heading"><div><span class="staff-section-kicker">Assigned barangays</span><h2>Resident reports</h2></div></div>
    ${cards ? `<div class="staff-assignment-list">${cards}</div>` : '<div class="staff-card staff-empty"><strong>No open area reports</strong>Reports submitted from your authorized barangays will appear here.</div>'}
  </section>`;
};

const getCurrentIncidents = () => state.assignments.find((assignment) => String(assignment.id) === String(state.selectedId));

/* Next field action */
const renderHome = () => {
  const active = activeIncidents();
  const prioritySorted = [...active].sort((a, b) => {
    const rank = (value) => String(value).toLowerCase() === 'critical' ? 0 : String(value).toLowerCase() === 'high' ? 1 : 2;
    return rank(a.priority) - rank(b.priority) || stageIndex(a) - stageIndex(b);
  });
  const awaitingAssignments = prioritySorted.filter((assignment) => assignment.latest_stage === 'Assigned');
  const awaitingCount = awaitingAssignments.length;
  return `<header class="staff-page-heading staff-home-hero">
    <div>
      <div class="staff-duty-pill"><span class="staff-pulse-dot"></span> Ready for dispatch</div>
      <h1>Good day, ${escapeHtml((state.user.full_name || 'Team').split(' ')[0])}</h1>
      <p>${active.length ? `${active.length} active assignment${active.length === 1 ? '' : 's'} · ${awaitingCount} awaiting your acknowledgment.` : 'No active assignments. New dispatches will appear here.'}</p>
    </div>
  </header>
  <section class="staff-work-focus" aria-labelledby="staff-work-focus-title">
    <div class="staff-work-focus-copy">
      <span class="staff-section-kicker">${awaitingCount ? 'Next step' : 'Your queue'}</span>
      <h2 id="staff-work-focus-title">${awaitingCount ? 'Review new assignments' : 'Open your assignments'}</h2>
      <p>${awaitingCount
        ? `${awaitingCount} dispatch${awaitingCount === 1 ? '' : 'es'} waiting for your acknowledgment.`
        : active.length ? `${active.length} assignment${active.length === 1 ? '' : 's'} in progress.` : 'Check your queue for new work from dispatch.'}</p>
    </div>
    <button class="staff-work-focus-action" type="button" data-action="navigate" data-page="tasks">
      ${icon('clipboard')}<span>Open assignments</span><strong>${awaitingCount || active.length}</strong>
    </button>
  </section>
  <section class="staff-home-overview" aria-labelledby="staff-home-overview-title">
    <div class="staff-section-heading staff-priority-heading"><div><span class="staff-section-kicker">At a glance</span><h2 id="staff-home-overview-title">Response overview</h2></div></div>
    ${renderStats()}
  </section>
  ${awaitingCount > 0 ? `<section class="staff-home-section"><div class="staff-section-heading staff-priority-heading"><div><span class="staff-section-kicker">Needs your attention</span><h2>New assignments</h2></div></div>
  <div class="staff-assignment-list">${awaitingAssignments.slice(0, 4).map((assignment) => assignmentCard(assignment, { compact: true })).join('')}</div></section>` : ''}
  ${prioritySorted.length > 0 ? `<section class="staff-home-section"><div class="staff-section-heading staff-priority-heading"><div><span class="staff-section-kicker">In progress</span><h2>Active assignments</h2></div></div>
  <div class="staff-assignment-list">${prioritySorted.slice(0, 4).map((assignment) => assignmentCard(assignment, { compact: true })).join('')}</div></section>` : ''}
  ${renderRecentUpdates()}
  <div class="staff-home-section"><div class="staff-section-heading staff-priority-heading"><div><span class="staff-section-kicker">Resident reports</span><h2>Reports from your barangays</h2></div></div>
  ${renderAreaReports()}</div>`;
};

const filterIncidents = () => {
  if (state.filter === 'Active') return state.assignments.filter((assignment) => activeStages.includes(assignment.status));
  if (state.filter === 'Completed') return state.assignments.filter((assignment) => ['Completed', 'Resolved'].includes(assignment.status));
  return state.assignments;
};

const renderTasks = () => {
  const filterOptions = ['Active', 'All', 'Completed'];
  const count = filterIncidents().length;
  return `<header class="staff-page-heading">
    <div>
      <p class="staff-eyebrow">Dispatch queue</p>
      <h1>My assignments</h1>
      <p>${state.assignments.length} assignment${state.assignments.length === 1 ? '' : 's'} linked to your team.</p>
    </div>
  </header>
  <div class="staff-filter-row" aria-label="Filter assignments">${filterOptions.map((option) => `<button class="staff-filter" type="button" data-action="filter" data-filter="${option}" aria-pressed="${state.filter === option}">
    ${option} ${option === state.filter ? `<span class="staff-filter-count">(${count})</span>` : ''}
  </button>`).join('')}</div>
  ${count ? `<div class="staff-assignment-list">${filterIncidents().map((assignment) => assignmentCard(assignment, { compact: true })).join('')}</div>`
    : state.assignments.length
      ? '<div class="staff-card staff-empty"><strong>No assignments match this filter</strong>Choose another status filter to review the rest of your team’s assignments.</div>'
      : '<div class="staff-card staff-empty"><strong>No assignments have been dispatched</strong>When an administrator assigns work to one of your teams, it will appear here. Pull down or tap refresh to check for new dispatches.</div>'}`;
};

/* GPS coordinates remain unchanged */
const renderMap = () => {
  const active = activeIncidents();
  const assignments = active.filter((assignment) => routeUrl(assignment));
  const noGpsIncidents = active.filter((assignment) => !routeUrl(assignment));
  const selected = assignments.find((assignment) => String(assignment.id) === String(state.selectedId)) || assignments[0];
  const coordinates = selected && taskCoordinates(selected);
  const mapUrl = selected && valenciaMap(coordinates.latitude, coordinates.longitude);
  const emptyMessage = !active.length
    ? '<div class="staff-card staff-empty"><strong>No active assignments to map</strong>Your team has no active dispatches right now. New assigned incidents will appear here; completed tasks remain available in Tasks.</div>'
    : '<div class="staff-card staff-empty"><strong>No active assignment has an exact GPS point</strong>The active assignments do not include valid coordinates. Review the reported location details and confirm the site with dispatch; no location is being estimated.</div>';
  return `<header class="staff-page-heading"><div><p class="staff-eyebrow">Field navigation</p><h1>Incident map</h1>
    <p>Share your GPS while traveling to see your position, a driving route, distance, and ETA. Sharing is optional and only available for active assignments.</p></div></header>
  ${assignments.length ? `<label class="staff-field staff-map-select"><span>Choose an active assignment (${assignments.length})</span>
    <select class="staff-upload-input" data-action="select-map-assignment">${assignments.map((assignment) => `<option value="${assignment.id}" ${String(selected.id) === String(assignment.id) ? 'selected' : ''}>${escapeHtml(assignment.assignment_code)} · ${escapeHtml(assignment.target_barangay || 'Valencia City')}</option>`).join('')}</select>
  </label>
  <section class="staff-card staff-map-card">
    <div class="staff-live-map" id="staff-live-map" role="application" aria-label="Interactive map with the reported incident and staff GPS location"></div>
    <div class="staff-map-legend" aria-label="Map legend"><span><i class="staff-map-legend-staff"></i> Staff GPS</span><span><i class="staff-map-legend-incident"></i> Incident</span><span><i class="staff-map-legend-route"></i> Route</span></div>
    <div class="staff-map-location">${icon('pin')}<div><strong>${escapeHtml(selected.target_barangay || 'Valencia City')}</strong><span>${escapeHtml(displayLocation(selected))}</span>
      <span>Destination: ${Number(coordinates.latitude).toFixed(6)}, ${Number(coordinates.longitude).toFixed(6)} · ${selected.incident_id ? 'incident location' : selected.report_location_confirmed ? 'resident-confirmed' : 'resident-reported, not confirmed'}</span></div></div>
    <div class="staff-live-location-controls">
      <p data-live-location-status role="status" aria-live="polite">${staffLocationAssignmentId === String(selected.id) ? 'Sharing your GPS location. Keep the Staff App open and visible for updates.' : 'Location sharing is off. Start sharing to show your live GPS position for this assignment.'}</p>
      <button class="staff-btn ${staffLocationAssignmentId === String(selected.id) ? 'staff-btn-danger' : 'staff-btn-primary'}" type="button" data-action="${staffLocationAssignmentId === String(selected.id) ? 'stop-location-sharing' : 'start-location-sharing'}" data-id="${selected.id}" ${!navigator.onLine && staffLocationAssignmentId !== String(selected.id) ? 'disabled' : ''}>
        ${staffLocationAssignmentId === String(selected.id) ? 'Stop sharing my location' : 'Start sharing my location'}
      </button>
    </div>
    <div class="staff-map-actions"><a class="staff-btn staff-btn-primary" href="${escapeHtml(routeUrl(selected))}" target="_blank" rel="noopener">${icon('route')} Navigate to Incident</a>
      <button class="staff-btn staff-btn-quiet" type="button" data-action="view-assignment" data-id="${selected.id}">Incident details</button></div>
  </section><p class="staff-muted staff-map-help">GPS is sent about every 15 seconds after browser permission is granted. Keep this app open and visible while traveling; mobile browsers may pause location updates in the background. Map tiles come from OpenStreetMap and route requests use OSRM.</p>`
    : emptyMessage}
  ${noGpsIncidents.length ? `<section class="staff-map-unlocated">
    <div class="staff-section-heading staff-priority-heading"><div><span class="staff-section-kicker">Location needs confirmation</span><h2>Tasks without GPS</h2></div></div>
    <div class="staff-assignment-list">${noGpsIncidents.map((assignment) => `<article class="staff-card staff-unlocated-card">
      <div><strong>${escapeHtml(assignment.assignment_code || assignment.report_code || 'Field assignment')}</strong><p>${escapeHtml(displayLocation(assignment))}</p></div>
      <span class="staff-status">${icon('alert')} No GPS</span>
      <button class="staff-btn staff-btn-quiet" type="button" data-action="view-assignment" data-id="${assignment.id}">Review reported details</button>
    </article>`).join('')}</div>
  </section>` : ''}`;
};

const destroyStaffMap = () => {
  staffMapGeneration += 1;
  if (staffMap) staffMap.remove();
  staffMap = null;
  staffDestinationMarker = null;
  staffCurrentMarker = null;
  staffRouteLine = null;
  staffRouteRequestedAt = 0;
};

const mountStaffMap = async (assignment) => {
  const mapElement = document.getElementById('staff-live-map');
  if (!mapElement || !assignment) return;
  const generation = staffMapGeneration;
  try {
    await ensureStaffLeaflet();
    if (generation !== staffMapGeneration || document.getElementById('staff-live-map') !== mapElement) return;
    const destination = taskCoordinates(assignment);
    staffMap = L.map(mapElement, { zoomControl: false }).setView(
      hasValidCoordinates(destination.latitude, destination.longitude)
        ? [Number(destination.latitude), Number(destination.longitude)]
        : [7.9064, 125.0941],
      hasValidCoordinates(destination.latitude, destination.longitude) ? 14 : 12,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc',
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(staffMap);
    L.control.zoom({ position: 'bottomright' }).addTo(staffMap);
    if (hasValidCoordinates(destination.latitude, destination.longitude)) {
      staffDestinationMarker = L.marker([Number(destination.latitude), Number(destination.longitude)])
        .addTo(staffMap).bindPopup('Reported incident location');
    }
    if (staffLocationAssignmentId === String(assignment.id) && state.liveLocation) {
      await drawStaffRoute(state.liveLocation, destination);
    }
  } catch (error) {
    staffMapStatus(`${error.message} You can still open the incident in your navigation app.`);
  }
};

const renderAlerts = () => `<header class="staff-page-heading"><div><p class="staff-eyebrow">Updates from PowerWatch</p><h1>Notifications</h1>
  <p>Assignment notices and account updates.</p></div>${state.unreadNotifications ? `<button class="staff-text-action" type="button" data-action="read-all-notifications">Mark all read</button>` : ''}</header>
  ${state.notifications.length ? `<div class="staff-notice-list">${state.notifications.map((item) => `<article class="staff-card staff-notice ${Number(item.read) ? '' : 'staff-notice-unread'}">
    <strong>${escapeHtml(item.title || 'PowerWatch update')}</strong><p>${escapeHtml(item.message || '')}</p>
    <div class="staff-notice-footer"><time>${escapeHtml(item.created_at ? new Date(item.created_at).toLocaleString() : '')}</time>${Number(item.read) ? '<span class="staff-read-label">Read</span>' : `<button class="staff-text-action" type="button" data-action="read-notification" data-id="${item.id}">Mark read</button>`}</div>
  </article>`).join('')}</div>` : '<div class="staff-card staff-empty"><strong>You are all caught up</strong>New account and dispatch notices will appear here.</div>'}`;

const renderProfile = () => `<header class="staff-page-heading"><div><p class="staff-eyebrow">Signed-in account</p><h1>Field profile</h1>
  <p>Personnel access for Valencia PowerWatch.</p></div></header>
  <section class="staff-card staff-profile">
    <div class="staff-brand"><img src="/assets/powerwatch-logo.svg" alt=""><div><strong>${escapeHtml(state.user.full_name)}</strong><span>Authorized field personnel</span></div></div>
    <div class="staff-profile-row"><span>Email</span><strong>${escapeHtml(state.user.email)}</strong></div>
    <div class="staff-profile-row"><span>Account role</span><strong>${escapeHtml(state.user.role)}</strong></div>
    <div class="staff-profile-row"><span>Assigned teams</span><strong>${state.teams.length}</strong></div>
    <p class="staff-muted">Your permissions only include assignments for teams linked to this personnel account. Contact an administrator to update team access.</p>
    <button class="staff-btn staff-btn-danger" type="button" data-action="logout">Log out</button>
  </section>
  <section class="staff-card staff-profile staff-settings-card">
    <div class="staff-section-heading"><div><span class="staff-section-kicker">Preferences</span><h2>App settings</h2></div></div>
    <p class="staff-muted">Device alerts can notify you about new assignments while the Staff App is open. The app checks for new work every 30 seconds.</p>
    <button class="staff-btn staff-btn-quiet" type="button" data-action="install" aria-controls="staff-install-help" aria-expanded="false">${icon('phone')} Install Staff App</button>
    <button class="staff-btn staff-btn-quiet" type="button" data-action="enable-notifications">${icon('bell')} Enable device alerts</button>
    <button class="staff-btn staff-btn-quiet" type="button" data-action="check-updates">${icon('refresh')} Check for app updates</button>
  </section>`;

const renderDetail = () => {
  const assignment = getCurrentIncidents();
  if (!assignment) {
    state.page = 'tasks';
    return renderTasks();
  }
  return `<header class="staff-page-heading staff-detail-heading">
    <div>
      <p class="staff-eyebrow">Field assignment</p>
      <h1>Assignment details</h1>
      <p>Review the dispatch information and submit response updates.</p>
    </div>
    <button class="staff-btn staff-btn-quiet staff-back-btn" type="button" data-action="back">← Back</button>
  </header>${assignmentCard(assignment)}`;
};

const renderShell = () => {
  destroyStaffMap();
  const title = pages.find(([key]) => key === state.page)?.[2] || 'Incident';
  const content = state.page === 'home' ? renderHome()
    : state.page === 'tasks' ? renderTasks()
      : state.page === 'map' ? renderMap()
        : state.page === 'alerts' ? renderAlerts()
          : state.page === 'profile' ? renderProfile()
            : renderDetail();
  root.innerHTML = `<div class="staff-shell">
    <header class="staff-topbar">
      <div class="staff-topbar-brand"><img src="/assets/powerwatch-logo.svg" alt="">
        <div><strong>Valencia PowerWatch</strong><span>Field response · ${escapeHtml(title)}</span></div>
      </div>
      <div class="staff-topbar-actions">
        <button class="staff-btn staff-icon-button" type="button" data-action="${state.page === 'alerts' ? 'refresh-notifications' : 'refresh'}" aria-label="${state.page === 'alerts' ? 'Refresh notifications' : 'Refresh assignments'}">${icon('refresh')}</button>
      </div>
    </header>
    ${renderInstallHelp()}
    <main class="staff-main">
      ${navigator.onLine ? '' : '<div class="staff-offline-banner" role="status"><strong>You are offline.</strong> Updates and evidence cannot be saved until the connection returns.</div>'}
      ${content}
    </main>
    <nav class="staff-bottom-nav" aria-label="Staff app navigation">${pages.map(([key, iconName, label]) => `<button class="staff-tab" type="button" data-action="navigate" data-page="${key}" aria-current="${state.page === key ? 'page' : 'false'}">
      <span class="staff-tab-icon">${icon(iconName)}${key === 'alerts' && state.unreadNotifications ? `<span class="staff-tab-badge">${state.unreadNotifications > 9 ? '9+' : state.unreadNotifications}</span>` : ''}</span><span class="staff-tab-label">${label}</span>
    </button>`).join('')}</nav>
  </div>`;
  syncInstallButton();
  if (state.page === 'map') {
    const active = activeIncidents().filter((assignment) => routeUrl(assignment));
    const selected = active.find((assignment) => String(assignment.id) === String(state.selectedId)) || active[0];
    if (selected) mountStaffMap(selected);
  }
};

const renderLogin = (message = '') => {
  root.innerHTML = `<main class="staff-login-page"><section class="staff-login-card">
    <div class="staff-brand"><img src="/assets/powerwatch-logo.svg" alt=""><div><strong>Valencia PowerWatch</strong><span>Field response app</span></div></div>
    <button class="staff-btn staff-btn-primary staff-install-login" type="button" data-action="install" aria-controls="staff-install-help" aria-expanded="false">Install Staff App</button>
    ${renderInstallHelp()}
    <p class="staff-eyebrow">Authorized personnel only</p><h1>Staff sign in</h1>
    <p class="staff-login-copy">Use the personnel account created by your administrator to access your assigned incidents.</p>
    ${message ? `<p class="staff-form-error" role="alert">${escapeHtml(message)}</p>` : ''}
    <form class="staff-login-form" data-form="login">
      <label class="staff-field">Email address<input type="email" name="email" autocomplete="username" placeholder="crew@valencia.gov.ph" required></label>
      <label class="staff-field">Password<input type="password" name="password" autocomplete="current-password" placeholder="••••••••" required></label>
      <button class="staff-btn staff-btn-primary staff-login-btn" type="submit">Sign in to field app</button>
    </form>
    <p class="staff-login-copy" style="margin:16px 0 0;font-size:.78rem">This is a separate Staff App. Resident and administrator accounts use their own portals.</p>
  </section></main>`;
  syncInstallButton();
};

const renderInstallHelp = () => `<section class="staff-install-help" id="staff-install-help" aria-live="polite" hidden>
  <strong>Install PowerWatch Field</strong>
  <p>In Chrome, open the ⋮ menu and choose <b>Install app</b> or <b>Add to Home screen</b>. If you use Safari on iPhone, tap Share, then <b>Add to Home Screen</b>.</p>
  <button class="staff-btn staff-btn-quiet" type="button" data-action="dismiss-install-help">Close</button>
</section>`;

const refreshIncidents = async () => {
  const result = await api('/api/staff/assignments');
  const assignments = result.assignments || [];
  if (state.assignmentsLoaded) {
    const existingIds = new Set(state.assignments.map((assignment) => String(assignment.id)));
    const newAssignment = assignments.find((assignment) => !existingIds.has(String(assignment.id)));
    if (newAssignment) {
      const title = `New assignment: ${newAssignment.assignment_code}`;
      showToast(title);
      if (window.Notification?.permission === 'granted') {
        navigator.serviceWorker?.ready.then((registration) => registration.showNotification(title, {
          body: `${newAssignment.target_barangay || 'Valencia City'} · ${newAssignment.priority || 'Normal'} priority`,
          icon: '/assets/powerwatch-icon-192.png',
          badge: '/assets/powerwatch-icon-192.png',
          tag: `assignment-${newAssignment.id}`,
          data: { url: '/staff' },
        })).catch((error) => console.error('Could not show the new-assignment notification.', error));
      }
    }
  }
  state.assignments = assignments;
  state.teams = result.teams || [];
  state.assignmentsLoaded = true;
  if (staffLocationAssignmentId) {
    const trackedAssignment = assignments.find((item) => String(item.id) === staffLocationAssignmentId);
    if (!trackedAssignment || !activeStages.includes(trackedAssignment.status)) {
      stopStaffLocationSharing().catch((error) => showToast(`Location sharing stopped locally, but the server could not confirm removal: ${error.message}`));
    }
  }
};

const refreshReports = async () => {
  const result = await api('/api/reports');
  state.reports = result.reports || [];
};

const refreshNotifications = async () => {
  const result = await api('/api/notifications');
  const notifications = result.notifications || [];
  if (state.notificationsLoaded) {
    const latest = notifications.find((item) => !state.notificationIds.includes(String(item.id)));
    if (latest) {
      showToast(latest.title || 'You have a new PowerWatch notification.');
      if (window.Notification?.permission === 'granted') {
        navigator.serviceWorker?.ready.then((registration) => registration.showNotification(latest.title || 'PowerWatch update', {
          body: latest.message || 'There is a new update in your Staff App.',
          icon: '/assets/powerwatch-icon-192.png',
          badge: '/assets/powerwatch-icon-192.png',
          tag: `notice-${latest.id}`,
          data: { url: '/staff' },
        })).catch((error) => console.error('Could not show the new PowerWatch notification.', error));
      }
    }
  }
  state.notifications = notifications;
  state.notificationIds = notifications.map((item) => String(item.id));
  state.unreadNotifications = notifications.filter((item) => !Number(item.read)).length;
  state.notificationsLoaded = true;
};

const ensureAuthenticated = async () => {
  try {
    const { user } = await api('/api/auth/me');
    if (user.role !== 'personnel') {
      state.user = null;
      renderLogin('This account is not authorized for the Staff App. Sign in with a personnel account.');
      return;
    }
    state.user = user;
    await Promise.all([refreshIncidents(), refreshReports(), refreshNotifications()]);
    renderShell();
    window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(async () => {
      if (!state.user || document.visibilityState !== 'visible') return;
      try {
        await Promise.all([refreshIncidents(), refreshReports(), refreshNotifications()]);
        if (state.page !== 'detail') renderShell();
      } catch (error) {
        if (error.status === 401) {
          state.user = null;
          renderLogin('Your session expired. Sign in again to continue.');
        }
      }
    }, 30000);
  } catch (error) {
    if (error.status === 401) {
      renderLogin();
      return;
    }
    root.innerHTML = `<main class="staff-login-page"><section class="staff-login-card"><h1>Staff app unavailable</h1>
      <p class="staff-login-copy">${escapeHtml(error.message)}</p><button class="staff-btn staff-btn-primary" type="button" data-action="reload">Try again</button></section></main>`;
  }
};

const captureLocation = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('This device does not support GPS location.'));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => resolve({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    }),
    (error) => reject(new Error(error.code === 1 ? 'Allow location access in your browser settings, then retry.' : 'Could not read GPS. Check location services and retry.')),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
  );
});

const submitUpdate = async (form, stage) => {
  const assignmentId = form.dataset.id;
  const notes = form.querySelector('[name="notes"]')?.value || '';
  const data = { stage, notes };
  let gpsWarning = '';
  const submitButton = form.querySelector('button[type="submit"]');
  const feedback = form.querySelector('[data-update-feedback]');
  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.classList.add('staff-btn--loading');
    }
    if (feedback) {
      feedback.hidden = true;
      feedback.removeAttribute('open');
    }
    const position = await captureLocation();
    data.latitude = position.latitude;
    data.longitude = position.longitude;
  } catch (error) {
    gpsWarning = error.message;
  }
  try {
    await send(`/api/staff/assignments/${encodeURIComponent(assignmentId)}/updates`, 'POST', data);
    const message = stage === getCurrentIncidents()?.latest_stage ? 'Field note saved.' : `Response moved to ${stage}.`;
    showToast(gpsWarning ? `${message} GPS was not attached: ${gpsWarning}` : message);
    if (feedback) {
      feedback.textContent = gpsWarning ? `${message} (GPS: ${gpsWarning})` : message;
      feedback.className = 'staff-inline-feedback staff-inline-success';
      feedback.hidden = false;
      feedback.setAttribute('open', '');
    }
    await refreshIncidents();
    state.selectedId = assignmentId;
    state.page = 'detail';
    renderShell();
  } catch (error) {
    if (feedback) {
      feedback.textContent = error.message || 'The update could not be saved. Check your connection and retry.';
      feedback.className = 'staff-inline-feedback staff-inline-error';
      feedback.hidden = false;
      feedback.setAttribute('open', '');
    }
    throw error;
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove('staff-btn--loading');
    }
  }
};

const uploadEvidenceRequest = (url, data, onProgress) => new Promise((resolve, reject) => {
  const request = new XMLHttpRequest();
  request.open('POST', url);
  request.withCredentials = true;
  request.upload.addEventListener('progress', (event) => {
    if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
  });
  request.addEventListener('load', () => {
    const contentType = request.getResponseHeader('content-type') || '';
    let result = request.responseText;
    if (contentType.includes('application/json')) {
      try {
        result = JSON.parse(request.responseText);
      } catch {
        reject(new Error('The server returned an invalid upload response.'));
        return;
      }
    }
    if (request.status < 200 || request.status >= 300) {
      const error = new Error((result && result.error) || 'Evidence could not be uploaded.');
      error.status = request.status;
      reject(error);
      return;
    }
    resolve(result);
  });
  request.addEventListener('error', () => reject(new Error('Upload failed because the server could not be reached. Evidence was not saved.')));
  request.addEventListener('abort', () => reject(new Error('Upload was cancelled. Evidence was not saved.')));
  request.send(data);
});

const setEvidenceUploadState = (form, percent, message) => {
  const progress = form.querySelector('[data-upload-progress]');
  if (!progress) return;
  progress.hidden = false;
  progress.querySelector('[data-upload-bar]').value = percent;
  progress.querySelector('[data-upload-percent]').textContent = `${percent}%`;
  progress.querySelector('[data-upload-message]').textContent = message;
};

const uploadEvidence = async (form) => {
  const file = form.querySelector('[name="evidence"]')?.files?.[0];
  const submitButton = form.querySelector('button[type="submit"]');
  if (!file) throw new Error('Choose a photo or video before uploading.');
  if (!supportedEvidenceTypes.has(file.type)) throw new Error('Choose a JPG, PNG, WebP, MP4, or MOV file.');
  if (file.size > maxEvidenceBytes) throw new Error('Evidence must be 8 MB or smaller.');
  if (!navigator.onLine) throw new Error('You are offline. Evidence was not saved; reconnect and retry.');
  const data = new FormData();
  data.append('evidence', file);
  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.classList.add('staff-btn--loading');
    }
    setEvidenceUploadState(form, 0, 'Uploading evidence…');
    await uploadEvidenceRequest(`/api/staff/assignments/${encodeURIComponent(form.dataset.id)}/evidence`, data, (percent) => {
      setEvidenceUploadState(form, percent, percent === 100 ? 'Upload sent; confirming it was saved…' : 'Uploading evidence…');
    });
  } catch (error) {
    const confirmation = form.querySelector('[data-upload-confirmation]');
    if (confirmation) {
      confirmation.hidden = false;
      confirmation.textContent = `${error.message} Evidence was not confirmed as saved. Retry after checking the file and connection.`;
    }
    throw error;
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove('staff-btn--loading');
    }
  }
  const confirmation = form.querySelector('[data-upload-confirmation]');
  if (confirmation) {
    confirmation.hidden = false;
    confirmation.textContent = 'Evidence uploaded and saved to this assignment.';
  }
  setEvidenceUploadState(form, 100, 'Upload complete.');
  if (evidencePreviewUrl) URL.revokeObjectURL(evidencePreviewUrl);
  evidencePreviewUrl = null;
  state.selectedId = form.dataset.id;
  state.page = 'detail';
  try {
    await refreshIncidents();
  } catch (error) {
    if (error.status === 401) {
      state.user = null;
      renderLogin('Evidence was saved, but your session ended. Sign in again to refresh the assignment.');
      return;
    }
    renderShell();
    showToast('Evidence was saved, but the assignment could not refresh. Refresh before making another upload.');
    return;
  }
  renderShell();
  showToast('Evidence uploaded and saved to the incident record.');
};

const syncInstallButton = () => {
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  root.querySelectorAll('[data-action="install"]').forEach((button) => {
    button.hidden = isInstalled;
  });
  if (isInstalled) {
    const help = root.querySelector('#staff-install-help');
    if (help) help.hidden = true;
  }
};

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.installPrompt = event;
  syncInstallButton();
});
window.addEventListener('appinstalled', () => {
  state.installPrompt = null;
  showToast('PowerWatch Field was installed.');
  syncInstallButton();
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action } = button.dataset;
  try {
    if (action === 'navigate') {
      state.page = button.dataset.page;
      renderShell();
    } else if (action === 'start-location-sharing') {
      startStaffLocationSharing(button.dataset.id);
    } else if (action === 'stop-location-sharing') {
      await stopStaffLocationSharing();
    } else if (action === 'show-area-reports') {
      if (state.page !== 'home') {
        state.page = 'home';
        renderShell();
      }
      root.querySelector('#staff-area-reports')?.scrollIntoView({ block: 'start' });
    } else if (action === 'refresh') {
      button.disabled = true;
      await refreshIncidents();
      renderShell();
      showToast('Incidents refreshed.');
    } else if (action === 'refresh-notifications') {
      button.disabled = true;
      await refreshNotifications();
      renderShell();
      showToast('Notifications refreshed.');
    } else if (action === 'read-notification') {
      await send(`/api/notifications/${encodeURIComponent(button.dataset.id)}/read`, 'PUT');
      await refreshNotifications();
      renderShell();
      showToast('Notification marked as read.');
    } else if (action === 'read-all-notifications') {
      await send('/api/notifications/read-all', 'PUT');
      await refreshNotifications();
      renderShell();
      showToast('All notifications marked as read.');
    } else if (action === 'filter') {
      state.filter = button.dataset.filter;
      renderShell();
    } else if (action === 'open-history') {
      state.filter = 'Completed';
      state.page = 'tasks';
      renderShell();
    } else if (action === 'view-assignment') {
      state.selectedId = button.dataset.id;
      state.page = 'detail';
      renderShell();
    } else if (action === 'back') {
      state.page = 'tasks';
      renderShell();
    } else if (action === 'advance-stage') {
      const assignment = state.assignments.find((item) => String(item.id) === String(button.dataset.id));
      if (!assignment) throw new Error('This assignment is no longer available. Refresh the list.');
      const feedback = root.querySelector(`[data-stage-feedback][hidden]`);
      try {
        button.disabled = true;
        button.classList.add('staff-btn--loading');
        if (feedback) {
          feedback.hidden = true;
          feedback.removeAttribute('open');
        }
        await submitUpdate(root.querySelector(`form[data-form="update"][data-id="${CSS.escape(button.dataset.id)}"]`)
          || { dataset: { id: assignment.id }, querySelector: () => null }, button.dataset.stage);
        if (feedback) {
          feedback.textContent = `Response moved to ${button.dataset.stage}.`;
          feedback.className = 'staff-inline-feedback staff-inline-success';
          feedback.hidden = false;
          feedback.setAttribute('open', '');
        }
      } catch (error) {
        if (feedback) {
          feedback.textContent = error.message || 'Stage could not be advanced. Check your connection and retry.';
          feedback.className = 'staff-inline-feedback staff-inline-error';
          feedback.hidden = false;
          feedback.setAttribute('open', '');
        }
        throw error;
      } finally {
        button.disabled = false;
        button.classList.remove('staff-btn--loading');
      }
    } else if (action === 'verify-assigned-report') {
      const feedback = root.querySelector(`[data-stage-feedback][hidden]`);
      try {
        button.disabled = true;
        button.classList.add('staff-btn--loading');
        if (feedback) {
          feedback.hidden = true;
          feedback.removeAttribute('open');
        }
        const result = await send(`/api/staff/assignments/${encodeURIComponent(button.dataset.id)}/verify`, 'POST', {});
        if (feedback) {
          feedback.textContent = result.message || 'Report verified.';
          feedback.className = 'staff-inline-feedback staff-inline-success';
          feedback.hidden = false;
          feedback.setAttribute('open', '');
        }
        await refreshIncidents();
        renderShell();
        showToast(result.message || 'Report verified.');
      } catch (error) {
        if (feedback) {
          feedback.textContent = error.message || 'Report could not be verified. Check your connection and retry.';
          feedback.className = 'staff-inline-feedback staff-inline-error';
          feedback.hidden = false;
          feedback.setAttribute('open', '');
        }
        throw error;
      } finally {
        button.disabled = false;
        button.classList.remove('staff-btn--loading');
      }
    } else if (action === 'update-report-status') {
      const feedback = root.querySelector(`[data-stage-feedback][hidden]`);
      try {
        button.disabled = true;
        button.classList.add('staff-btn--loading');
        if (feedback) {
          feedback.hidden = true;
          feedback.removeAttribute('open');
        }
        const result = await send(`/api/reports/${encodeURIComponent(button.dataset.id)}/status`, 'PUT', {
          status: button.dataset.status,
        });
        if (feedback) {
          feedback.textContent = result.message || 'Report status updated.';
          feedback.className = 'staff-inline-feedback staff-inline-success';
          feedback.hidden = false;
          feedback.setAttribute('open', '');
        }
        await refreshReports();
        renderShell();
        showToast(result.message || 'Report status updated.');
      } catch (error) {
        if (feedback) {
          feedback.textContent = error.message || 'Report status could not be updated. Check your connection and retry.';
          feedback.className = 'staff-inline-feedback staff-inline-error';
          feedback.hidden = false;
          feedback.setAttribute('open', '');
        }
        throw error;
      } finally {
        button.disabled = false;
        button.classList.remove('staff-btn--loading');
      }
    } else if (action === 'share-location') {
      const feedback = root.querySelector(`[data-stage-feedback][hidden]`);
      try {
        button.disabled = true;
        button.classList.add('staff-btn--loading');
        if (feedback) {
          feedback.hidden = true;
          feedback.removeAttribute('open');
        }
        const position = await captureLocation();
        await send(`/api/staff/teams/${encodeURIComponent(button.dataset.teamId)}/location`, 'PUT', {
          latitude: position.latitude,
          longitude: position.longitude,
        });
        if (feedback) {
          feedback.textContent = `GPS shared with dispatch (±${Math.round(position.accuracy)} m).`;
          feedback.className = 'staff-inline-feedback staff-inline-success';
          feedback.hidden = false;
          feedback.setAttribute('open', '');
        }
        showToast(`GPS shared with dispatch (±${Math.round(position.accuracy)} m).`);
        await refreshIncidents();
        renderShell();
      } catch (error) {
        if (feedback) {
          feedback.textContent = error.message || 'GPS could not be shared. Check location services and retry.';
          feedback.className = 'staff-inline-feedback staff-inline-error';
          feedback.hidden = false;
          feedback.setAttribute('open', '');
        }
        throw error;
      } finally {
        button.disabled = false;
        button.classList.remove('staff-btn--loading');
      }
    } else if (action === 'enable-notifications') {
      if (!('Notification' in window)) {
        showToast('This browser does not support on-device notifications.');
      } else {
        const permission = await Notification.requestPermission();
        showToast(permission === 'granted'
          ? 'On-device alerts are enabled while the Staff App is active.'
          : 'Notifications were not enabled. You can still view alerts in the app.');
      }
    } else if (action === 'check-updates') {
      if (!('serviceWorker' in navigator)) {
        showToast('Service workers are not available in this browser.');
      } else {
        if (typeof window.powerWatchCheckStaffUpdate !== 'function') {
          throw new Error('The Staff App update checker is not ready yet. Reload and try again.');
        }
        await window.powerWatchCheckStaffUpdate();
        showToast('Update check complete. If an update is available, you can install it from the notice.');
      }
    } else if (action === 'install') {
      if (state.installPrompt) {
        const prompt = state.installPrompt;
        state.installPrompt = null;
        await prompt.prompt();
        await prompt.userChoice;
        syncInstallButton();
      } else {
        const help = root.querySelector('#staff-install-help');
        if (help) {
          help.hidden = !help.hidden;
          button.setAttribute('aria-expanded', String(!help.hidden));
        }
      }
    } else if (action === 'dismiss-install-help') {
      const help = root.querySelector('#staff-install-help');
      if (help) help.hidden = true;
      root.querySelector('[data-action="install"]')?.setAttribute('aria-expanded', 'false');
    } else if (action === 'logout') {
      if (staffLocationAssignmentId) await stopStaffLocationSharing();
      await send('/api/auth/logout', 'POST');
      if (evidencePreviewUrl) URL.revokeObjectURL(evidencePreviewUrl);
      evidencePreviewUrl = null;
      state.user = null;
      state.assignments = [];
      state.reports = [];
      state.teams = [];
      state.notifications = [];
      state.notificationIds = [];
      state.unreadNotifications = 0;
      state.assignmentsLoaded = false;
      state.notificationsLoaded = false;
      renderLogin();
    } else if (action === 'reload') {
      window.location.reload();
    }
  } catch (error) {
    if (error.status === 401) {
      state.user = null;
      renderLogin('Your session expired. Sign in again to continue.');
    } else {
      showToast(!navigator.onLine
        ? 'You are offline. The action was not confirmed; reconnect and retry.'
        : error.message || 'The action could not be completed.');
      const nextButton = root.querySelector(`[data-action="${action}"]`);
      if (nextButton) nextButton.disabled = false;
    }
  }
});

document.addEventListener('change', async (event) => {
  if (event.target.matches('[data-action="select-map-assignment"]')) {
    if (staffLocationAssignmentId && staffLocationAssignmentId !== String(event.target.value)) {
      await stopStaffLocationSharing();
    }
    state.selectedId = event.target.value;
    renderShell();
    return;
  }
  if (event.target.matches('input[name="evidence"]')) {
    const input = event.target;
    const form = input.closest('form[data-form="evidence"]');
    const file = input.files?.[0];
    const preview = form?.querySelector('[data-evidence-preview]');
    const confirmation = form?.querySelector('[data-upload-confirmation]');
    const uploadButton = form?.querySelector('button[type="submit"]');
    if (evidencePreviewUrl) URL.revokeObjectURL(evidencePreviewUrl);
    evidencePreviewUrl = null;
    if (!form || !preview || !uploadButton) return;
    if (confirmation) {
      confirmation.hidden = true;
      confirmation.textContent = '';
    }
    const progress = form.querySelector('[data-upload-progress]');
    if (progress) {
      progress.hidden = true;
      progress.querySelector('[data-upload-bar]').value = 0;
      progress.querySelector('[data-upload-percent]').textContent = '0%';
      progress.querySelector('[data-upload-message]').textContent = 'Preparing upload…';
    }
    if (!file) {
      preview.innerHTML = '';
      uploadButton.disabled = true;
      return;
    }
    if (!supportedEvidenceTypes.has(file.type)) {
      input.value = '';
      preview.innerHTML = '';
      uploadButton.disabled = true;
      showToast('Unsupported evidence type. Choose a JPG, PNG, WebP, MP4, or MOV file.');
      return;
    }
    if (file.size > maxEvidenceBytes) {
      input.value = '';
      preview.innerHTML = '';
      uploadButton.disabled = true;
      showToast('Evidence must be 8 MB or smaller.');
      return;
    }
    evidencePreviewUrl = URL.createObjectURL(file);
    const media = file.type.startsWith('video/')
      ? `<video src="${escapeHtml(evidencePreviewUrl)}" controls preload="metadata" aria-label="Selected evidence preview"></video>`
      : `<img src="${escapeHtml(evidencePreviewUrl)}" alt="Selected evidence preview">`;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    preview.innerHTML = `<div class="staff-evidence-preview-media">${media}</div><div><strong>${escapeHtml(file.name)}</strong><span>${sizeMb} MB · ${file.type.startsWith('video/') ? 'Video' : 'Photo'} preview</span></div>`;
    uploadButton.disabled = false;
  }
});

window.addEventListener('online', () => {
  if (state.user) {
    renderShell();
    showToast('Connection restored. You can submit updates and evidence.');
  }
});
window.addEventListener('offline', () => {
  if (state.user) renderShell();
});

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  const { form: formType } = form.dataset;
  if (!['login', 'update', 'evidence', 'confirm-location'].includes(formType)) return;
  event.preventDefault();
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  try {
    if (formType === 'login') {
      const values = Object.fromEntries(new FormData(form).entries());
      await send('/api/auth/login', 'POST', { ...values, remember: true, portal: 'staff' });
      await ensureAuthenticated();
    } else if (formType === 'update') {
      const assignment = state.assignments.find((item) => String(item.id) === String(form.dataset.id));
      if (!assignment) throw new Error('This assignment is no longer available. Refresh the list.');
      const notes = form.querySelector('[name="notes"]').value.trim();
      if (!notes) throw new Error('Enter a field note or use the response stage action.');
      await submitUpdate(form, assignment.latest_stage || 'Assigned');
    } else if (formType === 'evidence') {
      await uploadEvidence(form);
    } else if (formType === 'confirm-location') {
      const confirmed = form.querySelector('[name="confirmed"]').checked;
      const purok = form.querySelector('[name="purok"]').value.trim();
      const location = form.querySelector('[name="location"]').value.trim();
      const submitButton = form.querySelector('button[type="submit"]');
      const feedback = form.querySelector('[data-location-feedback]');
      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.classList.add('staff-btn--loading');
        }
        if (feedback) {
          feedback.hidden = true;
          feedback.removeAttribute('open');
        }
        const result = await send(`/api/staff/assignments/${encodeURIComponent(form.dataset.id)}/location`, 'POST', {
          confirmed,
          purok,
          location,
        });
        if (feedback) {
          feedback.textContent = result.message || 'Location details confirmed.';
          feedback.className = 'staff-inline-feedback staff-inline-success';
          feedback.hidden = false;
          feedback.setAttribute('open', '');
        }
        await refreshIncidents();
        state.selectedId = form.dataset.id;
        state.page = 'detail';
        renderShell();
        showToast(result.message || 'Location details confirmed.');
      } catch (error) {
        if (feedback) {
          feedback.textContent = error.message || 'Location details could not be saved. Check your connection and retry.';
          feedback.className = 'staff-inline-feedback staff-inline-error';
          feedback.hidden = false;
          feedback.setAttribute('open', '');
        }
        throw error;
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.classList.remove('staff-btn--loading');
        }
      }
    }
  } catch (error) {
    if (formType === 'login') renderLogin(error.message || 'Sign-in failed. Check your email and password.');
    else showToast(!navigator.onLine
      ? 'You are offline. The update was not saved; reconnect and retry.'
      : error.message || 'The form could not be submitted.');
    if (submitButton) submitButton.disabled = false;
  }
});

ensureAuthenticated();
