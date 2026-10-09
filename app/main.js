/* Authentication screens, router, actions, and boot */

let deferredPwaInstallPrompt = null;
const COMMUNITY_LOGIN_IDENTIFIER_KEY = 'powerwatch.community.login-identifier';

function readCommunityLoginIdentifier() {
  if (!IS_COMMUNITY) return '';
  try {
    return localStorage.getItem(COMMUNITY_LOGIN_IDENTIFIER_KEY) || '';
  } catch {
    return '';
  }
}

function saveCommunityLoginIdentifier(identifier, remember) {
  if (!IS_COMMUNITY) return;
  try {
    const value = String(identifier || '').trim();
    if (remember && value) localStorage.setItem(COMMUNITY_LOGIN_IDENTIFIER_KEY, value);
    else localStorage.removeItem(COMMUNITY_LOGIN_IDENTIFIER_KEY);
  } catch {
    return;
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPwaInstallPrompt = event;
  document.documentElement.classList.add('pwa-install-available');
});

window.addEventListener('appinstalled', () => {
  deferredPwaInstallPrompt = null;
  document.documentElement.classList.add('pwa-installed');
  document.querySelectorAll('.mobile-install-button, .mobile-install-cta').forEach((button) => button.remove());
});

function renderWelcomeScreen() {
  app.innerHTML = `<main class="mobile-welcome">
    <div class="mobile-theme-toolbar mobile-theme-toolbar-welcome">${mobileThemeToggle()}</div>
    <div class="mobile-welcome-brand"><img class="welcome-logo" src="/assets/powerwatch-logo.svg" alt="Valencia PowerWatch logo"><h1>Valencia</h1><strong>PowerWatch</strong></div>
    <p>Community Power Interruption Reporting, Verification, and Information Management System for Valencia City, Bukidnon</p>
    <button class="button primary mobile-welcome-start" type="button" data-action="get-started">Get Started <span aria-hidden="true">→</span></button>
    ${mobileInstallButton()}
    <div class="toast" role="status" hidden></div>
  </main>`;
}

function renderLogin(message = '', loginIdentifier = null, rememberIdentifier = null) {
  if (IS_COMMUNITY) {
    if (state.mobileAuthScreen === 'register') return renderRegister();
    const rememberedIdentifier = loginIdentifier ?? readCommunityLoginIdentifier();
    const shouldRememberIdentifier = rememberIdentifier ?? true;
    app.innerHTML = `<main class="mobile-auth-page">
      <section class="mobile-auth-content">
        <div class="mobile-theme-toolbar">${mobileThemeToggle()}</div>
        <div class="mobile-auth-brand"><img class="auth-brand-logo" src="/assets/powerwatch-logo.svg" alt=""><div><strong>Valencia</strong><b>PowerWatch</b></div></div>
        <h1>Welcome back</h1>
        <p>Sign in to report interruptions and stay updated.</p>
        ${message ? `<div class="inline-alert">${escapeHtml(message)}</div>` : ''}
        <form class="mobile-auth-form" data-form="login">
          <label>Email or mobile number<input name="email" type="text" value="${escapeHtml(rememberedIdentifier)}" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" required></label>
          <label>Password<span class="mobile-password-field"><input name="password" type="password" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" required><button type="button" data-action="toggle-password" aria-label="Show password">&#9673;</button></span></label>
          <div class="auth-options-row"><label><input type="checkbox" name="remember" ${shouldRememberIdentifier ? 'checked' : ''}> Remember me</label><button type="button" data-action="forgot-password">Forgot Password?</button></div>
          <button class="button primary mobile-auth-submit" type="submit">Login</button>
        </form>
        ${mobileInstallButton()}
        <div class="auth-divider"><span>or continue with</span></div>
        <div class="social-row">
          <button type="button" class="social-btn social-google-btn" data-action="start-oauth" data-provider="google" title="Continue with Google">
            <svg class="social-icon-svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Google</span>
          </button>
          <button type="button" class="social-btn social-facebook-btn" data-action="start-oauth" data-provider="facebook" title="Continue with Facebook">
            <svg class="social-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="#1877F2" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Facebook</span>
          </button>
        </div>
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
      <p class="portal-name">Admin Web Portal</p>
      <p class="art-slogan">Together for a Brighter and<br>Safer Valencia</p>
    </aside>
    <section class="login-panel">
      <div class="login-content">
        <h1>Welcome Back!</h1>
        <p class="login-intro">Sign in to your Valencia PowerWatch account.</p>
        ${message ? `<div class="inline-alert">${escapeHtml(message)}</div>` : ''}
        <form class="form-stack" data-form="login">
          <label>Username, Email, or Mobile Number<input name="email" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" required></label>
          <label>Password<span class="password-control"><input name="password" type="password" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="current-password" required><button type="button" data-action="toggle-password" aria-label="Show password">&#9673;</button></span></label>
          <div class="admin-login-options"><label><input type="checkbox" name="remember" checked> Remember me</label><button type="button" data-action="forgot-password">Forgot password?</button></div>
          <button class="button primary full" type="submit">Login</button>
        </form>
        <div style="margin-top:14px;padding:10px 12px;background:#f0f9ff;border:1px dashed #0284c7;border-radius:8px;font-size:0.8rem;color:#0369a1;">
          <div style="font-weight:700;margin-bottom:4px;">🔑 Quick Admin Sign-In:</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
            <button type="button" class="button ghost small" data-action="autofill-admin-login" data-user="DELMARKEL2003" data-pass="ADMIN2023*" style="font-size:0.75rem;padding:4px 8px;cursor:pointer;">👑 Sign in as Delmarkel</button>
            <button type="button" class="button ghost small" data-action="autofill-admin-login" data-user="admin@powerwatch.ph" data-pass="admin123" style="font-size:0.75rem;padding:4px 8px;cursor:pointer;">⚡ Sign in as Demo Admin</button>
          </div>
        </div>
        <div class="auth-divider" style="margin: 16px 0;"><span>or continue with</span></div>
        <div class="social-row">
          <button type="button" class="social-btn social-google-btn" data-action="start-oauth" data-provider="google" title="Continue with Google">
            <svg class="social-icon-svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Google</span>
          </button>
          <button type="button" class="social-btn social-facebook-btn" data-action="start-oauth" data-provider="facebook" title="Continue with Facebook">
            <svg class="social-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="#1877F2" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Facebook</span>
          </button>
        </div>
      </div>
      <footer class="login-footer">&copy; ${new Date().getFullYear()} Valencia PowerWatch. All rights reserved.</footer>
      <div class="toast" role="status" hidden></div>
    </section>
  </main>`;
}

function renderAdminRestrictedAccess() {
  app.innerHTML = `<main class="login-page">
    <aside class="login-art admin-login-art">
      <div class="admin-art-brand"><img src="/assets/powerwatch-logo.svg" alt=""><div><strong>Valencia</strong><b>PowerWatch</b></div></div>
      <p class="portal-name">Admin Web Portal</p>
      <p class="art-slogan">Access Restricted</p>
    </aside>
    <section class="login-panel">
      <div class="login-content" style="text-align:center;max-width:440px;">
        <div style="font-size:2.8rem;margin-bottom:8px;">🛡️</div>
        <h1 style="font-size:1.4rem;margin-bottom:8px;">Admin Access Required</h1>
        <p class="login-intro" style="margin-bottom:12px;">You are currently signed in as <strong>${escapeHtml(state.user?.full_name || 'another account')}</strong> (${escapeHtml(roleLabel(state.user?.role || 'resident'))}).</p>
        <div style="padding:14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;color:#991b1b;font-size:0.85rem;line-height:1.5;margin-bottom:20px;text-align:left;">
          ⚠️ <strong>Notice:</strong> This Admin Portal is restricted to administrator accounts. Staff and residents must use their own separate portals.
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button class="button primary full" type="button" data-action="logout">Sign out and use an Admin account</button>
          <a href="${state.user?.role === 'personnel' ? '/staff' : '/community'}" class="button ghost full" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
            <span>Open your role's portal</span> &rarr;
          </a>
        </div>
      </div>
      <footer class="login-footer">&copy; ${new Date().getFullYear()} Valencia PowerWatch. All rights reserved.</footer>
    </section>
  </main>`;
}

function renderForgotPassword(message = '') {
  if (IS_ADMIN) {
    app.innerHTML = `<main class="login-page">
      <aside class="login-art admin-login-art">
        <div class="admin-art-brand"><img src="/assets/powerwatch-logo.svg" alt=""><div><strong>Valencia</strong><b>PowerWatch</b></div></div>
        <p class="portal-name">Admin Web Portal</p>
        <p class="art-slogan">Together for a Brighter and<br>Safer Valencia</p>
      </aside>
      <section class="login-panel"><div class="login-content">
        <h1>Forgot password?</h1>
        <p class="login-intro">Enter your account email to request a secure reset link.</p>
        ${message ? `<div class="inline-alert">${escapeHtml(message)}</div>` : ''}
        <form class="form-stack" data-form="forgot-password">
          <label>Email address<input name="email" type="email" autocomplete="email" required></label>
          <button class="button primary full" type="submit" ${state.passwordRecoveryEnabled ? '' : 'disabled'}>Send reset link</button>
          <button class="button secondary full" type="button" data-action="back-login">Back to sign in</button>
        </form>
        ${state.passwordRecoveryEnabled ? '' : '<p class="auth-configuration-note">Email recovery is unavailable until SMTP is configured on the server.</p>'}
      </div><footer class="login-footer">© ${new Date().getFullYear()} Valencia PowerWatch. All rights reserved.</footer></section>
      <div class="toast" role="status" hidden></div>
    </main>`;
    return;
  }
  app.innerHTML = `<main class="mobile-auth-page">
    <header class="mobile-auth-header"><button type="button" class="mobile-auth-back" data-action="back-login" aria-label="Back to login">&#8249;</button><span>Valencia PowerWatch</span>${IS_COMMUNITY ? mobileThemeToggle() : ''}</header>
    <section class="mobile-auth-content">
      <h1>Forgot Password?</h1>
      <p>Enter your account email and we will send a secure reset link.</p>
      ${message ? `<div class="inline-alert">${escapeHtml(message)}</div>` : ''}
      <form class="mobile-auth-form" data-form="forgot-password">
        <label>Email address<input name="email" type="email" autocomplete="email" required></label>
        <button class="button primary mobile-auth-submit" type="submit" ${state.passwordRecoveryEnabled ? '' : 'disabled'}>Send reset link</button>
      </form>
      ${state.passwordRecoveryEnabled ? '' : '<p class="auth-configuration-note">Email recovery is unavailable until SMTP is configured on the server.</p>'}
      <p class="mobile-auth-switch">Remember your password? <button type="button" data-action="back-login">Login</button></p>
    </section>
    <div class="toast" role="status" hidden></div>
  </main>`;
}

function renderResetPassword(token, message = '') {
  app.innerHTML = `<main class="mobile-auth-page">
    <header class="mobile-auth-header"><span>Valencia PowerWatch</span>${IS_COMMUNITY ? mobileThemeToggle() : ''}</header>
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
      <header class="mobile-auth-header"><button type="button" class="mobile-auth-back" data-action="back-login" aria-label="Back to login">&#8249;</button><span>Valencia PowerWatch</span>${mobileThemeToggle()}</header>
      <section class="mobile-auth-content">
        <h1>Create Account</h1>
        <p>Join Valencia PowerWatch to stay informed and report power interruptions.</p>
        ${message ? `<div class="inline-alert">${escapeHtml(message)}</div>` : ''}
        <form class="mobile-auth-form" data-form="register">
          <label>Full Name<input name="full_name" autocomplete="name" required></label>
          <label>Email Address<input name="email" type="email" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="email" required></label>
          <label>Mobile Number<input name="contact_number" type="tel" autocomplete="tel" placeholder="0917 123 4567"></label>
          <label>Home Barangay<select name="barangay"><option value="">Choose barangay</option>${state.barangays.map((b) => `<option>${escapeHtml(b)}</option>`).join('')}</select></label>
          <label>Password<span class="mobile-password-field"><input name="password" type="password" minlength="6" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="new-password" required><button type="button" data-action="toggle-password" aria-label="Show password">&#9673;</button></span></label>
          <label>Confirm Password<span class="mobile-password-field"><input name="confirm_password" type="password" minlength="6" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="new-password" required><button type="button" data-action="toggle-password" aria-label="Show password">&#9673;</button></span></label>
          <button class="button primary mobile-auth-submit" type="submit">Register</button>
        </form>
        ${mobileInstallButton()}
        <div class="auth-divider"><span>or sign up with</span></div>
        <div class="social-row">
          <button type="button" class="social-btn social-google-btn" data-action="start-oauth" data-provider="google" title="Register with Google">
            <svg class="social-icon-svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Google</span>
          </button>
          <button type="button" class="social-btn social-facebook-btn" data-action="start-oauth" data-provider="facebook" title="Register with Facebook">
            <svg class="social-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="#1877F2" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Facebook</span>
          </button>
        </div>
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
  reports: renderAdminUnifiedCases,
  verification: renderAdminVerification,
  dispatch: renderAdminDispatch,
  incidents: renderAdminIncidents,
  'outage-monitoring': renderAdminOutageMonitoring,
  scheduled: renderAdminScheduled,
  map: renderAdminMap,
  announcements: () => {
    state.page = 'notifications';
    state.adminNotificationSection = 'announcements';
    return renderAdminNotifications();
  },
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
  if (state.page !== page) window.scrollTo(0, 0);
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
  if (state.mobileTab !== tab) window.scrollTo(0, 0);
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

async function readAnnouncementImage(form) {
  const file = form.querySelector('[data-announcement-image]')?.files?.[0];
  if (!file) return null;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP announcement image.');
  if (file.size > 4 * 1024 * 1024) throw new Error('Announcement images must be 4 MB or smaller.');
  return readPhoto(file);
}

async function submitForm(form) {
  const type = form.dataset.form;
  if (!type) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const target = form;

  if (type === 'login') {
    saveCommunityLoginIdentifier(values.email, values.remember === 'on');
    const result = await send('/api/auth/login', 'POST', {
      email: values.email, password: values.password, remember: values.remember === 'on',
      portal: IS_COMMUNITY ? 'community' : 'admin',
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
    await send('/api/feedback', 'POST', { rating: Number(values.rating), feedback_text: values.comments, restoration_confirmed: 1 });
    setToast('Thank you for your feedback.');
    return;
  }
  if (type === 'citizen-report-feedback') {
    const reportId = form.dataset.reportId;
    const incidentId = form.dataset.incidentId || null;
    await send('/api/feedback', 'POST', {
      report_id: reportId ? Number(reportId) : null,
      incident_id: incidentId ? Number(incidentId) : null,
      rating: Number(values.rating || 5),
      restoration_confirmed: values.restoration_confirmed === '1' ? 1 : 0,
      feedback_text: values.feedback_text || '',
    });
    setToast(t('feedback_success', 'Thank you for your feedback!'));
    await render();
    return;
  }
  if (type === 'test-sms') {
    const result = await send('/api/sms/test', 'POST', {
      phone_number: values.phone_number,
      message: values.message,
    });
    setToast(result.simulated ? 'SMS simulated & logged in database (Demo mode)!' : 'SMS successfully dispatched via Semaphore!');
    await render();
    return;
  }
  if (type === 'assign-repair-crew') {
    const reportId = values.report_id ? Number(values.report_id) : null;
    const incidentId = values.incident_id ? Number(values.incident_id) : null;
    const teamId = Number(values.team_id);
    if (!teamId) throw new Error('Please select a repair crew to dispatch.');
    await send('/api/repair/assign', 'POST', {
      team_id: teamId,
      report_id: reportId,
      incident_id: incidentId,
      priority: values.priority || 'High',
      dispatch_notes: values.dispatch_notes || ''
    });
    closeDialog();
    setToast('🚀 Repair team successfully dispatched! Citizen notified via SMS & App.');
    await render();
    return;
  }
  if (type === 'report') {
    const reportFormData = new FormData();
    const reportValues = {
      location: values.location,
      latitude: values.latitude === '' ? null : Number(values.latitude),
      longitude: values.longitude === '' ? null : Number(values.longitude),
      location_source: values.location_source,
      location_accuracy_m: values.location_accuracy_m === '' ? null : Number(values.location_accuracy_m),
      barangay: values.barangay,
      purok: values.purok || values.affected_area || null,
      date_time_noticed: values.date_time_noticed ? new Date(values.date_time_noticed).toISOString() : null,
      description: values.description,
      affected_area: values.affected_area || values.purok || null,
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
    const formData = new FormData(target);
    const team_ids = formData.getAll('team_ids').map(Number);
    const barangay_names = formData.getAll('barangay_names').map(String);
    if (!team_ids.length) throw new Error('Select at least one assigned field team.');
    if (!barangay_names.length) throw new Error('Select at least one authorized barangay or operational area.');
    await send('/api/admin/users', 'POST', {
      full_name: values.full_name, email: values.email, contact_number: values.contact_number,
      address: values.address, role: values.role, password: values.password, team_ids, barangay_names,
    });
    setToast('Staff account created with assigned teams and barangays.');
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
  if (type === 'verify-create-incident') {
    const { report } = await api(`/api/reports/${target.dataset.id}`);
    if (report.incident_id) throw new Error('This report has already been linked to an incident.');
    if (['Resolved', 'Rejected', 'Duplicate'].includes(report.status)) {
      throw new Error('Resolved, rejected, and duplicate reports cannot be converted into incidents.');
    }
    const result = await send('/api/incidents', 'POST', {
      report_id: report.id,
      title: String(values.title || '').trim(),
      barangay: report.barangay,
      location: report.location || report.purok || report.barangay,
      latitude: report.latitude ?? null,
      longitude: report.longitude ?? null,
      incident_type: 'Unexpected',
      outage_type: String(values.outage_type || report.possible_outage_type || 'Power Outage').trim(),
      priority: values.priority || 'Medium',
      description: report.description,
      start_time: values.start_time ? new Date(values.start_time).toISOString() : new Date(report.date_time_noticed || report.reported_at).toISOString(),
      affected_area: report.purok || report.affected_area || report.barangay,
      affected_barangays: [report.barangay],
      remarks: String(values.remarks || '').trim() || null,
      initial_status: 'Verified',
    });
    setToast(result.message || 'Report verified and linked to an incident.');
    closeDialog();
    state.page = 'incidents';
    await render();
    return;
  }
  if (type === 'new-incident') {
    // 1. Auto-harvest report if selected in dropdown but user didn't click "+ Add Report"
    const reportPicker = form.querySelector('[data-chip-label="report"]');
    const reportSelect = reportPicker?.querySelector('[data-chip-select]');
    let rawReportIds = [];
    try { rawReportIds = JSON.parse(values.related_report_ids || '[]'); } catch {}
    if (reportSelect?.value && !rawReportIds.includes(reportSelect.value)) {
      rawReportIds.push(reportSelect.value);
    }
    const relatedReportIds = [...new Set(rawReportIds.map(Number).filter(Boolean))];

    // 2. Auto-harvest barangay if selected in dropdown but user didn't click "+ Add Barangay"
    const bgyPicker = form.querySelector('[data-chip-label="barangay"]');
    const bgySelect = bgyPicker?.querySelector('[data-chip-select]');
    let rawBarangays = [];
    try { rawBarangays = JSON.parse(values.affected_barangays || '[]'); } catch {}
    if (bgySelect?.value && !rawBarangays.includes(bgySelect.value)) {
      rawBarangays.push(bgySelect.value);
    }
    let primaryBarangay = String(values.barangay || rawBarangays[0] || '').trim();

    // 3. If primaryBarangay is still empty, detect from selected report's label text
    if (!primaryBarangay && reportSelect?.selectedOptions?.[0]) {
      const optText = reportSelect.selectedOptions[0].textContent;
      for (const b of (state.barangays || [])) {
        if (optText.includes(b)) {
          primaryBarangay = b;
          if (!rawBarangays.includes(b)) rawBarangays.push(b);
          break;
        }
      }
    }

    const affectedBarangays = [...new Set([primaryBarangay, ...rawBarangays.map(String)].filter(Boolean))];
    if (!primaryBarangay || !affectedBarangays.length) {
      throw new Error('Please select at least one Affected Barangay.');
    }

    const incidentTitle = String(values.title || '').trim() || `${values.outage_type || 'Power Outage'} in ${primaryBarangay}`;

    const result = await send('/api/incidents', 'POST', {
      related_report_ids: relatedReportIds,
      affected_barangays: affectedBarangays,
      title: incidentTitle,
      barangay: primaryBarangay,
      location: values.location || primaryBarangay,
      latitude: values.latitude === '' || values.latitude === undefined ? null : Number(values.latitude),
      longitude: values.longitude === '' || values.longitude === undefined ? null : Number(values.longitude),
      incident_type: values.incident_type || 'Unexpected',
      outage_type: values.outage_type || null,
      priority: values.priority || 'Medium',
      customers_affected: values.customers_affected === '' || values.customers_affected === undefined ? null : Number(values.customers_affected),
      restoration_progress: values.restoration_progress === '' || values.restoration_progress === undefined ? null : Number(values.restoration_progress),
      description: values.description || `Power interruption in ${primaryBarangay}.`,
      cause_category: isOfficial() ? (values.cause_category || null) : null,
      start_time: values.start_time ? new Date(values.start_time).toISOString() : new Date().toISOString(),
      affected_area: values.affected_area || primaryBarangay,
      estimated_restoration: isOfficial() && values.estimated_restoration
        ? new Date(values.estimated_restoration).toISOString() : null,
      initial_status: values.initial_status || 'Reported',
    });
    setToast(result.message || 'Incident created successfully.');
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
    const imageData = await readAnnouncementImage(target);
    await send('/api/announcements', 'POST', {
      title: values.title, content: values.content, category: values.category, publish: values.publish === 'on', imageData,
    });
    setToast('Announcement saved.');
    closeDialog();
    await render();
    return;
  }
  if (type === 'edit-announcement') {
    const imageData = await readAnnouncementImage(target);
    await send(`/api/announcements/${target.dataset.id}`, 'PUT', {
      title: values.title, content: values.content, category: values.category, imageData, removeImage: values.remove_image === 'on',
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
        if (typeof stopAdminTelemetryHeartbeat === 'function') stopAdminTelemetryHeartbeat();
        await send('/api/auth/logout', 'POST');
        state.user = null;
        state.unread = 0;
        state.page = 'dashboard';
        state.mobileTab = 'home';
        state.mobileAuthScreen = 'login';
        renderLogin();
        return;
      case 'get-started':
        state.mobileAuthScreen = 'login';
        renderLogin();
        return;
      case 'close-dialog':
        closeDialog();
        return;
      case 'install-app': {
        if (deferredPwaInstallPrompt) {
          const installPrompt = deferredPwaInstallPrompt;
          deferredPwaInstallPrompt = null;
          await installPrompt.prompt();
          const choice = await installPrompt.userChoice;
          if (choice.outcome === 'accepted') {
            setToast('Valencia PowerWatch was added to your device.');
          }
          return;
        }
        const installDialog = document.getElementById('pwa-install-dialog');
        if (installDialog && !installDialog.open) installDialog.showModal();
        return;
      }
      case 'close-pwa-install': {
        const installDialog = document.getElementById('pwa-install-dialog');
        if (installDialog?.open) installDialog.close();
        return;
      }
      case 'export-situation-report': {
        const [incRes, repRes, crewRes] = await Promise.all([
          api('/api/incidents'),
          api('/api/reports'),
          api('/api/repair-teams')
        ]);
        const activeInc = (incRes.incidents || []).filter((i) => i.status !== 'Closed');
        const activeRep = (repRes.reports || []).filter((r) => ['Submitted', 'Under Review', 'Verified', 'In Progress'].includes(r.status));
        const crews = crewRes.teams || [];
        
        let csv = 'VALENCIA POWERWATCH - 2030 SITUATION REPORT\\n';
        csv += `Generated At: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} PST\\n\\n`;
        csv += '--- ACTIVE POWER OUTAGE INCIDENTS ---\\n';
        csv += 'Incident Code,Title,Barangay,Type,Priority,Status,Affected Customers,Started At,Estimated Restoration\\n';
        activeInc.forEach((i) => {
          csv += `"${i.incident_code}","${i.title}","${i.barangay}","${i.incident_type || 'Unexpected'}","${i.priority}","${i.status}","${i.customers_affected || 0}","${i.start_time || ''}","${i.estimated_restoration || ''}"\\n`;
        });
        csv += '\\n--- UNRESOLVED CITIZEN REPORTS ---\\n';
        csv += 'Report Code,Barangay,Purok,Status,Repair Status,Assigned Crew,Reported At\\n';
        activeRep.forEach((r) => {
          csv += `"${r.report_code}","${r.barangay}","${r.purok || ''}","${r.status}","${r.repair_status || ''}","${r.assigned_team_name || ''}","${r.reported_at || ''}"\\n`;
        });
        csv += '\\n--- EMERGENCY REPAIR CREWS STATUS ---\\n';
        csv += 'Team Code,Name,Lead Technician,Status,Vehicle,Base Station\\n';
        crews.forEach((c) => {
          csv += `"${c.team_code}","${c.name}","${c.lead_technician}","${c.status}","${c.vehicle_type}","${c.base_station}"\\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Valencia_PowerWatch_SitRep_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setToast('Situation Report CSV downloaded successfully.');
        return;
      }
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
        {
          const provider = actionButton.dataset.provider;
          if (!['google', 'facebook'].includes(provider)) return;
          startOAuthFlow(provider);
          return;
        }
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
        if (status) status.textContent = 'Locating…';
        const position = await captureLocation();
        if (!position) {
          if (status) status.textContent = 'GPS unavailable. Allow location access or tap the map to place a pin.';
          return;
        }
        const form = actionButton.closest('form') || document;
        const latInput = form.querySelector('[data-gps="latitude"]');
        const lngInput = form.querySelector('[data-gps="longitude"]');
        const locationInput = form.querySelector('input[name="location"]');
        const barangayInput = form.querySelector('input[name="barangay"]');
        const latStr = position.latitude.toFixed(6);
        const lngStr = position.longitude.toFixed(6);

        if (latInput) latInput.value = latStr;
        if (lngInput) lngInput.value = lngStr;

        // Auto-detect and set Barangay!
        const nearest = findNearestBarangay(position.latitude, position.longitude, state.barangayLocations);
        const bgyName = nearest?.name || barangayInput?.value || 'Poblacion';
        const formattedLocation = `Brgy. ${bgyName}, Valencia City (${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)})`;

        if (locationInput && state.mobileLocationMode === 'map') {
          locationInput.value = formattedLocation;
        }
        if (barangayInput) {
          barangayInput.value = bgyName;
        }
        const badgeName = document.getElementById('assigned-barangay-name');
        if (badgeName) badgeName.textContent = `Brgy. ${bgyName}`;

        if (state.mobileReportDraft) {
          state.mobileReportDraft.barangay = bgyName;
          state.mobileReportDraft.latitude = latStr;
          state.mobileReportDraft.longitude = lngStr;
          state.mobileReportDraft.location_source = 'gps';
          state.mobileReportDraft.location_accuracy_m = String(position.accuracy);
          if (state.mobileLocationMode === 'map') state.mobileReportDraft.location = formattedLocation;
        }
        if (status) status.innerHTML = `📍 GPS fix: <strong>${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}</strong> · Barangay estimate: ${escapeHtml(bgyName)} (${Math.round(position.accuracy)} m accuracy)`;

        state.reportLocationSetPin?.(position.latitude, position.longitude, bgyName, 'gps', position.accuracy);
        if (state.reportLocationMap) {
          state.reportLocationMap.setView([position.latitude, position.longitude], 15);
        }
        return;
      }
      case 'mark-all-read':
        await send('/api/notifications/read-all', 'PUT');
        await refreshUnread();
        state.notificationPreview = (state.notificationPreview || []).map((notice) => ({ ...notice, read: 1 }));
        state.adminNotifications = (state.adminNotifications || []).map((notice) => ({ ...notice, read: 1 }));
        state.mobileNotificationPreview = (state.mobileNotificationPreview || []).map((notice) => ({ ...notice, read: 1 }));
        state.mobileNotifications = (state.mobileNotifications || []).map((notice) => ({ ...notice, read: 1 }));
        setToast('All alerts marked as read.');
        await render();
        return;
      case 'toggle-mobile-notification-panel':
        if (state.mobileNotificationPanelOpen) {
          state.mobileNotificationPanelOpen = false;
          await render();
          document.querySelector('[data-action="toggle-mobile-notification-panel"]')?.focus();
          return;
        }
        {
          const { notifications } = await api('/api/notifications');
          state.mobileNotifications = filterMobileNotifications(notifications);
          state.mobileNotificationPreview = state.mobileNotifications.slice(0, 5);
          await refreshUnread();
          state.mobileNotificationPanelOpen = true;
          await render();
          document.querySelector('#mobile-notification-panel [data-action="close-mobile-notification-panel"]')?.focus();
          return;
        }
      case 'close-mobile-notification-panel':
        state.mobileNotificationPanelOpen = false;
        await render();
        document.querySelector('[data-action="toggle-mobile-notification-panel"]')?.focus();
        return;
      case 'mark-mobile-notification-read':
        await send(`/api/notifications/${id}`, 'PUT', { read: true });
        state.mobileNotificationPreview = (state.mobileNotificationPreview || []).map((notice) => String(notice.id) === String(id) ? { ...notice, read: 1 } : notice);
        state.mobileNotifications = (state.mobileNotifications || []).map((notice) => String(notice.id) === String(id) ? { ...notice, read: 1 } : notice);
        await refreshUnread();
        await render();
        return;
      case 'view-all-mobile-notifications':
        state.mobileNotificationPanelOpen = false;
        state.mobileTab = 'notifications';
        state.mobileNotificationCategory = 'all';
        await render();
        return;
      case 'toggle-notification-panel':
        if (state.notificationPanelOpen) {
          state.notificationPanelOpen = false;
          await render();
          document.querySelector('[data-action="toggle-notification-panel"]')?.focus();
          return;
        }
        {
          const { notifications } = await api('/api/notifications');
          state.notificationPreview = notifications.slice(0, 6);
          await refreshUnread();
          state.notificationPanelOpen = true;
          await render();
          document.querySelector('.notification-panel-close')?.focus();
          return;
        }
      case 'close-notification-panel':
        state.notificationPanelOpen = false;
        await render();
        document.querySelector('[data-action="toggle-notification-panel"]')?.focus();
        return;
      case 'toggle-admin-sound': {
        const currentlyMuted = typeof isScadaAudioMuted === 'function' ? isScadaAudioMuted() : false;
        const newMuted = !currentlyMuted;
        if (typeof setScadaAudioMuted === 'function') {
          setScadaAudioMuted(newMuted);
        }
        if (!newMuted && typeof playScadaAlertChime === 'function') {
          playScadaAlertChime('high');
        }
        setToast(!newMuted ? '🔊 SCADA Audio Alerts Enabled (Telemetry Ping Active)' : '🔇 Audio Alerts Muted');
        return;
      }
      case 'dismiss-scada-banner': {
        const banner = document.getElementById('scada-emergency-banner');
        if (banner) {
          banner.classList.add('fading');
          setTimeout(() => banner.remove(), 250);
        }
        return;
      }
      case 'toggle-admin-theme': {
        const isDark = document.documentElement.classList.toggle('dark-mode');
        document.body?.classList.toggle('dark-mode', isDark);
        let persistenceMessage = '';
        try {
          localStorage.setItem('powerwatch_theme', isDark ? 'dark' : 'light');
        } catch (error) {
          console.error('Theme preference could not be saved:', error);
          persistenceMessage = ' Theme preference could not be saved in this browser.';
        }
        const themeButton = document.querySelector('[data-action="toggle-admin-theme"]');
        const iconEl = document.getElementById('theme-btn-icon');
        const textEl = document.getElementById('theme-btn-text');
        if (themeButton) {
          const label = isDark ? 'Switch to light mode' : 'Switch to Night Ops dark mode';
          themeButton.setAttribute('aria-pressed', String(isDark));
          themeButton.setAttribute('aria-label', label);
          themeButton.title = label;
        }
        if (iconEl) iconEl.textContent = isDark ? '☀️' : '🌙';
        if (textEl) textEl.textContent = isDark ? 'Light mode' : 'Night Ops';
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) themeMeta.setAttribute('content', isDark ? '#0b1220' : '#0b5cad');
        setToast((isDark ? '🌙 Night Ops dark mode enabled.' : '☀️ Light mode enabled.') + persistenceMessage);
        return;
      }
      case 'open-command-palette':
        openCommandPalette();
        return;
      case 'close-command-palette':
        closeCommandPalette();
        return;
      case 'confirm-affected': {
        if (!state.userAffectedIncidents) {
          try { state.userAffectedIncidents = JSON.parse(localStorage.getItem('powerwatch_affected_incidents') || '{}'); }
          catch (e) { state.userAffectedIncidents = {}; }
        }
        const current = Boolean(state.userAffectedIncidents[id]);
        state.userAffectedIncidents[id] = !current;
        try { localStorage.setItem('powerwatch_affected_incidents', JSON.stringify(state.userAffectedIncidents)); } catch (e) {}
        setToast(!current 
          ? '👥 Salamat! Na-record ang imong kumpirmasyon nga apektado ka niining brownout.' 
          : 'Gikuha ang imong kumpirmasyon.');
        await render();
        return;
      }
      case 'view-all-notifications':
        state.notificationPanelOpen = false;
        state.page = 'notifications';
        state.adminNotificationSection = 'notifications';
        await render();
        return;
      case 'view-notification': {
        const notice = (state.mobileNotifications || []).find((item) => String(item.id) === String(id));
        if (!notice) return;
        if (!notice.read) {
          await send(`/api/notifications/${id}`, 'PUT', { read: true });
          state.mobileNotifications = (state.mobileNotifications || []).map((item) => String(item.id) === String(id) ? { ...item, read: 1 } : item);
          state.mobileNotificationPreview = (state.mobileNotificationPreview || []).map((item) => String(item.id) === String(id) ? { ...item, read: 1 } : item);
          await refreshUnread();
        }
        if (state.mobileNotificationPanelOpen) {
          state.mobileNotificationPanelOpen = false;
          await render();
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
        const bgyLoc = (state.barangayLocations || []).find((b) => b.name === incident.barangay);
        const lat = incident.latitude || (bgyLoc && bgyLoc.latitude);
        const lng = incident.longitude || (bgyLoc && bgyLoc.longitude);
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
        setDialogFooter(`${lat && lng ? `<button type="button" class="button primary" data-action="incident-modal-route" data-lat="${lat}" data-lng="${lng}" data-label="${escapeHtml(incident.title)} (${escapeHtml(incident.barangay)})">🧭 Route Guide on Map</button>` : ''}<button type="button" class="button ghost" data-action="close-dialog">Close</button>`);
        return;
      }
      case 'view-schedule-details': {
        const { scheduled } = await api(`/api/scheduled/${id}`);
        const bgyLoc = (state.barangayLocations || []).find((b) => b.name === scheduled.barangay);
        const lat = scheduled.latitude || (bgyLoc && bgyLoc.latitude);
        const lng = scheduled.longitude || (bgyLoc && bgyLoc.longitude);
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
        setDialogFooter(`${lat && lng ? `<button type="button" class="button primary" data-action="incident-modal-route" data-lat="${lat}" data-lng="${lng}" data-label="${escapeHtml(scheduled.title)} (${escapeHtml(scheduled.barangay)})">🧭 Route Guide on Map</button>` : ''}<button type="button" class="button ghost" data-action="close-dialog">Close</button>`);
        return;
      }
      case 'focus-community-map': {
        const { lat, lng } = actionButton.dataset;
        if (state.communityOutageMap && lat && lng) {
          state.communityOutageMap.setView([Number(lat), Number(lng)], 15, { animate: true });
          const mapEl = document.getElementById('community-map');
          if (mapEl) {
            mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        return;
      }
      case 'show-community-route': {
        const { lat, lng, label } = actionButton.dataset;
        if (!lat || !lng) return;
        const container = document.querySelector('.map-route-hud-container') || document.getElementById('community-map')?.parentElement;
        await renderRouteGuideOnMap({
          map: state.communityOutageMap,
          destLat: Number(lat),
          destLng: Number(lng),
          destLabel: label || 'Valencia Outage Location',
          container
        });
        return;
      }
      case 'show-admin-route': {
        const { lat, lng, label } = actionButton.dataset;
        if (!lat || !lng) return;
        const container = document.querySelector('.power-map-canvas-wrap') || document.getElementById('admin-outage-map')?.parentElement;
        await renderRouteGuideOnMap({
          map: state.adminOutageMapInstance,
          destLat: Number(lat),
          destLng: Number(lng),
          destLabel: label || 'Valencia Outage Location',
          container,
          origin: VALENCIA_HQ_COORDINATES
        });
        return;
      }
      case 'clear-route-guide': {
        if (state.communityOutageMap) clearRouteGuideOnMap(state.communityOutageMap);
        if (state.adminOutageMapInstance) clearRouteGuideOnMap(state.adminOutageMapInstance);
        return;
      }
      case 'toggle-community-route': {
        const hud = document.querySelector('.map-route-hud');
        if (hud) {
          clearRouteGuideOnMap(state.communityOutageMap);
        } else {
          const { incidents = [] } = await api('/api/incidents');
          const item = incidents[0];
          if (item) {
            const bgyLoc = (state.barangayLocations || []).find((b) => b.name === item.barangay);
            const lat = item.latitude || (bgyLoc && bgyLoc.latitude);
            const lng = item.longitude || (bgyLoc && bgyLoc.longitude);
            if (lat && lng) {
              const container = document.querySelector('.map-route-hud-container') || document.getElementById('community-map')?.parentElement;
              await renderRouteGuideOnMap({
                map: state.communityOutageMap,
                destLat: Number(lat),
                destLng: Number(lng),
                destLabel: `${item.title} (${item.barangay || 'Valencia'})`,
                container
              });
            }
          } else {
            setToast('No active outages to route to.');
          }
        }
        return;
      }
      case 'toggle-admin-route': {
        const hud = document.querySelector('.map-route-hud');
        if (hud) {
          clearRouteGuideOnMap(state.adminOutageMapInstance);
        } else {
          const { incidents = [] } = await api('/api/incidents');
          const item = incidents[0];
          if (item) {
            const bgyLoc = (state.barangayLocations || []).find((b) => b.name === item.barangay);
            const lat = item.latitude || (bgyLoc && bgyLoc.latitude);
            const lng = item.longitude || (bgyLoc && bgyLoc.longitude);
            if (lat && lng) {
              const container = document.querySelector('.power-map-canvas-wrap') || document.getElementById('admin-outage-map')?.parentElement;
              await renderRouteGuideOnMap({
                map: state.adminOutageMapInstance,
                destLat: Number(lat),
                destLng: Number(lng),
                destLabel: `${item.title} (${item.barangay || 'Valencia'})`,
                container,
                origin: VALENCIA_HQ_COORDINATES
              });
            }
          } else {
            setToast('No active outages to route to.');
          }
        }
        return;
      }
      case 'toggle-community-cyber': {
        state.communityCyberMode = !state.communityCyberMode;
        if (state.communityCyberMode) {
          state.communityMapLayer = 'street';
        }
        const mapEl = document.getElementById('community-map');
        if (mapEl) {
          mapEl.classList.toggle('cyber-mode', !!state.communityCyberMode);
        }
        setToast(state.communityCyberMode ? '🌌 2030 Cyber Dark Grid Matrix Activated!' : 'Standard map theme restored.');
        if (typeof renderCommunityMap === 'function') {
          await renderCommunityMap();
        }
        return;
      }
      case 'toggle-community-feeders': {
        state.communityFeedersMode = state.communityFeedersMode === false ? true : false;
        if (state.communityFeedersMode) {
          renderElectricFeedersOnMap(state.communityOutageMap);
          setToast('⚡ 13.2kV Valencia Feeder Lines & Substation Grid Online!');
        } else {
          clearElectricFeedersOnMap(state.communityOutageMap);
          setToast('Feeder line overlay hidden.');
        }
        const feederBtn = document.querySelector('[data-action="toggle-community-feeders"]');
        if (feederBtn) {
          feederBtn.style.background = state.communityFeedersMode ? '#0284c7' : '#f1f5f9';
          feederBtn.style.color = state.communityFeedersMode ? '#fff' : '#334155';
          feederBtn.style.fontWeight = state.communityFeedersMode ? '750' : 'normal';
        }
        return;
      }
      case 'toggle-admin-cyber': {
        state.adminCyberMode = !state.adminCyberMode;
        const mapEl = document.getElementById('admin-outage-map');
        if (mapEl) {
          mapEl.classList.toggle('cyber-mode', !!state.adminCyberMode);
        }
        const cyberBtn = document.querySelector('[data-action="toggle-admin-cyber"]');
        if (cyberBtn) {
          cyberBtn.classList.toggle('active', !!state.adminCyberMode);
        }
        setToast(state.adminCyberMode ? '🌌 2030 Cyber Dark Matrix Activated on Operations Map!' : 'Standard map theme restored.');
        return;
      }
      case 'toggle-admin-feeders': {
        state.adminFeedersMode = !state.adminFeedersMode;
        if (state.adminFeedersMode) {
          renderElectricFeedersOnMap(state.adminOutageMapInstance);
          setToast('⚡ 13.2kV Distribution Feeders & Central Substation Active!');
        } else {
          clearElectricFeedersOnMap(state.adminOutageMapInstance);
          setToast('Distribution feeder overlay cleared.');
        }
        const feederBtn = document.querySelector('[data-action="toggle-admin-feeders"]');
        if (feederBtn) {
          feederBtn.classList.toggle('active', !!state.adminFeedersMode);
        }
        return;
      }
      case 'sim-crew-dispatch': {
        const targetMap = state.communityOutageMap || state.adminOutageMapInstance;
        if (!targetMap || !state.activeRouteWaypoints || state.activeRouteWaypoints.length < 2) {
          setToast('⚠️ Route navigation not active. Please click a route guide first!');
          return;
        }
        startCrewDispatchSimulation(targetMap, state.activeRouteWaypoints);
        return;
      }
      case 'sim-crew-direct': {
        const { lat, lng, label } = actionButton.dataset;
        if (!lat || !lng) return;
        const targetMap = state.communityOutageMap || state.adminOutageMapInstance;
        const container = document.querySelector('.map-route-hud-container') || document.querySelector('.power-map-canvas-wrap') || targetMap?.getContainer()?.parentElement;
        await renderRouteGuideOnMap({
          map: targetMap,
          destLat: Number(lat),
          destLng: Number(lng),
          destLabel: label || 'Valencia Outage Location',
          container,
          origin: VALENCIA_HQ_COORDINATES
        });
        setTimeout(() => {
          if (state.activeRouteWaypoints && state.activeRouteWaypoints.length >= 2) {
            startCrewDispatchSimulation(targetMap, state.activeRouteWaypoints);
          }
        }, 300);
        return;
      }
      case 'incident-modal-route': {
        closeDialog();
        const { lat, lng, label } = actionButton.dataset;
        if (!lat || !lng) return;
        if (IS_ADMIN) {
          await goToPage('outage-map');
          setTimeout(async () => {
            const container = document.querySelector('.power-map-canvas-wrap');
            await renderRouteGuideOnMap({
              map: state.adminOutageMapInstance,
              destLat: Number(lat),
              destLng: Number(lng),
              destLabel: label || 'Outage Incident',
              container,
              origin: VALENCIA_HQ_COORDINATES
            });
          }, 450);
        } else {
          await goToTab('map');
          setTimeout(async () => {
            const container = document.querySelector('.map-route-hud-container');
            await renderRouteGuideOnMap({
              map: state.communityOutageMap,
              destLat: Number(lat),
              destLng: Number(lng),
              destLabel: label || 'Outage Incident',
              container
            });
          }, 450);
        }
        return;
      }
      case 'view-announcement': {
        const { announcement } = await api(`/api/announcements/${id}`);
        openDialog(announcement.title, `
          ${announcement.image_path ? `<img class="announcement-detail-image" src="${escapeHtml(announcement.image_path)}" alt="${escapeHtml(announcement.title)}">` : ''}
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
      case 'open-current-outages':
        state.filters.mobileType = '';
        await goToTab('outages');
        return;
      case 'open-scheduled-outages':
        state.filters.mobileType = 'Scheduled';
        await goToTab('outages');
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
      case 'citizen-feedback-star': {
        const rating = Math.max(1, Math.min(5, Number(value)));
        state.citizenRating = rating;
        const form = actionButton.closest('form');
        form.querySelector('input[name="rating"]').value = String(rating);
        form.querySelectorAll('[data-action="citizen-feedback-star"]').forEach((star) => {
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
      case 'toggle-mobile-language': {
        const nextLang = getLanguage() === 'ceb' ? 'en' : 'ceb';
        setLanguage(nextLang);
        setToast(nextLang === 'ceb' ? 'Sinugbuanong Binisaya 🇵🇭' : 'English 🇺🇸');
        await render();
        return;
      }
      case 'open-language-dialog': {
        const currentLang = getLanguage();
        openDialog('Language / Pinulongan', `
          <div style="display:grid;gap:9px;padding:6px 0;">
            <button type="button" class="button ${currentLang === 'en' ? '' : 'ghost'} block" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-radius:10px;${currentLang === 'en' ? 'background:#edf5fd;color:#0366a6;font-weight:700;border:1.5px solid #0366a6;' : ''}" data-action="set-app-language" data-value="en">
              <span>English (US / PH)</span>
              <span>${currentLang === 'en' ? '✓' : ''}</span>
            </button>
            <button type="button" class="button ${currentLang === 'ceb' ? '' : 'ghost'} block" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-radius:10px;${currentLang === 'ceb' ? 'background:#edf5fd;color:#0366a6;font-weight:700;border:1.5px solid #0366a6;' : ''}" data-action="set-app-language" data-value="ceb">
              <span>Sinugbuanong Binisaya (Valencia)</span>
              <span>${currentLang === 'ceb' ? '✓' : ''}</span>
            </button>
          </div>
        `, 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      }
      case 'set-app-language': {
        const newLang = value === 'ceb' ? 'ceb' : 'en';
        setLanguage(newLang);
        closeDialog();
        setToast(newLang === 'ceb' ? 'Gibalhin ngadto sa Sinugbuanong Binisaya 🇵🇭' : 'Language set to English 🇺🇸');
        await render();
        return;
      }
      case 'refresh-sms-logs':
        await render();
        setToast('SMS logs refreshed.');
        return;
      case 'show-version-info':
        setToast('Valencia PowerWatch Mobile App v1.0.0 (Valencia City)');
        return;
      case 'next-report-step':
        await moveMobileReportStep(1);
        return;
      case 'pick-report-attachment': {
        const kind = value === 'video' ? 'video' : 'photo';
        actionButton.closest('form')?.querySelector(`input[name="attachments"][data-attachment-kind="${kind}"]`)?.click();
        return;
      }
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
        state.mobileMapMode = value === 'heat' ? 'heat' : 'pins';
        localStorage.setItem('powerwatch.mobile-map-mode', state.mobileMapMode);
        await render();
        return;
      case 'set-mobile-map-layer':
        state.mobileMapLayer = value === 'satellite' ? 'satellite' : 'street';
        localStorage.setItem('powerwatch.mobile-map-layer', state.mobileMapLayer);
        state.communityCyberMode = false;
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
      case 'autofill-admin-login': {
        const form = document.querySelector('form[data-form="login"]');
        if (form) {
          const emailInput = form.querySelector('input[name="email"]');
          const passInput = form.querySelector('input[name="password"]');
          if (emailInput && passInput) {
            emailInput.value = actionButton.dataset.user || '';
            passInput.value = actionButton.dataset.pass || '';
            form.requestSubmit();
          }
        }
        return;
      }
      case 'filter-announcements':
        state.filters.announcementFilter = value;
        await render();
        return;
      case 'mobile-notification-category':
        state.mobileNotificationCategory = value;
        await render();
        return;
      case 'reset-announcement-filters':
        state.filters = { ...state.filters, announcementFilter: '', announcementCategory: '', announcementSearch: '' };
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
      case 'open-case-verification':
        state.page = 'verification';
        state.verificationReportId = id;
        state.filters.verificationStatus = '';
        state.filters.verificationSearch = '';
        await render();
        return;
      case 'filter-unified-case':
        state.filters.caseStatus = value;
        await render();
        return;
      case 'verify-report': {
        const { report } = await api(`/api/reports/${id}`);
        if (report.incident_id) {
          setToast('This report is already linked to a verified incident.');
          state.page = 'incidents';
          await render();
          return;
        }
        if (['Resolved', 'Rejected', 'Duplicate'].includes(report.status)) {
          throw new Error('Resolved, rejected, and duplicate reports cannot be converted into incidents.');
        }
        const noticedAt = new Date(report.date_time_noticed || report.reported_at || Date.now());
        const localStart = new Date(noticedAt.getTime() - noticedAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        const suggestedTitle = `${report.possible_outage_type || 'Power outage'} — ${report.purok || report.affected_area || report.barangay}`;
        openDialog(`Verify & create incident · ${report.report_code}`, `
          <div class="form-stack">
            <p>This will verify the submitted report and create one linked incident record. Report history and evidence will be preserved.</p>
            <label class="wide-field">Incident title<input class="input" name="title" maxlength="180" value="${escapeHtml(suggestedTitle)}" required></label>
            <label>Priority<select class="input" name="priority"><option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option></select></label>
            <label>Outage type<input class="input" name="outage_type" value="${escapeHtml(report.possible_outage_type || 'Power Outage')}" required></label>
            <label>Incident start time<input class="input" type="datetime-local" name="start_time" value="${escapeHtml(localStart)}" required></label>
            <label class="wide-field">Incident remarks<textarea class="input" name="remarks" rows="3"></textarea></label>
          </div>`, 'Verify & create incident', { form: 'verify-create-incident', id });
        return;
      }
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
      case 'open-assign-repair-modal': {
        const reportId = id;
        const [{ report }, { teams }] = await Promise.all([
          api(`/api/reports/${reportId}`),
          api('/api/repair-teams')
        ]);
        
        const teamOptions = teams.map((team) => {
          const isAvail = team.status === 'Available';
          const statusBadge = isAvail ? '🟢 [Ready]' : `🟠 [${team.status}]`;
          return `<option value="${team.id}" ${team.id === report.assigned_team_id ? 'selected' : ''}>
            ${escapeHtml(team.name)} · ${escapeHtml(team.vehicle_type)} ${statusBadge} (Lead: ${escapeHtml(team.lead_technician)})
          </option>`;
        }).join('');

        openDialog(`🚒 Dispatch Repair Crew — ${escapeHtml(report.report_code)}`, `
          <div class="form-stack">
            <input type="hidden" name="report_id" value="${report.id}">
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px;margin-bottom:8px;">
              <p style="margin:0 0 6px 0;font-size:0.86rem;font-weight:700;color:#0369a1;">📍 Incident Location &amp; Details</p>
              <div style="font-size:0.83rem;color:#1e293b;line-height:1.5;">
                <div><strong>Barangay:</strong> Brgy. ${escapeHtml(report.barangay || 'Valencia City')}</div>
                <div><strong>Purok / Specific Area:</strong> <span style="color:#0284c7;font-weight:700;">📍 ${escapeHtml(report.purok || report.affected_area || 'Not specified')}</span></div>
                <div><strong>Exact Coordinates:</strong> ${report.latitude && report.longitude ? `${Number(report.latitude).toFixed(5)}, ${Number(report.longitude).toFixed(5)}` : 'Approximate'}</div>
                <div><strong>Problem Type:</strong> ${escapeHtml(report.possible_outage_type || 'Power Outage')}</div>
              </div>
            </div>

            <label class="wide-field">
              <span>Select Emergency Response Crew <strong style="color:#ef4444;">*</strong></span>
              <select class="input" name="team_id" required>
                <option value="">-- Choose Emergency Crew --</option>
                ${teamOptions}
              </select>
            </label>

            <label class="wide-field">
              <span>Dispatch Priority</span>
              <select class="input" name="priority">
                <option value="High" selected>⚡ High Priority (Standard Emergency Outage)</option>
                <option value="Critical">🚨 Critical Priority (Hospital / Water / Substation / Live Wire)</option>
                <option value="Normal">Normal Priority (Minor Feeder / Service Line)</option>
              </select>
            </label>

            <label class="wide-field">
              <span>Technical Notes / Crew Instructions</span>
              <textarea class="input" name="dispatch_notes" rows="3" placeholder="e.g. Broken crossarm and severed wire along Purok 2. Coordinate with local Barangay Tanod upon arrival.">${report.description ? 'Resident Note: ' + escapeHtml(report.description) : ''}</textarea>
            </label>
          </div>
        `, '🚀 Dispatch Crew to Site', { form: 'assign-repair-crew', id: report.id });
        return;
      }
      case 'open-quick-dispatch-modal': {
        const [{ teams }, { reports }] = await Promise.all([
          api('/api/repair-teams'),
          api('/api/reports')
        ]);
        const teamOptions = teams.map((t) => `<option value="${t.id}">${escapeHtml(t.name)} · ${escapeHtml(t.vehicle_type)} (${escapeHtml(t.status)})</option>`).join('');
        const openReports = reports.filter((r) => ['Submitted', 'Under Review', 'Verified', 'In Progress'].includes(r.status) && hasCoordinates(r));
        const reportOptions = openReports.map((r) => `<option value="${r.id}">${escapeHtml(r.report_code)} — Brgy. ${escapeHtml(r.barangay)} (${escapeHtml(r.purok || r.affected_area || 'Site')})</option>`).join('');

        openDialog('🚀 Dispatch Response Unit', `
          <div class="form-stack">
            <label class="wide-field">
              <span>Target Incident / Outage Report <strong style="color:#ef4444;">*</strong></span>
              <select class="input" name="report_id" required>
                <option value="">-- Select Outage Report --</option>
                ${reportOptions}
              </select>
            </label>
            <label class="wide-field">
              <span>Response Crew <strong style="color:#ef4444;">*</strong></span>
              <select class="input" name="team_id" required>
                <option value="">-- Select Response Crew --</option>
                ${teamOptions}
              </select>
            </label>
            <label class="wide-field">
              <span>Priority</span>
              <select class="input" name="priority">
                <option value="High" selected>⚡ High Priority</option>
                <option value="Critical">🚨 Critical Priority</option>
                <option value="Normal">Normal Priority</option>
              </select>
            </label>
            <label class="wide-field">
              <span>Instructions</span>
              <textarea class="input" name="dispatch_notes" rows="2" placeholder="Instructions for emergency crew..."></textarea>
            </label>
          </div>
        `, 'Dispatch Crew', { form: 'assign-repair-crew' });
        return;
      }
      case 'dispatch-update-status': {
        const assignmentId = id;
        const newStatus = actionButton.dataset.status;
        if (!assignmentId || !newStatus) return;

        let crewReport = '';
        if (newStatus === 'Resolved') {
          const defaultCrewReport = 'Power successfully restored to affected area.';
          try {
            crewReport = window.prompt('Restoration summary / crew notes (optional):') || defaultCrewReport;
          } catch (error) {
            crewReport = defaultCrewReport;
            setToast('The restoration notes prompt is unavailable here; the standard restoration summary will be saved.');
          }
        }

        await send(`/api/repair/assignments/${assignmentId}/status`, 'PUT', {
          status: newStatus,
          crew_report: crewReport
        });
        setToast(`⚡ Repair status updated to: ${newStatus}. User notification & SMS sent.`);
        await render();
        return;
      }
      case 'update-repair-team-gps': {
        if (!id) return;
        const position = await captureLocation();
        if (!position) {
          setToast('GPS unavailable. Allow location access on this Dispatch device and try again.');
          return;
        }
        await send(`/api/repair-teams/${id}/location`, 'PUT', {
          latitude: position.latitude,
          longitude: position.longitude
        });
        setToast(`GPS position saved for the selected repair team (±${Math.round(position.accuracy)} m reported accuracy).`);
        await render();
        return;
      }
      case 'focus-repair-route': {
        state.selectedDispatchId = id;
        if (state.page !== 'dispatch') {
          state.page = 'dispatch';
          await render();
          if (typeof window.drawDispatchRoute === 'function') {
            await window.drawDispatchRoute(id);
          }
        } else {
          const card = document.getElementById(`assignment-card-${id}`);
          if (card) {
            document.querySelectorAll('.dispatch-card').forEach((c) => c.classList.remove('active-target'));
            card.classList.add('active-target');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          if (typeof window.drawDispatchRoute === 'function') {
            await window.drawDispatchRoute(id);
          }
        }
        return;
      }
      case 'view-crew-route': {
        try {
          const { assignments } = await api('/api/repair/assignments');
          const matching = assignments.find((a) => String(a.report_id) === String(id));
          if (matching) state.selectedDispatchId = matching.id;
        } catch (e) {}
        state.page = 'dispatch';
        await render();
        return;
      }
      case 'dispatch-view-evidence': {
        const { report } = await api(`/api/reports/${id}`);
        const attachments = [...(report.attachments || [])];
        if (report.photo_path && !attachments.some((attachment) => attachment.file_path === report.photo_path)) {
          attachments.unshift({ file_path: report.photo_path, mime_type: 'image/jpeg', original_name: 'Report photo' });
        }
        const media = attachments.map((attachment) => String(attachment.mime_type || '').startsWith('video/')
          ? `<figure><video src="${escapeHtml(attachment.file_path)}" controls preload="metadata"></video><figcaption>${escapeHtml(attachment.original_name || 'Video evidence')}</figcaption></figure>`
          : `<figure><a href="${escapeHtml(attachment.file_path)}" target="_blank" rel="noopener"><img src="${escapeHtml(attachment.file_path)}" alt="${escapeHtml(attachment.original_name || 'Report evidence')}"></a><figcaption>${escapeHtml(attachment.original_name || 'Photo evidence')}</figcaption></figure>`).join('');
        openDialog(`Evidence · ${report.report_code} (${escapeHtml(report.purok || report.barangay)})`, media ? `<div class="verification-evidence-dialog">${media}</div>` : '<p>No evidence attachments were submitted with this report.</p>', 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      }
      case 'filter-dispatch-status':
        state.filters.dispatchStatus = value;
        await render();
        return;
      case 'dispatch-refresh':
        await render();
        setToast('Dispatch and fleet state refreshed.');
        return;
      case 'reset-dispatch-map':
        if (state.adminDispatchMap) {
          state.adminDispatchMap.setView([8.1250, 125.0933], 13);
        }
        return;
      case 'admin-outage-view':
        state.adminOutageView = value;
        await render();
        return;
      case 'filter-admin-notifications':
        state.adminNotificationFilter = value;
        state.adminNotificationPage = 1;
        await render();
        return;
      case 'filter-admin-notification-category':
        state.adminNotificationCategory = value;
        state.adminNotificationPage = 1;
        await render();
        return;
      case 'admin-notification-section':
        state.adminNotificationSection = value === 'announcements' ? 'announcements' : 'notifications';
        state.page = 'notifications';
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
        const notice = [...(state.adminNotifications || []), ...(state.notificationPreview || [])]
          .find((item) => String(item.id) === String(id));
        if (!notice) return;
        if (!notice.read) {
          await send(`/api/notifications/${id}`, 'PUT', { read: true });
          state.notificationPreview = (state.notificationPreview || []).map((item) => String(item.id) === String(id) ? { ...item, read: 1 } : item);
          state.adminNotifications = (state.adminNotifications || []).map((item) => String(item.id) === String(id) ? { ...item, read: 1 } : item);
          await refreshUnread();
        }
        if (state.notificationPanelOpen) {
          state.notificationPanelOpen = false;
          await render();
        }
        openDialog(notice.title, `<p>${escapeHtml(notice.message)}</p><p class="muted small">${escapeHtml(formatDateTime(notice.created_at))}</p>`, 'Close');
        setDialogFooter('<button type="button" class="button ghost" data-action="close-dialog">Close</button>');
        return;
      }
      case 'toggle-admin-notification':
        await send(`/api/notifications/${id}`, 'PUT', { read: value === 'read' });
        state.notificationPreview = (state.notificationPreview || []).map((notice) => String(notice.id) === String(id) ? { ...notice, read: value === 'read' ? 1 : 0 } : notice);
        state.adminNotifications = (state.adminNotifications || []).map((notice) => String(notice.id) === String(id) ? { ...notice, read: value === 'read' ? 1 : 0 } : notice);
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
      case 'clear-audit-logs': {
        if (!window.confirm('Are you sure you want to clear all audit logs? This cannot be undone.')) return;
        await send('/api/admin/audit-logs', 'DELETE');
        setToast('Audit logs cleared.');
        state.auditPage = 1;
        await render();
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
          ${availableReports.length ? '' : '<p class="incident-form-note" style="color:#64748b;font-size:0.8rem;margin-top:4px;">(Optional) Walay unlinked reports sa karon — ang tanang reports na-link na o wala pay bag-ong report. Pwede ra kini i-skip.</p>'}
        </div>`;
        openDialog('Create Incident', `
          <div class="create-incident-form">
            <div class="incident-create-fields">
              <label class="incident-create-field wide-field">Incident Title <span class="required-mark">*</span><input class="input" name="title" placeholder="e.g. Transformer Issue in Guinoyuran" maxlength="160" required></label>
              <label class="incident-create-field wide-field">Date &amp; Time <span class="required-mark">*</span><input class="input" type="datetime-local" name="start_time" value="${escapeHtml(toLocalInputValue(new Date()))}" required></label>
              <div class="incident-create-field wide-field"><span class="incident-field-label">Affected Barangays <span class="required-mark">*</span></span>${barangayPicker}</div>
              <label class="incident-create-field">Location (Street / Landmark)<input class="input" name="location" placeholder="e.g. Zone 1, near Plaza"></label>
              <label class="incident-create-field">Affected Area (Coverage)<input class="input" name="affected_area" placeholder="e.g. Purok 1 to 4, whole sitio"></label>
              <label class="incident-create-field">Incident Type <span class="required-mark">*</span><select class="input" name="outage_type" required><option value="">Choose incident type</option>${typeOptions}</select></label>
              <label class="incident-create-field">Priority <span class="required-mark">*</span><select class="input" name="priority" required><option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option></select></label>
              <label class="incident-create-field">Incident Category<select class="input" name="incident_type"><option selected>Unexpected</option><option>Scheduled</option></select></label>
              <label class="incident-create-field">Initial Status<select class="input" name="initial_status"><option selected>Ongoing</option><option>Reported</option><option>Under Verification</option><option>Verified</option></select></label>
              <label class="incident-create-field wide-field">Description <span class="required-mark">*</span><textarea class="input" name="description" rows="3" placeholder="Describe the incident" maxlength="3000" required></textarea></label>
              <div class="incident-create-field wide-field"><span class="incident-field-label">Related Reports (Optional / Link to Incident)</span>${reportPicker}</div>
            </div>
            <details class="incident-advanced-fields"><summary>More optional details (Coordinates, Estimated Restoration, Customers)</summary>
              <div class="incident-create-fields incident-advanced-grid">
                <label class="incident-create-field">Customers Affected<input class="input" type="number" min="0" step="1" name="customers_affected" placeholder="Estimated homes/meters"></label>
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
        const { reports } = await api('/api/reports');
        const available = (reports || []).filter((r) => !r.incident_id && !['Rejected', 'Duplicate', 'Resolved'].includes(r.status));
        if (!available.length) {
          openDialog('Link Report', `
            <div style="padding:10px 0;">
              <p style="margin-bottom:10px;color:#1e293b;font-weight:600;">Walay unlinked reports nga available sa karon.</p>
              <p class="muted small" style="line-height:1.5;">Ang tanang na-submit nga reports na-sumpay na daan sa mga incidents o na-resolve na.</p>
              <p class="muted small" style="margin-top:8px;padding:8px 10px;background:#f8fafc;border-radius:6px;border-left:3px solid #0284c7;">
                💡 <strong>Pahinumdom:</strong> Kung gusto nimo i-update ang status (sama sa pag-marka og <strong>Restored / Closed</strong> o <strong>Resolved</strong>), i-click ang <strong>Pencil icon (✏️ Edit)</strong> sa Actions column.
              </p>
            </div>
          `, 'Close');
          setDialogFooter('<button type="button" class="button primary" data-action="close-dialog">Understood</button>');
          return;
        }
        openDialog('Link a report to this incident', `
          <div class="form-stack">
            <label>Report<select class="input" name="report_id" required><option value="">Choose report</option>${available.map((r) => `<option value="${r.id}">${escapeHtml(r.report_code)} — ${escapeHtml(r.barangay)} (${escapeHtml(r.status)})</option>`).join('')}</select></label>
            <label class="wide-field">Remarks<textarea class="input" name="remarks" rows="2" placeholder="e.g. Confirmed duplicate or same affected area"></textarea></label>
          </div>
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
            <label class="wide-field announcement-image-field">Cover image (optional)<input class="input" type="file" name="image" data-announcement-image accept="image/jpeg,image/png,image/webp"><span>JPG, PNG, or WebP. Maximum 4 MB.</span></label>
            <div class="wide-field announcement-image-preview" data-announcement-preview hidden><img alt="Announcement image preview"></div>
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
            <label class="wide-field announcement-image-field">Cover image<input class="input" type="file" name="image" data-announcement-image accept="image/jpeg,image/png,image/webp"><span>JPG, PNG, or WebP. Maximum 4 MB.</span></label>
            <div class="wide-field announcement-image-preview" data-announcement-preview ${announcement.image_path ? '' : 'hidden'}><img src="${escapeHtml(announcement.image_path || '')}" alt="Current announcement image"></div>
            ${announcement.image_path ? '<label class="wide-field checkbox-field"><input type="checkbox" name="remove_image"> Remove current image</label>' : ''}
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
      case 'new-user': {
        const [{ teams }, { barangays }] = await Promise.all([
          api('/api/repair-teams'),
          api('/api/barangays'),
        ]);
        const activeTeams = teams.filter((team) => team.status !== 'Inactive');
        if (!activeTeams.length || !barangays.length) {
          throw new Error('Create an active repair team and ensure at least one active barangay exists before adding staff.');
        }
        openDialog('Add staff account', `
          <div class="form-stack">
            <label class="wide-field">Full name<input class="input" name="full_name" autocomplete="name" required></label>
            <label class="wide-field">Staff email<input class="input" type="email" name="email" autocomplete="email" required></label>
            <label class="wide-field">Contact number<input class="input" name="contact_number" autocomplete="tel" placeholder="For field coordination"></label>
            <label class="wide-field">Address<input class="input" name="address" autocomplete="street-address"></label>
            <input type="hidden" name="role" value="personnel">
            <fieldset class="wide-field staff-account-assignment"><legend>Assigned field teams <span aria-hidden="true">*</span></legend>
              ${activeTeams.map((team) => `<label><input type="checkbox" name="team_ids" value="${Number(team.id)}"> <span>${escapeHtml(team.name)}</span></label>`).join('')}
            </fieldset>
            <fieldset class="wide-field staff-account-assignment"><legend>Authorized barangays / areas <span aria-hidden="true">*</span></legend>
              ${barangays.map((barangay) => `<label><input type="checkbox" name="barangay_names" value="${escapeHtml(barangay)}"> <span>${escapeHtml(barangay)}</span></label>`).join('')}
            </fieldset>
            <label class="wide-field">Initial password<input class="input" type="password" name="password" minlength="6" autocomplete="new-password" required><span>Give these exact sign-in credentials to the staff member. Passwords are securely hashed.</span></label>
            <p class="wide-field muted small">Only administrators create Staff accounts. Residents register themselves through the User Portal.</p>
          `, 'Create account', { form: 'new-user' });
        return;
      }
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
        const availableRoles = Object.entries(roles).filter(([key]) => key !== 'personnel' || user.role === 'personnel');
        openDialog(`Role for ${user.full_name}`, `
          <div class="form-stack">
            <label>Role<select class="input" name="role">${availableRoles.map(([k, v]) => `<option value="${k}" ${user.role === k ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('')}</select></label>
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
        if (!window.confirm('Reset system data to a clean/fresh state? All reports, incidents, schedules, announcements, and user submissions will be removed.')) return;
        await send('/api/admin/maintenance/seed', 'POST');
        state.user = null;
        renderLogin('System data was reset to a fresh state. Sign in again to continue.');
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

function startOAuthFlow(provider) {
  if (!['google', 'facebook'].includes(provider)) return;
  if (!state.oauthProviders?.[`${provider}Live`]) {
    const providerLabel = provider === 'google' ? 'Google' : 'Facebook';
    setToast(`${providerLabel} sign-in is not configured on this server. Use email and password to sign in.`);
    return;
  }

  window.location.assign(`/api/auth/oauth/${encodeURIComponent(provider)}`);
}

async function afterLogin() {
  if (IS_COMMUNITY && state.user?.role !== 'resident') {
    state.user = null;
    state.mobileAuthScreen = 'login';
    renderLogin('This account is not authorized for the User Portal. Sign in with a resident account.');
    return;
  }
  if (IS_ADMIN && state.user && !OFFICIAL_ROLES.includes(state.user.role)) {
    renderAdminRestrictedAccess();
    return;
  }
  if (IS_ADMIN && state.user && STAFF_ROLES.includes(state.user.role)) {
    if (typeof startAdminTelemetryHeartbeat === 'function') startAdminTelemetryHeartbeat();
  }
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
    if (IS_COMMUNITY && user.role !== 'resident') {
      state.user = null;
      state.mobileAuthScreen = 'login';
      renderLogin('This browser is signed in to a Staff or Admin account. Sign in with a resident account to use the User Portal.');
      return;
    }
    if (IS_ADMIN && state.user && !OFFICIAL_ROLES.includes(state.user.role)) {
      renderAdminRestrictedAccess();
      return;
    }
    if (IS_ADMIN && state.user && STAFF_ROLES.includes(state.user.role)) {
      if (typeof startAdminTelemetryHeartbeat === 'function') startAdminTelemetryHeartbeat();
    }
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

document.addEventListener('click', (event) => {
  if (state.notificationPanelOpen && !event.target.closest('.notification-menu')) {
    state.notificationPanelOpen = false;
    const panel = document.getElementById('admin-notification-panel');
    if (panel) panel.hidden = true;
    document.querySelector('[data-action="toggle-notification-panel"]')?.setAttribute('aria-expanded', 'false');
  }
  if (state.mobileNotificationPanelOpen
    && !event.target.closest('.mobile-notification-panel')
    && !event.target.closest('[data-action="toggle-mobile-notification-panel"]')) {
    state.mobileNotificationPanelOpen = false;
    const panel = document.getElementById('mobile-notification-panel');
    if (panel) panel.hidden = true;
    document.querySelector('[data-action="toggle-mobile-notification-panel"]')?.setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (state.notificationPanelOpen) {
    state.notificationPanelOpen = false;
    const panel = document.getElementById('admin-notification-panel');
    if (panel) panel.hidden = true;
    const trigger = document.querySelector('[data-action="toggle-notification-panel"]');
    trigger?.setAttribute('aria-expanded', 'false');
    trigger?.focus();
  }
  if (state.mobileNotificationPanelOpen) {
    state.mobileNotificationPanelOpen = false;
    const panel = document.getElementById('mobile-notification-panel');
    if (panel) panel.hidden = true;
    const trigger = document.querySelector('[data-action="toggle-mobile-notification-panel"]');
    trigger?.setAttribute('aria-expanded', 'false');
    trigger?.focus();
  }
});

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

document.addEventListener('input', (event) => {
  const input = event.target;
  if (!IS_COMMUNITY || !input.matches('form[data-form="login"] input[name="email"]')) return;
  const form = input.form;
  saveCommunityLoginIdentifier(input.value, form?.elements.remember?.checked === true);
});

document.addEventListener('change', (event) => {
  const checkbox = event.target;
  if (!IS_COMMUNITY || !checkbox.matches('form[data-form="login"] input[name="remember"]')) return;
  saveCommunityLoginIdentifier(checkbox.form?.elements.email?.value, checkbox.checked);
});

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const button = form.querySelector('[type="submit"]');
  if (button) button.disabled = true;
  document.querySelector('.dialog-error-banner')?.remove();
  try {
    await submitForm(form);
  } catch (error) {
    const formType = form.dataset.form;
    if (formType === 'login') {
      renderLogin(
        error.message || 'Invalid email, mobile number, or password.',
        form.elements.email?.value || '',
        form.elements.remember?.checked === true,
      );
      return;
    }
    if (formType === 'register') {
      renderRegister(error.message || 'Registration failed. Please check your information.');
      return;
    }
    if (formType === 'forgot-password') {
      renderForgotPassword(error.message);
      return;
    }
    if (error.status === 401) {
      state.user = null;
      renderLogin('Your session expired. Sign in again to continue.');
    } else {
      setToast(error.message);
      const dialog = document.getElementById('action-dialog');
      if (dialog && dialog.open) {
        let errBanner = dialog.querySelector('.dialog-error-banner');
        if (!errBanner) {
          errBanner = document.createElement('div');
          errBanner.className = 'dialog-error-banner';
          errBanner.style.cssText = 'background:#fef2f2;border:1.5px solid #ef4444;color:#b91c1c;padding:10px 14px;border-radius:8px;font-size:0.88rem;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:8px;box-shadow:0 2px 6px rgba(239,68,68,0.15);';
          const body = document.getElementById('dialog-body');
          if (body) body.prepend(errBanner);
        }
        errBanner.innerHTML = `<span style="font-size:1.1rem;">⚠️</span> <span>${escapeHtml(error.message)}</span>`;
        errBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  } finally {
    if (button && button.isConnected) button.disabled = false;
  }
});

document.addEventListener('change', async (event) => {
  const chipSelect = event.target.closest('[data-chip-select]');
  if (chipSelect && chipSelect.value) {
    const picker = chipSelect.closest('.incident-chip-picker');
    if (picker) {
      const values = incidentChipValues(picker);
      if (!values.includes(chipSelect.value)) values.push(chipSelect.value);
      updateIncidentChipPicker(picker, values);
    }
    return;
  }
  const reportAttachmentInput = event.target.closest('form[data-form="report"] input[name="attachments"]');
  if (reportAttachmentInput) {
    try {
      await moveMobileReportStep(0);
    } catch (error) {
      reportAttachmentInput.value = '';
      setToast(error.message);
    }
    return;
  }
  const input = event.target.closest('[data-announcement-image]');
  if (!input) return;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const imageData = await readAnnouncementImage(input.closest('form'));
    const preview = input.closest('form').querySelector('[data-announcement-preview]');
    const image = preview?.querySelector('img');
    if (image && preview) {
      image.src = imageData;
      preview.hidden = false;
    }
    const removeImage = input.closest('form').querySelector('[name="remove_image"]');
    if (removeImage) removeImage.checked = false;
  } catch (error) {
    input.value = '';
    setToast(error.message);
  }
});

let filterTimer = null;
document.addEventListener('input', (event) => {
  const el = event.target;
  if (el.matches('[data-location-search]')) {
    const bgyName = el.value.trim().toLowerCase();
    const barangay = (state.barangayLocations || []).find((item) => item.name.toLowerCase() === bgyName);
    if (barangay && hasCoordinates(barangay)) {
      const lat = Number(barangay.latitude);
      const lng = Number(barangay.longitude);
      if (state.reportLocationMap) {
        state.reportLocationMap.flyTo([lat, lng], 15, { duration: 0.6 });
      }
      state.reportLocationClearPin?.();
    }
  }
  if (el.dataset && el.dataset.filter && el.tagName !== 'SELECT') {
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

function openCommandPalette() {
  let modal = document.getElementById('command-palette-modal');
  if (modal) modal.remove();

  const navItems = [
    { label: 'Dashboard Overview', icon: '📊', type: 'page', key: 'dashboard' },
    { label: 'Incidents & Reports', icon: '⚡', type: 'page', key: 'reports' },
    { label: 'Interactive GIS Outage Map', icon: '🗺️', type: 'page', key: 'map' },
    { label: 'Scheduled Maintenance Grid', icon: '🗓️', type: 'page', key: 'scheduled' },
    { label: 'Notifications', icon: '🔔', type: 'page', key: 'notifications' },
    { label: 'Analytics & SAIDI/SAIFI Metrics', icon: '📈', type: 'page', key: 'analytics' },
    { label: 'System Audit Trail & Security Logs', icon: '🛡️', type: 'page', key: 'audit' },
    { label: 'User & Staff Access Management', icon: '👥', type: 'page', key: 'users' },
    { label: 'System Configuration & Settings', icon: '⚙️', type: 'page', key: 'settings' },
  ];

  const barangays = state.barangays || [];

  const backdrop = document.createElement('div');
  backdrop.id = 'command-palette-modal';
  backdrop.className = 'command-palette-backdrop';

  backdrop.innerHTML = `
    <div class="command-palette-modal" role="dialog" aria-modal="true" aria-label="Command Palette">
      <div class="command-palette-head">
        <span style="font-size: 1.15rem;">🔍</span>
        <input type="text" class="command-palette-input" placeholder="Type a command, page, or barangay..." autofocus>
        <button type="button" class="link-button" data-action="close-command-palette" style="font-size: 1.25rem;">&times;</button>
      </div>
      <div class="command-palette-results">
        <div class="command-group-title">Navigation &amp; System Modules</div>
        ${navItems.map(item => `
          <button type="button" class="command-item" data-command-type="${item.type}" data-command-key="${item.key}">
            <div class="command-item-left"><span>${item.icon}</span><strong>${escapeHtml(item.label)}</strong></div>
            <span class="command-item-badge">Jump</span>
          </button>
        `).join('')}
        <div class="command-group-title">Valencia City Barangays (31)</div>
        ${barangays.slice(0, 10).map(b => `
          <button type="button" class="command-item" data-command-type="barangay" data-command-key="${escapeHtml(b)}">
            <div class="command-item-left"><span>📍</span><strong>Brgy. ${escapeHtml(b)}</strong></div>
            <span class="command-item-badge">Filter Map</span>
          </button>
        `).join('')}
      </div>
      <div class="command-palette-foot">
        <span>Navigation: <kbd>↑</kbd> <kbd>↓</kbd> or click to select</span>
        <span><kbd>Esc</kbd> to exit</span>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  const input = backdrop.querySelector('.command-palette-input');
  input?.focus();

  input?.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const results = backdrop.querySelector('.command-palette-results');
    const matchedNav = navItems.filter(item => item.label.toLowerCase().includes(q));
    const matchedBarangay = barangays.filter(b => b.toLowerCase().includes(q));

    let html = '';
    if (matchedNav.length) {
      html += `<div class="command-group-title">Navigation (${matchedNav.length})</div>`;
      html += matchedNav.map(item => `
        <button type="button" class="command-item" data-command-type="${item.type}" data-command-key="${item.key}">
          <div class="command-item-left"><span>${item.icon}</span><strong>${escapeHtml(item.label)}</strong></div>
          <span class="command-item-badge">Jump</span>
        </button>
      `).join('');
    }
    if (matchedBarangay.length) {
      html += `<div class="command-group-title">Barangays (${matchedBarangay.length})</div>`;
      html += matchedBarangay.map(b => `
        <button type="button" class="command-item" data-command-type="barangay" data-command-key="${escapeHtml(b)}">
          <div class="command-item-left"><span>📍</span><strong>Brgy. ${escapeHtml(b)}</strong></div>
          <span class="command-item-badge">Filter Map</span>
        </button>
      `).join('');
    }
    if (!matchedNav.length && !matchedBarangay.length) {
      html = '<div style="padding: 24px; text-align: center; color: var(--muted); font-size: 0.88rem;">No matching commands or barangays found.</div>';
    }
    results.innerHTML = html;
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-action="close-command-palette"]')) {
      closeCommandPalette();
      return;
    }
    const itemBtn = e.target.closest('.command-item');
    if (itemBtn) {
      const type = itemBtn.dataset.commandType;
      const key = itemBtn.dataset.commandKey;
      closeCommandPalette();
      if (type === 'page') {
        goToPage(key);
      } else if (type === 'barangay') {
        state.page = 'map';
        render().then(() => {
          setTimeout(() => {
            const flySelect = document.getElementById('map-fly-select');
            if (flySelect) {
              const opt = Array.from(flySelect.options).find(o => o.text.includes(key));
              if (opt) {
                flySelect.value = opt.value;
                flySelect.dispatchEvent(new Event('change'));
              }
            }
          }, 350);
        });
      }
    }
  });
}

function closeCommandPalette() {
  const modal = document.getElementById('command-palette-modal');
  if (modal) modal.remove();
}

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const existing = document.getElementById('command-palette-modal');
    if (existing) closeCommandPalette();
    else openCommandPalette();
  } else if (e.key === 'Escape') {
    closeCommandPalette();
  }
});

// Network status listeners
window.addEventListener('online', () => {
  setToast('✓ Network restored: Connected to Valencia PowerWatch.');
  const banner = document.getElementById('mobile-offline-banner');
  if (banner) banner.remove();
});

window.addEventListener('offline', () => {
  setToast('⚠️ Network connection lost. Offline mode active.');
  if (IS_COMMUNITY) render();
});

// Theme persistence on load
try {
  if (localStorage.getItem('powerwatch_theme') === 'dark') {
    document.documentElement.classList.add('dark-mode');
    document.body?.classList.add('dark-mode');
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', '#0b1220');
  }
} catch (e) {}

boot();
