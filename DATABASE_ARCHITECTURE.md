# Valencia PowerWatch — Database & Persistence Architecture

**Status:** production hybrid  
**Last verified:** 2026-10-23  
**Decision:** keep the working SQLite + Neon design; do not migrate the live system to the proposed normalized PostgreSQL schema at this time.

This document describes what is actually deployed, so the project documentation does not imply that the proposed 22-table PostgreSQL schema already exists.

---

## 1. Production topology

```
Resident / Staff / Admin browser
              │ HTTPS
              ▼
   Render Node.js service
   https://valencia-powerwatch.onrender.com
              │
              ├── SQLite: data/powerwatch.db
              │      operational source of truth
              │
              ├── Neon: app_snapshots / app_snapshots_backup / app_snapshot_files
              │      compressed SQLite snapshots + uploaded files
              │
              └── Neon: resident_accounts / resident_sessions
                     resident authentication
```

- **Render** runs the Node.js/Express application.
- **SQLite** is the operational database used by the application routes.
- **Neon PostgreSQL** stores the durable SQLite snapshots and resident authentication records.
- Render's free service has no persistent disk; Neon is what makes data survive restarts, sleep, and redeploys.

### Neon connection used in production

| Item | Value |
|---|---|
| Neon project | `soft-rain-77737541` |
| Branch | `br-super-butterfly-a1xti08n` |
| Database | `neondb` |
| PostgreSQL | 18.6 |
| Approximate size | 8 MB |
| App database user | `neondb_owner` |

The connection string is stored only in the Render environment variable `NEON_DATABASE_URL` (and in the local, untracked `.env`). It is not in the repository and must never be committed.

---

## 2. What is actually stored in PostgreSQL

At the time of this audit, Neon contains exactly five application tables:

| Table | Current rows | Purpose |
|---|---:|---|
| `app_snapshots` | 1 | Latest compressed SQLite snapshot |
| `app_snapshots_backup` | 1 | Rolling fallback snapshot |
| `app_snapshot_files` | 0 | Uploaded files stored as `bytea` |
| `resident_accounts` | 1 | Resident accounts used for resident login |
| `resident_sessions` | 0 | Resident login sessions |

The only foreign key is:

```
resident_sessions.user_id → resident_accounts.id
```

### Proposed 22-table schema

**None of the 22 proposed PostgreSQL domain tables exist.** They have not been created or altered.

The proposed tables are currently represented by SQLite tables and application logic:

| Proposed PostgreSQL table | Current implementation | Current data |
|---|---|---|
| `profiles` | SQLite `users` + Neon `resident_accounts` | 2 users + 1 resident account |
| `roles` | Text column `users.role` | `resident`, `personnel`, `administrator`, `utility` |
| `permissions` | Not implemented separately | — |
| `role_permissions` | Not implemented separately | — |
| `barangays` | SQLite `barangays` | 31 |
| `reports` | SQLite `outage_reports` | 1 |
| `report_evidence` | SQLite `report_attachments` + local `uploads/`; Neon `app_snapshot_files` | 0 |
| `report_verifications` | `outage_reports.verification_status` + `report_status_history` | 2 history rows |
| `incidents` | SQLite `outage_incidents` | 1 |
| `incident_assignments` | SQLite `repair_assignments` | 0 |
| `outage_updates` | SQLite `repair_assignment_updates` + incident status | 0 |
| `announcements` | SQLite `announcements` | 0 |
| `notifications` | SQLite `notifications` | 0 |
| `feedback` | SQLite `citizen_feedback` | 0 |
| `audit_logs` | SQLite `audit_logs` | 1 |
| `system_settings` | SQLite `settings` | 9 |
| `report_status_history` | SQLite `report_status_history` | 2 |
| `incident_affected_areas` | SQLite `incident_areas` | 1 |
| `scheduled_outages` | SQLite `scheduled_outages` | 0 |
| `notification_preferences` | **Not implemented** | — |
| `user_sessions` | SQLite `sessions` + Neon `resident_sessions` | 0 |
| `password_reset_tokens` | SQLite `password_reset_tokens` | 0 |

SQLite currently has 26 tables in total, including supporting tables such as `incident_links`, `repair_teams`, `staff_team_members`, `staff_barangay_assignments`, `repair_assignment_evidence`, `repair_assignment_location_confirmations`, `sms_logs`, `oauth_accounts`, and `oauth_states`.

---

## 3. Snapshot and recovery flow

Implementation: `server/persistence.js`, `server/start.js`.

1. **Startup:** if `POWERWATCH_SNAPSHOT_ENABLED=true`, `server/start.js` restores the latest verified snapshot from `app_snapshots` before SQLite opens.
2. **Fallback:** if the latest snapshot is missing or fails its SHA-256 checksum, the restore uses `app_snapshots_backup`.
3. **No snapshot:** the app continues with the local SQLite file. If the local file is absent, `server/db.js` creates the schema. If Neon is unreachable, restore is skipped, snapshot uploads retry, and resident authentication may be unavailable until Neon returns; admin/staff SQLite sessions continue to work.
4. **Runtime:** when the SQLite file changes, the app creates a consistent copy with `VACUUM INTO`, compresses it with gzip, computes a SHA-256 checksum, and uploads it to `app_snapshots` approximately every 5 seconds.
5. **Backup rotation:** snapshots older than the configured backup interval are copied into `app_snapshots_backup`.
6. **Uploads:** changed files under the upload directory are stored in `app_snapshot_files` as `bytea`.
7. **Shutdown:** on SIGTERM the app attempts a final forced snapshot.
8. **Guard:** the snapshot writer refuses to replace a known non-empty database with an empty `users` table.

The snapshot pool uses `pg.Pool` with `max: 1`. Resident authentication uses a separate pool with `max: 3`.

### Current snapshot status

```json
{
  "enabled": true,
  "target": "main",
  "intervalSeconds": 5,
  "restoreSource": "latest",
  "lastSizeBytes": 270336,
  "lastError": null
}
```

---

## 4. Authentication and roles

### Residents

- Resident accounts are stored in Neon `resident_accounts`.
- Resident sessions are stored in Neon `resident_sessions`.
- Resident records are mirrored into SQLite `users` so report ownership, joins, and admin pages continue to use the operational database.
- Passwords use Node.js `crypto.scryptSync` with a random per-password salt.

### Admin, staff, and utility users

- Accounts and sessions are stored in SQLite `users` and `sessions`.
- Session lookup is handled by `getUserByToken`.
- `requireRole` enforces role access on protected routes.

### Roles

| Role | Portal |
|---|---|
| `resident` | `/community` |
| `personnel` | `/staff` |
| `administrator` | `/admin` |
| `utility` | `/admin` |

The reference allows a custom Node.js authentication implementation. The project is **not** using Neon Better Auth. The proposed `permissions` and `role_permissions` tables are not implemented; authorization uses role checks in application middleware.

### Session behavior

- Cookies are `httpOnly` and `SameSite=Lax`.
- `Secure` is set whenever the request is HTTPS. The app trusts one Render proxy hop (`app.set('trust proxy', 1)`), so `req.secure` reflects `X-Forwarded-Proto`; local HTTP development still works without `Secure`.
- Session tokens are 256-bit random values. Only the browser cookie contains the raw token; SQLite `sessions.token` and Neon `resident_sessions.token` store its SHA-256 hash. Session lookup hashes the presented cookie value before querying.
- The hardening deployment invalidates any pre-existing plaintext session rows. The production session count was 0 before this change, so no live user was signed out. If plaintext sessions ever need to be preserved, hash them before deploying this code.
- `PERSISTENT_AUTH_REQUIRED` is not set in Render. When `NEON_DATABASE_URL` is absent, resident auth can fall back to SQLite; when Neon is configured but unreachable, resident login and session checks can fail until Neon returns. Admin/staff SQLite sessions continue to work. Setting `PERSISTENT_AUTH_REQUIRED=true` makes the missing-configuration case fail closed; it is not an automatic failover switch.

---

## 5. Environments and Neon branches

The deployed app currently uses one Neon branch: `br-super-butterfly-a1xti08n`.

The reference recommends separate production and development branches. To add one safely:

1. Create a `development` branch in the Neon console. Do not reuse the production branch.
2. Create a separate Render staging service (or preview environment) with its own `NEON_DATABASE_URL` pointing to the development branch.
3. Use a distinct `POWERWATCH_SNAPSHOT_ID` for staging if both services share a Neon branch.
4. Keep production credentials out of staging and local `.env` files.
5. Apply any schema migrations to development first.

There is no `NEON_API_KEY` in this workspace, so branch creation/listing must be done in the Neon console or with a key supplied separately.

---

## 6. Security controls and known limitations

### Controls in place

- The live root static mount was removed. `/data`, `/server`, `/scripts`, `/tests`, `/node_modules`, `/package.json`, `/package-lock.json`, and `/render.yaml` return 404.
- Report evidence under `/uploads/report_*` and `/uploads/photo_*` is protected by an authentication and authorization route:
  - administrators and utility users can view it;
  - assigned personnel can view it when they can access the report's barangay or are on the assigned team;
  - the reporting resident can view their own evidence.
- Profile photos under `/uploads/profile_*` require authentication and are limited to the owner, administrators, and utility users. Unknown upload names return 404; only announcement images remain public.
- Session tokens are stored as SHA-256 hashes, and cookies set `Secure` on HTTPS.
- Authenticated community map payloads use report codes, statuses, types, timestamps, and coordinates; they do not include resident names or contact details.
- `.env` is ignored by Git and is not served by the application.
- `data/powerwatch.db` is ignored and is no longer tracked on the current `main` tree.
- The GitHub repository is private. Anonymous raw URLs for the current tree and old commits return 404.
- Secrets are configured in Render environment variables, not in the repository.

### Open items

- **Rotate the real admin and resident passwords.** The database was publicly downloadable before the static fix, and old Git history still contains it. Assume the scrypt password hashes and account PII were copied. Rotate both accounts and communicate new credentials privately.
- **Least privilege:** the app still connects as `neondb_owner`, which has `CREATEROLE` and `CREATEDB`. A dedicated app role with only the required table privileges is recommended.
- **Repository history:** old commits and branches still contain `data/powerwatch.db`. They are not anonymously accessible while the repository is private, but purge them before making the repository public again.
- **Hard-coded admin identifiers:** `server/auth.js` contains built-in admin identifiers. The private repository is no longer a public exposure, but moving them to Render environment variables is still preferable.
- **Password change after recovery:** there is no forced password-change flow; rotated credentials should be changed through the normal profile/recovery flow where available.
- **Object storage:** evidence is stored locally and in `app_snapshot_files` as `bytea`, not in Neon Object Storage or an S3-compatible service. This works for the current small volume but is not the reference's object-storage design.
- **No migration framework:** the Neon tables are created with `CREATE TABLE IF NOT EXISTS` at runtime. A normalized schema would need versioned migrations.
- **No Realtime, Functions, or AI Gateway integration.** These are optional under the reference.
- **`notification_preferences` is not implemented.**

### Live exposure fix history

| Commit | Change |
|---|---|
| `2f1b770` | Removed the root static mount; blocked private paths; added regression test |
| `0253031` | Removed `data/powerwatch.db` from the current Git tree and added `data/*.db` to `.gitignore` |

Verification after deployment:

```
GET /data/powerwatch.db      → 404
GET /server/auth.js          → 404
GET /package.json            → 404
GET /render.yaml             → 404
GET /community               → 200
GET /style.css               → 200
GET /app/core.js             → 200
GET /assets/*                → 200
GET /uploads/profile_*       → 401 without a valid session
GET /uploads/private.txt     → 404
GET /api/health              → 200
```

`npm test` passes **79/79** after the hardening changes.

Repository verification:

```
GitHub API /repos/DELMARKELL09652703584/valencia-powerwatch → 404 anonymously (private)
raw.githubusercontent.com/.../data/powerwatch.db             → 404 anonymously
```

Session verification: set `NODE_ENV` aside and check an HTTPS login response for `Set-Cookie: pw_session=...; Secure; HttpOnly; SameSite=Lax`, then confirm the value stored in `sessions.token` is a 64-character SHA-256 digest, not the cookie value.

---

## 7. Verification checklist

```bash
# Automated tests
npm test

# Live service health
curl -s https://valencia-powerwatch.onrender.com/api/health

# Private paths must not be downloadable
curl -I https://valencia-powerwatch.onrender.com/data/powerwatch.db
curl -I https://valencia-powerwatch.onrender.com/server/auth.js

# Main portals
curl -I https://valencia-powerwatch.onrender.com/community
curl -I https://valencia-powerwatch.onrender.com/staff
curl -I https://valencia-powerwatch.onrender.com/admin
```

Healthy production output includes:

- `"storage": "neon+sqlite"`
- `"persistence.enabled": true`
- `"persistence.restoreSource": "latest"` (or `"backup"` after a fallback)
- `"persistence.lastError": null`

---

## 8. If the capstone later requires normalized PostgreSQL tables

Do not create the 22 tables directly in production.

1. Create a Neon `development` branch.
2. Add versioned migrations for the proposed tables.
3. Build a read-only or scheduled sync from SQLite into the development schema, or migrate one module at a time.
4. Test on a staging Render service with a separate `NEON_DATABASE_URL`.
5. Keep the production hybrid running until the mirror is verified.

A full migration to PostgreSQL as the primary database is a larger async rewrite: application routes currently use synchronous `node:sqlite` prepared statements, while `pg` is asynchronous. That work should be planned and tested separately; it is not part of the current hybrid decision.
