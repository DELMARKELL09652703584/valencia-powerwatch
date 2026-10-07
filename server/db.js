const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.POWERWATCH_DATA_DIR
  ? path.resolve(process.env.POWERWATCH_DATA_DIR)
  : path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'powerwatch.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA synchronous = NORMAL;');

const checkpointDb = () => {
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch (err) {
    // Non-fatal checkpoint notice
  }
};

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

  CREATE TABLE IF NOT EXISTS report_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL REFERENCES outage_reports(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT,
    from_status TEXT,
    to_status TEXT,
    actor_name TEXT,
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

  CREATE TABLE IF NOT EXISTS repair_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    lead_technician TEXT NOT NULL,
    contact_number TEXT,
    vehicle_type TEXT,
    base_station TEXT DEFAULT 'Central Substation, Sayre Highway',
    current_latitude REAL DEFAULT 7.9064,
    current_longitude REAL DEFAULT 125.0941,
    location_updated_at TEXT,
    status TEXT NOT NULL DEFAULT 'Available',
    active_assignment_id INTEGER,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS repair_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_code TEXT UNIQUE NOT NULL,
    team_id INTEGER NOT NULL REFERENCES repair_teams(id),
    report_id INTEGER REFERENCES outage_reports(id),
    incident_id INTEGER REFERENCES outage_incidents(id),
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'Dispatched',
    priority TEXT DEFAULT 'High',
    target_barangay TEXT NOT NULL,
    target_purok TEXT,
    target_location TEXT,
    target_latitude REAL,
    target_longitude REAL,
    dispatch_notes TEXT,
    crew_report TEXT,
    dispatched_at TEXT NOT NULL,
    arrived_at TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL
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
  CREATE INDEX IF NOT EXISTS idx_report_history_report_created ON report_status_history(report_id, created_at, id);
  CREATE INDEX IF NOT EXISTS idx_announcements_status_published ON announcements(status, published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_feedback_report ON citizen_feedback(report_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_incident ON citizen_feedback(incident_id);
  CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON sms_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_repair_assignments_team ON repair_assignments(team_id);
  CREATE INDEX IF NOT EXISTS idx_repair_assignments_status ON repair_assignments(status);
`);

db.exec(`
  INSERT INTO report_status_history
    (report_id, event_type, title, details, to_status, created_at)
  SELECT r.id, 'submitted', 'Report submitted', 'Your report was received and is pending review.', 'Submitted', r.reported_at
  FROM outage_reports r
  WHERE NOT EXISTS (
    SELECT 1 FROM report_status_history h WHERE h.report_id = r.id AND h.event_type = 'submitted'
  );

  INSERT INTO report_status_history
    (report_id, event_type, title, details, to_status, created_at)
  SELECT r.id, 'legacy_snapshot', 'Current status when tracking began',
         'Earlier status-change history was not recorded by the system.', r.status, r.updated_at
  FROM outage_reports r
  WHERE r.status <> 'Submitted'
    AND NOT EXISTS (
      SELECT 1 FROM report_status_history h WHERE h.report_id = r.id AND h.event_type = 'legacy_snapshot'
    );
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
ensureColumn('outage_reports', 'purok', 'TEXT');
ensureColumn('outage_reports', 'location_source', 'TEXT');
ensureColumn('outage_reports', 'location_accuracy_m', 'REAL');
ensureColumn('outage_reports', 'assigned_team_id', 'INTEGER');
ensureColumn('outage_reports', 'assigned_team_name', 'TEXT');
ensureColumn('outage_reports', 'repair_status', "TEXT DEFAULT 'Pending Assignment'");
ensureColumn('outage_reports', 'estimated_restoration', 'TEXT');
ensureColumn('outage_incidents', 'latitude', 'REAL');
ensureColumn('outage_incidents', 'longitude', 'REAL');
ensureColumn('outage_incidents', 'purok', 'TEXT');
ensureColumn('repair_teams', 'location_updated_at', 'TEXT');
ensureColumn('outage_incidents', 'assigned_team_id', 'INTEGER');
ensureColumn('outage_incidents', 'assigned_team_name', 'TEXT');
ensureColumn('outage_incidents', 'repair_status', "TEXT DEFAULT 'Pending Assignment'");
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
  Lumbo: [7.8938, 125.0752],
  Lurogan: [7.9283, 125.0275],
  Maapag: [7.8442, 125.1069],
  Mabuhay: [7.8703, 125.1039],
  Mailag: [7.9839, 125.0872],
  'Mt. Nebo': [7.9589, 124.9358],
  Nabago: [7.8911, 125.1044],
  Pinatilan: [7.8881, 125.1038],
  Poblacion: [7.9111, 125.0934],
  'San Carlos': [7.9197, 125.1647],
  'San Isidro': [7.9042, 125.1128],
  Sinabuagan: [7.8789, 125.1258],
  Sinayawan: [7.8717, 125.1419],
  Sugod: [7.9432, 125.1189],
  Tongantongan: [7.9142, 125.0389],
  Tugaya: [7.9406, 125.0531],
  Vintar: [7.9667, 125.1342]
};

// Remove obsolete non-barangays Napaliran and Pal-ing if present
db.prepare("DELETE FROM barangays WHERE name IN ('Napaliran', 'Pal-ing')").run();

const checkBgry = db.prepare('SELECT id FROM barangays WHERE name = ?');
const insBgry = db.prepare("INSERT INTO barangays (name, area_description, status, latitude, longitude) VALUES (?, ?, 'Active', ?, ?)");
const updateBgryCoords = db.prepare('UPDATE barangays SET latitude = ?, longitude = ? WHERE name = ?');
for (const [name, [lat, lng]] of Object.entries(BARANGAY_COORDINATES)) {
  const existing = checkBgry.get(name);
  if (existing) {
    updateBgryCoords.run(lat, lng, name);
  } else {
    insBgry.run(name, `Service area within Brgy. ${name}, Valencia City, Bukidnon.`, lat, lng);
  }
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
  'Lilingayon', 'Lourdes', 'Lumbayao', 'Lumbo', 'Lurogan', 'Maapag',
  'Mabuhay', 'Mailag', 'Mt. Nebo', 'Nabago', 'Pinatilan', 'Poblacion',
  'San Carlos', 'San Isidro', 'Sinabuagan', 'Sinayawan', 'Sugod',
  'Tongantongan', 'Tugaya', 'Vintar'
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
    DELETE FROM sqlite_sequence WHERE name IN (
      'outage_reports','outage_incidents','incident_links','incident_areas',
      'scheduled_outages','announcements','notifications','audit_logs',
      'citizen_feedback','sms_logs','report_attachments','sessions','oauth_accounts'
    );
  `);

  // Ensure all registered users have a valid username (defaulting to email prefix if blank)
  try {
    db.exec(`
      UPDATE users 
      SET username = LOWER(SUBSTR(email, 1, INSTR(email, '@') - 1)) 
      WHERE (username IS NULL OR username = '') AND INSTR(email, '@') > 1;
    `);
  } catch (err) {}

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

// Create the built-in admin accounts only when their identifiers are unused.
const ensureAdminAccount = () => {
  const existingAdmin = db.prepare(`
    SELECT id FROM users
    WHERE LOWER(COALESCE(username, '')) = LOWER('DELMARKEL2003') 
       OR LOWER(email) = LOWER('dsaroay@gmail.com')
  `).get();

  if (!existingAdmin) {
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
  if (!demoAdmin) {
    db.prepare(`
      INSERT INTO users (full_name, email, contact_number, address, barangay, password_hash, role, status, created_at, last_login)
      VALUES (?, ?, ?, ?, ?, ?, 'administrator', 'Active', ?, ?)
    `).run('System Administrator', 'admin@powerwatch.ph', '0917-555-0100', 'Brgy. Poblacion, Valencia City', 'Poblacion', hashPassword('admin123'), now(), now());
  }

  // Ensure all existing users have a valid lowercase username derived from their email
  try {
    db.exec(`
      UPDATE users 
      SET username = LOWER(SUBSTR(email, 1, INSTR(email, '@') - 1)) 
      WHERE (username IS NULL OR username = '') AND INSTR(email, '@') > 1;
    `);
  } catch (err) {}

  checkpointDb();
};

const seedRepairTeams = () => {
  try {
    const count = db.prepare('SELECT COUNT(*) AS total FROM repair_teams').get()?.total || 0;
    if (count === 0) {
      const teams = [
        {
          team_code: 'TEAM-01',
          name: 'Alpha Quick Response Unit',
          lead_technician: 'Engr. Carlos Mendoza',
          contact_number: '0917-889-1234',
          vehicle_type: 'FIBECO Heavy Boom Truck #01',
          base_station: 'Central Substation, Sayre Highway',
          current_latitude: 7.9064,
          current_longitude: 125.0941,
          status: 'Available'
        },
        {
          team_code: 'TEAM-02',
          name: 'Bravo Overhead Line Squad',
          lead_technician: 'Foreman Arnel Guingona',
          contact_number: '0917-889-5678',
          vehicle_type: 'Utility Line Rig #02',
          base_station: 'Poblacion Operations Base, Valencia',
          current_latitude: 7.9045,
          current_longitude: 125.0912,
          status: 'Available'
        },
        {
          team_code: 'TEAM-03',
          name: 'Charlie Transformer & Substation Team',
          lead_technician: 'Engr. Reynante Silva',
          contact_number: '0917-889-9012',
          vehicle_type: 'Heavy Service Rig #05',
          base_station: 'Valencia Central Switchyard',
          current_latitude: 7.9152,
          current_longitude: 125.0988,
          status: 'Available'
        },
        {
          team_code: 'TEAM-04',
          name: 'Delta Emergency Rescue Unit',
          lead_technician: 'Supervisor Jason Tan',
          contact_number: '0917-889-3456',
          vehicle_type: 'Rapid Response Pickup #04',
          base_station: 'Bagontaas Auxiliary Outpost',
          current_latitude: 7.9304,
          current_longitude: 125.1077,
          status: 'Available'
        }
      ];

      const stmt = db.prepare(`
        INSERT INTO repair_teams (team_code, name, lead_technician, contact_number, vehicle_type, base_station, current_latitude, current_longitude, location_updated_at, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const t of teams) {
        const ts = now();
        stmt.run(t.team_code, t.name, t.lead_technician, t.contact_number, t.vehicle_type, t.base_station, t.current_latitude, t.current_longitude, ts, t.status, ts);
      }
    }

    db.exec(`
      UPDATE repair_teams 
      SET location_updated_at = COALESCE(location_updated_at, created_at, datetime('now'))
      WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL AND location_updated_at IS NULL;
    `);
  } catch (err) {
    console.error('Error seeding repair teams:', err);
  }
};

seedIfFresh();
ensureAdminAccount();
seedRepairTeams();
checkpointDb();

module.exports = {
  ensureAdminAccount,
  seedRepairTeams,
  checkpointDb,
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