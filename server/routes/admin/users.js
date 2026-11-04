const express = require('express');
const { db, now } = require('../../db');
const {
  isStaffContactEmail,
  isValidContactNumber,
  normalizeContactNumber,
  staffContactEmail,
} = require('../../services/staff-account-identity');
const {
  requireAuth, requireRole, audit, hashPassword, roleLabel, notifyUsers,
  isBuiltInAdmin, hasBuiltInAdminIdentifier, residentStore, migrateLegacyResidents,
  persistentAuthRequired,
} = require('../../middleware/auth');

const router = express.Router();

const userPublic = (u) => ({
  id: u.id, full_name: u.full_name, username: u.username || null,
  email: isStaffContactEmail(u.email) ? null : u.email, contact_number: u.contact_number,
  recovery_email: u.recovery_email || null, is_built_in_admin: isBuiltInAdmin(u),
  address: u.address, barangay: u.barangay, role: u.role, status: u.status,
  created_at: u.created_at, last_login: u.last_login,
});

const userIdentifier = (user) => isStaffContactEmail(user.email)
  ? user.contact_number || 'mobile login'
  : user.email || user.contact_number || 'account';

const ROLES = {
  resident: 'Resident',
  personnel: 'System Personnel',
  administrator: 'Administrator',
  utility: 'Authorized Utility Personnel',
};

const syncPersistentAccount = async (user, previousEmail = user.email) => {
  if (!residentStore) {
    if (persistentAuthRequired) throw new Error('Persistent account storage is not configured.');
    return;
  }
  await migrateLegacyResidents();
  let existing = await residentStore.findByEmail(previousEmail);
  if (!existing && user.role === 'personnel' && user.status !== 'Deleted') {
    existing = await residentStore.saveLegacyAccount(user);
  }
  if (!existing) return;
  const updated = await residentStore.updateAccount({ ...user, persistent_email: existing.email });
  if (!updated) throw new Error('Persistent account could not be synchronized.');
  if (updated.status !== 'Active' || updated.role !== existing.role) {
    await residentStore.deleteUserSessions(updated.id);
  }
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
router.post('/users', requireAuth, requireRole('administrator'), async (req, res, next) => {
  const {
    full_name, email, contact_number, address, role, password, confirm_password: confirmPassword,
    team_ids: teamIds, barangay_names: barangayNames,
  } = req.body || {};
  if (typeof full_name !== 'string' || !full_name.trim() || !password) {
    return res.status(400).json({ error: 'Name and password are required.' });
  }
  if (role !== 'personnel') return res.status(403).json({ error: 'Only staff accounts can be created here. Residents must register through the User Portal.' });
  if ((email != null && typeof email !== 'string') || (contact_number != null && typeof contact_number !== 'string')) {
    return res.status(400).json({ error: 'Email and mobile number must be text values.' });
  }
  const providedEmail = String(email || '').trim().toLowerCase();
  const cleanContact = String(contact_number || '').trim();
  if (providedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(providedEmail)) {
    return res.status(400).json({ error: 'Please provide a valid staff email address.' });
  }
  if (cleanContact && !isValidContactNumber(cleanContact)) {
    return res.status(400).json({ error: 'Please provide a valid mobile number.' });
  }
  if (!providedEmail && !cleanContact) {
    return res.status(400).json({ error: 'Provide either a staff email address or mobile number.' });
  }
  const cleanEmail = providedEmail || staffContactEmail(cleanContact);
  const normalizedContact = normalizeContactNumber(cleanContact);
  if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (typeof confirmPassword !== 'string' || password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }
  if (hasBuiltInAdminIdentifier({
    username: cleanEmail.split('@')[0],
    email: cleanEmail,
    contact_number: cleanContact,
  })) {
    return res.status(409).json({ error: 'That account identifier is reserved.' });
  }
  const requestedTeamIds = teamIds === undefined ? [] : teamIds;
  if (!Array.isArray(requestedTeamIds) || requestedTeamIds.length > 50
    || requestedTeamIds.some((id) => !(Number.isSafeInteger(id) && id > 0)
      && !(typeof id === 'string' && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))))) {
    return res.status(400).json({ error: 'Assign valid field teams or leave the team assignment empty.' });
  }
  if (!Array.isArray(barangayNames) || barangayNames.length < 1 || barangayNames.length > 100
    || barangayNames.some((name) => typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'Assign at least one active barangay or operational area to the staff account.' });
  }
  const uniqueTeamIds = [...new Set(requestedTeamIds.map(Number))];
  const uniqueBarangayNames = [...new Set(barangayNames.map((name) => name.trim()))];
  let limit;
  try {
    limit = staffAccountLimit();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  const validTeamIds = uniqueTeamIds.length
    ? db.prepare(`
      SELECT id FROM repair_teams WHERE status != 'Inactive' AND id IN (${uniqueTeamIds.map(() => '?').join(', ')})
    `).all(...uniqueTeamIds).map((team) => Number(team.id))
    : [];
  if (validTeamIds.length !== uniqueTeamIds.length) return res.status(400).json({ error: 'One or more selected field teams are not available.' });
  const validBarangays = db.prepare(`
    SELECT name FROM barangays WHERE status = 'Active' AND name IN (${uniqueBarangayNames.map(() => '?').join(', ')})
  `).all(...uniqueBarangayNames).map((area) => area.name);
  if (validBarangays.length !== uniqueBarangayNames.length) return res.status(400).json({ error: 'One or more selected barangays are not active.' });
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
  if (existing) return res.status(409).json({ error: 'An account with this email or mobile number already exists.' });
  if (normalizedContact) {
    const contactExists = db.prepare('SELECT contact_number FROM users WHERE contact_number IS NOT NULL').all()
      .some((user) => normalizeContactNumber(user.contact_number) === normalizedContact);
    if (contactExists) return res.status(409).json({ error: 'An account with this mobile number already exists.' });
  }
  if (persistentAuthRequired && !residentStore) {
    return res.status(503).json({ error: 'Persistent staff account storage is not configured. Please try again later.' });
  }
  if (residentStore) {
    try {
      const persistentMatches = await residentStore.findByIdentifier(cleanEmail, normalizedContact);
      const duplicate = persistentMatches.some((account) => (
        String(account.email || '').toLowerCase() === cleanEmail
        || (normalizedContact && normalizeContactNumber(account.contact_number) === normalizedContact)
      ));
      if (duplicate) return res.status(409).json({ error: 'An account with this email or mobile number already exists.' });
    } catch (error) {
      return next(error);
    }
  }
  const currentStaffCount = Number(db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'personnel' AND status != 'Deleted'").get().count);
  if (limit !== null && currentStaffCount >= limit) {
    return res.status(409).json({ error: `The configured staff account limit of ${limit} has been reached.` });
  }

  const timestamp = now();
  const passwordHash = hashPassword(password);
  const initialStatus = residentStore ? 'Inactive' : 'Active';
  let info;
  let persistentAccount = null;
  let transactionOpen = false;
  let localAccountCommitted = false;
  try {
    if (residentStore) {
      persistentAccount = await residentStore.createAccount({
        full_name: String(full_name).trim(),
        username: null,
        email: cleanEmail,
        role: 'personnel',
        contact_number: cleanContact || null,
        address: address ? String(address).trim() : null,
        barangay: validBarangays[0],
        password_hash: passwordHash,
        status: initialStatus,
        created_at: timestamp,
      });
    }
    db.exec('BEGIN IMMEDIATE');
    transactionOpen = true;
    const staffCount = Number(db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'personnel' AND status != 'Deleted'").get().count);
    if (limit !== null && staffCount >= limit) {
      const error = new Error(`The configured staff account limit of ${limit} has been reached.`);
      error.code = 'STAFF_ACCOUNT_LIMIT';
      throw error;
    }
    if (normalizedContact) {
      const contactExists = db.prepare('SELECT contact_number FROM users WHERE contact_number IS NOT NULL').all()
        .some((user) => normalizeContactNumber(user.contact_number) === normalizedContact);
      if (contactExists) {
        const error = new Error('An account with this mobile number already exists.');
        error.code = 'STAFF_CONTACT_DUPLICATE';
        throw error;
      }
    }
    info = db.prepare(`
      INSERT INTO users (full_name, email, contact_number, address, barangay, password_hash, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'personnel', ?, ?)
    `).run(String(full_name).trim(), cleanEmail, cleanContact || null,
      address ? String(address).trim() : null, validBarangays[0], passwordHash, initialStatus, timestamp);
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
    transactionOpen = false;
    localAccountCommitted = true;
    if (residentStore) {
      const activeAccount = await residentStore.updateAccount({ ...persistentAccount, status: 'Active' });
      if (!activeAccount) throw new Error('Persistent staff account could not be activated after local assignments were saved.');
      persistentAccount = activeAccount;
      db.prepare("UPDATE users SET status = 'Active' WHERE id = ?").run(Number(info.lastInsertRowid));
    }
  } catch (error) {
    if (transactionOpen) {
      db.exec('ROLLBACK');
      transactionOpen = false;
    }
    if (localAccountCommitted && info) {
      const localUserId = Number(info.lastInsertRowid);
      db.prepare("UPDATE users SET status = 'Deleted' WHERE id = ?").run(localUserId);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(localUserId);
    }
    if (persistentAccount) {
      try {
        const deactivated = await residentStore.updateAccount({ ...persistentAccount, status: 'Deleted' });
        if (!deactivated) throw new Error('Persistent account could not be deactivated after the local transaction failed.');
        await residentStore.deleteUserSessions(persistentAccount.id);
      } catch (cleanupError) {
        return next(new AggregateError([error, cleanupError], 'Staff account creation failed and the persistent account could not be safely deactivated.'));
      }
    }
    if (error.code === 'STAFF_ACCOUNT_LIMIT' || error.code === 'STAFF_CONTACT_DUPLICATE') {
      return res.status(409).json({ error: error.message });
    }
    if (error.code === '23505' || String(error.code || '').startsWith('SQLITE_CONSTRAINT')) {
      return res.status(409).json({ error: 'An account with this email or mobile number already exists.' });
    }
    return next(error);
  }

  const id = Number(info.lastInsertRowid);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const accountIdentifier = providedEmail || cleanContact;
  audit(req.user, 'User created', `${req.user.full_name} created ${roleLabel('personnel')} account for ${accountIdentifier} with ${validTeamIds.length} team(s) and ${validBarangays.length} barangay area(s).`);
  notifyUsers([id], 'Account created', `Your Valencia PowerWatch ${roleLabel(role)} account was created.`, 'system');

  res.status(201).json({
    user: userPublic(user),
    message: 'Staff account created with barangay access.',
    team_ids: validTeamIds,
    barangay_names: validBarangays,
  });
});

router.put('/users/:id', requireAuth, requireRole('administrator'), async (req, res, next) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (isBuiltInAdmin(user)) return res.status(403).json({ error: 'The built-in administrator account cannot be changed.' });
  const { full_name, contact_number, address, barangay, email } = req.body || {};
  const cleanContact = contact_number === undefined
    ? user.contact_number
    : String(contact_number || '').trim() || null;
  if (contact_number !== undefined && cleanContact && !isValidContactNumber(cleanContact)) {
    return res.status(400).json({ error: 'Please provide a valid mobile number.' });
  }
  if (cleanContact && hasBuiltInAdminIdentifier({ contact_number: cleanContact })) {
    return res.status(409).json({ error: 'That contact number is reserved.' });
  }
  const providedEmail = email === undefined ? null : String(email || '').trim().toLowerCase();
  if (providedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(providedEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (email !== undefined && !providedEmail && user.role !== 'personnel') {
    return res.status(400).json({ error: 'A valid email address is required for this account.' });
  }
  if (email !== undefined && !providedEmail && !cleanContact) {
    return res.status(400).json({ error: 'Provide either an email address or mobile number.' });
  }
  const cleanEmail = email === undefined
    ? user.email
    : providedEmail || staffContactEmail(cleanContact);
  if (email !== undefined && cleanEmail !== user.email.toLowerCase()) {
    const dup = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?').get(cleanEmail, user.id);
    if (dup) return res.status(409).json({ error: 'Another account uses this email or mobile number.' });
  }
  if (contact_number !== undefined && cleanContact) {
    const duplicateContact = db.prepare('SELECT id, contact_number FROM users WHERE id != ? AND contact_number IS NOT NULL').all(user.id)
      .some((row) => normalizeContactNumber(row.contact_number) === normalizeContactNumber(cleanContact));
    if (duplicateContact) return res.status(409).json({ error: 'Another account uses this mobile number.' });
    if (residentStore) {
      try {
        const persistentMatches = await residentStore.findByIdentifier(user.email, normalizeContactNumber(cleanContact));
        const persistentDuplicate = persistentMatches.some((account) => (
          String(account.email || '').toLowerCase() !== user.email.toLowerCase()
          && normalizeContactNumber(account.contact_number) === normalizeContactNumber(cleanContact)
        ));
        if (persistentDuplicate) return res.status(409).json({ error: 'Another account uses this mobile number.' });
      } catch (error) {
        return next(error);
      }
    }
  }
  try {
  db.prepare(`
    UPDATE users SET full_name = COALESCE(?, full_name),
      email = CASE WHEN ? = 1 THEN ? ELSE email END,
      contact_number = CASE WHEN ? = 1 THEN ? ELSE contact_number END,
      address = COALESCE(?, address),
      barangay = COALESCE(?, barangay) WHERE id = ?
  `).run(
    full_name || null,
    email === undefined ? 0 : 1,
    email === undefined ? null : cleanEmail,
    contact_number === undefined ? 0 : 1,
    cleanContact,
    address || null,
    barangay || null,
    user.id,
  );
  audit(req.user, 'User edited', `${req.user.full_name} edited account of ${userIdentifier(user)}.`);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  await syncPersistentAccount(updated, user.email);
  res.json({ user: userPublic(updated), message: 'User updated.' });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Another account uses this email.' });
    return next(error);
  }
});

router.put('/users/:id/status', requireAuth, requireRole('administrator'), async (req, res, next) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (isBuiltInAdmin(user)) return res.status(403).json({ error: 'The built-in administrator account cannot be deactivated.' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  const { status } = req.body || {};
  if (!['Active', 'Inactive'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  try {
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  await syncPersistentAccount(updated);
  audit(req.user, 'Account status changed', `Account of ${userIdentifier(user)} set to ${status}.`);
  notifyUsers([user.id], 'Account status', `Your account has been ${status === 'Active' ? 'activated' : 'deactivated'}.`, 'system');
  return res.json({ user: userPublic(updated), message: `Account ${status === 'Active' ? 'activated' : 'deactivated'}.` });
  } catch (error) {
    return next(error);
  }
});

router.delete('/users/:id', requireAuth, requireRole('administrator'), async (req, res, next) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (isBuiltInAdmin(user)) return res.status(403).json({ error: 'The built-in administrator account cannot be deleted.' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own administrator account.' });

  try {
  db.prepare("UPDATE users SET status = 'Deleted' WHERE id = ?").run(user.id);
  const deleted = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  await syncPersistentAccount(deleted);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM staff_team_members WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM staff_barangay_assignments WHERE user_id = ?').run(user.id);
  audit(req.user, 'User deleted', `${req.user.full_name} deleted account ${userIdentifier(user)}; historical reports were retained.`);
  return res.json({ message: 'Account deleted. Historical report attribution was preserved.' });
  } catch (error) {
    return next(error);
  }
});

router.put('/users/:id/role', requireAuth, requireRole('administrator'), async (req, res, next) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (isBuiltInAdmin(user)) return res.status(403).json({ error: 'The built-in administrator role cannot be altered.' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role.' });
  const { role } = req.body || {};
  if (!ROLES[role]) return res.status(400).json({ error: 'Invalid role.' });
  if (role === 'personnel' && user.role !== 'personnel') {
    return res.status(409).json({ error: 'Create a staff account through Add Staff so team and barangay access are configured at the same time.' });
  }
  try {
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  await syncPersistentAccount(updated);
  if (role !== 'personnel') {
    db.prepare('DELETE FROM staff_team_members WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM staff_barangay_assignments WHERE user_id = ?').run(user.id);
  }
  audit(req.user, 'Role changed', `Role of ${userIdentifier(user)} changed to ${roleLabel(role)}.`);
  notifyUsers([user.id], 'Role updated', `Your role is now ${roleLabel(role)}.`, 'system');
  return res.json({ user: userPublic(updated), message: 'Role updated.' });
  } catch (error) {
    return next(error);
  }
});

// Reset account password
router.put('/users/:id/reset', requireAuth, requireRole('administrator'), async (req, res, next) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (isBuiltInAdmin(user)) return res.status(403).json({ error: 'The built-in administrator password cannot be reset here.' });
  const { new_password } = req.body || {};
  if (!new_password || String(new_password).length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  try {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(new_password), user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  await syncPersistentAccount(updated);
  if (residentStore) {
    const persistentUser = await residentStore.findByEmail(updated.email);
    if (persistentUser) await residentStore.deleteUserSessions(persistentUser.id);
  }
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  audit(req.user, 'Account reset', `Password reset for ${userIdentifier(user)}.`);
  return res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
