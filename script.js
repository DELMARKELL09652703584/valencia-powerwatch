const STORAGE_KEY = 'valencia-powerwatch-reports';

const state = {
  screen: 'landing',
  role: 'resident',
  notification: '',
  search: '',
  profile: {
    name: 'Juan Dela Cruz',
    email: 'juan@example.com',
    contact: '0917-000-0000',
    address: 'Poblacion, Valencia City'
  },
  users: [
    { name: 'Juan Dela Cruz', email: 'juan@example.com', role: 'Resident', status: 'Active' },
    { name: 'Alicia Mendez', email: 'alicia@example.com', role: 'System Personnel', status: 'Active' },
    { name: 'Valencia Administrator', email: 'admin@powerwatch.local', role: 'Administrator', status: 'Active' },
    { name: 'Utility Desk', email: 'utility@powerwatch.local', role: 'Authorized Utility Personnel', status: 'Active' }
  ],
  notifications: [
    { title: 'Report submitted', details: 'Your report is now pending review.', date: '2026-09-24', read: false },
    { title: 'Restoration update', details: 'Power was restored in Lilingayon.', date: '2026-09-23', read: true },
    { title: 'Scheduled outage', details: 'Maintenance is scheduled in Poblacion on Sept 25.', date: '2026-09-22', read: false }
  ],
  auditLogs: [
    { action: 'Report verified', user: 'Alicia Mendez', record: 'Report #1', date: '2026-09-24 09:12' },
    { action: 'Announcement published', user: 'Valencia Administrator', record: 'Scheduled Maintenance', date: '2026-09-23 15:44' },
    { action: 'Login', user: 'Juan Dela Cruz', record: 'Resident account', date: '2026-09-24 08:01' }
  ],
  reports: [
    {
      id: 1,
      reporterName: 'Alicia Mendez',
      contactNumber: '0917-123-4567',
      barangay: 'Poblacion',
      outageType: 'Line Fault',
      affectedArea: 'Purok 5 near market',
      severity: 'High',
      incidentDate: '2026-09-18',
      description: 'Power outage affecting 40 households after a line fault near the public market.',
      status: 'Under Review',
      verificationStatus: 'Pending',
      classification: 'Unexpected',
      officialConfirmation: false,
      incidentStatus: 'Under Verification',
      remarks: 'Awaiting location validation.'
    },
    {
      id: 2,
      reporterName: 'Romel Santos',
      contactNumber: '0928-556-9102',
      barangay: 'Bagontaas',
      outageType: 'Transformer Issue',
      affectedArea: 'Sitio Kalubihan',
      severity: 'Moderate',
      incidentDate: '2026-09-20',
      description: 'Transformer started humming and caused intermittent outages for several homes.',
      status: 'Submitted',
      verificationStatus: 'Pending',
      classification: 'Unexpected',
      officialConfirmation: false,
      incidentStatus: 'Reported',
      remarks: ''
    },
    {
      id: 3,
      reporterName: 'Marina Cruz',
      contactNumber: '0932-778-1200',
      barangay: 'Lilingayon',
      outageType: 'Weather Disturbance',
      affectedArea: 'Upper Lilingayon Road',
      severity: 'Critical',
      incidentDate: '2026-09-16',
      description: 'Heavy rain caused downed lines and power interruptions for the entire stretch.',
      status: 'Resolved',
      verificationStatus: 'Officially Confirmed',
      classification: 'Unexpected',
      officialConfirmation: true,
      incidentStatus: 'Closed',
      remarks: 'Restoration confirmed by authorized utility personnel.'
    },
    {
      id: 4,
      reporterName: 'Jonalyn Perez',
      contactNumber: '0998-445-2221',
      barangay: 'Colonia',
      outageType: 'Power Supply Interruption',
      affectedArea: 'Barangay Hall stretch',
      severity: 'Low',
      incidentDate: '2026-09-21',
      description: 'Short interruption reported in the barangay hall vicinity after a breaker trip.',
      status: 'Submitted',
      verificationStatus: 'Pending',
      classification: 'Unexpected',
      officialConfirmation: false,
      incidentStatus: 'Reported',
      remarks: ''
    }
  ],
  announcements: [
    { title: 'Scheduled Maintenance', date: '2026-09-25', details: 'Planned service interruption in Poblacion from 9:00 AM to 4:00 PM.' },
    { title: 'Restoration Update', date: '2026-09-23', details: 'Power has been restored in Lilingayon after weather-related line issues.' },
    { title: 'Emergency Advisory', date: '2026-09-20', details: 'Avoid damaged utility lines and report visible hazards immediately.' }
  ],
  scheduled: [
    { barangay: 'Poblacion', time: 'Sept 25, 9:00 AM - 4:00 PM', reason: 'Scheduled Maintenance', status: 'Scheduled' },
    { barangay: 'Tugaya', time: 'Sept 28, 10:00 AM - 2:00 PM', reason: 'Transformer Upgrade', status: 'Scheduled' }
  ]
};

const app = document.getElementById('app');

const normalizeReport = (report) => {
  const isResolved = report.status === 'Resolved';
  return {
    ...report,
    status: report.status === 'Pending' ? 'Submitted' : report.status === 'Under Verification' ? 'Under Review' : report.status,
    verificationStatus: report.verificationStatus || (isResolved ? 'Officially Confirmed' : 'Pending'),
    classification: report.classification || 'Unexpected',
    officialConfirmation: report.officialConfirmation ?? isResolved,
    incidentStatus: report.incidentStatus || (isResolved ? 'Closed' : 'Reported'),
    remarks: report.remarks || (isResolved ? 'Restoration confirmed by authorized utility personnel.' : '')
  };
};

const getSavedReports = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reports));
    return state.reports.map(normalizeReport);
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed.map(normalizeReport) : state.reports.map(normalizeReport);
  } catch (error) {
    return state.reports.map(normalizeReport);
  }
};

state.reports = getSavedReports();
localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reports));

const formatDate = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

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

const getStats = () => {
  const total = state.reports.length;
  const resolved = state.reports.filter((report) => report.status === 'Resolved').length;
  const pending = state.reports.filter((report) => ['Submitted', 'Under Review', 'Pending', 'Under Verification'].includes(report.status)).length;
  const verified = state.reports.filter((report) => ['Verified', 'Officially Confirmed', 'Resolved'].includes(report.verificationStatus || report.status)).length;
  const active = state.reports.filter((report) => !['Resolved', 'Rejected', 'Duplicate'].includes(report.status)).length;

  const days = state.reports
    .filter((report) => report.status === 'Resolved')
    .map(() => 9);

  const avg = days.length ? Math.round(days.reduce((sum, value) => sum + value, 0) / days.length) : 0;

  return { total, resolved, pending, verified, active, avg };
};

const goTo = (screen, role = state.role) => {
  state.screen = screen;
  state.role = role;
  render();
};

const updateStorage = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reports));
};

const bindActions = () => {
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      const value = button.dataset.value || '';
      const role = button.dataset.role || state.role;

      switch (action) {
        case 'landing-login':
          goTo('auth', role);
          break;
        case 'landing-start':
          goTo('auth', 'resident');
          break;
        case 'login-role':
          goTo('dashboard', value);
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
        case 'mark-official':
          {
            const target = state.reports.find((item) => item.id === Number(value));
            if (target) {
              target.verificationStatus = 'Officially Confirmed';
              target.officialConfirmation = true;
              target.status = target.status === 'Resolved' ? 'Resolved' : 'Verified';
              target.remarks = 'Official information confirmed by authorized utility personnel.';
              state.auditLogs.unshift({ action: 'Official outage confirmation', user: 'Utility Desk', record: `Report #${target.id}`, date: new Date().toLocaleString() });
              updateStorage();
              state.notification = 'Report marked as officially confirmed.';
              goTo('incidents', role);
            }
          }
          break;
        case 'save-profile':
          {
            const form = document.getElementById('profileForm');
            const formData = new FormData(form);
            state.profile = {
              name: formData.get('name')?.toString().trim(),
              email: formData.get('email')?.toString().trim(),
              contact: formData.get('contact')?.toString().trim(),
              address: formData.get('address')?.toString().trim()
            };
            state.notification = 'Profile information updated.';
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
            const target = state.reports.find((item) => item.id === Number(value));
            if (target) {
              target.status = target.status === 'Resolved' ? 'Under Review' : 'Verified';
              target.verificationStatus = 'Verified';
              target.incidentStatus = 'Ongoing';
              target.remarks = 'Validated by system personnel.';
              updateStorage();
              if (state.role === 'staff' || state.role === 'admin') {
                state.notification = 'Report verified and updated successfully.';
              }
              goTo('verification', role);
            }
          }
          break;
        case 'reject-report':
          {
            const target = state.reports.find((item) => item.id === Number(value));
            if (target) {
              target.status = value.includes(':duplicate') ? 'Duplicate' : 'Rejected';
              target.verificationStatus = target.status;
              target.remarks = target.status === 'Duplicate' ? 'Linked to an existing outage incident.' : 'Report did not pass validation.';
              updateStorage();
              state.notification = 'Report marked rejected.';
              goTo('verification', role);
            }
          }
          break;
        case 'submit-report':
          {
            const form = document.getElementById('outageForm');
            if (!form.reportValidity()) return;
            const formData = new FormData(form);
            const report = {
              id: Date.now(),
              reporterName: formData.get('reporterName')?.toString().trim(),
              contactNumber: formData.get('contactNumber')?.toString().trim(),
              barangay: formData.get('barangay')?.toString(),
              outageType: formData.get('outageType')?.toString(),
              affectedArea: formData.get('affectedArea')?.toString().trim(),
              severity: formData.get('severity')?.toString(),
              incidentDate: formData.get('incidentDate')?.toString(),
              classification: formData.get('classification')?.toString(),
              photoName: formData.get('photo')?.name || '',
              description: formData.get('description')?.toString().trim(),
              status: 'Submitted',
              verificationStatus: 'Pending',
              officialConfirmation: false,
              incidentStatus: 'Reported',
              remarks: ''
            };

            state.reports.unshift(report);
            updateStorage();
            state.notifications.unshift({ title: 'Report submitted', details: `Report #${report.id} is pending review.`, date: new Date().toISOString(), read: false });
            state.auditLogs.unshift({ action: 'Report submission', user: state.profile.name, record: `Report #${report.id}`, date: new Date().toLocaleString() });
            state.notification = 'Report submitted successfully and sent for verification.';
            goTo('dashboard', 'resident');
          }
          break;
        default:
          break;
      }
    });
  });
};

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
        <div class="form-grid">
          <label>
            <span>Email / Username</span>
            <input type="text" placeholder="name@example.com" />
          </label>
          <label>
            <span>Password</span>
            <input type="password" placeholder="Enter password" />
          </label>
        </div>

        <div class="action-row">
          <button class="primary-btn" data-action="login-role" data-value="resident">Login as Resident</button>
          <button class="secondary-btn" data-action="login-role" data-value="staff">Login as Staff</button>
          <button class="secondary-btn" data-action="login-role" data-value="admin">Login as Admin</button>
          <button class="secondary-btn" data-action="login-role" data-value="utility">Utility Personnel</button>
        </div>
      </div>
    </main>
  </div>
`;

const renderDashboard = () => {
  const stats = getStats();
  const roleTitle = {
    resident: 'Resident Dashboard',
    staff: 'Staff Dashboard',
    admin: 'Administrator Dashboard',
    utility: 'Utility Personnel Dashboard'
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
      { label: 'Manage Profile', action: 'view-profile' }
    ],
    staff: [
      { label: 'Review Reports', action: 'view-verification' },
      { label: 'Manage Incidents', action: 'view-incidents' },
      { label: 'View Active Outages', action: 'view-active' },
      { label: 'Monitor Status', action: 'view-incidents' },
      { label: 'Announcements', action: 'view-announcements' },
      { label: 'Historical Records', action: 'view-history' }
    ],
    admin: [
      { label: 'Manage Users & Roles', action: 'manage-users' },
      { label: 'Manage Reports', action: 'view-verification' },
      { label: 'Manage Incidents', action: 'view-incidents' },
      { label: 'Locations & Barangays', action: 'manage-locations' },
      { label: 'Reports & Analytics', action: 'view-analytics' },
      { label: 'Audit Logs', action: 'view-audit' },
      { label: 'System Settings', action: 'view-settings' },
      { label: 'Announcements', action: 'view-announcements' }
    ],
    utility: [
      { label: 'Confirm Official Info', action: 'view-incidents' },
      { label: 'Scheduled Outage Info', action: 'view-scheduled' },
      { label: 'Announcements', action: 'view-announcements' },
      { label: 'Restoration Updates', action: 'view-incidents' },
      { label: 'Active Outages', action: 'view-active' }
    ]
  };

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
        <button class="secondary-btn" data-action="landing-login" data-role="${state.role}">Logout</button>
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
              ${state.reports
                .slice(0, 4)
                .map(
                  (report) => `
                    <li>
                      <strong>${report.barangay}</strong>
                      <span>${report.outageType}</span>
                      <small>${report.status}</small>
                    </li>
                  `
                )
                .join('')}
            </ul>
          </div>

          <div class="panel">
            <h3>Latest Announcements</h3>
            <ul class="list-box">
              ${state.announcements
                .slice(0, 3)
                .map(
                  (item) => `
                    <li>
                      <strong>${item.title}</strong>
                      <span>${item.details}</span>
                    </li>
                  `
                )
                .join('')}
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
      <form id="outageForm" class="form-card">
        <h2>Report a Power Interruption</h2>
        <div class="form-grid two-cols">
          <label><span>Reporter Name</span><input name="reporterName" required /></label>
          <label><span>Contact Number</span><input name="contactNumber" required /></label>
          <label><span>Barangay</span>
            <select name="barangay" required>
              <option value="">Select Barangay</option>
              <option value="Poblacion">Poblacion</option>
              <option value="Lilingayon">Lilingayon</option>
              <option value="Colonia">Colonia</option>
              <option value="Bagontaas">Bagontaas</option>
              <option value="Tugaya">Tugaya</option>
              <option value="Mt. Nebo">Mt. Nebo</option>
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
          <label><span>Affected Area</span><input name="affectedArea" required /></label>
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
          <label><span>Status</span>
            <select name="status" required>
              <option value="Pending">Pending</option>
              <option value="Under Verification">Under Verification</option>
              <option value="Resolved">Resolved</option>
            </select>
          </label>
        </div>
        <label><span>Details</span><textarea name="description" rows="5" required /></label>
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
          ${state.reports
            .filter((item) => item.status !== 'Resolved')
            .map(
              (item) => `
                <div class="list-item">
                  <div>
                    <strong>${item.barangay}</strong>
                    <span>${item.affectedArea}</span>
                  </div>
                  <div>
                    <span>${item.outageType}</span>
                    <small>${item.status}</small>
                  </div>
                </div>
              `
            )
            .join('') || '<p>No active outages reported.</p>'}
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
          ${state.scheduled
            .map(
              (item) => `
                <div class="list-item">
                  <div>
                    <strong>${item.barangay}</strong>
                    <span>${item.reason}</span>
                  </div>
                  <div>
                    <span>${item.time}</span>
                    <small>${item.status}</small>
                  </div>
                </div>
              `
            )
            .join('')}
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
          ${state.announcements
            .map(
              (item) => `
                <div class="list-item">
                  <div>
                    <strong>${item.title}</strong>
                    <span>${item.details}</span>
                  </div>
                  <small>${item.date}</small>
                </div>
              `
            )
            .join('')}
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
          ${searchableReports()
            .map(
              (item) => `
                <div class="list-item">
                  <div>
                    <strong>${item.barangay}</strong>
                    <span>${item.outageType}</span>
                  </div>
                  <div>
                    <span>${formatDate(item.incidentDate)}</span>
                    <small>${item.status}</small>
                  </div>
                </div>
              `
            )
            .join('')}
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
          ${state.reports
            .map(
              (item) => `
                <div class="list-item">
                  <div>
                    <strong>${item.barangay}</strong>
                    <span>${item.affectedArea}</span>
                  </div>
                  <div>
                    <span>${item.outageType}</span>
                    <small class="status-tag ${statusClass(item.status)}">${item.status}</small>
                  </div>
                </div>
              `
            )
            .join('')}
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
          ${state.reports
            .filter((item) => !['Resolved', 'Rejected', 'Duplicate'].includes(item.status))
            .map(
              (item) => `
                <div class="verification-item-card">
                  <div>
                    <strong>${item.barangay}</strong>
                    <span>${item.affectedArea}</span>
                  </div>
                  <small>${item.outageType} • ${item.severity}</small>
                  <div class="verify-actions">
                    <button class="primary-btn small-btn" data-action="verify-report" data-value="${item.id}">Verify</button>
                    <button class="secondary-btn small-btn" data-action="reject-report" data-value="${item.id}">Reject</button>
                  </div>
                </div>
              `
            )
            .join('') || '<p>No report requires verification.</p>'}
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

const searchableReports = () => state.reports.filter((item) => {
  const query = state.search;
  if (!query) return true;
  return [item.id, item.barangay, item.affectedArea, item.outageType, item.status, item.classification]
    .some((value) => String(value || '').toLowerCase().includes(query));
});

const renderProfile = () => renderModuleShell('Resident Profile Management', 'Profile and account information', `
  ${state.notification ? `<div class="notification">${state.notification}</div>` : ''}
  <form id="profileForm" class="form-grid two-cols">
    <label><span>Full Name</span><input name="name" value="${state.profile.name}" required /></label>
    <label><span>Email</span><input name="email" type="email" value="${state.profile.email}" required /></label>
    <label><span>Contact Number</span><input name="contact" value="${state.profile.contact}" required /></label>
    <label><span>Address</span><input name="address" value="${state.profile.address}" required /></label>
    <div class="submit-row"><button class="primary-btn" type="button" data-action="save-profile">Save Profile</button></div>
  </form>
`);

const renderNotifications = () => renderModuleShell('Notifications', 'Status updates and advisories', `
  <div class="list-table">${state.notifications.map((item) => `
    <div class="list-item ${item.read ? '' : 'unread'}"><div><strong>${item.title}</strong><span>${item.details}</span></div><small>${formatDate(item.date)}</small></div>
  `).join('')}</div>
`);

const renderIncidents = () => renderModuleShell('Outage Incident Management', 'Verified reports linked to outage incidents', `
  ${state.notification ? `<div class="notification">${state.notification}</div>` : ''}
  <div class="list-table">${searchableReports().filter((item) => !['Rejected', 'Duplicate'].includes(item.status)).map((item) => `
    <div class="verification-item-card">
      <div><strong>Incident #${item.id} · ${item.barangay}</strong><span>${item.affectedArea} · ${item.classification || 'Unexpected'}</span></div>
      <div><small>Report: ${item.status}</small><small>Incident: ${item.incidentStatus || 'Reported'}</small><small>Verification: ${item.verificationStatus || 'Pending'}</small></div>
      ${state.role === 'utility' && !item.officialConfirmation ? `<button class="primary-btn small-btn" data-action="mark-official" data-value="${item.id}">Confirm Official</button>` : ''}
    </div>
  `).join('') || '<p>No outage incidents found.</p>'}</div>
`);

const renderAnalytics = () => {
  const stats = getStats();
  const byBarangay = state.reports.reduce((summary, item) => {
    summary[item.barangay] = (summary[item.barangay] || 0) + 1;
    return summary;
  }, {});
  return renderModuleShell('Reports and Analytics', 'Administrator reporting and summaries', `
    <section class="stats-grid compact-stats">
      <div class="stat-card blue"><span>Total Reports</span><strong>${stats.total}</strong></div>
      <div class="stat-card green"><span>Verified</span><strong>${stats.verified}</strong></div>
      <div class="stat-card orange"><span>Active</span><strong>${stats.active}</strong></div>
      <div class="stat-card purple"><span>Resolved</span><strong>${stats.resolved}</strong></div>
    </section>
    <div class="analytics-grid"><div class="panel"><h3>Outages by Barangay</h3>${Object.entries(byBarangay).map(([barangay, total]) => `<div class="metric-row"><span>${barangay}</span><strong>${total}</strong></div>`).join('')}</div><div class="panel"><h3>Status Summary</h3>${['Submitted', 'Under Review', 'Verified', 'Resolved', 'Rejected', 'Duplicate'].map((status) => `<div class="metric-row"><span>${status}</span><strong>${state.reports.filter((item) => item.status === status).length}</strong></div>`).join('')}</div></div>
  `);
};

const renderUsers = () => renderModuleShell('User and Role Management', 'Administrator controls', `
  <div class="list-table">${state.users.map((user) => `<div class="list-item"><div><strong>${user.name}</strong><span>${user.email}</span></div><div><span>${user.role}</span><small>${user.status}</small></div></div>`).join('')}</div>
`);

const renderLocations = () => renderModuleShell('Location and Barangay Management', 'Configured Valencia City locations', `
  <div class="list-table">${['Poblacion', 'Lilingayon', 'Colonia', 'Bagontaas', 'Tugaya', 'Mt. Nebo'].map((barangay) => `<div class="list-item"><div><strong>${barangay}</strong><span>Valencia City, Bukidnon</span></div><small class="status-tag status-resolved">Active</small></div>`).join('')}</div>
`);

const renderAudit = () => renderModuleShell('Audit Logs and Activity Monitoring', 'Recorded system activities', `
  <div class="list-table">${state.auditLogs.map((log) => `<div class="list-item"><div><strong>${log.action}</strong><span>${log.user} · ${log.record}</span></div><small>${log.date}</small></div>`).join('')}</div>
`);

const renderSettings = () => renderModuleShell('System Settings and Maintenance', 'Administrator configuration', `
  <div class="settings-grid"><div class="panel"><h3>Information Reliability</h3><p>Community reports remain clearly separated from verified and officially confirmed information.</p></div><div class="panel"><h3>System Boundary</h3><p>Valencia PowerWatch manages information and communication only. It does not control electrical infrastructure or dispatch utility crews.</p></div><div class="panel"><h3>Configured Categories</h3><p>Scheduled maintenance, weather disturbance, equipment issue, emergency interruption, and unknown cause.</p></div><div class="panel"><h3>Data Maintenance</h3><p>Browser storage is being used for this front-end prototype. A centralized database is required for production deployment.</p></div></div>
`);

const renderScreen = () => {
  switch (state.screen) {
    case 'auth':
      return renderAuth();
    case 'dashboard':
      return renderDashboard();
    case 'report-form':
      return renderReportForm();
    case 'active-outages':
      return renderActiveOutages();
    case 'scheduled-outages':
      return renderScheduled();
    case 'announcements':
      return renderAnnouncements();
    case 'history':
      return renderHistory();
    case 'my-reports':
      return renderMyReports();
    case 'verification':
      return renderVerification();
    case 'notifications':
      return renderNotifications();
    case 'profile':
      return renderProfile();
    case 'incidents':
      return renderIncidents();
    case 'analytics':
      return renderAnalytics();
    case 'users':
      return renderUsers();
    case 'locations':
      return renderLocations();
    case 'audit':
      return renderAudit();
    case 'settings':
      return renderSettings();
    case 'landing':
    default:
      return renderLanding();
  }
};

const render = () => {
  app.innerHTML = renderScreen();
  bindActions();
};

render();



