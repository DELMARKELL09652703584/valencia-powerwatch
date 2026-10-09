const { db } = require('./db');

db.exec(`
  CREATE TABLE IF NOT EXISTS staff_team_members (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES repair_teams(id) ON DELETE CASCADE,
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    assigned_at TEXT NOT NULL,
    PRIMARY KEY (user_id, team_id)
  );
  CREATE INDEX IF NOT EXISTS idx_staff_team_members_team ON staff_team_members(team_id, user_id);

  CREATE TABLE IF NOT EXISTS staff_barangay_assignments (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    barangay TEXT NOT NULL,
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    assigned_at TEXT NOT NULL,
    PRIMARY KEY (user_id, barangay)
  );
  CREATE INDEX IF NOT EXISTS idx_staff_barangay_assignments_barangay
    ON staff_barangay_assignments(barangay, user_id);
`);

const staffBarangaysFor = (userId) => db.prepare(`
  SELECT barangay FROM staff_barangay_assignments WHERE user_id = ? ORDER BY barangay COLLATE NOCASE
`).all(userId).map((row) => row.barangay);

const staffCanAccessBarangay = (user, barangay) => user?.role !== 'personnel'
  || (Boolean(barangay) && staffBarangaysFor(user.id).includes(String(barangay)));

const staffCanAccessIncident = (user, incident) => {
  if (user?.role !== 'personnel') return true;
  const assignedAreas = new Set(staffBarangaysFor(user.id));
  if (!incident || !assignedAreas.has(incident.barangay)) {
    const areas = incident
      ? db.prepare('SELECT barangay FROM incident_areas WHERE incident_id = ?').all(incident.id)
      : [];
    return areas.some((area) => assignedAreas.has(area.barangay));
  }
  return true;
};

module.exports = { staffBarangaysFor, staffCanAccessBarangay, staffCanAccessIncident };
