const path = require('node:path');
const fs = require('node:fs/promises');
require('dotenv').config();
const express = require('express');
const compression = require('compression');
const { ROOT, UPLOAD_DIR, db } = require('./db');
const {
  cleanupExpiredSessions, cleanupPersistentSessions, COOKIE_NAME, getUserByToken, requireAuth, requireRole,
  residentStore, persistentAuthConfigured,
} = require('./auth');
const { staffCanAccessBarangay } = require('./staff-access');
const { getStatus: getPersistenceStatus } = require('./persistence');

const authRoutes = require('./routes/auth');
const identityRoutes = require('./routes/identity');
const reportRoutes = require('./routes/reports');
const incidentRoutes = require('./routes/incidents');
const scheduledRoutes = require('./routes/scheduled');
const announcementRoutes = require('./routes/announcements');
const notificationRoutes = require('./routes/notifications');
const historyRoutes = require('./routes/history');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const feedbackRoutes = require('./routes/feedback');
const repairRoutes = require('./routes/repair');
const staffRoutes = require('./routes/staff');
const chatbotRoutes = require('./routes/chatbot');

const app = express();
const PORT = process.env.PORT || 4000;

// Render terminates TLS at its proxy; trust exactly one hop so req.secure is accurate.
app.set('trust proxy', 1);

cleanupExpiredSessions();
cleanupPersistentSessions().catch((error) => console.error('Persistent session cleanup failed:', error));
const sessionCleanupTimer = setInterval(() => {
  cleanupExpiredSessions();
  cleanupPersistentSessions().catch((error) => console.error('Persistent session cleanup failed:', error));
}, 15 * 60 * 1000);
sessionCleanupTimer.unref();

app.use(compression());
// Lightweight cookie parser (only the session cookie is needed)
app.use((req, res, next) => {
  const header = req.headers.cookie || '';
  req.cookies = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    req.cookies[key] = decodeURIComponent(value);
  }
  next();
});

app.use('/api/chatbot', express.json({ limit: '2kb' }));
app.use(express.json({ limit: '8mb' }));
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  service: 'Valencia PowerWatch',
  storage: persistentAuthConfigured ? 'neon+sqlite' : 'sqlite',
  persistence: getPersistenceStatus(),
}));

app.use('/api', authRoutes);
app.use('/api', identityRoutes);
app.use('/api/reports', requireAuth, requireRole('resident', 'personnel', 'administrator', 'utility'));
app.use('/api/incidents', requireAuth, requireRole('resident', 'personnel', 'administrator', 'utility'));
app.use('/api', reportRoutes);
app.use('/api', incidentRoutes);
app.use('/api', repairRoutes);
app.use('/api', staffRoutes.router);
app.use('/api/scheduled', scheduledRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', feedbackRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.get('/uploads/:filename', async (req, res, next) => {
  const filename = req.params.filename;
  if (filename.startsWith('announcement_')) return next();

  const isReportAttachment = /^report_\d+_[\da-f-]+\.(?:jpg|png|webp|mp4|mov)$/i.test(filename);
  const isReportPhoto = /^photo_\d+_\d+\.(?:jpg|png|webp|gif)$/i.test(filename);
  const isProfilePhoto = /^profile_\d+_\d+\.(?:jpe?g|png|webp|gif)$/i.test(filename);
  if (!isReportAttachment && !isReportPhoto && !isProfilePhoto) return res.sendStatus(404);

  let user;
  try {
    user = await getUserByToken(req.cookies?.[COOKIE_NAME]);
  } catch (error) {
    return next(error);
  }
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.status !== 'Active') return res.status(403).json({ error: 'This account is deactivated.' });

  const uploadPath = `/uploads/${filename}`;
  if (isProfilePhoto) {
    const owner = db.prepare('SELECT id FROM users WHERE profile_photo_path = ?').get(uploadPath);
    if (!owner) return res.sendStatus(404);
    const canView = ['administrator', 'utility'].includes(user.role)
      || Number(owner.id) === Number(user.id);
    if (!canView) return res.status(403).json({ error: 'You do not have permission to view this profile photo.' });
  } else {
    const report = isReportAttachment
      ? db.prepare(`
        SELECT r.id AS report_id, r.reporter_id, r.barangay FROM report_attachments a
        JOIN outage_reports r ON r.id = a.report_id
        WHERE a.file_path = ?
      `).get(uploadPath)
      : db.prepare('SELECT id AS report_id, reporter_id, barangay FROM outage_reports WHERE photo_path = ?').get(uploadPath);

    if (!report) return res.sendStatus(404);
    const isAdministrativeStaff = ['administrator', 'utility'].includes(user.role);
    const isAssignedPersonnel = user.role === 'personnel' && (staffCanAccessBarangay(user, report.barangay) || db.prepare(`
      SELECT 1 FROM repair_assignments a
      JOIN staff_team_members m ON m.team_id = a.team_id
      WHERE a.report_id = ? AND m.user_id = ? LIMIT 1
    `).get(report.report_id, user.id));
    if (!isAdministrativeStaff && !isAssignedPersonnel && Number(report.reporter_id) !== Number(user.id)) {
      return res.status(403).json({ error: 'You do not have permission to view this report evidence.' });
    }
  }

  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(filename, { root: UPLOAD_DIR }, (error) => {
    if (error && !res.headersSent) next(error);
  });
});
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/assets', express.static(path.join(ROOT, 'assets')));
app.use('/vendor/leaflet', express.static(path.join(ROOT, 'node_modules', 'leaflet', 'dist')));
app.use('/vendor/leaflet-heat', express.static(path.join(ROOT, 'node_modules', 'leaflet.heat', 'dist')));

app.get(['/install', '/install.html', '/download', '/download.html'], (req, res) => res.sendFile(path.join(ROOT, 'download.html')));
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(path.join(ROOT, 'manifest.json'));
});
app.get('/staff-manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(path.join(ROOT, 'staff-manifest.json'));
});
app.get('/sw.js', async (req, res, next) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/community');
  try {
    const workerSource = await fs.readFile(path.join(ROOT, 'sw.js'), 'utf8');
    const buildId = JSON.stringify(process.env.RENDER_GIT_COMMIT || 'development');
    res.send(workerSource.replace("'__POWERWATCH_BUILD_ID__'", buildId));
  } catch (error) {
    next(error);
  }
});
app.get('/staff-sw.js', async (req, res, next) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/staff');
  try {
    const workerSource = await fs.readFile(path.join(ROOT, 'staff-sw.js'), 'utf8');
    const buildId = JSON.stringify(process.env.RENDER_GIT_COMMIT || 'development');
    res.send(workerSource.replace("'__POWERWATCH_STAFF_BUILD_ID__'", buildId));
  } catch (error) {
    next(error);
  }
});
app.get(['/staff', '/staff/'], (req, res) => res.sendFile(path.join(ROOT, 'staff.html')));
app.get(['/admin', '/admin.html'], (req, res) => res.sendFile(path.join(ROOT, 'admin.html')));
app.get(['/user', '/user.html', '/citizen', '/citizen.html', '/community', '/community.html'], (req, res) => res.sendFile(path.join(ROOT, 'community.html')));
app.get(['/auth/oauth-dialog', '/auth/oauth-popup'], (req, res) => {
  const provider = String(req.query.provider || '');
  if (!['google', 'facebook'].includes(provider)) return res.status(400).send('Unsupported sign-in provider.');
  return res.redirect(`/api/auth/oauth/${encodeURIComponent(provider)}`);
});
app.get(['/style.css', '/community/style.css', '/admin/style.css', '/install/style.css'], (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(path.join(ROOT, 'style.css'));
});
app.get(['/script.js', '/community/script.js', '/admin/script.js'], (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(path.join(ROOT, 'script.js'));
});
app.use(['/app', '/community/app', '/admin/app', '/install/app'], express.static(path.join(ROOT, 'app'), {
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache, must-revalidate')
}));
app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(ROOT, 'community.html')));

// Never serve the repository root. It contains the live SQLite database, server
// source, deployment configuration, and project documents.
app.use(
  ['/data', '/server', '/scripts', '/tests', '/node_modules', '/package.json', '/package-lock.json', '/render.yaml'],
  (req, res) => res.sendStatus(404),
);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  const requestedStatus = Number(err.status || err.statusCode);
  const status = requestedStatus >= 400 && requestedStatus < 500 ? requestedStatus : 500;
  const message = status === 413 ? 'Request body exceeds the allowed size.' : 'An unexpected error occurred on the server.';
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Valencia PowerWatch running at http://localhost:${PORT}`);
  console.log(`Resident auth storage: ${persistentAuthConfigured ? 'Neon + SQLite mirror' : 'SQLite only'}`);
  if (residentStore) {
    residentStore.ping()
      .then(() => console.log('Neon connection verified.'))
      .catch((error) => console.error('Neon connection check failed:', error.code || 'unknown error'));
  }
});
