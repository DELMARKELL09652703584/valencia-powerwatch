const root = document.getElementById('staff-app');
const toast = document.getElementById('staff-toast');
let refreshTimer = null;
const activeStages = ['Dispatched', 'En Route', 'Arrived On Site', 'In Progress'];
const stages = ['Assigned', 'Acknowledged', 'On the Way', 'Arrived', 'Inspecting', 'Repairing', 'Completed'];
const pages = [
  ['home', 'home', 'Today'],
  ['tasks', 'clipboard', 'Tasks'],
  ['map', 'map', 'Map'],
  ['alerts', 'bell', 'Alerts'],
  ['profile', 'user', 'Profile'],
];
const state = {
  user: null,
  assignments: [],
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

const activeAssignments = () => state.assignments.filter((assignment) => activeStages.includes(assignment.status));
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

const valenciaMap = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return '';
  const bounds = `${lng - 0.006},${lat - 0.004},${lng + 0.006},${lat + 0.004}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bounds)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
};

const taskCoordinates = (assignment) => ({
  latitude: assignment.target_latitude ?? assignment.report_latitude,
  longitude: assignment.target_longitude ?? assignment.report_longitude,
});

const routeUrl = (assignment) => {
  const { latitude, longitude } = taskCoordinates(assignment);
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return '';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}&travelmode=driving`;
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
  return `<button class="staff-btn staff-btn-primary" type="button" data-action="advance-stage" data-id="${assignment.id}" data-stage="${escapeHtml(next)}">${isAccept ? icon('check') : ''}${escapeHtml(labels[next] || next)}</button>`;
};

const assignmentCard = (assignment, { compact = false } = {}) => {
  const destination = routeUrl(assignment);
  const isTerminal = ['Completed', 'Resolved', 'Cancelled'].includes(assignment.status);
  const title = assignment.incident_title || assignment.report_code || assignment.incident_code || assignment.assignment_code;
  const stage = assignment.latest_stage || 'Assigned';
  return `<article class="staff-card staff-assignment ${String(assignment.priority).toLowerCase() === 'critical' ? 'staff-assignment-critical' : ''}">
    <div class="staff-assignment-top">
      <div>
        <div class="staff-assignment-code">${escapeHtml(assignment.assignment_code || 'FIELD ASSIGNMENT')}</div>
        <h2>${escapeHtml(title || 'Power interruption response')}</h2>
      </div>
      <span class="staff-priority ${priorityClass(assignment.priority)}">${escapeHtml(assignment.priority || 'Normal')}</span>
    </div>
    <div class="staff-assignment-meta">
      <span class="staff-status ${statusClass(assignment.status)}">${icon('clock')}${escapeHtml(stageLabel(stage))}</span>
      <span class="staff-status">${escapeHtml(assignment.team_name || 'Assigned crew')}</span>
    </div>
    <div class="staff-place">${icon('pin')}<span>${escapeHtml(displayLocation(assignment))}</span></div>
    ${!compact ? `<section class="staff-incident-summary">
      <div class="staff-detail-grid">
        <div><dt>Incident</dt><dd>${escapeHtml(assignment.report_code || assignment.incident_code || 'Linked outage')}</dd></div>
        <div><dt>Reported problem</dt><dd>${escapeHtml(assignment.possible_outage_type || 'Power interruption')}</dd></div>
        <div><dt>Barangay</dt><dd>${escapeHtml(assignment.target_barangay || 'Not specified')}</dd></div>
        <div><dt>Purok</dt><dd>${escapeHtml(assignment.target_purok || 'Not specified')}</dd></div>
      </div>
      <div class="staff-detail-copy">
        <div><dt>Report details</dt><dd>${escapeHtml(assignment.report_description || assignment.incident_description || 'No description supplied.')}</dd></div>
        ${assignment.reporter_name ? `<div><dt>Reported by</dt><dd>${escapeHtml(assignment.reporter_name)}</dd></div>` : ''}
        <div><dt>Dispatch instructions</dt><dd>${escapeHtml(assignment.dispatch_notes || 'No additional instructions.')}</dd></div>
        ${assignment.reported_at ? `<div><dt>Reported</dt><dd>${escapeHtml(new Date(assignment.reported_at).toLocaleString())}</dd></div>` : ''}
      </div>
      ${!compact && assignment.report_id && !assignment.report_incident_id && !assignment.incident_id
        && !isTerminal
        && !['Resolved', 'Rejected', 'Duplicate'].includes(assignment.report_status)
        ? `<div class="staff-case-verification"><div><strong>Report verification</strong><span>This assigned report is not yet linked to a verified incident.</span></div><button class="staff-btn staff-btn-primary" type="button" data-action="verify-assigned-report" data-id="${assignment.id}">Verify &amp; create incident</button></div>`
        : assignment.incident_code ? `<div class="staff-case-linked"><strong>Verified incident</strong><span>${escapeHtml(assignment.incident_code)} · ${escapeHtml(assignment.incident_title || '')}</span></div>` : ''}
      ${renderStageProgress(assignment)}
      ${assignment.updates?.[0] ? `<div class="staff-latest-update"><span>Latest update · ${escapeHtml(assignment.updates[0].stage)}</span><p>${escapeHtml(assignment.updates[0].notes || 'No field note attached.')}</p></div>` : ''}
    </section>` : ''}
    <div class="staff-assignment-actions">
      ${compact ? `<button class="staff-btn staff-btn-quiet" type="button" data-action="view-assignment" data-id="${assignment.id}">Details</button>` : ''}
      ${destination ? `<a class="staff-btn staff-btn-route" href="${escapeHtml(destination)}" target="_blank" rel="noopener">${icon('route')}Navigate</a>` : '<span class="staff-muted staff-no-pin">No GPS pin was provided.</span>'}
      ${isTerminal ? '' : stageButtons(assignment)}
    </div>
    ${compact ? '' : renderEvidence(assignment, { readOnly: isTerminal })}
    ${compact ? '' : renderUpdateForm(assignment, { readOnly: isTerminal })}
  </article>`;
};

const renderStageProgress = (assignment) => {
  const current = stageIndex(assignment);
  const stagesToShow = stages.slice(0, -1);
  return `<ol class="staff-stage-progress" aria-label="Response progress">${stagesToShow.map((stage, index) => `<li class="${index < current ? 'is-complete' : index === current ? 'is-current' : ''}" ${index === current ? 'aria-current="step"' : ''}>
    <span>${index < current ? icon('check') : index + 1}</span><small>${escapeHtml(stage)}</small>
  </li>`).join('')}</ol>`;
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
        <span class="staff-upload-icon">${icon('camera')}</span><strong>Take or choose field evidence</strong><small>JPG, PNG, WebP, MP4 or MOV · max 8 MB</small>
      </label>
      <button class="staff-btn staff-btn-primary" type="submit">Upload evidence</button>
    </form>`}
  </section>`;
};

const renderUpdateForm = (assignment, { readOnly = false } = {}) => `<section class="staff-card">
  <h3 class="staff-section-title" style="margin-top:0">Response progress &amp; field notes</h3>
  ${readOnly ? '' : `<form class="staff-note-form" data-form="update" data-id="${assignment.id}">
    <label class="staff-field">Field note
      <textarea name="notes" maxlength="2000" placeholder="Inspection findings, work completed, safety risks, or parts needed…"></textarea>
    </label>
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
  const active = activeAssignments();
  const critical = active.filter((assignment) => String(assignment.priority).toLowerCase() === 'critical').length;
  const awaiting = assignments.filter((assignment) => assignment.latest_stage === 'Assigned').length;
  const repairing = assignments.filter((assignment) => assignment.latest_stage === 'Repairing').length;
  const completed = assignments.filter((assignment) => ['Completed', 'Resolved'].includes(assignment.status)).length;
  return `<div class="staff-stats">
    <div class="staff-stat staff-stat-new"><span>New</span><strong>${awaiting}</strong></div>
    <div class="staff-stat staff-stat-active"><span>Active</span><strong>${active.length}</strong></div>
    <div class="staff-stat staff-stat-repair"><span>Repairing</span><strong>${repairing}</strong></div>
    <div class="staff-stat staff-stat-critical"><span>Critical</span><strong>${critical}</strong></div>
  </div><button class="staff-completed-summary" type="button" data-action="open-history">
    <span>${icon('check')} Completed assignments</span><strong>${completed}<span aria-hidden="true">›</span></strong>
  </button>`;
};

const getCurrentAssignments = () => state.assignments.find((assignment) => String(assignment.id) === String(state.selectedId));

const renderHome = () => {
  const active = activeAssignments();
  const prioritySorted = [...active].sort((a, b) => {
    const rank = (value) => String(value).toLowerCase() === 'critical' ? 0 : String(value).toLowerCase() === 'high' ? 1 : 2;
    return rank(a.priority) - rank(b.priority);
  });
  return `<header class="staff-page-heading"><div><p class="staff-eyebrow">Field response center</p>
    <h1>Good day, ${escapeHtml((state.user.full_name || 'Team').split(' ')[0])}</h1>
    <p>Here is your field response overview.</p></div>
  </header>
  ${renderStats()}
  <div class="staff-section-heading staff-priority-heading"><div><span class="staff-section-kicker">Needs attention</span><h2>Priority assignments</h2></div>
    <button class="staff-text-action" type="button" data-action="navigate" data-page="tasks">All tasks <span aria-hidden="true">›</span></button>
  </div>
  ${prioritySorted.length ? `<div class="staff-assignment-list">${prioritySorted.slice(0, 4).map((assignment) => assignmentCard(assignment, { compact: true })).join('')}</div>`
    : '<div class="staff-card staff-empty"><strong>No active response tasks</strong>New incidents assigned to your team will appear here.</div>'}
  <div class="staff-section-heading staff-priority-heading"><div><span class="staff-section-kicker">Dispatch</span><h2>Assigned crews</h2></div></div>
  ${state.teams.length ? `<div class="staff-assignment-list">${state.teams.map((team) => `<article class="staff-card">
    <div class="staff-assignment-top"><div><div class="staff-assignment-code">${escapeHtml(team.name)}</div><h2>${escapeHtml(team.lead_technician || 'Field team')}</h2></div>
    <span class="staff-status ${team.status === 'Available' ? 'staff-status-done' : 'staff-status-active'}">${escapeHtml(team.status || 'Available')}</span></div>
    <p class="staff-muted">${escapeHtml(team.vehicle_type || 'Response crew')}${team.base_station ? ` · Base: ${escapeHtml(team.base_station)}` : ''}</p>
    ${team.location_updated_at ? `<p class="staff-location">${icon('pin')} GPS updated ${escapeHtml(new Date(team.location_updated_at).toLocaleString())}</p>` : ''}
    <button class="staff-btn staff-btn-quiet" type="button" data-action="share-location" data-team-id="${team.id}">${icon('pin')} Share GPS with dispatch</button>
  </article>`).join('')}</div>` : '<div class="staff-card staff-empty"><strong>Waiting for team access</strong>Ask an administrator to assign your personnel account to a field team.</div>'}`;
};

const filterAssignments = () => {
  if (state.filter === 'Active') return state.assignments.filter((assignment) => activeStages.includes(assignment.status));
  if (state.filter === 'Completed') return state.assignments.filter((assignment) => ['Completed', 'Resolved'].includes(assignment.status));
  return state.assignments;
};

const renderTasks = () => {
  const filterOptions = ['Active', 'All', 'Completed'];
  return `<header class="staff-page-heading"><div><p class="staff-eyebrow">Dispatch queue</p><h1>My assignments</h1>
    <p>${state.assignments.length} assignment${state.assignments.length === 1 ? '' : 's'} linked to your team.</p></div>
  </header>
  <div class="staff-filter-row" aria-label="Filter assignments">${filterOptions.map((option) => `<button class="staff-filter" type="button" data-action="filter" data-filter="${option}" aria-pressed="${state.filter === option}">${option}</button>`).join('')}</div>
  ${filterAssignments().length ? `<div class="staff-assignment-list">${filterAssignments().map((assignment) => assignmentCard(assignment, { compact: true })).join('')}</div>`
    : '<div class="staff-card staff-empty"><strong>No assignments in this view</strong>Choose a different filter or refresh the queue.</div>'}`;
};

const renderMap = () => {
  const assignments = activeAssignments().filter((assignment) => routeUrl(assignment));
  const selected = assignments.find((assignment) => String(assignment.id) === String(state.selectedId)) || assignments[0];
  const coordinates = selected && taskCoordinates(selected);
  const mapUrl = selected && valenciaMap(coordinates.latitude, coordinates.longitude);
  return `<header class="staff-page-heading"><div><p class="staff-eyebrow">Field navigation</p><h1>Incident map</h1>
    <p>Choose an active assignment to view its reported GPS point.</p></div></header>
  ${assignments.length ? `<label class="staff-field staff-map-select">Choose an active assignment
    <select class="staff-upload-input" data-action="select-map-assignment">${assignments.map((assignment) => `<option value="${assignment.id}" ${String(selected.id) === String(assignment.id) ? 'selected' : ''}>${escapeHtml(assignment.assignment_code)} · ${escapeHtml(assignment.target_barangay || 'Valencia City')}</option>`).join('')}</select>
  </label>
  <section class="staff-card staff-map-card">
    <iframe class="staff-map-frame" title="OpenStreetMap incident location" loading="lazy" referrerpolicy="no-referrer" src="${escapeHtml(mapUrl)}"></iframe>
    <div class="staff-map-location">${icon('pin')}<div><strong>${escapeHtml(selected.target_barangay || 'Valencia City')}</strong><span>${escapeHtml(displayLocation(selected))}</span></div></div>
    <div class="staff-map-actions"><a class="staff-btn staff-btn-primary" href="${escapeHtml(routeUrl(selected))}" target="_blank" rel="noopener">${icon('route')} Start navigation</a>
      <button class="staff-btn staff-btn-quiet" type="button" data-action="view-assignment" data-id="${selected.id}">Incident details</button></div>
  </section><p class="staff-muted staff-map-help">Map location uses the incident GPS point. Confirm the site details before dispatching.</p>`
    : '<div class="staff-card staff-empty"><strong>No active assignment with GPS</strong>Assigned locations with coordinates will be available here.</div>'}`;
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
    <button class="staff-btn staff-btn-quiet" type="button" data-action="enable-notifications">${icon('bell')} Enable device alerts</button>
    <button class="staff-btn staff-btn-quiet" type="button" data-action="check-updates">${icon('refresh')} Check for app updates</button>
  </section>`;

const renderDetail = () => {
  const assignment = getCurrentAssignments();
  if (!assignment) {
    state.page = 'tasks';
    return renderTasks();
  }
  return `<header class="staff-page-heading"><div><p class="staff-eyebrow">Field assignment</p><h1>Incident details</h1>
    <p>Review the dispatch information and submit response updates.</p></div>
    <button class="staff-btn staff-btn-quiet" type="button" data-action="back">← Back</button>
  </header>${assignmentCard(assignment)}`;
};

const renderShell = () => {
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
        <button class="staff-btn" type="button" data-action="install" hidden>Install</button>
        <button class="staff-btn staff-icon-button" type="button" data-action="${state.page === 'alerts' ? 'refresh-notifications' : 'refresh'}" aria-label="${state.page === 'alerts' ? 'Refresh notifications' : 'Refresh assignments'}">${icon('refresh')}</button>
      </div>
    </header>
    <main class="staff-main">${content}</main>
    <nav class="staff-bottom-nav" aria-label="Staff app navigation">${pages.map(([key, iconName, label]) => `<button class="staff-tab" type="button" data-action="navigate" data-page="${key}" aria-current="${state.page === key ? 'page' : 'false'}">
      <span class="staff-tab-icon">${icon(iconName)}${key === 'alerts' && state.unreadNotifications ? `<span class="staff-tab-badge">${state.unreadNotifications > 9 ? '9+' : state.unreadNotifications}</span>` : ''}</span><span class="staff-tab-label">${label}</span>
    </button>`).join('')}</nav>
  </div>`;
  syncInstallButton();
};

const renderLogin = (message = '') => {
  root.innerHTML = `<main class="staff-login-page"><section class="staff-login-card">
    <div class="staff-brand"><img src="/assets/powerwatch-logo.svg" alt=""><div><strong>Valencia PowerWatch</strong><span>Field response app</span></div></div>
    <p class="staff-eyebrow">Authorized personnel only</p><h1>Staff sign in</h1>
    <p class="staff-login-copy">Use the personnel account created by your administrator to access your assigned incidents.</p>
    ${message ? `<p class="staff-form-error" role="alert">${escapeHtml(message)}</p>` : ''}
    <form class="staff-login-form" data-form="login">
      <label class="staff-field">Email address<input type="email" name="email" autocomplete="username" required></label>
      <label class="staff-field">Password<input type="password" name="password" autocomplete="current-password" required></label>
      <button class="staff-btn staff-btn-primary" type="submit">Sign in to field app</button>
    </form>
    <p class="staff-login-copy" style="margin:16px 0 0;font-size:.78rem">This is a separate Staff App. Resident and administrator accounts use their own portals.</p>
  </section></main>`;
};

const refreshAssignments = async () => {
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
    await Promise.all([refreshAssignments(), refreshNotifications()]);
    renderShell();
    window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(async () => {
      if (!state.user || document.visibilityState !== 'visible') return;
      try {
        await Promise.all([refreshAssignments(), refreshNotifications()]);
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
  try {
    const position = await captureLocation();
    data.latitude = position.latitude;
    data.longitude = position.longitude;
  } catch (error) {
    gpsWarning = error.message;
  }
  await send(`/api/staff/assignments/${encodeURIComponent(assignmentId)}/updates`, 'POST', data);
  const message = stage === getCurrentAssignments()?.latest_stage ? 'Field note saved.' : `Response moved to ${stage}.`;
  showToast(gpsWarning ? `${message} GPS was not attached: ${gpsWarning}` : message);
  await refreshAssignments();
  state.selectedId = assignmentId;
  state.page = 'detail';
  renderShell();
};

const uploadEvidence = async (form) => {
  const file = form.querySelector('[name="evidence"]')?.files?.[0];
  if (!file) throw new Error('Choose a photo or video before uploading.');
  const data = new FormData();
  data.append('evidence', file);
  await api(`/api/staff/assignments/${encodeURIComponent(form.dataset.id)}/evidence`, { method: 'POST', body: data });
  showToast('Field photo uploaded to the incident record.');
  await refreshAssignments();
  state.selectedId = form.dataset.id;
  state.page = 'detail';
  renderShell();
};

const syncInstallButton = () => {
  const button = root.querySelector('[data-action="install"]');
  if (button) button.hidden = !state.installPrompt || window.matchMedia('(display-mode: standalone)').matches;
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
    } else if (action === 'refresh') {
      button.disabled = true;
      await refreshAssignments();
      renderShell();
      showToast('Assignments refreshed.');
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
      button.disabled = true;
      await submitUpdate(root.querySelector(`form[data-form="update"][data-id="${CSS.escape(button.dataset.id)}"]`)
        || { dataset: { id: assignment.id }, querySelector: () => null }, button.dataset.stage);
    } else if (action === 'verify-assigned-report') {
      button.disabled = true;
      const result = await send(`/api/staff/assignments/${encodeURIComponent(button.dataset.id)}/verify`, 'POST', {});
      await refreshAssignments();
      renderShell();
      showToast(result.message || 'Report verified and linked to an incident.');
    } else if (action === 'share-location') {
      button.disabled = true;
      const position = await captureLocation();
      await send(`/api/staff/teams/${encodeURIComponent(button.dataset.teamId)}/location`, 'PUT', {
        latitude: position.latitude,
        longitude: position.longitude,
      });
      showToast(`GPS shared with dispatch (±${Math.round(position.accuracy)} m).`);
      await refreshAssignments();
      renderShell();
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
        const registration = await navigator.serviceWorker.getRegistration('/staff');
        if (!registration) throw new Error('The Staff App service worker is not registered yet.');
        await registration.update();
        showToast('Staff App is up to date.');
      }
    } else if (action === 'install' && state.installPrompt) {
      await state.installPrompt.prompt();
      await state.installPrompt.userChoice;
      state.installPrompt = null;
      syncInstallButton();
    } else if (action === 'logout') {
      await send('/api/auth/logout', 'POST');
      state.user = null;
      state.assignments = [];
      state.teams = [];
      renderLogin();
    } else if (action === 'reload') {
      window.location.reload();
    }
  } catch (error) {
    if (error.status === 401) {
      state.user = null;
      renderLogin('Your session expired. Sign in again to continue.');
    } else {
      showToast(error.message || 'The action could not be completed.');
      const nextButton = root.querySelector(`[data-action="${action}"]`);
      if (nextButton) nextButton.disabled = false;
    }
  }
});

document.addEventListener('change', (event) => {
  if (event.target.matches('[data-action="select-map-assignment"]')) {
    state.selectedId = event.target.value;
    renderShell();
  }
});

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  const { form: formType } = form.dataset;
  if (!['login', 'update', 'evidence'].includes(formType)) return;
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
    }
  } catch (error) {
    if (formType === 'login') renderLogin(error.message || 'Sign-in failed. Check your email and password.');
    else showToast(error.message || 'The form could not be submitted.');
    if (submitButton) submitButton.disabled = false;
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/staff-sw.js', { scope: '/staff' })
      .catch((error) => console.error('Staff app offline support could not be enabled.', error));
  });
}

ensureAuthenticated();
