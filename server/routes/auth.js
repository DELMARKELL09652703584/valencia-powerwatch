const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { db, now, checkpointDb } = require('../db');
const { UPLOAD_DIR } = require('../db');
const { resolveBarangay } = require('../location-geocoder');
const {
  COOKIE_NAME, hashPassword, verifyPassword, createSession, destroySession,
  requireAuth, publicUser, roleLabel, audit, notifyRole,
  PORTAL_ROLES, isBuiltInAdmin, hasBuiltInAdminIdentifier,
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

const VALENCIA_COORDINATE_BOUNDS = { minLatitude: 7.6, maxLatitude: 8.2, minLongitude: 124.8, maxLongitude: 125.4 };
const geocodeCache = new Map();
let geocodeQueue = Promise.resolve();
let nextGeocodeAt = 0;
let queuedGeocodeRequests = 0;

const reverseGeocode = async (latitude, longitude) => {
  const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;
  if (queuedGeocodeRequests >= 20) {
    const error = new Error('Location lookup is busy. Please try again or choose your barangay manually.');
    error.status = 503;
    throw error;
  }

  queuedGeocodeRequests += 1;
  const lookup = geocodeQueue.then(async () => {
    const delay = Math.max(0, nextGeocodeAt - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    nextGeocodeAt = Date.now() + 1000;

    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.search = new URLSearchParams({
      format: 'jsonv2',
      lat: String(latitude),
      lon: String(longitude),
      zoom: '18',
      addressdetails: '1',
    }).toString();
    let place;
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ValenciaPowerWatch/1.0 (https://valencia-powerwatch.onrender.com/)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Location lookup returned HTTP ${response.status}.`);
      place = await response.json();
    } catch (cause) {
      const error = new Error('The location lookup service is unavailable. Choose your barangay manually or try again.', { cause });
      error.status = 503;
      throw error;
    }
    const address = place.address || {};
    const matchedBarangay = resolveBarangay(place, getBarangayNames());
    return {
      status: matchedBarangay ? 'matched' : 'unmatched',
      barangay: matchedBarangay || null,
      display_name: typeof place.display_name === 'string' ? place.display_name : null,
      provider: 'OpenStreetMap Nominatim',
    };
  });
  geocodeQueue = lookup.catch(() => {});

  try {
    const result = await lookup;
    geocodeCache.set(cacheKey, result);
    if (geocodeCache.size > 500) geocodeCache.delete(geocodeCache.keys().next().value);
    return result;
  } finally {
    queuedGeocodeRequests -= 1;
  }
};

router.get('/auth/demo', (req, res) => {
  res.json({
    demos: [],
    barangays: getBarangayNames(),
    oauthProviders: {
      google: true,
      facebook: true,
      googleLive: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      facebookLive: Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
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
  const cleanEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const rawUsername = (req.body?.username ? String(req.body.username).trim().toLowerCase() : cleanEmail.split('@')[0]) || null;
  const cleanContact = contact_number ? String(contact_number).trim() : null;
  if (hasBuiltInAdminIdentifier({ username: rawUsername, email: cleanEmail, contact_number: cleanContact })) {
    return res.status(409).json({ error: 'That account identifier is reserved.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const cleanAddress = address ? String(address).trim() : null;
  const cleanBarangay = barangay ? String(barangay).trim() : null;

  const info = db.prepare(`
    INSERT INTO users (full_name, username, email, contact_number, address, barangay, password_hash, role, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'resident', 'Active', ?)
  `).run(
    String(full_name).trim(),
    rawUsername,
    cleanEmail,
    cleanContact,
    cleanAddress,
    cleanBarangay,
    hashPassword(password),
    now()
  );

  checkpointDb();

  const userId = Number(info.lastInsertRowid);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const token = createSession(userId, true);

  audit({ ...user, ip_address: req.ip || req.socket.remoteAddress || null }, 'Registration', `New resident account created for ${user.email}.`);
  notifyRole('personnel', 'New resident registered', `${user.full_name} registered to Valencia PowerWatch.`, 'system');
  notifyRole('administrator', 'New resident registered', `${user.full_name} registered to Valencia PowerWatch.`, 'system');

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
  res.json({ user: publicUser(user), message: 'Registration successful.' });
});

router.post('/auth/login', (req, res) => {
  const { email, password, remember, portal } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email, mobile number, or username and password are required.' });
  if (portal && !Object.hasOwn(PORTAL_ROLES, portal)) {
    return res.status(400).json({ error: 'Invalid portal.' });
  }

  const raw = String(email).trim();
  const cleanPhone = raw.replace(/[\s\-\(\)\.]/g, '').replace(/^\+63/, '0');

  const candidates = db.prepare(`
    SELECT * FROM users 
    WHERE (
      LOWER(email) = LOWER(?) 
      OR LOWER(COALESCE(username, '')) = LOWER(?) 
      OR LOWER(full_name) = LOWER(?) 
      OR contact_number = ?
      OR REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(contact_number, ''), ' ', ''), '-', ''), '+63', '0'), '.', '') = ?
    )
  `).all(raw, raw, raw, raw, cleanPhone);

  if (!candidates.length) {
    return res.status(401).json({ error: 'No account found with this email, mobile number, or username.' });
  }

  const user = candidates.find((cand) => verifyPassword(password, cand.password_hash));
  if (!user) {
    return res.status(401).json({ error: 'Incorrect password. Please verify and try again.' });
  }
  if (user.status !== 'Active') {
    return res.status(403).json({ error: 'This account is deactivated. Contact the administrator.' });
  }
  if (portal && !PORTAL_ROLES[portal].includes(user.role)) {
    return res.status(403).json({ error: 'This account is not authorized for the selected portal.' });
  }

  const rememberMe = remember === true;
  const token = createSession(user.id, rememberMe);
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now(), user.id);
  checkpointDb();
  const fresh = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);

  audit({ ...fresh, ip_address: req.ip || req.socket.remoteAddress || null }, 'Login', `${user.full_name} (${roleLabel(user.role)}) logged in.`);

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000
  });
  res.json({ user: publicUser(fresh), message: 'Login successful.' });
});

router.post('/auth/logout', requireAuth, (req, res) => {
  destroySession(req.token);
  audit(req.user, 'Logout', `${req.user.full_name} logged out.`);
  res.clearCookie(COOKIE_NAME, { path: '/' });
  checkpointDb();
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

router.get('/barangays/reverse-geocode', requireAuth, async (req, res, next) => {
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lon);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'Provide valid latitude and longitude.' });
  }

  if (latitude < VALENCIA_COORDINATE_BOUNDS.minLatitude || latitude > VALENCIA_COORDINATE_BOUNDS.maxLatitude
    || longitude < VALENCIA_COORDINATE_BOUNDS.minLongitude || longitude > VALENCIA_COORDINATE_BOUNDS.maxLongitude) {
    return res.json({ status: 'outside_city', barangay: null, provider: 'OpenStreetMap Nominatim' });
  }

  try {
    return res.json(await reverseGeocode(latitude, longitude));
  } catch (error) {
    if (Number(error.status) === 503) return res.status(503).json({ error: error.message });
    return next(error);
  }
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
  if (isBuiltInAdmin(req.user)) {
    return res.status(403).json({ error: 'The built-in administrator account cannot be changed through profile settings.' });
  }
  const { full_name, contact_number, address, barangay, photoData, removePhoto } = req.body || {};
  if (!full_name) return res.status(400).json({ error: 'Full name cannot be empty.' });
  if (hasBuiltInAdminIdentifier({ contact_number })) {
    return res.status(409).json({ error: 'That contact number is reserved.' });
  }

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
  if (isBuiltInAdmin(req.user)) {
    return res.status(403).json({ error: 'The built-in administrator password is managed by system configuration.' });
  }
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

module.exports = router;