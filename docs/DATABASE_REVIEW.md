# Valencia PowerWatch — Database Review and Improvement Plan

**Review date:** 2026-10-23
**Target:** Neon PostgreSQL 18.6 production branch (`neondb`, `public` schema) used by the Render service
**Runtime companion:** SQLite `data/powerwatch.db` plus the encrypted Neon snapshot tables
**Scope:** table design, keys, relationships, constraints, indexes, validation, security, performance, maintainability, and Admin / Resident / Staff module coverage

---

## 1. Executive summary

The database is **healthy and internally consistent**. All 35 required application tables exist,
every table has a primary key, all 69 foreign keys resolve to real targets, and every constraint is
validated. The defects found were gaps rather than corruption: a few validation rules, some missing
indexes for real screens, one missing relationship, and several places where the same fact is stored
twice.

**What was implemented (migrations `007_production_hardening.sql` and `008_role_sync_demotion.sql`, applied to production):**

| Area | Change |
|---|---|
| Timestamps | Automatic `updated_at` maintenance on 10 tables, without overwriting historical values supplied by the backfill |
| Validation | 12 new `CHECK` constraints (coordinate ranges/pairs, outage-update subject, SHA-256 token hashes, JSON settings) — 19 → 31 validated checks |
| Relationships | Added the missing `users.legacy_resident_uuid → resident_accounts(id)` foreign key — 68 → 69 |
| Indexes | 15 new indexes covering resident login/session, unread notifications, Admin list orderings, dispatch board, and assignment lookups — 132 → 147 schema-wide |
| Consistency | `users.role` is now mirrored into `user_roles` (including removal of the previous role on demotion); duplicate mirror/assignment codes are rejected |
| Diagnostics | `v_user_effective_permissions` and `v_data_quality_issues` read-only views |
| Backfill safety | The backfill now skips the two non-JSON SQLite bookkeeping settings, so the new JSON validation cannot block a future migration |
| Runtime | 10 new SQLite indexes in `server/db.js` for incident links, report/incident lookups, user login, sessions, and unread notifications |

Nothing was dropped. No column type changed. No existing row was modified. Live counts after the
migration are unchanged: **3 resident accounts, 2 sessions, 1 snapshot**. The test suite passes
**91/91**, and a rolled-back production smoke test passed **22/22**.

**Biggest remaining risk (not a schema defect):** the Render service connects to Neon as
**`neondb_owner`**. That role can `DROP` every table, including the snapshot that holds all live
data. Rotating the runtime to a least-privilege role is the highest-value security improvement left
(§6.5).

**Biggest architectural issue:** there are still **three sources of truth** (§3). The normalized
35-table schema is deployed but dormant; the application reads SQLite and the Neon snapshot. Every
improvement in this review is therefore additive and compatible with the current backend. A phased
cutover is the long-term fix (§8.2).

### Health scorecard

| Area | Rating | Notes |
|---|---|---|
| Table structure | Good | 35 focused tables, no redundant table; a few overlapping pairs are documented |
| Primary keys | Good | Surrogate identity keys everywhere; junction tables use composite keys |
| Foreign keys | Good | 69 validated; one gap fixed |
| Check constraints | Good | 31 validated; statuses/roles/priorities covered |
| Index coverage | Good | Every FK indexed; module query paths added |
| Data quality | Fair | Duplicate storage (role, barangay name, incident link) is detectable but not auto-healed |
| Security | Needs work | Owner role at runtime; `sslmode=require`; PII retention undefined |
| Scalability | Fair | Fine at city scale; audit/SMS growth needs retention or partitioning later |
| Maintainability | Good | Versioned, checksummed migrations and tests; SQLite/normalized drift remains |

---

## 2. Environment and what was verified

| Item | Result |
|---|---|
| PostgreSQL version | 18.6 (Neon) |
| Total tables in `public` | 41 = 35 application + `schema_migrations` + 5 snapshot/resident tables |
| Application tables | 35 (24 core + 11 supporting) — all present |
| Foreign keys on the 35 tables | 69, all validated |
| CHECK constraints | 31, all validated |
| Primary keys | Every table |
| Indexes | 147 schema-wide (136 on the 35 tables) |
| Views | 2 diagnostic views (new) |
| Triggers | 11 hardening triggers (new) |
| Roles / permissions / role-permissions | 4 / 24 / 53 |
| Barangays / settings | 31 (all with coordinates) / 7 |
| Live resident data | 3 accounts, 2 sessions, 1 snapshot |
| Runtime SQLite | 26 tables, 2 users, 1 report, 1 incident, 31 barangays |
| Nearest recovery point | Neon point-in-time restore (project setting) |

---

## 3. How data actually flows (read this before changing anything)

```
Resident browser ──> Render (Node) ──> SQLite data/powerwatch.db  (runtime source of truth)
                                   ├─> Neon app_snapshots / app_snapshot_files (5-second snapshot of SQLite + uploads)
                                   ├─> Neon resident_accounts / resident_sessions (login + session data)
                                   └─> Neon 35 normalized tables              (deployed, but not read by the app)
```

Consequences:

1. **The normalized tables are not the live source of truth.** Today they are a target schema plus
   reference data. Improvements there cannot break the running app, but they also do not speed up
   the app until the cutover.
2. **Resident authentication is split.** `resident_accounts` is live; `users` is the staff/admin
   source in SQLite. A resident who later becomes staff would exist in both places.
3. **The snapshot is a full copy of the SQLite database.** It contains password hashes, contact
   details, and addresses. Treat `app_snapshots.data` as the most sensitive object in the database.
4. **Two ways to write the same operational fact.** The SQLite `outage_reports.incident_id` and
   `incident_links` mirror the normalized `reports.incident_id` / `incident_reports`, and
   `repair_assignments` mirrors `incident_assignments`.

**Rule for any future change:** keep the runtime path (SQLite + snapshot + resident tables)
additive-compatible, and treat the normalized schema as the migration target, not as a second
runtime store.

---

## 4. Are all 35 tables necessary?

Yes. Each table maps to a live feature or to a required audit/security concern. There is **no
redundant table**, but there are four intentional duplications of *data* that should be understood
(the remaining rows are related tables that are not redundant):

| Overlap | Assessment | Recommendation |
|---|---|---|
| `incident_assignments` vs `repair_assignments` | `incident_assignments` is the normalized mirror of the live `repair_assignments` (linked by `repair_assignment_id`). Keeping both during cutover is correct. | Keep both now. After cutover, retire the mirror or make it a view. A partial unique index now enforces one mirror row per repair assignment. |
| `reports.incident_id` vs `incident_reports` | `reports.incident_id` is a convenient pointer; `incident_reports` holds the relationship. They can drift. | `incident_reports` is authoritative. `v_data_quality_issues` reports missing/stale pointers. Do **not** add `UNIQUE(report_id)` yet: legacy `incident_links` may link one report to several incidents, and a hard constraint would block the backfill. |
| `users.role` vs `user_roles` | Route guards read `users.role`; the permission matrix reads `user_roles`. | Fixed for the primary role by `users_sync_primary_role`; `v_user_effective_permissions` exposes the union. Extra roles still live only in `user_roles`. |
| `barangay_id` + `barangay_name` | The name is a historical snapshot (reports/incidents keep the name used at the time). | Keep the snapshot. `v_data_quality_issues` reports drift after a rename. |
| `report_verifications` vs `reports.verification_status` | History vs current state — not redundant. | Keep. |
| `notification_preferences` vs `settings` | Per-user overrides vs global defaults — not redundant. | Keep. |
| `oauth_states`, `password_reset_tokens` | Short-lived auth state. A table is simpler and auditable. | Keep; prune expired rows on a schedule (§6.4). |
| `sms_logs`, `audit_logs` | Compliance/audit trails. | Keep; add retention (§6.4). |

The 5 non-model tables (`app_snapshots`, `app_snapshots_backup`, `app_snapshot_files`,
`resident_accounts`, `resident_sessions`) are the bridge to the current runtime. They are not
redundant today, but they are the reason for the cutover in §8.2.

---

## 5. What migrations 007 and 008 changed (detail)

`database/migrations/007_production_hardening.sql` is additive and idempotent;
`database/migrations/008_role_sync_demotion.sql` replaces the 007 role trigger function.
Status labels below use "Fixed in 007" unless stated otherwise.

### 5.1 Timestamp maintenance

- `powerwatch_touch_updated_at()` + one trigger on each of: `users`, `user_profiles`,
  `barangays`, `settings`, `reports`, `incidents`, `scheduled_outages`, `repair_assignments`,
  `incident_assignments`, `notification_preferences`.
- The trigger only replaces `updated_at` when the statement did not change it, so the backfill's
  historical timestamps survive. This is the subtle part most triggers get wrong.

### 5.2 New constraints (all validated)

| Table | Constraint | Prevents |
|---|---|---|
| `barangays` | `barangays_population_check` | negative population |
| `barangays` | `barangays_coordinates_check` | half-set or out-of-range coordinates |
| `reports` | `reports_coordinates_check` | half-set or out-of-range coordinates |
| `incidents` | `incidents_coordinates_check` | half-set or out-of-range coordinates |
| `repair_teams` | `repair_teams_coordinates_check` | half-set or out-of-range current position |
| `repair_assignments` | `repair_assignments_coordinates_check` | half-set or out-of-range target |
| `incident_assignments` | `incident_assignments_coordinates_check` | half-set or out-of-range target |
| `outage_updates` | `outage_updates_coordinates_check` | half-set or out-of-range coordinates |
| `outage_updates` | `outage_updates_subject_check` | a timeline row attached to no report, incident, or assignment |
| `user_sessions` | `user_sessions_token_hash_check` | raw tokens instead of SHA-256 hex |
| `password_reset_tokens` | `password_reset_tokens_token_hash_check` | raw reset tokens |
| `settings` | `settings_value_json_check` | invalid JSON in the config store |

### 5.3 Relationship

- `users_legacy_resident_uuid_fkey`: `users.legacy_resident_uuid → resident_accounts(id)
  ON DELETE SET NULL`. The backfill already copied this value; nothing enforced it.

### 5.4 Indexes

| Index | Serves |
|---|---|
| `users_username_lower_uidx` (unique, partial) | case-insensitive username login |
| `barangays_name_lower_uidx` (unique) | deterministic name → barangay mapping in the backfill |
| `resident_accounts_email_lower_uidx` (unique) | case-insensitive resident login |
| `resident_accounts_username_lower_idx` | case-insensitive resident lookup |
| `resident_sessions_user_idx` | logout-all / session revocation (the index the app's lazy DDL never created) |
| `reports_reported_at_idx` | Admin "all reports" ordering |
| `incidents_start_time_idx` | Admin incident ordering |
| `scheduled_outages_date_idx` | upcoming outage screens |
| `audit_logs_created_idx` | audit UI and retention sweeps |
| `feedback_created_idx` | feedback analytics |
| `notifications_unread_idx` (partial) | unread badge counts |
| `password_reset_tokens_expiry_idx` | expiry cleanup |
| `repair_assignments_team_status_idx` | dispatch board |
| `incident_assignments_repair_assignment_uidx` (unique, partial) | one mirror row per repair assignment |
| `incident_assignments_assignment_code_uidx` (unique, partial) | duplicate dispatch codes in the normalized model |

### 5.5 Triggers and views

- `users_sync_primary_role`: inserting/changing `users.role` also inserts the matching `user_roles`
  row. Migration 008 replaces the function so a role change also removes the previous primary role;
  without that, demoting an administrator would leave the old administrator grant in place.
  Explicitly granted extra roles are preserved unless one is the role being replaced.
- `v_user_effective_permissions`: per-user permission names from `users.role` + `user_roles`.
- `v_data_quality_issues`: barangay-name drift, incident-link drift, role-matrix drift, and half-set
  coordinates. An empty result means healthy.

### 5.6 Runtime (SQLite) indexes

Added in `server/db.js`: `incident_links(report_id)`, `outage_reports(incident_id)`,
`outage_reports(barangay, reported_at DESC)`, `repair_assignments(report_id|incident_id)`,
`sessions(user_id)`, `users(LOWER(email))`, `users(LOWER(username))`, `users(role, status)`, and a
partial unread-notification index. These are created by `CREATE INDEX IF NOT EXISTS` on the next
Render boot. No rebuild or downtime is required.

---

## 6. Findings and recommendations

Severity: **P0** = do first, **P1** = next, **P2** = later.
Status: **Fixed** = implemented in 007/008 / `db.js`; **Open** = recommendation.

### 6.1 Table design and normalization

| # | Severity | Finding | Status / recommendation |
|---|---|---|---|
| 1 | P1 | Three sources of truth (SQLite, snapshot blob, normalized tables) make reconciliation and audits harder. | Open. Follow the phased cutover in §8.2. |
| 2 | P2 | `settings.value` is `TEXT` holding JSON, so queries cannot use JSON operators. | Open. Add `value_json JSONB` and dual-write, then switch reads; keep `value` for compatibility. |
| 3 | P2 | `resident_sessions.created_at` / `expires_at` are `TEXT`, not `TIMESTAMPTZ`. Lexicographic ordering works only while every writer uses the same ISO format. | Open. Convert in a maintenance window with an explicit `USING` cast and a coordinated deploy; do not change it casually because live auth depends on it. |
| 4 | P2 | No soft delete for accounts/reports. Deletion either cascades or is blocked by `ON DELETE RESTRICT`. | Open. Prefer `deleted_at` + partial indexes over hard deletes; the audit trail then stays intact. |
| 5 | P2 | `announcements` has no `updated_at`, so edits are invisible. | Open. Add the column plus the same trigger if announcements become editable. |
| 6 | P2 | `oauth_states` has no `created_at`; `password_reset_tokens` has no `used_at`. | Open. Useful for abuse investigation and one-time-use enforcement. |
| 7 | P2 | Naming is inconsistent (`changed_by` / `updated_by` / `actor_id` / `reviewer_id`; `account_status` vs `status`). | Do **not** rename now — it would break the backfill and future code. Document aliases in the data dictionary. |

### 6.2 Relationships and constraints

| # | Severity | Finding | Status / recommendation |
|---|---|---|---|
| 8 | Fixed | `users.legacy_resident_uuid` had no FK. | Fixed in 007. |
| 9 | P2 | `reports.incident_id` vs `incident_reports` can drift. | Detect only (`v_data_quality_issues`). Before enforcing, clean legacy links; then add `UNIQUE(report_id)` and a sync trigger. |
| 10 | P2 | `app_snapshot_files.snapshot_id` has no FK to `app_snapshots`. | Open. The upload path writes files *before* the snapshot row, so a naive FK would break new-branch bootstrapping. Reorder the write path first, then add the FK. |
| 11 | P2 | No time-order checks on outages/incidents (end before start, restored before start). | Open. Add only after the legacy data is cleaned; a strict check would abort a future backfill. |
| 12 | P2 | Cross-field state machines (`status` vs `verification_status` vs `repair_status`) are not constrained against contradiction. | Open. Encode allowed transitions in the application/service layer; a matrix of DB checks would be brittle. |
| 13 | P2 | `announcements.created_by` and assignment attribution use `SET NULL`, so deleting a staff account erases authorship. | Open. Keep the account (deactivate instead of delete) or store a denormalized `created_by_name` snapshot. |
| 14 | Note | `incident_reports` intentionally allows one report in multiple incidents because legacy `incident_links` may do so. | Keep until the data is normalised. |

### 6.3 Indexes and query performance

| # | Severity | Finding | Status / recommendation |
|---|---|---|---|
| 15 | Fixed | Several real screen paths had no index (resident session/user, unread notifications, time-ordered Admin lists, dispatch board). | Fixed in 007 and `db.js`. |
| 16 | P2 | Free-text search on reports/announcements (if added) would use `ILIKE '%…%'` and scan. | Open. Add `pg_trgm` + GIN indexes, or a `tsvector` column with a trigger, when search latency appears. |
| 17 | P2 | `audit_logs`, `notifications`, `sms_logs`, `outage_updates` grow without bound. Indexes help lookups but not table size. | Open. Retention first (§6.4); partition by month only when a table exceeds a few million rows. |
| 18 | P2 | The backfill inserts row by row. | Acceptable at current size; use `COPY`/multi-row inserts if the dataset grows. |
| 19 | Note | Every index slows writes. The new set targets queries the UI actually runs; avoid adding speculative indexes. | Review `pg_stat_user_indexes.idx_scan` after a month of production use and drop unused ones. |

### 6.4 Operations, retention, and backups

| # | Severity | Finding | Status / recommendation |
|---|---|---|---|
| 20 | P1 | No retention policy for personal data or high-growth tables. | Open. Suggested: notifications 90 days, expired sessions/oauth states/password-reset tokens after expiry, SMS logs 1 year, audit logs 2 years. Run as a scheduled SQL job (Neon SQL editor / cron) — never in the request path. |
| 21 | P1 | Only one rotating snapshot backup (`app_snapshots_backup`) exists. | Open. Rely on Neon point-in-time restore for disaster recovery and verify the restore window; optionally write a daily logical backup to object storage. |
| 22 | P2 | `pg_stat_statements` is not installed; slow-query analysis is limited to Neon metrics. | Open. Enable it on the project if the plan permits. |
| 23 | P2 | Two/three separate `pg.Pool`s exist (snapshot writer, resident store, app queries). The pooler masks this today. | Open. Share one pool to reduce connection churn if the service grows. |
| 24 | Fixed | No way to see data-quality drift. | `v_data_quality_issues` in 007. |

### 6.5 Security

| # | Severity | Finding | Status / recommendation |
|---|---|---|---|
| 25 | **P0** | The Render service connects as **`neondb_owner`** (confirmed live). A leaked connection string can drop every table and read every snapshot. | Open. Create a dedicated `powerwatch_app` role with DML only; see the SQL below. Change the Render env var, then rotate the owner password. |
| 26 | **P1** | `sslmode=require` is treated as `verify-full` today but PostgreSQL/libpq semantics will weaken in a future driver major. | Open. Change `NEON_DATABASE_URL` to `sslmode=verify-full` (keep `channel_binding=require`). Zero code change. |
| 27 | P1 | The snapshot blob contains all PII and hashes. Any analytics/read-only role must not see it. | Open. Exclude `app_snapshots*` from read-only/BI grants; grant only the app role. |
| 28 | Fixed | Raw session/reset tokens could be stored in the normalized tables. | Fixed in 007 (SHA-256 hex checks). The live tables already store hashes (`hashSessionToken`). |
| 29 | P2 | No password-hash algorithm/version column, so a future rehash is hard to roll out. | Open. Add `password_algo` (e.g. `scrypt-v1`) to both `users` and `resident_accounts`; rehash on login. |
| 30 | P2 | No login throttling/lockout table; rate limiting is in-process and resets on deploy. | Open. If distributed throttling is needed, add `login_attempts` (a 36th table) keyed by email/IP with a short retention. |
| 31 | Note | Row-level security is not enabled. | Not recommended now: single-tenant data, and the app uses one connection role. Revisit only if residents get direct DB access. |
| 32 | Note | PII inventory: `users`/`resident_accounts` (name, email, phone, address), `reports`/`incidents` (location), `feedback.user_name`, `audit_logs.ip_address`, and the snapshot blob. | Document in the privacy notice; apply §20 retention. |

**Least-privilege role sketch** (run as the owner in the Neon SQL editor, replace the password):

```sql
CREATE ROLE powerwatch_app LOGIN PASSWORD '<long-random-secret>';
GRANT CONNECT ON DATABASE neondb TO powerwatch_app;
GRANT USAGE ON SCHEMA public TO powerwatch_app;

-- Runtime write path (SQLite snapshot + resident auth)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  app_snapshots, app_snapshots_backup, app_snapshot_files,
  resident_accounts, resident_sessions
TO powerwatch_app;

-- Normalized schema: read reference data, write operational data
GRANT SELECT ON roles, permissions, role_permissions TO powerwatch_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  users, user_profiles, user_roles, barangays, user_sessions,
  reports, report_evidence, report_verifications, report_status_history,
  report_comments, incidents, incident_reports, incident_assignments,
  incident_affected_areas, outage_updates, scheduled_outages, announcements,
  notifications, notification_preferences, feedback, audit_logs,
  oauth_accounts, oauth_states, password_reset_tokens, settings, sms_logs,
  repair_teams, repair_assignments, repair_assignment_evidence,
  repair_assignment_location_confirmations, staff_team_members,
  staff_barangay_assignments
TO powerwatch_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO powerwatch_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO powerwatch_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO powerwatch_app;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
```

**Compatibility caveat:** `server/services/persistence.js` and `server/services/resident-store.js` contain lazy
`CREATE TABLE` / `CREATE INDEX` fallbacks. They only run when a table is missing (both check
`to_regclass` / existence first), and on the production branch the tables exist. A no-DDL role is
therefore safe today. If you want the fallback to keep working on a brand-new branch, also grant
`CREATE ON SCHEMA public` — but then the role is no longer strictly DDL-free. Prefer keeping DDL in
the migration scripts and granting no `CREATE`.

### 6.6 Maintainability

| # | Severity | Finding | Status / recommendation |
|---|---|---|---|
| 33 | P1 | Two schemas describe the same domain: `server/db.js` (SQLite) and `database/migrations/*.sql`. They can drift. | Open. Keep the mapping document current; after cutover, generate or retire one of them. Until then, every logical change needs both sides. |
| 34 | Fixed | Deploy verification hardcoded 68 FKs / 19 checks. | Updated to 69 / 31, with new tests for migrations 007 and 008. |
| 35 | P2 | No table/column comments inside PostgreSQL beyond the three added by 007. | Open. Add `COMMENT ON` for the canonical-rule columns when the schema stabilises. |
| 36 | Fixed | The two SQLite bookkeeping settings (`seed_version`, `demo_cleanup_version`) are not valid JSON, so the new `settings_value_json_check` would have blocked the backfill. | Fixed: the backfill now skips them, matching the reference seed. |
| 37 | Good | Migrations are versioned and checksum-guarded; the deploy script refuses to run edited applied files. | Keep this discipline. Never edit an applied migration; add the next number. |

---

## 7. Admin / Resident / Staff module coverage

| Module | Tables used (normalized) | Status |
|---|---|---|
| **Resident portal** | `users`, `user_profiles`, `reports`, `report_evidence`, `report_status_history`, `notifications`, `feedback`, `announcements`, `scheduled_outages`, `barangays`, `oauth_accounts`, `password_reset_tokens` | Schema supports every screen. Live login still uses `resident_accounts` / `resident_sessions`; indexes for those were added. |
| **Staff / field** | `repair_teams`, `staff_team_members`, `staff_barangay_assignments`, `repair_assignments`, `repair_assignment_evidence`, `repair_assignment_location_confirmations`, `outage_updates`, `incidents`, `incident_assignments` | Fully represented. Dispatch board index added; one-to-one mirror index added. |
| **Admin** | All of the above plus `roles`, `permissions`, `role_permissions`, `user_roles`, `settings`, `sms_logs`, `audit_logs`, `scheduled_outages`, `announcements` | Fully represented. List/ordering indexes added; effective-permission view added. |
| **Cross-cutting** | `audit_logs`, `notifications`, `settings`, `schema_migrations` | Auditable. Retention and PII policy still open. |

No module is missing a table. The remaining work is wiring (cutover), authorization (RBAC from the
matrix), and operations (retention, least privilege), not schema coverage.

---

## 8. Prioritized roadmap

### 8.1 P0 / P1 (do next)

1. **Least-privilege runtime role** (`powerwatch_app`) and remove `neondb_owner` from Render. Rotate
   the owner credential afterward.
2. **`sslmode=verify-full`** in `NEON_DATABASE_URL`.
3. **Verify Neon point-in-time restore** and record the recovery window.
4. **Retention job** for notifications, expired auth state, SMS logs, and audit logs (start with a
   dry-run count).
5. **Watch `v_data_quality_issues`** after the next backfill; add it to the deploy checklist.

### 8.2 P1 architectural: phased cutover to one source of truth

1. **Decide the account model.** Recommended: keep `resident_accounts` as the identity table for
   residents and make `users` the staff/admin table, linked by `legacy_resident_uuid` (now
   FK-enforced). Alternatively merge them later; do not run both indefinitely.
2. **Dual-write** new reports/incidents into the normalized tables inside the same request that
   writes SQLite; compare counts nightly.
3. **Backfill historical rows**, then run `scripts/production/neon-validate.js`.
4. **Read-switch module by module** (Announcements → Scheduled outages → Reports → Incidents →
   Staff dispatch). Keep SQLite as a fallback for one release.
5. **Retire the snapshot loop** once the normalized tables are authoritative; keep the blob as a
   cold backup for one release, then drop the dual write.
6. **Move authorization to `role_permissions`** using `v_user_effective_permissions`; keep the
   existing route guards until parity tests pass.

### 8.3 P2 (scale / polish)

1. Retention → monthly partitioning for `audit_logs` and `sms_logs` if they exceed a few million rows.
2. Full-text search (`pg_trgm` or `tsvector`) for report/announcement search.
3. `settings.value_json JSONB` with dual-write.
4. `timestamptz` conversion for `resident_sessions` in a maintenance window.
5. Soft delete (`deleted_at`) for accounts and reports.
6. `app_snapshot_files → app_snapshots` FK after reordering the snapshot write path.
7. `UNIQUE(report_id)` on `incident_reports` after legacy links are cleaned.
8. Password algorithm/version columns and rehash-on-login.
9. `COMMENT ON` for the remaining canonical-rule columns.

---

## 9. Verification performed

| Verification | Result |
|---|---|
| Deploy dry run (applies all migrations in a transaction, then rolls back) | PASS |
| Production apply of migrations 007 and 008 | PASS |
| 35/35 tables, 69 FKs, 31 CHECKs, 147 indexes | PASS |
| All constraints validated | PASS |
| 11 triggers and 2 views present | PASS |
| Role sync trigger creates `user_roles` rows | PASS |
| Demotion removes the previous primary role | PASS |
| Effective-permission view returns 24 permissions for an administrator | PASS |
| `updated_at` fires when omitted, preserves explicit values | PASS |
| Report → incident → link chain | PASS |
| Rejection of half-set/out-of-range coordinates, subject-less timeline rows, non-JSON settings, raw tokens, orphan legacy UUIDs | PASS (6/6) |
| `v_data_quality_issues` empty | PASS |
| Live resident data unchanged (3 accounts / 2 sessions / 1 snapshot) | PASS |
| Test suite | **91/91** |
| Rolled-back production smoke test | **22/22** |

---

## 10. Rollback and operational notes

- Migration 007 is additive. If it must be reverted, drop the two views, the two trigger functions
  (and their triggers), the 12 checks, the new indexes, and the `users_legacy_resident_uuid_fkey`
  constraint. No data change is involved. Migration 008 only replaces the role trigger function.
- Do **not** edit an applied migration; the deploy script enforces checksums. Add `009_*.sql`.
- `npm run db:deploy` is the dry run; `npm run db:deploy:apply` requires
  `POWERWATCH_ALLOW_PRODUCTION_DDL=1` and `NODE_ENV` other than `production`.
- The SQLite indexes in `server/db.js` are created on the next Render boot and are safe to leave in
  place.
- Before any future backfill, run:
  `SELECT * FROM v_data_quality_issues;` — it must return zero rows.
