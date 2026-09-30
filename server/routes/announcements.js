const express = require('express');
const { db, now } = require('../db');
const { requireAuth, requireRole, audit, notifyAllActive } = require('../auth');

const router = express.Router();

const CATEGORIES = [
  'Scheduled Outage', 'Restoration Update', 'Emergency Advisory',
  'Service Advisory', 'General Information', 'System Announcement',
];

const rowById = (id) => {
  const row = db.prepare(`
    SELECT a.*, u.full_name AS author_name FROM announcements a JOIN users u ON u.id = a.created_by WHERE a.id = ?
  `).get(Number(id));
  return row || null;
};

// Published announcements visible to all authenticated users
router.get('/', requireAuth, (req, res) => {
  const { q, category } = req.query;
  const where = ["a.status = 'Published'"];
  const params = [];
  if (category) { where.push('a.category = ?'); params.push(category); }
  if (q) { where.push('(a.title LIKE ? OR a.content LIKE ?)'); const like = `%${q}%`; params.push(like, like); }

  const rows = db.prepare(`
    SELECT a.*, u.full_name AS author_name FROM announcements a JOIN users u ON u.id = a.created_by
    WHERE ${where.join(' AND ')}
    ORDER BY a.published_at DESC
  `).all(...params);

  res.json({ announcements: rows, categories: CATEGORIES });
});

// Management view (drafts included) for authorized roles
router.get('/manage', requireAuth, requireRole('personnel', 'administrator', 'utility'), (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, u.full_name AS author_name FROM announcements a JOIN users u ON u.id = a.created_by
    ORDER BY a.created_at DESC
  `).all();
  res.json({ announcements: rows, categories: CATEGORIES });
});

router.get('/:id', requireAuth, (req, res) => {
  const row = rowById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Announcement not found.' });
  res.json({ announcement: row });
});

// Create announcement (personnel / administrator / utility)
router.post('/', requireAuth, requireRole('personnel', 'administrator', 'utility'), (req, res) => {
  const { title, content, category, publish } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Announcement title is required.' });
  if (!content || !String(content).trim()) return res.status(400).json({ error: 'Announcement content is required.' });

  const ts = now();
  const status = publish ? 'Published' : 'Draft';
  const info = db.prepare(`
    INSERT INTO announcements (title, content, category, status, published_at, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(String(title).trim(), String(content).trim(), category || 'General Information', status, publish ? ts : null, req.user.id, ts);

  const row = rowById(info.lastInsertRowid);
  audit(req.user, status === 'Published' ? 'Announcement published' : 'Announcement drafted', `Announcement "${row.title}" ${status}.`);

  if (status === 'Published') {
    notifyAllActive('New announcement', `${row.title} (${row.category})`, 'announcement');
  }

  res.status(201).json({ announcement: row, message: status === 'Published' ? 'Announcement published and residents notified.' : 'Announcement saved as draft.' });
});

// Edit
router.put('/:id', requireAuth, requireRole('personnel', 'administrator', 'utility'), (req, res) => {
  const row = rowById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Announcement not found.' });
  const { title, content, category } = req.body || {};
  db.prepare(`
    UPDATE announcements SET title = COALESCE(?, title), content = COALESCE(?, content), category = COALESCE(?, category) WHERE id = ?
  `).run(title || null, content || null, category || null, row.id);
  audit(req.user, 'Announcement edited', `Announcement "${row.title}" edited.`);
  res.json({ announcement: rowById(row.id), message: 'Announcement updated.' });
});

// Publish or archive
router.put('/:id/status', requireAuth, requireRole('personnel', 'administrator', 'utility'), (req, res) => {
  const row = rowById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Announcement not found.' });
  const { status } = req.body || {};
  if (!['Draft', 'Published', 'Archived'].includes(status)) return res.status(400).json({ error: 'Invalid announcement status.' });

  db.prepare('UPDATE announcements SET status = ?, published_at = ? WHERE id = ?').run(status, status === 'Published' ? now() : row.published_at, row.id);
  audit(req.user, `Announcement ${status}`, `Announcement "${row.title}" ${status === 'Published' ? 'published' : 'moved to ' + status}.`);

  if (status === 'Published') {
    notifyAllActive('New announcement', `${row.title} (${row.category})`, 'announcement');
  }

  const updated = rowById(row.id);
  const message = status === 'Published' ? 'Announcement published and residents notified.' : `Announcement status set to ${status}.`;
  res.json({ announcement: updated, message });
});

router.delete('/:id', requireAuth, requireRole('personnel', 'administrator', 'utility'), (req, res) => {
  const row = rowById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Announcement not found.' });

  db.prepare('DELETE FROM announcements WHERE id = ?').run(row.id);
  audit(req.user, 'Announcement deleted', `Announcement "${row.title}" was deleted.`);
  res.json({ message: 'Announcement deleted successfully.' });
});

module.exports = router;