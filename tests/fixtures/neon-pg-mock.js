const crypto = require('node:crypto');
const fs = require('node:fs');

const storagePath = process.env.NEON_MOCK_STORAGE;

const readState = () => {
  try {
    return JSON.parse(fs.readFileSync(storagePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { accounts: [], sessions: [] };
    throw error;
  }
};

const writeState = (state) => {
  fs.writeFileSync(storagePath, JSON.stringify(state));
};

class Pool {
  async query(sql, values = []) {
    if (/to_regclass\('public\.resident_accounts'\)/i.test(sql)) {
      return { rows: [{ accounts: 'resident_accounts', sessions: 'resident_sessions' }] };
    }
    if (/^\s*(CREATE TABLE|CREATE INDEX)/i.test(sql)) return { rows: [] };

    const state = readState();
    if (/INSERT INTO resident_accounts/i.test(sql) && /RETURNING \*/i.test(sql)) {
      const legacy = /ON CONFLICT DO NOTHING/i.test(sql);
      const account = legacy
        ? {
          id: crypto.randomUUID(),
          full_name: values[0],
          username: values[1],
          email: values[2],
          role: values[3],
          contact_number: values[4],
          address: values[5],
          barangay: values[6],
          password_hash: values[7],
          status: values[8],
          profile_photo_path: values[9],
          created_at: values[10],
          last_login: values[11],
        }
        : {
          id: crypto.randomUUID(),
          full_name: values[0],
          username: values[1],
          email: values[2],
          role: values[3],
          contact_number: values[4],
          address: values[5],
          barangay: values[6],
          password_hash: values[7],
          status: values[8],
          profile_photo_path: null,
          created_at: values[9],
          last_login: null,
        };
      const existing = state.accounts.find((row) => row.email.toLowerCase() === account.email.toLowerCase());
      if (existing) {
        if (legacy) return { rows: [] };
        const error = new Error('duplicate key value violates unique constraint');
        error.code = '23505';
        throw error;
      }
      state.accounts.push(account);
      writeState(state);
      return { rows: [account] };
    }

    if (/SELECT \* FROM resident_accounts/i.test(sql) && /regexp_replace/i.test(sql)) {
      const identifier = String(values[0]).toLowerCase();
      const phone = String(values[1]);
      const rows = state.accounts.filter((account) => (
        account.email.toLowerCase() === identifier
        || String(account.username || '').toLowerCase() === identifier
        || account.full_name.toLowerCase() === identifier
        || account.contact_number === values[0]
        || String(account.contact_number || '').replace(/[\s().-]/g, '').replace(/^\+63/, '0') === phone
      ));
      return { rows };
    }

    if (/SELECT \* FROM resident_accounts\s+WHERE LOWER\(email\)/i.test(sql)) {
      const row = state.accounts.find((account) => account.email.toLowerCase() === String(values[0]).toLowerCase());
      return { rows: row ? [row] : [] };
    }

    if (/UPDATE resident_accounts/i.test(sql)) {
      const account = state.accounts.find((row) => row.email.toLowerCase() === String(values[0]).toLowerCase());
      if (!account) return { rows: [] };
      [
        account.full_name,
        account.email,
        account.role,
        account.contact_number,
        account.address,
        account.barangay,
        account.profile_photo_path,
        account.password_hash,
        account.last_login,
        account.status,
      ] = values.slice(1);
      writeState(state);
      return { rows: [account] };
    }

    if (/INSERT INTO resident_sessions/i.test(sql) && /SELECT \$1, id/i.test(sql)) {
      const account = state.accounts.find((row) => row.email.toLowerCase() === String(values[3]).toLowerCase());
      if (account && !state.sessions.some((row) => row.token === values[0])) {
        state.sessions.push({
          token: values[0],
          user_id: account.id,
          created_at: values[1],
          expires_at: values[2],
        });
        writeState(state);
      }
      return { rows: [] };
    }

    if (/INSERT INTO resident_sessions/i.test(sql)) {
      state.sessions.push({
        token: values[0],
        user_id: values[1],
        created_at: values[2],
        expires_at: values[3],
      });
      writeState(state);
      return { rows: [] };
    }

    if (/SELECT a\.\* FROM resident_sessions/i.test(sql)) {
      const session = state.sessions.find((row) => row.token === values[0] && new Date(row.expires_at) > new Date(values[1]));
      const account = session && state.accounts.find((row) => row.id === session.user_id);
      return { rows: account ? [account] : [] };
    }

    if (/DELETE FROM resident_sessions WHERE token/i.test(sql)) {
      state.sessions = state.sessions.filter((row) => row.token !== values[0]);
      writeState(state);
      return { rows: [] };
    }

    if (/DELETE FROM resident_sessions WHERE user_id/i.test(sql)) {
      state.sessions = state.sessions.filter((row) => row.user_id !== values[0]);
      writeState(state);
      return { rows: [] };
    }

    if (/DELETE FROM resident_sessions WHERE expires_at/i.test(sql)) {
      state.sessions = state.sessions.filter((row) => new Date(row.expires_at) >= new Date(values[0]));
      writeState(state);
      return { rows: [] };
    }

    throw new Error(`Unhandled mock Neon query: ${sql}`);
  }
}

module.exports = { Pool };
