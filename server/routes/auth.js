const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { db, now } = require('../db');
const { UPLOAD_DIR } = require('../db');
const {
  COOKIE_NAME, hashPassword, verifyPassword, createSession, destroySession,
  requireAuth, publicUser, roleLabel, audit, notifyRole,
} = require('../auth');

const router = express.Router();

const saveProfilePhoto = async (photoData, userId) => {
  if (!photoData) return null;
  const match = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(photoData);
  if (!match) return null;
  const extension = match[1] === 'image/png' ? 'png' : match[1] === 'image/webp' ? 'webp' : 'jpg';
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 3 * 1024 * 1024) return null;
  const filename = `profile_${userId}_${Date.now()}.${extension}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), buffer, { flag: 'wx' });
  return `/uploads/${filename}`;
};

const getBarangayNames = () => {
  const rows = db.prepare("SELECT name FROM barangays WHERE status = 'Active' ORDER BY name").all();
  return rows.map((r) => r.name);
};

// Demo accounts shown on the login screen for demonstration purposes.
router.get('/auth/demo', (req, res) => {
  const demos = [
    { role: 'resident', label: 'Resident', email: 'resident@powerwatch.ph' },
    { role: 'personnel', label: 'System Personnel', email: 'staff@powerwatch.ph' },
    { role: 'administrator', label: 'Administrator', email: 'admin@powerwatch.ph' },
    { role: 'utility', label: 'Authorized Utility Personnel', email: 'utility@powerwatch.ph' },
  ];
  res.json({
    demos,
    barangays: getBarangayNames(),
    oauthProviders: {
      google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      facebook: Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
    },
    passwordRecoveryEnabled: Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM),
  });
});

router.post('/auth/register', (req, res) => {
  const { full_name, email, contact_number, address, barangay, password } = req.body || {};

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const info = db.prepare(`
    INSERT INTO users (full_name, email, contact_number, address, barangay, password_hash, role, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'resident', 'Active', ?)
  `).run(full_name.trim(), email.trim(), contact_number || null, address || null, barangay || null, hashPassword(password), now());

  const userId = Number(info.lastInsertRowid);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const token = createSession(userId);

  audit({ ...user, ip_address: req.ip || req.socket.remoteAddress || null }, 'Registration', `New resident account created for ${user.email}.`);
  notifyRole('personnel', 'New resident registered', `${user.full_name} registered to Valencia PowerWatch.`, 'system');
  notifyRole('administrator', 'New resident registered', `${user.full_name} registered to Valencia PowerWatch.`, 'system');

  res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ user: publicUser(user), message: 'Registration successful.' });
});

router.post('/auth/login', (req, res) => {
  const { email, password, remember } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Username or email and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(full_name) = LOWER(?) OR contact_number = ?').get(email, email, email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  if (user.status !== 'Active') {
    return res.status(403).json({ error: 'This account is deactivated. Contact the administrator.' });
  }

  const rememberMe = remember === true;
  const token = createSession(user.id, rememberMe);
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now(), user.id);
  const fresh = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);

  audit({ ...fresh, ip_address: req.ip || req.socket.remoteAddress || null }, 'Login', `${user.full_name} (${roleLabel(user.role)}) logged in.`);

  res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', maxAge: (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000 });
  res.json({ user: publicUser(fresh), message: 'Login successful.' });
});

router.post('/auth/logout', requireAuth, (req, res) => {
  destroySession(req.token);
  audit(req.user, 'Logout', `${req.user.full_name} logged out.`);
  res.clearCookie(COOKIE_NAME);
  res.json({ message: 'Logged out.' });
});

router.get('/auth/me', requireAuth, (req, res) => {
  const fresh = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(fresh) });
});

router.get('/barangays', requireAuth, (req, res) => {
  res.json({ barangays: getBarangayNames() });
});

router.get('/barangays/locations', requireAuth, (req, res) => {
  const locations = db.prepare("SELECT name, latitude, longitude FROM barangays WHERE status = 'Active' ORDER BY name").all();
  res.json({ barangays: locations });
});

router.get('/settings', requireAuth, (req, res) => {
  const settings = {};
  for (const key of ['outage_types', 'inactive_outage_types', 'incident_categories', 'announcement_categories', 'system_info']) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    settings[key] = row ? JSON.parse(row.value) : null;
  }
  res.json({ settings });
});

// Profile
router.put('/profile', requireAuth, async (req, res, next) => {
  const { full_name, contact_number, address, barangay, photoData, removePhoto } = req.body || {};
  if (!full_name) return res.status(400).json({ error: 'Full name cannot be empty.' });

  let photoPath = req.user.profile_photo_path || null;
  if (photoData) {
    try {
      photoPath = await saveProfilePhoto(photoData, req.user.id);
    } catch (error) {
      return next(error);
    }
    if (!photoPath) return res.status(400).json({ error: 'Choose a valid JPG, PNG, or WebP image up to 3 MB.' });
  } else if (removePhoto) {
    photoPath = null;
  }

  db.prepare(`
    UPDATE users SET full_name = ?, contact_number = ?, address = ?, barangay = ?, profile_photo_path = ? WHERE id = ?
  `).run(full_name.trim(), contact_number || null, address || null, barangay || null, photoPath, req.user.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  audit({ ...user, ip_address: req.ip || req.socket.remoteAddress || null }, 'Profile updated', `${user.full_name} updated their profile.`);
  res.json({ user: publicUser(user), message: 'Profile updated.' });
});

router.put('/profile/password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords are required.' });
  if (String(new_password).length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });

  if (!verifyPassword(current_password, req.user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(new_password), req.user.id);
  audit(req.user, 'Password changed', `${req.user.full_name} changed their password.`);
  res.json({ message: 'Password changed successfully.' });
});

router.post('/feedback', requireAuth, (req, res) => {
  const rating = Number(req.body?.rating);
  const comments = String(req.body?.comments || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Choose a rating from 1 to 5 stars.' });
  if (comments.length > 1000) return res.status(400).json({ error: 'Feedback comments must be 1000 characters or fewer.' });
  audit(req.user, 'Community feedback submitted', `${req.user.full_name} rated the app ${rating}/5${comments ? `: ${comments}` : '.'}`);
  notifyRole('personnel', 'Community feedback received', `${req.user.full_name} submitted a ${rating}/5 rating.`, 'system');
  notifyRole('administrator', 'Community feedback received', `${req.user.full_name} submitted a ${rating}/5 rating.`, 'system');
  res.status(201).json({ message: 'Thank you for your feedback.' });
});

module.exports = router;