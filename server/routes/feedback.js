const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { sendSMS, getSmsLogs } = require('../sms');
const { calculateETR } = require('../etr');

const requireStaff = [requireAuth, requireRole('personnel', 'administrator', 'utility')];

const router = express.Router();

// Submit citizen satisfaction feedback
router.post('/feedback', requireAuth, (req, res) => {
  try {
    const { report_id, incident_id, rating, feedback_text, restoration_confirmed } = req.body;
    const numRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));
    const confirmed = restoration_confirmed === false || restoration_confirmed === 0 ? 0 : 1;
    const now = new Date().toISOString();

    const user = req.user;
    const result = db.prepare(`
      INSERT INTO citizen_feedback (
        report_id, incident_id, user_id, user_name, barangay, rating, feedback_text, restoration_confirmed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      report_id || null,
      incident_id || null,
      user.id,
      user.full_name || 'Resident',
      user.barangay || 'Valencia City',
      numRating,
      feedback_text || '',
      confirmed,
      now
    );

    // Send thank-you notification / SMS confirmation
    if (user.contact_number) {
      sendSMS(
        user.contact_number,
        `Salamat sa imong feedback (${numRating} stars)! Ang Valencia PowerWatch ug LGU padayong nagpalambo sa serbisyo sa kuryente. Daghang salamat!`,
        'feedback_received'
      ).catch(() => {});
    }

    res.json({ success: true, id: Number(result.lastInsertRowid), message: 'Salamat sa imong feedback!' });
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
      average: Number((stats.average_rating || 5.0).toFixed(1)),
      breakdown: {
        5: stats.stars_5 || 0,
        4: stats.stars_4 || 0,
        3: stats.stars_3 || 0,
        2: stats.stars_2 || 0,
        1: stats.stars_1 || 0,
      },
      confirmed_rate: stats.total_feedback ? Math.round(((stats.power_confirmed || 0) / stats.total_feedback) * 100) : 100,
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
