const API_BASE = '';
const COOKIE_NAME = 'pw_session';

const ROLE_MAP = {
  resident: 'resident',
  staff: 'personnel',
  admin: 'administrator',
  utility: 'utility',
};
const BACKEND_ROLE_MAP = {
  resident: 'resident',
  personnel: 'staff',
  administrator: 'admin',
  utility: 'utility',
};

const state = {
  screen: 'landing',
  role: 'resident',
  token: null,
  user: null,
  notification: '',
  search: '',
  profile: {
    name: 'Juan Dela Cruz',
    email: 'juan@example.com',
    contact: '0917-000-0000',
    address: 'Poblacion, Valencia City',
  },
  reports: [],
  announcements: [],
  scheduled: [],
  notifications: [],
  auditLogs: [],
  users: [],
  barangays: [],
  stats: { total: 0, resolved: 0, pending: 0, verified: 0, active: 0, avg: 0 },
  loading: false,
};

const app = document.getElementById('app');

async function api(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = { ...options.headers };
  let body = options.body;
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
    const e = new Error(err.error || `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  if (res.status === 204) return null;
  return res.json();
}

async function ensureAuth() {
  try {
    const data = await api('/api/auth/me');
    state.user = data.user;
    state.role = BACKEND_ROLE_MAP[data.user.role] || 'resident';
    state.token = true;
    return state.user;
  } catch (error) {
    state.user = null;
    state.role = 'resident';
    state.token = null;
    return null;
  }
}

async function apiAuth(method, path, body) {
  const data = await api(path, { method, body });
  state.user = data.user;
  state.role = BACKEND_ROLE_MAP[data.user.role] || 'resident';
  state.token = true;
  return data;
}

function clearAuth() {
  state.user = null;
  state.role = 'resident';
  state.token = null;
}

const statusClass = (status) => {
  switch (status) {
    case 'Resolved':
    case 'Officially Confirmed':
      return 'status-resolved';
    case 'Under Verification':
    case 'Under Review':
    case 'Verified':
      return 'status-verification';
    case 'Rejected':
    case 'Duplicate':
      return 'status-rejected';
    default:
      return 'status-pending';
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const setNotification = (msg) => {
  state.notification = msg;
  render();
};

async function loadDashboardData() {
  try {
    const statsRes = await api('/api/analytics/dashboard');
    state.stats = statsRes.stats || state.stats;
  } catch (e) { /* ignore */ }
  try {
    const annRes = await api('/api/announcements');
    state.announcements = annRes.announcements || [];
  } catch (e) { /* ignore */ }
}

function goTo(screen, role) {
  state.screen = screen;
  if (role) state.role = role;
  render();
}

function bindActions() {
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.replaceWith(button.cloneNode(true));
  });
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;
      const value = button.dataset.value || '';
      const role = button.dataset.role || state.role;

      try {
        switch (action) {
          case 'landing-login':
            goTo('auth', role);
            break;
          case 'landing-start':
            goTo('auth', 'resident');
            break;
          case 'login-role':
            await apiAuth('POST', '/api/auth/login', {
              email: document.getElementById('loginEmail')?.value || '',
              password: document.getElementById('loginPassword')?.value || '',
              remember: true,
              portal: value,
            });
            goTo('dashboard', state.role);
            break;
          case 'nav-home':
            goTo('landing');
            break;
          case 'to-dashboard':
            goTo('dashboard', role);
            break;
          case 'report-outage':
            goTo('report-form', role);
            break;
          case 'view-active':
            goTo('active-outages', role);
            break;
          case 'view-scheduled':
            goTo('scheduled-outages', role);
            break;
          case 'view-announcements':
            goTo('announcements', role);
            break;
          case 'view-history':
            goTo('history', role);
            break;
          case 'view-my-reports':
            goTo('my-reports', role);
            break;
          case 'view-notifications':
            goTo('notifications', role);
            break;
          case 'view-profile':
            goTo('profile', role);
            break;
          case 'view-verification':
            goTo('verification', role);
            break;
          case 'view-incidents':
            goTo('incidents', role);
            break;
          case 'view-analytics':
            goTo('analytics', role);
            break;
          case 'manage-users':
            goTo('users', role);
            break;
          case 'manage-locations':
            goTo('locations', role);
            break;
          case 'view-audit':
            goTo('audit', role);
            break;
          case 'view-settings':
            goTo('settings', role);
            break;
          case 'logout':
            await api('POST', '/api/auth/logout');
            clearAuth();
            goTo('landing');
            break;
          case 'register-resident':
            await handleRegister();
            break;
          case 'mark-official':
            {
              const id = Number(value);
              await api('PUT', `/api/incidents/${id}/status`, { status: 'Officially Confirmed' });
              setNotification('Report marked as officially confirmed.');
              goTo('incidents', role);
            }
            break;
          case 'save-profile':
            {
              const form = document.getElementById('profileForm');
              const formData = new FormData(form);
              await api('PUT', '/api/profile', {
                full_name: formData.get('name')?.toString().trim(),
                contact_number: formData.get('contact')?.toString().trim(),
                address: formData.get('address')?.toString().trim(),
                barangay: formData.get('barangay')?.toString().trim(),
              });
              setNotification('Profile information updated.');
              goTo('profile', role);
            }
            break;
          case 'search-records':
            state.search = document.getElementById('recordSearch')?.value.toLowerCase().trim() || '';
            render();
            break;
          case 'back':
            goTo(value || 'dashboard', role);
            break;
          case 'verify-report':
            {
              const id = Number(value);
              await api('PUT', `/api/reports/${id}/status`, { status: 'Verified' });
              setNotification('Report verified and updated successfully.');
              goTo('verification', role);
            }
            break;
          case 'reject-report':
            {
              const id = Number(value);
              await api('PUT', `/api/reports/${id}/status`, { status: 'Rejected' });
              setNotification('Report marked rejected.');
              goTo('verification', role);
            }
            break;
          case 'submit-report':
            {
              const form = document.getElementById('outageForm');
              if (!form.checkValidity()) {
                form.reportValidity();
                return;
              }
              const formData = new FormData(form);
              const photoInput = form.querySelector('input[name="photo"]');
              let photoData = null;
              if (photoInput && photoInput.files && photoInput.files[0]) {
                const file = photoInput.files[0];
                const b64 = await fileToDataUrl(file);
                photoData = b64;
              }
              const payload = {
                location: formData.get('location')?.toString().trim(),
                latitude: formData.get('latitude')?.toString() || null,
                longitude: formData.get('longitude')?.toString() || null,
                location_source: formData.get('location_source')?.toString() || 'map_pin',
                location_confirmed: 'true',
                location_accuracy_m: null,
                barangay: formData.get('barangay')?.toString(),
                purok: formData.get('purok')?.toString() || '',
                affected_area: formData.get('affectedArea')?.toString().trim(),
                date_time_noticed: formData.get('incidentDate')?.toString(),
                description: formData.get('description')?.toString().trim(),
                possible_outage_type: formData.get('outageType')?.toString(),
                photoData,
                remarks: formData.get('remarks')?.toString() || '',
              };
              await api('POST', '/api/reports', payload);
              setNotification('Report submitted successfully and sent for verification.');
              goTo('dashboard', 'resident');
            }
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('Action error:', error);
        setNotification(error.message || 'An error occurred. Please try again.');
      }
    });
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const renderLanding = () => `
  <div class="app-shell">
    <header class="topbar landing-topbar">
      <div class="brand-wrap">
        <div class="brand-mark">⚡</div>
        <div class="brand-copy">
          <div class="brand-title">Valencia PowerWatch</div>
          <div class="brand-sub">A Web and Mobile-Based Community Power Interruption Reporting, Verification, and Information Management System</div>
        </div>
      </div>
      <div class="header-tag">Stay Informed. Report. Verify. Keep Valencia Powered.</div>
    </header>

    <main class="landing-page">
      <section class="cards-row three-col">
        <article class="mini-card">
          <div class="card-icon">◎</div>
          <h3>Project Overview</h3>
          <p>Valencia PowerWatch is a web and mobile-responsive system designed to help residents of Valencia City report outages, verify incidents, and access official status updates and history.</p>
        </article>

        <article class="mini-card">
          <div class="card-icon">👥</div>
          <h3>Target Users</h3>
          <p>Residents, system personnel, administrators, and authorized utility personnel each have dedicated functions and access in the flow of the system.</p>
        </article>

        <article class="mini-card">
          <div class="card-icon">✓</div>
          <h3>System Boundaries</h3>
          <p>The system covers reporting, verification, monitoring, scheduling, announcements, records, and analytics, but not direct electrical-grid control.</p>
        </article>
      </section>

      <section class="module-panel">
        <div class="panel-heading">System Modules</div>
        <div class="module-table">
          <div class="module-row header-row">
            <div>Module</div>
            <div>Major Features / Sub-features</div>
            <div>Target Users</div>
            <div>Data Managed</div>
            <div>Key Functions / Description</div>
          </div>
          <div class="module-row">
            <div>1. User Management & Authentication</div>
            <div>Registration / Login / Profile management / Role-based access</div>
            <div>All Users</div>
            <div>User accounts, profiles, roles, verification</div>
            <div>Ensures secure access, manages roles, and personal information.</div>
          </div>
          <div class="module-row">
            <div>2. Outage Reporting</div>
            <div>Report outage / Track status / Attach photos / Details</div>
            <div>Residents / Users</div>
            <div>Reports, location, photos, timestamps</div>
            <div>Allows residents to report power interruptions and track progress.</div>
          </div>
          <div class="module-row">
            <div>3. Verification & Status Monitoring</div>
            <div>Verify reports / Validate outage data / Monitor status</div>
            <div>Staff / Admin / Utility Personnel</div>
            <div>Verification logs, outage statuses, remarks</div>
            <div>Confirms the validity of reports and keeps the community informed.</div>
          </div>
          <div class="module-row">
            <div>4. Announcements & Updates</div>
            <div>Post announcements / Notifications / Updates</div>
            <div>All Users</div>
            <div>Announcements, notifications, schedules</div>
            <div>Provides timely updates, advisories, and restoration information.</div>
          </div>
          <div class="module-row">
            <div>5. Historical Information</div>
            <div>View past outages / Search by date or barangay</div>
            <div>All Users</div>
            <div>History, locations, cause, duration</div>
            <div>Helps users analyze incidents and prepare for future events.</div>
          </div>
        </div>
      </section>

      <section class="flow-panel">
        <div class="panel-heading">System Flowchart</div>
        <div class="flow-grid">
          <div class="flow-node start">START</div>
          <div class="flow-action">Access System</div>
          <div class="flow-action">Register / Login</div>
          <div class="flow-action">Identify Role</div>
          <div class="flow-role">Resident</div>
          <div class="flow-role">Staff</div>
          <div class="flow-role">Admin</div>
          <div class="flow-role">Utility</div>
          <div class="flow-action">Report Outage</div>
          <div class="flow-action">Verify / Update</div>
          <div class="flow-action">Create Outage Incident</div>
          <div class="flow-action">Monitor Active Outage</div>
          <div class="flow-action">Announcements & Notifications</div>
          <div class="flow-action">Power Restored</div>
          <div class="flow-action">Historical Records</div>
          <div class="flow-action">Reports & Analytics</div>
          <div class="flow-node end">END</div>
        </div>
      </section>

      <section class="cta-panel">
        <button class="primary-btn" data-action="landing-start">Access System</button>
      </section>
    </main>
  </div>
`;

const renderAuth = () => `
  <div class="app-shell auth-shell">
    <header class="topbar">
      <div class="brand-wrap">
        <div class="brand-mark">⚡</div>
        <div class="brand-copy">
          <div class="brand-title">Valencia PowerWatch</div>
          <div class="brand-sub">Secure access portal</div>
        </div>
      </div>
      <button class="secondary-btn" data-action="nav-home">Back Home</button>
    </header>

    <main class="auth-layout">
      <div class="auth-card">
        <h2>Register / Login</h2>
        ${state.user ? `
          <div class="notification">Already signed in as ${state.user.full_name} (${state.user.role}).</div>
          <button class="primary-btn" data-action="to-dashboard">Go to Dashboard</button>
        ` : `
          <div class="form-grid">
            <label>
              <span>Email / Username</span>
              <input type="text" id="loginEmail" placeholder="name@example.com" required />
            </label>
            <label>
              <span>Password</span>
              <input type="password" id="loginPassword" placeholder="Enter password" required />
            </label>
          </div>

          <div class="action-row">
            <button class="primary-btn" data-action="login-role" data-value="resident">Login as Resident</button>
            <button class="secondary-btn" data-action="login-role" data-value="staff">Login as Staff</button>
            <button class="secondary-btn" data-action="login-role" data-value="admin">Login as Admin</button>
            <button class="secondary-btn" data-action="login-role" data-value="utility">Utility Personnel</button>
          </div>

          <div class="divider"><span>Or register</span></div>

          <div class="form-grid">
            <label>
              <span>Full Name</span>
              <input type="text" id="regName" placeholder="Juan Dela Cruz" required />
            </label>
            <label>
              <span>Email</span>
              <input type="email" id="regEmail" placeholder="name@example.com" required />
            </label>
            <label>
              <span>Contact Number</span>
              <input type="text" id="regContact" placeholder="0917-000-0000" />
            </label>
            <label>
              <span>Address</span>
              <input type="text" id="regAddress" placeholder="Poblacion, Valencia City" />
            </label>
            <label>
              <span>Barangay</span>
              <input type="text" id="regBarangay" placeholder="Poblacion" />
            </label>
            <label>
              <span>Password</span>
              <input type="password" id="regPassword" placeholder="Create password (min 6 chars)" required />
            </label>
          </div>

          <div class="submit-row">
            <button class="primary-btn" data-action="register-resident">Register as Resident</button>
          </div>
        `}
      </div>
    </main>
  </div>
`;

async function handleRegister() {
  const fullName = document.getElementById('regName')?.value || '';
  const email = document.getElementById('regEmail')?.value || '';
  const contact = document.getElementById('regContact')?.value || null;
  const address = document.getElementById('regAddress')?.value || null;
  const barangay = document.getElementById('regBarangay')?.value || null;
  const password = document.getElementById('regPassword')?.value || '';

  if (!fullName || !email || !password) {
    setNotification('Full name, email, and password are required.');
    return;
  }
  if (password.length < 6) {
    setNotification('Password must be at least 6 characters.');
    return;
  }

  try {
    await apiAuth('POST', '/api/auth/register', {
      full_name: fullName,
      email,
      contact_number: contact,
      address,
      barangay,
      password,
    });
    goTo('dashboard', 'resident');
  } catch (error) {
    setNotification(error.message || 'Registration failed. Please try again.');
  }
}

const renderDashboard = () => {
  const roleTitle = {
    resident: 'Resident Dashboard',
    staff: 'Staff Dashboard',
    admin: 'Administrator Dashboard',
    utility: 'Utility Personnel Dashboard',
  };

  const quickActions = {
    resident: [
      { label: 'Report Outage', action: 'report-outage' },
      { label: 'View Active Outages', action: 'view-active' },
      { label: 'View Scheduled Outages', action: 'view-scheduled' },
      { label: 'View Announcements', action: 'view-announcements' },
      { label: 'View Notifications', action: 'view-notifications' },
      { label: 'View History', action: 'view-history' },
      { label: 'My Reports', action: 'view-my-reports' },
      { label: 'Manage Profile', action: 'view-profile' },
    ],
    staff: [
      { label: 'Review Reports', action: 'view-verification' },
      { label: 'Manage Incidents', action: 'view-incidents' },
      { label: 'View Active Outages', action: 'view-active' },
      { label: 'Monitor Status', action: 'view-incidents' },
      { label: 'Announcements', action: 'view-announcements' },
      { label: 'Historical Records', action: 'view-history' },
    ],
    admin: [
      { label: 'Manage Users & Roles', action: 'manage-users' },
      { label: 'Manage Reports', action: 'view-verification' },
      { label: 'Manage Incidents', action: 'view-incidents' },
      { label: 'Locations & Barangays', action: 'manage-locations' },
      { label: 'Reports & Analytics', action: 'view-analytics' },
      { label: 'Audit Logs', action: 'view-audit' },
      { label: 'System Settings', action: 'view-settings' },
      { label: 'Announcements', action: 'view-announcements' },
    ],
    utility: [
      { label: 'Confirm Official Info', action: 'view-incidents' },
      { label: 'Scheduled Outage Info', action: 'view-scheduled' },
      { label: 'Announcements', action: 'view-announcements' },
      { label: 'Restoration Updates', action: 'view-incidents' },
      { label: 'Active Outages', action: 'view-active' },
    ]
  };

  const stats = state.stats;

  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand-wrap">
          <div class="brand-mark">⚡</div>
          <div class="brand-copy">
            <div class="brand-title">Valencia PowerWatch</div>
            <div class="brand-sub">${roleTitle[state.role]}</div>
          </div>
        </div>
        <div class="topbar-user">
          ${state.user ? state.user.full_name : 'User'}
          <button class="secondary-btn" data-action="logout">Logout</button>
        </div>
      </header>

      <main class="dashboard-page">
        ${state.notification ? `<div class="notification">${state.notification}</div>` : ''}
        <section class="stats-grid">
          <div class="stat-card blue"><span>Total Reports</span><strong>${stats.total}</strong></div>
          <div class="stat-card green"><span>Resolved</span><strong>${stats.resolved}</strong></div>
          <div class="stat-card orange"><span>${state.role === 'admin' ? 'Verified Reports' : 'Pending Verification'}</span><strong>${state.role === 'admin' ? stats.verified : stats.pending}</strong></div>
          <div class="stat-card purple"><span>Avg. Restoration</span><strong>${stats.avg}d</strong></div>
        </section>

        <section class="action-grid">
          ${quickActions[state.role].map((item) => `
            <button class="action-button" data-action="${item.action}">${item.label}</button>
          `).join('')}
        </section>

        <section class="dashboard-grid">
          <div class="panel">
            <h3>Recent Active Incidents</h3>
            <ul class="list-box">
              ${(state.reports || []).slice(0, 4).map((report) => `
                <li>
                  <strong>${report.barangay}</strong>
                  <span>${report.outageType || report.possible_outage_type}</span>
                  <small>${report.status}</small>
                </li>
              `).join('') || '<li>No active incidents.</li>'}
            </ul>
          </div>

          <div class="panel">
            <h3>Latest Announcements</h3>
            <ul class="list-box">
              ${(state.announcements || []).slice(0, 3).map((item) => `
                <li>
                  <strong>${item.title}</strong>
                  <span>${item.content || item.details}</span>
                </li>
              `).join('') || '<li>No announcements.</li>'}
            </ul>
          </div>
        </section>
      </main>
    </div>
  `;
};

const renderReportForm = () => `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-wrap">
        <div class="brand-mark">⚡</div>
        <div class="brand-copy">
          <div class="brand-title">Valencia PowerWatch</div>
          <div class="brand-sub">Power Interruption Reporting</div>
        </div>
      </div>
      <button class="secondary-btn" data-action="back" data-value="dashboard">Back to Dashboard</button>
    </header>

    <main class="form-page">
      <form id="outageForm" class="form-card" novalidate>
        <h2>Report a Power Interruption</h2>
        <div class="form-grid two-cols">
          <label><span>Reporter Name</span><input name="reporterName" value="${state.user?.full_name || ''}" readonly /></label>
          <label><span>Contact Number</span><input name="contactNumber" value="${state.user?.contact_number || ''}" readonly /></label>
          <label><span>Barangay</span>
            <select name="barangay" required>
              <option value="">Select Barangay</option>
              ${(state.barangays || []).map((b) => `<option value="${b.name || b}">${b.name || b}</option>`).join('')}
            </select>
          </label>
          <label><span>Outage Type</span>
            <select name="outageType" required>
              <option value="">Select Type</option>
              <option value="Line Fault">Line Fault</option>
              <option value="Transformer Issue">Transformer Issue</option>
              <option value="Weather Disturbance">Weather Disturbance</option>
              <option value="Power Supply Interruption">Power Supply Interruption</option>
              <option value="Scheduled Maintenance">Scheduled Maintenance</option>
            </select>
          </label>
          <label><span>Purok / Sitio</span><input name="purok" placeholder="e.g. Purok 5" required /></label>
          <label><span>Affected Area</span><input name="affectedArea" placeholder="Specific area or landmark" required /></label>
          <label><span>Severity</span>
            <select name="severity" required>
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </label>
          <label><span>Incident Date</span><input name="incidentDate" type="date" required /></label>
          <label><span>Classification</span>
            <select name="classification" required>
              <option value="Unexpected">Unexpected</option>
              <option value="Scheduled">Scheduled</option>
            </select>
          </label>
          <label><span>Supporting Photograph (Optional)</span><input name="photo" type="file" accept="image/*" /></label>
        </div>
        <label><span>Location Description</span><input name="location" placeholder="Describe the exact location" required /></label>
        <label><span>Details</span><textarea name="description" rows="5" required placeholder="Describe the power interruption"></textarea></label>
        <div class="submit-row">
          <button class="primary-btn" type="button" data-action="submit-report">Submit Report</button>
        </div>
      </form>
    </main>
  </div>
`;

const renderActiveOutages = () => `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-wrap"><div class="brand-mark">⚡</div><div class="brand-copy"><div class="brand-title">Valencia PowerWatch</div><div class="brand-sub">Active Outages</div></div></div>
      <button class="secondary-btn" data-action="back" data-value="dashboard">Back</button>
    </header>
    <main class="list-page">
      <div class="list-card">
        <h2>Current Power Interruptions</h2>
        <div class="list-table">
          ${(state.reports || []).filter((item) => item.status !== 'Resolved').map((item) => `
            <div class="list-item">
              <div>
                <strong>${item.barangay}</strong>
                <span>${item.affected_area || item.purok || ''}</span>
              </div>
              <div>
                <span>${item.possible_outage_type || item.outageType}</span>
                <small>${item.status}</small>
              </div>
            </div>
          `).join('') || '<p>No active outages reported.</p>'}
        </div>
      </div>
    </main>
  </div>
`;

const renderScheduled = () => `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-wrap"><div class="brand-mark">⚡</div><div class="brand-copy"><div class="brand-title">Valencia PowerWatch</div><div class="brand-sub">Scheduled Interruption</div></div></div>
      <button class="secondary-btn" data-action="back" data-value="dashboard">Back</button>
    </header>
    <main class="list-page">
      <div class="list-card">
        <h2>Scheduled Outages</h2>
        <div class="list-table">
          ${(state.scheduled || []).map((item) => `
            <div class="list-item">
              <div>
                <strong>${item.barangay}</strong>
                <span>${item.reason || item.title}</span>
              </div>
              <div>
                <span>${item.outage_date} ${item.start_time}</span>
                <small>${item.status}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </main>
  </div>
`;

const renderAnnouncements = () => `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-wrap"><div class="brand-mark">⚡</div><div class="brand-copy"><div class="brand-title">Valencia PowerWatch</div><div class="brand-sub">Announcements</div></div></div>
      <button class="secondary-btn" data-action="back" data-value="dashboard">Back</button>
    </header>
    <main class="list-page">
      <div class="list-card">
        <h2>Official Announcements</h2>
        <div class="list-table">
          ${(state.announcements || []).map((item) => `
            <div class="list-item">
              <div>
                <strong>${item.title}</strong>
                <span>${item.content || item.details}</span>
              </div>
              <small>${formatDate(item.published_at || item.created_at || item.date)}</small>
            </div>
          `).join('')}
        </div>
      </div>
    </main>
  </div>
`;

const renderHistory = () => `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-wrap"><div class="brand-mark">⚡</div><div class="brand-copy"><div class="brand-title">Valencia PowerWatch</div><div class="brand-sub">Historical Records</div></div></div>
      <button class="secondary-btn" data-action="back" data-value="dashboard">Back</button>
    </header>
    <main class="list-page">
      <div class="list-card">
        <h2>Historical Outage Information</h2>
        <div class="search-row"><input id="recordSearch" value="${state.search}" placeholder="Search report ID, barangay, area, or outage type" /><button class="primary-btn" data-action="search-records">Search</button></div>
        <div class="list-table">
          ${searchableReports().map((item) => `
            <div class="list-item">
              <div>
                <strong>${item.barangay}</strong>
                <span>${item.possible_outage_type || item.outageType}</span>
              </div>
              <div>
                <span>${formatDate(item.incident_date || item.date_time_noticed || item.date)}</span>
                <small>${item.status}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </main>
  </div>
`;

const renderMyReports = () => `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-wrap"><div class="brand-mark">⚡</div><div class="brand-copy"><div class="brand-title">Valencia PowerWatch</div><div class="brand-sub">My Reports</div></div></div>
      <button class="secondary-btn" data-action="back" data-value="dashboard">Back</button>
    </header>
    <main class="list-page">
      <div class="list-card">
        <h2>Submitted Reports</h2>
        <div class="list-table">
          ${(state.reports || []).map((item) => `
            <div class="list-item">
              <div>
                <strong>${item.barangay}</strong>
                <span>${item.affected_area || item.purok || ''}</span>
              </div>
              <div>
                <span>${item.possible_outage_type || item.outageType}</span>
                <small class="status-tag ${statusClass(item.status)}">${item.status}</small>
              </div>
            </div>
          `).join('') || '<p>No reports submitted yet.</p>'}
        </div>
      </div>
    </main>
  </div>
`;

const renderVerification = () => `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-wrap"><div class="brand-mark">⚡</div><div class="brand-copy"><div class="brand-title">Valencia PowerWatch</div><div class="brand-sub">Report Verification</div></div></div>
      <button class="secondary-btn" data-action="back" data-value="dashboard">Back</button>
    </header>
    <main class="list-page">
      <div class="list-card">
        <h2>Verification Queue</h2>
        ${state.notification ? `<div class="notification">${state.notification}</div>` : ''}
        <div class="list-table">
          ${(state.reports || []).filter((item) => !['Resolved', 'Rejected', 'Duplicate'].includes(item.status)).map((item) => `
            <div class="verification-item-card">
              <div>
                <strong>${item.barangay}</strong>
                <span>${item.affected_area || item.purok || ''}</span>
              </div>
              <small>${item.possible_outage_type || item.outageType} • ${item.severity || ''}</small>
              <div class="verify-actions">
                <button class="primary-btn small-btn" data-action="verify-report" data-value="${item.id}">Verify</button>
                <button class="secondary-btn small-btn" data-action="reject-report" data-value="${item.id}">Reject</button>
              </div>
            </div>
          `).join('') || '<p>No report requires verification.</p>'}
        </div>
      </div>
    </main>
  </div>
`;

const renderModuleShell = (title, subtitle, content) => `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-wrap"><div class="brand-mark">⚡</div><div class="brand-copy"><div class="brand-title">Valencia PowerWatch</div><div class="brand-sub">${subtitle}</div></div></div>
      <button class="secondary-btn" data-action="back" data-value="dashboard">Back to Dashboard</button>
    </header>
    <main class="list-page"><div class="list-card"><h2>${title}</h2>${content}</div></main>
  </div>
`;

const searchableReports = () => (state.reports || []).filter((item) => {
  const query = state.search;
  if (!query) return true;
  return [item.id, item.barangay, item.affected_area, item.possible_outage_type, item.status]
    .some((value) => String(value || '').toLowerCase().includes(query));
});

const renderProfile = () => renderModuleShell('Resident Profile Management', 'Profile and account information', `
  ${state.notification ? `<div class="notification">${state.notification}</div>` : ''}
  <form id="profileForm" class="form-grid two-cols">
    <label><span>Full Name</span><input name="name" value="${state.user?.full_name || state.profile.name}" required /></label>
    <label><span>Email</span><input name="email" type="email" value="${state.user?.email || state.profile.email}" required readonly /></label>
    <label><span>Contact Number</span><input name="contact" value="${state.user?.contact_number || state.profile.contact}" required /></label>
    <label><span>Address</span><input name="address" value="${state.user?.address || state.profile.address}" required /></label>
    <label><span>Barangay</span><input name="barangay" value="${state.user?.barangay || state.profile.address || ''}" /></label>
    <div class="submit-row"><button class="primary-btn" type="button" data-action="save-profile">Save Profile</button></div>
  </form>
`);

const renderNotifications = () => renderModuleShell('Notifications', 'Status updates and advisories', `
  <div class="list-table">${(state.notifications || []).map((item) => `
    <div class="list-item ${item.read ? '' : 'unread'}"><div><strong>${item.title}</strong><span>${item.message || item.details}</span></div><small>${formatDate(item.created_at || item.date)}</small></div>
  `).join('') || '<p>No notifications.</p>'}</div>
`);

const renderIncidents = () => renderModuleShell('Outage Incident Management', 'Verified reports linked to outage incidents', `
  ${state.notification ? `<div class="notification">${state.notification}</div>` : ''}
  <div class="list-table">${searchableReports().filter((item) => !['Rejected', 'Duplicate'].includes(item.status)).map((item) => `
    <div class="verification-item-card">
      <div><strong>Report #${item.id} · ${item.barangay}</strong><span>${item.affected_area || item.purok || ''} · ${item.classification || 'Unexpected'}</span></div>
      <div><small>Report: ${item.status}</small><small>Incident: ${item.incident_status || 'Reported'}</small><small>Verification: ${item.verification_status || 'Pending'}</small></div>
      ${state.role === 'utility' ? `<button class="primary-btn small-btn" data-action="mark-official" data-value="${item.id}">Confirm Official</button>` : ''}
    </div>
  `).join('') || '<p>No outage incidents found.</p>'}</div>
`);

const renderAnalytics = () => {
  const stats = state.stats;
  const byBarangay = {};
  for (const item of (state.reports || [])) {
    const b = item.barangay;
    byBarangay[b] = (byBarangay[b] || 0) + 1;
  }
  return renderModuleShell('Reports and Analytics', 'Administrator reporting and summaries', `
    <section class="stats-grid compact-stats">
      <div class="stat-card blue"><span>Total Reports</span><strong>${stats.total}</strong></div>
      <div class="stat-card green"><span>Verified</span><strong>${stats.verified}</strong></div>
      <div class="stat-card orange"><span>Active</span><strong>${stats.active}</strong></div>
      <div class="stat-card purple"><span>Resolved</span><strong>${stats.resolved}</strong></div>
    </section>
    <div class="analytics-grid"><div class="panel"><h3>Outages by Barangay</h3>${Object.entries(byBarangay).map(([barangay, total]) => `<div class="metric-row"><span>${barangay}</span><strong>${total}</strong></div>`).join('') || '<p>No data.</p>'}</div><div class="panel"><h3>Status Summary</h3>${['Submitted', 'Under Review', 'Verified', 'Resolved', 'Rejected', 'Duplicate'].map((status) => `<div class="metric-row"><span>${status}</span><strong>${(state.reports || []).filter((item) => item.status === status).length}</strong></div>`).join('')}</div></div>
  `);
};

const renderUsers = () => renderModuleShell('User and Role Management', 'Administrator controls', `
  <div class="list-table">${(state.users || []).map((user) => `<div class="list-item"><div><strong>${user.full_name || user.name}</strong><span>${user.email}</span></div><div><span>${user.role}</span><small>${user.status}</small></div></div>`).join('') || '<p>No users.</p>'}</div>
`);

const renderLocations = () => renderModuleShell('Location and Barangay Management', 'Configured Valencia City locations', `
  <div class="list-table">${(state.barangays || []).map((b) => `<div class="list-item"><div><strong>${b.name || b}</strong><span>Valencia City, Bukidnon</span></div><small class="status-tag status-resolved">Active</small></div>`).join('')}</div>
`);

const renderAudit = () => renderModuleShell('Audit Logs and Activity Monitoring', 'Recorded system activities', `
  <div class="list-table">${(state.auditLogs || []).map((log) => `<div class="list-item"><div><strong>${log.action}</strong><span>${log.user_name || log.user} · ${log.record}</span></div><small>${formatDate(log.created_at || log.date)}</small></div>`).join('') || '<p>No audit logs.</p>'}</div>
`);

const renderSettings = () => renderModuleShell('System Settings and Maintenance', 'Administrator configuration', `
  <div class="settings-grid"><div class="panel"><h3>Information Reliability</h3><p>Community reports remain clearly separated from verified and officially confirmed information.</p></div><div class="panel"><h3>System Boundary</h3><p>Valencia PowerWatch manages information and communication only. It does not control electrical infrastructure or dispatch utility crews.</p></div><div class="panel"><h3>Configured Categories</h3><p>Scheduled maintenance, weather disturbance, equipment issue, emergency interruption, and unknown cause.</p></div><div class="panel"><h3>Data Maintenance</h3><p>Data is stored in the backend database (SQLite on Render, Neon for resident accounts).</p></div></div>
`);

const renderScreen = () => {
  switch (state.screen) {
    case 'auth': return renderAuth();
    case 'dashboard': return renderDashboard();
    case 'report-form': return renderReportForm();
    case 'active-outages': return renderActiveOutages();
    case 'scheduled-outages': return renderScheduled();
    case 'announcements': return renderAnnouncements();
    case 'history': return renderHistory();
    case 'my-reports': return renderMyReports();
    case 'verification': return renderVerification();
    case 'notifications': return renderNotifications();
    case 'profile': return renderProfile();
    case 'incidents': return renderIncidents();
    case 'analytics': return renderAnalytics();
    case 'users': return renderUsers();
    case 'locations': return renderLocations();
    case 'audit': return renderAudit();
    case 'settings': return renderSettings();
    case 'landing':
    default: return renderLanding();
  }
};

const render = () => {
  app.innerHTML = renderScreen();
  bindActions();
};

async function init() {
  await ensureAuth();
  if (state.token && state.screen === 'landing') {
    goTo('dashboard', state.role);
  } else if (state.token) {
    await loadDashboardData();
  }
  render();
}

init();
