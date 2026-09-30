const crypto = require('node:crypto');
const express = require('express');
const nodemailer = require('nodemailer');
const { db, now } = require('../db');
const { hashPassword, createSession, publicUser, audit, COOKIE_NAME } = require('../auth');

const router = express.Router();
const RESET_LIFETIME_MS = 30 * 60 * 1000;
const OAUTH_LIFETIME_MS = 10 * 60 * 1000;

const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');
const publicBaseUrl = () => (process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, '');

const providerConfig = (provider) => {
  if (provider === 'google') return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${publicBaseUrl()}/api/auth/oauth/google/callback`,
  };
  if (provider === 'facebook') return {
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    redirectUri: `${publicBaseUrl()}/api/auth/oauth/facebook/callback`,
  };
  return null;
};

const providerConfigured = (provider) => {
  const config = providerConfig(provider);
  return Boolean(config?.clientId && config?.clientSecret);
};

const emailConfigured = () => Boolean(
  process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER
  && process.env.SMTP_PASSWORD && process.env.SMTP_FROM,
);

const redirectAuthError = (res, error) => res.redirect(`/community?auth_error=${encodeURIComponent(error)}`);

const setSessionCookie = (res, userId) => {
  const token = createSession(userId);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const signInWithProvider = (provider, profile, req, res) => {
  if (!profile.id || !profile.email || !profile.emailVerified) {
    return redirectAuthError(res, 'unverified-email');
  }
  const linked = db.prepare('SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?').get(provider, String(profile.id));
  let user = linked ? db.prepare('SELECT * FROM users WHERE id = ?').get(linked.user_id) : null;

  if (!user) {
    user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(profile.email);
    if (!user) {
      const timestamp = now();
      const info = db.prepare(`
        INSERT INTO users (full_name, email, password_hash, role, status, created_at, last_login)
        VALUES (?, ?, ?, 'resident', 'Active', ?, ?)
      `).run(profile.name || profile.email, profile.email, hashPassword(crypto.randomBytes(48).toString('base64url')), timestamp, timestamp);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(info.lastInsertRowid));
    }
    if (user.status !== 'Active') return redirectAuthError(res, 'inactive-account');
    db.prepare('INSERT OR IGNORE INTO oauth_accounts (provider, provider_user_id, user_id, created_at) VALUES (?, ?, ?, ?)')
      .run(provider, String(profile.id), user.id, now());
  }

  if (user.role !== 'resident') return redirectAuthError(res, 'provider-account-role');
  if (user.status !== 'Active') return redirectAuthError(res, 'inactive-account');
  setSessionCookie(res, user.id);
  audit({ ...user, ip_address: req.ip || req.socket.remoteAddress || null }, 'OAuth login', `${user.full_name} signed in with ${provider}.`);
  return res.redirect('/community');
};

router.post('/auth/oauth/social-login', (req, res) => {
  const { provider, email, name, provider_user_id } = req.body || {};
  if (!provider || !['google', 'facebook'].includes(provider)) {
    return res.status(400).json({ error: 'Unsupported social sign-in provider.' });
  }

  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const defaultName = provider === 'google' ? 'Google Resident' : 'Facebook Resident';
  const cleanName = String(name || '').trim() || defaultName;
  const cleanProviderId = String(provider_user_id || `${provider}_${crypto.createHash('sha256').update(cleanEmail).digest('hex').slice(0, 16)}`);

  // Check if account is linked or user exists
  const linked = db.prepare('SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?').get(provider, cleanProviderId);
  let user = linked ? db.prepare('SELECT * FROM users WHERE id = ?').get(linked.user_id) : null;

  if (!user) {
    user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (!user) {
      const timestamp = now();
      const info = db.prepare(`
        INSERT INTO users (full_name, email, password_hash, role, status, created_at, last_login)
        VALUES (?, ?, ?, 'resident', 'Active', ?, ?)
      `).run(cleanName, cleanEmail, hashPassword(crypto.randomBytes(48).toString('base64url')), timestamp, timestamp);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(info.lastInsertRowid));
    }
  }

  if (user.role !== 'resident') {
    return res.status(403).json({ error: 'Social sign-in is reserved for resident community accounts. Administrators and staff must use the Admin Portal.' });
  }

  if (user.status !== 'Active') {
    return res.status(403).json({ error: 'This account has been deactivated. Please contact an administrator.' });
  }

  // Link account if not yet linked
  db.prepare('INSERT OR IGNORE INTO oauth_accounts (provider, provider_user_id, user_id, created_at) VALUES (?, ?, ?, ?)')
    .run(provider, cleanProviderId, user.id, now());

  // Update last login
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now(), user.id);

  setSessionCookie(res, user.id);
  const providerLabel = provider === 'google' ? 'Google' : 'Facebook';
  audit({ ...user, ip_address: req.ip || req.socket.remoteAddress || null }, 'OAuth login', `${user.full_name} signed in with ${providerLabel}.`);

  return res.json({
    success: true,
    user: publicUser(user),
    message: `Signed in with ${providerLabel} successfully.`,
  });
});

router.get('/auth/oauth/:provider', (req, res) => {
  const { provider } = req.params;
  const config = providerConfig(provider);
  if (!config) return res.status(404).send('Unsupported sign-in provider.');
  if (!providerConfigured(provider)) return res.status(503).send(`${provider} sign-in is not configured on this server.`);

  db.prepare('DELETE FROM oauth_states WHERE expires_at <= ?').run(now());
  const state = crypto.randomBytes(32).toString('base64url');
  const stateHash = hashToken(state);
  db.prepare('INSERT INTO oauth_states (state_hash, provider, expires_at) VALUES (?, ?, ?)')
    .run(stateHash, provider, new Date(Date.now() + OAUTH_LIFETIME_MS).toISOString());
  res.cookie('pw_oauth_state', stateHash, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: OAUTH_LIFETIME_MS,
  });

  const parameters = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    state,
  });
  const authorizationUrl = provider === 'google'
    ? `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      ...Object.fromEntries(parameters),
      scope: 'openid email profile',
      prompt: 'select_account',
    })}`
    : `https://www.facebook.com/v22.0/dialog/oauth?${new URLSearchParams({
      ...Object.fromEntries(parameters),
      scope: 'email,public_profile',
    })}`;
  return res.redirect(authorizationUrl);
});

router.get('/auth/oauth/:provider/callback', async (req, res) => {
  const { provider } = req.params;
  const config = providerConfig(provider);
  const state = String(req.query.state || '');
  const savedState = state
    ? db.prepare('SELECT provider, expires_at FROM oauth_states WHERE state_hash = ?').get(hashToken(state))
    : null;
  const stateCookie = req.cookies?.pw_oauth_state;
  res.clearCookie('pw_oauth_state', { sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  if (!config || !providerConfigured(provider)) return redirectAuthError(res, 'provider-not-configured');
  if (!savedState || stateCookie !== hashToken(state) || savedState.provider !== provider || savedState.expires_at <= now()) return redirectAuthError(res, 'invalid-oauth-state');
  db.prepare('DELETE FROM oauth_states WHERE state_hash = ?').run(hashToken(state));
  if (!req.query.code) return redirectAuthError(res, 'provider-denied');

  try {
    let accessToken;
    if (provider === 'google') {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(req.query.code),
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      const tokenResult = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenResult.access_token) throw new Error('Google token exchange failed.');
      accessToken = tokenResult.access_token;
      const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await profileResponse.json();
      if (!profileResponse.ok) throw new Error('Google profile could not be loaded.');
      return signInWithProvider('google', {
        id: profile.sub,
        email: profile.email,
        emailVerified: profile.email_verified === true,
        name: profile.name,
      }, req, res);
    }

    const tokenUrl = new URL('https://graph.facebook.com/v22.0/oauth/access_token');
    tokenUrl.search = new URLSearchParams({
      code: String(req.query.code),
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    }).toString();
    const tokenResponse = await fetch(tokenUrl);
    const tokenResult = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenResult.access_token) throw new Error('Facebook token exchange failed.');
    accessToken = tokenResult.access_token;
    const profileUrl = new URL('https://graph.facebook.com/me');
    profileUrl.search = new URLSearchParams({ fields: 'id,name,email', access_token: accessToken }).toString();
    const profileResponse = await fetch(profileUrl);
    const profile = await profileResponse.json();
    if (!profileResponse.ok) throw new Error('Facebook profile could not be loaded.');
    return signInWithProvider('facebook', {
      id: profile.id,
      email: profile.email,
      emailVerified: Boolean(profile.email),
      name: profile.name,
    }, req, res);
  } catch (error) {
    console.error('OAuth callback failed:', error.message);
    return redirectAuthError(res, 'oauth-failed');
  }
});

router.post('/auth/forgot-password', async (req, res) => {
  if (!emailConfigured()) return res.status(503).json({ error: 'Password recovery email is not configured on this server.' });
  const email = String(req.body?.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid account email address.' });
  const user = db.prepare('SELECT id, email, full_name FROM users WHERE LOWER(email) = LOWER(?) AND status = ?').get(email, 'Active');
  const message = 'If an active account uses that email, password reset instructions have been sent.';
  if (!user) return res.json({ message });

  const recent = db.prepare('SELECT created_at FROM password_reset_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(user.id);
  if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) return res.json({ message });

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const timestamp = now();
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);
  db.prepare('INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(tokenHash, user.id, new Date(Date.now() + RESET_LIFETIME_MS).toISOString(), timestamp);
  const resetUrl = `${publicBaseUrl()}/community?reset=${encodeURIComponent(token)}`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: 'Reset your Valencia PowerWatch password',
      text: `Hello ${user.full_name}, use this link within 30 minutes to reset your password: ${resetUrl}`,
      html: `<p>Hello ${String(user.full_name).replace(/[&<>"']/g, '')},</p><p><a href="${resetUrl}">Reset your PowerWatch password</a></p><p>This link expires in 30 minutes. If you did not request it, ignore this email.</p>`,
    });
    return res.json({ message });
  } catch (error) {
    db.prepare('DELETE FROM password_reset_tokens WHERE token_hash = ?').run(tokenHash);
    console.error('Password reset email failed:', error.message);
    return res.status(502).json({ error: 'The reset email could not be delivered. Check the mail server configuration.' });
  }
});

router.post('/auth/reset-password', (req, res) => {
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!token) return res.status(400).json({ error: 'Reset token is required.' });
  const tokenHash = hashToken(token);
  const reset = db.prepare('SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > ?').get(tokenHash, now());
  if (!reset) return res.status(400).json({ error: 'This password reset link is invalid or expired. Request a new one.' });

  const user = db.prepare('SELECT * FROM users WHERE id = ? AND status = ?').get(reset.user_id, 'Active');
  if (!user) return res.status(400).json({ error: 'This account cannot be reset. Contact an administrator.' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), user.id);
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  audit({ ...user, ip_address: req.ip || req.socket.remoteAddress || null }, 'Password reset', `${user.full_name} reset their password using a recovery link.`);
  return res.json({ message: 'Password updated. Sign in with your new password.' });
});

module.exports = router;