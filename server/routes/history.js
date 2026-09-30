const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

const duration = (start, end) => {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  return ms;
};

const baseSelect = `
  SELECT i.*, s.schedule_code, s.outage_date AS scheduled_date, s.start_time AS scheduled_start,
         s.expected_end_time AS scheduled_end, s.reason AS scheduled_reason, u.full_name AS created_by_name
  FROM outage_incidents i
  LEFT JOIN scheduled_outages s ON s.id = i.scheduled_id
  LEFT JOIN users u ON u.id = i.created_by
`;

const listHistory = (query) => {
  const { barangay, type, from, to, q } = query;
  const where = ["i.status = 'Closed'"];
  const params = [];

  if (barangay) { where.push('i.barangay = ?'); params.push(barangay); }
  if (type && type !== 'all') { where.push('i.incident_type = ?'); params.push(type); }
  if (from) { where.push('i.closed_at >= ?'); params.push(new Date(`${from}T00:00:00`).toISOString()); }
  if (to) { where.push('i.closed_at <= ?'); params.push(new Date(`${to}T23:59:59`).toISOString()); }
  if (q) {
    where.push('(i.incident_code LIKE ? OR i.title LIKE ? OR i.barangay LIKE ? OR i.affected_area LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  return db.prepare(`
    ${baseSelect}
    WHERE ${where.join(' AND ')}
    ORDER BY i.closed_at DESC
  `).all(...params).map((row) => {
    const dur = duration(row.start_time, row.end_time || row.closed_at);
    return {
      ...row,
      duration_hours: dur === null ? null : Math.round(dur / 3600000 * 10) / 10,
      duration_display: dur === null
        ? null
        : `${Math.floor(dur / 3600000)}h ${Math.round((dur % 3600000) / 60000)}m`,
    };
  });
};

// Historical closed incidents with search/filter (all authenticated roles)
router.get('/', requireAuth, (req, res) => {
  res.json({ history: listHistory(req.query) });
});

// CSV export (administrator / personnel)
router.get('/export.csv', requireAuth, (req, res) => {
  const rows = listHistory(req.query);
  const headers = [
    'Incident Code', 'Title', 'Barangay', 'Type', 'Cause/Category', 'Status',
    'Start Time', 'End Time', 'Restoration Time', 'Duration (hours)', 'Affected Area', 'Remarks',
  ];
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => [
      r.incident_code, r.title, r.barangay, r.incident_type, r.cause_category, r.status,
      r.start_time, r.end_time, r.closed_at, r.duration_hours, r.affected_area, r.remarks,
    ].map(esc).join(',')),
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="valencia-powerwatch-history.csv"');
  res.send(`\uFEFF${lines.join('\n')}`);
});

module.exports = router;