const express = require('express');
const { db, VALENCIA_BARANGAYS } = require('../../db');
const { requireAuth, requireRole, audit } = require('../../middleware/auth');

const router = express.Router();

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

module.exports = router;
