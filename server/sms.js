const https = require('https');
const { db } = require('./db');

const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY || '';
const SENDER_NAME = process.env.SMS_SENDER_NAME || 'VALENCIA-PW';

/**
 * Send SMS to a recipient phone number via Semaphore API or Simulated Fallback.
 * @param {string} phoneNumber - e.g. '09171234567' or '+639171234567'
 * @param {string} message - Message text
 * @param {string} eventType - e.g. 'outage_verified', 'crew_dispatched', 'power_restored', 'emergency_alert'
 */
async function sendSMS(phoneNumber, message, eventType = 'general') {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return { success: false, reason: 'Invalid phone number' };
  }

  const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
  if (cleanPhone.length < 10) {
    return { success: false, reason: 'Phone number too short' };
  }

  const timestamp = new Date().toISOString();

  // If Semaphore API Key is provided, send real SMS
  if (SEMAPHORE_API_KEY) {
    try {
      const payload = JSON.stringify({
        apikey: SEMAPHORE_API_KEY,
        number: cleanPhone,
        message: `[Valencia PowerWatch] ${message}`,
        sendername: SENDER_NAME
      });

      const options = {
        hostname: 'api.semaphore.co',
        path: '/api/v4/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const result = await new Promise((resolve) => {
        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            const isOk = res.statusCode >= 200 && res.statusCode < 300;
            resolve({ success: isOk, statusCode: res.statusCode, body });
          });
        });
        req.on('error', (err) => resolve({ success: false, error: err.message }));
        req.write(payload);
        req.end();
      });

      const status = result.success ? 'Sent (Semaphore)' : 'Failed (Semaphore)';
      db.prepare(`
        INSERT INTO sms_logs (phone_number, message, status, event_type, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(cleanPhone, message, status, eventType, timestamp);

      return { success: result.success, provider: 'Semaphore', status };
    } catch (err) {
      console.error('SMS Gateway Error:', err);
    }
  }

  // Simulated Mode (Works 100% out of the box for Demos & Presentations)
  const status = 'Simulated (Demo Mode)';
  db.prepare(`
    INSERT INTO sms_logs (phone_number, message, status, event_type, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(cleanPhone, message, status, eventType, timestamp);

  console.log(`[SMS GATEWAY SIMULATOR] To: ${cleanPhone} | Type: ${eventType} | Msg: ${message}`);
  return { success: true, simulated: true, phone: cleanPhone, message };
}

function getSmsLogs(limit = 50) {
  return db.prepare('SELECT * FROM sms_logs ORDER BY id DESC LIMIT ?').all(limit);
}

module.exports = {
  sendSMS,
  getSmsLogs
};
