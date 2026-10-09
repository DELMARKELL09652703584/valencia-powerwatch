const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');
const express = require('express');
const { db, DB_PATH, now, nextCode } = require('../db');
const { requireAuth, requireRole, audit, notifyUsers } = require('../auth');
const { recordReportEvent, recordReportStatusChange } = require('../report-events');

const router = express.Router();
const evidenceDirectory = path.join(path.dirname(DB_PATH), 'staff-evidence');
fs.mkdirSync(evidenceDirectory, { recursive: true });

db.exec(`
  CREATE TABLE IF NOT EXISTS staff_team_members (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES repair_teams(id) ON DELETE CASCADE,
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    assigned_at TEXT NOT NULL,
    PRIMARY KEY (user_id, team_id)
  );
  CREATE INDEX IF NOT EXISTS idx_staff_team_members_team ON staff_team_members(team_id, user_id);

  CREATE TABLE IF NOT EXISTS repair_assignment_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES repair_assignments(id) ON DELETE CASCADE,
    staff_id INTEGER NOT NULL REFERENCES users(id),
    stage TEXT NOT NULL,
    notes TEXT,
    latitude REAL,
    longitude REAL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_repair_assignment_updates_assignment ON repair_assignment_updates(assignment_id, id DESC);

  CREATE TABLE IF NOT EXISTS repair_assignment_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES repair_assignments(id) ON DELETE CASCADE,
    staff_id INTEGER NOT NULL REFERENCES users(id),
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const STAGES = ['Assigned', 'Acknowledged', 'On the Way', 'Arrived', 'Inspecting', 'Repairing', 'Completed'];
const dbStatusForStage = {
  Assigned: 'Dispatched',
  Acknowledged: 'Dispatched',
  'On the Way': 'En Route',
  Arrived: 'Arrived On Site',
  Inspecting: 'In Progress',
  Repairing: 'In Progress',
  Completed: 'Completed',
};
const uploadEvidence = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'].includes(file.mimetype)) {
      callback(new Error('Evidence must be a JPG, PNG, WebP, MP4, or MOV file.'));
      return;
    }
    callback(null, true);
  },
}).single('evidence');

const teamIdsFor = (userId) => db.prepare(
  'SELECT team_id FROM staff_team_members WHERE user_id = ? ORDER BY team_id',
).all(userId).map((row) => Number(row.team_id));

const assignmentForTeamMember = (user, assignmentId) => {
  const assignment = db.prepare(`
    SELECT a.*, t.name AS team_name, t.lead_technician, t.contact_number AS team_contact,
           t.vehicle_type, t.base_station, t.current_latitude AS team_latitude,
           t.current_longitude AS team_longitude, t.status AS team_status,
           r.report_code, r.possible_outage_type, r.description AS report_description,
           r.location AS report_location, r.barangay AS report_barangay,
           r.purok AS report_purok, r.latitude AS report_latitude,
           r.longitude AS report_longitude, r.reported_at, r.photo_path,
           r.status AS report_status, r.verification_status, r.incident_id AS report_incident_id,
           u.full_name AS reporter_name,
           i.incident_code, i.title AS incident_title, i.description AS incident_description
    FROM repair_assignments a
    JOIN repair_teams t ON t.id = a.team_id
    LEFT JOIN outage_reports r ON r.id = a.report_id
    LEFT JOIN users u ON u.id = r.reporter_id
    LEFT JOIN outage_incidents i ON i.id = a.incident_id
    WHERE a.id = ?
  `).get(assignmentId);
  if (!assignment) return null;
  if (!teamIdsFor(user.id).includes(Number(assignment.team_id))) return null;

  const updates = db.prepare(`
    SELECT u.id, u.stage, u.notes, u.latitude, u.longitude, u.created_at, s.full_name AS staff_name
    FROM repair_assignment_updates u
    JOIN users s ON s.id = u.staff_id
    WHERE u.assignment_id = ?
    ORDER BY u.id DESC
    LIMIT 50
  `).all(assignment.id);
  const evidence = db.prepare(`
    SELECT e.id, e.mime_type, e.created_at, u.full_name AS staff_name
    FROM repair_assignment_evidence e
    JOIN users u ON u.id = e.staff_id
    WHERE e.assignment_id = ?
    ORDER BY e.id DESC
  `).all(assignment.id).map((item) => ({ ...item, url: `/api/staff/evidence/${item.id}` }));
  const attachments = assignment.report_id
    ? db.prepare(`
      SELECT id, file_path, mime_type, original_name
      FROM report_attachments WHERE report_id = ? ORDER BY id
    `).all(assignment.report_id)
    : [];
  if (assignment.photo_path && !attachments.some((item) => item.file_path === assignment.photo_path)) {
    attachments.unshift({
      file_path: assignment.photo_path,
      mime_type: 'image/jpeg',
      original_name: 'Resident report photo',
    });
  }
  return {
    ...assignment,
    updates,
    evidence,
    attachments,
    latest_stage: updates[0]?.stage || ({
      Dispatched: 'Assigned',
      'En Route': 'On the Way',
      'Arrived On Site': 'Arrived',
      'In Progress': 'Inspecting',
      Completed: 'Completed',
      Resolved: 'Completed',
    }[assignment.status] || 'Assigned'),
  };
};

const requireAssignment = (req, res, next) => {
  const assignment = assignmentForTeamMember(req.user, Number(req.params.id));
  if (!assignment) return res.status(404).json({ error: 'Assigned incident not found.' });
  req.staffAssignment = assignment;
  next();
};

const requireOpenAssignment = (req, res, next) => {
  if (['Completed', 'Resolved', 'Cancelled'].includes(req.staffAssignment.status)) {
    return res.status(409).json({ error: 'This assignment is closed to further field updates.' });
  }
  next();
};

const evidenceMatchesMime = (buffer, mimeType) => {
  if (mimeType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === 'image/webp') return buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (mimeType === 'video/mp4' || mimeType === 'video/quicktime') {
    return buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp';
  }
  return false;
};

router.get('/staff/assignments', requireAuth, requireRole('personnel'), (req, res) => {
  const teamIds = teamIdsFor(req.user.id);
  if (!teamIds.length) return res.json({ assignments: [], teams: [] });
  const placeholders = teamIds.map(() => '?').join(', ');
  const rows = db.prepare(`
    SELECT a.id FROM repair_assignments a
    WHERE a.team_id IN (${placeholders})
    ORDER BY CASE a.status
      WHEN 'Dispatched' THEN 0 WHEN 'En Route' THEN 1
      WHEN 'Arrived On Site' THEN 2 WHEN 'In Progress' THEN 3 ELSE 4 END,
      a.id DESC
  `).all(...teamIds);
  const assignments = rows.map((row) => assignmentForTeamMember(req.user, row.id)).filter(Boolean);
  const teams = db.prepare(`
    SELECT id, name, lead_technician, vehicle_type, base_station,
           current_latitude, current_longitude, location_updated_at, status
    FROM repair_teams WHERE id IN (${placeholders}) ORDER BY name
  `).all(...teamIds);
  res.json({ assignments, teams });
});

router.get('/staff/assignments/:id', requireAuth, requireRole('personnel'), requireAssignment, (req, res) => {
  res.json({ assignment: req.staffAssignment });
});

router.post('/staff/assignments/:id/verify', requireAuth, requireRole('personnel'), requireAssignment, (req, res) => {
  const assignment = req.staffAssignment;
  if (!assignment.report_id) return res.status(409).json({ error: 'This assignment has no resident report to verify.' });
  if (['Completed', 'Resolved', 'Cancelled'].includes(assignment.status)) {
    return res.status(409).json({ error: 'A closed field assignment cannot verify a report.' });
  }
  if (assignment.report_incident_id || assignment.incident_id) {
    return res.status(409).json({ error: 'This assigned report is already linked to an incident.' });
  }
  if (['Resolved', 'Rejected', 'Duplicate'].includes(assignment.report_status)) {
    return res.status(409).json({ error: `A ${String(assignment.report_status).toLowerCase()} report cannot be converted into an incident.` });
  }
  if (assignment.report_latitude === null || assignment.report_latitude === undefined
    || assignment.report_longitude === null || assignment.report_longitude === undefined) {
    return res.status(409).json({ error: 'The report must have confirmed coordinates before incident verification.' });
  }

  let report = db.prepare('SELECT * FROM outage_reports WHERE id = ?').get(assignment.report_id);
  if (!report) return res.status(404).json({ error: 'Assigned resident report not found.' });
  if (report.incident_id) return res.status(409).json({ error: 'This report has already been linked to an incident.' });

  const timestamp = now();
  const priority = ['Low', 'Medium', 'High', 'Critical'].includes(assignment.priority)
    ? assignment.priority : 'Medium';
  db.exec('BEGIN IMMEDIATE');
  let incidentId;
  let code;
  let incidentStatus;
  try {
    report = db.prepare('SELECT * FROM outage_reports WHERE id = ?').get(assignment.report_id);
    if (!report) {
      db.exec('ROLLBACK');
      return res.status(404).json({ error: 'Assigned resident report not found.' });
    }
    if (report.incident_id) {
      db.exec('ROLLBACK');
      return res.status(409).json({ error: 'This report has already been linked to an incident.' });
    }
    if (['Resolved', 'Rejected', 'Duplicate'].includes(report.status)
      || report.latitude === null || report.latitude === undefined
      || report.longitude === null || report.longitude === undefined) {
      db.exec('ROLLBACK');
      return res.status(409).json({ error: 'This report is no longer eligible for incident verification.' });
    }
    const alreadyDispatched = report.status === 'In Progress'
      || ['Dispatched', 'En Route', 'Arrived On Site', 'In Progress'].includes(assignment.status);
    incidentStatus = alreadyDispatched ? 'Restoration in Progress' : 'Verified';
    const title = `${report.possible_outage_type || 'Power outage'} — ${report.purok || report.affected_area || report.barangay}`;
    const startTime = report.date_time_noticed || report.reported_at || timestamp;
    code = nextCode('OUT');
    const result = db.prepare(`
      INSERT INTO outage_incidents (
        incident_code, title, barangay, location, latitude, longitude, incident_type,
        outage_type, priority, description, status, start_time, affected_area, purok,
        remarks, assigned_team_id, assigned_team_name, repair_status, created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'Unexpected', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Team Dispatched', ?, ?, ?)
    `).run(
      code, title, report.barangay, report.location || assignment.target_location,
      report.latitude, report.longitude, report.possible_outage_type || 'Power Outage',
      priority, report.description, incidentStatus, startTime,
      report.purok || report.affected_area || assignment.target_purok || null,
      report.purok || null, 'Incident verified by assigned field personnel.',
      assignment.team_id, assignment.team_name,
      req.user.id, timestamp, timestamp,
    );
    incidentId = Number(result.lastInsertRowid);
    db.prepare('INSERT INTO incident_areas (incident_id, barangay) VALUES (?, ?)').run(incidentId, report.barangay);
    db.prepare('INSERT INTO incident_links (incident_id, report_id, link_time) VALUES (?, ?, ?)').run(incidentId, report.id, timestamp);
    const nextStatus = alreadyDispatched ? 'In Progress' : 'Verified';
    db.prepare(`
      UPDATE outage_reports
      SET incident_id = ?, verification_status = 'Verified', status = ?,
          repair_status = CASE WHEN ? THEN 'Team Dispatched' ELSE repair_status END, updated_at = ?
      WHERE id = ? AND incident_id IS NULL
    `).run(incidentId, nextStatus, alreadyDispatched ? 1 : 0, timestamp, report.id);
    db.prepare('UPDATE repair_assignments SET incident_id = ?, updated_at = ? WHERE id = ? AND incident_id IS NULL')
      .run(incidentId, timestamp, assignment.id);
    recordReportStatusChange(report, nextStatus, req.user, timestamp, `Verified by assigned field personnel and linked to incident ${code}.`);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  audit(req.user, 'Assigned report verified', `${req.user.full_name} verified ${report.report_code} and created incident ${code}.`);
  notifyUsers([report.reporter_id], 'Report verified', `Your report ${report.report_code} has been verified and linked to incident ${code}.`, 'incident');
  res.status(201).json({ incident: { id: incidentId, incident_code: code, status: incidentStatus }, message: `Report verified and linked to incident ${code}.` });
});

router.post('/staff/assignments/:id/updates', requireAuth, requireRole('personnel'), requireAssignment, requireOpenAssignment, (req, res) => {
  const { stage, notes = '', latitude, longitude } = req.body || {};
  const cleanNotes = String(notes).trim();
  if (!STAGES.includes(stage)) return res.status(400).json({ error: 'Choose a valid response stage.' });
  if (cleanNotes.length > 2000) return res.status(400).json({ error: 'Field notes must be 2,000 characters or fewer.' });
  const hasLatitude = latitude !== null && latitude !== undefined && latitude !== '';
  const hasLongitude = longitude !== null && longitude !== undefined && longitude !== '';
  if (hasLatitude !== hasLongitude) return res.status(400).json({ error: 'Both GPS coordinates must be sent together.' });
  if (hasLatitude && (!Number.isFinite(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90
    || !Number.isFinite(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)) {
    return res.status(400).json({ error: 'GPS coordinates are outside valid ranges.' });
  }
  if (!cleanNotes && stage === req.staffAssignment.latest_stage) {
    return res.status(400).json({ error: 'Add a field note or move the response to its next stage.' });
  }
  const oldIndex = STAGES.indexOf(req.staffAssignment.latest_stage);
  const nextIndex = STAGES.indexOf(stage);
  if (nextIndex < oldIndex || nextIndex > oldIndex + 1) {
    return res.status(409).json({ error: 'Response stages must be completed in order.' });
  }

  const timestamp = now();
  let saved;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`
      INSERT INTO repair_assignment_updates (assignment_id, staff_id, stage, notes, latitude, longitude, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.staffAssignment.id, req.user.id, stage, cleanNotes || null,
      hasLatitude ? Number(latitude) : null, hasLongitude ? Number(longitude) : null, timestamp);
    const dbStatus = dbStatusForStage[stage];
    db.prepare(`
      UPDATE repair_assignments
      SET status = ?, crew_report = CASE WHEN ? = '' THEN crew_report
        WHEN COALESCE(crew_report, '') = '' THEN ? ELSE crew_report || char(10) || ? END,
        arrived_at = CASE WHEN ? = 'Arrived' AND arrived_at IS NULL THEN ? ELSE arrived_at END,
        completed_at = CASE WHEN ? = 'Completed' THEN ? ELSE completed_at END,
        updated_at = ?
      WHERE id = ?
    `).run(dbStatus, cleanNotes, cleanNotes, cleanNotes, stage, timestamp, stage, timestamp, timestamp, req.staffAssignment.id);
    if (req.staffAssignment.report_id) {
      db.prepare(`
        UPDATE outage_reports
        SET status = ?, repair_status = ?, updated_at = ?
        WHERE id = ?
      `).run('In Progress', stage === 'Completed' ? 'Completed' : dbStatus, timestamp, req.staffAssignment.report_id);
      recordReportEvent({
        reportId: req.staffAssignment.report_id,
        eventType: 'repair',
        title: `Field response ${stage.toLowerCase()}`,
        details: cleanNotes || `${req.staffAssignment.team_name} updated the response to ${stage}.`,
        actor: req.user,
        createdAt: timestamp,
      });
    }
    if (req.staffAssignment.incident_id) {
      db.prepare(`
        UPDATE outage_incidents
        SET status = 'Restoration in Progress', repair_status = ?, updated_at = ?
        WHERE id = ?
      `).run(stage === 'Completed' ? 'Completed' : dbStatus, timestamp, req.staffAssignment.incident_id);
    }
    if (stage === 'Completed') {
      db.prepare("UPDATE repair_teams SET status = 'Available', active_assignment_id = NULL WHERE id = ?")
        .run(req.staffAssignment.team_id);
    } else if (nextIndex > oldIndex) {
      db.prepare("UPDATE repair_teams SET status = 'On Assignment', active_assignment_id = ? WHERE id = ?")
        .run(req.staffAssignment.id, req.staffAssignment.team_id);
    }
    saved = db.prepare('SELECT * FROM repair_assignment_updates WHERE id = last_insert_rowid()').get();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  audit(req.user, 'Field response updated', `${req.user.full_name} moved ${req.staffAssignment.assignment_code} to ${stage}.`);
  if (nextIndex > oldIndex && req.staffAssignment.report_id) {
    const reporter = db.prepare('SELECT reporter_id FROM outage_reports WHERE id = ?').get(req.staffAssignment.report_id);
    if (reporter) {
      const updateMessage = stage === 'Completed'
        ? `${req.staffAssignment.assignment_code} is complete. An administrator will review the field response before the incident is closed.`
        : `The field crew for ${req.staffAssignment.assignment_code} updated the response to: ${stage}.`;
      notifyUsers([reporter.reporter_id], 'Field response update', updateMessage, 'report');
    }
  }
  res.status(201).json({ update: saved, message: 'Response update saved.' });
});

router.post('/staff/assignments/:id/evidence', requireAuth, requireRole('personnel'), requireAssignment, requireOpenAssignment, (req, res, next) => {
  uploadEvidence(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Evidence file must be 8 MB or smaller.' });
      }
      return res.status(400).json({ error: error.message || 'The evidence upload could not be processed.' });
    }
    if (!req.file) return res.status(400).json({ error: 'Choose a repair or inspection photo or video to upload.' });
    if (!evidenceMatchesMime(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ error: 'The uploaded file does not match its image or video type.' });
    }

    const extension = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
    }[req.file.mimetype];
    const filename = `${crypto.randomUUID()}.${extension}`;
    const filePath = path.join(evidenceDirectory, filename);
    try {
      fs.writeFileSync(filePath, req.file.buffer, { flag: 'wx' });
      const result = db.prepare(`
        INSERT INTO repair_assignment_evidence (assignment_id, staff_id, file_name, mime_type, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.staffAssignment.id, req.user.id, filename, req.file.mimetype, now());
      audit(req.user, 'Field evidence uploaded', `${req.user.full_name} uploaded field evidence for ${req.staffAssignment.assignment_code}.`);
      res.status(201).json({
        evidence: { id: Number(result.lastInsertRowid), mime_type: req.file.mimetype, url: `/api/staff/evidence/${result.lastInsertRowid}` },
        message: 'Field evidence uploaded.',
      });
    } catch (writeError) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      next(writeError);
    }
  });
});

router.get('/staff/evidence/:id', requireAuth, requireRole('personnel'), (req, res, next) => {
  const evidence = db.prepare('SELECT * FROM repair_assignment_evidence WHERE id = ?').get(Number(req.params.id));
  if (!evidence || !assignmentForTeamMember(req.user, evidence.assignment_id)) {
    return res.status(404).json({ error: 'Field evidence not found.' });
  }
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.type(evidence.mime_type);
  res.sendFile(evidence.file_name, { root: evidenceDirectory }, (error) => {
    if (error && !res.headersSent) next(error);
  });
});

router.put('/staff/teams/:id/location', requireAuth, requireRole('personnel'), (req, res) => {
  const teamId = Number(req.params.id);
  if (!Number.isSafeInteger(teamId) || !teamIdsFor(req.user.id).includes(teamId)) {
    return res.status(404).json({ error: 'Assigned field team not found.' });
  }
  const { latitude, longitude } = req.body || {};
  if ([null, undefined, ''].includes(latitude) || [null, undefined, ''].includes(longitude)
    || !Number.isFinite(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90
    || !Number.isFinite(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180) {
    return res.status(400).json({ error: 'Valid GPS coordinates are required.' });
  }
  const timestamp = now();
  db.prepare(`
    UPDATE repair_teams SET current_latitude = ?, current_longitude = ?, location_updated_at = ?
    WHERE id = ?
  `).run(Number(latitude), Number(longitude), timestamp, teamId);
  audit(req.user, 'Field team GPS updated', `${req.user.full_name} shared a live GPS position for team ${teamId}.`);
  res.json({ message: 'GPS shared with dispatch.', location_updated_at: timestamp });
});

router.get('/admin/staff-memberships', requireAuth, requireRole('administrator'), (req, res) => {
  const users = db.prepare(`
    SELECT id, full_name, email, status
    FROM users WHERE role = 'personnel' AND status != 'Deleted'
    ORDER BY full_name COLLATE NOCASE
  `).all();
  const teams = db.prepare(`
    SELECT id, name, team_code, status FROM repair_teams ORDER BY name COLLATE NOCASE
  `).all();
  const memberships = db.prepare(`
    SELECT user_id, team_id FROM staff_team_members ORDER BY user_id, team_id
  `).all();
  const barangayMemberships = db.prepare(`
    SELECT user_id, barangay FROM staff_barangay_assignments ORDER BY user_id, barangay
  `).all();
  const barangays = db.prepare("SELECT name FROM barangays WHERE status = 'Active' ORDER BY name COLLATE NOCASE").all();
  const activeStaffCount = users.filter((user) => user.status === 'Active').length;
  const assignedTeamCount = new Set(memberships.map((membership) => Number(membership.team_id))).size;
  const assignedBarangayCount = new Set(barangayMemberships.map((membership) => membership.barangay)).size;
  const limitSetting = db.prepare("SELECT value FROM settings WHERE key = 'staff_account_limit'").get();
  let accountLimit = null;
  if (limitSetting) {
    accountLimit = JSON.parse(limitSetting.value);
    if (!Number.isSafeInteger(accountLimit) || accountLimit < 0) {
      return res.status(500).json({ error: 'The configured staff account limit is invalid.' });
    }
  }
  res.json({
    staff: users.map((user) => ({
      ...user,
      team_ids: memberships.filter((membership) => Number(membership.user_id) === Number(user.id))
        .map((membership) => Number(membership.team_id)),
      barangay_names: barangayMemberships.filter((membership) => Number(membership.user_id) === Number(user.id))
        .map((membership) => membership.barangay),
    })),
    teams,
    barangays: barangays.map((barangay) => barangay.name),
    summary: {
      total: users.length,
      active: activeStaffCount,
      inactive: users.length - activeStaffCount,
      assigned_teams: assignedTeamCount,
      assigned_barangays: assignedBarangayCount,
      account_limit: accountLimit,
    },
  });
});

router.put('/admin/staff-memberships/:userId', requireAuth, requireRole('administrator'), (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isSafeInteger(userId) || userId < 1) return res.status(400).json({ error: 'Invalid staff account.' });
  const user = db.prepare("SELECT id, full_name, role FROM users WHERE id = ? AND status != 'Deleted'").get(userId);
  if (!user || user.role !== 'personnel') return res.status(404).json({ error: 'Active personnel account not found.' });
  const { team_ids: teamIds, barangay_names: barangayNames } = req.body || {};
  if (!Array.isArray(teamIds) || teamIds.length < 1 || !Array.isArray(barangayNames) || barangayNames.length < 1) {
    return res.status(400).json({ error: 'Assign at least one team and one active barangay or operational area.' });
  }
  const isValidTeamId = (id) => typeof id === 'number'
    ? Number.isSafeInteger(id) && id > 0
    : typeof id === 'string' && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));
  if (teamIds !== undefined && (!Array.isArray(teamIds) || teamIds.length > 50
    || teamIds.some((id) => !isValidTeamId(id)))) {
    return res.status(400).json({ error: 'Team assignments must contain valid team IDs.' });
  }
  const uniqueIds = [...new Set((teamIds || []).map(Number))];
  if (uniqueIds.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    return res.status(400).json({ error: 'Choose one or more valid teams.' });
  }
  if (barangayNames !== undefined && (!Array.isArray(barangayNames) || barangayNames.length > 100
    || barangayNames.some((name) => typeof name !== 'string' || !name.trim()))) {
    return res.status(400).json({ error: 'Barangay assignments must contain valid barangay names.' });
  }
  const uniqueBarangays = [...new Set((barangayNames || []).map((name) => name.trim()))];
  const validIds = uniqueIds.length
    ? db.prepare(`SELECT id FROM repair_teams WHERE id IN (${uniqueIds.map(() => '?').join(', ')})`).all(...uniqueIds)
      .map((team) => Number(team.id))
    : [];
  if (validIds.length !== uniqueIds.length) return res.status(400).json({ error: 'One or more selected teams no longer exist.' });
  const validBarangays = uniqueBarangays.length
    ? db.prepare(`SELECT name FROM barangays WHERE status = 'Active' AND name IN (${uniqueBarangays.map(() => '?').join(', ')})`)
      .all(...uniqueBarangays).map((barangay) => barangay.name)
    : [];
  if (validBarangays.length !== uniqueBarangays.length) return res.status(400).json({ error: 'One or more selected barangays are not active.' });

  db.exec('BEGIN IMMEDIATE');
  try {
    if (teamIds !== undefined) {
      db.prepare('DELETE FROM staff_team_members WHERE user_id = ?').run(userId);
      const addTeam = db.prepare(`
        INSERT INTO staff_team_members (user_id, team_id, assigned_by, assigned_at) VALUES (?, ?, ?, ?)
      `);
      for (const teamId of uniqueIds) addTeam.run(userId, teamId, req.user.id, now());
    }
    if (barangayNames !== undefined) {
      db.prepare('DELETE FROM staff_barangay_assignments WHERE user_id = ?').run(userId);
      const addBarangay = db.prepare(`
        INSERT INTO staff_barangay_assignments (user_id, barangay, assigned_by, assigned_at) VALUES (?, ?, ?, ?)
      `);
      for (const barangay of validBarangays) addBarangay.run(userId, barangay, req.user.id, now());
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  audit(req.user, 'Staff access updated', `${user.full_name} is assigned to ${uniqueIds.length} repair team(s) and ${validBarangays.length} barangay area(s).`);
  res.json({ message: 'Staff access assignments saved.', user_id: userId, team_ids: uniqueIds, barangay_names: validBarangays });
});

module.exports = { router, teamIdsFor };
