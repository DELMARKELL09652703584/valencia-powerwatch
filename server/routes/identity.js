const crypto = require('node:crypto');
const fs = require('node:fs');
const express = require('express');
const nodemailer = require('nodemailer');
const { db, now } = require('../db');
const { publicBaseUrl } = require('../config/public-base-url');
const {
  hashPassword, createSession, createPersistentSession, publicUser, audit, COOKIE_NAME,
  isBuiltInAdmin, hasBuiltInAdminIdentifier, BUILT_IN_ADMIN_RECOVERY_EMAIL,
  residentStore, persistentAuthConfigured, persistentAuthRequired,
  migrateLegacyResidents, mirrorPersistentResident,
} = require('../middleware/auth');

const router = express.Router();
const RESET_LIFETIME_MS = 30 * 60 * 1000;
const OAUTH_LIFETIME_MS = 10 * 60 * 1000;

const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');
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

const setSessionCookie = async (req, res, user) => {
  let token;
  if (residentStore && user.role === 'resident') {
    const persistent = await residentStore.saveLegacyAccount(user);
    if (!persistent) throw new Error('OAuth resident account could not be saved to persistent storage.');
    token = await createPersistentSession(persistent.id);
  } else {
    token = createSession(user.id);
  }
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: Boolean(req.secure),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const getPortalDestination = (role) => {
  if (['administrator', 'personnel', 'dispatcher', 'utility'].includes(role)) {
    return '/admin';
  }
  return '/community';
};

const signInWithProvider = async (provider, profile, req, res) => {
  if (!profile.id || !profile.email || !profile.emailVerified) {
    return redirectAuthError(res, 'unverified-email');
  }
  if (persistentAuthRequired && !persistentAuthConfigured) return redirectAuthError(res, 'persistent-storage-unavailable');
  if (residentStore) await migrateLegacyResidents();
  const linked = db.prepare('SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?').get(provider, String(profile.id));
  let user = linked ? db.prepare('SELECT * FROM users WHERE id = ?').get(linked.user_id) : null;

  if (!user) {
    user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(profile.email);
    if (!user) {
      if (hasBuiltInAdminIdentifier({ email: profile.email, username: String(profile.email).split('@')[0] })) {
        return redirectAuthError(res, 'reserved-account');
      }
      const timestamp = now();
      const info = db.prepare(`
        INSERT INTO users (full_name, email, password_hash, role, status, created_at, last_login)
        VALUES (?, ?, ?, 'resident', 'Active', ?, ?)
      `).run(profile.name || profile.email, profile.email, hashPassword(crypto.randomBytes(48).toString('base64url')), timestamp, timestamp);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(info.lastInsertRowid));
    }
    if (user.status !== 'Active') return redirectAuthError(res, 'inactive-account');
    if (isBuiltInAdmin(user)) return redirectAuthError(res, 'built-in-admin-password-only');
    db.prepare('INSERT OR IGNORE INTO oauth_accounts (provider, provider_user_id, user_id, created_at) VALUES (?, ?, ?, ?)')
      .run(provider, String(profile.id), user.id, now());
  }

  if (user.status !== 'Active') return redirectAuthError(res, 'inactive-account');
  if (isBuiltInAdmin(user)) return redirectAuthError(res, 'built-in-admin-password-only');
  if (residentStore && user.role === 'resident') {
    const persistent = await residentStore.saveLegacyAccount(user);
    if (!persistent) throw new Error('OAuth resident account could not be saved to persistent storage.');
    user = mirrorPersistentResident(persistent);
  }
  await setSessionCookie(req, res, user);
  audit({ ...user, ip_address: req.ip || req.socket.remoteAddress || null }, 'OAuth login', `${user.full_name} signed in with ${provider}.`);
  return res.redirect(getPortalDestination(user.role));
};

router.post('/auth/oauth/social-login', (req, res) => {
  res.status(410).json({
    error: 'This sign-in method is no longer supported. Start sign-in through the official Google or Facebook authorization flow.',
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
    path: '/',
    secure: Boolean(req.secure),
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
  res.clearCookie('pw_oauth_state', { path: '/', sameSite: 'lax', secure: Boolean(req.secure) });
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
      return await signInWithProvider('google', {
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
    return await signInWithProvider('facebook', {
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

const passwordResetTransport = () => {
  if (process.env.NODE_ENV === 'test' && process.env.POWERWATCH_TEST_MAIL_CAPTURE) {
    return {
      sendMail: async (message) => {
        fs.appendFileSync(process.env.POWERWATCH_TEST_MAIL_CAPTURE, `${JSON.stringify(message)}\n`);
        return { messageId: 'test-capture' };
      },
    };
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
};

router.post('/auth/forgot-password', async (req, res, next) => {
  if (!emailConfigured()) return res.status(503).json({ error: 'Password recovery email is not configured on this server.' });
  const identifier = String(req.body?.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) return res.status(400).json({ error: 'Enter the recovery email address for the account.' });
  let user;
  try {
    if (persistentAuthRequired && !persistentAuthConfigured) {
      return res.status(503).json({ error: 'Persistent account storage is not configured. Please try again later.' });
    }
    if (residentStore) await migrateLegacyResidents();
    const persistent = residentStore ? await residentStore.findByEmail(identifier) : null;
    user = persistent ? mirrorPersistentResident(persistent) : null;
  } catch (error) {
    return next(error);
  }
  user ||= db.prepare(`
    SELECT * FROM users
    WHERE status = 'Active'
      AND (
        (is_built_in_admin = 1 AND LOWER(COALESCE(recovery_email, '')) = LOWER(?))
        OR LOWER(email) = LOWER(?)
      )
    ORDER BY is_built_in_admin DESC
    LIMIT 1
  `).get(identifier, identifier);
  const message = 'If an active account uses that recovery email, password reset instructions have been sent.';
  if (!user) return res.json({ message });
  if (user.status !== 'Active') return res.json({ message });
  const builtIn = isBuiltInAdmin(user);
  const recipient = builtIn ? (user.recovery_email || BUILT_IN_ADMIN_RECOVERY_EMAIL) : user.email;
  if (!recipient) return res.json({ message });

  const recent = db.prepare('SELECT created_at FROM password_reset_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(user.id);
  if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) return res.json({ message });

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const timestamp = now();
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);
  db.prepare('INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(tokenHash, user.id, new Date(Date.now() + RESET_LIFETIME_MS).toISOString(), timestamp);
  const resetUrl = `${publicBaseUrl()}${builtIn ? '/admin' : '/community'}?reset=${encodeURIComponent(token)}`;

  try {
    await passwordResetTransport().sendMail({
      from: process.env.SMTP_FROM,
      to: recipient,
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

router.post('/auth/reset-password', async (req, res, next) => {
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!token) return res.status(400).json({ error: 'Reset token is required.' });
  const tokenHash = hashToken(token);
  const reset = db.prepare('SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > ?').get(tokenHash, now());
  if (!reset) return res.status(400).json({ error: 'This password reset link is invalid or expired. Request a new one.' });

  const user = db.prepare('SELECT * FROM users WHERE id = ? AND status = ?').get(reset.user_id, 'Active');
  if (!user) return res.status(400).json({ error: 'This account cannot be reset. Contact an administrator.' });
  try {
    const passwordHash = hashPassword(password);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
    if (user.role === 'resident' && residentStore) {
      const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      updated.password_hash = passwordHash;
      await residentStore.updateAccount(updated);
      const persistent = await residentStore.findByEmail(updated.email);
      if (persistent) await residentStore.deleteUserSessions(persistent.id);
    }
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    audit({ ...user, ip_address: req.ip || req.socket.remoteAddress || null }, 'Password reset', `${user.full_name} reset their password using a recovery link.`);
    return res.json({ message: 'Password updated. Sign in with your new password.' });
  } catch (error) {
    return next(error);
  }
});
module.exports = router;
