const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { db, now, DB_PATH, UPLOAD_DIR, VALENCIA_BARANGAYS } = require('../../db');
const { requireAuth, requireRole, audit, isBuiltInAdmin } = require('../../middleware/auth');
const { hashSessionToken } = require('../../middleware/session-token');

const router = express.Router();

const createVerifiedDatabaseBackup = () => {
  const checkpoint = db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();
  if (Number(checkpoint?.busy)) {
    throw Object.assign(new Error('The database is busy. Retry the backup before resetting.'), { status: 503 });
  }
  const buffer = fs.readFileSync(DB_PATH);
  if (buffer.subarray(0, 16).toString() !== 'SQLite format 3\0') {
    throw Object.assign(new Error('The database backup could not be verified.'), { status: 500 });
  }

  const temporaryPath = path.join(os.tmpdir(), `powerwatch-backup-${crypto.randomUUID()}.db`);
  let snapshot;
  try {
    fs.writeFileSync(temporaryPath, buffer, { flag: 'wx' });
    snapshot = new DatabaseSync(temporaryPath);
    const integrity = snapshot.prepare('PRAGMA integrity_check').get();
    if (integrity?.integrity_check !== 'ok') {
      throw Object.assign(new Error('The database backup failed its integrity check.'), { status: 500 });
    }
  } finally {
    snapshot?.close();
    fs.rmSync(temporaryPath, { force: true });
  }

  return {
    buffer,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
};

const managedUploadFilename = (filename) => /^(?:report_\d+_[\w-]+|photo_\d+_\d+|announcement_[\w-]+|profile_\d+_\d+)\.(?:jpe?g|png|webp|mp4|mov)$/i.test(filename);

const removeManagedUpload = (filename) => {
  if (!managedUploadFilename(filename)) return false;
  const uploadRoot = path.resolve(UPLOAD_DIR);
  const filePath = path.resolve(uploadRoot, filename);
  if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) return false;
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
};

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

// Download database backup
router.get('/backup', requireAuth, requireRole('administrator'), (req, res) => {
  const backup = createVerifiedDatabaseBackup();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  res.set({
    'Cache-Control': 'private, no-store',
    'Content-Type': 'application/vnd.sqlite3',
    'Content-Disposition': `attachment; filename="valencia-powerwatch-${stamp}.db"`,
    'Content-Length': String(backup.buffer.length),
    'X-Database-SHA256': backup.sha256,
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(backup.buffer);
});

router.post('/maintenance/clean-reset', requireAuth, requireRole('administrator'), (req, res) => {
  const keepEmail = String(req.body?.keep_email || '').trim().toLowerCase();
  const confirmation = String(req.body?.confirmation || '');
  const expectedConfirmation = `RESET ALL EXCEPT ${keepEmail}`;
  const backupSha256 = String(req.body?.backup_sha256 || '').toLowerCase();
  const retainedIdentifiers = [req.user.email, req.user.username, req.user.recovery_email]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
  if (!isBuiltInAdmin(req.user) || !retainedIdentifiers.includes(keepEmail)) {
    return res.status(403).json({ error: 'Sign in with the built-in administrator account that you chose to preserve.' });
  }
  if (confirmation.trim().toLowerCase() !== expectedConfirmation.toLowerCase()) {
    return res.status(400).json({ error: `Type "${expectedConfirmation}" exactly to confirm the reset.` });
  }
  if (!/^[a-f0-9]{64}$/.test(backupSha256)) {
    return res.status(400).json({ error: 'Download a verified database backup before resetting.' });
  }

  let backup;
  try {
    backup = createVerifiedDatabaseBackup();
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'A verified backup could not be created.' });
  }
  if (backup.sha256 !== backupSha256) {
    return res.status(409).json({ error: 'The database changed after the backup. Download a fresh backup and retry the reset.' });
  }

  const adminId = Number(req.user.id);
  const removed = {
    users: Number(db.prepare('SELECT COUNT(*) AS count FROM users WHERE id != ?').get(adminId).count),
    reports: Number(db.prepare('SELECT COUNT(*) AS count FROM outage_reports').get().count),
    incidents: Number(db.prepare('SELECT COUNT(*) AS count FROM outage_incidents').get().count),
    assignments: Number(db.prepare('SELECT COUNT(*) AS count FROM repair_assignments').get().count),
    teams: Number(db.prepare('SELECT COUNT(*) AS count FROM repair_teams').get().count),
    announcements: Number(db.prepare('SELECT COUNT(*) AS count FROM announcements').get().count),
    scheduled_outages: Number(db.prepare('SELECT COUNT(*) AS count FROM scheduled_outages').get().count),
    barangays: 0,
  };
  const retainedPhotoPath = db.prepare('SELECT profile_photo_path FROM users WHERE id = ?').get(adminId)?.profile_photo_path || '';
  const retainedPhotoFilename = retainedPhotoPath.startsWith('/uploads/') ? path.basename(retainedPhotoPath) : '';

  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`
      DELETE FROM repair_assignment_updates;
      DELETE FROM repair_assignment_evidence;
      DELETE FROM staff_team_members;
      DELETE FROM staff_barangay_assignments;
      DELETE FROM report_status_history;
      DELETE FROM report_attachments;
      DELETE FROM incident_links;
      DELETE FROM incident_areas;
      DELETE FROM repair_assignments;
      DELETE FROM citizen_feedback;
      DELETE FROM announcements;
      DELETE FROM notifications;
      DELETE FROM scheduled_outages;
      DELETE FROM outage_reports;
      DELETE FROM outage_incidents;
      DELETE FROM repair_teams;
      DELETE FROM sms_logs;
      DELETE FROM oauth_states;
      DELETE FROM password_reset_tokens;
      DELETE FROM audit_logs;
    `);
    db.prepare('DELETE FROM oauth_accounts WHERE user_id != ?').run(adminId);
    db.prepare('DELETE FROM sessions WHERE token != ?').run(hashSessionToken(req.token));
    db.prepare('DELETE FROM users WHERE id != ?').run(adminId);
    db.prepare("DELETE FROM settings WHERE key = 'barangay_seed_disabled'").run();
    db.exec(`
      DELETE FROM sqlite_sequence WHERE name IN (
        'outage_reports','outage_incidents','incident_links','incident_areas',
        'scheduled_outages','announcements','notifications','audit_logs',
        'citizen_feedback','sms_logs','report_attachments','report_status_history',
        'repair_assignments','repair_teams','repair_assignment_updates',
        'repair_assignment_evidence','staff_team_members','staff_barangay_assignments'
      );
    `);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: `The reset was rolled back: ${error.message}` });
  }

  let deletedUploads = 0;
  let failedUploadDeletes = 0;
  try {
    for (const filename of fs.readdirSync(UPLOAD_DIR)) {
      if (filename === retainedPhotoFilename) continue;
      try {
        if (removeManagedUpload(filename)) deletedUploads++;
      } catch {
        failedUploadDeletes++;
      }
    }
    const evidenceDirectory = path.join(path.dirname(DB_PATH), 'staff-evidence');
    for (const filename of fs.readdirSync(evidenceDirectory)) {
      if (!/^[\da-f-]{36}\.(?:jpg|png|webp|mp4|mov)$/i.test(filename)) continue;
      try {
        fs.unlinkSync(path.join(evidenceDirectory, filename));
        deletedUploads++;
      } catch (error) {
        if (error.code !== 'ENOENT') failedUploadDeletes++;
      }
    }
  } catch (error) {
    failedUploadDeletes++;
    console.error('Clean reset completed, but upload cleanup encountered an error:', error);
  }

  audit(req.user, 'Clean system reset', 'Removed all non-administrator accounts and operational/demo data after a verified database backup.');
  res.json({
    message: `Clean reset completed. Only the selected administrator account and system configuration remain; all ${VALENCIA_BARANGAYS.length} official barangays were preserved.`,
    retained_admin: req.user.email,
    removed,
    preserved_barangays: VALENCIA_BARANGAYS.length,
    deleted_upload_files: deletedUploads,
    failed_upload_file_deletes: failedUploadDeletes,
  });
});

// ---------------- Real-Time Telemetry & Audio Ping Heartbeat ----------------
router.get('/telemetry-heartbeat', requireAuth, requireRole('administrator'), (req, res) => {
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
