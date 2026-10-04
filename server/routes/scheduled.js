const express = require('express');
const { db, now, nextCode } = require('../db');
const { requireAuth, requireRole, audit, notifyRole, notifyAllResidents } = require('../auth');

const router = express.Router();

const STATUS_OPTIONS = [
  'Scheduled', 'In Preparation', 'Being Implemented', 'Completed', 'Cancelled',
];

const clean = (value) => (value === undefined || value === null ? null : String(value).trim() || null);

const rowById = (id) => {
  const row = db.prepare('SELECT * FROM scheduled_outages WHERE id = ?').get(Number(id));
  if (!row) return null;
  const createdBy = db.prepare('SELECT full_name FROM users WHERE id = ?').get(row.created_by);
  return { ...row, created_by_name: createdBy ? createdBy.full_name : null };
};

const getUpcoming = () => {
  const today = now().slice(0, 10);
  return db.prepare(`
    SELECT * FROM scheduled_outages
    WHERE status IN ('Scheduled', 'In Preparation') AND outage_date >= ?
    ORDER BY outage_date, start_time
  `).all(today);
};

// Create a scheduled outage (personnel / utility / administrator)
router.post('/', requireAuth, requireRole('personnel', 'utility', 'administrator'), (req, res) => {
  const { title, barangay, area, outage_date, start_time, expected_end_time, reason } = req.body || {};

  if (!title || !barangay || !outage_date || !start_time) {
    return res.status(400).json({ error: 'Title, barangay, date, and start time are required.' });
  }

  const code = nextCode('SCH');
  const ts = now();

  const info = db.prepare(`
    INSERT INTO scheduled_outages (schedule_code, title, barangay, area, outage_date, start_time, expected_end_time,
      reason, status, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?, ?)
  `).run(
    code, String(title).trim(), barangay, clean(area), outage_date, start_time,
    clean(expected_end_time), clean(reason), req.user.id, ts, ts
  );

  audit(req.user, 'Scheduled outage created', `Scheduled outage ${code} (${barangay}) created.`);
  notifyRole('personnel', 'Scheduled outage created', `Scheduled outage ${code} in ${barangay} was created by ${req.user.full_name}.`, 'scheduled');
  notifyRole('administrator', 'Scheduled outage created', `Scheduled outage ${code} in ${barangay} was created by ${req.user.full_name}.`, 'scheduled');

  res.status(201).json({ scheduled: rowById(info.lastInsertRowid), message: 'Scheduled outage created.' });
});

// List scheduled outages (all authenticated users)
router.get('/', requireAuth, (req, res) => {
  const { barangay, status, q } = req.query;
  const where = [];
  const params = [];
  if (barangay) { where.push('barangay = ?'); params.push(barangay); }
  if (status) { where.push('status = ?'); params.push(status); }
  if (q) { where.push('(title LIKE ? OR barangay LIKE ? OR area LIKE ? OR reason LIKE ?)'); const like = `%${q}%`; params.push(like, like, like, like); }

  const rows = db.prepare(`
    SELECT * FROM scheduled_outages
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY outage_date, start_time
  `).all(...params);

  res.json({ scheduled: rows, statuses: STATUS_OPTIONS });
});

router.get('/upcoming', requireAuth, (req, res) => {
  res.json({ scheduled: getUpcoming() });
});

router.get('/:id', requireAuth, (req, res) => {
  const row = rowById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Scheduled outage not found.' });
  res.json({ scheduled: row });
});

// Edit a scheduled outage
router.put('/:id', requireAuth, requireRole('personnel', 'utility', 'administrator'), (req, res) => {
  const row = rowById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Scheduled outage not found.' });
  const { title, barangay, area, outage_date, start_time, expected_end_time, reason } = req.body || {};

  db.prepare(`
    UPDATE scheduled_outages SET title = COALESCE(?, title), barangay = COALESCE(?, barangay), area = COALESCE(?, area),
      outage_date = COALESCE(?, outage_date), start_time = COALESCE(?, start_time),
      expected_end_time = COALESCE(?, expected_end_time), reason = COALESCE(?, reason), updated_at = ?
    WHERE id = ?
  `).run(clean(title), clean(barangay), area === undefined ? null : clean(area), clean(outage_date), clean(start_time), clean(expected_end_time), clean(reason), now(), row.id);

  audit(req.user, 'Scheduled outage edited', `Scheduled outage ${row.schedule_code} edited.`);
  res.json({ scheduled: rowById(row.id), message: 'Scheduled outage updated.' });
});

// Cancel / change schedule status; residents are notified on cancellation.
router.put('/:id/status', requireAuth, requireRole('personnel', 'utility', 'administrator'), (req, res) => {
  const row = rowById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Scheduled outage not found.' });
  const { status, reason } = req.body || {};
  if (!STATUS_OPTIONS.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

  db.prepare('UPDATE scheduled_outages SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), row.id);

  const message = status === 'Cancelled'
    ? `The scheduled outage in ${row.barangay} on ${row.outage_date} has been cancelled.`
    : `Scheduled outage ${row.schedule_code} in ${row.barangay} is now "${status}".`;

  audit(req.user, `Scheduled outage ${status}`, `Scheduled outage ${row.schedule_code} set to ${status}.`);
  notifyAllResidents('Scheduled outage update', message + (reason ? ` Reason: ${reason}` : ''), 'scheduled');

  res.json({ scheduled: rowById(row.id), message });
});

// Convert a scheduled outage into an active incident when it begins (utility / administrator)
router.post('/:id/trigger-incident', requireAuth, requireRole('utility', 'administrator'), (req, res) => {
  const sched = rowById(req.params.id);
  if (!sched) return res.status(404).json({ error: 'Scheduled outage not found.' });
  if (sched.status === 'Cancelled') {
    return res.status(400).json({ error: 'This scheduled outage has been cancelled.' });
  }
  const existingIncident = db.prepare(`
    SELECT id, incident_code FROM outage_incidents WHERE scheduled_id = ? ORDER BY id DESC LIMIT 1
  `).get(sched.id);
  if (existingIncident) {
    return res.status(409).json({
      error: `This scheduled outage already has incident ${existingIncident.incident_code}.`,
      incident_id: existingIncident.id,
    });
  }

  const ts = now();
  const code = nextCode('OUT');
  let startTime = new Date(`${sched.outage_date}T${String(sched.start_time).slice(0, 5)}`).toISOString();
  if (Number.isNaN(new Date(startTime).getTime())) startTime = ts;
  let estimated = null;
  if (sched.expected_end_time) {
    const est = new Date(`${sched.outage_date}T${String(sched.expected_end_time).slice(0, 5)}`).toISOString();
    if (!Number.isNaN(new Date(est).getTime())) estimated = est;
  }

  const info = db.prepare(`
    INSERT INTO outage_incidents (incident_code, title, barangay, location, affected_area, incident_type, cause_category,
      status, start_time, estimated_restoration, remarks, scheduled_id, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Ongoing', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    code, sched.title, sched.barangay, sched.area || sched.barangay, sched.area,
    'Scheduled', 'Scheduled Maintenance', startTime, estimated, sched.reason, sched.id, req.user.id, ts, ts
  );

  const incidentId = Number(info.lastInsertRowid);
  db.prepare("UPDATE scheduled_outages SET status = 'Being Implemented', updated_at = ? WHERE id = ?").run(ts, sched.id);

  const incident = db.prepare('SELECT * FROM outage_incidents WHERE id = ?').get(incidentId);
  audit(req.user, 'Scheduled outage started', `Scheduled outage ${sched.schedule_code} started and assigned incident ${code}.`);
  notifyAllResidents('Scheduled outage underway', `The scheduled interruption in ${sched.barangay} has started (${sched.outage_date}).`, 'scheduled');

  res.status(201).json({ incident, scheduled: rowById(sched.id), message: 'Scheduled outage started and monitored as an incident.' });
});

module.exports = router;