const crypto = require('node:crypto');

const hashSessionToken = (token) => crypto
  .createHash('sha256')
  .update(String(token || ''))
  .digest('hex');

module.exports = { hashSessionToken };
