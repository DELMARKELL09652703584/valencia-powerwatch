const crypto = require('node:crypto');
const { db, now } = require('../db');
const { hashSessionToken } = require('./session-token');
const {
  residentStore,
  persistentAuthConfigured,
  persistentAuthRequired,
} = require('../services/resident-store');

const SESSION_DAYS = 7;
const COOKIE_NAME = 'pw_session';
const BUILT_IN_ADMIN_USERNAME = 'DELMARKEL2003';
const BUILT_IN_ADMIN_EMAIL = 'dsaroay@gmail.com';
const BUILT_IN_ADMIN_PHONE = '09652703584';
const PORTAL_ROLES = {
  community: ['resident'],
  staff: ['personnel'],
  admin: ['administrator', 'utility'],
};

const normalizePhone = (value) => String(value || '')
  .replace(/[\s\-\(\)\.]/g, '')
  .replace(/^\+63/, '0');

const isBuiltInAdmin = (user) => String(user?.username || '').toLowerCase() === BUILT_IN_ADMIN_USERNAME.toLowerCase()
  || String(user?.email || '').toLowerCase() === BUILT_IN_ADMIN_EMAIL.toLowerCase()
  || normalizePhone(user?.contact_number) === BUILT_IN_ADMIN_PHONE;

const hasBuiltInAdminIdentifier = ({ username, email, contact_number } = {}) => (
  String(username || '').trim().toLowerCase() === BUILT_IN_ADMIN_USERNAME.toLowerCase()
  || String(email || '').trim().toLowerCase() === BUILT_IN_ADMIN_EMAIL.toLowerCase()
  || normalizePhone(contact_number) === BUILT_IN_ADMIN_PHONE
);

const verifyPassword = (password, stored) => {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return test.length === expected.length && crypto.timingSafeEqual(test, expected);
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const createSession = (userId, rememberMe = false) => {
  const token = crypto.randomBytes(32).toString('hex');
  const lifetimeDays = rememberMe ? 30 : SESSION_DAYS;
  const expiresAt = new Date(Date.now() + lifetimeDays * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(hashSessionToken(token), userId, now(), expiresAt);
  return token;
};

const createPersistentSession = async (persistentUserId, rememberMe = false) => {
  const token = crypto.randomBytes(32).toString('hex');
  const lifetimeDays = rememberMe ? 30 : SESSION_DAYS;
  const createdAt = now();
  const expiresAt = new Date(Date.now() + lifetimeDays * 24 * 60 * 60 * 1000).toISOString();
  await residentStore.createSession(hashSessionToken(token), persistentUserId, createdAt, expiresAt);
  return token;
};

const destroySession = async (token) => {
  const tokenHash = hashSessionToken(token);
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(tokenHash);
  if (token && residentStore) await residentStore.deleteSession(tokenHash);
};

const cleanupExpiredSessions = () => {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now());
};

const cleanupPersistentSessions = async () => {
  if (residentStore) {
    await residentStore.cleanupExpiredSessions(now());
  } else if (persistentAuthRequired) {
    const error = new Error('Persistent resident authentication is not configured.');
    error.status = 503;
    throw error;
  }
};

let legacyResidentMigration;
const migrateLegacyResidents = async () => {
  if (!residentStore) {
    if (persistentAuthRequired) {
      const error = new Error('Persistent resident authentication is not configured.');
      error.status = 503;
      throw error;
    }
    return;
  }
  if (!legacyResidentMigration) {
    legacyResidentMigration = (async () => {
      const residents = db.prepare("SELECT * FROM users WHERE role = 'resident'").all();
      for (const resident of residents) await residentStore.saveLegacyAccount(resident);

      const sessions = db.prepare(`
        SELECT s.token, s.created_at, s.expires_at, u.email
        FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE u.role = 'resident' AND s.expires_at > ?
      `).all(now());
      for (const session of sessions) await residentStore.saveLegacySession(session);
    })().catch((error) => {
      legacyResidentMigration = null;
      throw error;
    });
  }
  return legacyResidentMigration;
};

const mirrorPersistentResident = (resident) => {
  const existing = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(resident.email);
  if (existing) {
    db.prepare(`
      UPDATE users
      SET full_name = ?, username = ?, contact_number = ?, address = ?, barangay = ?,
          password_hash = ?, role = ?, status = ?, profile_photo_path = ?, created_at = ?, last_login = ?
      WHERE id = ?
    `).run(
      resident.full_name,
      resident.username || null,
      resident.contact_number || null,
      resident.address || null,
      resident.barangay || null,
      resident.password_hash,
      resident.role || 'resident',
      resident.status,
      resident.profile_photo_path || null,
      resident.created_at,
      resident.last_login || null,
      existing.id,
    );
    return db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
  }
  const result = db.prepare(`
    INSERT INTO users
      (full_name, username, email, contact_number, address, barangay, password_hash, role, status, profile_photo_path, created_at, last_login)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    resident.full_name,
    resident.username || null,
    resident.email,
    resident.contact_number || null,
    resident.address || null,
    resident.barangay || null,
    resident.password_hash,
    resident.role || 'resident',
    resident.status,
    resident.profile_photo_path || null,
    resident.created_at,
    resident.last_login || null,
  );
  return db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid));
};

const getUserByToken = async (token) => {
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const row = db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(tokenHash, now());
  if (row) return row;
  if (!residentStore) return null;
  await migrateLegacyResidents();
  const resident = await residentStore.findUserByToken(tokenHash, now());
  if (!resident) return null;
  const user = mirrorPersistentResident(resident);
  return { ...user, persistent_account_id: resident.id };
};

const publicUser = (u) => ({
  id: u.id,
  full_name: u.full_name,
  username: u.username || null,
  email: u.email,
  contact_number: u.contact_number,
  address: u.address,
  barangay: u.barangay,
  profile_photo_path: u.profile_photo_path,
  role: u.role,
  status: u.status,
  created_at: u.created_at,
  last_login: u.last_login,
  portal_path: ({
    resident: '/community',
    personnel: '/staff',
    administrator: '/admin',
    utility: '/admin',
  })[u.role] || '/community',
});

const ROLES = {
  resident: 'Resident',
  personnel: 'System Personnel',
  administrator: 'Administrator',
  utility: 'Authorized Utility Personnel',
};

const roleLabel = (role) => ROLES[role] || role;

const requireAuth = async (req, res, next) => {
  try {
    const user = await getUserByToken(req.cookies && req.cookies[COOKIE_NAME]);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });
    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'This account is deactivated. Contact the administrator.' });
    }
    req.user = { ...user, ip_address: req.ip || req.socket.remoteAddress || null };
    req.token = req.cookies[COOKIE_NAME];
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'You do not have permission to perform this action.' });
  }
  return next();
};

const audit = (user, action, detail) => {
  db.prepare(`
    INSERT INTO audit_logs (user_id, user_name, role, action, detail, created_at, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(user ? user.id : null, user ? user.full_name : 'System', user ? user.role : 'system', action, detail, now(), user?.ip_address || null);
};

const notifyUsers = (userIds, title, message, type = 'general') => {
  const stmt = db.prepare('INSERT INTO notifications (user_id, title, message, type, read, created_at) VALUES (?, ?, ?, ?, 0, ?)');
  for (const id of userIds) stmt.run(id, title, message, type, now());
};

const notifyRole = (role, title, message, type = 'general') => {
  const rows = db.prepare("SELECT id FROM users WHERE role = ? AND status = 'Active'").all(role).map(r => Number(r.id));
  notifyUsers(rows, title, message, type);
};

const notifyAllResidents = (title, message, type = 'general') => {
  const rows = db.prepare("SELECT id FROM users WHERE role = 'resident' AND status = 'Active'").all().map(r => Number(r.id));
  notifyUsers(rows, title, message, type);
};

const notifyAllStaff = (title, message, type = 'general') => {
  const rows = db.prepare("SELECT id FROM users WHERE role IN ('personnel', 'administrator', 'utility') AND status = 'Active'").all().map(r => Number(r.id));
  notifyUsers(rows, title, message, type);
};

const notifyAllActive = (title, message, type = 'general') => {
  const rows = db.prepare("SELECT id FROM users WHERE status = 'Active'").all().map(r => Number(r.id));
  notifyUsers(rows, title, message, type);
};

module.exports = {
  COOKIE_NAME,
  PORTAL_ROLES,
  isBuiltInAdmin,
  hasBuiltInAdminIdentifier,
  hashPassword,
  verifyPassword,
  createSession,
  createPersistentSession,
  destroySession,
  cleanupExpiredSessions,
  cleanupPersistentSessions,
  getUserByToken,
  migrateLegacyResidents,
  mirrorPersistentResident,
  residentStore,
  persistentAuthConfigured,
  persistentAuthRequired,
  publicUser,
  ROLES,
  roleLabel,
  requireAuth,
  requireRole,
  audit,
  notifyUsers,
  notifyRole,
  notifyAllResidents,
  notifyAllStaff,
  notifyAllActive,
};