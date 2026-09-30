/* Valencia PowerWatch - shared core: portal routing, state, API client, helpers */

const app = document.getElementById('app');

// 'auto' routes by viewport width so the root page works as one adaptive app.
const PORTAL = window.POWERWATCH_PORTAL === 'community' ? 'community'
  : window.POWERWATCH_PORTAL === 'admin' ? 'admin'
    : (window.matchMedia('(max-width: 780px)').matches ? 'community' : 'admin');
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
  filters: {},
  analyticsRange: { from: '', to: '' },
  reportPage: 1,
  auditPage: 1,
  auditPageSize: 5,
  mobileTab: 'home',
  bootError: '',
};

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
  if (['resolved', 'restored', 'verified', 'officially confirmed', 'published', 'active', 'completed'].some((k) => value.includes(k))) return 'ok';
  if (['ongoing', 'under review', 'under verification', 'being implemented', 'restoration in progress', 'scheduled', 'in preparation', 'draft'].some((k) => value.includes(k))) return 'busy';
  if (['cancelled', 'rejected', 'inactive', 'deleted'].some((k) => value.includes(k))) return 'bad';
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
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
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
