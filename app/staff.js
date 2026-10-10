const root = document.getElementById('staff-app');
const toast = document.getElementById('staff-toast');
let refreshTimer = null;
let evidencePreviewUrl = null;
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
  const coordinates = taskCoordinates(assignment);
  const hasCoordinates = hasValidCoordinates(coordinates.latitude, coordinates.longitude);
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
        ${hasCoordinates
          ? `<div><dt>GPS coordinates</dt><dd>${Number(coordinates.latitude).toFixed(5)}, ${Number(coordinates.longitude).toFixed(5)}</dd></div>` : ''}
      </div>
      <div class="staff-detail-copy">
        <div><dt>Report details</dt><dd>${escapeHtml(assignment.report_description || assignment.incident_description || 'No description supplied.')}</dd></div>
        ${assignment.reporter_name ? `<div><dt>Reported by</dt><dd>${escapeHtml(assignment.reporter_name)}</dd></div>` : ''}
        ${assignment.reporter_contact ? `<div><dt>Authorized contact</dt><dd><a href="tel:${escapeHtml(assignment.reporter_contact)}">${escapeHtml(assignment.reporter_contact)}</a></dd></div>` : ''}
        <div><dt>Dispatch instructions</dt><dd>${escapeHtml(assignment.dispatch_notes || 'No additional instructions.')}</dd></div>
        ${assignment.reported_at ? `<div><dt>Reported</dt><dd>${escapeHtml(new Date(assignment.reported_at).toLocaleString())}</dd></div>` : ''}
      </div>
      ${!compact && assignment.report_id && !['Verified', 'Officially Confirmed'].includes(assignment.verification_status) && !assignment.incident_id
        && !isTerminal
        && !['Resolved', 'Rejected', 'Duplicate'].includes(assignment.report_status)
        ? `<div class="staff-case-verification"><div><strong>Report verification</strong><span>Verify this report in place; no separate incident record will be created.</span></div><button class="staff-btn staff-btn-primary" type="button" data-action="verify-assigned-report" data-id="${assignment.id}">Verify report</button></div>`
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
  if (assignment.status === 'Cancelled') {
    return '<p class="staff-cancelled-note" role="status">This assignment was cancelled by dispatch. Contact your administrator if you need clarification.</p>';
  }
  const current = stageIndex(assignment);
  const progress = stages.map((stage, index) => `<li class="${index < current ? 'is-complete' : index === current ? 'is-current' : ''}" ${index === current ? 'aria-current="step"' : ''}>
    <span>${index < current ? icon('check') : index + 1}</span><small>${escapeHtml(stage)}</small>
  </li>`).join('');
  return `<div class="staff-progress-scroll"><ol class="staff-stage-progress" aria-label="Response progress">${progress}</ol></div>`;
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
    return `<article class="staff-card">
      <div class="staff-assignment-top"><div><div class="staff-assignment-code">${escapeHtml(report.report_code || 'RESIDENT REPORT')}</div>
        <h2>${escapeHtml(report.possible_outage_type || 'Power interruption')}</h2></div>
        <span class="staff-status ${statusClass(report.status)}">${escapeHtml(report.status)}</span></div>
      <p class="staff-location">${icon('pin')} ${escapeHtml([report.purok && `Purok ${report.purok}`, report.barangay].filter(Boolean).join(' · '))}</p>
      <p>${escapeHtml(report.location || report.affected_area || 'Location details not supplied')}</p>
      <p class="staff-muted">${escapeHtml(report.description || 'No report description supplied.')}</p>
      ${evidence ? `<div class="staff-evidence-list">${evidence}</div>` : '<p class="staff-muted">No photo or video evidence attached.</p>'}
      ${nextStatus ? `<button class="staff-btn staff-btn-primary" type="button" data-action="update-report-status" data-id="${report.id}" data-status="${nextStatus}">${nextStatus === 'Verified' ? 'Verify report' : 'Start review'}</button>` : ''}
    </article>`;
  }).join('');
  return `<div class="staff-section-heading staff-priority-heading"><div><span class="staff-section-kicker">Assigned barangays</span><h2>Resident reports</h2></div></div>
    ${cards ? `<div class="staff-assignment-list">${cards}</div>` : '<div class="staff-card staff-empty"><strong>No open area reports</strong>Reports submitted from your authorized barangays will appear here.</div>'}`;
};

const getCurrentAssignments = () => state.assignments.find((assignment) => String(assignment.id) === String(state.selectedId));

const renderHome = () => {
  const active = activeAssignments();
  const prioritySorted = [...active].sort((a, b) => {
    const rank = (value) => String(value).toLowerCase() === 'critical' ? 0 : String(value).toLowerCase() === 'high' ? 1 : 2;
    return rank(a.priority) - rank(b.priority) || stageIndex(a) - stageIndex(b);
  });
  return `<header class="staff-page-heading"><div><p class="staff-eyebrow">Field response center</p>
    <h1>Good day, ${escapeHtml((state.user.full_name || 'Team').split(' ')[0])}</h1>
    <p>${active.length ? `${active.length} active field task${active.length === 1 ? '' : 's'} · highest priority first.` : 'Your field response overview and next steps.'}</p></div>
  </header>
  ${renderStats()}
  <div class="staff-section-heading staff-priority-heading"><div><span class="staff-section-kicker">Needs attention</span><h2>Priority assignments</h2></div>
    <button class="staff-text-action" type="button" data-action="navigate" data-page="tasks">All tasks <span aria-hidden="true">›</span></button>
  </div>
  ${prioritySorted.length ? `<section class="staff-next-task">
      <div class="staff-next-task-heading"><span class="staff-next-task-label">Next field action</span><span>${prioritySorted.length} task${prioritySorted.length === 1 ? '' : 's'} active</span></div>
      ${assignmentCard(prioritySorted[0], { compact: true })}
    </section>
    ${prioritySorted.length > 1 ? `<details class="staff-other-tasks">
      <summary>Other active tasks <span>${prioritySorted.length - 1}</span></summary>
      <div class="staff-assignment-list">${prioritySorted.slice(1, 5).map((assignment) => assignmentCard(assignment, { compact: true })).join('')}</div>
    </details>` : ''}`
    : '<div class="staff-card staff-empty"><strong>No active response tasks</strong>New incidents assigned to your team will appear here.</div>'}
  ${renderAreaReports()}
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
  const active = activeAssignments();
  const assignments = active.filter((assignment) => routeUrl(assignment));
  const noGpsAssignments = active.filter((assignment) => !routeUrl(assignment));
  const selected = assignments.find((assignment) => String(assignment.id) === String(state.selectedId)) || assignments[0];
  const coordinates = selected && taskCoordinates(selected);
  const mapUrl = selected && valenciaMap(coordinates.latitude, coordinates.longitude);
  return `<header class="staff-page-heading"><div><p class="staff-eyebrow">Field navigation</p><h1>Incident map</h1>
    <p>Map pins and directions are shown only when valid report coordinates are available.</p></div></header>
  ${assignments.length ? `<label class="staff-field staff-map-select">Choose an active assignment
    <select class="staff-upload-input" data-action="select-map-assignment">${assignments.map((assignment) => `<option value="${assignment.id}" ${String(selected.id) === String(assignment.id) ? 'selected' : ''}>${escapeHtml(assignment.assignment_code)} · ${escapeHtml(assignment.target_barangay || 'Valencia City')}</option>`).join('')}</select>
  </label>
  <section class="staff-card staff-map-card">
    <iframe class="staff-map-frame" title="OpenStreetMap incident location" loading="lazy" referrerpolicy="no-referrer" src="${escapeHtml(mapUrl)}"></iframe>
    <div class="staff-map-location">${icon('pin')}<div><strong>${escapeHtml(selected.target_barangay || 'Valencia City')}</strong><span>${escapeHtml(displayLocation(selected))}</span></div></div>
    <div class="staff-map-actions"><a class="staff-btn staff-btn-primary" href="${escapeHtml(routeUrl(selected))}" target="_blank" rel="noopener">${icon('route')} Start navigation</a>
      <button class="staff-btn staff-btn-quiet" type="button" data-action="view-assignment" data-id="${selected.id}">Incident details</button></div>
  </section><p class="staff-muted staff-map-help">Directions use the reported GPS point. Confirm the location details before travel.</p>`
    : '<div class="staff-card staff-empty"><strong>No active assignment has a valid GPS point</strong>GPS is not available for mapping or directions yet. Review the reported location details below and confirm the site with dispatch; no location is being estimated.</div>'}
  ${noGpsAssignments.length ? `<section class="staff-map-unlocated">
    <div class="staff-section-heading staff-priority-heading"><div><span class="staff-section-kicker">Location needs confirmation</span><h2>Tasks without GPS</h2></div></div>
    <div class="staff-assignment-list">${noGpsAssignments.map((assignment) => `<article class="staff-card staff-unlocated-card">
      <div><strong>${escapeHtml(assignment.assignment_code || assignment.report_code || 'Field assignment')}</strong><p>${escapeHtml(displayLocation(assignment))}</p></div>
      <span class="staff-status">${icon('alert')} No GPS</span>
      <button class="staff-btn staff-btn-quiet" type="button" data-action="view-assignment" data-id="${assignment.id}">Review reported details</button>
    </article>`).join('')}</div>
  </section>` : ''}`;
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
    <main class="staff-main">
      ${navigator.onLine ? '' : '<div class="staff-offline-banner" role="status"><strong>You are offline.</strong> Updates and evidence cannot be saved until the connection returns.</div>'}
      ${content}
    </main>
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
    await Promise.all([refreshAssignments(), refreshReports(), refreshNotifications()]);
    renderShell();
    window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(async () => {
      if (!state.user || document.visibilityState !== 'visible') return;
      try {
        await Promise.all([refreshAssignments(), refreshReports(), refreshNotifications()]);
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
  if (!file) throw new Error('Choose a photo or video before uploading.');
  if (!supportedEvidenceTypes.has(file.type)) throw new Error('Choose a JPG, PNG, WebP, MP4, or MOV file.');
  if (file.size > maxEvidenceBytes) throw new Error('Evidence must be 8 MB or smaller.');
  if (!navigator.onLine) throw new Error('You are offline. Evidence was not saved; reconnect and retry.');
  const data = new FormData();
  data.append('evidence', file);
  setEvidenceUploadState(form, 0, 'Uploading evidence…');
  try {
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
    await refreshAssignments();
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
      showToast(result.message || 'Report verified.');
    } else if (action === 'update-report-status') {
      button.disabled = true;
      const result = await send(`/api/reports/${encodeURIComponent(button.dataset.id)}/status`, 'PUT', {
        status: button.dataset.status,
      });
      await refreshReports();
      renderShell();
      showToast(result.message || 'Report status updated.');
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
      if (evidencePreviewUrl) URL.revokeObjectURL(evidencePreviewUrl);
      evidencePreviewUrl = null;
      state.user = null;
      state.assignments = [];
      state.reports = [];
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
      showToast(!navigator.onLine
        ? 'You are offline. The action was not confirmed; reconnect and retry.'
        : error.message || 'The action could not be completed.');
      const nextButton = root.querySelector(`[data-action="${action}"]`);
      if (nextButton) nextButton.disabled = false;
    }
  }
});

document.addEventListener('change', (event) => {
  if (event.target.matches('[data-action="select-map-assignment"]')) {
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
    else showToast(!navigator.onLine
      ? 'You are offline. The update was not saved; reconnect and retry.'
      : error.message || 'The form could not be submitted.');
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
