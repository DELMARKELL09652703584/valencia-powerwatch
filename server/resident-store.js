const { Pool } = require('pg');

const createResidentStore = (pool) => {
  let ready;

  const ensureReady = () => {
    if (!ready) {
      ready = pool.query(`
        CREATE TABLE IF NOT EXISTS resident_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          full_name TEXT NOT NULL,
          username TEXT,
          email TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL DEFAULT 'resident',
          contact_number TEXT,
          address TEXT,
          barangay TEXT,
          password_hash TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Active',
          profile_photo_path TEXT,
          created_at TEXT NOT NULL,
          last_login TEXT
        );
        CREATE TABLE IF NOT EXISTS resident_sessions (
          token TEXT PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES resident_accounts(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS resident_sessions_expiry_idx ON resident_sessions(expires_at);
      `).catch((error) => {
        ready = null;
        throw error;
      });
    }
    return ready;
  };

  const query = async (text, values = []) => {
    await ensureReady();
    return pool.query(text, values);
  };

  return {
    async createAccount(account) {
      const result = await query(`
        INSERT INTO resident_accounts
          (full_name, username, email, contact_number, address, barangay, password_hash, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', $8)
        RETURNING *
      `, [
        account.full_name,
        account.username,
        account.email,
        account.contact_number,
        account.address,
        account.barangay,
        account.password_hash,
        account.created_at,
      ]);
      return result.rows[0];
    },

    async findByIdentifier(identifier, normalizedPhone) {
      const result = await query(`
        SELECT * FROM resident_accounts
        WHERE LOWER(email) = LOWER($1)
          OR LOWER(COALESCE(username, '')) = LOWER($1)
          OR LOWER(full_name) = LOWER($1)
          OR contact_number = $1
          OR regexp_replace(regexp_replace(COALESCE(contact_number, ''), '[[:space:]().-]', '', 'g'), '^\\+63', '0') = $2
        ORDER BY id
      `, [identifier, normalizedPhone]);
      return result.rows;
    },

    async findByEmail(email) {
      const result = await query('SELECT * FROM resident_accounts WHERE LOWER(email) = LOWER($1)', [email]);
      return result.rows[0] || null;
    },

    async saveLegacyAccount(account) {
      const result = await query(`
        INSERT INTO resident_accounts
          (full_name, username, email, role, contact_number, address, barangay, password_hash, status, profile_photo_path, created_at, last_login)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT DO NOTHING
        RETURNING *
      `, [
        account.full_name,
        account.username || null,
        account.email,
        account.role || 'resident',
        account.contact_number || null,
        account.address || null,
        account.barangay || null,
        account.password_hash,
        account.status,
        account.profile_photo_path || null,
        account.created_at,
        account.last_login || null,
      ]);
      return result.rows[0] || this.findByEmail(account.email);
    },

    async updateAccount(account) {
      const result = await query(`
        UPDATE resident_accounts
        SET full_name = $2, email = $3, role = $4, contact_number = $5, address = $6,
            barangay = $7, profile_photo_path = $8, password_hash = $9, last_login = $10, status = $11
        WHERE LOWER(email) = LOWER($1)
        RETURNING *
      `, [
        account.persistent_email || account.email,
        account.full_name,
        account.email,
        account.role || 'resident',
        account.contact_number || null,
        account.address || null,
        account.barangay || null,
        account.profile_photo_path || null,
        account.password_hash,
        account.last_login || null,
        account.status,
      ]);
      return result.rows[0] || null;
    },

    async createSession(token, userId, createdAt, expiresAt) {
      await query(`
        INSERT INTO resident_sessions (token, user_id, created_at, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [token, userId, createdAt, expiresAt]);
    },

    async saveLegacySession(session) {
      await query(`
        INSERT INTO resident_sessions (token, user_id, created_at, expires_at)
        SELECT $1, id, $2, $3 FROM resident_accounts WHERE LOWER(email) = LOWER($4)
        ON CONFLICT (token) DO NOTHING
      `, [session.token, session.created_at, session.expires_at, session.email]);
    },

    async findUserByToken(token, timestamp) {
      const result = await query(`
        SELECT a.* FROM resident_sessions s
        JOIN resident_accounts a ON a.id = s.user_id
        WHERE s.token = $1 AND s.expires_at > $2
      `, [token, timestamp]);
      return result.rows[0] || null;
    },

    async deleteSession(token) {
      await query('DELETE FROM resident_sessions WHERE token = $1', [token]);
    },

    async deleteUserSessions(userId) {
      await query('DELETE FROM resident_sessions WHERE user_id = $1', [userId]);
    },

    async cleanupExpiredSessions(timestamp) {
      await query('DELETE FROM resident_sessions WHERE expires_at < $1', [timestamp]);
    },
  };
};

const configured = Boolean(process.env.NEON_DATABASE_URL);
const pool = configured
  ? new Pool({ connectionString: process.env.NEON_DATABASE_URL, max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000 })
  : null;

const residentStore = pool ? createResidentStore(pool) : null;

module.exports = {
  createResidentStore,
  residentStore,
  persistentAuthConfigured: configured,
  persistentAuthRequired: process.env.PERSISTENT_AUTH_REQUIRED === 'true',
};
