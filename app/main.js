/* Authentication screens, router, actions, and boot */

function renderWelcomeScreen() {
  app.innerHTML = `<main class="mobile-welcome">
    <div class="mobile-welcome-brand"><img class="welcome-logo" src="/assets/powerwatch-logo.svg" alt="Valencia PowerWatch logo"><h1>Valencia</h1><strong>PowerWatch</strong></div>
    <p>Community Power Interruption Reporting, Verification, and Information Management System for Valencia City, Bukidnon</p>
    <button class="button primary mobile-welcome-start" type="button" data-action="get-started">Get Started <span aria-hidden="true">→</span></button>
    <div class="toast" role="status" hidden></div>
  </main>`;
}

function renderLogin(message = '') {
  if (IS_COMMUNITY) {
    if (state.mobileAuthScreen === 'register') return renderRegister();
    app.innerHTML = `<main class="mobile-auth-page">
      <section class="mobile-auth-content">
        <div class="mobile-auth-brand"><img class="auth-brand-logo" src="/assets/powerwatch-logo.svg" alt=""><div><strong>Valencia</strong><b>PowerWatch</b></div></div>
        <h1>Welcome back</h1>
        <p>Sign in to report interruptions and stay updated.</p>
        ${message ? `<div class="inline-alert">${escapeHtml(message)}</div>` : ''}
        <form class="mobile-auth-form" data-form="login">
          <label>Email or mobile number<input name="email" type="text" inputmode="email" autocomplete="username" required></label>
          <label>Password<span class="mobile-password-field"><input name="password" type="password" autocomplete="current-password" required><button type="button" data-action="toggle-password" aria-label="Show password">&#9673;</button></span></label>
          <div class="auth-options-row"><label><input type="checkbox" name="remember" checked> Remember me</label><button type="button" data-action="forgot-password">Forgot Password?</button></div>
          <button class="button primary mobile-auth-submit" type="submit">Login</button>
        </form>
        <div class="auth-divider"><span>or continue with</span></div>
        <div class="social-row">
          <button type="button" class="social-btn" data-action="start-oauth" data-provider="google"><span class="social-google">G</span>Google</button>
          <button type="button" class="social-btn" data-action="start-oauth" data-provider="facebook"><span class="social-facebook">f</span>Facebook</button>
        </div>
        ${!state.oauthProviders?.google || !state.oauthProviders?.facebook ? '<p class="auth-configuration-note">Social sign-in is unavailable until the server is configured.</p>' : ''}
        <p class="mobile-auth-switch">New here? <button type="button" data-action="go-register">Create an account</button></p>
      </section>
      <footer class="login-footer">Valencia City, Bukidnon</footer>
      <div class="toast" role="status" hidden></div>
    </main>`;
    return;
  }

  app.innerHTML = `<main class="login-page">
    <aside class="login-art admin-login-art">
      <div class="admin-art-brand"><img src="/assets/powerwatch-logo.svg" alt=""><div><strong>Valencia</strong><b>PowerWatch</b></div></div>
      <p class="portal-name">Admin / Staff Portal</p>
      <p class="art-slogan">Together for a Brighter and<br>Safer Valencia</p>
    </aside>
    <section class="login-panel">
      <div class="login-content">
        <h1>Welcome Back!</h1>
        <p class="login-intro">Sign in to your Valencia PowerWatch account.</p>
        ${message ? `<div class="inline-alert">${escapeHtml(message)}</div>` : ''}
        <form class="form-stack" data-form="login">
          <label>Username or Email<input name="email" type="text" autocomplete="username" required></label>
          <label>Password<span class="password-control"><input name="password" type="password" autocomplete="current-password" required><button type="button" data-action="toggle-password" aria-label="Show password">â—‰</button></span></label>
          <div class="admin-login-options"><label><input type="checkbox" name="remember" checked> Remember me</label><button type="button" data-action="forgot-password">Forgot password?</button></div>
          <button class="button primary full" type="submit">Login</button>
        </form>
      </div>
      <footer class="login-footer">Â© ${new Date().getFullYear()} Valencia PowerWatch. All rights reserved.</footer>
      <div class="toast" role="status" hidden></div>
    </section>
  </main>`;
}

function renderForgotPassword(message = '') {
  if (IS_ADMIN) {
    app.innerHTML = `<main class="login-page">
      <aside class="login-art admin-login-art">
        <div class="admin-art-brand"><img src="/assets/powerwatch-logo.svg" alt=""><div><strong>Valencia</strong><b>PowerWatch</b></div></div>
        <p class="portal-name">Admin / Staff Portal</p>
        <p class="art-slogan">Together for a Brighter and<br>Safer Valencia</p>
      </aside>
      <section class="login-panel"><div class="login-content">
        <h1>Forgot password?</h1>
        <p class="login-intro">Enter your account email to request a secure reset link.</p>
        ${message ? `<div class="inline-alert">${escapeHtml(message)}</div>` : ''}
        <form class="form-stack" data-form="forgot-password">
          <label>Email address<input name="email" type="email" autocomplete="email" required></label>
          <button class="button primary full" type="submit">Send reset link</button>
          <button class="button secondary full" type="button" data-action="back-login">Back to sign in</button>
        </form>
        ${state.passwordRecoveryEnabled ? '' : '<p class="auth-configuration-note">Email recovery is unavailable until SMTP is configured on the server.</p>'}
      </div><footer class="login-footer">© ${new Date().getFullYear()} Valencia PowerWatch. All rights reserved.</footer></section>
      <div class="toast" role="status" hidden></div>
    </main>`;
    return;
  }
  app.innerHTML = `<main class="mobile-auth-page">
    <header class="mobile-auth-header"><button type="button" class="mobile-auth-back" data-action="back-login" aria-label="Back to login">&#8249;</button><span>Valencia PowerWatch</span></header>
    <section class="mobile-auth-content">
      <h1>Forgot Password?</h1>
      <p>Enter your account email and we will send a secure reset link.</p>
      ${message ? `<div class="inline-alert">${escapeHtml(message)}</div>` : ''}
      <form class="mobile-auth-form" data-form="forgot-password">
        <label>Email address<input name="email" type="email" autocomplete="email" required></label>
        <button class="button primary mobile-auth-submit" type="submit">Send reset link</button>
      </form>
      ${state.passwordRecoveryEnabled ? '' : '<p class="auth-configuration-note">Email recovery is unavailable until SMTP is configured on the server.</p>'}
      <p class="mobile-auth-switch">Remember your password? <button type="button" data-action="back-login">Login</button></p>
    </section>
    <div class="toast" role="status" hidden></div>
  </main>`;
}

function renderResetPassword(token, message = '') {
  app.innerHTML = `<main class="mobile-auth-page">
    <header class="mobile-auth-header"><span>Valencia PowerWatch</span></header>
    <section class="mobile-auth-content">
      <h1>Reset Password</h1>
      <p>Choose a new password for your account.</p>
      ${message ? `<div class="inline-alert">${escapeHtml(message)}</div>` : ''}
      <form class="mobile-auth-form" data-form="reset-password">
        <input type="hidden" name="token" value="${escapeHtml(token)}">
        <label>New password<input name="password" type="password" minlength="8" autocomplete="new-password" required></label>
        <label>Confirm password<input name="confirm_password" type="password" minlength="8" autocomplete="new-password" required></label>
        <button class="button primary mobile-auth-submit" type="submit">Update password</button>
      </form>
    </section>
    <div class="toast" role="status" hidden></div>
  </main>`;
}

function renderRegister(message = '') {
  if (IS_COMMUNITY) {
    app.innerHTML = `<main class="mobile-auth-page">
      <header class="mobile-auth-header"><button type="button" class="mobile-auth-back" data-action="back-login" aria-label="Back to login">&#8249;</button><span>Valencia PowerWatch</span></header>
      <section class="mobile-auth-content">
        <h1>Create Account</h1>
        <p>Join Valencia PowerWatch to stay informed and report power interruptions.</p>
        ${message ? `<div class="inline-alert">${escapeHtml(message)}</div>` : ''}
        <form class="mobile-auth-form" data-form="register">
          <label>Full Name<input name="full_name" autocomplete="name" required></label>
          <label>Email Address<input name="email" type="email" autocomplete="email" required></label>
          <label>Mobile Number<input name="contact_number" type="tel" autocomplete="tel" placeholder="0917 123 4567"></label>
          <label>Home Barangay<select name="barangay"><option value="">Choose barangay</option>${state.barangays.map((b) => `<option>${escapeHtml(b)}</option>`).join('')}</select></label>
          <label>Password<span class="mobile-password-field"><input name="password" type="password" minlength="6" autocomplete="new-password" required><button type="button" data-action="toggle-password" aria-label="Show password">&#9673;</button></span></label>
          <label>Confirm Password<span class="mobile-password-field"><input name="confirm_password" type="password" minlength="6" autocomplete="new-password" required><button type="button" data-action="toggle-password" aria-label="Show password">&#9673;</button></span></label>
          <button class="button primary mobile-auth-submit" type="submit">Register</button>
        </form>
        <p class="mobile-auth-switch">Already have an account? <button type="button" data-action="back-login">Login</button></p>
      </section>
      <div class="toast" role="status" hidden></div>
    </main>`;
    return;
  }

  app.innerHTML = `<main class="login-page">
    <aside class="login-art">
      <div class="art-brand"><span class="brand-emblem">âš¡</span><div><strong>Valencia</strong><b>PowerWatch</b></div></div>
      <p class="portal-name">Community Portal</p>
      <p class="art-slogan">Together for a Brighter and<br>Safer Valencia</p>
    </aside>
    <section class="login-panel">
      <div class="login-content">
        <p class="eyebrow">CREATE AN ACCOUNT</p>
        <h1>Welcome to PowerWatch</h1>
        <p class="login-intro">Create a resident account to report and follow outages.</p>
        ${message ? `<div class="inline-alert">${escapeHtml(message)}</div>` : ''}
        <form class="form-stack" data-form="register">
          <label>Full name<input name="full_name" required></label>
          <label>Email address<input name="email" type="email" required></label>
          <label>Contact number<input name="contact_number" type="tel"></label>
          <label>Home barangay<select name="barangay"><option value="">Choose barangay</option>${state.barangays.map((b) => `<option>${escapeHtml(b)}</option>`).join('')}</select></label>
          <label>Password<span class="password-control"><input name="password" type="password" minlength="6" required><button type="button" data-action="toggle-password" aria-label="Show password">â—‰</button></span></label>
          <button class="button primary full" type="submit">Create resident account</button>
          <button class="button secondary full" data-action="back-login" type="button">Back to sign in</button>
        </form>
      </div>
      <footer class="login-footer">Â© ${new Date().getFullYear()} Valencia PowerWatch. All rights reserved.</footer>
      <div class="toast" role="status" hidden></div>
    </section>
  </main>`;
}

const ADMIN_PAGES = IS_ADMIN ? {
  dashboard: renderAdminDashboard,
  reports: renderAdminReports,
  verification: renderAdminVerification,
  incidents: renderAdminIncidents,
  'outage-monitoring': renderAdminOutageMonitoring,
  scheduled: renderAdminScheduled,
  map: renderAdminMap,
  announcements: renderAdminAnnouncements,
  notifications: renderAdminNotifications,
  history: renderAdminHistory,
  analytics: renderAdminAnalytics,
  users: renderAdminUsers,
  barangays: renderAdminBarangays,
  audit: renderAdminAudit,
  settings: renderAdminSettings,
  profile: renderAdminProfile,
} : {};

const MOBILE_PAGES = IS_COMMUNITY ? {
  home: renderMobileHome,
  report: renderMobileReportForm,
  outages: renderMobileOutages,
  announcements: renderMobileAnnouncements,
  reports: renderMobileReports,
  map: renderMobileMap,
  notifications: renderMobileNotifications,
  'notification-settings': renderMobileNotificationSettings,
  scheduled: renderMobileScheduled,
  history: renderMobileHistory,
  settings: renderMobileSettings,
  profile: renderMobileProfile,
} : {};

async function refreshUnread() {
  try {
    const { unread } = await api('/api/notifications/unread-count');
    state.unread = unread;
  } catch {
    state.unread = 0;
  }
}

async function render() {
  if (!state.user) return;
  if (IS_COMMUNITY) {
    const target = MOBILE_PAGES[state.mobileTab] ? state.mobileTab : 'home';
    state.mobileTab = target;
    if (target === 'reports' && state.mobileReportId) return renderMobileReportDetail();
    if (target === 'report') return renderMobileReportForm();
    return MOBILE_PAGES[target]();
  }
  const target = ADMIN_PAGES[state.page] ? state.page : 'dashboard';
  state.page = target;
  return ADMIN_PAGES[target]();
}

async function goToPage(page) {
  if (!ADMIN_PAGES[page]) return;
  state.page = page;
  try {
    await render();
  } catch (error) {
    if (error.status === 401) return renderLogin('Your session expired. Sign in again to continue.');
    adminShell(`<div class="panel">${emptyState('Could not load this module', error.message, 'âš ï¸')}</div>`);
    return undefined;
  }
  return undefined;
}

async function goToTab(tab) {
  if (!MOBILE_PAGES[tab]) return;
  state.mobileTab = tab;
  try {
    await render();
  } catch (error) {
    if (error.status === 401) return renderLogin('Your session expired. Sign in again to continue.');
    mobileShell(`<div class="mobile-card">${emptyState('Could not load this section', error.message, 'âš ï¸')}</div>`);
    return undefined;
  }
  return undefined;
}

async function refreshConfig() {
  try {
    const [{ settings }, { barangays }, demo] = await Promise.all([
      api('/api/settings'),
      api('/api/barangays'),
      fetch('/api/auth/demo').then((r) => (r.ok ? r.json() : { demos: [], barangays: [] })),
    ]);
    state.config = settings || {};
    state.barangays = barangays || [];
    state.demos = (demo && demo.demos) || [];
  } catch {
    state.config = {};
    state.barangays = [];
  }
}

function incidentChipValues(picker) {
  try {
    const values = JSON.parse(picker.querySelector('[data-chip-values]')?.value || '[]');
    return Array.isArray(values) ? values.map(String) : [];
  } catch {
    return [];
  }
}

function updateIncidentChipPicker(picker, values) {
  const select = picker.querySelector('[data-chip-select]');
  const hidden = picker.querySelector('[data-chip-values]');
  const list = picker.querySelector('[data-chip-list]');
  const selected = new Set(values.map(String));
  hidden.value = JSON.stringify([...selected]);
  const primaryBarangay = picker.querySelector('[data-chip-primary]');
  if (primaryBarangay) primaryBarangay.value = [...selected][0] || '';
  [...select.options].forEach((option) => { option.disabled = selected.has(option.value); });
  select.value = '';
  const labels = new Map([...select.options].map((option) => [option.value, option.dataset.chipLabel || option.textContent.trim()]));
  list.innerHTML = [...selected].map((value) => `<span class="incident-selection-chip">${escapeHtml(labels.get(value) || value)}<button type="button" data-action="remove-incident-chip" data-value="${escapeHtml(value)}" aria-label="Remove ${escapeHtml(labels.get(value) || value)}">×</button></span>`).join('');
}

async function submitForm(form) {
  const type = form.dataset.form;
  if (!type) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const target = form;

  if (type === 'login') {
    const result = await send('/api/auth/login', 'POST', {
      email: values.email, password: values.password, remember: values.remember === 'on',
    });
    state.user = result.user;
    await afterLogin();
    return;
  }
  if (type === 'forgot-password') {
    const result = await send('/api/auth/forgot-password', 'POST', { email: values.email });
    renderForgotPassword(result.message);
    return;
  }
  if (type === 'reset-password') {
    if (values.password !== values.confirm_password) throw new Error('Passwords do not match.');
    const result = await send('/api/auth/reset-password', 'POST', { token: values.token, password: values.password });
    window.history.replaceState({}, '', '/community');
    state.mobileAuthScreen = 'login';
    renderLogin(result.message);
    return;
  }
  if (type === 'register') {
    if (values.password !== values.confirm_password) throw new Error('Passwords do not match.');
    const result = await send('/api/auth/register', 'POST', {
      full_name: values.full_name, email: values.email, contact_number: values.contact_number,
      address: values.address, barangay: values.barangay, password: values.password,
    });
    state.user = result.user;
    await afterLogin();
    return;
  }
  if (type === 'profile') {
    const photoFile = target.querySelector('[data-profile-photo]')?.files?.[0];
    let photoData = null;
    if (photoFile) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(photoFile.type)) throw new Error('Choose a JPG, PNG, or WebP profile photo.');
      if (photoFile.size > 3 * 1024 * 1024) throw new Error('Profile photos must be 3 MB or smaller.');
      photoData = await readPhoto(photoFile);
    }
    const result = await send('/api/profile', 'PUT', {
      full_name: values.full_name, contact_number: values.contact_number, address: values.address, barangay: values.barangay,
      photoData,
    });
    state.user = result.user;
    closeDialog();
    await render();
    setToast('Profile updated.');
    return;
  }
  if (type === 'password') {
    if (values.new_password !== values.confirm_password) throw new Error('Passwords do not match.');
    await send('/api/profile/password', 'PUT', { current_password: values.current_password, new_password: values.new_password });
    setToast('Password changed successfully.');
    closeDialog();
    return;
  }
  if (type === 'notification-preferences') {
    const preferences = Object.fromEntries(['reportUpdates', 'outageAlerts', 'scheduledOutages', 'announcements', 'general']
      .map((name) => [name, values[name] === 'on']));
    localStorage.setItem('powerwatch.notification-preferences', JSON.stringify(preferences));
    await render();
    setToast('Notification preferences saved.');
    return;
  }
  if (type === 'feedback') {
    await send('/api/feedback', 'POST', { rating: Number(values.rating), comments: values.comments });
    setToast('Thank you for your feedback.');
    return;
  }
  if (type === 'report') {
    const reportFormData = new FormData();
    const reportValues = {
      location: values.location,
      latitude: values.latitude === '' ? null : Number(values.latitude),
      longitude: values.longitude === '' ? null : Number(values.longitude),
      barangay: values.barangay,
      date_time_noticed: values.date_time_noticed ? new Date(values.date_time_noticed).toISOString() : null,
      description: values.description,
      affected_area: values.affected_area,
      possible_outage_type: values.possible_outage_type || null,
      remarks: values.remarks,
    };
    for (const [key, value] of Object.entries(reportValues)) {
      if (value !== null && value !== undefined) reportFormData.append(key, String(value));
    }
    for (const attachment of state.mobileReportDraft?.attachments || []) {
      const blob = await (await fetch(attachment.data)).blob();
      reportFormData.append('attachments', blob, attachment.name);
    }
    const result = await api('/api/reports', { method: 'POST', body: reportFormData });
    await refreshUnread();
    state.mobileTab = 'reports';
    state.mobileReportDraft = null;
    state.mobileReportStep = 1;
    await render();
    setToast(`Report ${result.report.report_code} submitted. It is pending review.`);
    return;
  }
  if (type === 'settings-info') {
    const info = {};
    for (const [key, value] of Object.entries(values)) if (key !== 'logoFile') info[key] = value;
    const logoFile = target.querySelector('[name="logoFile"]')?.files?.[0];
    if (logoFile) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(logoFile.type)) throw new Error('Choose a PNG, JPG, or WebP logo.');
      if (logoFile.size > 3 * 1024 * 1024) throw new Error('The logo must be 3 MB or smaller.');
      info.logoData = await readPhoto(logoFile);
    }
    const current = state.config.system_info || {};
    await send('/api/admin/settings', 'PUT', { key: 'system_info', value: { ...current, ...info } });
    await refreshConfig();
    setToast('System information saved.');
    return;
  }
  if (type === 'notification-settings') {
    const settings = Object.fromEntries(['inApp', 'web', 'email', 'sms'].map((key) => [key, values[key] === 'on' ? 'on' : 'off']));
    await send('/api/admin/settings', 'PUT', { key: 'notification_settings', value: settings });
    await refreshConfig();
    setToast('Notification settings saved.');
    await render();
    return;
  }
  if (type === 'map-settings') {
    const settings = {
      latitude: Number(values.latitude), longitude: Number(values.longitude), zoom: Number(values.zoom),
      activeOutages: values.activeOutages === 'on', scheduledOutages: values.scheduledOutages === 'on',
      barangayCenters: values.barangayCenters === 'on', satellite: values.satellite === 'on',
    };
    if (!Number.isFinite(settings.latitude) || settings.latitude < -90 || settings.latitude > 90
      || !Number.isFinite(settings.longitude) || settings.longitude < -180 || settings.longitude > 180
      || !Number.isInteger(settings.zoom) || settings.zoom < 3 || settings.zoom > 18) {
      throw new Error('Enter valid map coordinates and a zoom level from 3 to 18.');
    }
    await send('/api/admin/settings', 'PUT', { key: 'map_settings', value: settings });
    await refreshConfig();
    setToast('Map settings saved.');
    await render();
    return;
  }
  if (type === 'admin-notification') {
    await send('/api/notifications', 'POST', {
      title: values.title, message: values.message, type: values.type, audience: values.audience,
    });
    closeDialog();
    setToast('Notification sent.');
    await render();
    return;
  }
  if (type === 'verification-duplicate') {
    await send(`/api/reports/${target.dataset.id}/duplicate`, 'PUT', {
      related_code: values.related_code, remarks: values.remarks,
    });
    closeDialog();
    setToast('Report marked as duplicate.');
    await render();
    return;
  }
  if (type === 'verification-reject') {
    await send(`/api/reports/${target.dataset.id}/status`, 'PUT', { status: 'Rejected', remarks: values.remarks });
    closeDialog();
    setToast('Report rejected.');
    await render();
    return;
  }
  if (type === 'verification-link-incident') {
    await send(`/api/incidents/${values.incident_id}/reports`, 'POST', {
      report_id: Number(target.dataset.id), remarks: values.remarks,
    });
    closeDialog();
    setToast('Report linked to the incident.');
    await render();
    return;
  }
  if (type === 'new-user') {
    await send('/api/admin/users', 'POST', {
      full_name: values.full_name, email: values.email, contact_number: values.contact_number,
      address: values.address, barangay: values.barangay, role: values.role, password: values.password,
    });
    setToast('Account created.');
    closeDialog();
    await render();
    return;
  }
  if (type === 'edit-user') {
    await send(`/api/admin/users/${target.dataset.id}`, 'PUT', {
      full_name: values.full_name, email: values.email, contact_number: values.contact_number,
      address: values.address, barangay: values.barangay,
    });
    setToast('User updated.');
    closeDialog();
    await render();
    return;
  }
  if (type === 'change-role') {
    await send(`/api/admin/users/${target.dataset.id}/role`, 'PUT', { role: values.role });
    setToast('Role updated.');
    closeDialog();
    await render();
    return;
  }
  if (type === 'reset-password') {
    await send(`/api/admin/users/${target.dataset.id}/reset`, 'PUT', { new_password: values.new_password });
    setToast('Password reset successfully.');
    closeDialog();
    return;
  }
  if (type === 'new-barangay') {
    await send('/api/admin/barangays', 'POST', {
      name: values.name, area_description: values.area_description, population: values.population,
      latitude: values.latitude, longitude: values.longitude,
    });
    await refreshConfig();
    setToast('Barangay added.');
    closeDialog();
    await render();
    return;
  }
  if (type === 'edit-barangay') {
    await send(`/api/admin/barangays/${target.dataset.id}`, 'PUT', {
      name: values.name, area_description: values.area_description, population: values.population,
      latitude: values.latitude, longitude: values.longitude,
    });
    await refreshConfig();
    setToast('Barangay updated.');
    closeDialog();
    await render();
    return;
  }
  if (type === 'new-incident') {
    const primaryBarangay = String(values.barangay || '').trim();
    const affectedBarangays = [...new Set([primaryBarangay, ...JSON.parse(values.affected_barangays || '[]').map(String)].filter(Boolean))];
    const relatedReportIds = [...new Set(JSON.parse(values.related_report_ids || '[]').map(Number))];
    if (!primaryBarangay || !affectedBarangays.length) throw new Error('Choose a primary and at least one affected barangay.');
    if (!relatedReportIds.length) throw new Error('Link at least one related report before creating the incident.');
    const result = await send('/api/incidents', 'POST', {
      related_report_ids: relatedReportIds,
      affected_barangays: affectedBarangays,
      title: values.title, barangay: primaryBarangay, location: values.location,
      latitude: values.latitude === '' ? null : Number(values.latitude),
      longitude: values.longitude === '' ? null : Number(values.longitude),
      incident_type: values.incident_type, outage_type: values.outage_type || null,
      priority: values.priority, customers_affected: values.customers_affected === '' ? null : Number(values.customers_affected),
      restoration_progress: values.restoration_progress === '' ? null : Number(values.restoration_progress),
      description: values.description,
      cause_category: isOfficial() ? (values.cause_category || null) : null,
      start_time: values.start_time ? new Date(values.start_time).toISOString() : null,
      affected_area: values.affected_area,
      estimated_restoration: isOfficial() && values.estimated_restoration
        ? new Date(values.estimated_restoration).toISOString() : null,
      initial_status: values.initial_status,
    });
    setToast(result.message);
    closeDialog();
    await render();
    return;
  }
  if (type === 'update-report-status') {
    await send(`/api/reports/${target.dataset.id}/status`, 'PUT', {
      status: values.status, remarks: values.remarks, verify: values.verify || undefined,
    });
    setToast('Report updated.');
    closeDialog();
    await render();
    return;
  }
  if (type === 'update-incident-status') {
    await send(`/api/incidents/${target.dataset.id}/status`, 'PUT', {
      status: values.status, remarks: values.remarks,
      restoration_time: values.restoration_time ? new Date(values.restoration_time).toISOString() : undefined,
      customers_affected: values.customers_affected === '' ? undefined : Number(values.customers_affected),
      restoration_progress: values.restoration_progress === '' ? undefined : Number(values.restoration_progress),
    });
    setToast('Incident status updated.');
    closeDialog();
    await render();
    return;
  }
  if (type === 'link-report') {
    await send(`/api/incidents/${target.dataset.id}/related`, 'POST', { report_id: Number(values.report_id), remarks: values.remarks });
    setToast('Report linked to the incident.');
    closeDialog();
    await render();
    return;
  }
  if (type === 'new-schedule') {
    await send('/api/scheduled', 'POST', {
      title: values.title, barangay: values.barangay, area: values.area,
      outage_date: values.outage_date, start_time: values.start_time,
      expected_end_time: values.expected_end_time, reason: values.reason,
    });
    setToast('Scheduled outage created.');
    closeDialog();
    await render();
    return;
  }
  if (type === 'edit-schedule') {
    await send(`/api/scheduled/${target.dataset.id}`, 'PUT', {
      title: values.title, barangay: values.barangay, area: values.area,
      outage_date: values.outage_date, start_time: values.start_time,
      expected_end_time: values.expected_end_time, reason: values.reason,
    });
    setToast('Schedule updated.');
    closeDialog();
    await render();
    return;
  }
  if (type === 'update-schedule-status') {
    await send(`/api/scheduled/${target.dataset.id}/status`, 'PUT', { status: values.status, reason: values.reason });
    setToast('Schedule status updated.');
    closeDialog();
    await render();
    return;
  }
  if (type === 'new-announcement') {
    await send('/api/announcements', 'POST', {
      title: values.title, content: values.content, category: values.category, publish: values.publish === 'on',
    });
    setToast('Announcement saved.');
    closeDialog();
    await render();
    return;
  }
  if (type === 'edit-announcement') {
    await send(`/api/announcements/${target.dataset.id}`, 'PUT', {
      title: values.title, content: values.content, category: values.category,
    });
    setToast('Announcement updated.');
    closeDialog();
    await render();
    return;
  }
  throw new Error(`Unknown form: ${type}`);
}

async function handleClick(event) {
  const pageButton = event.target.closest('[data-page]');
  if (pageButton) {
    event.preventDefault();
    await goToPage(pageButton.dataset.page);
    return;
  }
  const tabButton = event.target.closest('[data-mobile-tab]');
  if (tabButton) {
    event.preventDefault();
    await goToTab(tabButton.dataset.mobileTab);
    return;
  }
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;
  const { action, id, value } = actionButton.dataset;

  try {
    switch (action) {
      case 'logout':
        await send('/api/auth/logout', 'POST');
        state.user = null;
        state.unread = 0;
        state.page = 'dashboard';
        state.mobileTab = 'home';
        if (IS_ADMIN) renderLogin();
        else renderWelcomeScreen();
        return;
      case 'get-started':
        state.mobileAuthScreen = 'login';
        renderLogin();
        return;
      case 'close-dialog':
        closeDialog();
        return;
      case 'add-incident-chip': {
        const picker = actionButton.closest('.incident-chip-picker');
        const select = picker?.querySelector('[data-chip-select]');
        if (!picker || !select?.value) return;
        const values = incidentChipValues(picker);
        if (!values.includes(select.value)) values.push(select.value);
        updateIncidentChipPicker(picker, values);
        return;
      }
      case 'remove-incident-chip': {
        const picker = actionButton.closest('.incident-chip-picker');
        if (!picker) return;
        const values = incidentChipValues(picker).filter((item) => item !== value);
        updateIncidentChipPicker(picker, values);
        return;
      }
      case 'go-register':
        state.mobileAuthScreen = 'register';
        renderRegister();
        return;
      case 'forgot-password':
        renderForgotPassword();
        return;
      case 'start-oauth':
        if (!state.oauthProviders?.[value]) {
          setToast(`${value === 'google' ? 'Google' : 'Facebook'} sign-in is not configured on this server.`);
          return;
        }
        window.location.assign(`/api/auth/oauth/${encodeURIComponent(value)}`);
        return;
      case 'back-login':
        state.mobileAuthScreen = 'login';
        renderLogin();
        return;
      case 'toggle-password': {
        const input = actionButton.parentElement.querySelector('input');
        if (input) input.type = input.type === 'password' ? 'text' : 'password';
        return;
      }
      case 'fill-demo': {
        const form = document.querySelector('form[data-form="login"]');
        if (form) {
          form.email.value = actionButton.dataset.email;
          form.password.value = actionButton.dataset.password;
          form.requestSubmit();
        }
        return;
      }
      case 'capture-gps': {
        const status = document.querySelector('[data-gps="status"]');
        if (status) status.textContent = 'Locatingâ€¦';
        const position = await captureLocation();
        if (!position) {
          if (status) status.textContent = 'Location unavailable. You may continue without it.';
          return;
        }
        const form = actionButton.closest('form');
        form.querySelector('[data-gps="latitude"]').value = position.latitude.toFixed(6);
        form.querySelector('[data-gps="longitude"]').value = position.longitude.toFixed(6);
        const location = form.querySelector('input[name="location"]');
        if (location) location.value = `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`;
        state.reportLocationSetPin?.(position.latitude, position.longitude);
        if (status) status.textContent = `Location attached: ${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`;
        return;
      }
      case 'mark-all-read':
        await send('/api/notifications/read-all', 'PUT');
        await refreshUnread();
        setToast('All alerts marked as read.');
        await render();
        return;
      case 'view-notification': {
        const notice = (state.mobileNotifications || []).find((item) => String(item.id) === String(id));
        if (!notice) return;
        if (!notice.read) {
          await send(`/api/notifications/${id}/read`, 'PUT');
          notice.read = 1;
          await refreshUnread();
        }
        const reportCode = notice.type === 'report' ? String(notice.message || '').match(/\bVPR-\d+\b/)?.[0] : null;
        const { reports = [] } = reportCode ? await api('/api/reports/mine') : {};
        const linkedReport = reports.find((report) => report.report_code === reportCode);
        openDialog(notice.title, `<p>${escapeHtml(notice.message)}</p><p class="muted small">${escapeHtml(formatDateTime(notice.created_at))}</p>`, 'Close');
        setDialogFooter(`${linkedReport ? `<button type="button" class="button primary" data-action="view-my-report" data-id="${linkedReport.id}">View Report</button>` : ''}<button type="button" class="button ghost" data-action="close-dialog">Close</button>`);
        return;
      }
      case 'view-incident-details': {
        const { incident } = await api(`/api/incidents/${id}`);
        openDialog(incident.title || incident.incident_code, `
          <div class="detail-grid">
            <div><span>Incident</span><strong>${escapeHtml(incident.incident_code)}</strong></div>
            <div><span>Status</span><strong>${statusPill(incident.status)}</strong></div>
            <div><span>Barangay</span><strong>${escapeHtml(incident.barangay)}</strong></div>
            <div><span>Affected areas</span><strong>${escapeHtml((incident.affected_barangays || [incident.barangay]).join(', '))}</strong></div>
            <div><span>Started</span><strong>${escapeHtml(formatDateTime(incident.start_time))}</strong></div>
            <div><span>Restoration</span><strong>${incident.restoration_progress == null ? 'Not reported' : `${escapeHtml(String(incident.restoration_progress))}%`}</strong></div>
          </div><p>${escapeHtml(incident.description || '')}</p>
        `, 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      }
      case 'view-schedule-details': {
        const { scheduled } = await api(`/api/scheduled/${id}`);
        openDialog(scheduled.title, `
          <div class="detail-grid">
            <div><span>Schedule</span><strong>${escapeHtml(scheduled.schedule_code)}</strong></div>
            <div><span>Status</span><strong>${statusPill(scheduled.status)}</strong></div>
            <div><span>Barangay</span><strong>${escapeHtml(scheduled.barangay)}</strong></div>
            <div><span>Date</span><strong>${escapeHtml(formatSystemDate(scheduled.outage_date))}</strong></div>
            <div><span>Time</span><strong>${escapeHtml(String(scheduled.start_time || '').slice(0, 5))}–${escapeHtml(String(scheduled.expected_end_time || '').slice(0, 5))}</strong></div>
            <div><span>Reason</span><strong>${escapeHtml(scheduled.reason || 'Not provided')}</strong></div>
          </div>
        `, 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      }
      case 'view-announcement': {
        const { announcement } = await api(`/api/announcements/${id}`);
        openDialog(announcement.title, `
          <p class="tag">${escapeHtml(announcement.category)}</p>
          <div class="detail-block"><p>${escapeHtml(announcement.content)}</p></div>
          <p class="muted small">${escapeHtml(formatDateTime(announcement.published_at || announcement.created_at))}</p>
        `, 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      }
      case 'compose-report':
        state.mobileReportStep = 1;
        state.mobileReportDraft = {};
        state.mobileTab = 'report';
        await render();
        return;
      case 'dashboard-pending-reports':
        state.filters.myReportStatus = 'pending';
        await goToTab('reports');
        return;
      case 'feedback-star': {
        const rating = Math.max(1, Math.min(5, Number(value)));
        state.feedbackRating = rating;
        const form = actionButton.closest('form');
        form.querySelector('input[name="rating"]').value = String(rating);
        form.querySelectorAll('[data-action="feedback-star"]').forEach((star) => {
          const selected = Number(star.dataset.value) <= rating;
          star.classList.toggle('selected', selected);
          star.setAttribute('aria-pressed', String(Number(star.dataset.value) === rating));
        });
        return;
      }
      case 'open-settings':
        state.mobileTab = 'settings';
        await render();
        return;
      case 'open-notification-settings':
        state.mobileTab = 'notification-settings';
        await render();
        return;
      case 'back-to-settings':
        await goToTab('settings');
        return;
      case 'back-to-profile':
        await goToTab('profile');
        return;
      case 'open-security':
        state.mobileTab = 'profile';
        await render();
        document.getElementById('account-security')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      case 'check-location': {
        const position = await captureLocation();
        setToast(position ? `Location available: ${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}` : 'Location is unavailable. Check your device permission and try again.');
        return;
      }
      case 'show-support':
        openDialog('Help & Support', '<p>For urgent electrical hazards, contact your barangay office or the appropriate local emergency service.</p><p>For report status, open My Reports and select a report to view its timeline.</p>', 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      case 'show-about':
        openDialog('About Valencia PowerWatch', '<p>Community Power Interruption Reporting, Verification, and Information Management System for Valencia City, Bukidnon.</p><p>Version 1.0.0</p>', 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      case 'open-language-dialog':
        openDialog('Language / Pinulongan', `
          <div style="display:grid;gap:9px;padding:6px 0;">
            <button type="button" class="button block" style="display:flex;justify-content:space-between;align-items:center;background:#edf5fd;color:#0366a6;font-weight:700;border:1.5px solid #0366a6;padding:12px 16px;border-radius:10px;" data-action="set-app-language" data-value="en">
              <span>English (Current)</span>
              <span>✓</span>
            </button>
            <button type="button" class="button ghost block" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-radius:10px;" data-action="set-app-language" data-value="ceb">
              <span>Sinugbuanong Binisaya</span>
              <span class="muted small">(Default / Local)</span>
            </button>
            <button type="button" class="button ghost block" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-radius:10px;" data-action="set-app-language" data-value="fil">
              <span>Filipino / Tagalog</span>
            </button>
          </div>
        `, 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      case 'set-app-language':
        closeDialog();
        setToast('Language preference updated.');
        return;
      case 'show-version-info':
        setToast('Valencia PowerWatch Mobile App v1.0.0 (Valencia City)');
        return;
      case 'next-report-step':
        await moveMobileReportStep(1);
        return;
      case 'remove-report-attachment':
        state.mobileReportDraft.attachments = (state.mobileReportDraft.attachments || []).filter((attachment, index) => index !== Number(actionButton.dataset.index));
        await render();
        return;
      case 'set-report-location-mode': {
        const locationForm = actionButton.closest('form');
        const values = Object.fromEntries(new FormData(locationForm).entries());
        state.mobileReportDraft = { ...(state.mobileReportDraft || {}), ...values };
        state.mobileLocationMode = value;
        await render();
        return;
      }
      case 'previous-report-step':
        await moveMobileReportStep(-1);
        return;
      case 'filter-my-reports':
        state.filters.myReportStatus = value;
        await goToTab('reports');
        return;
      case 'view-my-report':
        state.mobileReportId = id;
        state.mobileTab = 'reports';
        await render();
        return;
      case 'back-to-reports':
        state.mobileReportId = null;
        await goToTab('reports');
        return;
      case 'back-home':
        await goToTab('home');
        return;
      case 'show-all-schedules':
        state.mobileScheduleAll = true;
        await render();
        return;
      case 'show-upcoming-schedules':
        state.mobileScheduleAll = false;
        await render();
        return;
      case 'filter-history':
        state.mobileHistoryFilter = value;
        await render();
        return;
      case 'set-mobile-map-mode':
        state.mobileMapMode = value;
        await render();
        return;
      case 'clear-mobile-scope':
        state.filters.mobileBarangay = '';
        state.filters.mobileType = '';
        await render();
        return;
      case 'reset-report-filters':
        state.filters = { ...state.filters, reportSearch: '', reportStatus: '', reportBarangay: '', reportFrom: '', reportTo: '' };
        state.reportPage = 1;
        await render();
        return;
      case 'apply-report-filters':
        state.reportPage = 1;
        await render();
        return;
      case 'report-page':
        state.reportPage = Math.max(1, Number(value || 1));
        await render();
        return;
      case 'reset-incident-filters':
        state.filters = { ...state.filters, incidentSearch: '', incidentStatus: '', incidentType: '', incidentBarangay: '' };
        await render();
        return;
      case 'reset-outage-monitoring-filters':
        state.filters = {
          ...state.filters,
          monitoringSearch: '', monitoringIncidentStatus: '', monitoringScheduledStatus: '', monitoringBarangay: '',
        };
        await render();
        return;
      case 'reset-sched-filters':
        state.filters = { ...state.filters, schedSearch: '', schedStatus: '', schedBarangay: '' };
        state.scheduledPage = 1;
        await render();
        return;
      case 'scheduled-page':
        state.scheduledPage = Math.max(1, Number(value || 1));
        await render();
        return;
      case 'reset-barangay-filters':
        state.filters = { ...state.filters, barangaySearch: '', barangayStatus: 'Active' };
        state.barangayPage = 1;
        await render();
        return;
      case 'admin-barangay-page':
        state.barangayPage = Math.max(1, Number(value || 1));
        await render();
        return;
      case 'reset-history-filters':
        state.filters = { ...state.filters, historySearch: '', historyBarangay: '', historyType: '', historyFrom: '', historyTo: '' };
        await render();
        return;
      case 'reset-analytics':
        state.analyticsRange = { from: '', to: '' };
        await render();
        return;
      case 'export-analytics': {
        const data = state.analyticsExportData;
        if (!data) throw new Error('Analytics data is not ready to export.');
        const rows = [['Section', 'Metric', 'Value']];
        Object.entries(data.summary).forEach(([key, item]) => rows.push(['Summary', key, item]));
        data.monthly.forEach((item) => rows.push(['Monthly incidents', item.month, item.count]));
        data.barangay.forEach((item) => rows.push(['Reports by barangay', item.barangay, item.c]));
        data.types.forEach((item) => rows.push(['Reported outage types', item.type, item.count]));
        data.status.forEach((item) => rows.push(['Incident status', item.status, item.c]));
        const csv = rows.map((row) => row.map((item) => `"${String(item ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `powerwatch-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      case 'filter-announcements':
        state.filters.announcementFilter = value;
        await render();
        return;
      case 'filter-verification':
        state.filters.verificationStatus = value;
        state.verificationReportId = null;
        await render();
        return;
      case 'verification-refresh':
        await render();
        setToast('Verification data refreshed.');
        return;
      case 'verification-select-report':
        state.verificationReportId = id;
        await render();
        return;
      case 'verification-view-evidence': {
        const { report } = await api(`/api/reports/${id}`);
        const attachments = [...(report.attachments || [])];
        if (report.photo_path && !attachments.some((attachment) => attachment.file_path === report.photo_path)) {
          attachments.unshift({ file_path: report.photo_path, mime_type: 'image/jpeg', original_name: 'Report photo' });
        }
        const media = attachments.map((attachment) => String(attachment.mime_type || '').startsWith('video/')
          ? `<figure><video src="${escapeHtml(attachment.file_path)}" controls preload="metadata"></video><figcaption>${escapeHtml(attachment.original_name || 'Video evidence')}</figcaption></figure>`
          : `<figure><a href="${escapeHtml(attachment.file_path)}" target="_blank" rel="noopener"><img src="${escapeHtml(attachment.file_path)}" alt="${escapeHtml(attachment.original_name || 'Report evidence')}"></a><figcaption>${escapeHtml(attachment.original_name || 'Photo evidence')}</figcaption></figure>`).join('');
        openDialog(`Evidence · ${report.report_code}`, media ? `<div class="verification-evidence-dialog">${media}</div>` : '<p>No evidence attachments were submitted with this report.</p>', 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      }
      case 'filter-report-status':
        state.filters.reportStatus = value;
        state.reportPage = 1;
        await render();
        return;
      case 'verify-report':
        await send(`/api/reports/${id}/status`, 'PUT', { status: 'Verified' });
        setToast('Report verified.');
        await render();
        return;
      case 'verification-duplicate': {
        const { report } = await api(`/api/reports/${id}`);
        openDialog(`Mark ${report.report_code} as duplicate`, `
          <div class="form-stack">
            <label>Related report ID<input class="input" name="related_code" placeholder="Optional report code"></label>
            <label class="wide-field">Remarks<textarea class="input" name="remarks" rows="3"></textarea></label>
          </div>`, 'Mark duplicate', { form: 'verification-duplicate', id });
        return;
      }
      case 'verification-reject': {
        const { report } = await api(`/api/reports/${id}`);
        openDialog(`Reject ${report.report_code}`, `
          <div class="form-stack">
            <p>Reject this report and notify the resident?</p>
            <label class="wide-field">Reason for rejection<textarea class="input" name="remarks" rows="3" required></textarea></label>
          </div>`, 'Reject report', { form: 'verification-reject', id });
        return;
      }
      case 'verification-link-incident': {
        const [{ report }, { incidents }] = await Promise.all([api(`/api/reports/${id}`), api('/api/incidents')]);
        if (!incidents.length) throw new Error('Create an incident before linking this report.');
        openDialog(`Link ${report.report_code} to an incident`, `
          <div class="form-stack">
            <label>Incident<select class="input" name="incident_id" required>${incidents.map((incident) => `<option value="${incident.id}">${escapeHtml(incident.incident_code)} — ${escapeHtml(incident.title)}</option>`).join('')}</select></label>
            <label class="wide-field">Remarks<textarea class="input" name="remarks" rows="3"></textarea></label>
          </div>`, 'Link report', { form: 'verification-link-incident', id });
        return;
      }
      case 'admin-outage-view':
        state.adminOutageView = value;
        await render();
        return;
      case 'filter-admin-notifications':
        state.adminNotificationFilter = value;
        state.adminNotificationPage = 1;
        await render();
        return;
      case 'filter-admin-users':
        state.adminUserGroup = value;
        state.adminUserPage = 1;
        await render();
        return;
      case 'admin-user-page':
        state.adminUserPage = Math.max(1, Number(value || 1));
        await render();
        return;
      case 'admin-notification-page':
        state.adminNotificationPage = Math.max(1, Number(value || 1));
        await render();
        return;
      case 'admin-settings-tab':
        state.adminSettingsTab = value;
        await render();
        return;
      case 'toggle-outage-category': {
        const inactiveTypes = new Set(state.config.inactive_outage_types || []);
        if (inactiveTypes.has(value)) inactiveTypes.delete(value);
        else inactiveTypes.add(value);
        await send('/api/admin/settings', 'PUT', { key: 'inactive_outage_types', value: [...inactiveTypes] });
        await render();
        setToast(`${value} ${inactiveTypes.has(value) ? 'deactivated' : 'activated'}.`);
        return;
      }
      case 'new-notification':
        openDialog('Create notification', `
          <div class="form-stack">
            <label>Title<input class="input" name="title" maxlength="120" required></label>
            <label class="wide-field">Message<textarea class="input" name="message" maxlength="1000" rows="4" required></textarea></label>
            <label>Type<select class="input" name="type"><option value="general">General</option><option value="incident">Incident</option><option value="scheduled">Scheduled outage</option><option value="announcement">Announcement</option><option value="report">Report</option><option value="system">System</option></select></label>
            <label>Audience<select class="input" name="audience"><option value="all">All active users</option><option value="resident">Residents</option><option value="staff">Staff</option></select></label>
          </div>`, 'Send notification', { form: 'admin-notification' });
        return;
      case 'view-admin-notification': {
        const notice = (state.adminNotifications || []).find((item) => String(item.id) === String(id));
        if (!notice) return;
        openDialog(notice.title, `<p>${escapeHtml(notice.message)}</p><p class="muted small">${escapeHtml(formatDateTime(notice.created_at))}</p>`, 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      }
      case 'toggle-admin-notification':
        await send(`/api/notifications/${id}`, 'PUT', { read: value === 'read' });
        await refreshUnread();
        await render();
        return;
      case 'audit-page':
        state.auditPage = Math.max(1, Number(value));
        await render();
        return;
      case 'reset-audit-filters':
        state.filters = { ...state.filters, auditSearch: '', auditFrom: '', auditTo: '' };
        state.auditPage = 1;
        await render();
        return;
      case 'export-audit-logs': {
        const filters = { q: state.filters.auditSearch, from: state.filters.auditFrom, to: state.filters.auditTo };
        const firstPage = await api(`/api/admin/audit-logs${query({ ...filters, limit: 5000, offset: 0 })}`);
        const logs = [...firstPage.logs];
        for (let offset = logs.length; offset < firstPage.total; offset += 5000) {
          const next = await api(`/api/admin/audit-logs${query({ ...filters, limit: 5000, offset })}`);
          logs.push(...next.logs);
        }
        const rows = [['Date & Time', 'User', 'Action', 'Module', 'IP Address']];
        logs.forEach((log) => rows.push([formatDateTime(log.created_at), log.user_name, log.action, auditModuleName(log.action), log.ip_address]));
        const csv = rows.map((row) => row.map((item) => `"${String(item ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `powerwatch-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setToast(`Exported ${logs.length} audit log${logs.length === 1 ? '' : 's'}.`);
        return;
      }
      case 'reset-audit-filters':
        state.filters = { ...state.filters, auditSearch: '', auditFrom: '', auditTo: '' };
        state.auditPage = 1;
        await render();
        return;
      case 'export-audit-logs': {
        const filters = { q: state.filters.auditSearch, from: state.filters.auditFrom, to: state.filters.auditTo };
        const firstPage = await api(`/api/admin/audit-logs${query({ ...filters, limit: 5000, offset: 0 })}`);
        const logs = [...firstPage.logs];
        for (let offset = logs.length; offset < firstPage.total; offset += 5000) {
          const next = await api(`/api/admin/audit-logs${query({ ...filters, limit: 5000, offset })}`);
          logs.push(...next.logs);
        }
        const rows = [['Date & Time', 'User', 'Action', 'Module', 'IP Address']];
        logs.forEach((log) => rows.push([
          formatDateTime(log.created_at), log.user_name, log.action, auditModuleName(log.action), log.ip_address,
        ]));
        const csv = rows.map((row) => row.map((item) => `"${String(item ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `powerwatch-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setToast(`Exported ${logs.length} audit log${logs.length === 1 ? '' : 's'}.`);
        return;
      }
      case 'add-list-row': {
        const list = actionButton.closest('.list-editor');
        const input = list.querySelector('[data-list-new]');
        const value2 = input.value.trim();
        if (!value2) return;
        list.insertAdjacentHTML('beforeend', `<div class="list-row"><input class="input" data-list-value="${escapeHtml(value2)}" value="${escapeHtml(value2)}"><button type="button" class="link-button danger" data-action="remove-list-row">Remove</button></div>`);
        input.value = '';
        return;
      }
      case 'remove-list-row':
        actionButton.closest('.list-row').remove();
        return;
      case 'save-list': {
        const list = document.querySelector(`[data-list-key="${actionButton.dataset.key}"]`);
        const values = [...list.querySelectorAll('[data-list-value]')].map((i) => i.value.trim()).filter(Boolean);
        await send('/api/admin/settings', 'PUT', { key: actionButton.dataset.key, value: values });
        await refreshConfig();
        setToast('List saved.');
        return;
      }
      case 'view-report': {
        const { report } = await api(`/api/reports/${id}`);
        openDialog(`Report ${report.report_code}`, `
          <div class="detail-grid">
            <div><span>Reporter</span><strong>${escapeHtml(report.reporter_name)}</strong></div>
            <div><span>Contact</span><strong>${escapeHtml(report.reporter_contact || report.reporter_email || 'â€”')}</strong></div>
            <div><span>Barangay</span><strong>${escapeHtml(report.barangay)}</strong></div>
            <div><span>Status</span><strong>${statusPill(report.status)}</strong></div>
            <div><span>Verification</span><strong>${statusPill(report.verification_status)}</strong></div>
            <div><span>Type</span><strong>${escapeHtml(report.possible_outage_type || 'â€”')}</strong></div>
            <div><span>Location</span><strong>${escapeHtml(report.location || 'â€”')}</strong></div>
            <div><span>Affected area</span><strong>${escapeHtml(report.affected_area || 'â€”')}</strong></div>
            <div><span>Noticed</span><strong>${escapeHtml(formatDateTime(report.date_time_noticed))}</strong></div>
            <div><span>Reported</span><strong>${escapeHtml(formatDateTime(report.reported_at))}</strong></div>
          </div>
          <div class="detail-block"><span>Description</span><p>${escapeHtml(report.description || 'â€”')}</p></div>
          ${report.remarks ? `<div class="detail-block"><span>Resident remarks</span><p>${escapeHtml(report.remarks)}</p></div>` : ''}
          ${report.staff_remarks ? `<div class="detail-block"><span>Staff remarks</span><p>${escapeHtml(report.staff_remarks)}</p></div>` : ''}
          ${hasCoordinates(report) ? `<div class="detail-block"><span>Coordinates</span><p class="mono">${escapeHtml(String(report.latitude))}, ${escapeHtml(String(report.longitude))}</p></div>` : ''}
          ${report.attachments?.length ? `<div class="detail-block"><span>Attachments (${report.attachments.length})</span><div class="staff-attachment-list">${report.attachments.map((attachment) => attachment.mime_type.startsWith('video/')
            ? `<video src="${escapeHtml(attachment.file_path)}" controls aria-label="${escapeHtml(attachment.original_name)}"></video>`
            : `<img src="${escapeHtml(attachment.file_path)}" alt="${escapeHtml(attachment.original_name)}">`).join('')}</div></div>`
            : report.photo_path ? `<div class="detail-block"><span>Photo evidence</span><img class="evidence-img" src="${escapeHtml(report.photo_path)}" alt="Report evidence"></div>` : ''}
          ${report.incident ? `<div class="detail-block"><span>Linked incident</span><p><strong>${escapeHtml(report.incident.incident_code)}</strong> â€” ${escapeHtml(report.incident.title)}</p></div>` : ''}
        `, 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      }
      case 'update-report-status': {
        const { report } = await api(`/api/reports/${id}`);
        const { statuses } = await api('/api/reports');
        const canOfficial = isOfficial();
        openDialog(`Update ${report.report_code}`, `
          <div class="form-stack">
            <label>Status<select class="input" name="status">
              ${statuses.filter((s) => canOfficial || s !== 'Officially Confirmed').map((s) => `<option ${report.status === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
            </select></label>
            ${canOfficial ? `<label>Official verification<select class="input" name="verify"><option value="">Use status above</option><option value="officially-confirmed">Mark officially confirmed</option></select></label>` : ''}
            <label class="wide-field">Staff remarks<textarea class="input" name="remarks" rows="3">${escapeHtml(report.staff_remarks || '')}</textarea></label>
          </div>`, 'Update status', { form: 'update-report-status', id });
        return;
      }
      case 'view-incident': {
        const { incident } = await api(`/api/incidents/${id}`);
        openDialog(`${incident.incident_code}`, `
          <div class="detail-grid">
            <div><span>Barangay</span><strong>${escapeHtml(incident.barangay)}</strong></div>
            <div><span>Status</span><strong>${statusPill(incident.status)}</strong></div>
            <div><span>Type</span><strong>${escapeHtml(incident.incident_type)}</strong></div>
            <div><span>Priority</span><strong>${escapeHtml(incident.priority || 'Medium')}</strong></div>
            <div><span>Started</span><strong>${escapeHtml(formatDateTime(incident.start_time))}</strong></div>
            <div><span>Duration</span><strong>${escapeHtml(incident.duration_display || 'Ongoing')}</strong></div>
            <div><span>Customers affected</span><strong>${escapeHtml(String(incident.customers_affected ?? 'â€”'))}</strong></div>
            <div><span>Restoration</span><strong>${incident.restoration_progress === null || incident.restoration_progress === undefined ? 'â€”' : `${escapeHtml(String(incident.restoration_progress))}%`}</strong></div>
          </div>
          <div class="detail-block"><span>Description</span><p>${escapeHtml(incident.description || 'â€”')}</p></div>
          ${incident.cause_category ? `<div class="detail-block"><span>Cause category</span><p>${escapeHtml(incident.cause_category)}</p></div>` : ''}
          ${incident.remarks ? `<div class="detail-block"><span>Remarks</span><p>${escapeHtml(incident.remarks)}</p></div>` : ''}
          ${incident.linked_reports?.length ? `<div class="detail-block"><span>Linked reports</span><ul class="plain-list">${incident.linked_reports.map((r) => `<li><strong>${escapeHtml(r.report_code)}</strong> â€” ${escapeHtml(r.barangay)} (${escapeHtml(r.status)})</li>`).join('')}</ul></div>` : ''}
        `, 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      }
      case 'update-incident-status': {
        const { incident } = await api(`/api/incidents/${id}`);
        const { statuses } = await api('/api/incidents');
        openDialog(`Update ${incident.incident_code}`, `
          <div class="form-stack">
            <label>Status<select class="input" name="status">${statuses.map((s) => `<option ${incident.status === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}</select></label>
            <label>Customers affected<input class="input" type="number" min="0" name="customers_affected" value="${incident.customers_affected ?? ''}"></label>
            <label>Restoration progress (%)<input class="input" type="number" min="0" max="100" name="restoration_progress" value="${incident.restoration_progress ?? ''}"></label>
            ${['Restored', 'Closed'].includes(incident.status) || true ? `<label>Restoration time<input class="input" type="datetime-local" name="restoration_time" value="${escapeHtml(toLocalInputValue(incident.end_time || new Date()))}"></label>` : ''}
            <label class="wide-field">Remarks<textarea class="input" name="remarks" rows="3">${escapeHtml(incident.remarks || '')}</textarea></label>
          </div>
        `, 'Update status', { form: 'update-incident-status', id });
        return;
      }
      case 'new-incident': {
        const { reports } = await api('/api/reports');
        const availableReports = reports.filter((report) => !report.incident_id && !['Rejected', 'Duplicate'].includes(report.status));
        const outageTypes = activeOutageTypes();
        const typeOptions = (outageTypes.length ? outageTypes : ['Power Outage']).map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('');
        const barangayOptions = state.barangays.map((barangay) => `<option value="${escapeHtml(barangay)}">${escapeHtml(barangay)}</option>`).join('');
        const barangayPicker = `<div class="incident-chip-picker" data-chip-label="barangay">
          <div class="incident-chip-list" data-chip-list></div>
          <div class="incident-chip-add-row"><select class="input" data-chip-select aria-label="Choose affected barangay"><option value="">Choose barangay</option>${barangayOptions}</select><button type="button" class="incident-add-button" data-action="add-incident-chip">+ Add Barangay</button></div>
          <input type="hidden" name="affected_barangays" data-chip-values value="[]">
          <input type="hidden" name="barangay" data-chip-primary value="">
        </div>`;
        const reportPicker = `<div class="incident-chip-picker" data-chip-label="report">
          <div class="incident-chip-list" data-chip-list></div>
          <div class="incident-chip-add-row"><select class="input" data-chip-select aria-label="Choose a related report"><option value="">Choose report</option>${availableReports.map((report) => `<option value="${report.id}" data-chip-label="${escapeHtml(report.report_code)}">${escapeHtml(report.report_code)} · ${escapeHtml(report.barangay)} · ${escapeHtml(report.status)}</option>`).join('')}</select><button type="button" class="incident-add-button" data-action="add-incident-chip">+ Add Report</button></div>
          <input type="hidden" name="related_report_ids" data-chip-values value="[]">
          ${availableReports.length ? '' : '<p class="incident-form-note">There are no unlinked reports available. Submit a report before creating an incident.</p>'}
        </div>`;
        openDialog('Create Incident', `
          <div class="create-incident-form">
            <div class="incident-create-fields">
              <label class="incident-create-field wide-field">Incident Title <span class="required-mark">*</span><input class="input" name="title" placeholder="Enter incident title" maxlength="160" required></label>
              <label class="incident-create-field wide-field">Date &amp; Time <span class="required-mark">*</span><input class="input" type="datetime-local" name="start_time" value="${escapeHtml(toLocalInputValue(new Date()))}" required></label>
              <div class="incident-create-field wide-field"><span class="incident-field-label">Affected Barangays <span class="required-mark">*</span></span>${barangayPicker}</div>
              <label class="incident-create-field wide-field">Incident Type <span class="required-mark">*</span><select class="input" name="outage_type" required><option value="">Choose incident type</option>${typeOptions}</select></label>
              <label class="incident-create-field wide-field">Description <span class="required-mark">*</span><textarea class="input" name="description" rows="3" placeholder="Describe the incident" maxlength="3000" required></textarea></label>
              <label class="incident-create-field">Priority <span class="required-mark">*</span><select class="input" name="priority" required><option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option></select></label>
              <div class="incident-create-field wide-field"><span class="incident-field-label">Related Reports <span class="required-mark">*</span></span>${reportPicker}</div>
            </div>
            <details class="incident-advanced-fields"><summary>Additional incident details</summary>
              <div class="incident-create-fields incident-advanced-grid">
                <label class="incident-create-field">Incident Category<select class="input" name="incident_type"><option>Unexpected</option><option>Scheduled</option></select></label>
                <label class="incident-create-field">Initial Status<select class="input" name="initial_status">${['Reported', 'Under Verification', 'Verified', 'Ongoing'].map((status) => `<option>${escapeHtml(status)}</option>`).join('')}</select></label>
                <label class="incident-create-field">Location<input class="input" name="location" placeholder="Street or landmark"></label>
                <label class="incident-create-field">Affected Area<input class="input" name="affected_area" placeholder="Purok, sitio, or coverage area"></label>
                <label class="incident-create-field">Customers Affected<input class="input" type="number" min="0" step="1" name="customers_affected"></label>
                <label class="incident-create-field">Restoration Progress (%)<input class="input" type="number" min="0" max="100" step="1" name="restoration_progress" value="0"></label>
                <label class="incident-create-field">Latitude<input class="input" type="number" step="any" name="latitude" placeholder="e.g. 7.906"></label>
                <label class="incident-create-field">Longitude<input class="input" type="number" step="any" name="longitude" placeholder="e.g. 125.094"></label>
                ${isOfficial() ? `<label class="incident-create-field">Cause Category<select class="input" name="cause_category"><option value="">Not specified</option>${(state.config.incident_categories || []).map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}</select></label>
                <label class="incident-create-field">Estimated Restoration<input class="input" type="datetime-local" name="estimated_restoration"></label>` : ''}
              </div>
            </details>
          </div>
        `, 'Create Incident', { form: 'new-incident' });
        return;
      }
      case 'link-report': {
        const { reports } = await api('/api/reports?status=Submitted');
        openDialog('Link a report to this incident', `
          <div class="form-stack">
            <label>Report<select class="input" name="report_id" required><option value="">Choose report</option>${reports.map((r) => `<option value="${r.id}">${escapeHtml(r.report_code)} â€” ${escapeHtml(r.barangay)}</option>`).join('')}</select></label>
            <label class="wide-field">Remarks<textarea class="input" name="remarks" rows="2"></textarea></label>
          `, 'Link report', { form: 'link-report', id });
        return;
      }
      case 'new-schedule':
        openDialog('New scheduled outage', `
          <div class="form-stack">
            <label>Title<input class="input" name="title" required></label>
            <label>Barangay<select class="input" name="barangay" required><option value="">Choose</option>${state.barangays.map((b) => `<option>${escapeHtml(b)}</option>`).join('')}</select></label>
            <label>Area<input class="input" name="area"></label>
            <label>Date<input class="input" type="date" name="outage_date" value="${escapeHtml(toLocalInputValue(new Date()).slice(0, 10))}" required></label>
            <label>Start time<input class="input" type="time" name="start_time" value="08:00" required></label>
            <label>Expected end time<input class="input" type="time" name="expected_end_time" value="15:00"></label>
            <label class="wide-field">Reason<textarea class="input" name="reason" rows="2"></textarea></label>
          `, 'Create schedule', { form: 'new-schedule' });
        return;
      case 'edit-schedule': {
        const { scheduled } = await api(`/api/scheduled/${id}`);
        openDialog(`Edit ${scheduled.schedule_code}`, `
          <div class="form-stack">
            <label>Title<input class="input" name="title" value="${escapeHtml(scheduled.title)}" required></label>
            <label>Barangay<select class="input" name="barangay">${state.barangays.map((b) => `<option ${scheduled.barangay === b ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')}</select></label>
            <label>Area<input class="input" name="area" value="${escapeHtml(scheduled.area || '')}"></label>
            <label>Date<input class="input" type="date" name="outage_date" value="${escapeHtml(scheduled.outage_date)}" required></label>
            <label>Start time<input class="input" type="time" name="start_time" value="${escapeHtml(String(scheduled.start_time || '').slice(0, 5))}" required></label>
            <label>Expected end time<input class="input" type="time" name="expected_end_time" value="${escapeHtml(String(scheduled.expected_end_time || '').slice(0, 5))}"></label>
            <label class="wide-field">Reason<textarea class="input" name="reason" rows="2">${escapeHtml(scheduled.reason || '')}</textarea></label>
          `, 'Save changes', { form: 'edit-schedule', id });
        return;
      }
      case 'update-schedule-status': {
        const { scheduled } = await api(`/api/scheduled/${id}`);
        const { statuses } = await api('/api/scheduled');
        openDialog(`Status for ${scheduled.schedule_code}`, `
          <div class="form-stack">
            <label>Status<select class="input" name="status">${statuses.map((s) => `<option ${scheduled.status === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}</select></label>
            <label class="wide-field">Reason / note<textarea class="input" name="reason" rows="2"></textarea></label>
          `, 'Update status', { form: 'update-schedule-status', id });
        return;
      }
      case 'trigger-incident':
        if (!window.confirm('Start this scheduled outage now and monitor it as an active incident?')) return;
        await send(`/api/scheduled/${id}/trigger-incident`, 'POST');
        setToast('Scheduled outage started as an incident.');
        await render();
        return;
      case 'new-announcement':
        openDialog('New announcement', `
          <div class="form-stack">
            <label>Title<input class="input" name="title" required></label>
            <label>Category<select class="input" name="category">${(state.config.announcement_categories || []).map((c) => `<option>${escapeHtml(c)}</option>`).join('')}</select></label>
            <label class="wide-field">Content<textarea class="input" name="content" rows="5" required></textarea></label>
            <label class="checkbox-field"><input type="checkbox" name="publish" checked> Publish immediately and notify all users</label>
          `, 'Save announcement', { form: 'new-announcement' });
        return;
      case 'edit-announcement': {
        const { announcement } = await api(`/api/announcements/${id}`);
        openDialog('Edit announcement', `
          <div class="form-stack">
            <label>Title<input class="input" name="title" value="${escapeHtml(announcement.title)}" required></label>
            <label>Category<select class="input" name="category">${(state.config.announcement_categories || []).map((c) => `<option ${announcement.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select></label>
            <label class="wide-field">Content<textarea class="input" name="content" rows="5" required>${escapeHtml(announcement.content)}</textarea></label>
          `, 'Save changes', { form: 'edit-announcement', id });
        return;
      }
      case 'announcement-status':
        await send(`/api/announcements/${id}/status`, 'PUT', { status: value });
        setToast('Announcement status updated.');
        await render();
        return;
      case 'delete-announcement':
        if (!window.confirm('Delete this announcement permanently?')) return;
        await send(`/api/announcements/${id}`, 'DELETE');
        setToast('Announcement deleted.');
        await render();
        return;
      case 'new-user':
        openDialog('Add account', `
          <div class="form-stack">
            <label>Full name<input class="input" name="full_name" required></label>
            <label>Email<input class="input" type="email" name="email" required></label>
            <label>Contact number<input class="input" name="contact_number"></label>
            <label>Address<input class="input" name="address"></label>
            <label>Barangay<select class="input" name="barangay"><option value="">None</option>${state.barangays.map((b) => `<option>${escapeHtml(b)}</option>`).join('')}</select></label>
            <label>Role<select class="input" name="role">${STAFF_ROLES.map((r) => `<option value="${r}">${escapeHtml(roleLabel(r))}</option>`).join('')}<option value="resident">Resident</option></select></label>
            <label>Password<input class="input" type="password" name="password" minlength="6" required></label>
          `, 'Create account', { form: 'new-user' });
        return;
      case 'view-user': {
        const { users } = await api('/api/admin/users?status=all');
        const user = users.find((row) => String(row.id) === String(id));
        if (!user) throw new Error('User not found.');
        openDialog(user.full_name, `
          <div class="detail-grid">
            <div><span>Email</span><strong>${escapeHtml(user.email)}</strong></div>
            <div><span>Role</span><strong>${escapeHtml(roleLabel(user.role))}</strong></div>
            <div><span>Status</span><strong>${statusPill(user.status)}</strong></div>
            <div><span>Barangay</span><strong>${escapeHtml(user.barangay || '—')}</strong></div>
            <div><span>Contact</span><strong>${escapeHtml(user.contact_number || '—')}</strong></div>
            <div><span>Last login</span><strong>${escapeHtml(formatDateTime(user.last_login))}</strong></div>
            <div class="wide-field"><span>Address</span><strong>${escapeHtml(user.address || '—')}</strong></div>
          </div>`, 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      }
      case 'edit-user': {
        const { users } = await api('/api/admin/users?status=all');
        const user = users.find((u) => String(u.id) === String(id));
        if (!user) throw new Error('User not found.');
        openDialog(`Edit ${user.full_name}`, `
          <div class="form-stack">
            <label>Full name<input class="input" name="full_name" value="${escapeHtml(user.full_name)}" required></label>
            <label>Email<input class="input" type="email" name="email" value="${escapeHtml(user.email)}" required></label>
            <label>Contact number<input class="input" name="contact_number" value="${escapeHtml(user.contact_number || '')}"></label>
            <label>Address<input class="input" name="address" value="${escapeHtml(user.address || '')}"></label>
            <label>Barangay<select class="input" name="barangay"><option value="">None</option>${state.barangays.map((b) => `<option ${user.barangay === b ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')}</select></label>
          `, 'Save changes', { form: 'edit-user', id });
        return;
      }
      case 'change-role': {
        const { users, roles } = await api('/api/admin/users?status=all');
        const user = users.find((u) => String(u.id) === String(id));
        if (!user) throw new Error('User not found.');
        openDialog(`Role for ${user.full_name}`, `
          <div class="form-stack">
            <label>Role<select class="input" name="role">${Object.entries(roles).map(([k, v]) => `<option value="${k}" ${user.role === k ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('')}</select></label>
          `, 'Update role', { form: 'change-role', id });
        return;
      }
      case 'reset-password':
        openDialog('Reset account password', `
          <div class="form-stack">
            <label>New password<input class="input" type="password" name="new_password" minlength="6" required></label>
          `, 'Reset password', { form: 'reset-password', id });
        return;
      case 'toggle-user-status':
        await send(`/api/admin/users/${id}/status`, 'PUT', { status: value });
        setToast(`Account ${value === 'Active' ? 'activated' : 'deactivated'}.`);
        await render();
        return;
      case 'delete-user':
        if (!window.confirm('Delete this account? Historical reports will be kept.')) return;
        await send(`/api/admin/users/${id}`, 'DELETE');
        setToast('Account deleted.');
        await render();
        return;
      case 'new-barangay':
        openDialog('Add barangay', `
          <div class="form-stack">
            <label>Name<input class="input" name="name" required></label>
            <label>Population<input class="input" type="number" min="0" name="population"></label>
            <label>Latitude<input class="input" type="number" step="any" name="latitude"></label>
            <label>Longitude<input class="input" type="number" step="any" name="longitude"></label>
            <label class="wide-field">Coverage description<textarea class="input" name="area_description" rows="2"></textarea></label>
          `, 'Add barangay', { form: 'new-barangay' });
        return;
      case 'view-barangay': {
        const { barangays } = await api('/api/admin/barangays');
        const barangay = barangays.find((row) => String(row.id) === String(id));
        if (!barangay) throw new Error('Barangay not found.');
        openDialog(barangay.name, `
          <div class="detail-grid">
            <div><span>Population</span><strong>${escapeHtml(String(barangay.population ?? '—'))}</strong></div>
            <div><span>Reports</span><strong>${escapeHtml(String(barangay.report_count))}</strong></div>
            <div><span>Assigned personnel</span><strong>${escapeHtml(String(barangay.personnel_count))}</strong></div>
            <div><span>Status</span><strong>${statusPill(barangay.status)}</strong></div>
            <div><span>Coordinates</span><strong>${hasCoordinates(barangay) ? `${escapeHtml(String(barangay.latitude))}, ${escapeHtml(String(barangay.longitude))}` : 'Not set'}</strong></div>
            <div class="wide-field"><span>Coverage</span><strong>${escapeHtml(barangay.area_description || 'No coverage description')}</strong></div>
          </div>`, 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      }
      case 'edit-barangay': {
        const { barangays } = await api('/api/admin/barangays');
        const row = barangays.find((b) => String(b.id) === String(id));
        if (!row) throw new Error('Barangay not found.');
        openDialog(`Edit ${row.name}`, `
          <div class="form-stack">
            <label>Name<input class="input" name="name" value="${escapeHtml(row.name)}" required></label>
            <label>Population<input class="input" type="number" min="0" name="population" value="${row.population ?? ''}"></label>
            <label>Latitude<input class="input" type="number" step="any" name="latitude" value="${row.latitude ?? ''}"></label>
            <label>Longitude<input class="input" type="number" step="any" name="longitude" value="${row.longitude ?? ''}"></label>
            <label class="wide-field">Coverage description<textarea class="input" name="area_description" rows="2">${escapeHtml(row.area_description || '')}</textarea></label>
          </div>`, 'Save barangay', { form: 'edit-barangay', id });
        return;
      }
      case 'toggle-barangay-status':
        await send(`/api/admin/barangays/${id}`, 'PUT', { status: value });
        await refreshConfig();
        setToast(`Barangay ${value === 'Active' ? 'activated' : 'deactivated'}.`);
        await render();
        return;
      case 'backup':
        window.location.assign('/api/admin/backup');
        return;
      case 'seed-reset':
        if (!window.confirm('Reset demonstration data? Existing demo records will be removed.')) return;
        await send('/api/admin/maintenance/seed', 'POST');
        state.user = null;
        renderLogin('Demonstration data was reset. Sign in again to continue.');
        return;
      default:
        return;
    }
  } catch (error) {
    if (error.status === 401) {
      state.user = null;
      renderLogin('Your session expired. Sign in again to continue.');
      return;
    }
    setToast(error.message);
  }
}

async function afterLogin() {
  await refreshConfig();
  await refreshUnread();
  state.page = 'dashboard';
  state.mobileTab = 'home';
  try {
    await render();
  } catch (error) {
    renderLogin(error.message || 'Could not load the application.');
  }
}

async function boot() {
  try {
    const demo = await fetch('/api/auth/demo').then((r) => (r.ok ? r.json() : { demos: [], barangays: [] }));
    state.demos = demo.demos || [];
    state.barangays = demo.barangays || [];
    state.oauthProviders = demo.oauthProviders || {};
    state.passwordRecoveryEnabled = Boolean(demo.passwordRecoveryEnabled);

    const queryParams = new URLSearchParams(window.location.search);
    const resetToken = queryParams.get('reset');
    if (resetToken) {
      renderResetPassword(resetToken);
      return;
    }
    const authError = queryParams.get('auth_error');
    if (authError) {
      const messages = {
        'invalid-oauth-state': 'Sign-in link expired. Please try again.',
        'unverified-email': 'The provider did not return a verified email address.',
        'inactive-account': 'This account is deactivated. Contact the administrator.',
        'provider-account-role': 'Social sign-in is available for resident accounts only.',
        'provider-denied': 'Sign-in was cancelled.',
      };
      window.history.replaceState({}, '', '/community');
      state.mobileAuthScreen = 'login';
      renderLogin(messages[authError] || 'Could not sign in with that provider. Please try again.');
      return;
    }

    const { user } = await api('/api/auth/me');
    state.user = user;
    await refreshConfig();
    await refreshUnread();
    await render();
  } catch (error) {
    if (error.status === 401) {
      state.user = null;
      if (IS_ADMIN) renderLogin();
      else renderWelcomeScreen();
      return;
    }
    state.bootError = error.message;
    app.innerHTML = `<main class="login-page"><section class="login-panel"><div class="login-content">
      <h1>Cannot reach the server</h1>
      <p class="login-intro">${escapeHtml(error.message)}</p>
      <p class="muted">Make sure the Node.js server is running, then reload this page.</p>
      <button class="button primary full" data-action="reload">Reload</button>
    </div></section></main>`;
  }
}

document.addEventListener('click', async (event) => {
  if (event.target.closest('[data-action="reload"]')) {
    window.location.reload();
    return;
  }
  if (event.target.closest('[data-action="back-login"]')) {
    state.mobileAuthScreen = 'login';
    renderLogin();
    return;
  }
  await handleClick(event);
});

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const button = form.querySelector('[type="submit"]');
  if (button) button.disabled = true;
  try {
    await submitForm(form);
  } catch (error) {
    if (error.status === 401) {
      state.user = null;
      renderLogin('Your session expired. Sign in again to continue.');
    } else {
      setToast(error.message);
    }
  } finally {
    if (button && button.isConnected) button.disabled = false;
  }
});

let filterTimer = null;
document.addEventListener('input', (event) => {
  const el = event.target;
  if (el.matches('[data-location-search]')) {
    const barangay = state.barangayLocations.find((item) => item.name.toLowerCase() === el.value.trim().toLowerCase());
    if (barangay && hasCoordinates(barangay) && state.reportLocationMap) {
      state.reportLocationMap.setView([Number(barangay.latitude), Number(barangay.longitude)], 14);
    }
  }
  if (el.dataset && el.dataset.filter) {
    const filterName = el.dataset.filter;
    const filterValue = el.value;
    const restoreSearchFocus = el.type === 'search';
    const searchPosition = restoreSearchFocus ? el.selectionStart : null;
    clearTimeout(filterTimer);
    filterTimer = setTimeout(async () => {
      state.filters[filterName] = filterValue;
      if (String(filterName).startsWith('report')) state.reportPage = 1;
      if (String(filterName).startsWith('sched')) state.scheduledPage = 1;
      if (String(filterName).startsWith('adminNotification')) state.adminNotificationPage = 1;
      if (String(filterName).startsWith('user')) state.adminUserPage = 1;
      if (String(filterName).startsWith('barangay')) state.barangayPage = 1;
      if (String(filterName).startsWith('audit')) state.auditPage = 1;
      if (IS_COMMUNITY) await goToTab(state.mobileTab);
      else await goToPage(state.page);
      if (restoreSearchFocus) {
        const replacement = document.querySelector(`[data-filter="${filterName}"]`);
        if (replacement) {
          replacement.focus({ preventScroll: true });
          if (Number.isInteger(searchPosition)) replacement.setSelectionRange(searchPosition, searchPosition);
        }
      }
    }, 350);
  }
  if (el.dataset && el.dataset.range) {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      state.analyticsRange[el.dataset.range] = el.value;
      goToPage('analytics');
    }, 350);
  }
  if (el.matches('form[data-form="report"] input[name="photo"]')) {
    const file = el.files && el.files[0];
    const preview = document.getElementById('resident-evidence-preview');
    if (!preview) return;
    if (!file) {
      preview.innerHTML = '';
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      el.value = '';
      preview.innerHTML = '';
      setToast('Choose a JPG, PNG, or WebP photo.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      el.value = '';
      preview.innerHTML = '';
      setToast('Photo must be 4 MB or smaller.');
      return;
    }
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${escapeHtml(url)}" alt="Selected report evidence"><span>${escapeHtml(file.name)}</span>`;
  }
});

document.addEventListener('change', (event) => {
  const el = event.target;
  if (el.matches('[data-audit-page-size]')) {
    state.auditPageSize = Number(el.value);
    state.auditPage = 1;
    goToPage('audit');
    return;
  }
  if (el.dataset && el.dataset.filter && el.tagName === 'SELECT') {
    state.filters[el.dataset.filter] = el.value;
    if (String(el.dataset.filter).startsWith('report')) state.reportPage = 1;
    if (String(el.dataset.filter).startsWith('sched')) state.scheduledPage = 1;
    if (String(el.dataset.filter).startsWith('user')) state.adminUserPage = 1;
    if (String(el.dataset.filter).startsWith('barangay')) state.barangayPage = 1;
    if (IS_COMMUNITY) goToTab(state.mobileTab);
    else goToPage(state.page);
  }
});

boot();
