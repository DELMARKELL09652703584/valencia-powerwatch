const path = require('node:path');
require('dotenv').config();
const express = require('express');
const compression = require('compression');
const { ROOT, UPLOAD_DIR } = require('./db');
const { cleanupExpiredSessions, COOKIE_NAME } = require('./auth');

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

const app = express();
const PORT = process.env.PORT || 4000;

cleanupExpiredSessions();
const sessionCleanupTimer = setInterval(cleanupExpiredSessions, 15 * 60 * 1000);
sessionCleanupTimer.unref();

app.use(compression());
app.use(express.json({ limit: '8mb' }));

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

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'Valencia PowerWatch' }));

app.use('/api', authRoutes);
app.use('/api', identityRoutes);
app.use('/api', reportRoutes);
app.use('/api', incidentRoutes);
app.use('/api/scheduled', scheduledRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/assets', express.static(path.join(ROOT, 'assets')));
app.use('/vendor/leaflet', express.static(path.join(ROOT, 'node_modules', 'leaflet', 'dist')));
app.use('/vendor/leaflet-heat', express.static(path.join(ROOT, 'node_modules', 'leaflet.heat', 'dist')));

app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/install', (req, res) => res.sendFile(path.join(ROOT, 'download.html')));
app.get('/download', (req, res) => res.sendFile(path.join(ROOT, 'download.html')));
app.get('/manifest.json', (req, res) => res.sendFile(path.join(ROOT, 'manifest.json')));
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(ROOT, 'sw.js'));
});
app.get('/admin', (req, res) => res.sendFile(path.join(ROOT, 'admin.html')));
app.get('/community', (req, res) => res.sendFile(path.join(ROOT, 'community.html')));
app.get('/style.css', (req, res) => res.sendFile(path.join(ROOT, 'style.css')));
app.get('/script.js', (req, res) => res.sendFile(path.join(ROOT, 'script.js')));
app.use('/app', express.static(path.join(ROOT, 'app')));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'An unexpected error occurred on the server.' });
});

app.listen(PORT, () => {
  console.log(`Valencia PowerWatch running at http://localhost:${PORT}`);
});