const express = require('express');
const { db, now, nextCode } = require('../db');
const { requireAuth, requireRole, audit, notifyUsers } = require('../auth');
const { sendSMS } = require('../sms');
const { calculateETR } = require('../etr');

const router = express.Router();

const INCIDENT_STATUSES = [
  'Reported', 'Under Verification', 'Verified', 'Ongoing',
  'Restoration in Progress', 'Restored', 'Closed',
];

const incidentRow = (id) => {
  const incident = db.prepare(`
    SELECT i.*, s.title AS scheduled_title, s.outage_date AS scheduled_date, s.start_time AS scheduled_start,
           s.expected_end_time AS scheduled_end, s.reason AS scheduled_reason, u.full_name AS created_by_name
    FROM outage_incidents i
    LEFT JOIN scheduled_outages s ON s.id = i.scheduled_id
    LEFT JOIN users u ON u.id = i.created_by
    WHERE i.id = ?
  `).get(id);
  if (!incident) return null;
  incident.linked_reports = db.prepare(`
    SELECT r.id, r.report_code, r.barangay, r.description, r.staff_remarks, r.status,
           u.full_name AS reporter_name
    FROM incident_links l JOIN outage_reports r ON r.id = l.report_id JOIN users u ON u.id = r.reporter_id
    WHERE l.incident_id = ?
  `).all(id);
  incident.affected_barangays = db.prepare('SELECT barangay FROM incident_areas WHERE incident_id = ? ORDER BY barangay').all(id).map((row) => row.barangay);
  if (!incident.affected_barangays.length) incident.affected_barangays = [incident.barangay];
  const primary = incident.linked_reports[0];
  incident.primary_report = primary ? { id: primary.id, report_code: primary.report_code } : null;
  return incident;
};

const duration = (start, end) => {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
};

const notifyIncidentReporters = (incident, title, message, type = 'incident') => {
  const areaRows = db.prepare('SELECT incident_id, barangay FROM incident_areas ORDER BY barangay').all();
  const affectedAreas = new Map();
  for (const row of areaRows) {
    const areas = affectedAreas.get(Number(row.incident_id)) || [];
    areas.push(row.barangay);
    affectedAreas.set(Number(row.incident_id), areas);
  }

  const rows = db.prepare(`
    SELECT u.id, u.contact_number, u.full_name FROM incident_links l
    JOIN outage_reports r ON r.id = l.report_id JOIN users u ON u.id = r.reporter_id
    WHERE l.incident_id = ? AND u.status = 'Active'
  `).all(incident.id);
  notifyUsers(rows.map((r) => Number(r.id)), title, message, type);

  // Trigger SMS Gateway to reporter mobile numbers
  for (const r of rows) {
    if (r.contact_number) {
      sendSMS(r.contact_number, `${title}: ${message}`, type).catch(() => {});
    }
  }
};

const canSetCause = (req) => ['utility', 'administrator'].includes(req.user.role);

// List active incidents (all authenticated roles). Resident view is simplified.
router.get('/incidents', requireAuth, (req, res) => {
  const { barangay, type, status, include_closed } = req.query;
  const where = include_closed === 'true' ? [] : ["i.status != 'Closed'"];
  const params = [];
  if (barangay) { where.push('i.barangay = ?'); params.push(barangay); }
  if (type) { where.push('i.incident_type = ?'); params.push(type); }
  if (status) { where.push('i.status = ?'); params.push(status); }

  const affectedAreas = new Map();
  for (const row of db.prepare('SELECT incident_id, barangay FROM incident_areas ORDER BY barangay').all()) {
    const areas = affectedAreas.get(Number(row.incident_id)) || [];
    areas.push(row.barangay);
    affectedAreas.set(Number(row.incident_id), areas);
  }

  const rows = db.prepare(`
    SELECT i.*, s.outage_date AS scheduled_date
    FROM outage_incidents i LEFT JOIN scheduled_outages s ON s.id = i.scheduled_id
    WHERE ${where.length ? where.join(' AND ') : '1 = 1'} ORDER BY i.start_time DESC
  `).all(...params).map((r) => {
    const current = new Date().getTime();
    const start = r.start_time ? new Date(r.start_time).getTime() : current;
    return {
      ...r,
      affected_barangays: affectedAreas.get(Number(r.id)) || [r.barangay],
      duration_display: duration(r.start_time, r.end_time),
      duration_hours: Math.max(0, Math.round(((r.status === 'Closed' ? (r.closed_at ? new Date(r.closed_at).getTime() : current) : current) - start) / 3600000)),
    };
  });

  res.json({ incidents: rows, statuses: INCIDENT_STATUSES });
});

router.get('/incidents/:id', requireAuth, (req, res) => {
  const incident = incidentRow(Number(req.params.id));
  if (!incident) return res.status(404).json({ error: 'Incident not found.' });
  incident.duration_display = duration(incident.start_time, incident.end_time || incident.closed_at);
  if (req.user.role === 'resident') {
    delete incident.linked_reports;
    delete incident.primary_report;
  }
  res.json({ incident });
});

const validateIncidentPayload = (body) => {
  const { title, barangay, start_time, priority, outage_type, description, latitude, longitude, customers_affected, restoration_progress } = body || {};
  if (!title || !String(title).trim()) return 'A title is required.';
  if (!barangay) return 'Barangay is required.';
  if (!start_time) return 'Start time is required.';
  if (!outage_type) return 'Choose an incident type.';
  if (!description || !String(description).trim()) return 'Describe the outage incident.';
  if (priority && !['Low', 'Medium', 'High', 'Critical'].includes(priority)) return 'Choose a valid incident priority.';
  if (customers_affected !== undefined && customers_affected !== null && (!Number.isInteger(Number(customers_affected)) || Number(customers_affected) < 0)) return 'Customers affected must be a whole number of zero or more.';
  if (restoration_progress !== undefined && restoration_progress !== null && (!Number.isInteger(Number(restoration_progress)) || Number(restoration_progress) < 0 || Number(restoration_progress) > 100)) return 'Restoration progress must be between 0 and 100 percent.';
  const hasLatitude = latitude !== null && latitude !== undefined && latitude !== '';
  const hasLongitude = longitude !== null && longitude !== undefined && longitude !== '';
  if (hasLatitude !== hasLongitude) return 'Both map coordinates are required together.';
  if (hasLatitude && (!Number.isFinite(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90 || !Number.isFinite(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)) return 'Map coordinates are outside valid ranges.';
  return null;
};

// Create a verified outage incident (personnel/admin). Optionally linked to a report or a scheduled outage.
router.post('/incidents', requireAuth, requireRole('personnel', 'administrator'), (req, res) => {
  try {
    const error = validateIncidentPayload(req.body);
    if (error) return res.status(400).json({ error });

    const { report_id, related_report_ids, title, barangay, location, latitude, longitude, incident_type, outage_type, priority, customers_affected, restoration_progress, description, cause_category, start_time, affected_area, affected_barangays, remarks, scheduled_id, estimated_restoration, initial_status } = req.body;
    const activeBarangay = db.prepare("SELECT name FROM barangays WHERE name = ? AND status = 'Active'").get(barangay);
    if (!activeBarangay) return res.status(400).json({ error: 'Choose an active Valencia City barangay.' });
    const requestedAreas = [...new Set((Array.isArray(affected_barangays) ? affected_barangays : []).map((name) => String(name).trim()).filter(Boolean))];
    const inactiveArea = requestedAreas.find((name) => !db.prepare("SELECT 1 FROM barangays WHERE name = ? AND status = 'Active'").get(name));
    if (inactiveArea) return res.status(400).json({ error: `Affected barangay "${inactiveArea}" is not active.` });

    const requestedReportIds = [...new Set([...(report_id ? [report_id] : []), ...(Array.isArray(related_report_ids) ? related_report_ids : [])].map(Number).filter(Boolean))];
    if (requestedReportIds.some((id) => !Number.isInteger(id) || id < 1)) return res.status(400).json({ error: 'Choose valid related reports.' });
    const linkedReports = [];
    for (const id of requestedReportIds) {
      const report = db.prepare('SELECT * FROM outage_reports WHERE id = ?').get(id);
      if (!report) return res.status(404).json({ error: `Linked report ${id} not found.` });
      if (['Rejected', 'Duplicate'].includes(report.status)) return res.status(400).json({ error: `Report ${report.report_code} cannot be linked because it is ${report.status.toLowerCase()}.` });
      if (report.incident_id) return res.status(409).json({ error: `Report ${report.report_code} is already linked to an incident.` });
      linkedReports.push(report);
    }
    const primaryReport = linkedReports.length === 1 ? linkedReports[0] : null;
    const incidentLocation = String(location || primaryReport?.location || '').trim() || null;
    const incidentPurok = String(primaryReport?.purok || '').trim() || null;
    const incidentLatitude = latitude !== null && latitude !== undefined && latitude !== ''
      ? Number(latitude) : primaryReport?.latitude ?? null;
    const incidentLongitude = longitude !== null && longitude !== undefined && longitude !== ''
      ? Number(longitude) : primaryReport?.longitude ?? null;
    const incidentAffectedArea = String(affected_area || primaryReport?.affected_area || primaryReport?.purok || '').trim() || null;
    if (estimated_restoration && !canSetCause(req)) {
      return res.status(403).json({ error: 'Only authorized utility personnel or administrators can provide official restoration estimates.' });
    }
    if (cause_category && !canSetCause(req)) {
      return res.status(403).json({ error: 'Only authorized utility personnel or administrators can specify a technical cause.' });
    }
    if (scheduled_id) {
      const sched = db.prepare('SELECT * FROM scheduled_outages WHERE id = ?').get(Number(scheduled_id));
      if (!sched) return res.status(404).json({ error: 'Linked scheduled outage not found.' });
    }

    const code = nextCode('OUT');
    const ts = now();
    const status = INCIDENT_STATUSES.includes(initial_status) ? initial_status : 'Reported';
    const autoEtr = calculateETR(outage_type || incident_type);
    const finalEtr = estimated_restoration || autoEtr.displayTime;

    db.exec('BEGIN');
    let incidentId;
    try {
      const info = db.prepare(`
        INSERT INTO outage_incidents (incident_code, title, barangay, location, latitude, longitude, incident_type, outage_type,
          priority, customers_affected, restoration_progress, description, cause_category, status, start_time, estimated_restoration, etr_reason, affected_area, purok, remarks,
          scheduled_id, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        code, String(title).trim(), barangay, incidentLocation, incidentLatitude, incidentLongitude,
        incident_type || 'Unexpected', outage_type || null, priority || 'Medium', customers_affected ?? null, restoration_progress ?? null, description || null, cause_category || null,
        status, start_time, finalEtr, autoEtr.reason, incidentAffectedArea, incidentPurok, remarks || null,
        scheduled_id === undefined ? null : Number(scheduled_id), req.user.id, ts, ts
      );
      incidentId = Number(info.lastInsertRowid);
      const affectedAreas = [...new Set([barangay, ...requestedAreas])];
      const saveArea = db.prepare('INSERT OR IGNORE INTO incident_areas (incident_id, barangay) VALUES (?, ?)');
      for (const area of affectedAreas) saveArea.run(incidentId, area);
      const saveReportLink = db.prepare('INSERT OR IGNORE INTO incident_links (incident_id, report_id, link_time) VALUES (?, ?, ?)');
      const updateReport = db.prepare(`UPDATE outage_reports SET
        status = CASE WHEN status = 'Officially Confirmed' THEN status ELSE 'Verified' END,
        verification_status = CASE WHEN verification_status = 'Officially Confirmed' THEN verification_status ELSE 'Verified' END,
        incident_id = ?, updated_at = ? WHERE id = ?`);
      for (const report of linkedReports) {
        saveReportLink.run(incidentId, report.id, ts);
        updateReport.run(incidentId, ts, report.id);
      }
      db.exec('COMMIT');
    } catch (txnError) {
      db.exec('ROLLBACK');
      throw txnError;
    }

    for (const report of linkedReports) {
      notifyUsers([report.reporter_id], 'Outage incident created', `Your report ${report.report_code} is now part of incident ${code}.`, 'incident');
    }

    const incident = incidentRow(incidentId);
    audit(req.user, 'Incident created', `${req.user.full_name} created incident ${code} (${incident_type || 'Unexpected'}).`);
    notifyIncidentReporters(incident, 'Outage incident update', `Incident ${code} is now monitored with status "${status}".`);

    res.status(201).json({ incident, message: `Incident ${code} created successfully.` });
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(400).json({ error: error.message || 'Failed to create incident.' });
  }
});

// Update an incident's official information/status (authorized roles)
router.put('/incidents/:id/status', requireAuth, requireRole('personnel', 'administrator', 'utility'), (req, res) => {
  const incident = db.prepare('SELECT * FROM outage_incidents WHERE id = ?').get(Number(req.params.id));
  if (!incident) return res.status(404).json({ error: 'Incident not found.' });

  const { status, remarks, restoration_time, customers_affected, restoration_progress } = req.body || {};
  if (!INCIDENT_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid incident status.' });
  }
  if (customers_affected !== undefined && customers_affected !== null && customers_affected !== ''
    && (!Number.isInteger(Number(customers_affected)) || Number(customers_affected) < 0)) {
    return res.status(400).json({ error: 'Customers affected must be a whole number of zero or more.' });
  }
  if (restoration_progress !== undefined && restoration_progress !== null && restoration_progress !== ''
    && (!Number.isInteger(Number(restoration_progress)) || Number(restoration_progress) < 0 || Number(restoration_progress) > 100)) {
    return res.status(400).json({ error: 'Restoration progress must be between 0 and 100 percent.' });
  }

  const customersValue = customers_affected === undefined ? incident.customers_affected : customers_affected === '' || customers_affected === null ? null : Number(customers_affected);
  let progressValue = restoration_progress === undefined ? incident.restoration_progress : restoration_progress === '' || restoration_progress === null ? null : Number(restoration_progress);
  if (['Restored', 'Closed'].includes(status)) progressValue = 100;

  let endTime = incident.end_time;
  let closedAt = incident.closed_at;
  if (status === 'Restored' && !endTime) {
    endTime = restoration_time || now();
  }
  if (status === 'Closed') {
    closedAt = now();
    if (!endTime) endTime = restoration_time || now();
  }
  if (status !== 'Closed') closedAt = null;

  db.prepare(`
    UPDATE outage_incidents SET status = ?, end_time = ?, closed_at = ?, remarks = ?, customers_affected = ?, restoration_progress = ?, updated_at = ? WHERE id = ?
  `).run(status, endTime, closedAt, remarks || incident.remarks || null, customersValue, progressValue, now(), incident.id);

  const fresh = incidentRow(incident.id);
  const action = status === 'Restored' ? 'Restoration recorded' : `Status updated`;

  audit(req.user, `Incident ${status}`, `Incident ${incident.incident_code} marked ${status}.`);
  notifyIncidentReporters(incident, 'Outage status update', `Incident ${incident.incident_code} is now "${status}". ${remarks || ''}`, 'incident');

  if (status === 'Restored' || status === 'Closed') {
    const linked = db.prepare('SELECT report_id FROM incident_links WHERE incident_id = ?').all(incident.id);
    for (const l of linked) {
      db.prepare("UPDATE outage_reports SET status = 'Resolved', updated_at = ? WHERE id = ?").run(now(), l.report_id);
    }
    if (incident.barangay) {
      db.prepare("UPDATE outage_reports SET status = 'Resolved', updated_at = ? WHERE barangay = ? AND status NOT IN ('Rejected', 'Duplicate', 'Resolved')").run(now(), incident.barangay);
    }
  } else if (['Ongoing', 'Restoration in Progress', 'In Progress'].includes(status)) {
    const linked = db.prepare('SELECT report_id FROM incident_links WHERE incident_id = ?').all(incident.id);
    for (const l of linked) {
      db.prepare("UPDATE outage_reports SET status = 'In Progress', updated_at = ? WHERE id = ?").run(now(), l.report_id);
    }
    if (incident.barangay) {
      db.prepare("UPDATE outage_reports SET status = 'In Progress', updated_at = ? WHERE barangay = ? AND status IN ('Submitted', 'Under Review', 'Verified', 'Officially Confirmed')").run(now(), incident.barangay);
    }
  }

  res.json({ incident: fresh, message: `Incident is now "${status}".` });
});

// Update incident information (authorized roles). Cause and estimates restricted to official sources.
router.put('/incidents/:id', requireAuth, requireRole('personnel', 'administrator', 'utility'), (req, res) => {
  const incident = db.prepare('SELECT * FROM outage_incidents WHERE id = ?').get(Number(req.params.id));
  if (!incident) return res.status(404).json({ error: 'Incident not found.' });

  const { title, location, latitude, longitude, affected_area, remarks, incident_type, outage_type, priority, description, cause_category, estimated_restoration, affected_barangays } = req.body || {};

  if (priority && !['Low', 'Medium', 'High', 'Critical'].includes(priority)) return res.status(400).json({ error: 'Choose a valid incident priority.' });
  const hasLatitude = latitude !== null && latitude !== undefined && latitude !== '';
  const hasLongitude = longitude !== null && longitude !== undefined && longitude !== '';
  if (hasLatitude !== hasLongitude) return res.status(400).json({ error: 'Both map coordinates are required together.' });
  if (hasLatitude && (!Number.isFinite(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90 || !Number.isFinite(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)) return res.status(400).json({ error: 'Map coordinates are outside valid ranges.' });

  if ((cause_category !== undefined && cause_category !== incident.cause_category && !canSetCause(req))
    || (estimated_restoration !== undefined && estimated_restoration !== incident.estimated_restoration && !canSetCause(req))) {
    return res.status(403).json({ error: 'Only authorized utility personnel or administrators can provide official cause or restoration estimates.' });
  }

  db.prepare(`
    UPDATE outage_incidents SET title = COALESCE(?, title), location = COALESCE(?, location),
      affected_area = COALESCE(?, affected_area), remarks = COALESCE(?, remarks),
      incident_type = COALESCE(?, incident_type), cause_category = COALESCE(?, cause_category),
      outage_type = COALESCE(?, outage_type), priority = COALESCE(?, priority), description = COALESCE(?, description),
      latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude),
      estimated_restoration = COALESCE(?, estimated_restoration), updated_at = ?
    WHERE id = ?
  `).run(
    title ?? null, location ?? null, affected_area ?? null, remarks ?? null,
    incident_type ?? null, cause_category ?? null, outage_type ?? null, priority ?? null, description ?? null,
    latitude ?? null, longitude ?? null, estimated_restoration ?? null, now(), incident.id
  );

  if (Array.isArray(affected_barangays)) {
    db.prepare('DELETE FROM incident_areas WHERE incident_id = ?').run(incident.id);
    const saveArea = db.prepare('INSERT OR IGNORE INTO incident_areas (incident_id, barangay) VALUES (?, ?)');
    for (const area of [...new Set([incident.barangay, ...affected_barangays].map((name) => String(name).trim()).filter(Boolean))]) saveArea.run(incident.id, area);
  }

  const updated = incidentRow(incident.id);
  audit(req.user, 'Incident updated', `Incident ${incident.incident_code} information updated.`);
  notifyIncidentReporters(incident, 'Outage update', `Incident ${incident.incident_code} details were updated.`);

  res.json({ incident: updated, message: 'Incident updated successfully.' });
});

router.post('/incidents/:id/reports', requireAuth, requireRole('personnel', 'administrator'), (req, res) => {
  const incident = db.prepare('SELECT * FROM outage_incidents WHERE id = ?').get(Number(req.params.id));
  if (!incident) return res.status(404).json({ error: 'Incident not found.' });
  const { report_id, remarks } = req.body || {};
  if (!Number.isInteger(Number(report_id)) || Number(report_id) < 1) return res.status(400).json({ error: 'Choose a valid report.' });
  const report = db.prepare('SELECT * FROM outage_reports WHERE id = ?').get(Number(report_id));
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  if (['Rejected', 'Duplicate'].includes(report.status)) return res.status(400).json({ error: 'Rejected or duplicate reports cannot be linked as verified incidents.' });

  const ts = now();
  db.prepare('INSERT OR IGNORE INTO incident_links (incident_id, report_id, link_time) VALUES (?, ?, ?)').run(incident.id, report.id, ts);
  db.prepare(`UPDATE outage_reports SET status = CASE WHEN status = 'Officially Confirmed' THEN status ELSE 'Verified' END,
    verification_status = CASE WHEN verification_status = 'Officially Confirmed' THEN verification_status ELSE 'Verified' END, incident_id = ?,
    staff_remarks = COALESCE(?, staff_remarks), updated_at = ? WHERE id = ?`)
    .run(incident.id, remarks ? String(remarks).trim() : null, ts, report.id);
  audit(req.user, 'Report linked to incident', `Report ${report.report_code} linked to incident ${incident.incident_code}.`);
  notifyUsers([report.reporter_id], 'Report linked to incident', `Your report ${report.report_code} was linked to incident ${incident.incident_code}.`, 'report');
  res.json({ message: `Report linked to incident ${incident.incident_code}.` });
});

// Link an additional report as part of the same incident (dedup)
router.post('/incidents/:id/related', requireAuth, requireRole('personnel', 'administrator'), (req, res) => {
  const incident = db.prepare('SELECT * FROM outage_incidents WHERE id = ?').get(Number(req.params.id));
  if (!incident) return res.status(404).json({ error: 'Incident not found.' });

  const { report_id, remarks } = req.body || {};
  const report = db.prepare('SELECT * FROM outage_reports WHERE id = ?').get(Number(report_id));
  if (!report) return res.status(404).json({ error: 'Report not found.' });

  const ts = now();
  db.prepare('INSERT OR IGNORE INTO incident_links (incident_id, report_id, link_time) VALUES (?, ?, ?)').run(incident.id, report.id, ts);
  db.prepare("UPDATE outage_reports SET status = 'Duplicate', verification_status = 'Duplicate', incident_id = ?, staff_remarks = ?, updated_at = ? WHERE id = ?")
    .run(incident.id, remarks || `Part of incident ${incident.incident_code}.`, ts, report.id);

  audit(req.user, 'Report linked', `Report ${report.report_code} linked to incident ${incident.incident_code}.`);
  notifyUsers([report.reporter_id], 'Report linked to incident', `Your report ${report.report_code} was linked to incident ${incident.incident_code}.`, 'report');

  res.json({ message: 'Report linked to incident as part of the same outage.' });
});

module.exports = router;