const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const { db, now, UPLOAD_DIR, nextCode } = require('../db');
const { requireAuth, requireRole, audit, notifyRole, notifyUsers } = require('../auth');
const { recordReportEvent, recordReportStatusChange } = require('../report-events');
const { staffBarangaysFor, staffCanAccessBarangay } = require('../staff-access');

const router = express.Router();

const STATUS_FLOW = ['Submitted', 'Under Review', 'Verified', 'Officially Confirmed', 'Assigned', 'Acknowledged', 'In Progress', 'Resolved', 'Closed', 'Unverified', 'Duplicate', 'Rejected'];
const ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']);
const reportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!ATTACHMENT_TYPES.has(file.mimetype)) return callback(new Error('Use JPG, PNG, WebP, MP4, or MOV attachments.'));
    return callback(null, true);
  },
});

const parseReportAttachments = (req, res, next) => reportUpload.array('attachments', 5)(req, res, (error) => {
  if (error) return res.status(400).json({ error: error.message });
  next();
});

const validMediaSignature = (file) => {
  if (file.mimetype === 'image/jpeg') return file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
  if (file.mimetype === 'image/png') return file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === 'image/webp') return file.buffer.toString('ascii', 0, 4) === 'RIFF' && file.buffer.toString('ascii', 8, 12) === 'WEBP';
  return ['video/mp4', 'video/quicktime'].includes(file.mimetype) && file.buffer.toString('ascii', 4, 8) === 'ftyp';
};

const storeReportAttachment = async (file, reportId) => {
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov' };
  const extension = extensions[file.mimetype];
  const filename = `report_${reportId}_${crypto.randomUUID()}.${extension}`;
  const filePath = path.join(UPLOAD_DIR, filename);
  const publicPath = `/uploads/${filename}`;
  await fs.promises.writeFile(filePath, file.buffer, { flag: 'wx' });
  try {
    db.prepare(`
      INSERT INTO report_attachments (report_id, file_path, mime_type, original_name, file_size, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(reportId, publicPath, file.mimetype, path.basename(file.originalname), file.size, now());
    return filePath;
  } catch (error) {
    await fs.promises.unlink(filePath).catch(() => {});
    throw error;
  }
};

const reportDetailRow = (id) => {
  const report = db.prepare(`
    SELECT r.*, u.full_name AS reporter_name, u.email AS reporter_email, u.contact_number AS reporter_contact
    FROM outage_reports r JOIN users u ON u.id = r.reporter_id WHERE r.id = ?
  `).get(id);
  if (!report) return null;
  report.incident = report.incident_id
    ? db.prepare('SELECT id, incident_code, title, status, incident_type, cause_category, estimated_restoration FROM outage_incidents WHERE id = ?').get(report.incident_id)
    : null;
  report.linked_incident = report.incident;
  report.attachments = db.prepare('SELECT id, file_path, mime_type, original_name, file_size FROM report_attachments WHERE report_id = ? ORDER BY id').all(id);
  report.timeline = db.prepare(`
    SELECT event_type, title, details, from_status, to_status, actor_name, actor_user_id, created_at
    FROM report_status_history
    WHERE report_id = ?
    ORDER BY created_at, id
  `).all(id);
  return report;
};

const savePhoto = async (photoData) => {
  if (!photoData) return null;
  const match = /^data:(image\/(?:png|jpe?g|webp|gif));base64,(.+)$/.exec(photoData);
  if (!match) return null;
  const ext = match[1].endsWith('gif') ? 'gif' : match[1].endsWith('png') ? 'png' : match[1].endsWith('webp') ? 'webp' : 'jpg';
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 3 * 1024 * 1024) return null;
  const name = `photo_${Date.now()}_${Math.round(Math.random() * 1e6)}.${ext}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), buffer, { flag: 'wx' });
  return `/uploads/${name}`;
};

// Resident submits an outage report
router.post('/reports', requireAuth, requireRole('resident'), parseReportAttachments, async (req, res, next) => {
  const { location, latitude, longitude, location_source, location_accuracy_m, barangay, date_time_noticed, description, affected_area, possible_outage_type, photoData, remarks, purok } = req.body || {};

  if (!barangay) return res.status(400).json({ error: 'Barangay is required.' });
  if (!db.prepare("SELECT 1 FROM barangays WHERE name = ? AND status = 'Active'").get(String(barangay).trim())) {
    return res.status(400).json({ error: 'Choose an active Valencia City barangay.' });
  }
  if (!String(purok || affected_area || '').trim()) return res.status(400).json({ error: 'Specific purok, sitio, or landmark is required.' });
  if (!String(location || '').trim()) return res.status(400).json({ error: 'A specific location description is required.' });
  if (!description || !String(description).trim()) return res.status(400).json({ error: 'Please describe the interruption.' });
  if (!date_time_noticed) return res.status(400).json({ error: 'Please indicate when the interruption was noticed.' });
  const hasLatitude = latitude !== null && latitude !== undefined && latitude !== '';
  const hasLongitude = longitude !== null && longitude !== undefined && longitude !== '';
  if (hasLatitude !== hasLongitude) return res.status(400).json({ error: 'Both GPS coordinates are required together.' });
  if (hasLatitude && !['gps', 'map_pin'].includes(location_source)) return res.status(400).json({ error: 'Choose GPS or a manually placed map pin as the location source.' });
  if (hasLatitude && (!Number.isFinite(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90 || !Number.isFinite(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)) {
    return res.status(400).json({ error: 'Please provide valid GPS coordinates.' });
  }
  if (location_accuracy_m !== null && location_accuracy_m !== undefined && location_accuracy_m !== ''
    && (!Number.isFinite(Number(location_accuracy_m)) || Number(location_accuracy_m) < 0 || Number(location_accuracy_m) > 100000)) {
    return res.status(400).json({ error: 'Location accuracy must be a valid non-negative distance.' });
  }
  if ((req.files || []).some((file) => !validMediaSignature(file))) {
    return res.status(400).json({ error: 'One or more attachments do not match their file type.' });
  }

  let photoPath;
  try {
    photoPath = await savePhoto(photoData);
  } catch (error) {
    return next(error);
  }

  const code = nextCode('VPR');
  const reportedAt = now();
  const finalPurok = String(purok || affected_area || '').trim() || null;
  const info = db.prepare(`
    INSERT INTO outage_reports (report_code, reporter_id, location, latitude, longitude, location_source, location_accuracy_m, barangay, purok, date_time_noticed, description, affected_area,
      possible_outage_type, photo_path, remarks, status, verification_status, repair_status, reported_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', 'Pending', 'Pending Assignment', ?, ?)
  `).run(
    code, req.user.id, String(location).trim(), hasLatitude ? Number(latitude) : null, hasLongitude ? Number(longitude) : null, hasLatitude ? location_source : null,
    location_accuracy_m === '' || location_accuracy_m === undefined ? null : Number(location_accuracy_m),
    String(barangay).trim(), finalPurok, date_time_noticed, String(description).trim(),
    affected_area || finalPurok, possible_outage_type || null, photoPath, remarks || null, reportedAt, reportedAt
  );

  const reportId = Number(info.lastInsertRowid);
  recordReportEvent({
    reportId,
    eventType: 'submitted',
    title: 'Report submitted',
    details: 'Your report was received and is pending verification.',
    toStatus: 'Pending Verification',
    createdAt: reportedAt,
  });
  const savedAttachmentPaths = [];
  try {
    for (const file of req.files || []) savedAttachmentPaths.push(await storeReportAttachment(file, reportId));
  } catch (error) {
    db.prepare('DELETE FROM report_attachments WHERE report_id = ?').run(reportId);
    db.prepare('DELETE FROM outage_reports WHERE id = ?').run(reportId);
    await Promise.all(savedAttachmentPaths.map((filePath) => fs.promises.unlink(filePath).catch(() => {})));
    if (photoPath) await fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(photoPath))).catch(() => {});
    return next(error);
  }

  audit(req.user, 'Report submitted', `${req.user.full_name} submitted outage report ${code}.`);
  notifyUsers([req.user.id], 'Report submitted', `Your report ${code} has been recorded and is pending review.`, 'report');
  notifyRole('personnel', 'New outage report', `Report ${code} in ${barangay} requires review.`, 'report');
  notifyRole('administrator', 'New outage report', `Report ${code} in ${barangay} requires review.`, 'report');

  res.status(201).json({ report: reportDetailRow(reportId), message: 'Report submitted successfully. It is now pending review.' });
});

// Active community outage reports for Map display (all authenticated roles)
router.get('/reports/map', requireAuth, (req, res) => {
  const assignedBarangays = req.user.role === 'personnel' ? staffBarangaysFor(req.user.id) : null;
  if (assignedBarangays && !assignedBarangays.length) return res.json({ reports: [] });
  const areaFilter = assignedBarangays
    ? `AND r.barangay IN (${assignedBarangays.map(() => '?').join(', ')})`
    : '';
  const rows = db.prepare(`
    SELECT r.id, r.report_code, r.incident_id, r.barangay, r.purok, r.location, r.location_source, r.location_accuracy_m, r.affected_area,
           r.latitude, r.longitude, r.possible_outage_type, r.description,
           r.status, r.verification_status, r.repair_status, r.assigned_team_name,
           r.reported_at, r.reporter_id,
           (SELECT COUNT(*) FROM report_attachments a WHERE a.report_id = r.id) AS attachments_count
    FROM outage_reports r
    WHERE r.status NOT IN ('Rejected', 'Duplicate', 'Resolved')
    ${areaFilter}
    ORDER BY r.reported_at DESC
  `).all(...(assignedBarangays || []));
  res.json({ reports: rows });
});

// Staff/admin/utility view report queue with filters
router.get('/reports', requireAuth, requireRole('personnel', 'administrator', 'utility'), (req, res) => {
  const { status, verification, barangay, q } = req.query;

  const where = [];
  const params = [];
  if (req.user.role === 'personnel') {
    const assignedBarangays = staffBarangaysFor(req.user.id);
    if (!assignedBarangays.length) return res.json({ reports: [], statuses: STATUS_FLOW });
    where.push(`r.barangay IN (${assignedBarangays.map(() => '?').join(', ')})`);
    params.push(...assignedBarangays);
  }
  if (status) { where.push('r.status = ?'); params.push(status); }
  if (verification) { where.push('r.verification_status = ?'); params.push(verification); }
  if (barangay) { where.push('r.barangay = ?'); params.push(barangay); }
  if (q) {
    where.push('(r.report_code LIKE ? OR r.location LIKE ? OR r.affected_area LIKE ? OR r.description LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT r.*, u.full_name AS reporter_name, u.email AS reporter_email, u.contact_number AS reporter_contact
    FROM outage_reports r JOIN users u ON u.id = r.reporter_id
    ${whereSql}
    ORDER BY r.reported_at DESC
  `).all(...params);

  const reports = rows.map((report) => {
    const attachments = db.prepare(`
      SELECT id, file_path, mime_type, original_name, file_size
      FROM report_attachments WHERE report_id = ? ORDER BY id
    `).all(report.id);
    if (report.photo_path && !attachments.some((attachment) => attachment.file_path === report.photo_path)) {
      attachments.unshift({
        file_path: report.photo_path,
        mime_type: 'image/jpeg',
        original_name: 'Report photo',
        file_size: 0,
      });
    }
    return { ...report, attachments };
  });
  res.json({ reports, statuses: STATUS_FLOW });
});

router.get('/reports/mine', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, i.incident_code, i.title AS incident_title, i.status AS incident_status
    FROM outage_reports r LEFT JOIN outage_incidents i ON i.id = r.incident_id
    WHERE r.reporter_id = ?
    ORDER BY r.reported_at DESC
  `).all(req.user.id).map((report) => {
    const { staff_remarks: _staffRemarks, ...residentReport } = report;
    const timeline = db.prepare(`
      SELECT event_type, title, details, from_status, to_status, actor_name, actor_user_id, created_at
      FROM report_status_history WHERE report_id = ? ORDER BY created_at, id
    `).all(report.id).map(({ details: _privateDetails, actor_user_id: _actorUserId, ...event }) => event);
    return { ...residentReport, timeline };
  });
  res.json({ reports: rows });
});

router.get('/reports/possible-duplicates', requireAuth, requireRole('resident'), (req, res) => {
  const { barangay, latitude, longitude } = req.query;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!barangay || !Number.isFinite(lat) || lat < -90 || lat > 90
    || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Choose a barangay and confirm a valid map location before checking similar reports.' });
  }

  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const candidates = db.prepare(`
    SELECT report_code, status, possible_outage_type, reported_at, latitude, longitude
    FROM outage_reports
    WHERE barangay = ?
      AND reported_at >= ?
      AND status NOT IN ('Rejected', 'Duplicate', 'Resolved')
      AND latitude IS NOT NULL AND longitude IS NOT NULL
  `).all(String(barangay).trim(), cutoff);

  const toRadians = (degrees) => degrees * Math.PI / 180;
  const matches = candidates.map((candidate) => {
    const dLat = toRadians(Number(candidate.latitude) - lat);
    const dLng = toRadians(Number(candidate.longitude) - lng);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(toRadians(lat)) * Math.cos(toRadians(Number(candidate.latitude))) * Math.sin(dLng / 2) ** 2;
    const distanceMeters = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return { ...candidate, distance_m: Math.round(distanceMeters) };
  }).filter((candidate) => candidate.distance_m <= 1000)
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, 5)
    .map(({ report_code, status, possible_outage_type, reported_at, distance_m }) => ({
      report_code,
      status,
      possible_outage_type,
      reported_at,
      distance_m,
    }));

  res.json({ possible_duplicates: matches, radius_m: 1000, lookback_hours: 72 });
});

router.get('/reports/:id', requireAuth, (req, res) => {
  const report = reportDetailRow(Number(req.params.id));
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  if (req.user.role === 'resident' && report.reporter_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only view your own reports.' });
  }
  if (req.user.role === 'resident') {
    delete report.staff_remarks;
    report.timeline = report.timeline.map(({ details: _privateDetails, actor_user_id: _actorUserId, ...event }) => event);
  }
  if (req.user.role === 'personnel' && !staffCanAccessBarangay(req.user, report.barangay)) {
    return res.status(404).json({ error: 'Report not found.' });
  }
  res.json({ report });
});

// Update report status (personnel/admin/utility). "Verify and confirm" handled here.
router.put('/reports/:id/status', requireAuth, requireRole('personnel', 'administrator', 'utility'), (req, res) => {
  const report = db.prepare('SELECT * FROM outage_reports WHERE id = ?').get(Number(req.params.id));
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  if (!staffCanAccessBarangay(req.user, report.barangay)) return res.status(404).json({ error: 'Report not found.' });

  const { status, remarks, verify } = req.body || {};
  if (status !== undefined && !STATUS_FLOW.includes(status)) {
    return res.status(400).json({ error: 'Invalid report status.' });
  }
  if (verify !== undefined && verify !== 'officially-confirmed') {
    return res.status(400).json({ error: 'Invalid verification action.' });
  }
  let nextStatus = status || report.status;
  let verificationStatus = report.verification_status;
  const cleanRemarks = String(remarks || '').trim();

  const canOfficiallyConfirm = ['administrator', 'utility'].includes(req.user.role);
  let completedAssignment = null;

  if (verify === 'officially-confirmed') {
    if (!canOfficiallyConfirm) {
      return res.status(403).json({ error: 'Only authorized utility personnel or administrators can mark a report as officially confirmed.' });
    }
    nextStatus = 'Officially Confirmed';
    verificationStatus = 'Officially Confirmed';
  } else if (status) {
    if (['Assigned', 'Acknowledged', 'In Progress'].includes(status)) {
      return res.status(409).json({ error: 'Assignment and field-response statuses must be updated through the linked response assignment.' });
    }
    if (status === 'Closed') {
      if (req.user.role !== 'administrator') return res.status(403).json({ error: 'Only an administrator can close a resolved report.' });
      if (report.status !== 'Resolved') return res.status(409).json({ error: 'A report must be resolved and reviewed before it can be closed.' });
      if (cleanRemarks.length < 5) return res.status(400).json({ error: 'Add Admin closure remarks before closing this report.' });
    }
    if (status === 'Resolved') {
      if (!['administrator', 'utility'].includes(req.user.role)) return res.status(403).json({ error: 'Only an administrator or authorized utility user can approve resolution.' });
      completedAssignment = db.prepare(`
        SELECT id FROM repair_assignments
        WHERE report_id = ? AND status = 'Completed' AND LENGTH(TRIM(COALESCE(crew_report, ''))) >= 5
        ORDER BY completed_at DESC, id DESC
        LIMIT 1
      `).get(report.id);
      if (!completedAssignment || cleanRemarks.length < 5) {
        return res.status(409).json({ error: 'A completed field assignment with a resolution report and Admin review remarks are required before resolving.' });
      }
    }
    if (status === 'Officially Confirmed' && !canOfficiallyConfirm) {
      return res.status(403).json({ error: 'Only authorized utility personnel or administrators can mark a report as officially confirmed.' });
    }
    switch (status) {
      case 'Under Review':
        verificationStatus = 'Under Review';
        break;
      case 'Verified':
        verificationStatus = 'Verified';
        break;
      case 'In Progress':
        verificationStatus = 'Verified';
        break;
      case 'Unverified':
        verificationStatus = 'Unverified';
        break;
      case 'Duplicate':
        verificationStatus = 'Duplicate';
        break;
      case 'Rejected':
        verificationStatus = 'Rejected';
        break;
      case 'Resolved':
        verificationStatus = 'Verified';
        break;
      case 'Closed':
        verificationStatus = 'Verified';
        break;
      default:
        break;
    }
    nextStatus = status;
  }

  const updatedAt = now();
  const priority = req.body?.priority;
  if (priority !== undefined && !['Low', 'Medium', 'High', 'Critical'].includes(priority)) {
    return res.status(400).json({ error: 'Choose a valid report priority.' });
  }
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`UPDATE outage_reports
      SET status = ?, verification_status = ?, staff_remarks = ?,
          priority = COALESCE(?, priority),
          repair_status = CASE WHEN ? = 'Resolved' THEN 'Resolved' ELSE repair_status END,
          updated_at = ?
      WHERE id = ?`)
      .run(nextStatus, verificationStatus, cleanRemarks || report.staff_remarks || null, priority || null, nextStatus, updatedAt, report.id);
    if (nextStatus === 'Resolved' && completedAssignment) {
      db.prepare(`UPDATE repair_assignments
        SET status = 'Resolved', resolution_remarks = ?, updated_at = ?
        WHERE id = ?`)
        .run(cleanRemarks, updatedAt, completedAssignment.id);
    }
    recordReportStatusChange(report, nextStatus, req.user, updatedAt, cleanRemarks || null);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Failed to update resident report status:', error);
    return res.status(500).json({ error: 'Failed to update report status.' });
  }
  const updated = db.prepare('SELECT * FROM outage_reports WHERE id = ?').get(report.id);
  audit(req.user, `Report ${nextStatus}`, `Report ${report.report_code} marked ${nextStatus}.`);

  const actions = {
    'Officially Confirmed': `Your report ${report.report_code} has been officially confirmed by authorized personnel.`,
    Verified: `Your report ${report.report_code} has been verified.`,
    'Assigned': `A field response team was assigned to report ${report.report_code}. This is a coordination update, not confirmation of an external utility dispatch.`,
    'Acknowledged': `The assigned response team acknowledged report ${report.report_code}.`,
    'In Progress': `Field response work is in progress for report ${report.report_code}.`,
    Rejected: `Your report ${report.report_code} was rejected. Remarks: ${remarks || 'none provided'}.`,
    Duplicate: `Your report ${report.report_code} was identified as a duplicate.`,
    Unverified: `Your report ${report.report_code} could not be verified.`,
    'Under Review': `Your report ${report.report_code} is now under review.`,
    Resolved: `Resolution for report ${report.report_code} was reviewed and approved.`,
    Closed: `Report ${report.report_code} has been closed after Admin review.`,
  };
  if (actions[nextStatus]) {
    notifyUsers([report.reporter_id], 'Report updated', actions[nextStatus], 'report');
  }

  res.json({ report: updated, message: 'Report updated successfully.' });
});

// Mark report as duplicate / link to another report
router.put('/reports/:id/duplicate', requireAuth, requireRole('personnel', 'administrator'), (req, res) => {
  const report = db.prepare('SELECT * FROM outage_reports WHERE id = ?').get(Number(req.params.id));
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  if (!staffCanAccessBarangay(req.user, report.barangay)) return res.status(404).json({ error: 'Report not found.' });

  const { related_code, remarks } = req.body || {};
  const duplicateNote = `Duplicate of ${related_code || 'another report'}. ${remarks || ''}`.trim();

  const updatedAt = now();
  db.prepare("UPDATE outage_reports SET status = 'Duplicate', verification_status = 'Duplicate', staff_remarks = ?, updated_at = ? WHERE id = ?")
    .run(duplicateNote, updatedAt, report.id);
  recordReportStatusChange(report, 'Duplicate', req.user, updatedAt, 'Staff identified this report as a possible duplicate.');

  audit(req.user, 'Duplicate identified', `Report ${report.report_code} marked duplicate.`);
  notifyUsers([report.reporter_id], 'Report identified as duplicate', duplicateNote, 'report');
  res.json({ message: 'Report marked as duplicate.' });
});

module.exports = router;