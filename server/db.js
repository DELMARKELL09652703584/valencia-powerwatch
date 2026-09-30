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
ensureColumn('users', 'profile_photo_path', 'TEXT');
ensureColumn('outage_reports', 'latitude', 'REAL');
ensureColumn('outage_reports', 'longitude', 'REAL');
ensureColumn('outage_incidents', 'latitude', 'REAL');
ensureColumn('outage_incidents', 'longitude', 'REAL');
ensureColumn('outage_incidents', 'outage_type', 'TEXT');
ensureColumn('outage_incidents', 'priority', "TEXT NOT NULL DEFAULT 'Medium'");
ensureColumn('outage_incidents', 'customers_affected', 'INTEGER');
ensureColumn('outage_incidents', 'restoration_progress', 'INTEGER');
ensureColumn('outage_incidents', 'description', 'TEXT');
ensureColumn('audit_logs', 'ip_address', 'TEXT');

db.prepare("UPDATE barangays SET latitude = ?, longitude = ? WHERE name = ? AND latitude IS NULL AND longitude IS NULL")
  .run(7.9111239, 125.0933669, 'Poblacion');
db.prepare("UPDATE barangays SET latitude = ?, longitude = ? WHERE name = ? AND latitude IS NULL AND longitude IS NULL")
  .run(7.9928419, 124.9714083, 'Lilingayon');

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

const codeTables = {
  VPR: 'outage_reports',
  OUT: 'outage_incidents',
  SCH: 'scheduled_outages',
};

const nextCode = (prefix) => {
  const table = codeTables[prefix];
  const { c } = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get();
  return `${prefix}-${String(c + 1).padStart(4, '0')}`;
};

// ---------------------------------------------------------------- seed

const SEED_VERSION = 'v1.2';

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

  const insert = db.prepare(`
    INSERT INTO users (full_name, email, contact_number, address, barangay, password_hash, role, status, created_at, last_login)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seedUser = (...values) => {
    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(values[1]);
    return existingUser ? Number(existingUser.id) : Number(insert.run(...values).lastInsertRowid);
  };

  const adminId = seedUser(
    'Rowena Mercader', 'admin@powerwatch.ph', '0917-555-0100',
    'Brgy. Poblacion, Valencia City, Bukidnon', 'Poblacion',
    hashPassword('admin123'), 'administrator', 'Active', daysFromNow(-30), daysFromNow(-1)
  );

  const staffId = seedUser(
    'Daniel Tajores', 'staff@powerwatch.ph', '0917-555-0101',
    'Brgy. Lumbayao, Valencia City, Bukidnon', 'Lumbayao',
    hashPassword('staff123'), 'personnel', 'Active', daysFromNow(-30), daysFromNow(-1)
  );

  const utilityId = seedUser(
    'Joaquin Villanueva', 'utility@powerwatch.ph', '0917-555-0102',
    'Brgy. San Carlos, Valencia City, Bukidnon', 'San Carlos',
    hashPassword('utility123'), 'utility', 'Active', daysFromNow(-30), daysFromNow(-2)
  );

  const residentIds = [
    seedUser(
      'Alicia Mendez', 'resident@powerwatch.ph', '0917-123-4567',
      'Block 3, Poblacion, Valencia City', 'Poblacion',
      hashPassword('resident123'), 'resident', 'Active', daysFromNow(-45), daysFromNow(0)
    ),
    seedUser(
      'Romel Santos', 'romel.santos@mail.ph', '0928-556-9102',
      'Sitio Kalubihan, Bagontaas, Valencia City', 'Bagontaas',
      hashPassword('romel123'), 'resident', 'Active', daysFromNow(-20), null
    ),
    seedUser(
      'Marina Cruz', 'marina.cruz@mail.ph', '0932-778-1200',
      'Upper Lilingayon Road, Valencia City', 'Lilingayon',
      hashPassword('marina123'), 'resident', 'Active', daysFromNow(-60), null
    ),
    seedUser(
      'Jonalyn Perez', 'jonalyn.perez@mail.ph', '0998-445-2221',
      'Malaybalay Road, Colonia, Valencia City', 'Colonia',
      hashPassword('jonalyn123'), 'resident', 'Active', daysFromNow(-15), null
    ),
  ];

  const [alicia, romel, marina, jonalyn] = residentIds;

  // Barangays
  const insBgry = db.prepare('INSERT INTO barangays (name, area_description, status) VALUES (?, ?, ?)');
  for (const name of VALENCIA_BARANGAYS) {
    insBgry.run(name, `Service area within Brgy. ${name}, Valencia City, Bukidnon.`, 'Active');
  }

  const insSched = db.prepare(`
    INSERT INTO scheduled_outages (schedule_code, title, barangay, area, outage_date, start_time, expected_end_time, reason, status, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sched1 = Number(insSched.run(
    nextCode('SCH'), 'Poblacion Scheduled Maintenance', 'Poblacion', 'Poblacion market area and adjacent puroks',
    daysFromNow(1).slice(0, 10), '09:00', '16:00',
    'Scheduled line maintenance and pole inspection', 'Scheduled', staffId, daysFromNow(-2), daysFromNow(-2)
  ).lastInsertRowid);

  const sched2 = Number(insSched.run(
    nextCode('SCH'), 'Tugaya Transformer Upgrade', 'Tugaya', 'Sitio Damilag and nearby homes',
    daysFromNow(4).slice(0, 10), '10:00', '14:00',
    'Planned transformer capacity upgrade', 'Scheduled', utilityId, daysFromNow(-1), daysFromNow(-1)
  ).lastInsertRowid);

  const sched3 = Number(insSched.run(
    nextCode('SCH'), 'Bagontaas Scheduled Line Maintenance', 'Bagontaas', 'Purok Nursery',
    daysFromNow(-5).slice(0, 10), '08:00', '15:00',
    'Routine line maintenance', 'Completed', staffId, daysFromNow(-8), daysFromNow(-4)
  ).lastInsertRowid);

  const insReport = db.prepare(`
    INSERT INTO outage_reports (report_code, reporter_id, location, barangay, date_time_noticed, description, affected_area,
      possible_outage_type, photo_path, remarks, status, verification_status, staff_remarks, incident_id, reported_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const r1 = Number(insReport.run(
    nextCode('VPR'), romel, 'Sitio Kalubihan', 'Bagontaas', isoS(Date.now() - 1000 * 60 * 60 * 5),
    'Transformer started humming and causes intermittent outages for several homes in the area.',
    'Sitio Kalubihan', 'Transformer Issue', null,
    'Flickering lights for several hours.', 'Under Review', 'Under Review', null, null,
    isoS(Date.now() - 1000 * 60 * 60 * 5), isoS(Date.now() - 1000 * 60 * 60 * 4)
  ).lastInsertRowid);

  const r4 = Number(insReport.run(
    nextCode('VPR'), jonalyn, 'Near Barangay Hall', 'Colonia', isoS(Date.now() - 1000 * 60 * 60 * 2),
    'Short interruption near the barangay hall after a breaker trip.',
    'Barangay Hall stretch', 'Power Supply Interruption', null,
    'Power returned after a few minutes.', 'Submitted', 'Pending', null, null,
    isoS(Date.now() - 1000 * 60 * 60 * 2), isoS(Date.now() - 1000 * 60 * 60 * 2)
  ).lastInsertRowid);

  const r7 = Number(insReport.run(
    nextCode('VPR'), alicia, 'Upper Village Road', 'San Carlos', isoS(Date.now() - 1000 * 60 * 60 * 8),
    'Several households along the upper village road have no power since early morning.',
    'Upper Village Road', 'Line Fault', null,
    'Appears to be a downed secondary line.', 'Verified', 'Verified', 'Location confirmed by personnel.', null,
    isoS(Date.now() - 1000 * 60 * 60 * 9), isoS(Date.now() - 1000 * 60 * 60 * 6)
  ).lastInsertRowid);

  const insIncident = db.prepare(`
    INSERT INTO outage_incidents (incident_code, title, barangay, location, incident_type, cause_category, status,
      start_time, end_time, estimated_restoration, affected_area, remarks, scheduled_id, created_by, created_at, updated_at, closed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const i1 = Number(insIncident.run(
    nextCode('OUT'), 'Lilingayon Weather-Related Outage', 'Lilingayon', 'Lower Lilingayon Road',
    'Unexpected', 'Weather-related', 'Ongoing',
    isoS(Date.now() - 1000 * 60 * 60 * 26), null, null,
    'Lower Lilingayon Road and adjacent puroks',
    'Crew dispatched area is affected. Cause category per authorized information.',
    null, staffId, isoS(Date.now() - 1000 * 60 * 60 * 24), isoS(Date.now() - 1000 * 60 * 60 * 1), null
  ).lastInsertRowid);

  const i2 = Number(insIncident.run(
    nextCode('OUT'), 'Tugaya Equipment Restoration', 'Tugaya', 'Sitio Hidden Valley',
    'Unexpected', 'Equipment-related', 'Closed',
    isoS(Date.now() - 1000 * 60 * 60 * 72), isoS(Date.now() - 1000 * 60 * 60 * 48), null,
    'Sitio Hidden Valley',
    'Substation breaker fault; restored after repairs.',
    null, utilityId, isoS(Date.now() - 1000 * 60 * 60 * 70), isoS(Date.now() - 1000 * 60 * 60 * 46), isoS(Date.now() - 1000 * 60 * 60 * 46)
  ).lastInsertRowid);

  const i3 = Number(insIncident.run(
    nextCode('OUT'), 'Bagontaas Scheduled Line Maintenance', 'Bagontaas', 'Purok Nursery',
    'Scheduled', 'Planned maintenance', 'Closed',
    isoS(Date.now() - 1000 * 60 * 60 * 120), isoS(Date.now() - 1000 * 60 * 60 * 113), null,
    'Purok Nursery',
    'Completed as scheduled.',
    sched3, staffId, isoS(Date.now() - 1000 * 60 * 60 * 118), isoS(Date.now() - 1000 * 60 * 60 * 111), isoS(Date.now() - 1000 * 60 * 60 * 111)
  ).lastInsertRowid);

  const i4 = Number(insIncident.run(
    nextCode('OUT'), 'Poblacion Line Fault', 'Poblacion', 'Purok 5 near public market',
    'Unexpected', 'Line Fault', 'Verified',
    isoS(Date.now() - 1000 * 60 * 60 * 20), null, null,
    'Purok 5 near public market',
    'Report verified; service crew notified.',
    null, staffId, isoS(Date.now() - 1000 * 60 * 60 * 18), isoS(Date.now() - 1000 * 60 * 60 * 17), null
  ).lastInsertRowid);

  // r3 and r9 - verify seeds for incidents
  const r2 = Number(insReport.run(
    nextCode('VPR'), alicia, 'Purok 5 near the public market', 'Poblacion', isoS(Date.now() - 1000 * 60 * 60 * 21),
    'Power outage affecting about 40 households after a line fault near the public market.',
    'Purok 5 Near Market', 'Line Fault', null,
    'No power since late afternoon.', 'Verified', 'Verified',
    'Matches incident OUT-0004.', i4, isoS(Date.now() - 1000 * 60 * 60 * 21), isoS(Date.now() - 1000 * 60 * 60 * 16)
  ).lastInsertRowid);

  const r3 = Number(insReport.run(
    nextCode('VPR'), marina, 'Lower Lilingayon Road', 'Lilingayon', isoS(Date.now() - 1000 * 60 * 60 * 26),
    'Heavy rain caused downed lines and interruptions for the whole stretch.',
    'Lower Lilingayon Road', 'Weather Disturbance', null,
    'Leaves and branches on lines.', 'Verified', 'Officially Confirmed',
    'Officially confirmed by utility.', i1, isoS(Date.now() - 1000 * 60 * 60 * 26), isoS(Date.now() - 1000 * 60 * 60 * 22)
  ).lastInsertRowid);

  const r5 = Number(insReport.run(
    nextCode('VPR'), marina, 'Same area, Lower Lilingayon Road', 'Lilingayon', isoS(Date.now() - 1000 * 60 * 60 * 25),
    'Duplicate report for the Lilingayon outage already reported.',
    'Lower Lilingayon Road', 'Weather Disturbance', null,
    '–', 'Duplicate', 'Duplicate',
    'Identified as duplicate of report VPR-0001.', i1, isoS(Date.now() - 1000 * 60 * 60 * 25), isoS(Date.now() - 1000 * 60 * 60 * 21)
  ).lastInsertRowid);

  const r6 = Number(insReport.run(
    nextCode('VPR'), jonalyn, 'Sitio Hidden Valley', 'Tugaya', isoS(Date.now() - 1000 * 60 * 60 * 71),
    'Breaker tripped in our sitio, no power for more than a day.',
    'Sitio Hidden Valley', 'Equipment-related', null,
    '—', 'Resolved', 'Verified',
    'Incident OUT-0002 restored; report closed.', i2, isoS(Date.now() - 1000 * 60 * 60 * 71), isoS(Date.now() - 1000 * 60 * 60 * 45)
  ).lastInsertRowid);

  const insLink = db.prepare('INSERT INTO incident_links (incident_id, report_id, link_time) VALUES (?, ?, ?)');
  insLink.run(i1, r3, isoS(Date.now() - 1000 * 60 * 60 * 21));
  insLink.run(i1, r5, isoS(Date.now() - 1000 * 60 * 60 * 21));
  insLink.run(i2, r6, isoS(Date.now() - 1000 * 60 * 60 * 45));
  insLink.run(i4, r2, isoS(Date.now() - 1000 * 60 * 60 * 16));

  const insAnn = db.prepare(`
    INSERT INTO announcements (title, content, category, status, published_at, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insAnn.run(
    'Poblacion Scheduled Maintenance', 'A scheduled service interruption will affect the Poblacion market area '
      + 'from 9:00 AM to 4:00 PM. Please prepare accordingly.',
    'Scheduled Outage', 'Published', daysFromNow(-1), staffId, daysFromNow(-2)
  );
  insAnn.run(
    'Restoration in Tugaya', 'Power has been fully restored in Sitio Hidden Valley, Tugaya after repairs were completed.',
    'Restoration Update', 'Published', isoS(Date.now() - 1000 * 60 * 60 * 46), utilityId, isoS(Date.now() - 1000 * 60 * 60 * 46)
  );
  insAnn.run(
    'Emergency Advisory: Stay Safe Around Lines', 'Avoid touching damaged utility lines or fallen poles. Report visible hazards immediately.',
    'Emergency Advisory', 'Published', daysFromNow(-3), adminId, daysFromNow(-3)
  );
  insAnn.run(
    'Service Advisory: Update Your Contact Number', 'Residents are encouraged to keep accurate contact details so we can notify you about outage updates.',
    'Service Advisory', 'Published', daysFromNow(-5), staffId, daysFromNow(-5)
  );
  insAnn.run(
    'Welcome to Valencia PowerWatch', 'This platform allows residents to report and monitor power interruptions, view schedules, '
      + 'and receive official announcements for Valencia City, Bukidnon.',
    'System Announcement', 'Published', daysFromNow(-7), adminId, daysFromNow(-7)
  );

  const insNotif = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, read, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insNotif.run(alicia, 'Report verified', 'Your report was verified and linked to an active outage incident.', 'report', 0, isoS(Date.now() - 1000 * 60 * 60 * 16));
  insNotif.run(alicia, 'Officially confirmed', 'A report you submitted was officially confirmed by authorized utility personnel.', 'report', 0, isoS(Date.now() - 1000 * 60 * 60 * 22));
  insNotif.run(marina, 'Duplicate report', 'A report you submitted was identified as a duplicate of an existing report.', 'report', 0, isoS(Date.now() - 1000 * 60 * 60 * 21));
  insNotif.run(jonalyn, 'Outage resolved', 'The Tugaya incident has been restored and your report is now closed.', 'incident', 0, isoS(Date.now() - 1000 * 60 * 60 * 46));
  insNotif.run(alicia, 'New scheduled outage', 'Scheduled maintenance in Poblacion is posted for tomorrow 9:00 AM - 4:00 PM.', 'announcement', 0, daysFromNow(-1));
  insNotif.run(staffId, 'New report submitted', 'A new outage report requiring review has been submitted.', 'report', 0, isoS(Date.now() - 1000 * 60 * 60 * 2));
  insNotif.run(adminId, 'System ready', 'Valencia PowerWatch seed data has been loaded for the demonstration.', 'system', 0, isoS(Date.now() - 1000 * 60 * 60 * 24));

  const insAudit = db.prepare(`
    INSERT INTO audit_logs (user_id, user_name, role, action, detail, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insAudit.run(null, 'System', 'system', 'System initialization', 'Valencia PowerWatch started and demo data loaded.', daysFromNow(-7));
  insAudit.run(staffId, 'Daniel Tajores', 'personnel', 'Report verified', 'Verified report VPR-0002 into incident OUT-0004.', isoS(Date.now() - 1000 * 60 * 60 * 16));
  insAudit.run(utilityId, 'Joaquin Villanueva', 'utility', 'Officially confirmed', 'Confirmed report VPR-0001 as official.', isoS(Date.now() - 1000 * 60 * 60 * 22));
  insAudit.run(utilityId, 'Joaquin Villanueva', 'utility', 'Outage restored', 'Incident OUT-0002 marked restored.', isoS(Date.now() - 1000 * 60 * 60 * 46));
  insAudit.run(staffId, 'Daniel Tajores', 'personnel', 'Duplicate identified', 'Marked report VPR-0005 as duplicate.', isoS(Date.now() - 1000 * 60 * 60 * 21));
  insAudit.run(adminId, 'Rowena Mercader', 'administrator', 'Announcement published', 'Published system announcement.', daysFromNow(-7));

  for (const [key, value] of Object.entries(SETTINGS_SEED)) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
  }
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('seed_version', SEED_VERSION);

  return true;
}

seedIfFresh();

module.exports = {
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