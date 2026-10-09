const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { db, now, DB_PATH, seedIfFresh, VALENCIA_BARANGAYS } = require('../db');
const {
  requireAuth, requireRole, audit, hashPassword, roleLabel,
  notifyUsers, notifyRole, clearDBTables, isBuiltInAdmin, hasBuiltInAdminIdentifier,
} = require('../auth');
const { staffBarangaysFor } = require('../staff-access');

const router = express.Router();

const userPublic = (u) => ({
  id: u.id, full_name: u.full_name, username: u.username || null, email: u.email, contact_number: u.contact_number,
  address: u.address, barangay: u.barangay, role: u.role, status: u.status,
  created_at: u.created_at, last_login: u.last_login,
});

const ROLES = {
  resident: 'Resident',
  personnel: 'System Personnel',
  administrator: 'Administrator',
  utility: 'Authorized Utility Personnel',
};

const staffAccountLimit = () => {
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'staff_account_limit'").get();
  if (!setting) return null;
  const value = JSON.parse(setting.value);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('The configured staff account limit is invalid. Update the staff account limit in system settings.');
  }
  return value;
};

// ---------------- Users ----------------

router.get('/users', requireAuth, requireRole('administrator'), (req, res) => {
  const { role, status, q } = req.query;
  const where = [];
  const params = [];
  if (role && role !== 'all') { where.push('u.role = ?'); params.push(role); }
  if (status && status !== 'all') { where.push('u.status = ?'); params.push(status); }
  else where.push("u.status != 'Deleted'");
  if (q) { where.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.contact_number LIKE ? OR u.barangay LIKE ?)'); const like = `%${q}%`; params.push(like, like, like, like); }
  const rows = db.prepare(`SELECT * FROM users u ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY u.created_at DESC`).all(...params);
  const staff = db.prepare("SELECT id, status FROM users WHERE role = 'personnel' AND status != 'Deleted'").all();
  const staffIds = staff.map((user) => Number(user.id));
  const assignments = staffIds.length
    ? db.prepare(`SELECT user_id, team_id FROM staff_team_members WHERE user_id IN (${staffIds.map(() => '?').join(', ')})`).all(...staffIds)
    : [];
  const assignedAreas = staffIds.length
    ? db.prepare(`SELECT user_id, barangay FROM staff_barangay_assignments WHERE user_id IN (${staffIds.map(() => '?').join(', ')})`).all(...staffIds)
    : [];
  let limit;
  try {
    limit = staffAccountLimit();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({
    users: rows.map(userPublic),
    roles: ROLES,
    staff_summary: {
      total: staff.length,
      active: staff.filter((user) => user.status === 'Active').length,
      inactive: staff.filter((user) => user.status !== 'Active').length,
      assigned_teams: new Set(assignments.map((assignment) => Number(assignment.team_id))).size,
      assigned_barangays: new Set(assignedAreas.map((area) => area.barangay)).size,
      account_limit: limit,
    },
  });
});

// Residents register through the User Portal; this endpoint only provisions staff.
router.post('/users', requireAuth, requireRole('administrator'), (req, res) => {
  const { full_name, email, contact_number, address, role, password, team_ids: teamIds, barangay_names: barangayNames } = req.body || {};
  if (!full_name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required.' });
  if (role !== 'personnel') return res.status(403).json({ error: 'Only staff accounts can be created here. Residents must register through the User Portal.' });
  const cleanEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({ error: 'Please provide a valid staff email address.' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (hasBuiltInAdminIdentifier({
    username: cleanEmail.split('@')[0],
    email: cleanEmail,
    contact_number,
  })) {
    return res.status(409).json({ error: 'That account identifier is reserved.' });
  }
  if (!Array.isArray(teamIds) || teamIds.length < 1 || teamIds.length > 50
    || teamIds.some((id) => !(Number.isSafeInteger(id) && id > 0)
      && !(typeof id === 'string' && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))))) {
    return res.status(400).json({ error: 'Assign at least one valid field team to the staff account.' });
  }
  if (!Array.isArray(barangayNames) || barangayNames.length < 1 || barangayNames.length > 100
    || barangayNames.some((name) => typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'Assign at least one active barangay or operational area to the staff account.' });
  }
  const uniqueTeamIds = [...new Set(teamIds.map(Number))];
  const uniqueBarangayNames = [...new Set(barangayNames.map((name) => name.trim()))];
  let limit;
  try {
    limit = staffAccountLimit();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  const validTeamIds = db.prepare(`
    SELECT id FROM repair_teams WHERE status != 'Inactive' AND id IN (${uniqueTeamIds.map(() => '?').join(', ')})
  `).all(...uniqueTeamIds).map((team) => Number(team.id));
  if (validTeamIds.length !== uniqueTeamIds.length) return res.status(400).json({ error: 'One or more selected field teams are not available.' });
  const validBarangays = db.prepare(`
    SELECT name FROM barangays WHERE status = 'Active' AND name IN (${uniqueBarangayNames.map(() => '?').join(', ')})
  `).all(...uniqueBarangayNames).map((area) => area.name);
  if (validBarangays.length !== uniqueBarangayNames.length) return res.status(400).json({ error: 'One or more selected barangays are not active.' });
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const timestamp = now();
  let info;
  db.exec('BEGIN IMMEDIATE');
  try {
    const staffCount = Number(db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'personnel' AND status != 'Deleted'").get().count);
    if (limit !== null && staffCount >= limit) {
      db.exec('ROLLBACK');
      return res.status(409).json({ error: `The configured staff account limit of ${limit} has been reached.` });
    }
    info = db.prepare(`
      INSERT INTO users (full_name, email, contact_number, address, barangay, password_hash, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'personnel', 'Active', ?)
    `).run(String(full_name).trim(), cleanEmail, contact_number ? String(contact_number).trim() : null,
      address ? String(address).trim() : null, validBarangays[0], hashPassword(password), timestamp);
    const userId = Number(info.lastInsertRowid);
    const addTeam = db.prepare(`
      INSERT INTO staff_team_members (user_id, team_id, assigned_by, assigned_at) VALUES (?, ?, ?, ?)
    `);
    for (const teamId of validTeamIds) addTeam.run(userId, teamId, req.user.id, timestamp);
    const addBarangay = db.prepare(`
      INSERT INTO staff_barangay_assignments (user_id, barangay, assigned_by, assigned_at) VALUES (?, ?, ?, ?)
    `);
    for (const area of validBarangays) addBarangay.run(userId, area, req.user.id, timestamp);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    if (String(error.code || '').startsWith('SQLITE_CONSTRAINT')) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    throw error;
  }

  const id = Number(info.lastInsertRowid);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  audit(req.user, 'User created', `${req.user.full_name} created ${roleLabel('personnel')} account for ${user.email} with ${validTeamIds.length} team(s) and ${validBarangays.length} barangay area(s).`);
  notifyUsers([id], 'Account created', `Your Valencia PowerWatch ${roleLabel(role)} account was created.`, 'system');

  res.status(201).json({
    user: userPublic(user),
    message: 'Staff account created with team and barangay access.',
    team_ids: validTeamIds,
    barangay_names: validBarangays,
  });
});

router.put('/users/:id', requireAuth, requireRole('administrator'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (isBuiltInAdmin(user)) return res.status(403).json({ error: 'The built-in administrator account cannot be changed.' });
  const { full_name, contact_number, address, barangay, email } = req.body || {};
  if (contact_number && hasBuiltInAdminIdentifier({ contact_number })) {
    return res.status(409).json({ error: 'That contact number is reserved.' });
  }
  let cleanEmail = email === undefined ? user.email : String(email).trim().toLowerCase();
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (email !== undefined && cleanEmail !== user.email.toLowerCase()) {
    const dup = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?').get(cleanEmail, user.id);
    if (dup) return res.status(409).json({ error: 'Another account uses this email.' });
  }
  db.prepare(`
    UPDATE users SET full_name = COALESCE(?, full_name), email = COALESCE(?, email),
      contact_number = COALESCE(?, contact_number), address = COALESCE(?, address),
      barangay = COALESCE(?, barangay) WHERE id = ?
  `).run(full_name || null, email === undefined ? null : cleanEmail, contact_number || null, address || null, barangay || null, user.id);
  audit(req.user, 'User edited', `${req.user.full_name} edited account of ${user.email}.`);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ user: userPublic(updated), message: 'User updated.' });
});

router.put('/users/:id/status', requireAuth, requireRole('administrator'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (isBuiltInAdmin(user)) return res.status(403).json({ error: 'The built-in administrator account cannot be deactivated.' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  const { status } = req.body || {};
  if (!['Active', 'Inactive'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, user.id);
  audit(req.user, 'Account status changed', `Account of ${user.email} set to ${status}.`);
  notifyUsers([user.id], 'Account status', `Your account has been ${status === 'Active' ? 'activated' : 'deactivated'}.`, 'system');
  res.json({ user: userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)), message: `Account ${status === 'Active' ? 'activated' : 'deactivated'}.` });
});

router.delete('/users/:id', requireAuth, requireRole('administrator'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (isBuiltInAdmin(user)) return res.status(403).json({ error: 'The built-in administrator account cannot be deleted.' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own administrator account.' });

  db.prepare("UPDATE users SET status = 'Deleted' WHERE id = ?").run(user.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM staff_team_members WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM staff_barangay_assignments WHERE user_id = ?').run(user.id);
  audit(req.user, 'User deleted', `${req.user.full_name} deleted account ${user.email}; historical reports were retained.`);
  res.json({ message: 'Account deleted. Historical report attribution was preserved.' });
});

router.put('/users/:id/role', requireAuth, requireRole('administrator'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (isBuiltInAdmin(user)) return res.status(403).json({ error: 'The built-in administrator role cannot be altered.' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role.' });
  const { role } = req.body || {};
  if (!ROLES[role]) return res.status(400).json({ error: 'Invalid role.' });
  if (role === 'personnel' && user.role !== 'personnel') {
    return res.status(409).json({ error: 'Create a staff account through Add Staff so team and barangay access are configured at the same time.' });
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
  if (role !== 'personnel') {
    db.prepare('DELETE FROM staff_team_members WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM staff_barangay_assignments WHERE user_id = ?').run(user.id);
  }
  audit(req.user, 'Role changed', `Role of ${user.email} changed to ${roleLabel(role)}.`);
  notifyUsers([user.id], 'Role updated', `Your role is now ${roleLabel(role)}.`, 'system');
  res.json({ user: userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)), message: 'Role updated.' });
});

// Reset account password
router.put('/users/:id/reset', requireAuth, requireRole('administrator'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (isBuiltInAdmin(user)) return res.status(403).json({ error: 'The built-in administrator password cannot be reset here.' });
  const { new_password } = req.body || {};
  if (!new_password || String(new_password).length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(new_password), user.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  audit(req.user, 'Account reset', `Password reset for ${user.email}.`);
  res.json({ message: 'Password reset successfully.' });
});

// ---------------- Barangays / Locations ----------------

router.get('/barangays', requireAuth, requireRole('administrator'), (req, res) => {
  const rows = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM outage_reports r WHERE r.barangay = b.name) AS report_count,
      (SELECT COUNT(*) FROM users u WHERE u.barangay = b.name AND u.status = 'Active' AND u.role IN ('personnel','utility','administrator')) AS personnel_count
    FROM barangays b ORDER BY b.name
  `).all();
  res.json({ barangays: rows });
});

router.post('/barangays', requireAuth, requireRole('administrator'), (req, res) => {
  const { name, area_description, population, latitude, longitude } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Barangay name is required.' });
  const dup = db.prepare('SELECT id FROM barangays WHERE LOWER(name) = LOWER(?)').get(name);
  if (dup) return res.status(409).json({ error: 'This barangay already exists.' });
  const info = db.prepare('INSERT INTO barangays (name, area_description, population, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(String(name).trim(), area_description || null, population === '' || population === undefined ? null : Number(population), latitude === '' || latitude === undefined ? null : Number(latitude), longitude === '' || longitude === undefined ? null : Number(longitude), 'Active');
  audit(req.user, 'Location added', `Barangay ${name} added by ${req.user.full_name}.`);
  res.status(201).json({ barangay: db.prepare('SELECT * FROM barangays WHERE id = ?').get(Number(info.lastInsertRowid)), message: 'Barangay added.' });
});

router.put('/barangays/:id', requireAuth, requireRole('administrator'), (req, res) => {
  const row = db.prepare('SELECT * FROM barangays WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Barangay not found.' });
  const { name, area_description, population, latitude, longitude, status } = req.body || {};
  if (name) {
    const dup = db.prepare('SELECT id FROM barangays WHERE LOWER(name) = LOWER(?) AND id != ?').get(name, row.id);
    if (dup) return res.status(409).json({ error: 'This barangay already exists.' });
  }
  db.prepare(`
    UPDATE barangays SET name = COALESCE(?, name), area_description = COALESCE(?, area_description),
      population = COALESCE(?, population), latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(name || null, area_description || null, population === '' || population === undefined ? null : Number(population), latitude === '' || latitude === undefined ? null : Number(latitude), longitude === '' || longitude === undefined ? null : Number(longitude), status || null, row.id);
  audit(req.user, 'Location updated', `Barangay ${row.name} updated.`);
  res.json({ barangay: db.prepare('SELECT * FROM barangays WHERE id = ?').get(row.id), message: 'Barangay updated.' });
});

router.delete('/barangays/:id', requireAuth, requireRole('administrator'), (req, res) => {
  const barangay = db.prepare('SELECT * FROM barangays WHERE id = ?').get(Number(req.params.id));
  if (!barangay) return res.status(404).json({ error: 'Barangay not found.' });
  const dependencies = {
    reports: Number(db.prepare('SELECT COUNT(*) AS c FROM outage_reports WHERE barangay = ?').get(barangay.name).c),
    users: Number(db.prepare("SELECT COUNT(*) AS c FROM users WHERE barangay = ? AND status != 'Deleted'").get(barangay.name).c),
    incidents: Number(db.prepare('SELECT COUNT(*) AS c FROM outage_incidents WHERE barangay = ? OR id IN (SELECT incident_id FROM incident_areas WHERE barangay = ?)').get(barangay.name, barangay.name).c),
    schedules: Number(db.prepare('SELECT COUNT(*) AS c FROM scheduled_outages WHERE barangay = ?').get(barangay.name).c),
  };
  const dependencyCount = Object.values(dependencies).reduce((sum, count) => sum + count, 0);
  if (dependencyCount) return res.status(409).json({ error: `Cannot delete ${barangay.name}: ${dependencyCount} user, report, incident, or schedule record(s) still reference it. Deactivate the barangay instead.` });
  db.prepare('DELETE FROM barangays WHERE id = ?').run(barangay.id);
  audit(req.user, 'Location deleted', `Barangay ${barangay.name} deleted by ${req.user.full_name}.`);
  res.json({ message: `Barangay ${barangay.name} deleted.` });
});

// ---------------- System settings ----------------

const SETTING_KEYS = ['outage_types', 'inactive_outage_types', 'incident_categories', 'announcement_categories', 'system_info', 'notification_settings', 'map_settings', 'staff_account_limit'];

router.get('/settings', requireAuth, requireRole('administrator'), (req, res) => {
  const settings = {};
  for (const key of SETTING_KEYS) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    settings[key] = row ? JSON.parse(row.value) : null;
  }
  res.json({ settings, available_barangays: VALENCIA_BARANGAYS, keys: SETTING_KEYS });
});

router.put('/settings', requireAuth, requireRole('administrator'), (req, res) => {
  const { key, value } = req.body || {};
  if (!SETTING_KEYS.includes(key)) return res.status(400).json({ error: 'Unknown setting key.' });
  if (key === 'staff_account_limit') {
    if (value !== null && (!Number.isSafeInteger(value) || value < 0)) {
      return res.status(400).json({ error: 'Staff account limit must be a non-negative whole number or null for unlimited.' });
    }
    if (value !== null) {
      const currentStaffCount = Number(db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'personnel' AND status != 'Deleted'").get().count);
      if (value < currentStaffCount) {
        return res.status(409).json({ error: `The limit cannot be lower than the ${currentStaffCount} existing staff accounts.` });
      }
    }
    if (value === null) db.prepare("DELETE FROM settings WHERE key = 'staff_account_limit'").run();
    else db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
  } else {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
  }
  audit(req.user, 'Settings updated', `${key} setting updated by ${req.user.full_name}.`);
  res.json({ message: 'Setting saved.' });
});

// ---------------- Audit logs ----------------

router.get('/audit-logs', requireAuth, requireRole('administrator'), (req, res) => {
  const { action, q, from = '', to = '' } = req.query;
  const where = [];
  const params = [];
  if (action && action !== 'all') { where.push('action = ?'); params.push(action); }
  if (q) { where.push('(user_name LIKE ? OR detail LIKE ? OR action LIKE ? OR ip_address LIKE ?)'); const like = `%${q}%`; params.push(like, like, like, like); }
  const isDate = (value) => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  if (!isDate(from) || !isDate(to)) return res.status(400).json({ error: 'Dates must use a valid YYYY-MM-DD format.' });
  if (from && to && from > to) return res.status(400).json({ error: 'Start date must be on or before the end date.' });
  if (from) { where.push('date(created_at) >= date(?)'); params.push(from); }
  if (to) { where.push('date(created_at) <= date(?)'); params.push(to); }

  const filterSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = Number(db.prepare(`SELECT COUNT(*) AS c FROM audit_logs ${filterSql}`).get(...params).c);
  const pageSizeOptions = [5, 10, 25, 50];
  const pageSize = pageSizeOptions.includes(Number(req.query.pageSize)) ? Number(req.query.pageSize) : 5;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Number(req.query.page) || 1), pageCount);
  const exportLimit = req.query.limit ? Math.min(Math.max(1, Number(req.query.limit) || 5000), 5000) : pageSize;
  const offset = req.query.limit ? Math.max(0, Number(req.query.offset) || 0) : (page - 1) * pageSize;
  const rows = db.prepare(`
    SELECT * FROM audit_logs ${filterSql}
    ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?
  `).all(...params, exportLimit, offset);
  res.json({ logs: rows, total, page, pageSize, pageCount });
});

router.delete('/audit-logs', requireAuth, requireRole('administrator'), (req, res) => {
  db.exec("DELETE FROM audit_logs; DELETE FROM sqlite_sequence WHERE name = 'audit_logs';");
  res.json({ message: 'Audit logs cleared successfully.' });
});

// ---------------- Data maintenance ----------------

// Reset demonstration data (keeps accounts) and reload fresh seed content
router.post('/maintenance/seed', requireAuth, requireRole('administrator'), (req, res) => {
  clearDBTables();
  seedIfFresh();
  audit(req.user, 'Data maintenance', `${req.user.full_name} reset demonstration data to factory seed.`);
  res.json({ message: 'Demonstration data reset to the original seed content.' });
});

// Download database backup
router.get('/backup', requireAuth, requireRole('administrator'), (req, res) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  res.download(DB_PATH, `valencia-powerwatch-${stamp}.db`);
});

// ---------------- Real-Time Telemetry & Audio Ping Heartbeat ----------------
router.get('/telemetry-heartbeat', requireAuth, requireRole('administrator', 'personnel', 'utility'), (req, res) => {
  const sinceId = Number(req.query.since_report_id) || 0;

  const maxRow = db.prepare('SELECT MAX(id) AS max_id FROM outage_reports').get();
  const latestReportId = maxRow && maxRow.max_id ? Number(maxRow.max_id) : 0;

  const newReports = (sinceId > 0 && latestReportId > sinceId)
    ? db.prepare(`
        SELECT r.id, r.report_code, r.barangay, r.location, r.description, r.status, r.verification_status,
               r.possible_outage_type, r.reported_at, u.full_name AS reporter_name
        FROM outage_reports r
        LEFT JOIN users u ON u.id = r.reporter_id
        WHERE r.id > ?
        ORDER BY r.id DESC
        LIMIT 10
      `).all(sinceId)
    : [];

  const pendingReportsCount = db.prepare("SELECT COUNT(*) AS c FROM outage_reports WHERE verification_status = 'Pending' OR status = 'Submitted'").get().c;
  const activeIncidentsCount = db.prepare("SELECT COUNT(*) AS c FROM outage_incidents WHERE status IN ('Ongoing', 'Restoration in Progress')").get().c;
  const ongoingRepairsCount = db.prepare("SELECT COUNT(*) AS c FROM repair_assignments WHERE status IN ('Dispatched', 'En Route', 'Arrived On Site', 'In Progress')").get().c;
  const unreadNotifsCount = db.prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0").get(req.user.id).c;

  res.json({
    latestReportId,
    newReports,
    metrics: {
      pendingReports: Number(pendingReportsCount),
      activeIncidents: Number(activeIncidentsCount),
      ongoingRepairs: Number(ongoingRepairsCount),
      unreadNotifications: Number(unreadNotifsCount),
    },
    serverTime: now(),
  });
});

module.exports = router;