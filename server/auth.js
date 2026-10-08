const crypto = require('node:crypto');
const { db, now } = require('./db');

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
    .run(token, userId, now(), expiresAt);
  return token;
};

const destroySession = (token) => {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
};

const cleanupExpiredSessions = () => {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now());
};

const getUserByToken = (token) => {
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, now());
  return row || null;
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

const requireAuth = (req, res, next) => {
  const user = getUserByToken(req.cookies && req.cookies[COOKIE_NAME]);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (user.status !== 'Active') {
    return res.status(403).json({ error: 'This account is deactivated. Contact the administrator.' });
  }
  req.user = { ...user, ip_address: req.ip || req.socket.remoteAddress || null };
  req.token = req.cookies[COOKIE_NAME];
  return next();
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

const clearDBTables = () => {
  db.exec(`
    DELETE FROM oauth_states;
    DELETE FROM incident_links;
    DELETE FROM incident_areas;
    DELETE FROM report_attachments;
    DELETE FROM outage_reports;
    DELETE FROM outage_incidents;
    DELETE FROM scheduled_outages;
    DELETE FROM announcements;
    DELETE FROM notifications;
    DELETE FROM citizen_feedback;
    DELETE FROM sms_logs;
    DELETE FROM audit_logs;
    DELETE FROM sessions;
    DELETE FROM oauth_accounts;
    DELETE FROM password_reset_tokens;
    DELETE FROM settings WHERE key = 'seed_version';
    DELETE FROM sqlite_sequence WHERE name IN (
      'outage_reports','outage_incidents','incident_links','incident_areas',
      'scheduled_outages','announcements','notifications','audit_logs',
      'citizen_feedback','sms_logs','report_attachments','sessions','oauth_accounts'
    );
  `);
};

module.exports = {
  COOKIE_NAME,
  PORTAL_ROLES,
  isBuiltInAdmin,
  hasBuiltInAdminIdentifier,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  cleanupExpiredSessions,
  getUserByToken,
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
  clearDBTables,
};