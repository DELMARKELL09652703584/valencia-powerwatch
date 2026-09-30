const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const { db, now, UPLOAD_DIR, nextCode } = require('../db');
const { requireAuth, requireRole, audit, notifyRole, notifyUsers } = require('../auth');

const router = express.Router();

const STATUS_FLOW = ['Submitted', 'Under Review', 'Verified', 'Officially Confirmed', 'Unverified', 'Duplicate', 'Rejected', 'Resolved'];
const ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'video/mp4']);
const reportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!ATTACHMENT_TYPES.has(file.mimetype)) return callback(new Error('Use JPG, PNG, or MP4 attachments.'));
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
  return file.mimetype === 'video/mp4' && file.buffer.toString('ascii', 4, 8) === 'ftyp';
};

const storeReportAttachment = async (file, reportId) => {
  const extension = file.mimetype === 'image/jpeg' ? 'jpg' : file.mimetype === 'image/png' ? 'png' : 'mp4';
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
    ? db.prepare('SELECT id, incident_code, title, status, incident_type, cause_category FROM outage_incidents WHERE id = ?').get(report.incident_id)
    : null;
  report.linked_incident = report.incident_id ? report.incident : null;
  report.attachments = db.prepare('SELECT id, file_path, mime_type, original_name, file_size FROM report_attachments WHERE report_id = ? ORDER BY id').all(id);
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
  const { location, latitude, longitude, barangay, date_time_noticed, description, affected_area, possible_outage_type, photoData, remarks } = req.body || {};

  if (!barangay) return res.status(400).json({ error: 'Barangay is required.' });
  if (!description || !String(description).trim()) return res.status(400).json({ error: 'Please describe the interruption.' });
  if (!date_time_noticed) return res.status(400).json({ error: 'Please indicate when the interruption was noticed.' });
  const hasLatitude = latitude !== null && latitude !== undefined && latitude !== '';
  const hasLongitude = longitude !== null && longitude !== undefined && longitude !== '';
  if (hasLatitude !== hasLongitude) return res.status(400).json({ error: 'Both GPS coordinates are required together.' });
  if (hasLatitude && (!Number.isFinite(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90 || !Number.isFinite(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)) {
    return res.status(400).json({ error: 'Please provide valid GPS coordinates.' });
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
  const info = db.prepare(`
    INSERT INTO outage_reports (report_code, reporter_id, location, latitude, longitude, barangay, date_time_noticed, description, affected_area,
      possible_outage_type, photo_path, remarks, status, verification_status, reported_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', 'Pending', ?, ?)
  `).run(
    code, req.user.id, location || null, latitude ?? null, longitude ?? null, barangay, date_time_noticed, String(description).trim(),
    affected_area || null, possible_outage_type || null, photoPath, remarks || null, reportedAt, reportedAt
  );

  const reportId = Number(info.lastInsertRowid);
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

// Staff/admin/utility view report queue with filters
router.get('/reports', requireAuth, requireRole('personnel', 'administrator', 'utility'), (req, res) => {
  const { status, verification, barangay, q } = req.query;

  const where = [];
  const params = [];
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
    SELECT r.*, u.full_name AS reporter_name, u.email AS reporter_email
    FROM outage_reports r JOIN users u ON u.id = r.reporter_id
    ${whereSql}
    ORDER BY r.reported_at DESC
  `).all(...params);

  res.json({ reports: rows, statuses: STATUS_FLOW });
});

router.get('/reports/mine', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, i.incident_code, i.title AS incident_title, i.status AS incident_status
    FROM outage_reports r LEFT JOIN outage_incidents i ON i.id = r.incident_id
    WHERE r.reporter_id = ?
    ORDER BY r.reported_at DESC
  `).all(req.user.id);
  res.json({ reports: rows });
});

router.get('/reports/:id', requireAuth, (req, res) => {
  const report = reportDetailRow(Number(req.params.id));
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  if (req.user.role === 'resident' && report.reporter_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only view your own reports.' });
  }
  res.json({ report });
});

// Update report status (personnel/admin/utility). "Verify and confirm" handled here.
router.put('/reports/:id/status', requireAuth, requireRole('personnel', 'administrator', 'utility'), (req, res) => {
  const report = db.prepare('SELECT * FROM outage_reports WHERE id = ?').get(Number(req.params.id));
  if (!report) return res.status(404).json({ error: 'Report not found.' });

  const { status, remarks, verify } = req.body || {};
  let nextStatus = status || report.status;
  let verificationStatus = report.verification_status;

  const canOfficiallyConfirm = ['administrator', 'utility'].includes(req.user.role);

  if (verify === 'officially-confirmed') {
    if (!canOfficiallyConfirm) {
      return res.status(403).json({ error: 'Only authorized utility personnel or administrators can mark a report as officially confirmed.' });
    }
    nextStatus = 'Officially Confirmed';
    verificationStatus = 'Officially Confirmed';
  } else if (status) {
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
      default:
        break;
    }
    nextStatus = status;
  }

  db.prepare('UPDATE outage_reports SET status = ?, verification_status = ?, staff_remarks = ?, updated_at = ? WHERE id = ?')
    .run(nextStatus, verificationStatus, remarks || report.staff_remarks || null, now(), report.id);

  const updated = db.prepare('SELECT * FROM outage_reports WHERE id = ?').get(report.id);
  audit(req.user, `Report ${nextStatus}`, `Report ${report.report_code} marked ${nextStatus}.`);

  const actions = {
    'Officially Confirmed': `Your report ${report.report_code} has been officially confirmed by authorized personnel.`,
    Verified: `Your report ${report.report_code} has been verified.`,
    Rejected: `Your report ${report.report_code} was rejected. Remarks: ${remarks || 'none provided'}.`,
    Duplicate: `Your report ${report.report_code} was identified as a duplicate.`,
    Unverified: `Your report ${report.report_code} could not be verified.`,
    'Under Review': `Your report ${report.report_code} is now under review.`,
    Resolved: `Your report ${report.report_code} has been resolved.`,
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

  const { related_code, remarks } = req.body || {};
  const duplicateNote = `Duplicate of ${related_code || 'another report'}. ${remarks || ''}`.trim();

  db.prepare("UPDATE outage_reports SET status = 'Duplicate', verification_status = 'Duplicate', staff_remarks = ?, updated_at = ? WHERE id = ?")
    .run(duplicateNote, now(), report.id);

  audit(req.user, 'Duplicate identified', `Report ${report.report_code} marked duplicate.`);
  notifyUsers([report.reporter_id], 'Report identified as duplicate', duplicateNote, 'report');
  res.json({ message: 'Report marked as duplicate.' });
});

module.exports = router;