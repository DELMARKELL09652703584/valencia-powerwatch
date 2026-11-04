const crypto = require('node:crypto');

const normalizeContactNumber = (value) => String(value || '')
  .trim()
  .replace(/[\s().-]/g, '')
  .replace(/^\+63/, '0');

const isValidContactNumber = (value) => {
  const text = String(value || '').trim();
  const digits = text.replace(/\D/g, '');
  return /^\+?[\d\s().-]{7,20}$/.test(text) && digits.length >= 7 && digits.length <= 15;
};

const staffContactEmail = (contactNumber) => {
  const normalized = normalizeContactNumber(contactNumber);
  if (!normalized) return null;
  const digest = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 24);
  return `staff-${digest}@noemail.invalid`;
};

const isStaffContactEmail = (email) => /^staff-[a-f0-9]{24}@noemail\.invalid$/i.test(String(email || ''));

module.exports = {
  isStaffContactEmail,
  isValidContactNumber,
  normalizeContactNumber,
  staffContactEmail,
};
