const express = require('express');
const { db, now, nextCode } = require('../db');
const { requireAuth, requireRole, audit, notifyUsers } = require('../auth');
const { sendSMS } = require('../sms');
const { recordReportEvent, recordReportStatusChange } = require('../report-events');

const router = express.Router();

const ASSIGNMENT_STATUSES = ['Dispatched', 'En Route', 'Arrived On Site', 'In Progress', 'Resolved', 'Cancelled'];

const validateCoordinates = (latitude, longitude) => {
  const hasLatitude = latitude !== null && latitude !== undefined && latitude !== '';
  const hasLongitude = longitude !== null && longitude !== undefined && longitude !== '';
  if (hasLatitude !== hasLongitude) return 'Both latitude and longitude are required together.';
  if (!hasLatitude) return 'A confirmed GPS location is required.';
  if (!Number.isFinite(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90
    || !Number.isFinite(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180) {
    return 'GPS coordinates are outside valid ranges.';
  }
  return null;
};

const hasCoordinates = (record) => record
  && record.latitude !== null && record.latitude !== undefined && record.latitude !== ''
  && record.longitude !== null && record.longitude !== undefined && record.longitude !== '';

// Helper to get full assignment details
const getAssignmentRow = (id) => {
  const assignment = db.prepare(`
    SELECT a.*, t.name AS team_name, t.lead_technician, t.contact_number AS team_contact,
           t.vehicle_type, t.base_station, t.current_latitude AS team_latitude,
           t.current_longitude AS team_longitude, t.status AS team_status,
           u.full_name AS assigned_by_name
    FROM repair_assignments a
    JOIN repair_teams t ON t.id = a.team_id
    JOIN users u ON u.id = a.assigned_by
    WHERE a.id = ?
  `).get(id);

  if (!assignment) return null;

  if (assignment.report_id) {
    assignment.report = db.prepare(`
      SELECT r.*, u.full_name AS reporter_name, u.contact_number AS reporter_contact, u.email AS reporter_email
      FROM outage_reports r
      JOIN users u ON u.id = r.reporter_id
      WHERE r.id = ?
    `).get(assignment.report_id);

    if (assignment.report) {
      assignment.attachments = db.prepare(`
        SELECT id, file_path, mime_type, original_name, file_size
        FROM report_attachments
        WHERE report_id = ?
        ORDER BY id
      `).all(assignment.report_id);

      if (assignment.report.photo_path && !assignment.attachments.some((a) => a.file_path === assignment.report.photo_path)) {
        assignment.attachments.unshift({
          file_path: assignment.report.photo_path,
          mime_type: 'image/jpeg',
          original_name: 'Report photo',
          file_size: 0,
        });
      }
    }
  }

  if (assignment.incident_id) {
    assignment.incident = db.prepare(`
      SELECT * FROM outage_incidents WHERE id = ?
    `).get(assignment.incident_id);
  }

  return assignment;
};

// List all repair teams with their live status and active assignment
router.get('/repair-teams', requireAuth, (req, res) => {
  const teams = db.prepare(`
    SELECT t.*, a.assignment_code, a.status AS assignment_status, a.target_barangay, a.target_purok,
           a.target_latitude, a.target_longitude, a.priority AS assignment_priority
    FROM repair_teams t
    LEFT JOIN repair_assignments a ON a.id = t.active_assignment_id
    ORDER BY t.id ASC
  `).all();
  res.json({ teams });
});

// Create new repair team (admin only)
router.post('/repair-teams', requireAuth, requireRole('administrator'), (req, res) => {
  const { name, lead_technician, contact_number, vehicle_type, base_station, current_latitude, current_longitude } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Team name is required.' });
  if (!lead_technician || !String(lead_technician).trim()) return res.status(400).json({ error: 'Lead technician is required.' });
  const hasCoordinates = ![null, undefined, ''].includes(current_latitude)
    || ![null, undefined, ''].includes(current_longitude);
  if (hasCoordinates) {
    const error = validateCoordinates(current_latitude, current_longitude);
    if (error) return res.status(400).json({ error });
  }

  const code = nextCode('TEAM');
  const lat = hasCoordinates ? Number(current_latitude) : null;
  const lng = hasCoordinates ? Number(current_longitude) : null;

  const result = db.prepare(`
    INSERT INTO repair_teams (team_code, name, lead_technician, contact_number, vehicle_type, base_station, current_latitude, current_longitude, location_updated_at, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available', ?)
  `).run(code, String(name).trim(), String(lead_technician).trim(), contact_number || null, vehicle_type || 'Utility Vehicle', base_station || 'Valencia City Central Base', lat, lng, hasCoordinates ? now() : null, now());

  const team = db.prepare('SELECT * FROM repair_teams WHERE id = ?').get(result.lastInsertRowid);
  audit(req.user, 'Repair team added', `Added repair team ${team.name} (${code}).`);
  res.status(201).json({ team, message: `Repair team ${team.name} created successfully.` });
});

router.put('/repair-teams/:id/location', requireAuth, requireRole('personnel', 'administrator', 'utility'), (req, res) => {
  const team = db.prepare('SELECT * FROM repair_teams WHERE id = ?').get(Number(req.params.id));
  if (!team) return res.status(404).json({ error: 'Repair team not found.' });
  const { latitude, longitude } = req.body || {};
  const error = validateCoordinates(latitude, longitude);
  if (error) return res.status(400).json({ error });

  const updatedAt = now();
  db.prepare(`
    UPDATE repair_teams
    SET current_latitude = ?, current_longitude = ?, location_updated_at = ?
    WHERE id = ?
  `).run(Number(latitude), Number(longitude), updatedAt, team.id);

  const updatedTeam = db.prepare('SELECT * FROM repair_teams WHERE id = ?').get(team.id);
  audit(req.user, 'Repair team GPS updated', `Updated the current GPS position for ${team.name}.`);
  res.json({ team: updatedTeam, message: `GPS position updated for ${team.name}.` });
});

// List repair assignments
router.get('/repair/assignments', requireAuth, (req, res) => {
  const { status, team_id } = req.query;
  const where = [];
  const params = [];

  if (status) { where.push('a.status = ?'); params.push(status); }
  if (team_id) { where.push('a.team_id = ?'); params.push(Number(team_id)); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT a.*, t.name AS team_name, t.lead_technician, t.contact_number AS team_contact,
           t.vehicle_type, t.base_station, t.current_latitude AS team_latitude,
           t.current_longitude AS team_longitude,
           r.report_code, r.possible_outage_type, r.description AS report_description,
           i.incident_code, i.title AS incident_title
    FROM repair_assignments a
    JOIN repair_teams t ON t.id = a.team_id
    LEFT JOIN outage_reports r ON r.id = a.report_id
    LEFT JOIN outage_incidents i ON i.id = a.incident_id
    ${whereSql}
    ORDER BY a.id DESC
  `).all(...params);

  // Attach evidence previews
  const assignments = rows.map((row) => {
    let attachments = [];
    if (row.report_id) {
      attachments = db.prepare('SELECT id, file_path, mime_type, original_name FROM report_attachments WHERE report_id = ? LIMIT 3').all(row.report_id);
    }
    return { ...row, attachments };
  });

  res.json({ assignments });
});

// Get a single assignment with full route and evidence details
router.get('/repair/assignments/:id', requireAuth, (req, res) => {
  const assignment = getAssignmentRow(Number(req.params.id));
  if (!assignment) return res.status(404).json({ error: 'Repair assignment not found.' });
  res.json({ assignment });
});

// Assign a repair team to a report or incident
router.post('/repair/assign', requireAuth, requireRole('personnel', 'administrator', 'utility'), async (req, res) => {
  const { team_id, report_id, incident_id, dispatch_notes, priority = 'High' } = req.body || {};

  if (!team_id) return res.status(400).json({ error: 'Please choose a repair team to assign.' });
  if (!report_id && !incident_id) return res.status(400).json({ error: 'Assignment must link to a report or an incident.' });

  const team = db.prepare('SELECT * FROM repair_teams WHERE id = ?').get(Number(team_id));
  if (!team) return res.status(404).json({ error: 'Repair team not found.' });

  let targetBarangay = 'Poblacion';
  let targetPurok = null;
  let targetLocation = null;
  let targetLatitude = null;
  let targetLongitude = null;
  let report = null;
  let incident = null;

  if (report_id) {
    report = db.prepare('SELECT * FROM outage_reports WHERE id = ?').get(Number(report_id));
    if (!report) return res.status(404).json({ error: 'Outage report not found.' });
    targetBarangay = report.barangay;
    targetPurok = report.purok || report.affected_area || null;
    targetLocation = report.location || `Brgy. ${report.barangay}${targetPurok ? ', ' + targetPurok : ''}`;
    targetLatitude = report.latitude;
    targetLongitude = report.longitude;
  }

  if (incident_id) {
    incident = db.prepare('SELECT * FROM outage_incidents WHERE id = ?').get(Number(incident_id));
    if (!incident) return res.status(404).json({ error: 'Outage incident not found.' });
    targetBarangay = incident.barangay;
    targetPurok = incident.purok || incident.affected_area || null;
    targetLocation = incident.location || `Brgy. ${incident.barangay}${targetPurok ? ', ' + targetPurok : ''}`;
    const destination = hasCoordinates(incident) ? incident : hasCoordinates(report) ? report : null;
    targetLatitude = destination?.latitude ?? null;
    targetLongitude = destination?.longitude ?? null;
  }
  const locationError = validateCoordinates(targetLatitude, targetLongitude);
  if (locationError) {
    return res.status(400).json({ error: 'This report or incident has no confirmed exact coordinates and cannot be routed. Verify its location before dispatch.' });
  }

  const code = nextCode('DISP');
  const ts = now();

  db.exec('BEGIN');
  let assignmentId;
  try {
    const insertResult = db.prepare(`
      INSERT INTO repair_assignments (
        assignment_code, team_id, report_id, incident_id, assigned_by, status,
        priority, target_barangay, target_purok, target_location, target_latitude,
        target_longitude, dispatch_notes, dispatched_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'Dispatched', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code, team.id, report_id ? Number(report_id) : null, incident_id ? Number(incident_id) : null,
      req.user.id, priority, targetBarangay, targetPurok, targetLocation,
      targetLatitude, targetLongitude, dispatch_notes || null, ts, ts
    );

    assignmentId = Number(insertResult.lastInsertRowid);

    // Update repair team
    db.prepare(`
      UPDATE repair_teams
      SET status = 'Dispatched', active_assignment_id = ?
      WHERE id = ?
    `).run(assignmentId, team.id);

    // Update report
    if (report) {
      db.prepare(`
        UPDATE outage_reports
        SET assigned_team_id = ?, assigned_team_name = ?, repair_status = 'Team Dispatched',
            status = 'In Progress', verification_status = CASE WHEN verification_status = 'Officially Confirmed' THEN verification_status ELSE 'Verified' END,
            updated_at = ?
        WHERE id = ?
      `).run(team.id, team.name, ts, report.id);
      recordReportStatusChange(report, 'In Progress', req.user, ts, `Repair team ${team.name} was dispatched.`);
      recordReportEvent({
        reportId: report.id,
        eventType: 'repair',
        title: 'Repair team dispatched',
        details: `${team.name} was assigned to this report.`,
        actor: req.user,
        createdAt: ts,
      });
    }

    // Update incident
    if (incident) {
      const linkedReports = db.prepare('SELECT * FROM outage_reports WHERE incident_id = ?').all(incident.id);
      db.prepare(`
        UPDATE outage_incidents
        SET assigned_team_id = ?, assigned_team_name = ?, repair_status = 'Team Dispatched',
            status = 'Restoration in Progress', updated_at = ?
        WHERE id = ?
      `).run(team.id, team.name, ts, incident.id);

      // Also update linked reports
      db.prepare(`
        UPDATE outage_reports
        SET assigned_team_id = ?, assigned_team_name = ?, repair_status = 'Team Dispatched',
            status = 'In Progress', updated_at = ?
        WHERE incident_id = ?
      `).run(team.id, team.name, ts, incident.id);
      for (const linkedReport of linkedReports) {
        recordReportStatusChange(linkedReport, 'In Progress', req.user, ts, `Repair team ${team.name} was dispatched.`);
        recordReportEvent({
          reportId: linkedReport.id,
          eventType: 'repair',
          title: 'Repair team dispatched',
          details: `${team.name} was assigned to the linked incident.`,
          actor: req.user,
          createdAt: ts,
        });
      }
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Failed to create repair assignment:', error);
    return res.status(500).json({ error: 'Failed to assign repair team.' });
  }

  // User notifications & SMS
  if (report) {
    const notifyMsg = `Repair Team "${team.name}" has been assigned and dispatched to your outage in Brgy. ${targetBarangay}${targetPurok ? ' (' + targetPurok + ')' : ''}. Restoration is in progress.`;
    notifyUsers([report.reporter_id], 'Repair Team Dispatched', notifyMsg, 'report');

    const reporter = db.prepare('SELECT contact_number FROM users WHERE id = ?').get(report.reporter_id);
    if (reporter?.contact_number) {
      sendSMS(reporter.contact_number, `Valencia PowerWatch: Team ${team.name} has been dispatched to Brgy. ${targetBarangay}${targetPurok ? ' - ' + targetPurok : ''}. Field assessment underway.`, 'crew_dispatched').catch(() => {});
    }
  }

  if (incident) {
    const reporters = db.prepare(`
      SELECT u.id, u.contact_number
      FROM incident_links l
      JOIN outage_reports r ON r.id = l.report_id
      JOIN users u ON u.id = r.reporter_id
      WHERE l.incident_id = ?
    `).all(incident.id);

    const userIds = reporters.map((r) => r.id);
    if (userIds.length) {
      notifyUsers(userIds, 'Repair Team Dispatched', `Repair Team "${team.name}" has been dispatched to incident ${incident.incident_code} in Brgy. ${targetBarangay}.`, 'incident');
      for (const r of reporters) {
        if (r.contact_number) {
          sendSMS(r.contact_number, `Valencia PowerWatch: Emergency crew ${team.name} dispatched to Brgy. ${targetBarangay}. Restoration ongoing.`, 'crew_dispatched').catch(() => {});
        }
      }
    }
  }

  audit(req.user, 'Repair team dispatched', `Dispatched ${team.name} to ${targetBarangay}${targetPurok ? ' (' + targetPurok + ')' : ''} under assignment ${code}.`);

  const createdAssignment = getAssignmentRow(assignmentId);
  res.status(201).json({
    assignment: createdAssignment,
    message: `Repair team "${team.name}" successfully dispatched to Brgy. ${targetBarangay}${targetPurok ? ' (' + targetPurok + ')' : ''}.`,
  });
});

// Update repair team / assignment status (En Route, Arrived On Site, In Progress, Resolved)
router.put('/repair/assignments/:id/status', requireAuth, requireRole('personnel', 'administrator', 'utility'), async (req, res) => {
  const assignment = getAssignmentRow(Number(req.params.id));
  if (!assignment) return res.status(404).json({ error: 'Repair assignment not found.' });

  const { status, crew_report, current_latitude, current_longitude } = req.body || {};
  if (!status || !ASSIGNMENT_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Choose from: ${ASSIGNMENT_STATUSES.join(', ')}` });
  }
  const hasCurrentLatitude = ![null, undefined, ''].includes(current_latitude);
  const hasCurrentLongitude = ![null, undefined, ''].includes(current_longitude);
  if (hasCurrentLatitude || hasCurrentLongitude) {
    const coordinateError = validateCoordinates(current_latitude, current_longitude);
    if (coordinateError) return res.status(400).json({ error: coordinateError });
  }

  const ts = now();
  const linkedReports = assignment.incident_id
    ? db.prepare('SELECT * FROM outage_reports WHERE incident_id = ? AND id <> ?').all(assignment.incident_id, assignment.report_id || 0)
    : [];
  let arrivedAt = assignment.arrived_at;
  let completedAt = assignment.completed_at;

  if (status === 'Arrived On Site' && !arrivedAt) arrivedAt = ts;
  if (['Resolved', 'Cancelled'].includes(status) && !completedAt) completedAt = ts;

  db.exec('BEGIN');
  try {
    // 1. Update assignment record
    db.prepare(`
      UPDATE repair_assignments
      SET status = ?, crew_report = COALESCE(?, crew_report), arrived_at = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(status, crew_report || null, arrivedAt, completedAt, ts, assignment.id);

    // 2. Update repair team position & status
    const isFinished = ['Resolved', 'Cancelled'].includes(status);
    const nextTeamStatus = isFinished ? 'Available' : status === 'En Route' ? 'Dispatched' : status === 'Arrived On Site' ? 'On Site' : 'In Progress';
    const activeAssignId = isFinished ? null : assignment.id;

    if (hasCurrentLatitude || hasCurrentLongitude) {
      db.prepare(`
        UPDATE repair_teams
        SET status = ?, active_assignment_id = ?, current_latitude = ?, current_longitude = ?, location_updated_at = ?
        WHERE id = ?
      `).run(nextTeamStatus, activeAssignId, Number(current_latitude), Number(current_longitude), ts, assignment.team_id);
    } else {
      db.prepare(`
        UPDATE repair_teams
        SET status = ?, active_assignment_id = ?
        WHERE id = ?
      `).run(nextTeamStatus, activeAssignId, assignment.team_id);
    }

    // 3. Propagate to linked report
    if (assignment.report_id) {
      const nextReportStatus = status === 'Resolved' ? 'Resolved' : 'In Progress';
      const nextRepairStatus = status === 'Resolved' ? 'Resolved' : status;
      db.prepare(`
        UPDATE outage_reports
        SET repair_status = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).run(nextRepairStatus, nextReportStatus, ts, assignment.report_id);
      recordReportStatusChange(assignment.report, nextReportStatus, req.user, ts, `Repair team ${assignment.team_name} updated its status to ${status}.`);
      recordReportEvent({
        reportId: assignment.report_id,
        eventType: 'repair',
        title: `Repair team ${status.toLowerCase()}`,
        details: `${assignment.team_name}: ${status}`,
        actor: req.user,
        createdAt: ts,
      });
    }

    // 4. Propagate to linked incident
    if (assignment.incident_id) {
      const nextIncidentStatus = status === 'Resolved' ? 'Restored' : 'Restoration in Progress';
      const nextRepairStatus = status === 'Resolved' ? 'Resolved' : status;
      db.prepare(`
        UPDATE outage_incidents
        SET repair_status = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).run(nextRepairStatus, nextIncidentStatus, ts, assignment.incident_id);

      if (status === 'Resolved') {
        db.prepare(`
          UPDATE outage_reports
          SET repair_status = 'Resolved', status = 'Resolved', updated_at = ?
          WHERE incident_id = ?
        `).run(ts, assignment.incident_id);
      }
      for (const linkedReport of linkedReports) {
        if (status === 'Resolved') {
          recordReportStatusChange(linkedReport, 'Resolved', req.user, ts, `Repair team ${assignment.team_name} completed the incident response.`);
        }
        recordReportEvent({
          reportId: linkedReport.id,
          eventType: 'repair',
          title: `Repair team ${status.toLowerCase()}`,
          details: `${assignment.team_name}: ${status}`,
          actor: req.user,
          createdAt: ts,
        });
      }
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Failed to update assignment status:', error);
    return res.status(500).json({ error: 'Failed to update assignment status.' });
  }

  // Notify resident based on milestone
  const targetDesc = `Brgy. ${assignment.target_barangay}${assignment.target_purok ? ', ' + assignment.target_purok : ''}`;
  const statusMessages = {
    'En Route': `Repair crew "${assignment.team_name}" is currently en route to your location in ${targetDesc}.`,
    'Arrived On Site': `Repair crew "${assignment.team_name}" has arrived at the reported outage site in ${targetDesc} and is conducting line repairs.`,
    'In Progress': `Restoration work is actively in progress by "${assignment.team_name}" in ${targetDesc}.`,
    Resolved: `Power restored! Repairs by "${assignment.team_name}" in ${targetDesc} have been completed successfully.`,
  };

  if (assignment.report?.reporter_id && statusMessages[status]) {
    notifyUsers([assignment.report.reporter_id], `Repair Update: ${status}`, statusMessages[status], 'report');

    if (assignment.report.reporter_contact) {
      const smsPrefix = `Valencia PowerWatch: `;
      sendSMS(assignment.report.reporter_contact, `${smsPrefix}${statusMessages[status]}`, 'repair_status_update').catch(() => {});
    }
  }

  audit(req.user, `Repair status ${status}`, `Assignment ${assignment.assignment_code} marked as ${status} by ${req.user.full_name}.`);

  const updatedAssignment = getAssignmentRow(assignment.id);
  res.json({
    assignment: updatedAssignment,
    message: `Repair status updated to "${status}".`,
  });
});

module.exports = router;
