const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, now, UPLOAD_DIR } = require('../db');
const { requireAuth, requireRole, audit, notifyAllActive } = require('../auth');

const router = express.Router();

const CATEGORIES = [
  'Scheduled Outage', 'Restoration Update', 'Emergency Advisory',
  'Service Advisory', 'General Information', 'System Announcement',
];

const saveAnnouncementImage = async (imageData) => {
  if (!imageData) return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(imageData);
  if (!match) throw Object.assign(new Error('Choose a JPG, PNG, or WebP announcement image.'), { status: 400 });
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 4 * 1024 * 1024) throw Object.assign(new Error('Announcement images must be 4 MB or smaller.'), { status: 400 });
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[match[1]];
  const filename = `announcement_${crypto.randomUUID()}.${extension}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), buffer, { flag: 'wx' });
  return `/uploads/${filename}`;
};

const removeAnnouncementImage = async (imagePath) => {
  const filename = path.basename(String(imagePath || ''));
  if (!/^announcement_[\w-]+\.(?:jpg|png|webp)$/.test(filename)) return;
  await fs.promises.unlink(path.join(UPLOAD_DIR, filename)).catch(() => {});
};

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
  const isStaff = ['personnel', 'administrator', 'utility'].includes(req.user.role);
  if (row.status !== 'Published' && !isStaff) return res.status(404).json({ error: 'Announcement not found.' });
  res.json({ announcement: row });
});

// Create announcement (personnel / administrator / utility)
router.post('/', requireAuth, requireRole('personnel', 'administrator', 'utility'), async (req, res, next) => {
  const { title, content, category, publish, imageData } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Announcement title is required.' });
  if (!content || !String(content).trim()) return res.status(400).json({ error: 'Announcement content is required.' });

  let imagePath;
  const ts = now();
  const status = publish ? 'Published' : 'Draft';
  let info;
  try {
    imagePath = await saveAnnouncementImage(imageData);
    info = db.prepare(`
      INSERT INTO announcements (title, content, category, status, image_path, published_at, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(String(title).trim(), String(content).trim(), category || 'General Information', status, imagePath, publish ? ts : null, req.user.id, ts);
  } catch (error) {
    if (imagePath) await removeAnnouncementImage(imagePath);
    next(error);
    return;
  }

  const row = rowById(info.lastInsertRowid);
  audit(req.user, status === 'Published' ? 'Announcement published' : 'Announcement drafted', `Announcement "${row.title}" ${status}.`);
  if (status === 'Published') {
    notifyAllActive('New announcement', `${row.title} (${row.category})`, 'announcement');
  }
  res.status(201).json({ announcement: row, message: status === 'Published' ? 'Announcement published and residents notified.' : 'Announcement saved as draft.' });
});

// Edit
router.put('/:id', requireAuth, requireRole('personnel', 'administrator', 'utility'), async (req, res, next) => {
  const row = rowById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Announcement not found.' });
  const { title, content, category, imageData, removeImage } = req.body || {};
  let newImagePath;
  let imagePath;
  try {
    newImagePath = imageData ? await saveAnnouncementImage(imageData) : null;
    imagePath = newImagePath || (removeImage ? null : row.image_path);
    db.prepare(`
      UPDATE announcements SET title = COALESCE(?, title), content = COALESCE(?, content), category = COALESCE(?, category), image_path = ? WHERE id = ?
    `).run(title || null, content || null, category || null, imagePath, row.id);
  } catch (error) {
    if (newImagePath) await removeAnnouncementImage(newImagePath);
    next(error);
    return;
  }
  if (row.image_path && row.image_path !== imagePath) await removeAnnouncementImage(row.image_path);
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

router.delete('/:id', requireAuth, requireRole('personnel', 'administrator', 'utility'), async (req, res) => {
  const row = rowById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Announcement not found.' });

  db.prepare('DELETE FROM announcements WHERE id = ?').run(row.id);
  await removeAnnouncementImage(row.image_path);
  audit(req.user, 'Announcement deleted', `Announcement "${row.title}" was deleted.`);
  res.json({ message: 'Announcement deleted successfully.' });
});

module.exports = router;