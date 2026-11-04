# Valencia PowerWatch — Database & Persistence Architecture

**Status:** production hybrid  
**Last verified:** 2026-10-23  
**Decision:** keep the working SQLite + Neon design in production while the proposed 24-table normalized target is mapped and developed separately. No production table is dropped, renamed, or replaced without the approved migration in [DATABASE_DESIGN_MAPPING.md](DATABASE_DESIGN_MAPPING.md).

This document describes what is actually deployed, so the project documentation does not imply that the proposed 24-table PostgreSQL schema already exists.

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
                     persistent resident + staff identity and sessions
```

- **Render** runs the Node.js/Express application.
- **SQLite** is the operational database used by the application routes.
- **Neon PostgreSQL** stores durable SQLite snapshots and persistent resident/staff authentication records.
- Render's free service has no persistent disk; Neon is what makes data survive restarts, sleep, and redeploys.
- Staff live GPS positions are stored in SQLite per active assignment and staff member. They are included in the existing compressed SQLite snapshots; this feature does not add direct CRUD against the normalized Neon schema or require a Neon migration. Resident reads are limited to the owner of the assigned report, and positions older than two minutes are not exposed as current. OpenStreetMap receives map-tile requests and the public OSRM service receives the route endpoints needed for distance and ETA.

### Neon connection used in production

| Item | Value |
|---|---|
| Neon project | `soft-rain-77737541` |
| Branch | `br-super-butterfly-a1xti08n` |
| Database | `neondb` |
| PostgreSQL | 18.6 |
| Approximate size | 8 MB |
| App database user | `powerwatch_app_mvjwen4u` (least privilege) |
| Schema owner | `neondb_owner` (maintenance only) |

The connection string is stored only in the Render environment variable `NEON_DATABASE_URL` (and in the local, untracked `.env`). It is not in the repository and must never be committed.

Production uses the dedicated role `powerwatch_app_mvjwen4u` with `NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`. It has `CONNECT`, schema `USAGE`, and `SELECT`/`INSERT`/`UPDATE`/`DELETE` on the five application tables. It cannot create tables, roles, or databases. The `neondb_owner` connection remains only for schema provisioning, snapshot recovery, and other deliberate maintenance. The local `.env` may still use the owner for those tasks; Render must use the app role.

---

## 2. What is actually stored in PostgreSQL

At the time of this audit, Neon contains exactly five application tables:

| Table | Current rows | Purpose |
|---|---:|---|
| `app_snapshots` | 1 | Latest compressed SQLite snapshot |
| `app_snapshots_backup` | 1 | Rolling fallback snapshot |
| `app_snapshot_files` | 0 | Uploaded files stored as `bytea` |
| `resident_accounts` | 1 | Resident accounts and provisioned staff credentials |
| `resident_sessions` | 0 | Resident login sessions |

The only foreign key is:

```
resident_sessions.user_id → resident_accounts.id
```

### Proposed 24-table schema

**The normalized schema is now deployed in production.** As of 2026-10-23, 35 PostgreSQL domain tables (the 24 core tables plus 11 supporting tables), 69 foreign keys, 31 value checks, and full foreign-key indexing exist in Neon next to the pre-existing snapshot/resident tables. Migration 007 also adds `updated_at` maintenance triggers, a role-matrix sync trigger, and two diagnostic views. The application still reads SQLite plus the Neon snapshot, so runtime behavior is unchanged; the schema is not yet the application's source of truth. The full mapping, gaps, and migration plan are in [DATABASE_DESIGN_MAPPING.md](DATABASE_DESIGN_MAPPING.md). Table-by-table relationships are in [DATABASE_RELATIONSHIPS.md](DATABASE_RELATIONSHIPS.md), the improvement review and roadmap are in [DATABASE_REVIEW.md](DATABASE_REVIEW.md), and the guarded deploy, seed, backfill, and validation scripts are documented in [database/README.md](../database/README.md).


The proposed tables are currently represented by SQLite tables and application logic:

| Proposed PostgreSQL table | Current implementation | Current data |
|---|---|---|
| `users` | SQLite `users` + Neon `resident_accounts` | 2 users + 1 resident account |
| `user_profiles` | Profile columns in SQLite `users` | 2 |
| `roles` | Text column `users.role` | `resident`, `personnel`, `administrator`, `utility` |
| `user_roles` | Text column `users.role` | 2 |
| `permissions` | Not implemented separately | — |
| `role_permissions` | Not implemented separately | — |
| `barangays` | SQLite `barangays` | 31 |
| `user_sessions` | SQLite `sessions` + Neon `resident_sessions` | 0 |
| `reports` | SQLite `outage_reports` | 1 |
| `report_evidence` | SQLite `report_attachments` + `outage_reports.photo_path`; Neon `app_snapshot_files` | 0 |
| `report_verifications` | `outage_reports.verification_status` + `report_status_history` | 1 verified report / 2 history rows |
| `report_status_history` | SQLite `report_status_history` | 2 |
| `report_comments` | Not implemented | — |
| `incidents` | SQLite `outage_incidents` | 1 |
| `incident_reports` | SQLite `incident_links` | 1 |
| `incident_assignments` | SQLite `repair_assignments` | 0 |
| `incident_affected_areas` | SQLite `incident_areas` | 1 |
| `outage_updates` | SQLite `repair_assignment_updates` + incident status | 0 |
| `scheduled_outages` | SQLite `scheduled_outages` | 0 |
| `announcements` | SQLite `announcements` | 0 |
| `notifications` | SQLite `notifications` | 0 |
| `notification_preferences` | **Not implemented** | — |
| `feedback` | SQLite `citizen_feedback` | 0 |
| `audit_logs` | SQLite `audit_logs` | 1 |

SQLite currently has 27 tables in total. Eleven supporting tables must be preserved in the normalized target because the 24-table list does not represent them: `oauth_accounts`, `oauth_states`, `password_reset_tokens`, `settings`, `sms_logs`, `repair_teams`, `repair_assignments`, `repair_assignment_evidence`, `repair_assignment_location_confirmations`, `staff_team_members`, and `staff_barangay_assignments`. `repair_assignment_updates` is mapped into `outage_updates`; `report_attachments`, `incident_links`, `incident_areas`, `citizen_feedback`, `sessions`, and `resident_sessions` map into their corresponding core tables. `repair_assignment_live_locations` is an additional SQLite-only runtime table that remains durable through snapshots; it is not in the active normalized Neon schema.

`playing_with_neon` was a Neon sample table unrelated to the application. It held 10 rows of tutorial data, had no foreign keys, and was dropped on 2026-10-23; it was never part of the domain schema.

---

## 3. Snapshot and recovery flow

Implementation: `server/services/persistence.js`, `server/start.js`.

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

- Admin and utility accounts remain in SQLite `users` and their sessions in SQLite `sessions`.
- Staff operational profiles and team/barangay assignments remain in SQLite so existing report and dispatch workflows continue to work.
- Staff credentials and sessions are also stored in Neon `resident_accounts` and `resident_sessions`. The legacy table names are retained; `role = 'personnel'` distinguishes staff. SQLite mirrors those identities for operational joins and role checks.
- Because the legacy account table requires an email value, phone-only staff use a deterministic reserved `.invalid` internal identifier; public APIs hide it and authentication uses the assigned mobile number.
- New staff creation fails closed when persistent authentication is required but Neon is unavailable. Passwords are hashed with `crypto.scryptSync`; raw session tokens are never stored.
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
- Render sets `PERSISTENT_AUTH_REQUIRED=true`. Resident and staff login therefore fail closed if persistent Neon authentication is not configured. Admin and utility accounts continue to use SQLite sessions.

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
- Production Neon uses the least-privilege role `powerwatch_app_mvjwen4u`; runtime DDL is skipped when the five tables exist (`to_regclass` checks). A fresh database or schema change requires the owner role.
- The real admin and resident passwords were rotated after the public-exposure window. Session rows were invalidated, and both the latest and rolling backup snapshots now verify only the new password hashes.
- The built-in administrator can change their own password through the authenticated profile route after confirming the current password. Staff-side reset, role, status, delete, and forgot-password flows remain blocked for that account.
- Authenticated community map payloads use report codes, statuses, types, timestamps, and coordinates; they do not include resident names or contact details.
- `.env` is ignored by Git and is not served by the application.
- `data/powerwatch.db` is ignored and is no longer tracked on the current `main` tree.
- The GitHub repository is private. Anonymous raw URLs for the current tree and old commits return 404.
- Secrets are configured in Render environment variables, not in the repository.

### Credential rotation procedure (production)

A Render suspend triggers an asynchronous final snapshot. If a new snapshot is uploaded before that final write finishes, the final snapshot can overwrite the upload. Do not skip the stabilization wait.

1. Confirm the latest Render deploy is live and `/api/health` is healthy.
2. Suspend the service and wait until Render reports `suspended`.
3. Poll `app_snapshots` for the `main` row until both `checksum` and `created_at` have remained unchanged for at least 15 seconds. Read the snapshot only after that stabilization window.
4. Read the latest verified snapshot and the current `resident_accounts.password_hash`. Keep both in memory for rollback; never write them to a tracked file.
5. Update both SQLite `users` password hashes and the Neon resident hash as one coordinated change. Delete `sessions`, `resident_sessions`, and `password_reset_tokens`; upload the new snapshot.
6. Wait at least 5 seconds and verify the latest `app_snapshots` checksum is still the new one. Resume the service.
7. Wait for health to report `restoredAt` at or after the new snapshot's `created_at`, then verify both admin and resident logins and log out.
8. If verification fails, suspend again, wait for snapshot stabilization, restore the original snapshot and resident hash, and resume. Never reset production data.
9. After a successful rotation, replace `app_snapshots_backup` with the new snapshot as well, so the old password hashes cannot be restored from the rolling backup.

### Open items

- **Repository history:** old commits and branches still contain `data/powerwatch.db`. They are not anonymously accessible while the repository is private, but purge them before making the repository public again.
- **Hard-coded admin identifiers:** `server/middleware/auth.js` contains built-in admin identifiers. The private repository is no longer a public exposure, but moving them to Render environment variables is still preferable.
- **Forced password change:** there is no forced first-login password-change flow. Rotated credentials are delivered privately and should be changed after login; the built-in admin and residents can now change their own passwords from the authenticated profile screen.
- **Object storage:** evidence is stored locally and in `app_snapshot_files` as `bytea`, not in Neon Object Storage or an S3-compatible service. This works for the current small volume but is not the reference's object-storage design.
- **No migration framework:** the app provisions the Neon tables only when run with the owner role; the production app role detects existing tables and skips DDL. A normalized schema would need versioned owner-run migrations.
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
GET /server/middleware/auth.js          → 404
GET /package.json            → 404
GET /render.yaml             → 404
GET /community               → 200
GET /style.css               → 200
GET /client/js/shared/core.js             → 200
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
curl -I https://valencia-powerwatch.onrender.com/server/middleware/auth.js

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

Do not create the 24 core tables directly in production.

1. Create a Neon `development` branch.
2. Add versioned migrations for the proposed tables, following [DATABASE_DESIGN_MAPPING.md](DATABASE_DESIGN_MAPPING.md).
3. Build a read-only or scheduled sync from SQLite into the development schema, or migrate one module at a time.
4. Test on a staging Render service with a separate `NEON_DATABASE_URL`.
5. Keep the production hybrid running until the mirror is verified.

A full migration to PostgreSQL as the primary database is a larger async rewrite: application routes currently use synchronous `node:sqlite` prepared statements, while `pg` is asynchronous. That work should be planned and tested separately; it is not part of the current hybrid decision.
