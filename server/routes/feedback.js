const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole, audit, notifyRole } = require('../auth');
const { sendSMS, getSmsLogs } = require('../sms');
const { calculateETR } = require('../etr');

const requireStaff = [requireAuth, requireRole('personnel', 'administrator', 'utility')];

const router = express.Router();

// Submit citizen satisfaction feedback
router.post('/feedback', requireAuth, (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const { report_id, incident_id, rating, restoration_confirmed } = body;
    const feedbackTextValue = body.feedback_text ?? body.comments ?? '';
    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Choose a rating from 1 to 5 stars.' });
    }
    if (typeof feedbackTextValue !== 'string') {
      return res.status(400).json({ error: 'Feedback comments must be text.' });
    }
    const feedbackText = feedbackTextValue.trim();
    if (feedbackText.length > 1000) {
      return res.status(400).json({ error: 'Feedback comments must be 1000 characters or fewer.' });
    }
    if (![undefined, true, false, 0, 1, '0', '1'].includes(restoration_confirmed)) {
      return res.status(400).json({ error: 'Choose whether power has been restored.' });
    }
    const confirmed = restoration_confirmed === false || restoration_confirmed === 0 || restoration_confirmed === '0' ? 0 : 1;
    const parseOptionalId = (value) => {
      if (value === undefined || value === null || value === '') return null;
      const id = Number(value);
      return Number.isSafeInteger(id) && id > 0 ? id : NaN;
    };
    const reportId = parseOptionalId(report_id);
    const incidentId = parseOptionalId(incident_id);
    if (Number.isNaN(reportId) || Number.isNaN(incidentId)) {
      return res.status(400).json({ error: 'Report and incident IDs must be positive integers.' });
    }
    if (incidentId && !reportId) {
      return res.status(400).json({ error: 'Link service feedback to one of your reports.' });
    }

    let report = null;
    if (reportId) {
      report = db.prepare('SELECT id, reporter_id, incident_id, status FROM outage_reports WHERE id = ?').get(reportId);
      if (!report) return res.status(404).json({ error: 'Report not found.' });
      if (Number(report.reporter_id) !== Number(req.user.id)) {
        return res.status(403).json({ error: 'You can only submit restoration feedback for your own report.' });
      }
      if (report.status !== 'Resolved') {
        return res.status(400).json({ error: 'Restoration feedback is available after a report is resolved.' });
      }
      if (incidentId) {
        const isLinked = Number(report.incident_id) === incidentId
          || Boolean(db.prepare('SELECT 1 FROM incident_links WHERE report_id = ? AND incident_id = ?').get(reportId, incidentId));
        if (!isLinked) return res.status(400).json({ error: 'The incident is not linked to this report.' });
      }
    }

    const now = new Date().toISOString();
    const user = req.user;
    db.exec('BEGIN IMMEDIATE');
    let result;
    try {
      result = db.prepare(`
        INSERT INTO citizen_feedback (
          report_id, incident_id, user_id, user_name, barangay, rating, feedback_text, restoration_confirmed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        reportId,
        incidentId,
        user.id,
        user.full_name || 'Resident',
        user.barangay || 'Valencia City',
        numRating,
        feedbackText,
        confirmed,
        now
      );
      audit(user, 'Community feedback submitted', `${user.full_name} rated the service ${numRating}/5${feedbackText ? `: ${feedbackText}` : '.'}`);
      notifyRole('personnel', 'Community feedback received', `${user.full_name} submitted a ${numRating}/5 rating.`, 'system');
      notifyRole('administrator', 'Community feedback received', `${user.full_name} submitted a ${numRating}/5 rating.`, 'system');
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    // Send thank-you notification / SMS confirmation
    if (user.contact_number) {
      sendSMS(
        user.contact_number,
        `Salamat sa imong feedback (${numRating} stars)! Ang Valencia PowerWatch ug LGU padayong nagpalambo sa serbisyo sa kuryente. Daghang salamat!`,
        'feedback_received'
      ).then((smsResult) => {
        if (!smsResult.success) console.error('Feedback confirmation SMS failed:', smsResult.reason || smsResult.status || 'Unknown SMS gateway failure.');
      }).catch((err) => console.error('Feedback confirmation SMS failed:', err));
    }

    res.status(201).json({ success: true, id: Number(result.lastInsertRowid), message: 'Salamat sa imong feedback!' });
  } catch (err) {
    console.error('Feedback submission error:', err);
    res.status(500).json({ error: 'Failed to submit feedback.' });
  }
});

// Get citizen satisfaction analytics & recent testimonials
router.get('/feedback/summary', requireAuth, requireRole('personnel', 'administrator', 'utility'), (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_feedback,
        AVG(rating) as average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as stars_5,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as stars_4,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as stars_3,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as stars_2,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as stars_1,
        SUM(CASE WHEN restoration_confirmed = 1 THEN 1 ELSE 0 END) as power_confirmed
      FROM citizen_feedback
    `).get();

    const recent = db.prepare(`
      SELECT id, report_id, user_name, barangay, rating, feedback_text, restoration_confirmed, created_at
      FROM citizen_feedback
      ORDER BY id DESC
      LIMIT 20
    `).all();

    res.json({
      total: stats.total_feedback || 0,
      average: Number((stats.average_rating || 0).toFixed(1)),
      breakdown: {
        5: stats.stars_5 || 0,
        4: stats.stars_4 || 0,
        3: stats.stars_3 || 0,
        2: stats.stars_2 || 0,
        1: stats.stars_1 || 0,
      },
      confirmed_rate: stats.total_feedback ? Math.round(((stats.power_confirmed || 0) / stats.total_feedback) * 100) : 0,
      recent
    });
  } catch (err) {
    console.error('Feedback summary error:', err);
    res.status(500).json({ error: 'Failed to load feedback summary.' });
  }
});

// Automated ETR Calculation endpoint
router.get('/etr/calculate', (req, res) => {
  try {
    const { type, weatherCode, cluster } = req.query;
    const result = calculateETR(type, weatherCode, parseInt(cluster, 10) || 1);
    res.json(result);
  } catch (err) {
    console.error('ETR calculation error:', err);
    res.status(500).json({ error: 'Failed to calculate ETR.' });
  }
});

// SMS Gateway logs & manual test (Staff/Admin)
router.get('/sms/logs', requireStaff, (req, res) => {
  try {
    const logs = getSmsLogs(50);
    res.json({ logs });
  } catch (err) {
    console.error('SMS logs error:', err);
    res.status(500).json({ error: 'Failed to fetch SMS logs.' });
  }
});

router.post('/sms/test', requireStaff, async (req, res) => {
  try {
    const { phone_number, message } = req.body;
    const result = await sendSMS(phone_number, message || 'Test emergency broadcast from Valencia PowerWatch', 'test_dispatch');
    res.json(result);
  } catch (err) {
    console.error('SMS test error:', err);
    res.status(500).json({ error: 'Failed to send test SMS.' });
  }
});

module.exports = router;
