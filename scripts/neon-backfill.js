const path = require('node:path');
const { Client } = require('pg');
const {
  loadEnvironment,
  requireStagingEnvironment,
  createStagingClient,
  openSqliteReadOnly,
  toIso,
  combineDateTime,
  validSessionHash,
  quoteIdentifier,
  syncIdentity,
} = require('./neon-staging-common');

const sourceUserMap = new Map();
const targetUserByResidentUuid = new Map();
const barangayByName = new Map();
const reportById = new Map();
const incidentById = new Map();
const assignmentById = new Map();
const warnings = [];

const isoOrNow = (value) => toIso(value) || new Date().toISOString();

const readSqliteTable = (sqlite, tables, name, sql) => {
  if (!tables.has(name)) return [];
  return sqlite.prepare(sql).all();
};

const loadResidentSource = async (targetUrl) => {
  const sourceUrl = process.env.POWERWATCH_SOURCE_NEON_URL;
  if (!sourceUrl) return { accounts: [], sessions: [] };
  if (sourceUrl === targetUrl) {
    throw new Error('POWERWATCH_SOURCE_NEON_URL must not be the same as NEON_DEV_DATABASE_URL.');
  }
  const client = new Client({
    connectionString: sourceUrl,
    application_name: 'powerwatch-readonly-source',
    connectionTimeoutMillis: 15_000,
  });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const accounts = (await client.query('SELECT * FROM resident_accounts')).rows;
    const sessions = (await client.query('SELECT * FROM resident_sessions')).rows;
    await client.query('ROLLBACK');
    return { accounts, sessions };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === '42P01') {
      warnings.push('Resident source tables were not found; continuing with SQLite users only.');
      return { accounts: [], sessions: [] };
    }
    throw error;
  } finally {
    await client.end();
  }
};

const insertRow = async (client, table, data, conflictClause = '') => {
  const keys = Object.keys(data);
  const columns = keys.map(quoteIdentifier).join(', ');
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
  const values = keys.map((key) => data[key]);
  const safeTable = quoteIdentifier(table);
  const sql = `INSERT INTO ${safeTable} (${columns}) VALUES (${placeholders})${conflictClause}`;
  return client.query(sql, values);
};

const mergeUsers = (sqliteUsers, residentAccounts) => {
  const merged = sqliteUsers.map((row) => ({
    id: Number(row.id),
    sourceUserId: Number(row.id),
    legacy_resident_uuid: null,
    full_name: row.full_name,
    username: row.username || null,
    email: row.email,
    password_hash: row.password_hash,
    role: row.role || 'resident',
    account_status: row.status || 'Active',
    contact_number: row.contact_number || null,
    address: row.address || null,
    barangay: row.barangay || null,
    profile_photo_path: row.profile_photo_path || null,
    preferred_language: row.preferred_language || 'en',
    created_at: row.created_at,
    last_login: row.last_login,
  }));
  let nextId = merged.reduce((max, row) => Math.max(max, row.id), 0);
  const byEmail = new Map(merged.map((row) => [String(row.email).toLowerCase(), row]));

  for (const account of residentAccounts) {
    const email = String(account.email || '').trim();
    if (!email) continue;
    const existing = byEmail.get(email.toLowerCase());
    if (existing) {
      existing.legacy_resident_uuid = account.id;
      if (existing.role === 'resident' && account.password_hash) {
        existing.password_hash = account.password_hash;
      }
      existing.username = existing.username || account.username || null;
      existing.contact_number = existing.contact_number || account.contact_number || null;
      existing.address = existing.address || account.address || null;
      existing.barangay = existing.barangay || account.barangay || null;
      existing.profile_photo_path = existing.profile_photo_path || account.profile_photo_path || null;
      existing.last_login = existing.last_login || account.last_login || null;
      continue;
    }
    nextId += 1;
    const row = {
      id: nextId,
      sourceUserId: null,
      legacy_resident_uuid: account.id,
      full_name: account.full_name,
      username: account.username || null,
      email,
      password_hash: account.password_hash,
      role: account.role || 'resident',
      account_status: account.status || 'Active',
      contact_number: account.contact_number || null,
      address: account.address || null,
      barangay: account.barangay || null,
      profile_photo_path: account.profile_photo_path || null,
      preferred_language: 'en',
      created_at: account.created_at,
      last_login: account.last_login || null,
    };
    merged.push(row);
    byEmail.set(email.toLowerCase(), row);
  }
  return merged;
};

const run = async () => {
  const targetUrl = requireStagingEnvironment();
  const sqlite = openSqliteReadOnly(process.env.POWERWATCH_SQLITE_PATH);
  const residentSource = await loadResidentSource(targetUrl);
  const client = createStagingClient(targetUrl);
  await client.connect();

  try {
    const tables = new Set(sqlite.prepare(`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).all().map((row) => row.name));

    const sqliteUsers = readSqliteTable(sqlite, tables, 'users', 'SELECT * FROM users ORDER BY id');
    const mergedUsers = mergeUsers(sqliteUsers, residentSource.accounts);

    await client.query('BEGIN');

    // Reference data first: users, barangays, teams, and roles.
    const sourceBarangays = readSqliteTable(sqlite, tables, 'barangays', 'SELECT * FROM barangays ORDER BY id');
    for (const row of sourceBarangays) {
      await insertRow(client, 'barangays', {
        id: Number(row.id),
        barangay_name: row.name,
        area_description: row.area_description || null,
        population: row.population ?? null,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        status: row.status || 'Active',
        created_at: isoOrNow(row.created_at),
        updated_at: isoOrNow(row.updated_at || row.created_at),
      }, ' ON CONFLICT (id) DO UPDATE SET barangay_name = EXCLUDED.barangay_name, area_description = EXCLUDED.area_description, population = EXCLUDED.population, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at');
    }
    const targetBarangays = (await client.query('SELECT id, barangay_name FROM barangays')).rows;
    for (const row of targetBarangays) {
      barangayByName.set(String(row.barangay_name).toLowerCase(), Number(row.id));
    }

    for (const row of mergedUsers) {
      await insertRow(client, 'users', {
        id: row.id,
        legacy_resident_uuid: row.legacy_resident_uuid,
        email: row.email,
        username: row.username,
        password_hash: row.password_hash,
        account_status: row.account_status,
        role: row.role,
        created_at: isoOrNow(row.created_at),
        updated_at: isoOrNow(row.created_at),
        last_login: toIso(row.last_login),
      }, ' ON CONFLICT (id) DO UPDATE SET legacy_resident_uuid = COALESCE(EXCLUDED.legacy_resident_uuid, users.legacy_resident_uuid), email = EXCLUDED.email, username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, account_status = EXCLUDED.account_status, role = EXCLUDED.role, last_login = EXCLUDED.last_login, updated_at = now()');
      if (row.sourceUserId !== null) sourceUserMap.set(row.sourceUserId, row.id);
    }
    const targetUsers = (await client.query('SELECT id, email, legacy_resident_uuid FROM users')).rows;
    for (const row of targetUsers) {
      if (row.legacy_resident_uuid) targetUserByResidentUuid.set(String(row.legacy_resident_uuid), Number(row.id));
    }

    const roleRows = (await client.query('SELECT id, role_name FROM roles')).rows;
    const roleByName = new Map(roleRows.map((row) => [row.role_name, Number(row.id)]));
    for (const row of mergedUsers) {
      const roleId = roleByName.get(row.role);
      if (!roleId) {
        warnings.push(`Unmapped role skipped for one account: ${row.role}`);
        continue;
      }
      await client.query(`
        INSERT INTO user_profiles (user_id, full_name, contact_number, address, barangay_id, purok, profile_photo_path, preferred_language, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, contact_number = EXCLUDED.contact_number, address = EXCLUDED.address, barangay_id = EXCLUDED.barangay_id, purok = EXCLUDED.purok, profile_photo_path = EXCLUDED.profile_photo_path, preferred_language = EXCLUDED.preferred_language, updated_at = now()
      `, [
        row.id, row.full_name, row.contact_number, row.address,
        barangayByName.get(String(row.barangay || '').toLowerCase()) || null,
        null, row.profile_photo_path, row.preferred_language,
        isoOrNow(row.created_at), isoOrNow(row.created_at),
      ]);
      await client.query(`
        INSERT INTO user_roles (user_id, role_id, assigned_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `, [row.id, roleId, isoOrNow(row.created_at)]);
    }

    const sourceTeams = readSqliteTable(sqlite, tables, 'repair_teams', 'SELECT * FROM repair_teams ORDER BY id');
    for (const row of sourceTeams) {
      await insertRow(client, 'repair_teams', {
        id: Number(row.id),
        team_code: row.team_code,
        name: row.name,
        lead_technician: row.lead_technician,
        contact_number: row.contact_number || null,
        vehicle_type: row.vehicle_type || null,
        base_station: row.base_station || null,
        current_latitude: row.current_latitude ?? null,
        current_longitude: row.current_longitude ?? null,
        location_updated_at: toIso(row.location_updated_at),
        status: row.status || 'Available',
        active_assignment_id: row.active_assignment_id ? Number(row.active_assignment_id) : null,
        created_at: isoOrNow(row.created_at),
      }, ' ON CONFLICT (id) DO UPDATE SET team_code = EXCLUDED.team_code, name = EXCLUDED.name, lead_technician = EXCLUDED.lead_technician, contact_number = EXCLUDED.contact_number, vehicle_type = EXCLUDED.vehicle_type, base_station = EXCLUDED.base_station, current_latitude = EXCLUDED.current_latitude, current_longitude = EXCLUDED.current_longitude, location_updated_at = EXCLUDED.location_updated_at, status = EXCLUDED.status, active_assignment_id = EXCLUDED.active_assignment_id');
    }
    // Team IDs are preserved from the source; no separate lookup is needed.

    // Sessions: copy hashes only. Never copy a raw cookie or token.
    const sourceSessions = readSqliteTable(sqlite, tables, 'sessions', 'SELECT * FROM sessions ORDER BY created_at');
    for (const row of sourceSessions) {
      if (!validSessionHash(row.token)) throw new Error('A SQLite session token is not a SHA-256 hash; migration stopped.');
      const userId = sourceUserMap.get(Number(row.user_id));
      if (!userId) throw new Error('A SQLite session references an unmapped user.');
      await client.query(`
        INSERT INTO user_sessions (token_hash, user_id, session_type, source, created_at, expires_at)
        VALUES ($1, $2, 'web', 'sqlite', $3, $4)
        ON CONFLICT (token_hash) DO NOTHING
      `, [row.token, userId, isoOrNow(row.created_at), isoOrNow(row.expires_at)]);
    }
    for (const row of residentSource.sessions) {
      if (!validSessionHash(row.token)) throw new Error('A Neon resident session token is not a SHA-256 hash; migration stopped.');
      const userId = targetUserByResidentUuid.get(String(row.user_id));
      if (!userId) throw new Error('A Neon resident session references an unmapped account.');
      await client.query(`
        INSERT INTO user_sessions (token_hash, user_id, session_type, source, created_at, expires_at)
        VALUES ($1, $2, 'resident', 'neon', $3, $4)
        ON CONFLICT (token_hash) DO NOTHING
      `, [row.token, userId, isoOrNow(row.created_at), isoOrNow(row.expires_at)]);
    }

    const sourceScheduled = readSqliteTable(sqlite, tables, 'scheduled_outages', 'SELECT * FROM scheduled_outages ORDER BY id');
    for (const row of sourceScheduled) {
      await insertRow(client, 'scheduled_outages', {
        id: Number(row.id),
        schedule_code: row.schedule_code,
        title: row.title,
        barangay_id: barangayByName.get(String(row.barangay || '').toLowerCase()) || null,
        barangay_name: row.barangay || null,
        area: row.area || null,
        outage_date: row.outage_date || null,
        start_time: combineDateTime(row.outage_date, row.start_time),
        end_time: combineDateTime(row.outage_date, row.expected_end_time),
        reason: row.reason || null,
        status: row.status || 'Scheduled',
        created_by: sourceUserMap.get(Number(row.created_by)) || null,
        created_at: isoOrNow(row.created_at),
        updated_at: isoOrNow(row.updated_at || row.created_at),
      }, ' ON CONFLICT (id) DO UPDATE SET schedule_code = EXCLUDED.schedule_code, title = EXCLUDED.title, barangay_id = EXCLUDED.barangay_id, barangay_name = EXCLUDED.barangay_name, area = EXCLUDED.area, outage_date = EXCLUDED.outage_date, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, reason = EXCLUDED.reason, status = EXCLUDED.status, updated_at = now()');
    }

    const sourceIncidents = readSqliteTable(sqlite, tables, 'outage_incidents', 'SELECT * FROM outage_incidents ORDER BY id');
    for (const row of sourceIncidents) {
      incidentById.set(Number(row.id), row);
      await insertRow(client, 'incidents', {
        id: Number(row.id),
        incident_code: row.incident_code,
        title: row.title,
        incident_type: row.incident_type || 'Unexpected',
        status: row.status || 'Reported',
        start_time: toIso(row.start_time),
        restored_at: toIso(row.end_time),
        estimated_restoration: toIso(row.estimated_restoration),
        estimated_restoration_text: row.estimated_restoration || null,
        etr_reason: row.etr_reason || null,
        barangay_id: barangayByName.get(String(row.barangay || '').toLowerCase()) || null,
        barangay_name: row.barangay || null,
        location: row.location || null,
        purok: row.purok || null,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        priority: row.priority || 'Medium',
        customers_affected: row.customers_affected ?? null,
        restoration_progress: row.restoration_progress ?? null,
        description: row.description || null,
        cause_category: row.cause_category || null,
        affected_area: row.affected_area || null,
        remarks: row.remarks || null,
        scheduled_id: row.scheduled_id ? Number(row.scheduled_id) : null,
        assigned_team_id: row.assigned_team_id ? Number(row.assigned_team_id) : null,
        assigned_team_name: row.assigned_team_name || null,
        repair_status: row.repair_status || null,
        created_by: sourceUserMap.get(Number(row.created_by)) || null,
        created_at: isoOrNow(row.created_at),
        updated_at: isoOrNow(row.updated_at || row.created_at),
        closed_at: toIso(row.closed_at),
      }, ' ON CONFLICT (id) DO UPDATE SET incident_code = EXCLUDED.incident_code, title = EXCLUDED.title, incident_type = EXCLUDED.incident_type, status = EXCLUDED.status, start_time = EXCLUDED.start_time, restored_at = EXCLUDED.restored_at, estimated_restoration = EXCLUDED.estimated_restoration, estimated_restoration_text = EXCLUDED.estimated_restoration_text, etr_reason = EXCLUDED.etr_reason, barangay_id = EXCLUDED.barangay_id, barangay_name = EXCLUDED.barangay_name, location = EXCLUDED.location, purok = EXCLUDED.purok, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, priority = EXCLUDED.priority, customers_affected = EXCLUDED.customers_affected, restoration_progress = EXCLUDED.restoration_progress, description = EXCLUDED.description, cause_category = EXCLUDED.cause_category, affected_area = EXCLUDED.affected_area, remarks = EXCLUDED.remarks, scheduled_id = EXCLUDED.scheduled_id, assigned_team_id = EXCLUDED.assigned_team_id, assigned_team_name = EXCLUDED.assigned_team_name, repair_status = EXCLUDED.repair_status, closed_at = EXCLUDED.closed_at, updated_at = now()');
    }

    const sourceReports = readSqliteTable(sqlite, tables, 'outage_reports', 'SELECT * FROM outage_reports ORDER BY id');
    for (const row of sourceReports) {
      const reporterId = sourceUserMap.get(Number(row.reporter_id));
      if (!reporterId) throw new Error('A report references an unmapped reporter.');
      reportById.set(Number(row.id), row);
      await insertRow(client, 'reports', {
        id: Number(row.id),
        report_code: row.report_code,
        reporter_id: reporterId,
        barangay_id: barangayByName.get(String(row.barangay || '').toLowerCase()) || null,
        barangay_name: row.barangay,
        location: row.location || null,
        purok: row.purok || null,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        location_confirmed: Boolean(row.location_confirmed),
        location_source: row.location_source || null,
        location_accuracy_m: row.location_accuracy_m ?? null,
        date_time_noticed: toIso(row.date_time_noticed),
        description: row.description || null,
        affected_area: row.affected_area || null,
        report_type: row.possible_outage_type || null,
        photo_path: row.photo_path || null,
        remarks: row.remarks || null,
        status: row.status || 'Submitted',
        verification_status: row.verification_status || 'Pending',
        staff_remarks: row.staff_remarks || null,
        incident_id: row.incident_id ? Number(row.incident_id) : null,
        assigned_team_id: row.assigned_team_id ? Number(row.assigned_team_id) : null,
        assigned_team_name: row.assigned_team_name || null,
        repair_status: row.repair_status || null,
        estimated_restoration: toIso(row.estimated_restoration),
        estimated_restoration_text: row.estimated_restoration || null,
        priority: row.priority || null,
        reported_at: isoOrNow(row.reported_at),
        created_at: isoOrNow(row.reported_at),
        updated_at: isoOrNow(row.updated_at || row.reported_at),
      }, ' ON CONFLICT (id) DO UPDATE SET report_code = EXCLUDED.report_code, reporter_id = EXCLUDED.reporter_id, barangay_id = EXCLUDED.barangay_id, barangay_name = EXCLUDED.barangay_name, location = EXCLUDED.location, purok = EXCLUDED.purok, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, location_confirmed = EXCLUDED.location_confirmed, location_source = EXCLUDED.location_source, location_accuracy_m = EXCLUDED.location_accuracy_m, date_time_noticed = EXCLUDED.date_time_noticed, description = EXCLUDED.description, affected_area = EXCLUDED.affected_area, report_type = EXCLUDED.report_type, photo_path = EXCLUDED.photo_path, remarks = EXCLUDED.remarks, status = EXCLUDED.status, verification_status = EXCLUDED.verification_status, staff_remarks = EXCLUDED.staff_remarks, incident_id = EXCLUDED.incident_id, assigned_team_id = EXCLUDED.assigned_team_id, assigned_team_name = EXCLUDED.assigned_team_name, repair_status = EXCLUDED.repair_status, estimated_restoration = EXCLUDED.estimated_restoration, estimated_restoration_text = EXCLUDED.estimated_restoration_text, priority = EXCLUDED.priority, updated_at = now()');
    }

    const sourceAttachments = readSqliteTable(sqlite, tables, 'report_attachments', 'SELECT * FROM report_attachments ORDER BY id');
    const attachmentPaths = new Set();
    for (const row of sourceAttachments) {
      attachmentPaths.add(row.file_path);
      await insertRow(client, 'report_evidence', {
        legacy_key: `attachment:${row.id}`,
        report_id: Number(row.report_id),
        file_url: row.file_path,
        file_type: row.mime_type,
        original_name: row.original_name,
        file_size: row.file_size ?? null,
        uploaded_at: isoOrNow(row.created_at),
      }, ' ON CONFLICT (legacy_key) DO NOTHING');
    }
    for (const row of sourceReports) {
      if (!row.photo_path || attachmentPaths.has(row.photo_path)) continue;
      await insertRow(client, 'report_evidence', {
        legacy_key: `photo:${row.id}`,
        report_id: Number(row.id),
        file_url: row.photo_path,
        file_type: 'image',
        original_name: path.basename(row.photo_path),
        file_size: null,
        uploaded_at: isoOrNow(row.reported_at),
      }, ' ON CONFLICT (legacy_key) DO NOTHING');
    }

    for (const row of sourceReports) {
      if ((row.verification_status || 'Pending') === 'Pending' && !row.staff_remarks) continue;
      await insertRow(client, 'report_verifications', {
        legacy_key: `verification:${row.id}`,
        report_id: Number(row.id),
        reviewer_id: null,
        decision: row.verification_status || 'Pending',
        remarks: row.staff_remarks || null,
        reviewed_at: isoOrNow(row.updated_at || row.reported_at),
      }, ' ON CONFLICT (legacy_key) DO NOTHING');
    }

    const sourceHistory = readSqliteTable(sqlite, tables, 'report_status_history', 'SELECT * FROM report_status_history ORDER BY id');
    for (const row of sourceHistory) {
      await insertRow(client, 'report_status_history', {
        id: Number(row.id),
        report_id: Number(row.report_id),
        event_type: row.event_type,
        title: row.title,
        details: row.details || null,
        old_status: row.from_status || null,
        new_status: row.to_status || null,
        changed_by: sourceUserMap.get(Number(row.actor_user_id)) || null,
        actor_name: row.actor_name || null,
        created_at: isoOrNow(row.created_at),
      }, ' ON CONFLICT (id) DO UPDATE SET event_type = EXCLUDED.event_type, title = EXCLUDED.title, details = EXCLUDED.details, old_status = EXCLUDED.old_status, new_status = EXCLUDED.new_status, changed_by = EXCLUDED.changed_by, actor_name = EXCLUDED.actor_name');
    }

    const sourceLinks = readSqliteTable(sqlite, tables, 'incident_links', 'SELECT * FROM incident_links ORDER BY incident_id, report_id');
    for (const row of sourceLinks) {
      await client.query(`
        INSERT INTO incident_reports (incident_id, report_id, linked_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (incident_id, report_id) DO NOTHING
      `, [Number(row.incident_id), Number(row.report_id), isoOrNow(row.link_time)]);
    }

    const sourceAssignments = readSqliteTable(sqlite, tables, 'repair_assignments', 'SELECT * FROM repair_assignments ORDER BY id');
    for (const row of sourceAssignments) {
      assignmentById.set(Number(row.id), row);
      const assignedBy = sourceUserMap.get(Number(row.assigned_by));
      if (!assignedBy) throw new Error('A repair assignment references an unmapped assigning user.');
      await insertRow(client, 'repair_assignments', {
        id: Number(row.id),
        assignment_code: row.assignment_code,
        team_id: Number(row.team_id),
        report_id: row.report_id ? Number(row.report_id) : null,
        incident_id: row.incident_id ? Number(row.incident_id) : null,
        assigned_by: assignedBy,
        status: row.status || 'Dispatched',
        priority: row.priority || null,
        target_barangay_id: barangayByName.get(String(row.target_barangay || '').toLowerCase()) || null,
        target_barangay_name: row.target_barangay,
        target_purok: row.target_purok || null,
        target_location: row.target_location || null,
        target_latitude: row.target_latitude ?? null,
        target_longitude: row.target_longitude ?? null,
        dispatch_notes: row.dispatch_notes || null,
        crew_report: row.crew_report || null,
        resolution_remarks: row.resolution_remarks || null,
        dispatched_at: isoOrNow(row.dispatched_at),
        arrived_at: toIso(row.arrived_at),
        completed_at: toIso(row.completed_at),
        updated_at: isoOrNow(row.updated_at || row.dispatched_at),
      }, ' ON CONFLICT (id) DO UPDATE SET assignment_code = EXCLUDED.assignment_code, team_id = EXCLUDED.team_id, report_id = EXCLUDED.report_id, incident_id = EXCLUDED.incident_id, assigned_by = EXCLUDED.assigned_by, status = EXCLUDED.status, priority = EXCLUDED.priority, target_barangay_id = EXCLUDED.target_barangay_id, target_barangay_name = EXCLUDED.target_barangay_name, target_purok = EXCLUDED.target_purok, target_location = EXCLUDED.target_location, target_latitude = EXCLUDED.target_latitude, target_longitude = EXCLUDED.target_longitude, dispatch_notes = EXCLUDED.dispatch_notes, crew_report = EXCLUDED.crew_report, resolution_remarks = EXCLUDED.resolution_remarks, arrived_at = EXCLUDED.arrived_at, completed_at = EXCLUDED.completed_at, updated_at = now()');

      await insertRow(client, 'incident_assignments', {
        legacy_key: `repair_assignment:${row.id}`,
        incident_id: row.incident_id ? Number(row.incident_id) : null,
        report_id: row.report_id ? Number(row.report_id) : null,
        team_id: Number(row.team_id),
        repair_assignment_id: Number(row.id),
        assigned_by: assignedBy,
        assignment_code: row.assignment_code,
        status: row.status || 'Dispatched',
        priority: row.priority || null,
        target_barangay_id: barangayByName.get(String(row.target_barangay || '').toLowerCase()) || null,
        target_barangay_name: row.target_barangay,
        target_purok: row.target_purok || null,
        target_location: row.target_location || null,
        target_latitude: row.target_latitude ?? null,
        target_longitude: row.target_longitude ?? null,
        dispatch_notes: row.dispatch_notes || null,
        crew_report: row.crew_report || null,
        resolution_remarks: row.resolution_remarks || null,
        assigned_at: isoOrNow(row.dispatched_at),
        arrived_at: toIso(row.arrived_at),
        completed_at: toIso(row.completed_at),
        created_at: isoOrNow(row.dispatched_at),
        updated_at: isoOrNow(row.updated_at || row.dispatched_at),
      }, ' ON CONFLICT (legacy_key) DO NOTHING');
    }

    const sourceAreas = readSqliteTable(sqlite, tables, 'incident_areas', 'SELECT * FROM incident_areas ORDER BY incident_id, barangay');
    for (const row of sourceAreas) {
      await client.query(`
        INSERT INTO incident_affected_areas (incident_id, barangay_id, barangay_name, area_description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (incident_id, barangay_name) DO NOTHING
      `, [
        Number(row.incident_id),
        barangayByName.get(String(row.barangay || '').toLowerCase()) || null,
        row.barangay,
        null,
      ]);
    }
    for (const row of sourceIncidents) {
      if (!row.barangay) continue;
      await client.query(`
        INSERT INTO incident_affected_areas (incident_id, barangay_id, barangay_name, area_description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (incident_id, barangay_name) DO NOTHING
      `, [
        Number(row.id),
        barangayByName.get(String(row.barangay || '').toLowerCase()) || null,
        row.barangay,
        row.affected_area || null,
      ]);
    }

    const sourceUpdates = readSqliteTable(sqlite, tables, 'repair_assignment_updates', 'SELECT * FROM repair_assignment_updates ORDER BY id');
    for (const row of sourceUpdates) {
      const assignment = assignmentById.get(Number(row.assignment_id));
      if (!assignment) throw new Error('A repair update references an unmapped assignment.');
      await insertRow(client, 'outage_updates', {
        legacy_key: `repair_update:${row.id}`,
        incident_id: assignment.incident_id ? Number(assignment.incident_id) : null,
        report_id: assignment.report_id ? Number(assignment.report_id) : null,
        assignment_id: Number(row.assignment_id),
        updated_by: sourceUserMap.get(Number(row.staff_id)) || null,
        status: row.stage,
        stage: row.stage,
        remarks: row.notes || null,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        created_at: isoOrNow(row.created_at),
      }, ' ON CONFLICT (legacy_key) DO NOTHING');
    }
    for (const row of sourceHistory) {
      const report = reportById.get(Number(row.report_id));
      await insertRow(client, 'outage_updates', {
        legacy_key: `report_status:${row.id}`,
        incident_id: report?.incident_id ? Number(report.incident_id) : null,
        report_id: Number(row.report_id),
        updated_by: sourceUserMap.get(Number(row.actor_user_id)) || null,
        status: row.to_status || null,
        stage: 'report_status',
        remarks: row.details || row.title || null,
        created_at: isoOrNow(row.created_at),
      }, ' ON CONFLICT (legacy_key) DO NOTHING');
    }

    const sourceAnnouncements = readSqliteTable(sqlite, tables, 'announcements', 'SELECT * FROM announcements ORDER BY id');
    for (const row of sourceAnnouncements) {
      await insertRow(client, 'announcements', {
        id: Number(row.id),
        created_by: sourceUserMap.get(Number(row.created_by)) || null,
        title: row.title,
        content: row.content,
        category: row.category || 'General Information',
        status: row.status || 'Published',
        image_path: row.image_path || null,
        published_at: toIso(row.published_at),
        created_at: isoOrNow(row.created_at),
      }, ' ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, status = EXCLUDED.status, image_path = EXCLUDED.image_path, published_at = EXCLUDED.published_at');
    }

    const sourceNotifications = readSqliteTable(sqlite, tables, 'notifications', 'SELECT * FROM notifications ORDER BY id');
    for (const row of sourceNotifications) {
      const notificationUserId = sourceUserMap.get(Number(row.user_id));
      if (!notificationUserId) throw new Error('A notification references an unmapped user.');
      await insertRow(client, 'notifications', {
        id: Number(row.id),
        user_id: notificationUserId,
        title: row.title,
        message: row.message || null,
        type: row.type || 'general',
        read_at: row.read ? isoOrNow(row.created_at) : null,
        created_at: isoOrNow(row.created_at),
      }, ' ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, message = EXCLUDED.message, type = EXCLUDED.type, read_at = EXCLUDED.read_at');
    }

    for (const row of mergedUsers) {
      for (const channel of ['in_app', 'email', 'sms']) {
        await client.query(`
          INSERT INTO notification_preferences (user_id, channel, enabled)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, channel) DO NOTHING
        `, [row.id, channel, channel !== 'sms']);
      }
    }

    const sourceFeedback = readSqliteTable(sqlite, tables, 'citizen_feedback', 'SELECT * FROM citizen_feedback ORDER BY id');
    for (const row of sourceFeedback) {
      const feedbackUserId = sourceUserMap.get(Number(row.user_id));
      if (!feedbackUserId) throw new Error('Feedback references an unmapped user.');
      await insertRow(client, 'feedback', {
        id: Number(row.id),
        user_id: feedbackUserId,
        report_id: row.report_id ? Number(row.report_id) : null,
        incident_id: row.incident_id ? Number(row.incident_id) : null,
        user_name: row.user_name || null,
        barangay_id: barangayByName.get(String(row.barangay || '').toLowerCase()) || null,
        barangay_name: row.barangay || null,
        rating: Number(row.rating),
        comments: row.feedback_text || null,
        restoration_confirmed: Boolean(row.restoration_confirmed),
        created_at: isoOrNow(row.created_at),
      }, ' ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, report_id = EXCLUDED.report_id, incident_id = EXCLUDED.incident_id, user_name = EXCLUDED.user_name, barangay_id = EXCLUDED.barangay_id, barangay_name = EXCLUDED.barangay_name, rating = EXCLUDED.rating, comments = EXCLUDED.comments, restoration_confirmed = EXCLUDED.restoration_confirmed');
    }

    const sourceAudit = readSqliteTable(sqlite, tables, 'audit_logs', 'SELECT * FROM audit_logs ORDER BY id');
    for (const row of sourceAudit) {
      await insertRow(client, 'audit_logs', {
        id: Number(row.id),
        actor_id: sourceUserMap.get(Number(row.user_id)) || null,
        actor_name: row.user_name || null,
        role: row.role || null,
        action: row.action,
        entity_type: null,
        entity_id: null,
        detail: row.detail || null,
        ip_address: row.ip_address || null,
        created_at: isoOrNow(row.created_at),
      }, ' ON CONFLICT (id) DO UPDATE SET actor_id = EXCLUDED.actor_id, actor_name = EXCLUDED.actor_name, role = EXCLUDED.role, action = EXCLUDED.action, detail = EXCLUDED.detail, ip_address = EXCLUDED.ip_address');
    }

    const sourceOauthAccounts = readSqliteTable(sqlite, tables, 'oauth_accounts', 'SELECT * FROM oauth_accounts');
    for (const row of sourceOauthAccounts) {
      const oauthUserId = sourceUserMap.get(Number(row.user_id));
      if (!oauthUserId) throw new Error('An OAuth account references an unmapped user.');
      await client.query(`
        INSERT INTO oauth_accounts (provider, provider_user_id, user_id, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (provider, provider_user_id) DO NOTHING
      `, [row.provider, row.provider_user_id, oauthUserId, isoOrNow(row.created_at)]);
    }
    const sourceOauthStates = readSqliteTable(sqlite, tables, 'oauth_states', 'SELECT * FROM oauth_states');
    for (const row of sourceOauthStates) {
      await client.query(`
        INSERT INTO oauth_states (state_hash, provider, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (state_hash) DO NOTHING
      `, [row.state_hash, row.provider, isoOrNow(row.expires_at)]);
    }
    const sourceResetTokens = readSqliteTable(sqlite, tables, 'password_reset_tokens', 'SELECT * FROM password_reset_tokens');
    for (const row of sourceResetTokens) {
      const resetUserId = sourceUserMap.get(Number(row.user_id));
      if (!resetUserId) throw new Error('A password reset token references an unmapped user.');
      await client.query(`
        INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (token_hash) DO NOTHING
      `, [row.token_hash, resetUserId, isoOrNow(row.expires_at), isoOrNow(row.created_at)]);
    }
    const sourceSettings = readSqliteTable(sqlite, tables, 'settings', 'SELECT * FROM settings');
    for (const row of sourceSettings) {
      await client.query(`
        INSERT INTO settings (key, value, updated_at)
        VALUES ($1, $2, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `, [row.key, row.value]);
    }
    const sourceSms = readSqliteTable(sqlite, tables, 'sms_logs', 'SELECT * FROM sms_logs ORDER BY id');
    for (const row of sourceSms) {
      await insertRow(client, 'sms_logs', {
        id: Number(row.id),
        phone_number: row.phone_number,
        message: row.message,
        status: row.status || 'Simulated',
        event_type: row.event_type || null,
        created_at: isoOrNow(row.created_at),
      }, ' ON CONFLICT (id) DO NOTHING');
    }
    const sourceAssignmentEvidence = readSqliteTable(sqlite, tables, 'repair_assignment_evidence', 'SELECT * FROM repair_assignment_evidence ORDER BY id');
    for (const row of sourceAssignmentEvidence) {
      const evidenceStaffId = sourceUserMap.get(Number(row.staff_id));
      if (!evidenceStaffId) throw new Error('Assignment evidence references an unmapped staff user.');
      await insertRow(client, 'repair_assignment_evidence', {
        id: Number(row.id),
        assignment_id: Number(row.assignment_id),
        staff_id: evidenceStaffId,
        file_name: row.file_name,
        mime_type: row.mime_type,
        created_at: isoOrNow(row.created_at),
      }, ' ON CONFLICT (id) DO NOTHING');
    }
    const sourceLocationConfirmations = readSqliteTable(sqlite, tables, 'repair_assignment_location_confirmations', 'SELECT * FROM repair_assignment_location_confirmations');
    for (const row of sourceLocationConfirmations) {
      const confirmationStaffId = sourceUserMap.get(Number(row.staff_id));
      if (!confirmationStaffId) throw new Error('A location confirmation references an unmapped staff user.');
      await client.query(`
        INSERT INTO repair_assignment_location_confirmations (assignment_id, staff_id, confirmed_purok, confirmed_location, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (assignment_id) DO UPDATE SET staff_id = EXCLUDED.staff_id, confirmed_purok = EXCLUDED.confirmed_purok, confirmed_location = EXCLUDED.confirmed_location
      `, [Number(row.assignment_id), confirmationStaffId, row.confirmed_purok, row.confirmed_location, isoOrNow(row.created_at)]);
    }
    const sourceTeamMembers = readSqliteTable(sqlite, tables, 'staff_team_members', 'SELECT * FROM staff_team_members');
    for (const row of sourceTeamMembers) {
      const userId = sourceUserMap.get(Number(row.user_id));
      const assignedBy = sourceUserMap.get(Number(row.assigned_by));
      if (!userId || !assignedBy) throw new Error('A staff team membership references an unmapped user.');
      await client.query(`
        INSERT INTO staff_team_members (user_id, team_id, assigned_by, assigned_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, team_id) DO NOTHING
      `, [userId, Number(row.team_id), assignedBy, isoOrNow(row.assigned_at)]);
    }
    const sourceStaffBarangays = readSqliteTable(sqlite, tables, 'staff_barangay_assignments', 'SELECT * FROM staff_barangay_assignments');
    for (const row of sourceStaffBarangays) {
      const userId = sourceUserMap.get(Number(row.user_id));
      const assignedBy = sourceUserMap.get(Number(row.assigned_by));
      const barangayId = barangayByName.get(String(row.barangay || '').toLowerCase());
      if (!userId || !assignedBy || !barangayId) {
        throw new Error('A staff barangay assignment references an unmapped user or barangay.');
      }
      await client.query(`
        INSERT INTO staff_barangay_assignments (user_id, barangay_id, assigned_by, assigned_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, barangay_id) DO NOTHING
      `, [userId, barangayId, assignedBy, isoOrNow(row.assigned_at)]);
    }

    const identityTables = [
      'roles', 'permissions', 'barangays', 'users', 'repair_teams', 'scheduled_outages',
      'incidents', 'reports', 'report_evidence', 'report_verifications',
      'report_status_history', 'report_comments', 'incident_affected_areas',
      'repair_assignments', 'incident_assignments', 'outage_updates',
      'announcements', 'notifications', 'notification_preferences', 'feedback',
      'audit_logs', 'repair_assignment_evidence', 'sms_logs',
    ];
    for (const table of identityTables) {
      await syncIdentity(client, table);
    }

    await client.query('COMMIT');

    const counts = {};
    for (const table of [
      'barangays', 'users', 'user_profiles', 'roles', 'user_roles', 'permissions',
      'role_permissions', 'user_sessions', 'reports', 'report_evidence',
      'report_verifications', 'report_status_history', 'incidents', 'incident_reports',
      'incident_assignments', 'incident_affected_areas', 'outage_updates',
      'scheduled_outages', 'announcements', 'notifications', 'notification_preferences',
      'feedback', 'audit_logs', 'repair_teams', 'repair_assignments',
      'repair_assignment_evidence', 'repair_assignment_location_confirmations',
      'staff_team_members', 'staff_barangay_assignments', 'oauth_accounts',
      'oauth_states', 'password_reset_tokens', 'settings', 'sms_logs',
    ]) {
      const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(table)}`);
      counts[table] = result.rows[0].count;
    }
    console.log('Backfill complete on the isolated Neon development branch.');
    console.log(JSON.stringify(counts));
    if (warnings.length) {
      for (const warning of warnings) console.warn(`WARN ${warning}`);
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    sqlite.close();
    await client.end();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error(`Neon development backfill failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { run };
