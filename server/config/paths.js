const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = process.env.POWERWATCH_DATA_DIR
  ? path.resolve(process.env.POWERWATCH_DATA_DIR)
  : path.join(ROOT, 'data');
const UPLOAD_DIR = process.env.POWERWATCH_UPLOAD_DIR
  ? path.resolve(process.env.POWERWATCH_UPLOAD_DIR)
  : path.join(ROOT, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'powerwatch.db');

module.exports = {
  ROOT,
  DATA_DIR,
  UPLOAD_DIR,
  DB_PATH,
};
