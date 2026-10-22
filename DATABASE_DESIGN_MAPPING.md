# Valencia PowerWatch — Final Database Design Mapping

**Status:** design review and migration mapping only. Production data was inspected read-only. No production table was created, altered, renamed, or deleted.

**Date:** 2026-10-23

This document maps the proposed 24-table domain model to the current Valencia PowerWatch implementation. It is the required bridge between the proposed design and any future migration. The production system remains a hybrid:

- SQLite is the operational database for reports, incidents, staff, announcements, audit logs, and settings.
- Neon stores compressed SQLite snapshots, uploaded files, resident accounts, and resident sessions.
- Neon currently has five application tables: `app_snapshots`, `app_snapshots_backup`, `app_snapshot_files`, `resident_accounts`, and `resident_sessions`. A separate `playing_with_neon` sample table also exists and is not part of the application.

---

## 1. Verified current inventory

Read-only inspection of the local SQLite database and the production Neon database found:

- **26 SQLite tables**
- **5 Neon application tables** plus the unrelated `playing_with_neon` sample table
- **2 users** (one administrator and one resident)
- **31 official barangays**
- **1 outage report**, **1 outage incident**, **1 incident/report link**, and **1 affected area**
- **2 report status-history rows**
- **1 audit log**
- **9 settings rows**
- No report attachments, scheduled outages, announcements, notifications, feedback, repair assignments, or active sessions at the time of inspection

The current SQLite tables are:

`announcements`, `audit_logs`, `barangays`, `citizen_feedback`, `incident_areas`, `incident_links`, `notifications`, `oauth_accounts`, `oauth_states`, `outage_incidents`, `outage_reports`, `password_reset_tokens`, `repair_assignment_evidence`, `repair_assignment_location_confirmations`, `repair_assignment_updates`, `repair_assignments`, `repair_teams`, `report_attachments`, `report_status_history`, `scheduled_outages`, `sessions`, `settings`, `sms_logs`, `staff_barangay_assignments`, `staff_team_members`, `users`.

---

## 2. Verdict on the 24-table proposal

The proposed 24 tables are a sound **conceptual core**, but they are not yet a complete target schema for this application. The current system contains operational features that the 24 tables do not represent:

- repair teams and team-based dispatch;
- staff team and barangay scopes;
- staff evidence and location confirmations;
- OAuth account/state records;
- password-reset tokens;
- SMS delivery logs;
- system settings;
- snapshot and uploaded-file infrastructure.

A migration to exactly 24 tables would either drop those features or force them into unrelated tables. The recommended target is:

> **24 domain-core tables + 11 supporting tables = 35 application tables**, plus the three Neon snapshot infrastructure tables.

The 24 core tables should remain the public/capstone data model. The supporting tables preserve existing working behavior and should be migrated rather than deleted.

### Supporting tables to retain

| Supporting table | Why it must remain |
|---|---|
| `oauth_accounts` | Google/Facebook account linkage |
| `oauth_states` | OAuth CSRF state and expiry |
| `password_reset_tokens` | Single-use password recovery |
| `settings` | Staff limits, system configuration |
| `sms_logs` | Notification/SMS delivery audit |
| `repair_teams` | Team roster, vehicle, lead technician, live location |
| `repair_assignments` | Dispatch record linked to a report or incident |
| `repair_assignment_evidence` | Staff-uploaded field evidence |
| `repair_assignment_location_confirmations` | Staff confirmation of purok/location |
| `staff_team_members` | Staff-to-team membership |
| `staff_barangay_assignments` | Staff area authorization |

`repair_assignment_updates` can be folded into `outage_updates`; it does not need to remain as a separate target table. `report_attachments`, `incident_links`, `incident_areas`, `citizen_feedback`, `sessions`, and `resident_sessions` are migrated into their corresponding core tables.

---

## 3. Role and authentication model

The current code uses four role values:

- `resident` — community user
- `personnel` — staff
- `utility` — authorized utility personnel
- `administrator` — admin

The proposal lists only Resident, Staff, and Admin. Dropping `utility` would break current route guards and staff workflows. **Keep four role records in the target `roles` table**, or model `utility` as a Staff subtype with additional permissions. The first option is safer for the initial migration.

### Recommended account mapping

| Current | Target |
|---|---|
| `users` — email, mobile/contact, password hash, status, role, timestamps | `users` + `user_profiles` + `user_roles` |
| `resident_accounts` — Neon UUID account | Existing row retained until cutover; add `legacy_uuid` to `users` for mapping |
| `sessions` — SQLite admin/staff sessions | `user_sessions` |
| `resident_sessions` — Neon resident sessions | `user_sessions` |
| `password_reset_tokens` | Retained supporting table |
| `oauth_accounts`, `oauth_states` | Retained supporting tables |

The application uses custom Node.js `crypto.scryptSync` authentication. It does **not** use Neon Better Auth. Keep the custom `password_hash` model; do not create a duplicate Better Auth user/session schema.

### Role compatibility

The current application reads `req.user.role` directly and uses `requireRole(...)` extensively. For the first migration phase:

1. Keep `users.role` as a compatibility column.
2. Seed `roles` with `resident`, `personnel`, `utility`, and `administrator`.
3. Backfill one `user_roles` row per user.
4. Keep route guards unchanged.
5. In a later phase, make `user_roles` authoritative and remove or derive the compatibility column.

This avoids a high-risk authentication rewrite in the same release as the schema migration.

### Session compatibility

Keep the current split during the hybrid phase:

- `sessions` for admin/staff in SQLite;
- `resident_sessions` for residents in Neon.

The target `user_sessions` table is populated from both tables during migration. Do not delete either source table until the new session path has been tested and all active sessions have expired.

---

## 4. Table-by-table mapping

| # | Proposed core table | Current source | Migration action | Notes |
|---:|---|---|---|---|
| 1 | `users` | `users`, `resident_accounts` | Create target; backfill SQLite users; map resident UUID | Preserve old integer IDs where possible; add `legacy_uuid` for Neon resident accounts |
| 2 | `user_profiles` | `users.full_name`, `contact_number`, `address`, `barangay`, `profile_photo_path`, `preferred_language` | Split from `users`; backfill `barangay_id` from `barangays.name` | `purok` is currently report/incident data, not a universal profile field |
| 3 | `roles` | Distinct `users.role`; code route guards | Create; seed four roles | Resident, Personnel/Staff, Utility, Administrator |
| 4 | `user_roles` | `users.role` | Backfill one row per account | Keep `users.role` temporarily |
| 5 | `permissions` | Hard-coded `requireRole(...)` checks | Create; seed action names by route/module | Do not rely on permissions until route guards are migrated |
| 6 | `role_permissions` | Hard-coded access matrix | Create; seed initial matrix | Utility permissions must be explicit, not silently folded into Staff |
| 7 | `barangays` | `barangays` | Keep data; rename `name` to `barangay_name` in target | 31 official rows; preserve `area_description`, status, population, coordinates |
| 8 | `user_sessions` | `sessions`, `resident_sessions` | Union both stores; preserve token hashes and expiry | Token values are SHA-256 hashes; never copy raw cookies |
| 9 | `reports` | `outage_reports` | Create; map `report_code`, reporter, barangay, description, type, status, timestamps | `possible_outage_type` → `report_type`; preserve `verification_status` as a compatibility field |
| 10 | `report_evidence` | `report_attachments`, `outage_reports.photo_path` | Backfill attachments and legacy photo paths | Keep separate assignment evidence or extend evidence with a nullable assignment reference |
| 11 | `report_verifications` | `outage_reports.verification_status`, `staff_remarks` | Backfill one verification row per reviewed report | Add reviewer, decision, remarks, reviewed timestamp; current data has one Verified report |
| 12 | `report_status_history` | `report_status_history` | Keep; map event/status fields | Preserve actor name and actor ID |
| 13 | `report_comments` | No current table | Create empty | No backfill required |
| 14 | `incidents` | `outage_incidents` | Keep IDs/codes; map status, type, times, coordinates | Preserve dispatch and restoration fields not represented in the proposal |
| 15 | `incident_reports` | `incident_links` | Backfill links | Enforce one report-to-incident link per report |
| 16 | `incident_assignments` | `repair_assignments`, `staff_team_members`, `staff_barangay_assignments` | Create; backfill assignment and scope records | Proposal's single `staff_id` is insufficient for team dispatch; retain team/assignment detail |
| 17 | `incident_affected_areas` | `incident_areas`, `outage_incidents.barangay`, `affected_area` | Backfill barangay IDs | Keep primary barangay for compatibility |
| 18 | `outage_updates` | `repair_assignment_updates`, `report_status_history`, `outage_incidents` status fields | Create; backfill updates; extend with assignment/stage/coordinates | This becomes the canonical public update history |
| 19 | `scheduled_outages` | `scheduled_outages` | Keep; normalize dates/times | Current `outage_incidents.scheduled_id` links a scheduled outage to an incident |
| 20 | `announcements` | `announcements` | Keep; map published/status fields | Preserve `image_path` |
| 21 | `notifications` | `notifications` | Keep; convert `read` to `read_at` | Preserve type and message |
| 22 | `notification_preferences` | No current table | Create; seed defaults per user/channel | No backfill required |
| 23 | `feedback` | `citizen_feedback` | Keep; map `feedback_text` to comments and add ratings | Preserve `report_id`, `incident_id`, `restoration_confirmed` |
| 24 | `audit_logs` | `audit_logs` | Keep; add `actor_id` FK | Preserve `user_name` and `role` as immutable snapshots |

### Current tables not in the 24-core list

| Current table | Disposition |
|---|---|
| `repair_teams` | Keep as supporting table |
| `repair_assignments` | Keep as supporting dispatch detail; optionally link to `incident_assignments` |
| `repair_assignment_updates` | Migrate into `outage_updates` |
| `repair_assignment_evidence` | Keep, or generalize `report_evidence` |
| `repair_assignment_location_confirmations` | Keep as supporting table |
| `staff_team_members` | Keep as supporting table |
| `staff_barangay_assignments` | Keep as supporting table |
| `oauth_accounts` | Keep as supporting auth table |
| `oauth_states` | Keep as supporting auth table |
| `password_reset_tokens` | Keep as supporting auth table |
| `settings` | Keep as supporting system table |
| `sms_logs` | Keep as supporting notification table |
| `app_snapshots`, `app_snapshots_backup`, `app_snapshot_files` | Infrastructure; never migrate or delete as part of domain migration |

---

## 5. Decisions required before any DDL

These decisions must be approved before creating the target schema. They are deliberately unresolved here so the production database is not changed prematurely.

### 5.1 ID strategy

Recommended: preserve existing integer IDs in `users`, `reports`, and `incidents`; use `BIGINT GENERATED BY DEFAULT AS IDENTITY` for new target tables. Add `legacy_resident_uuid` to `users` for the existing Neon `resident_accounts` UUID. This avoids breaking current links while allowing a clean PostgreSQL target.

Alternative: use UUIDs for every target table. This is cleaner for distributed systems but requires a full ID mapping table and updates every foreign key and API response.

### 5.2 Role model

Recommended: four roles (`resident`, `personnel`, `utility`, `administrator`) and a `user_roles` junction. Keep `users.role` during the first phase for compatibility. Do not silently merge `utility` into `personnel` without reviewing every `requireRole` call.

### 5.3 Session model

Recommended: keep the SQLite/Neon split during the hybrid phase; populate `user_sessions` in the target and test it before retiring `sessions` and `resident_sessions`. Do not migrate raw tokens; migrate only the existing SHA-256 hashes.

### 5.4 Team-based dispatch

The proposal's `incident_assignments.staff_id` cannot represent the current team-based dispatch model by itself. Recommended: add optional `team_id`, `assignment_code`, `status`, and dispatch timestamps to `incident_assignments`, or keep `repair_assignments` as a child table and link it to the assignment.

### 5.5 Evidence ownership

Recommended: keep report evidence and staff assignment evidence separate initially. If one table is required, extend `report_evidence` with nullable `assignment_id` and `uploaded_by` and validate that exactly one owner is set.

### 5.6 Status values

Current data uses `Verified` for report status/verification and `Ongoing` for incidents. Before migration, define canonical enums and a mapping table for every current value, including older values that may exist in backups. Do not assume the live row set is the complete historical set.

### 5.7 Deletion policy

Use soft delete/archive for accounts, reports, incidents, announcements, and audit history. Do not cascade-delete audit logs or evidence. The current clean-reset operation is a separate, guarded maintenance action and must not be reused as a migration tool.

---

## 6. Migration strategy

### Phase 0 — Baseline and freeze

1. Take a verified SQLite backup and a Neon snapshot; record checksums and row counts.
2. Export a read-only schema and data inventory.
3. Confirm the current production service is healthy.
4. Freeze schema changes; no production DDL.

### Phase 1 — Development branch only

1. Create a Neon development branch.
2. Create the 24 core tables and 11 supporting tables with the owner role.
3. Add constraints, indexes, and foreign keys.
4. Seed roles, permissions, barangays, and notification defaults.
5. Do not point the production Render service at this branch.

### Phase 2 — Idempotent backfill

1. Backfill users, profiles, roles, and user_roles.
2. Backfill barangays and barangay references.
3. Backfill reports, evidence, verifications, and status history.
4. Backfill incidents, links, affected areas, assignments, and outage updates.
5. Backfill announcements, notifications, feedback, and audit logs.
6. Re-run each script and verify no duplicate rows.

### Phase 3 — Validation and shadow read

1. Compare source and target row counts.
2. Verify all foreign keys and required fields.
3. Check that all 31 barangays and both current accounts map correctly.
4. Confirm token hashes, password hashes, and evidence references are unchanged.
5. Run the application against a staging database and compare the main API outputs.

### Phase 4 — Controlled cutover

1. Keep the SQLite snapshot system running until the normalized path is proven.
2. Cut over only after sign-off from the project owner.
3. Keep the old tables and snapshots for a defined retention period.
4. Roll back by restoring the verified snapshot and the previous Render configuration.

### Phase 5 — Decommission

Retire old tables only after the new schema has passed production verification and the retention period has expired. Never delete `app_snapshots`, `app_snapshots_backup`, or `app_snapshot_files` as part of a domain migration.

---

## 7. Validation checklist

Before cutover, verify:

- [ ] `users` count matches the old user count; resident UUID mapping is complete.
- [ ] `user_profiles` has one row per user.
- [ ] `roles` contains all four current roles.
- [ ] `user_roles` has at least one role per active user.
- [ ] `barangays` has exactly 31 active official records.
- [ ] Every report has a valid reporter and barangay.
- [ ] Every incident/report link references existing records.
- [ ] Every affected area references an existing barangay and incident.
- [ ] Every verification references a report and reviewer.
- [ ] Every status-history row has a valid report and actor where available.
- [ ] Every session token is a 64-character SHA-256 hash, not a raw cookie.
- [ ] Every audit row has an actor ID where available; system actions may have null.
- [ ] Evidence file references resolve to existing files or `app_snapshot_files`.
- [ ] No production table was dropped or renamed without a verified backup.
- [ ] The Render production role remains least privilege and cannot run DDL.

---

## 8. Immediate recommendation

Do not delete, rename, or replace `resident_accounts`, `resident_sessions`, `app_snapshots`, `app_snapshots_backup`, or any current SQLite table yet.

The next safe step is to approve the decisions in section 5, then build the target schema and backfill scripts on a Neon development branch. Production must stay on the current hybrid until the mapping and shadow-read validation are complete.
