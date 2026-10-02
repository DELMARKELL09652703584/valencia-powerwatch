const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'powerwatch.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    contact_number TEXT,
    address TEXT,
    barangay TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'resident',
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL,
    last_login TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS oauth_accounts (
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (provider, provider_user_id)
  );

  CREATE TABLE IF NOT EXISTS oauth_states (
    state_hash TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS barangays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    area_description TEXT,
    population INTEGER,
    latitude REAL,
    longitude REAL,
    status TEXT NOT NULL DEFAULT 'Active'
  );

  CREATE TABLE IF NOT EXISTS outage_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_code TEXT UNIQUE NOT NULL,
    reporter_id INTEGER NOT NULL,
    location TEXT,
    latitude REAL,
    longitude REAL,
    barangay TEXT NOT NULL,
    date_time_noticed TEXT,
    description TEXT,
    affected_area TEXT,
    possible_outage_type TEXT,
    photo_path TEXT,
    remarks TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted',
    verification_status TEXT NOT NULL DEFAULT 'Pending',
    staff_remarks TEXT,
    incident_id INTEGER,
    reported_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS report_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS outage_incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    barangay TEXT NOT NULL,
    location TEXT,
    latitude REAL,
    longitude REAL,
    incident_type TEXT NOT NULL DEFAULT 'Unexpected',
    outage_type TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium',
    customers_affected INTEGER,
    restoration_progress INTEGER,
    description TEXT,
    cause_category TEXT,
    status TEXT NOT NULL DEFAULT 'Reported',
    start_time TEXT,
    end_time TEXT,
    estimated_restoration TEXT,
    affected_area TEXT,
    remarks TEXT,
    scheduled_id INTEGER,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS incident_links (
    incident_id INTEGER NOT NULL,
    report_id INTEGER NOT NULL,
    link_time TEXT NOT NULL,
    PRIMARY KEY (incident_id, report_id)
  );

  CREATE TABLE IF NOT EXISTS incident_areas (
    incident_id INTEGER NOT NULL,
    barangay TEXT NOT NULL,
    PRIMARY KEY (incident_id, barangay)
  );

  CREATE TABLE IF NOT EXISTS scheduled_outages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    barangay TEXT NOT NULL,
    area TEXT,
    outage_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    expected_end_time TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General Information',
    status TEXT NOT NULL DEFAULT 'Published',
    image_path TEXT,
    published_at TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'general',
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    role TEXT,
    action TEXT NOT NULL,
    detail TEXT,
    created_at TEXT NOT NULL,
    ip_address TEXT
  );

  CREATE TABLE IF NOT EXISTS citizen_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER,
    incident_id INTEGER,
    user_id INTEGER NOT NULL,
    user_name TEXT,
    barangay TEXT,
    rating INTEGER NOT NULL,
    feedback_text TEXT,
    restoration_confirmed INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sms_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Simulated',
    event_type TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_reports_reporter_reported ON outage_reports(reporter_id, reported_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reports_status_reported ON outage_reports(status, reported_at DESC);
  CREATE INDEX IF NOT EXISTS idx_incidents_status_start ON outage_incidents(status, start_time DESC);
  CREATE INDEX IF NOT EXISTS idx_incidents_closed_at ON outage_incidents(closed_at DESC);
  CREATE INDEX IF NOT EXISTS idx_scheduled_status_date ON scheduled_outages(status, outage_date, start_time);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_attachments_report_id ON report_attachments(report_id, id);
  CREATE INDEX IF NOT EXISTS idx_announcements_status_published ON announcements(status, published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_feedback_report ON citizen_feedback(report_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_incident ON citizen_feedback(incident_id);
  CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON sms_logs(created_at DESC);
`);

const ensureColumn = (table, column, definition) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

ensureColumn('barangays', 'population', 'INTEGER');
ensureColumn('barangays', 'latitude', 'REAL');
ensureColumn('barangays', 'longitude', 'REAL');
ensureColumn('users', 'username', 'TEXT');
ensureColumn('users', 'profile_photo_path', 'TEXT');
ensureColumn('users', 'preferred_language', "TEXT DEFAULT 'en'");
ensureColumn('announcements', 'image_path', 'TEXT');
ensureColumn('outage_reports', 'latitude', 'REAL');
ensureColumn('outage_reports', 'longitude', 'REAL');
ensureColumn('outage_reports', 'estimated_restoration', 'TEXT');
ensureColumn('outage_incidents', 'latitude', 'REAL');
ensureColumn('outage_incidents', 'longitude', 'REAL');
ensureColumn('outage_incidents', 'outage_type', 'TEXT');
ensureColumn('outage_incidents', 'priority', "TEXT NOT NULL DEFAULT 'Medium'");
ensureColumn('outage_incidents', 'customers_affected', 'INTEGER');
ensureColumn('outage_incidents', 'restoration_progress', 'INTEGER');
ensureColumn('outage_incidents', 'description', 'TEXT');
ensureColumn('outage_incidents', 'etr_reason', 'TEXT');
ensureColumn('audit_logs', 'ip_address', 'TEXT');

const BARANGAY_COORDINATES = {
  Bagontaas: [7.9304, 125.1077],
  Banlag: [7.9547, 125.1558],
  Barobo: [7.9868, 125.1054],
  Batangan: [7.8924, 125.1328],
  Catumbalon: [7.8986, 125.0478],
  Colonia: [7.9734, 125.0747],
  Concepcion: [7.8864, 125.0745],
  'Dagat-Kidavao': [7.8631, 125.0381],
  Guinoyuran: [7.8761, 125.0125],
  Kahapunan: [7.9497, 125.1235],
  Laligan: [7.8488, 125.0863],
  Lilingayon: [7.9928, 124.9714],
  Lourdes: [7.9625, 125.0347],
  Lumbayao: [7.8821, 125.1632],
  Lurogan: [7.9283, 125.0275],
  Mabuhay: [7.8703, 125.1039],
  Mailag: [7.9839, 125.0872],
  'Mt. Nebo': [7.9589, 124.9358],
  Nabago: [7.8911, 125.1044],
  Napaliran: [7.9348, 125.0812],
  'Pal-ing': [7.8633, 125.0736],
  Poblacion: [7.9111, 125.0934],
  'San Carlos': [7.9197, 125.1647],
  'San Isidro': [7.9042, 125.1128],
  Sinabuagan: [7.8789, 125.1258],
  Tongantongan: [7.9142, 125.0389],
  Tugaya: [7.9406, 125.0531],
  Vintar: [7.9667, 125.1342],
};

const updateBgryCoords = db.prepare('UPDATE barangays SET latitude = ?, longitude = ? WHERE name = ?');
for (const [name, [lat, lng]] of Object.entries(BARANGAY_COORDINATES)) {
  updateBgryCoords.run(lat, lng, name);
}

// ---------------------------------------------------------------- helpers

const now = () => new Date().toISOString();

const isoS = (ms) => new Date(ms).toISOString();

const daysFromNow = (days, hours = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, 0, 0, 0);
  return d.toISOString();
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const codeColumns = {
  VPR: { table: 'outage_reports', col: 'report_code' },
  OUT: { table: 'outage_incidents', col: 'incident_code' },
  SCH: { table: 'scheduled_outages', col: 'schedule_code' },
};

const nextCode = (prefix) => {
  const conf = codeColumns[prefix];
  if (!conf) return `${prefix}-${Date.now().toString().slice(-4)}`;
  const rows = db.prepare(`SELECT ${conf.col} AS code FROM ${conf.table} WHERE ${conf.col} LIKE ?`).all(`${prefix}-%`);
  let maxNum = 0;
  for (const row of rows) {
    const num = parseInt(String(row.code || '').replace(`${prefix}-`, ''), 10);
    if (Number.isFinite(num) && num > maxNum) maxNum = num;
  }
  let nextNum = maxNum + 1;
  while (db.prepare(`SELECT 1 FROM ${conf.table} WHERE ${conf.col} = ?`).get(`${prefix}-${String(nextNum).padStart(4, '0')}`)) {
    nextNum++;
  }
  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
};

// ---------------------------------------------------------------- seed

const SEED_VERSION = 'v2.0_clean';

const VALENCIA_BARANGAYS = [
  'Bagontaas', 'Banlag', 'Barobo', 'Batangan', 'Catumbalon', 'Colonia',
  'Concepcion', 'Dagat-Kidavao', 'Guinoyuran', 'Kahapunan', 'Laligan',
  'Lilingayon', 'Lourdes', 'Lumbayao', 'Lurogan', 'Mabuhay', 'Mailag',
  'Mt. Nebo', 'Nabago', 'Napaliran', 'Pal-ing', 'Poblacion', 'San Carlos',
  'San Isidro', 'Sinabuagan', 'Tongantongan', 'Tugaya', 'Vintar'
];

const SETTINGS_SEED = {
  outage_types: [
    'Line Fault', 'Transformer Issue', 'Weather Disturbance',
    'Power Supply Interruption', 'Equipment-related',
    'Scheduled Maintenance', 'Unknown', 'Other'
  ],
  inactive_outage_types: [],
  incident_categories: [
    'Equipment-related', 'Weather-related', 'Emergency',
    'Unplanned service interruption', 'Unknown cause',
    'Other authorized classification'
  ],
  announcement_categories: [
    'Scheduled Outage', 'Restoration Update', 'Emergency Advisory',
    'Service Advisory', 'General Information', 'System Announcement'
  ],
  system_info: {
    systemName: 'Valencia PowerWatch',
    timezone: 'Asia/Manila',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '12 Hour',
    logoData: '',
    tagline: 'Community Power Interruption Reporting, Verification, and Information Management System',
    locality: 'Valencia City, Bukidnon',
    contactEmail: 'support@valenciapowerwatch.ph',
    hotline: '(088) 555-0180',
    about: 'Valencia PowerWatch is a community reporting and information management platform. '
      + 'Resident-reported outages are community information and are clearly distinguished from '
      + 'verified or officially confirmed information supplied by authorized sources.'
  },
  notification_settings: {
    inApp: 'on',
    web: 'on',
    email: 'off',
    sms: 'off'
  },
  map_settings: {
    latitude: 7.906,
    longitude: 125.094,
    zoom: 12,
    activeOutages: true,
    scheduledOutages: true,
    barangayCenters: false,
    satellite: false
  }
};

function seedIfFresh() {
  const existing = db.prepare('SELECT value FROM settings WHERE key = ?').get('seed_version');
  if (existing && existing.value === SEED_VERSION) return false;

  // Clean slate: remove all sample / pre-existing mock records across the system
  db.exec(`
    DELETE FROM oauth_states;
    DELETE FROM incident_links;
    DELETE FROM incident_areas;
    DELETE FROM report_attachments;
    DELETE FROM outage_reports;
    DELETE FROM outage_incidents;
    DELETE FROM scheduled_outages;
    DELETE FROM announcements;
    DELETE FROM notifications;
    DELETE FROM citizen_feedback;
    DELETE FROM sms_logs;
    DELETE FROM audit_logs;
    DELETE FROM sessions;
    DELETE FROM oauth_accounts;
    DELETE FROM password_reset_tokens;
    DELETE FROM users 
    WHERE role != 'administrator' 
      AND LOWER(COALESCE(username, '')) != 'delmarkel2003' 
      AND LOWER(email) NOT IN ('dsaroay@gmail.com', 'admin@powerwatch.ph');
    DELETE FROM sqlite_sequence WHERE name IN (
      'outage_reports','outage_incidents','incident_links','incident_areas',
      'scheduled_outages','announcements','notifications','audit_logs',
      'citizen_feedback','sms_logs','report_attachments','sessions','oauth_accounts'
    );
  `);

  // Ensure 28 official Valencia City Barangays are present
  const bgryCount = Number(db.prepare('SELECT COUNT(*) as cnt FROM barangays').get().cnt || 0);
  if (bgryCount === 0) {
    const insBgry = db.prepare('INSERT INTO barangays (name, area_description, status) VALUES (?, ?, ?)');
    for (const name of VALENCIA_BARANGAYS) {
      insBgry.run(name, `Service area within Brgy. ${name}, Valencia City, Bukidnon.`, 'Active');
    }
  }

  // Ensure default system configuration settings exist
  for (const [key, value] of Object.entries(SETTINGS_SEED)) {
    const hasSetting = db.prepare('SELECT 1 FROM settings WHERE key = ?').get(key);
    if (!hasSetting) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
    }
  }

  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('seed_version', SEED_VERSION);

  return true;
}

// Ensure Admin credentials DELMARKEL2003 / ADMIN2023* are permanently active & intact
const ensureAdminAccount = () => {
  const existingAdmin = db.prepare(`
    SELECT * FROM users 
    WHERE LOWER(COALESCE(username, '')) = LOWER('DELMARKEL2003') 
       OR LOWER(email) = LOWER('DELMARKEL2003')
       OR LOWER(email) = LOWER('dsaroay@gmail.com')
       OR id = 9
  `).get();

  if (existingAdmin) {
    db.prepare(`
      UPDATE users SET 
        username = 'DELMARKEL2003',
        email = 'dsaroay@gmail.com',
        full_name = 'Delmarkel Saro-ay',
        contact_number = '09652703584',
        address = 'Brgy. Guinoyuran, Valencia City, Bukidnon',
        barangay = 'Guinoyuran',
        password_hash = ?,
        role = 'administrator',
        status = 'Active'
      WHERE id = ?
    `).run(hashPassword('ADMIN2023*'), existingAdmin.id);
  } else {
    db.prepare(`
      INSERT INTO users (full_name, username, email, contact_number, address, barangay, password_hash, role, status, created_at, last_login)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'administrator', 'Active', ?, ?)
    `).run(
      'Delmarkel Saro-ay', 'DELMARKEL2003', 'dsaroay@gmail.com', '09652703584',
      'Brgy. Guinoyuran, Valencia City, Bukidnon', 'Guinoyuran',
      hashPassword('ADMIN2023*'), now(), now()
    );
  }

  const demoAdmin = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get('admin@powerwatch.ph');
  if (demoAdmin) {
    db.prepare("UPDATE users SET password_hash = ?, role = 'administrator', status = 'Active' WHERE id = ?")
      .run(hashPassword('admin123'), demoAdmin.id);
  } else {
    db.prepare(`
      INSERT INTO users (full_name, email, contact_number, address, barangay, password_hash, role, status, created_at, last_login)
      VALUES (?, ?, ?, ?, ?, ?, 'administrator', 'Active', ?, ?)
    `).run('System Administrator', 'admin@powerwatch.ph', '0917-555-0100', 'Brgy. Poblacion, Valencia City', 'Poblacion', hashPassword('admin123'), now(), now());
  }
};

seedIfFresh();
ensureAdminAccount();

module.exports = {
  ensureAdminAccount,
  db,
  ROOT,
  DATA_DIR,
  UPLOAD_DIR,
  DB_PATH,
  now,
  isoS,
  daysFromNow,
  hashPassword,
  nextCode,
  seedIfFresh,
  VALENCIA_BARANGAYS,
};