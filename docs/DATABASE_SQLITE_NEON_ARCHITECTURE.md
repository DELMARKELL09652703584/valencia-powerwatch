# SQLite vs Neon Architecture — Current State & Migration Plan

## 1. Current Production Topology (Verified)

```
Resident / Staff / Admin browser
              │ HTTPS
              ▼
   Render Node.js service
   https://valencia-powerwatch.onrender.com
              │
              ├── SQLite: data/powerwatch.db
              │      operational source of truth (all app routes)
              │
              ├── Neon PostgreSQL: app_snapshots / app_snapshots_backup /
              │      app_snapshot_files   (compressed SQLite snapshots + uploads)
              │
              └── Neon PostgreSQL: resident_accounts / resident_sessions
                     resident authentication only
```

**Key point:** SQLite is the operational source of truth. Neon stores snapshots (for persistence across Render restarts) and resident auth. The 35-table normalized PostgreSQL schema exists in Neon next to these 5 tables but is **not yet** the application's source of truth.

---

## 2. What Lives Where

### Neon (5 tables)
| Table | Purpose | Approx. rows |
|---|---|---|
| `app_snapshots` | Latest compressed SQLite snapshot | 1 |
| `app_snapshots_backup` | Rolling fallback snapshot | 1 |
| `app_snapshot_files` | Uploaded files as `bytea` | 0 |
| `resident_accounts` | Resident accounts for resident login | 1 |
| `resident_sessions` | Resident login sessions | 0 |

Only FK: `resident_sessions.user_id → resident_accounts.id`

### SQLite (26 tables — operational source of truth)
All app data: users, sessions, barangays, outage_reports, report_attachments, outage_incidents, incident_links, incident_areas, repair_assignments, repair_assignment_updates, repair_assignment_evidence, repair_assignment_location_confirmations, scheduled_outages, announcements, notifications, citizen_feedback, audit_logs, settings, sms_logs, oauth_accounts, oauth_states, password_reset_tokens, repair_teams, staff_team_members, staff_barangay_assignments + SQLite bookkeeping tables.

### Neon 35-table normalized schema (exists, not yet source of truth)
**24 core tables:** users, profiles, roles, permissions, user_roles, role_permissions, barangays, sessions, reports, report_evidence, report_verifications, report_status_history, report_comments, incidents, incident_reports, incident_assignments, incident_affected_areas, outage_updates, scheduled_outages, announcements, notifications, notification_preferences, feedback, audit_logs.

**11 supporting tables:** oauth_accounts, oauth_states, password_reset_tokens, settings, sms_logs, repair_teams, repair_assignments, repair_assignment_evidence, repair_assignment_location_confirmations, staff_team_members, staff_barangay_assignments.

FK count: 69. CHECK constraints: 31. Indexes: 147.

---

## 3. Table-by-Table Mapping

| Proposed PG Table | SQLite Source | Neon Source |
|---|---|---|
| `users` | `users` | `resident_accounts` (resident only) |
| `user_profiles` | profile columns in `users` | — |
| `roles` | `users.role` text column | — |
| `user_roles` | `users.role` text column | — |
| `permissions` | Not implemented | — |
| `role_permissions` | Not implemented | — |
| `barangays` | `barangays` | — |
| `user_sessions` | `sessions` | `resident_sessions` |
| `reports` | `outage_reports` | — |
| `report_evidence` | `report_attachments` + `photo_path` | `app_snapshot_files` |
| `report_verifications` | `verification_status` + `report_status_history` | — |
| `report_status_history` | `report_status_history` | — |
| `report_comments` | Not implemented | — |
| `incidents` | `outage_incidents` | — |
| `incident_reports` | `incident_links` | — |
| `incident_assignments` | `repair_assignments` | — |
| `incident_affected_areas` | `incident_areas` | — |
| `outage_updates` | `repair_assignment_updates` + incident status | — |
| `scheduled_outages` | `scheduled_outages` | — |
| `announcements` | `announcements` | — |
| `notifications` | `notifications` | — |
| `notification_preferences` | Not implemented | — |
| `feedback` | `citizen_feedback` | — |
| `audit_logs` | `audit_logs` | — |

**11 supporting tables preserved:** oauth_accounts, oauth_states, password_reset_tokens, settings, sms_logs, repair_teams, repair_assignments, repair_assignment_evidence, repair_assignment_location_confirmations, staff_team_members, staff_barangay_assignments.

---

## 4. Authentication & Role Split

| Role | Accounts stored in | Sessions stored in | Portal |
|---|---|---|---|
| `resident` | Neon `resident_accounts` | Neon `resident_sessions` | `/community` |
| `personnel` | SQLite `users` | SQLite `sessions` | `/staff` |
| `administrator` | SQLite `users` | SQLite `sessions` | `/admin` |
| `utility` | SQLite `users` | SQLite `sessions` | `/admin` |

Resident records are mirrored into SQLite `users` for report ownership and admin pages. Passwords use `crypto.scryptSync`. Session tokens are SHA-256 hashed in both stores.

---

## 5. Snapshot & Recovery Flow

1. Startup: if `POWERWATCH_SNAPSHOT_ENABLED=true`, restore latest verified snapshot from `app_snapshots` before SQLite opens.
2. Fallback: if latest snapshot fails SHA-256, use `app_snapshots_backup`.
3. Runtime: ~every 5s, app copies SQLite with `VACUUM INTO`, gzip-compresses, computes SHA-256, uploads to `app_snapshots`.
4. Uploads: changed files under upload dir stored in `app_snapshot_files` as `bytea`.
5. Shutdown: on SIGTERM, attempt final forced snapshot.
6. Guard: refuses to replace non-empty DB with empty `users` table.

---

## 6. Phased SQLite → Neon Migration / Cutover Plan

### Phase 0 — Preparation (isolated dev/staging only, no production changes)

1. **Create Neon `development` branch** (not production). Point staging Render service at it via `NEON_DEV_DATABASE_URL`.
2. **Set safety flags:** `POWERWATCH_ALLOW_NEON_DEV=1`, `NODE_ENV` != `production`, dev URL must not equal production URL or share endpoint host.
3. **Run migrations on dev:** `npm run db:migrate:neon` — applies 35 tables additively.
4. **Run backfill on dev:** `npm run db:backfill:neon` — copies users, profiles, roles, sessions, barangays, reports, incidents, dispatch, notifications, audit, OAuth, settings, SMS, support data from SQLite source.
5. **Run validation on dev:** `npm run db:validate:neon` — checks counts, FKs, roles, barangay mapping, evidence links, SHA-256 session hashes.
6. **Audit production Neon (read-only):** `npm run db:audit:neon` — opens `BEGIN READ ONLY`, rolls back, no writes.

### Phase 1 — Parallel Write / Dual Write (staging only)

- Keep SQLite as primary read/write path.
- Add async write path from SQLite changes to Neon normalized tables (change stream or post-commit sync).
- Verify Neon reads match SQLite reads for all portal pages.
- No user-facing behavior change.

### Phase 2 — Read Traffic Shift (staging only)

- Point specific read-only admin/report endpoints at Neon.
- Compare results vs SQLite for a sample of production-like queries.
- Monitor for FK violations, missing rows, type mismatches (SQLite dynamic typing vs PostgreSQL strict types).

### Phase 3 — Cutover Decision Gate

Requirements before any production change:
- 35 Neon tables validated on staging with `npm run db:validate:neon`.
- Backfill counts match SQLite source counts.
- Zero orphan foreign keys in Neon.
- All session hashes are SHA-256 (no plaintext).
- Staging Render service healthy against Neon dev branch for at least 72 hours.
- Rollback plan tested (revert to SQLite primary by toggling config flag, no data loss).

### Phase 4 — Production Cutover (requires explicit user approval)

1. **Backup:** Download verified SQLite snapshot from `/api/admin/backup`. Confirm SHA-256.
2. **Apply schema to production Neon:** `npm run db:deploy:apply` with `POWERWATCH_ALLOW_PRODUCTION_DDL=1` (dry-run first with `npm run db:deploy`).
3. **Backfill production data:** Run `npm run db:backfill:neon` against production branch using `POWERWATCH_SOURCE_NEON_URL` as read-only source for resident accounts/sessions.
4. **Switch application routes:** Change route handlers from `node:sqlite` prepared statements to `pg` async queries. This is the largest rewrite — SQLite sync statements → PostgreSQL async.
5. **Verify:** `/api/health` reports `"storage": "neon+sqlite"` or `"storage": "neon"`; all three portals load; login works for admin/staff/resident.
6. **Cutover complete:** SQLite becomes read-only fallback; Neon is primary.

### Phase 5 — Post-Cutover

- SQLite file no longer written to (kept as cold backup).
- Neon snapshot/resident tables continue for auth and recovery.
- Monitor for 7 days; keep rollback snapshot available.

---

## 7. Rollback Plan

- **Pre-cutover:** SQLite remains unchanged; simply stop using Neon reads.
- **Post-cutover:** Restore from verified SQLite snapshot backup; re-enable SQLite writes; revert route handler changes.
- Never run migrations or backfill against production `NEON_DATABASE_URL` without `POWERWATCH_ALLOW_PRODUCTION_DDL=1` and explicit approval.

---

## 8. Constraints & Warnings

- **No production changes without explicit approval.** Do not run `db:deploy:apply`, `db:backfill:neon`, or switch `DATABASE_URL` on production without sign-off.
- **Rendering free tier has no persistent disk** — Neon snapshots are what survive restarts. Do not disable snapshot uploads.
- **SQLite `node:sqlite` is synchronous; `pg` is asynchronous** — route handler rewrite is required for full Neon primary. Not part of current hybrid decision.
- **Resident auth depends on Neon** — if Neon is unreachable, resident login may fail while admin/staff SQLite sessions continue.
- **`notification_preferences` is not implemented** in either store — gap to address before cutover if needed.
- **Playtable `playing_with_neon` was dropped** on 2026-10-23; it was never part of the domain schema.
