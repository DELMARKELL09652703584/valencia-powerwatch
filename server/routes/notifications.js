const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole, audit, notifyAllActive, notifyAllResidents, notifyAllStaff } = require('../auth');

const router = express.Router();

// My notifications
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
  `).all(req.user.id);
  res.json({ notifications: rows });
});

router.get('/unread-count', requireAuth, (req, res) => {
  const row = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id);
  res.json({ unread: Number(row.c) });
});

router.put('/:id/read', requireAuth, (req, res) => {
  const result = db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'Notification not found.' });
  res.json({ message: 'Notification marked as read.' });
});

router.put('/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'All notifications marked as read.' });
});

router.post('/', requireAuth, requireRole('personnel', 'administrator', 'utility'), (req, res) => {
  const { title, message, type = 'general', audience = 'all' } = req.body || {};
  const cleanTitle = String(title || '').trim();
  const cleanMessage = String(message || '').trim();
  if (!cleanTitle || !cleanMessage) return res.status(400).json({ error: 'Title and message are required.' });
  if (cleanTitle.length > 120 || cleanMessage.length > 1000) return res.status(400).json({ error: 'Title or message exceeds the allowed length.' });
  if (!['general', 'incident', 'scheduled', 'announcement', 'report', 'system'].includes(type)) return res.status(400).json({ error: 'Invalid notification type.' });
  if (!['all', 'resident', 'staff'].includes(audience)) return res.status(400).json({ error: 'Invalid notification audience.' });

  if (audience === 'resident') notifyAllResidents(cleanTitle, cleanMessage, type);
  else if (audience === 'staff') notifyAllStaff(cleanTitle, cleanMessage, type);
  else notifyAllActive(cleanTitle, cleanMessage, type);

  const audienceLabel = audience === 'resident' ? 'residents' : audience === 'staff' ? 'staff' : 'all active users';
  audit(req.user, 'Notification sent', `${req.user.full_name} sent "${cleanTitle}" to ${audienceLabel}.`);
  res.json({ message: `Notification sent to ${audienceLabel}.` });
});

router.put('/:id', requireAuth, (req, res) => {
  const read = req.body?.read;
  if (typeof read !== 'boolean') return res.status(400).json({ error: 'Read status must be true or false.' });
  const result = db.prepare('UPDATE notifications SET read = ? WHERE id = ? AND user_id = ?').run(read ? 1 : 0, Number(req.params.id), req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'Notification not found.' });
  res.json({ message: read ? 'Notification marked as read.' : 'Notification marked as unread.' });
});

router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'Notification not found.' });
  res.json({ message: 'Notification deleted.' });
});

module.exports = router;