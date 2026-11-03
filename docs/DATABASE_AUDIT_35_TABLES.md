# Valencia PowerWatch — Complete Table-by-Table Database Audit

**Date:** 2026-10-23  
**Environment:** Neon PostgreSQL (18.6) / `neondb` / user `neondb_owner`  
**Schema:** `public`  
**Generated from live catalog:** 2026-10-23T12:38:46.838Z

---

## 1) Executive Summary

- **Required app tables (35):** all present, every table has a PK, every FK validated (0 unvalidated), 69 FKs across the 35 tables.
- **Constraints:** 31 CHECK constraints total; 0 unvalidated.
- **Indexes:** 147 (136 on the 35 app tables).
- **Views/Triggers:** 2 views, 11 triggers (hardening applied via 007/008).
- **Data integrity (live checks):** no orphaned FKs detected, no case-duplicate keys (emails/usernames/barangays), no report-incident drift, role-matrix in sync. Live: 3 resident accounts, 2 sessions, 1 snapshot.
- **Legacy tables (untouched):** app_snapshots(1), app_snapshots_backup(1), app_snapshot_files(0), resident_accounts(3), resident_sessions(2).
- **Grants (current):** connected as `neondb_owner` with full privileges on all objects (see §6).

---

## 2) Neon / Render Integration Verification

| Item | Status | Evidence |
|---|---|---|
| Render service config | Verified | `render.yaml`: web service `valencia-powerwatch`, branch `main`, build `npm ci && node --test`, start `node server/start.js`, health `/api/health`, `NEON_DATABASE_URL` sync:false, `POWERWATCH_SNAPSHOT_ENABLED=true`. |
| DDL guardrails | Verified | `scripts/production/neon-deploy-schema.js` requires `POWERWATCH_ALLOW_PRODUCTION_DDL=1`, `NODE_ENV!=production`, refuses same-host dev/prod URL, dry-run rolls back, checksum-protects applied migrations. |
| Migrations applied (live) | Verified | `schema_migrations`: 001,002,003,004,005,006,007,008 all recorded. |
| Protected legacy tables preserved | Verified | 5 pre-existing snapshot/resident tables untouched. |
| Connection code | Verified | `server/services/persistence.js` uses `pg` pool with `NEON_DATABASE_URL`; runtime uses same DB for snapshots and resident auth. |

---

## 3) Table Inventory (35 required)

| # | Table | Purpose | Rows | Size | PK | FKs | UQ | CK | Idx (non-pkey) | Trig | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|

| 1 | `users` | Staff/admin identity and auth; mirrors primary role to user_roles via trigger. | 0 | 144 kB | `id` | 1 | 3 | 2 | 7 | 2 | **Correct** |
| 2 | `user_profiles` | Extended staff/admin profile details (1:1 with users). | 0 | 48 kB | `user_id` | 2 | 0 | 0 | 1 | 1 | **Correct** |
| 3 | `roles` | RBAC role definitions (seeded). | 4 | 48 kB | `id` | 0 | 1 | 0 | 1 | 0 | **Correct** |
| 4 | `user_roles` | User-role junction for RBAC (trigger-maintained primary role). | 0 | 56 kB | `user_id,role_id` | 3 | 0 | 0 | 2 | 0 | **Correct** |
| 5 | `permissions` | Permission catalog (seeded). | 24 | 48 kB | `id` | 0 | 1 | 0 | 1 | 0 | **Correct** |
| 6 | `role_permissions` | Role-permission junction (seeded). | 53 | 40 kB | `role_id,permission_id` | 2 | 0 | 0 | 1 | 0 | **Correct** |
| 7 | `barangays` | Official barangay master list with coordinates/population. | 31 | 96 kB | `id` | 0 | 1 | 3 | 2 | 1 | **Correct** |
| 8 | `user_sessions` | Staff/admin sessions (hash-stored). | 0 | 32 kB | `token_hash` | 1 | 0 | 1 | 2 | 0 | **Correct** |
| 9 | `reports` | Outage/service reports from residents (normalized). | 0 | 144 kB | `id` | 4 | 1 | 5 | 7 | 1 | **Correct** |
| 10 | `report_evidence` | Attachments/images linked to reports. | 0 | 80 kB | `id` | 2 | 1 | 0 | 3 | 0 | **Correct** |
| 11 | `report_verifications` | Verification actions/history on reports. | 0 | 80 kB | `id` | 2 | 1 | 0 | 3 | 0 | **Correct** |
| 12 | `report_status_history` | Status transitions for reports. | 0 | 64 kB | `id` | 2 | 0 | 0 | 2 | 0 | **Correct** |
| 13 | `report_comments` | Comments on reports. | 0 | 64 kB | `id` | 2 | 0 | 0 | 2 | 0 | **Correct** |
| 14 | `incidents` | Consolidated incidents created from reports. | 0 | 160 kB | `id` | 4 | 1 | 7 | 8 | 1 | **Correct** |
| 15 | `incident_reports` | Junction linking reports to incidents (allows multi-link). | 0 | 56 kB | `incident_id,report_id` | 3 | 0 | 0 | 2 | 0 | **Correct** |
| 16 | `incident_assignments` | Normalized dispatch assignments linked to repair_assignments. | 0 | 176 kB | `id` | 7 | 1 | 2 | 10 | 1 | **Correct** |
| 17 | `incident_affected_areas` | Barangays affected by an incident. | 0 | 64 kB | `id` | 2 | 1 | 0 | 2 | 0 | **Correct** |
| 18 | `outage_updates` | Timeline updates for incidents/reports/assignments. | 0 | 112 kB | `id` | 4 | 1 | 2 | 5 | 0 | **Correct** |
| 19 | `scheduled_outages` | Planned interruptions. | 0 | 56 kB | `id` | 2 | 1 | 1 | 5 | 1 | **Correct** |
| 20 | `announcements` | Public/system announcements. | 0 | 32 kB | `id` | 1 | 0 | 1 | 2 | 0 | **Needs Improvement** |
| 21 | `notifications` | In-app notifications per user. | 0 | 56 kB | `id` | 1 | 0 | 0 | 2 | 0 | **Correct** |
| 22 | `notification_preferences` | Per-user notification channel preferences. | 0 | 48 kB | `id` | 1 | 1 | 0 | 1 | 1 | **Correct** |
| 23 | `feedback` | Citizen feedback on incidents/resolution. | 0 | 104 kB | `id` | 4 | 0 | 1 | 5 | 0 | **Correct** |
| 24 | `audit_logs` | System audit trail (polymorphic entity_type/entity_id). | 0 | 72 kB | `id` | 1 | 0 | 0 | 3 | 0 | **Needs Improvement** |
| 25 | `oauth_accounts` | OAuth identity links. | 0 | 24 kB | `provider,provider_user_id` | 1 | 0 | 0 | 1 | 0 | **Correct** |
| 26 | `oauth_states` | OAuth flow state (short-lived). | 0 | 24 kB | `state_hash` | 0 | 0 | 0 | 1 | 0 | **Correct** |
| 27 | `password_reset_tokens` | Password reset tokens (hash). | 0 | 32 kB | `token_hash` | 1 | 0 | 1 | 2 | 0 | **Correct** |
| 28 | `settings` | Application configuration (JSON values). | 7 | 32 kB | `key` | 0 | 0 | 1 | 0 | 1 | **Correct** |
| 29 | `sms_logs` | SMS delivery log. | 0 | 24 kB | `id` | 0 | 0 | 0 | 1 | 0 | **Needs Improvement** |
| 30 | `repair_teams` | Repair crews/teams with live location. | 0 | 32 kB | `id` | 1 | 1 | 2 | 2 | 0 | **Correct** |
| 31 | `repair_assignments` | Field dispatches (live runtime model). | 0 | 80 kB | `id` | 5 | 1 | 2 | 8 | 1 | **Correct** |
| 32 | `repair_assignment_evidence` | Evidence attached to repair assignments. | 0 | 32 kB | `id` | 2 | 0 | 0 | 2 | 0 | **Correct** |
| 33 | `repair_assignment_location_confirmations` | Location confirmations during dispatch. | 0 | 24 kB | `assignment_id` | 2 | 0 | 0 | 1 | 0 | **Correct** |
| 34 | `staff_team_members` | Staff-team junction. | 0 | 24 kB | `user_id,team_id` | 3 | 0 | 0 | 2 | 0 | **Correct** |
| 35 | `staff_barangay_assignments` | Staff-barangay jurisdiction junction. | 0 | 24 kB | `user_id,barangay_id` | 3 | 0 | 0 | 2 | 0 | **Correct** |

---

## 4) Table-by-Table Audit (structure, keys, constraints, indexes)

### users

**Purpose:** Staff/admin identity and auth; mirrors primary role to user_roles via trigger.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 144 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `legacy_resident_uuid` | `uuid` | YES | `-` |
| 3 | `email` | `text` | NO | `-` |
| 4 | `username` | `text` | YES | `-` |
| 5 | `password_hash` | `text` | NO | `-` |
| 6 | `account_status` | `text` | NO | `'Active'::text` |
| 7 | `role` | `text` | NO | `'resident'::text` |
| 8 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |
| 9 | `updated_at` | `timestamp with time zone(6)` | NO | `now()` |
| 10 | `last_login` | `timestamp with time zone(6)` | YES | `-` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `users_legacy_resident_uuid_fkey`: `FOREIGN KEY (legacy_resident_uuid) REFERENCES resident_accounts(id) ON DELETE SET NULL`
- **Unique constraints:**
  - `users_email_key`: UNIQUE (email)
  - `users_legacy_resident_uuid_key`: UNIQUE (legacy_resident_uuid)
  - `users_username_key`: UNIQUE (username)
- **CHECK constraints:**
  - `users_account_status_check`: `CHECK ((account_status = ANY (ARRAY['Active'::text, 'Inactive'::text, 'Suspended'::text])))`
  - `users_role_check`: `CHECK ((role = ANY (ARRAY['resident'::text, 'personnel'::text, 'utility'::text, 'administrator'::text])))`

#### Indexes

  - `users_email_key`: `CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)`
  - `users_email_lower_uidx`: `CREATE UNIQUE INDEX users_email_lower_uidx ON public.users USING btree (lower(email))`
  - `users_legacy_resident_uuid_key`: `CREATE UNIQUE INDEX users_legacy_resident_uuid_key ON public.users USING btree (legacy_resident_uuid)`
  - `users_pkey`: `CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)`
  - `users_role_idx`: `CREATE INDEX users_role_idx ON public.users USING btree (role)`
  - `users_status_idx`: `CREATE INDEX users_status_idx ON public.users USING btree (account_status)`
  - `users_username_key`: `CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username)`
  - `users_username_lower_uidx`: `CREATE UNIQUE INDEX users_username_lower_uidx ON public.users USING btree (lower(username)) WHERE (username IS NOT NULL)`

#### Triggers

  - `users_sync_primary_role`: `CREATE TRIGGER users_sync_primary_role AFTER INSERT OR UPDATE OF role ON public.users FOR EACH ROW EXECUTE FUNCTION powerwatch_sync_primary_role()`
  - `users_touch_updated_at`: `CREATE TRIGGER users_touch_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION powerwatch_touch_updated_at()`

#### Required / Optional

- **Required (NOT NULL):** `id`, `email`, `password_hash`, `account_status`, `role`, `created_at`, `updated_at`
- **Optional (NULL):** `legacy_resident_uuid`, `username`, `last_login`

---

### user_profiles

**Purpose:** Extended staff/admin profile details (1:1 with users).  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 48 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `user_id` | `bigint` | NO | `-` |
| 2 | `full_name` | `text` | NO | `-` |
| 3 | `contact_number` | `text` | YES | `-` |
| 4 | `address` | `text` | YES | `-` |
| 5 | `barangay_id` | `bigint` | YES | `-` |
| 6 | `purok` | `text` | YES | `-` |
| 7 | `profile_photo_path` | `text` | YES | `-` |
| 8 | `preferred_language` | `text` | NO | `'en'::text` |
| 9 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |
| 10 | `updated_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`user_id`)
- **Foreign Keys:**
  - `user_profiles_barangay_id_fkey`: `FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE SET NULL`
  - `user_profiles_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `user_profiles_barangay_idx`: `CREATE INDEX user_profiles_barangay_idx ON public.user_profiles USING btree (barangay_id)`
  - `user_profiles_pkey`: `CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (user_id)`

#### Triggers

  - `user_profiles_touch_updated_at`: `CREATE TRIGGER user_profiles_touch_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION powerwatch_touch_updated_at()`

#### Required / Optional

- **Required (NOT NULL):** `user_id`, `full_name`, `preferred_language`, `created_at`, `updated_at`
- **Optional (NULL):** `contact_number`, `address`, `barangay_id`, `purok`, `profile_photo_path`

---

### roles

**Purpose:** RBAC role definitions (seeded).  
**Status:** **Correct**  
**Rows:** 4 | **Size:** 48 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `role_name` | `text` | NO | `-` |
| 3 | `description` | `text` | YES | `-` |
| 4 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:** none
- **Unique constraints:**
  - `roles_role_name_key`: UNIQUE (role_name)
- **CHECK constraints:** none

#### Indexes

  - `roles_pkey`: `CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id)`
  - `roles_role_name_key`: `CREATE UNIQUE INDEX roles_role_name_key ON public.roles USING btree (role_name)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `role_name`, `created_at`
- **Optional (NULL):** `description`

---

### user_roles

**Purpose:** User-role junction for RBAC (trigger-maintained primary role).  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 56 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `user_id` | `bigint` | NO | `-` |
| 2 | `role_id` | `bigint` | NO | `-` |
| 3 | `assigned_by` | `bigint` | YES | `-` |
| 4 | `assigned_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`user_id`, `role_id`)
- **Foreign Keys:**
  - `user_roles_assigned_by_fkey`: `FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL`
  - `user_roles_role_id_fkey`: `FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE`
  - `user_roles_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `user_roles_assigned_by_idx`: `CREATE INDEX user_roles_assigned_by_idx ON public.user_roles USING btree (assigned_by)`
  - `user_roles_pkey`: `CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (user_id, role_id)`
  - `user_roles_role_idx`: `CREATE INDEX user_roles_role_idx ON public.user_roles USING btree (role_id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `user_id`, `role_id`, `assigned_at`
- **Optional (NULL):** `assigned_by`

---

### permissions

**Purpose:** Permission catalog (seeded).  
**Status:** **Correct**  
**Rows:** 24 | **Size:** 48 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `permission_name` | `text` | NO | `-` |
| 3 | `description` | `text` | YES | `-` |
| 4 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:** none
- **Unique constraints:**
  - `permissions_permission_name_key`: UNIQUE (permission_name)
- **CHECK constraints:** none

#### Indexes

  - `permissions_permission_name_key`: `CREATE UNIQUE INDEX permissions_permission_name_key ON public.permissions USING btree (permission_name)`
  - `permissions_pkey`: `CREATE UNIQUE INDEX permissions_pkey ON public.permissions USING btree (id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `permission_name`, `created_at`
- **Optional (NULL):** `description`

---

### role_permissions

**Purpose:** Role-permission junction (seeded).  
**Status:** **Correct**  
**Rows:** 53 | **Size:** 40 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `role_id` | `bigint` | NO | `-` |
| 2 | `permission_id` | `bigint` | NO | `-` |

#### Keys & Relationships

- **Primary Key:** (`role_id`, `permission_id`)
- **Foreign Keys:**
  - `role_permissions_permission_id_fkey`: `FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE`
  - `role_permissions_role_id_fkey`: `FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE`
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `role_permissions_permission_idx`: `CREATE INDEX role_permissions_permission_idx ON public.role_permissions USING btree (permission_id)`
  - `role_permissions_pkey`: `CREATE UNIQUE INDEX role_permissions_pkey ON public.role_permissions USING btree (role_id, permission_id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `role_id`, `permission_id`
- **Optional (NULL):** -

---

### barangays

**Purpose:** Official barangay master list with coordinates/population.  
**Status:** **Correct**  
**Rows:** 31 | **Size:** 96 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `barangay_name` | `text` | NO | `-` |
| 3 | `area_description` | `text` | YES | `-` |
| 4 | `population` | `integer` | YES | `-` |
| 5 | `latitude` | `double precision` | YES | `-` |
| 6 | `longitude` | `double precision` | YES | `-` |
| 7 | `status` | `text` | NO | `'Active'::text` |
| 8 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |
| 9 | `updated_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:** none
- **Unique constraints:**
  - `barangays_barangay_name_key`: UNIQUE (barangay_name)
- **CHECK constraints:**
  - `barangays_coordinates_check`: `CHECK ((((latitude IS NULL) = (longitude IS NULL)) AND ((latitude IS NULL) OR (((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)) AND ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision))))))`
  - `barangays_population_check`: `CHECK (((population IS NULL) OR (population >= 0)))`
  - `barangays_status_check`: `CHECK ((status = ANY (ARRAY['Active'::text, 'Inactive'::text, 'Archived'::text])))`

#### Indexes

  - `barangays_barangay_name_key`: `CREATE UNIQUE INDEX barangays_barangay_name_key ON public.barangays USING btree (barangay_name)`
  - `barangays_name_lower_uidx`: `CREATE UNIQUE INDEX barangays_name_lower_uidx ON public.barangays USING btree (lower(barangay_name))`
  - `barangays_pkey`: `CREATE UNIQUE INDEX barangays_pkey ON public.barangays USING btree (id)`

#### Triggers

  - `barangays_touch_updated_at`: `CREATE TRIGGER barangays_touch_updated_at BEFORE UPDATE ON public.barangays FOR EACH ROW EXECUTE FUNCTION powerwatch_touch_updated_at()`

#### Required / Optional

- **Required (NOT NULL):** `id`, `barangay_name`, `status`, `created_at`, `updated_at`
- **Optional (NULL):** `area_description`, `population`, `latitude`, `longitude`

---

### user_sessions

**Purpose:** Staff/admin sessions (hash-stored).  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 32 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `token_hash` | `text` | NO | `-` |
| 2 | `user_id` | `bigint` | NO | `-` |
| 3 | `session_type` | `text` | NO | `'web'::text` |
| 4 | `source` | `text` | YES | `-` |
| 5 | `created_at` | `timestamp with time zone(6)` | NO | `-` |
| 6 | `expires_at` | `timestamp with time zone(6)` | NO | `-` |

#### Keys & Relationships

- **Primary Key:** (`token_hash`)
- **Foreign Keys:**
  - `user_sessions_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- **Unique constraints:** none
- **CHECK constraints:**
  - `user_sessions_token_hash_check`: `CHECK ((token_hash ~* '^[0-9a-f]{64}$'::text))`

#### Indexes

  - `user_sessions_expiry_idx`: `CREATE INDEX user_sessions_expiry_idx ON public.user_sessions USING btree (expires_at)`
  - `user_sessions_pkey`: `CREATE UNIQUE INDEX user_sessions_pkey ON public.user_sessions USING btree (token_hash)`
  - `user_sessions_user_idx`: `CREATE INDEX user_sessions_user_idx ON public.user_sessions USING btree (user_id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `token_hash`, `user_id`, `session_type`, `created_at`, `expires_at`
- **Optional (NULL):** `source`

---

### reports

**Purpose:** Outage/service reports from residents (normalized).  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 144 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `report_code` | `text` | NO | `-` |
| 3 | `reporter_id` | `bigint` | NO | `-` |
| 4 | `barangay_id` | `bigint` | YES | `-` |
| 5 | `barangay_name` | `text` | NO | `-` |
| 6 | `location` | `text` | YES | `-` |
| 7 | `purok` | `text` | YES | `-` |
| 8 | `latitude` | `double precision` | YES | `-` |
| 9 | `longitude` | `double precision` | YES | `-` |
| 10 | `location_confirmed` | `boolean` | NO | `false` |
| 11 | `location_source` | `text` | YES | `-` |
| 12 | `location_accuracy_m` | `double precision` | YES | `-` |
| 13 | `date_time_noticed` | `timestamp with time zone(6)` | YES | `-` |
| 14 | `description` | `text` | YES | `-` |
| 15 | `affected_area` | `text` | YES | `-` |
| 16 | `report_type` | `text` | YES | `-` |
| 17 | `photo_path` | `text` | YES | `-` |
| 18 | `remarks` | `text` | YES | `-` |
| 19 | `status` | `text` | NO | `'Submitted'::text` |
| 20 | `verification_status` | `text` | NO | `'Pending'::text` |
| 21 | `staff_remarks` | `text` | YES | `-` |
| 22 | `incident_id` | `bigint` | YES | `-` |
| 23 | `assigned_team_id` | `bigint` | YES | `-` |
| 24 | `assigned_team_name` | `text` | YES | `-` |
| 25 | `repair_status` | `text` | YES | `'Pending Assignment'::text` |
| 26 | `estimated_restoration` | `timestamp with time zone(6)` | YES | `-` |
| 27 | `estimated_restoration_text` | `text` | YES | `-` |
| 28 | `priority` | `text` | YES | `-` |
| 29 | `reported_at` | `timestamp with time zone(6)` | NO | `-` |
| 30 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |
| 31 | `updated_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `reports_assigned_team_id_fkey`: `FOREIGN KEY (assigned_team_id) REFERENCES repair_teams(id) ON DELETE SET NULL`
  - `reports_barangay_id_fkey`: `FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE SET NULL`
  - `reports_incident_id_fkey`: `FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL`
  - `reports_reporter_id_fkey`: `FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE RESTRICT`
- **Unique constraints:**
  - `reports_report_code_key`: UNIQUE (report_code)
- **CHECK constraints:**
  - `reports_coordinates_check`: `CHECK ((((latitude IS NULL) = (longitude IS NULL)) AND ((latitude IS NULL) OR (((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)) AND ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision))))))`
  - `reports_priority_check`: `CHECK ((priority = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text, 'Critical'::text])))`
  - `reports_repair_status_check`: `CHECK ((repair_status = ANY (ARRAY['Pending Assignment'::text, 'Dispatched'::text, 'En Route'::text, 'Arrived On Site'::text, 'In Progress'::text, 'Completed'::text, 'Resolved'::text, 'Cancelled'::text])))`
  - `reports_status_check`: `CHECK ((status = ANY (ARRAY['Submitted'::text, 'Under Review'::text, 'Verified'::text, 'Officially Confirmed'::text, 'Assigned'::text, 'Acknowledged'::text, 'In Progress'::text, 'Resolved'::text, 'Closed'::text, 'Unverified'::text, 'Duplicate'::text, 'Rejected'::text])))`
  - `reports_verification_status_check`: `CHECK ((verification_status = ANY (ARRAY['Pending'::text, 'Pending Verification'::text, 'Under Review'::text, 'Verified'::text, 'Officially Confirmed'::text, 'Unverified'::text, 'Duplicate'::text, 'Rejected'::text])))`

#### Indexes

  - `reports_assigned_team_idx`: `CREATE INDEX reports_assigned_team_idx ON public.reports USING btree (assigned_team_id)`
  - `reports_barangay_idx`: `CREATE INDEX reports_barangay_idx ON public.reports USING btree (barangay_id, reported_at DESC)`
  - `reports_incident_idx`: `CREATE INDEX reports_incident_idx ON public.reports USING btree (incident_id)`
  - `reports_pkey`: `CREATE UNIQUE INDEX reports_pkey ON public.reports USING btree (id)`
  - `reports_report_code_key`: `CREATE UNIQUE INDEX reports_report_code_key ON public.reports USING btree (report_code)`
  - `reports_reported_at_idx`: `CREATE INDEX reports_reported_at_idx ON public.reports USING btree (reported_at DESC)`
  - `reports_reporter_idx`: `CREATE INDEX reports_reporter_idx ON public.reports USING btree (reporter_id, reported_at DESC)`
  - `reports_status_idx`: `CREATE INDEX reports_status_idx ON public.reports USING btree (status, reported_at DESC)`

#### Triggers

  - `reports_touch_updated_at`: `CREATE TRIGGER reports_touch_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION powerwatch_touch_updated_at()`

#### Required / Optional

- **Required (NOT NULL):** `id`, `report_code`, `reporter_id`, `barangay_name`, `location_confirmed`, `status`, `verification_status`, `reported_at`, `created_at`, `updated_at`
- **Optional (NULL):** `barangay_id`, `location`, `purok`, `latitude`, `longitude`, `location_source`, `location_accuracy_m`, `date_time_noticed`, `description`, `affected_area`, `report_type`, `photo_path`, `remarks`, `staff_remarks`, `incident_id`, `assigned_team_id`, `assigned_team_name`, `repair_status`, `estimated_restoration`, `estimated_restoration_text`, `priority`

---

### report_evidence

**Purpose:** Attachments/images linked to reports.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 80 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `legacy_key` | `text` | YES | `-` |
| 3 | `report_id` | `bigint` | NO | `-` |
| 4 | `file_url` | `text` | NO | `-` |
| 5 | `file_type` | `text` | YES | `-` |
| 6 | `original_name` | `text` | YES | `-` |
| 7 | `file_size` | `bigint` | YES | `-` |
| 8 | `uploaded_by` | `bigint` | YES | `-` |
| 9 | `uploaded_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `report_evidence_report_id_fkey`: `FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE`
  - `report_evidence_uploaded_by_fkey`: `FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL`
- **Unique constraints:**
  - `report_evidence_legacy_key_key`: UNIQUE (legacy_key)
- **CHECK constraints:** none

#### Indexes

  - `report_evidence_legacy_key_key`: `CREATE UNIQUE INDEX report_evidence_legacy_key_key ON public.report_evidence USING btree (legacy_key)`
  - `report_evidence_pkey`: `CREATE UNIQUE INDEX report_evidence_pkey ON public.report_evidence USING btree (id)`
  - `report_evidence_report_idx`: `CREATE INDEX report_evidence_report_idx ON public.report_evidence USING btree (report_id, id)`
  - `report_evidence_uploaded_by_idx`: `CREATE INDEX report_evidence_uploaded_by_idx ON public.report_evidence USING btree (uploaded_by)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `report_id`, `file_url`, `uploaded_at`
- **Optional (NULL):** `legacy_key`, `file_type`, `original_name`, `file_size`, `uploaded_by`

---

### report_verifications

**Purpose:** Verification actions/history on reports.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 80 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `legacy_key` | `text` | YES | `-` |
| 3 | `report_id` | `bigint` | NO | `-` |
| 4 | `reviewer_id` | `bigint` | YES | `-` |
| 5 | `decision` | `text` | NO | `-` |
| 6 | `remarks` | `text` | YES | `-` |
| 7 | `reviewed_at` | `timestamp with time zone(6)` | NO | `now()` |
| 8 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `report_verifications_report_id_fkey`: `FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE`
  - `report_verifications_reviewer_id_fkey`: `FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL`
- **Unique constraints:**
  - `report_verifications_legacy_key_key`: UNIQUE (legacy_key)
- **CHECK constraints:** none

#### Indexes

  - `report_verifications_legacy_key_key`: `CREATE UNIQUE INDEX report_verifications_legacy_key_key ON public.report_verifications USING btree (legacy_key)`
  - `report_verifications_pkey`: `CREATE UNIQUE INDEX report_verifications_pkey ON public.report_verifications USING btree (id)`
  - `report_verifications_report_idx`: `CREATE INDEX report_verifications_report_idx ON public.report_verifications USING btree (report_id, reviewed_at DESC)`
  - `report_verifications_reviewer_idx`: `CREATE INDEX report_verifications_reviewer_idx ON public.report_verifications USING btree (reviewer_id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `report_id`, `decision`, `reviewed_at`, `created_at`
- **Optional (NULL):** `legacy_key`, `reviewer_id`, `remarks`

---

### report_status_history

**Purpose:** Status transitions for reports.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 64 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `report_id` | `bigint` | NO | `-` |
| 3 | `event_type` | `text` | NO | `-` |
| 4 | `title` | `text` | NO | `-` |
| 5 | `details` | `text` | YES | `-` |
| 6 | `old_status` | `text` | YES | `-` |
| 7 | `new_status` | `text` | YES | `-` |
| 8 | `changed_by` | `bigint` | YES | `-` |
| 9 | `actor_name` | `text` | YES | `-` |
| 10 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `report_status_history_changed_by_fkey`: `FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL`
  - `report_status_history_report_id_fkey`: `FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE`
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `report_status_history_changed_by_idx`: `CREATE INDEX report_status_history_changed_by_idx ON public.report_status_history USING btree (changed_by)`
  - `report_status_history_pkey`: `CREATE UNIQUE INDEX report_status_history_pkey ON public.report_status_history USING btree (id)`
  - `report_status_history_report_idx`: `CREATE INDEX report_status_history_report_idx ON public.report_status_history USING btree (report_id, created_at, id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `report_id`, `event_type`, `title`, `created_at`
- **Optional (NULL):** `details`, `old_status`, `new_status`, `changed_by`, `actor_name`

---

### report_comments

**Purpose:** Comments on reports.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 64 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `report_id` | `bigint` | NO | `-` |
| 3 | `user_id` | `bigint` | YES | `-` |
| 4 | `comment` | `text` | NO | `-` |
| 5 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `report_comments_report_id_fkey`: `FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE`
  - `report_comments_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `report_comments_pkey`: `CREATE UNIQUE INDEX report_comments_pkey ON public.report_comments USING btree (id)`
  - `report_comments_report_idx`: `CREATE INDEX report_comments_report_idx ON public.report_comments USING btree (report_id, created_at)`
  - `report_comments_user_idx`: `CREATE INDEX report_comments_user_idx ON public.report_comments USING btree (user_id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `report_id`, `comment`, `created_at`
- **Optional (NULL):** `user_id`

---

### incidents

**Purpose:** Consolidated incidents created from reports.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 160 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `incident_code` | `text` | NO | `-` |
| 3 | `title` | `text` | NO | `-` |
| 4 | `incident_type` | `text` | NO | `'Unexpected'::text` |
| 5 | `status` | `text` | NO | `'Reported'::text` |
| 6 | `start_time` | `timestamp with time zone(6)` | YES | `-` |
| 7 | `restored_at` | `timestamp with time zone(6)` | YES | `-` |
| 8 | `estimated_restoration` | `timestamp with time zone(6)` | YES | `-` |
| 9 | `estimated_restoration_text` | `text` | YES | `-` |
| 10 | `etr_reason` | `text` | YES | `-` |
| 11 | `barangay_id` | `bigint` | YES | `-` |
| 12 | `barangay_name` | `text` | YES | `-` |
| 13 | `location` | `text` | YES | `-` |
| 14 | `purok` | `text` | YES | `-` |
| 15 | `latitude` | `double precision` | YES | `-` |
| 16 | `longitude` | `double precision` | YES | `-` |
| 17 | `priority` | `text` | NO | `'Medium'::text` |
| 18 | `customers_affected` | `integer` | YES | `-` |
| 19 | `restoration_progress` | `integer` | YES | `-` |
| 20 | `description` | `text` | YES | `-` |
| 21 | `cause_category` | `text` | YES | `-` |
| 22 | `affected_area` | `text` | YES | `-` |
| 23 | `remarks` | `text` | YES | `-` |
| 24 | `scheduled_id` | `bigint` | YES | `-` |
| 25 | `assigned_team_id` | `bigint` | YES | `-` |
| 26 | `assigned_team_name` | `text` | YES | `-` |
| 27 | `repair_status` | `text` | YES | `'Pending Assignment'::text` |
| 28 | `created_by` | `bigint` | YES | `-` |
| 29 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |
| 30 | `updated_at` | `timestamp with time zone(6)` | NO | `now()` |
| 31 | `closed_at` | `timestamp with time zone(6)` | YES | `-` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `incidents_assigned_team_id_fkey`: `FOREIGN KEY (assigned_team_id) REFERENCES repair_teams(id) ON DELETE SET NULL`
  - `incidents_barangay_id_fkey`: `FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE SET NULL`
  - `incidents_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
  - `incidents_scheduled_id_fkey`: `FOREIGN KEY (scheduled_id) REFERENCES scheduled_outages(id) ON DELETE SET NULL`
- **Unique constraints:**
  - `incidents_incident_code_key`: UNIQUE (incident_code)
- **CHECK constraints:**
  - `incidents_coordinates_check`: `CHECK ((((latitude IS NULL) = (longitude IS NULL)) AND ((latitude IS NULL) OR (((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)) AND ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision))))))`
  - `incidents_customers_affected_check`: `CHECK ((customers_affected >= 0))`
  - `incidents_priority_check`: `CHECK ((priority = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text, 'Critical'::text])))`
  - `incidents_repair_status_check`: `CHECK ((repair_status = ANY (ARRAY['Pending Assignment'::text, 'Dispatched'::text, 'En Route'::text, 'Arrived On Site'::text, 'In Progress'::text, 'Completed'::text, 'Resolved'::text, 'Cancelled'::text])))`
  - `incidents_restoration_progress_check`: `CHECK (((restoration_progress >= 0) AND (restoration_progress <= 100)))`
  - `incidents_status_check`: `CHECK ((status = ANY (ARRAY['Reported'::text, 'Under Verification'::text, 'Verified'::text, 'Ongoing'::text, 'Restoration in Progress'::text, 'Restored'::text, 'Resolved'::text, 'Closed'::text])))`
  - `incidents_type_check`: `CHECK ((incident_type = ANY (ARRAY['Unexpected'::text, 'Scheduled'::text])))`

#### Indexes

  - `incidents_assigned_team_idx`: `CREATE INDEX incidents_assigned_team_idx ON public.incidents USING btree (assigned_team_id)`
  - `incidents_barangay_idx`: `CREATE INDEX incidents_barangay_idx ON public.incidents USING btree (barangay_id)`
  - `incidents_closed_idx`: `CREATE INDEX incidents_closed_idx ON public.incidents USING btree (closed_at DESC)`
  - `incidents_created_by_idx`: `CREATE INDEX incidents_created_by_idx ON public.incidents USING btree (created_by)`
  - `incidents_incident_code_key`: `CREATE UNIQUE INDEX incidents_incident_code_key ON public.incidents USING btree (incident_code)`
  - `incidents_pkey`: `CREATE UNIQUE INDEX incidents_pkey ON public.incidents USING btree (id)`
  - `incidents_scheduled_idx`: `CREATE INDEX incidents_scheduled_idx ON public.incidents USING btree (scheduled_id)`
  - `incidents_start_time_idx`: `CREATE INDEX incidents_start_time_idx ON public.incidents USING btree (start_time DESC)`
  - `incidents_status_idx`: `CREATE INDEX incidents_status_idx ON public.incidents USING btree (status, start_time DESC)`

#### Triggers

  - `incidents_touch_updated_at`: `CREATE TRIGGER incidents_touch_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION powerwatch_touch_updated_at()`

#### Required / Optional

- **Required (NOT NULL):** `id`, `incident_code`, `title`, `incident_type`, `status`, `priority`, `created_at`, `updated_at`
- **Optional (NULL):** `start_time`, `restored_at`, `estimated_restoration`, `estimated_restoration_text`, `etr_reason`, `barangay_id`, `barangay_name`, `location`, `purok`, `latitude`, `longitude`, `customers_affected`, `restoration_progress`, `description`, `cause_category`, `affected_area`, `remarks`, `scheduled_id`, `assigned_team_id`, `assigned_team_name`, `repair_status`, `created_by`, `closed_at`

---

### incident_reports

**Purpose:** Junction linking reports to incidents (allows multi-link).  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 56 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `incident_id` | `bigint` | NO | `-` |
| 2 | `report_id` | `bigint` | NO | `-` |
| 3 | `linked_by` | `bigint` | YES | `-` |
| 4 | `linked_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`incident_id`, `report_id`)
- **Foreign Keys:**
  - `incident_reports_incident_id_fkey`: `FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE`
  - `incident_reports_linked_by_fkey`: `FOREIGN KEY (linked_by) REFERENCES users(id) ON DELETE SET NULL`
  - `incident_reports_report_id_fkey`: `FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE`
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `incident_reports_linked_by_idx`: `CREATE INDEX incident_reports_linked_by_idx ON public.incident_reports USING btree (linked_by)`
  - `incident_reports_pkey`: `CREATE UNIQUE INDEX incident_reports_pkey ON public.incident_reports USING btree (incident_id, report_id)`
  - `incident_reports_report_idx`: `CREATE INDEX incident_reports_report_idx ON public.incident_reports USING btree (report_id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `incident_id`, `report_id`, `linked_at`
- **Optional (NULL):** `linked_by`

---

### incident_assignments

**Purpose:** Normalized dispatch assignments linked to repair_assignments.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 176 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `legacy_key` | `text` | YES | `-` |
| 3 | `incident_id` | `bigint` | YES | `-` |
| 4 | `report_id` | `bigint` | YES | `-` |
| 5 | `staff_id` | `bigint` | YES | `-` |
| 6 | `team_id` | `bigint` | YES | `-` |
| 7 | `repair_assignment_id` | `bigint` | YES | `-` |
| 8 | `assigned_by` | `bigint` | YES | `-` |
| 9 | `assignment_code` | `text` | YES | `-` |
| 10 | `status` | `text` | NO | `'Dispatched'::text` |
| 11 | `priority` | `text` | YES | `-` |
| 12 | `target_barangay_id` | `bigint` | YES | `-` |
| 13 | `target_barangay_name` | `text` | YES | `-` |
| 14 | `target_purok` | `text` | YES | `-` |
| 15 | `target_location` | `text` | YES | `-` |
| 16 | `target_latitude` | `double precision` | YES | `-` |
| 17 | `target_longitude` | `double precision` | YES | `-` |
| 18 | `dispatch_notes` | `text` | YES | `-` |
| 19 | `crew_report` | `text` | YES | `-` |
| 20 | `resolution_remarks` | `text` | YES | `-` |
| 21 | `assigned_at` | `timestamp with time zone(6)` | NO | `now()` |
| 22 | `arrived_at` | `timestamp with time zone(6)` | YES | `-` |
| 23 | `completed_at` | `timestamp with time zone(6)` | YES | `-` |
| 24 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |
| 25 | `updated_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `incident_assignments_assigned_by_fkey`: `FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL`
  - `incident_assignments_incident_id_fkey`: `FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE`
  - `incident_assignments_repair_assignment_id_fkey`: `FOREIGN KEY (repair_assignment_id) REFERENCES repair_assignments(id) ON DELETE SET NULL`
  - `incident_assignments_report_id_fkey`: `FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL`
  - `incident_assignments_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL`
  - `incident_assignments_target_barangay_id_fkey`: `FOREIGN KEY (target_barangay_id) REFERENCES barangays(id) ON DELETE SET NULL`
  - `incident_assignments_team_id_fkey`: `FOREIGN KEY (team_id) REFERENCES repair_teams(id) ON DELETE SET NULL`
- **Unique constraints:**
  - `incident_assignments_legacy_key_key`: UNIQUE (legacy_key)
- **CHECK constraints:**
  - `incident_assignments_coordinates_check`: `CHECK ((((target_latitude IS NULL) = (target_longitude IS NULL)) AND ((target_latitude IS NULL) OR (((target_latitude >= ('-90'::integer)::double precision) AND (target_latitude <= (90)::double precision)) AND ((target_longitude >= ('-180'::integer)::double precision) AND (target_longitude <= (180)::double precision))))))`
  - `incident_assignments_status_check`: `CHECK ((status = ANY (ARRAY['Dispatched'::text, 'En Route'::text, 'Arrived On Site'::text, 'In Progress'::text, 'Completed'::text, 'Resolved'::text, 'Cancelled'::text])))`

#### Indexes

  - `incident_assignments_assigned_by_idx`: `CREATE INDEX incident_assignments_assigned_by_idx ON public.incident_assignments USING btree (assigned_by)`
  - `incident_assignments_assignment_code_uidx`: `CREATE UNIQUE INDEX incident_assignments_assignment_code_uidx ON public.incident_assignments USING btree (assignment_code) WHERE (assignment_code IS NOT NULL)`
  - `incident_assignments_incident_idx`: `CREATE INDEX incident_assignments_incident_idx ON public.incident_assignments USING btree (incident_id)`
  - `incident_assignments_legacy_key_key`: `CREATE UNIQUE INDEX incident_assignments_legacy_key_key ON public.incident_assignments USING btree (legacy_key)`
  - `incident_assignments_pkey`: `CREATE UNIQUE INDEX incident_assignments_pkey ON public.incident_assignments USING btree (id)`
  - `incident_assignments_repair_assignment_idx`: `CREATE INDEX incident_assignments_repair_assignment_idx ON public.incident_assignments USING btree (repair_assignment_id)`
  - `incident_assignments_repair_assignment_uidx`: `CREATE UNIQUE INDEX incident_assignments_repair_assignment_uidx ON public.incident_assignments USING btree (repair_assignment_id) WHERE (repair_assignment_id IS NOT NULL)`
  - `incident_assignments_report_idx`: `CREATE INDEX incident_assignments_report_idx ON public.incident_assignments USING btree (report_id)`
  - `incident_assignments_staff_idx`: `CREATE INDEX incident_assignments_staff_idx ON public.incident_assignments USING btree (staff_id)`
  - `incident_assignments_target_barangay_idx`: `CREATE INDEX incident_assignments_target_barangay_idx ON public.incident_assignments USING btree (target_barangay_id)`
  - `incident_assignments_team_idx`: `CREATE INDEX incident_assignments_team_idx ON public.incident_assignments USING btree (team_id)`

#### Triggers

  - `incident_assignments_touch_updated_at`: `CREATE TRIGGER incident_assignments_touch_updated_at BEFORE UPDATE ON public.incident_assignments FOR EACH ROW EXECUTE FUNCTION powerwatch_touch_updated_at()`

#### Required / Optional

- **Required (NOT NULL):** `id`, `status`, `assigned_at`, `created_at`, `updated_at`
- **Optional (NULL):** `legacy_key`, `incident_id`, `report_id`, `staff_id`, `team_id`, `repair_assignment_id`, `assigned_by`, `assignment_code`, `priority`, `target_barangay_id`, `target_barangay_name`, `target_purok`, `target_location`, `target_latitude`, `target_longitude`, `dispatch_notes`, `crew_report`, `resolution_remarks`, `arrived_at`, `completed_at`

---

### incident_affected_areas

**Purpose:** Barangays affected by an incident.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 64 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `incident_id` | `bigint` | NO | `-` |
| 3 | `barangay_id` | `bigint` | YES | `-` |
| 4 | `barangay_name` | `text` | NO | `-` |
| 5 | `area_description` | `text` | YES | `-` |
| 6 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `incident_affected_areas_barangay_id_fkey`: `FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE SET NULL`
  - `incident_affected_areas_incident_id_fkey`: `FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE`
- **Unique constraints:**
  - `incident_affected_areas_incident_id_barangay_name_key`: UNIQUE (incident_id, barangay_name)
- **CHECK constraints:** none

#### Indexes

  - `incident_affected_areas_barangay_idx`: `CREATE INDEX incident_affected_areas_barangay_idx ON public.incident_affected_areas USING btree (barangay_id)`
  - `incident_affected_areas_incident_id_barangay_name_key`: `CREATE UNIQUE INDEX incident_affected_areas_incident_id_barangay_name_key ON public.incident_affected_areas USING btree (incident_id, barangay_name)`
  - `incident_affected_areas_pkey`: `CREATE UNIQUE INDEX incident_affected_areas_pkey ON public.incident_affected_areas USING btree (id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `incident_id`, `barangay_name`, `created_at`
- **Optional (NULL):** `barangay_id`, `area_description`

---

### outage_updates

**Purpose:** Timeline updates for incidents/reports/assignments.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 112 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `legacy_key` | `text` | YES | `-` |
| 3 | `incident_id` | `bigint` | YES | `-` |
| 4 | `report_id` | `bigint` | YES | `-` |
| 5 | `assignment_id` | `bigint` | YES | `-` |
| 6 | `updated_by` | `bigint` | YES | `-` |
| 7 | `status` | `text` | YES | `-` |
| 8 | `stage` | `text` | YES | `-` |
| 9 | `remarks` | `text` | YES | `-` |
| 10 | `latitude` | `double precision` | YES | `-` |
| 11 | `longitude` | `double precision` | YES | `-` |
| 12 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `outage_updates_assignment_id_fkey`: `FOREIGN KEY (assignment_id) REFERENCES repair_assignments(id) ON DELETE SET NULL`
  - `outage_updates_incident_id_fkey`: `FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE`
  - `outage_updates_report_id_fkey`: `FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL`
  - `outage_updates_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`
- **Unique constraints:**
  - `outage_updates_legacy_key_key`: UNIQUE (legacy_key)
- **CHECK constraints:**
  - `outage_updates_coordinates_check`: `CHECK ((((latitude IS NULL) = (longitude IS NULL)) AND ((latitude IS NULL) OR (((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)) AND ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision))))))`
  - `outage_updates_subject_check`: `CHECK (((incident_id IS NOT NULL) OR (report_id IS NOT NULL) OR (assignment_id IS NOT NULL)))`

#### Indexes

  - `outage_updates_assignment_idx`: `CREATE INDEX outage_updates_assignment_idx ON public.outage_updates USING btree (assignment_id, created_at DESC)`
  - `outage_updates_incident_idx`: `CREATE INDEX outage_updates_incident_idx ON public.outage_updates USING btree (incident_id, created_at DESC)`
  - `outage_updates_legacy_key_key`: `CREATE UNIQUE INDEX outage_updates_legacy_key_key ON public.outage_updates USING btree (legacy_key)`
  - `outage_updates_pkey`: `CREATE UNIQUE INDEX outage_updates_pkey ON public.outage_updates USING btree (id)`
  - `outage_updates_report_idx`: `CREATE INDEX outage_updates_report_idx ON public.outage_updates USING btree (report_id, created_at DESC)`
  - `outage_updates_updated_by_idx`: `CREATE INDEX outage_updates_updated_by_idx ON public.outage_updates USING btree (updated_by)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `created_at`
- **Optional (NULL):** `legacy_key`, `incident_id`, `report_id`, `assignment_id`, `updated_by`, `status`, `stage`, `remarks`, `latitude`, `longitude`

---

### scheduled_outages

**Purpose:** Planned interruptions.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 56 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `schedule_code` | `text` | NO | `-` |
| 3 | `title` | `text` | NO | `-` |
| 4 | `barangay_id` | `bigint` | YES | `-` |
| 5 | `barangay_name` | `text` | YES | `-` |
| 6 | `area` | `text` | YES | `-` |
| 7 | `outage_date` | `date` | YES | `-` |
| 8 | `start_time` | `timestamp with time zone(6)` | YES | `-` |
| 9 | `end_time` | `timestamp with time zone(6)` | YES | `-` |
| 10 | `reason` | `text` | YES | `-` |
| 11 | `status` | `text` | NO | `'Scheduled'::text` |
| 12 | `created_by` | `bigint` | YES | `-` |
| 13 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |
| 14 | `updated_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `scheduled_outages_barangay_id_fkey`: `FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE SET NULL`
  - `scheduled_outages_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- **Unique constraints:**
  - `scheduled_outages_schedule_code_key`: UNIQUE (schedule_code)
- **CHECK constraints:**
  - `scheduled_outages_status_check`: `CHECK ((status = ANY (ARRAY['Scheduled'::text, 'In Preparation'::text, 'Being Implemented'::text, 'Completed'::text, 'Cancelled'::text])))`

#### Indexes

  - `scheduled_outages_barangay_idx`: `CREATE INDEX scheduled_outages_barangay_idx ON public.scheduled_outages USING btree (barangay_id)`
  - `scheduled_outages_created_by_idx`: `CREATE INDEX scheduled_outages_created_by_idx ON public.scheduled_outages USING btree (created_by)`
  - `scheduled_outages_date_idx`: `CREATE INDEX scheduled_outages_date_idx ON public.scheduled_outages USING btree (outage_date, start_time)`
  - `scheduled_outages_pkey`: `CREATE UNIQUE INDEX scheduled_outages_pkey ON public.scheduled_outages USING btree (id)`
  - `scheduled_outages_schedule_code_key`: `CREATE UNIQUE INDEX scheduled_outages_schedule_code_key ON public.scheduled_outages USING btree (schedule_code)`
  - `scheduled_outages_status_idx`: `CREATE INDEX scheduled_outages_status_idx ON public.scheduled_outages USING btree (status, start_time)`

#### Triggers

  - `scheduled_outages_touch_updated_at`: `CREATE TRIGGER scheduled_outages_touch_updated_at BEFORE UPDATE ON public.scheduled_outages FOR EACH ROW EXECUTE FUNCTION powerwatch_touch_updated_at()`

#### Required / Optional

- **Required (NOT NULL):** `id`, `schedule_code`, `title`, `status`, `created_at`, `updated_at`
- **Optional (NULL):** `barangay_id`, `barangay_name`, `area`, `outage_date`, `start_time`, `end_time`, `reason`, `created_by`

---

### announcements

**Purpose:** Public/system announcements.  
**Status:** **Needs Improvement**  
**Rows:** 0 | **Size:** 32 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `created_by` | `bigint` | YES | `-` |
| 3 | `title` | `text` | NO | `-` |
| 4 | `content` | `text` | NO | `-` |
| 5 | `category` | `text` | NO | `'General Information'::text` |
| 6 | `status` | `text` | NO | `'Published'::text` |
| 7 | `image_path` | `text` | YES | `-` |
| 8 | `published_at` | `timestamp with time zone(6)` | YES | `-` |
| 9 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `announcements_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- **Unique constraints:** none
- **CHECK constraints:**
  - `announcements_status_check`: `CHECK ((status = ANY (ARRAY['Published'::text, 'Draft'::text, 'Archived'::text])))`

#### Indexes

  - `announcements_created_by_idx`: `CREATE INDEX announcements_created_by_idx ON public.announcements USING btree (created_by)`
  - `announcements_pkey`: `CREATE UNIQUE INDEX announcements_pkey ON public.announcements USING btree (id)`
  - `announcements_status_idx`: `CREATE INDEX announcements_status_idx ON public.announcements USING btree (status, published_at DESC)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `title`, `content`, `category`, `status`, `created_at`
- **Optional (NULL):** `created_by`, `image_path`, `published_at`

#### Issues Identified

- **Issue:** No updated_at column (no automatic timestamp maintenance; edits not tracked).

#### Recommendations / Fixes

- Add updated_at TIMESTAMPTZ with trigger (consistent with other tables) if edit UI added.
- Consider soft delete.

---

### notifications

**Purpose:** In-app notifications per user.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 56 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `user_id` | `bigint` | NO | `-` |
| 3 | `title` | `text` | NO | `-` |
| 4 | `message` | `text` | YES | `-` |
| 5 | `type` | `text` | YES | `'general'::text` |
| 6 | `read_at` | `timestamp with time zone(6)` | YES | `-` |
| 7 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `notifications_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `notifications_pkey`: `CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id)`
  - `notifications_unread_idx`: `CREATE INDEX notifications_unread_idx ON public.notifications USING btree (user_id) WHERE (read_at IS NULL)`
  - `notifications_user_idx`: `CREATE INDEX notifications_user_idx ON public.notifications USING btree (user_id, created_at DESC)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `user_id`, `title`, `created_at`
- **Optional (NULL):** `message`, `type`, `read_at`

---

### notification_preferences

**Purpose:** Per-user notification channel preferences.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 48 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `user_id` | `bigint` | NO | `-` |
| 3 | `channel` | `text` | NO | `-` |
| 4 | `enabled` | `boolean` | NO | `true` |
| 5 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |
| 6 | `updated_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `notification_preferences_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- **Unique constraints:**
  - `notification_preferences_user_id_channel_key`: UNIQUE (user_id, channel)
- **CHECK constraints:** none

#### Indexes

  - `notification_preferences_pkey`: `CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (id)`
  - `notification_preferences_user_id_channel_key`: `CREATE UNIQUE INDEX notification_preferences_user_id_channel_key ON public.notification_preferences USING btree (user_id, channel)`

#### Triggers

  - `notification_preferences_touch_updated_at`: `CREATE TRIGGER notification_preferences_touch_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION powerwatch_touch_updated_at()`

#### Required / Optional

- **Required (NOT NULL):** `id`, `user_id`, `channel`, `enabled`, `created_at`, `updated_at`
- **Optional (NULL):** -

---

### feedback

**Purpose:** Citizen feedback on incidents/resolution.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 104 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `user_id` | `bigint` | YES | `-` |
| 3 | `report_id` | `bigint` | YES | `-` |
| 4 | `incident_id` | `bigint` | YES | `-` |
| 5 | `user_name` | `text` | YES | `-` |
| 6 | `barangay_id` | `bigint` | YES | `-` |
| 7 | `barangay_name` | `text` | YES | `-` |
| 8 | `rating` | `smallint` | NO | `-` |
| 9 | `comments` | `text` | YES | `-` |
| 10 | `restoration_confirmed` | `boolean` | NO | `true` |
| 11 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `feedback_barangay_id_fkey`: `FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE SET NULL`
  - `feedback_incident_id_fkey`: `FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL`
  - `feedback_report_id_fkey`: `FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL`
  - `feedback_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`
- **Unique constraints:** none
- **CHECK constraints:**
  - `feedback_rating_check`: `CHECK (((rating >= 1) AND (rating <= 5)))`

#### Indexes

  - `feedback_barangay_idx`: `CREATE INDEX feedback_barangay_idx ON public.feedback USING btree (barangay_id)`
  - `feedback_created_idx`: `CREATE INDEX feedback_created_idx ON public.feedback USING btree (created_at DESC)`
  - `feedback_incident_idx`: `CREATE INDEX feedback_incident_idx ON public.feedback USING btree (incident_id)`
  - `feedback_pkey`: `CREATE UNIQUE INDEX feedback_pkey ON public.feedback USING btree (id)`
  - `feedback_report_idx`: `CREATE INDEX feedback_report_idx ON public.feedback USING btree (report_id)`
  - `feedback_user_idx`: `CREATE INDEX feedback_user_idx ON public.feedback USING btree (user_id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `rating`, `restoration_confirmed`, `created_at`
- **Optional (NULL):** `user_id`, `report_id`, `incident_id`, `user_name`, `barangay_id`, `barangay_name`, `comments`

---

### audit_logs

**Purpose:** System audit trail (polymorphic entity_type/entity_id).  
**Status:** **Needs Improvement**  
**Rows:** 0 | **Size:** 72 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `actor_id` | `bigint` | YES | `-` |
| 3 | `actor_name` | `text` | YES | `-` |
| 4 | `role` | `text` | YES | `-` |
| 5 | `action` | `text` | NO | `-` |
| 6 | `entity_type` | `text` | YES | `-` |
| 7 | `entity_id` | `text` | YES | `-` |
| 8 | `detail` | `text` | YES | `-` |
| 9 | `ip_address` | `text` | YES | `-` |
| 10 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `audit_logs_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL`
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `audit_logs_action_idx`: `CREATE INDEX audit_logs_action_idx ON public.audit_logs USING btree (action, created_at DESC)`
  - `audit_logs_actor_idx`: `CREATE INDEX audit_logs_actor_idx ON public.audit_logs USING btree (actor_id, created_at DESC)`
  - `audit_logs_created_idx`: `CREATE INDEX audit_logs_created_idx ON public.audit_logs USING btree (created_at DESC)`
  - `audit_logs_pkey`: `CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `action`, `created_at`
- **Optional (NULL):** `actor_id`, `actor_name`, `role`, `entity_type`, `entity_id`, `detail`, `ip_address`

#### Issues Identified

- **Issue:** Polymorphic FKs have no referential integrity; consider entity_type constraints or archival policy.

#### Recommendations / Fixes

- Consider entity_type CHECK or enum; define retention policy; avoid logging full request bodies with PII.

---

### oauth_accounts

**Purpose:** OAuth identity links.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 24 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `provider` | `text` | NO | `-` |
| 2 | `provider_user_id` | `text` | NO | `-` |
| 3 | `user_id` | `bigint` | NO | `-` |
| 4 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`provider`, `provider_user_id`)
- **Foreign Keys:**
  - `oauth_accounts_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `oauth_accounts_pkey`: `CREATE UNIQUE INDEX oauth_accounts_pkey ON public.oauth_accounts USING btree (provider, provider_user_id)`
  - `oauth_accounts_user_idx`: `CREATE INDEX oauth_accounts_user_idx ON public.oauth_accounts USING btree (user_id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `provider`, `provider_user_id`, `user_id`, `created_at`
- **Optional (NULL):** -

---

### oauth_states

**Purpose:** OAuth flow state (short-lived).  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 24 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `state_hash` | `text` | NO | `-` |
| 2 | `provider` | `text` | NO | `-` |
| 3 | `expires_at` | `timestamp with time zone(6)` | NO | `-` |

#### Keys & Relationships

- **Primary Key:** (`state_hash`)
- **Foreign Keys:** none
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `oauth_states_expiry_idx`: `CREATE INDEX oauth_states_expiry_idx ON public.oauth_states USING btree (expires_at)`
  - `oauth_states_pkey`: `CREATE UNIQUE INDEX oauth_states_pkey ON public.oauth_states USING btree (state_hash)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `state_hash`, `provider`, `expires_at`
- **Optional (NULL):** -

---

### password_reset_tokens

**Purpose:** Password reset tokens (hash).  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 32 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `token_hash` | `text` | NO | `-` |
| 2 | `user_id` | `bigint` | NO | `-` |
| 3 | `expires_at` | `timestamp with time zone(6)` | NO | `-` |
| 4 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`token_hash`)
- **Foreign Keys:**
  - `password_reset_tokens_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- **Unique constraints:** none
- **CHECK constraints:**
  - `password_reset_tokens_token_hash_check`: `CHECK ((token_hash ~* '^[0-9a-f]{64}$'::text))`

#### Indexes

  - `password_reset_tokens_expiry_idx`: `CREATE INDEX password_reset_tokens_expiry_idx ON public.password_reset_tokens USING btree (expires_at)`
  - `password_reset_tokens_pkey`: `CREATE UNIQUE INDEX password_reset_tokens_pkey ON public.password_reset_tokens USING btree (token_hash)`
  - `password_reset_tokens_user_idx`: `CREATE INDEX password_reset_tokens_user_idx ON public.password_reset_tokens USING btree (user_id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `token_hash`, `user_id`, `expires_at`, `created_at`
- **Optional (NULL):** -

---

### settings

**Purpose:** Application configuration (JSON values).  
**Status:** **Correct**  
**Rows:** 7 | **Size:** 32 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `key` | `text` | NO | `-` |
| 2 | `value` | `text` | NO | `-` |
| 3 | `updated_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`key`)
- **Foreign Keys:** none
- **Unique constraints:** none
- **CHECK constraints:**
  - `settings_value_json_check`: `CHECK ((value IS JSON))`

#### Indexes

  - `settings_pkey`: `CREATE UNIQUE INDEX settings_pkey ON public.settings USING btree (key)`

#### Triggers

  - `settings_touch_updated_at`: `CREATE TRIGGER settings_touch_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION powerwatch_touch_updated_at()`

#### Required / Optional

- **Required (NOT NULL):** `key`, `value`, `updated_at`
- **Optional (NULL):** -

---

### sms_logs

**Purpose:** SMS delivery log.  
**Status:** **Needs Improvement**  
**Rows:** 0 | **Size:** 24 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `phone_number` | `text` | NO | `-` |
| 3 | `message` | `text` | NO | `-` |
| 4 | `status` | `text` | NO | `'Simulated'::text` |
| 5 | `event_type` | `text` | YES | `-` |
| 6 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:** none
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `sms_logs_created_idx`: `CREATE INDEX sms_logs_created_idx ON public.sms_logs USING btree (created_at DESC)`
  - `sms_logs_pkey`: `CREATE UNIQUE INDEX sms_logs_pkey ON public.sms_logs USING btree (id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `phone_number`, `message`, `status`, `created_at`
- **Optional (NULL):** `event_type`

#### Issues Identified

- **Issue:** No retention/partitioning strategy; grows unbounded; access sensitive (phone numbers).

#### Recommendations / Fixes

- Add retention job (e.g., 1 year); consider archiving; restrict access.

---

### repair_teams

**Purpose:** Repair crews/teams with live location.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 32 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `team_code` | `text` | NO | `-` |
| 3 | `name` | `text` | NO | `-` |
| 4 | `lead_technician` | `text` | NO | `-` |
| 5 | `contact_number` | `text` | YES | `-` |
| 6 | `vehicle_type` | `text` | YES | `-` |
| 7 | `base_station` | `text` | YES | `'Central Substation, Sayre Highway'::text` |
| 8 | `current_latitude` | `double precision` | YES | `7.9064` |
| 9 | `current_longitude` | `double precision` | YES | `125.0941` |
| 10 | `location_updated_at` | `timestamp with time zone(6)` | YES | `-` |
| 11 | `status` | `text` | NO | `'Available'::text` |
| 12 | `active_assignment_id` | `bigint` | YES | `-` |
| 13 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `repair_teams_active_assignment_fk`: `FOREIGN KEY (active_assignment_id) REFERENCES repair_assignments(id) ON DELETE SET NULL`
- **Unique constraints:**
  - `repair_teams_team_code_key`: UNIQUE (team_code)
- **CHECK constraints:**
  - `repair_teams_coordinates_check`: `CHECK ((((current_latitude IS NULL) = (current_longitude IS NULL)) AND ((current_latitude IS NULL) OR (((current_latitude >= ('-90'::integer)::double precision) AND (current_latitude <= (90)::double precision)) AND ((current_longitude >= ('-180'::integer)::double precision) AND (current_longitude <= (180)::double precision))))))`
  - `repair_teams_status_check`: `CHECK ((status = ANY (ARRAY['Available'::text, 'Dispatched'::text, 'On Assignment'::text, 'En Route'::text, 'Unavailable'::text, 'Maintenance'::text])))`

#### Indexes

  - `repair_teams_active_assignment_idx`: `CREATE INDEX repair_teams_active_assignment_idx ON public.repair_teams USING btree (active_assignment_id)`
  - `repair_teams_pkey`: `CREATE UNIQUE INDEX repair_teams_pkey ON public.repair_teams USING btree (id)`
  - `repair_teams_team_code_key`: `CREATE UNIQUE INDEX repair_teams_team_code_key ON public.repair_teams USING btree (team_code)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `team_code`, `name`, `lead_technician`, `status`, `created_at`
- **Optional (NULL):** `contact_number`, `vehicle_type`, `base_station`, `current_latitude`, `current_longitude`, `location_updated_at`, `active_assignment_id`

---

### repair_assignments

**Purpose:** Field dispatches (live runtime model).  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 80 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `assignment_code` | `text` | NO | `-` |
| 3 | `team_id` | `bigint` | NO | `-` |
| 4 | `report_id` | `bigint` | YES | `-` |
| 5 | `incident_id` | `bigint` | YES | `-` |
| 6 | `assigned_by` | `bigint` | NO | `-` |
| 7 | `status` | `text` | NO | `'Dispatched'::text` |
| 8 | `priority` | `text` | YES | `'High'::text` |
| 9 | `target_barangay_id` | `bigint` | YES | `-` |
| 10 | `target_barangay_name` | `text` | NO | `-` |
| 11 | `target_purok` | `text` | YES | `-` |
| 12 | `target_location` | `text` | YES | `-` |
| 13 | `target_latitude` | `double precision` | YES | `-` |
| 14 | `target_longitude` | `double precision` | YES | `-` |
| 15 | `dispatch_notes` | `text` | YES | `-` |
| 16 | `crew_report` | `text` | YES | `-` |
| 17 | `resolution_remarks` | `text` | YES | `-` |
| 18 | `dispatched_at` | `timestamp with time zone(6)` | NO | `-` |
| 19 | `arrived_at` | `timestamp with time zone(6)` | YES | `-` |
| 20 | `completed_at` | `timestamp with time zone(6)` | YES | `-` |
| 21 | `updated_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `repair_assignments_assigned_by_fkey`: `FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT`
  - `repair_assignments_incident_id_fkey`: `FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL`
  - `repair_assignments_report_id_fkey`: `FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL`
  - `repair_assignments_target_barangay_id_fkey`: `FOREIGN KEY (target_barangay_id) REFERENCES barangays(id) ON DELETE SET NULL`
  - `repair_assignments_team_id_fkey`: `FOREIGN KEY (team_id) REFERENCES repair_teams(id) ON DELETE RESTRICT`
- **Unique constraints:**
  - `repair_assignments_assignment_code_key`: UNIQUE (assignment_code)
- **CHECK constraints:**
  - `repair_assignments_coordinates_check`: `CHECK ((((target_latitude IS NULL) = (target_longitude IS NULL)) AND ((target_latitude IS NULL) OR (((target_latitude >= ('-90'::integer)::double precision) AND (target_latitude <= (90)::double precision)) AND ((target_longitude >= ('-180'::integer)::double precision) AND (target_longitude <= (180)::double precision))))))`
  - `repair_assignments_status_check`: `CHECK ((status = ANY (ARRAY['Dispatched'::text, 'En Route'::text, 'Arrived On Site'::text, 'In Progress'::text, 'Completed'::text, 'Resolved'::text, 'Cancelled'::text])))`

#### Indexes

  - `repair_assignments_assigned_by_idx`: `CREATE INDEX repair_assignments_assigned_by_idx ON public.repair_assignments USING btree (assigned_by)`
  - `repair_assignments_assignment_code_key`: `CREATE UNIQUE INDEX repair_assignments_assignment_code_key ON public.repair_assignments USING btree (assignment_code)`
  - `repair_assignments_barangay_idx`: `CREATE INDEX repair_assignments_barangay_idx ON public.repair_assignments USING btree (target_barangay_id)`
  - `repair_assignments_incident_idx`: `CREATE INDEX repair_assignments_incident_idx ON public.repair_assignments USING btree (incident_id)`
  - `repair_assignments_pkey`: `CREATE UNIQUE INDEX repair_assignments_pkey ON public.repair_assignments USING btree (id)`
  - `repair_assignments_report_idx`: `CREATE INDEX repair_assignments_report_idx ON public.repair_assignments USING btree (report_id)`
  - `repair_assignments_status_idx`: `CREATE INDEX repair_assignments_status_idx ON public.repair_assignments USING btree (status)`
  - `repair_assignments_team_idx`: `CREATE INDEX repair_assignments_team_idx ON public.repair_assignments USING btree (team_id)`
  - `repair_assignments_team_status_idx`: `CREATE INDEX repair_assignments_team_status_idx ON public.repair_assignments USING btree (team_id, status)`

#### Triggers

  - `repair_assignments_touch_updated_at`: `CREATE TRIGGER repair_assignments_touch_updated_at BEFORE UPDATE ON public.repair_assignments FOR EACH ROW EXECUTE FUNCTION powerwatch_touch_updated_at()`

#### Required / Optional

- **Required (NOT NULL):** `id`, `assignment_code`, `team_id`, `assigned_by`, `status`, `target_barangay_name`, `dispatched_at`, `updated_at`
- **Optional (NULL):** `report_id`, `incident_id`, `priority`, `target_barangay_id`, `target_purok`, `target_location`, `target_latitude`, `target_longitude`, `dispatch_notes`, `crew_report`, `resolution_remarks`, `arrived_at`, `completed_at`

---

### repair_assignment_evidence

**Purpose:** Evidence attached to repair assignments.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 32 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `id` | `bigint` | NO | `IDENTITY BY DEFAULT` |
| 2 | `assignment_id` | `bigint` | NO | `-` |
| 3 | `staff_id` | `bigint` | NO | `-` |
| 4 | `file_name` | `text` | NO | `-` |
| 5 | `mime_type` | `text` | NO | `-` |
| 6 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`id`)
- **Foreign Keys:**
  - `repair_assignment_evidence_assignment_id_fkey`: `FOREIGN KEY (assignment_id) REFERENCES repair_assignments(id) ON DELETE CASCADE`
  - `repair_assignment_evidence_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE RESTRICT`
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `repair_assignment_evidence_assignment_idx`: `CREATE INDEX repair_assignment_evidence_assignment_idx ON public.repair_assignment_evidence USING btree (assignment_id, id)`
  - `repair_assignment_evidence_pkey`: `CREATE UNIQUE INDEX repair_assignment_evidence_pkey ON public.repair_assignment_evidence USING btree (id)`
  - `repair_assignment_evidence_staff_idx`: `CREATE INDEX repair_assignment_evidence_staff_idx ON public.repair_assignment_evidence USING btree (staff_id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `id`, `assignment_id`, `staff_id`, `file_name`, `mime_type`, `created_at`
- **Optional (NULL):** -

---

### repair_assignment_location_confirmations

**Purpose:** Location confirmations during dispatch.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 24 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `assignment_id` | `bigint` | NO | `-` |
| 2 | `staff_id` | `bigint` | NO | `-` |
| 3 | `confirmed_purok` | `text` | NO | `-` |
| 4 | `confirmed_location` | `text` | NO | `-` |
| 5 | `created_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`assignment_id`)
- **Foreign Keys:**
  - `repair_assignment_location_confirmations_assignment_id_fkey`: `FOREIGN KEY (assignment_id) REFERENCES repair_assignments(id) ON DELETE CASCADE`
  - `repair_assignment_location_confirmations_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE RESTRICT`
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `repair_assignment_location_confirmations_pkey`: `CREATE UNIQUE INDEX repair_assignment_location_confirmations_pkey ON public.repair_assignment_location_confirmations USING btree (assignment_id)`
  - `repair_assignment_location_confirmations_staff_idx`: `CREATE INDEX repair_assignment_location_confirmations_staff_idx ON public.repair_assignment_location_confirmations USING btree (staff_id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `assignment_id`, `staff_id`, `confirmed_purok`, `confirmed_location`, `created_at`
- **Optional (NULL):** -

---

### staff_team_members

**Purpose:** Staff-team junction.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 24 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `user_id` | `bigint` | NO | `-` |
| 2 | `team_id` | `bigint` | NO | `-` |
| 3 | `assigned_by` | `bigint` | NO | `-` |
| 4 | `assigned_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`user_id`, `team_id`)
- **Foreign Keys:**
  - `staff_team_members_assigned_by_fkey`: `FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT`
  - `staff_team_members_team_id_fkey`: `FOREIGN KEY (team_id) REFERENCES repair_teams(id) ON DELETE CASCADE`
  - `staff_team_members_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `staff_team_members_assigned_by_idx`: `CREATE INDEX staff_team_members_assigned_by_idx ON public.staff_team_members USING btree (assigned_by)`
  - `staff_team_members_pkey`: `CREATE UNIQUE INDEX staff_team_members_pkey ON public.staff_team_members USING btree (user_id, team_id)`
  - `staff_team_members_team_idx`: `CREATE INDEX staff_team_members_team_idx ON public.staff_team_members USING btree (team_id, user_id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `user_id`, `team_id`, `assigned_by`, `assigned_at`
- **Optional (NULL):** -

---

### staff_barangay_assignments

**Purpose:** Staff-barangay jurisdiction junction.  
**Status:** **Correct**  
**Rows:** 0 | **Size:** 24 kB

#### Columns
| # | Column | Type | Nullable | Default/Identity/Generated |
|---|---|---|---|---|

| 1 | `user_id` | `bigint` | NO | `-` |
| 2 | `barangay_id` | `bigint` | NO | `-` |
| 3 | `assigned_by` | `bigint` | NO | `-` |
| 4 | `assigned_at` | `timestamp with time zone(6)` | NO | `now()` |

#### Keys & Relationships

- **Primary Key:** (`user_id`, `barangay_id`)
- **Foreign Keys:**
  - `staff_barangay_assignments_assigned_by_fkey`: `FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT`
  - `staff_barangay_assignments_barangay_id_fkey`: `FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE`
  - `staff_barangay_assignments_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- **Unique constraints:** none
- **CHECK constraints:** none

#### Indexes

  - `staff_barangay_assignments_assigned_by_idx`: `CREATE INDEX staff_barangay_assignments_assigned_by_idx ON public.staff_barangay_assignments USING btree (assigned_by)`
  - `staff_barangay_assignments_barangay_idx`: `CREATE INDEX staff_barangay_assignments_barangay_idx ON public.staff_barangay_assignments USING btree (barangay_id, user_id)`
  - `staff_barangay_assignments_pkey`: `CREATE UNIQUE INDEX staff_barangay_assignments_pkey ON public.staff_barangay_assignments USING btree (user_id, barangay_id)`

#### Triggers

- none

#### Required / Optional

- **Required (NOT NULL):** `user_id`, `barangay_id`, `assigned_by`, `assigned_at`
- **Optional (NULL):** -

---

## 5) Complete Primary-Key and Foreign-Key Relationship Inventory

All 43 tables/grants checked via catalog; 69 FKs across the 35 app tables, all validated (0 unvalidated).

| Child Table | FK Name | Child Column(s) | Parent Table | Parent Column(s) | ON UPDATE | ON DELETE | Validated |
|---|---|---|---|---|---|---|---|
| `users` | `users_legacy_resident_uuid_fkey` | `legacy_resident_uuid` | `resident_accounts` | `id` | NO ACTION | SET NULL | YES |
| `user_profiles` | `user_profiles_barangay_id_fkey` | `barangay_id` | `barangays` | `id` | NO ACTION | SET NULL | YES |
| `user_profiles` | `user_profiles_user_id_fkey` | `user_id` | `users` | `id` | NO ACTION | CASCADE | YES |
| `user_roles` | `user_roles_assigned_by_fkey` | `assigned_by` | `users` | `id` | NO ACTION | SET NULL | YES |
| `user_roles` | `user_roles_role_id_fkey` | `role_id` | `roles` | `id` | NO ACTION | CASCADE | YES |
| `user_roles` | `user_roles_user_id_fkey` | `user_id` | `users` | `id` | NO ACTION | CASCADE | YES |
| `role_permissions` | `role_permissions_permission_id_fkey` | `permission_id` | `permissions` | `id` | NO ACTION | CASCADE | YES |
| `role_permissions` | `role_permissions_role_id_fkey` | `role_id` | `roles` | `id` | NO ACTION | CASCADE | YES |
| `user_sessions` | `user_sessions_user_id_fkey` | `user_id` | `users` | `id` | NO ACTION | CASCADE | YES |
| `reports` | `reports_assigned_team_id_fkey` | `assigned_team_id` | `repair_teams` | `id` | NO ACTION | SET NULL | YES |
| `reports` | `reports_barangay_id_fkey` | `barangay_id` | `barangays` | `id` | NO ACTION | SET NULL | YES |
| `reports` | `reports_incident_id_fkey` | `incident_id` | `incidents` | `id` | NO ACTION | SET NULL | YES |
| `reports` | `reports_reporter_id_fkey` | `reporter_id` | `users` | `id` | NO ACTION | RESTRICT | YES |
| `report_evidence` | `report_evidence_report_id_fkey` | `report_id` | `reports` | `id` | NO ACTION | CASCADE | YES |
| `report_evidence` | `report_evidence_uploaded_by_fkey` | `uploaded_by` | `users` | `id` | NO ACTION | SET NULL | YES |
| `report_verifications` | `report_verifications_report_id_fkey` | `report_id` | `reports` | `id` | NO ACTION | CASCADE | YES |
| `report_verifications` | `report_verifications_reviewer_id_fkey` | `reviewer_id` | `users` | `id` | NO ACTION | SET NULL | YES |
| `report_status_history` | `report_status_history_changed_by_fkey` | `changed_by` | `users` | `id` | NO ACTION | SET NULL | YES |
| `report_status_history` | `report_status_history_report_id_fkey` | `report_id` | `reports` | `id` | NO ACTION | CASCADE | YES |
| `report_comments` | `report_comments_report_id_fkey` | `report_id` | `reports` | `id` | NO ACTION | CASCADE | YES |
| `report_comments` | `report_comments_user_id_fkey` | `user_id` | `users` | `id` | NO ACTION | SET NULL | YES |
| `incidents` | `incidents_assigned_team_id_fkey` | `assigned_team_id` | `repair_teams` | `id` | NO ACTION | SET NULL | YES |
| `incidents` | `incidents_barangay_id_fkey` | `barangay_id` | `barangays` | `id` | NO ACTION | SET NULL | YES |
| `incidents` | `incidents_created_by_fkey` | `created_by` | `users` | `id` | NO ACTION | SET NULL | YES |
| `incidents` | `incidents_scheduled_id_fkey` | `scheduled_id` | `scheduled_outages` | `id` | NO ACTION | SET NULL | YES |
| `incident_reports` | `incident_reports_incident_id_fkey` | `incident_id` | `incidents` | `id` | NO ACTION | CASCADE | YES |
| `incident_reports` | `incident_reports_linked_by_fkey` | `linked_by` | `users` | `id` | NO ACTION | SET NULL | YES |
| `incident_reports` | `incident_reports_report_id_fkey` | `report_id` | `reports` | `id` | NO ACTION | CASCADE | YES |
| `incident_assignments` | `incident_assignments_assigned_by_fkey` | `assigned_by` | `users` | `id` | NO ACTION | SET NULL | YES |
| `incident_assignments` | `incident_assignments_incident_id_fkey` | `incident_id` | `incidents` | `id` | NO ACTION | CASCADE | YES |
| `incident_assignments` | `incident_assignments_repair_assignment_id_fkey` | `repair_assignment_id` | `repair_assignments` | `id` | NO ACTION | SET NULL | YES |
| `incident_assignments` | `incident_assignments_report_id_fkey` | `report_id` | `reports` | `id` | NO ACTION | SET NULL | YES |
| `incident_assignments` | `incident_assignments_staff_id_fkey` | `staff_id` | `users` | `id` | NO ACTION | SET NULL | YES |
| `incident_assignments` | `incident_assignments_target_barangay_id_fkey` | `target_barangay_id` | `barangays` | `id` | NO ACTION | SET NULL | YES |
| `incident_assignments` | `incident_assignments_team_id_fkey` | `team_id` | `repair_teams` | `id` | NO ACTION | SET NULL | YES |
| `incident_affected_areas` | `incident_affected_areas_barangay_id_fkey` | `barangay_id` | `barangays` | `id` | NO ACTION | SET NULL | YES |
| `incident_affected_areas` | `incident_affected_areas_incident_id_fkey` | `incident_id` | `incidents` | `id` | NO ACTION | CASCADE | YES |
| `outage_updates` | `outage_updates_assignment_id_fkey` | `assignment_id` | `repair_assignments` | `id` | NO ACTION | SET NULL | YES |
| `outage_updates` | `outage_updates_incident_id_fkey` | `incident_id` | `incidents` | `id` | NO ACTION | CASCADE | YES |
| `outage_updates` | `outage_updates_report_id_fkey` | `report_id` | `reports` | `id` | NO ACTION | SET NULL | YES |
| `outage_updates` | `outage_updates_updated_by_fkey` | `updated_by` | `users` | `id` | NO ACTION | SET NULL | YES |
| `scheduled_outages` | `scheduled_outages_barangay_id_fkey` | `barangay_id` | `barangays` | `id` | NO ACTION | SET NULL | YES |
| `scheduled_outages` | `scheduled_outages_created_by_fkey` | `created_by` | `users` | `id` | NO ACTION | SET NULL | YES |
| `announcements` | `announcements_created_by_fkey` | `created_by` | `users` | `id` | NO ACTION | SET NULL | YES |
| `notifications` | `notifications_user_id_fkey` | `user_id` | `users` | `id` | NO ACTION | CASCADE | YES |
| `notification_preferences` | `notification_preferences_user_id_fkey` | `user_id` | `users` | `id` | NO ACTION | CASCADE | YES |
| `feedback` | `feedback_barangay_id_fkey` | `barangay_id` | `barangays` | `id` | NO ACTION | SET NULL | YES |
| `feedback` | `feedback_incident_id_fkey` | `incident_id` | `incidents` | `id` | NO ACTION | SET NULL | YES |
| `feedback` | `feedback_report_id_fkey` | `report_id` | `reports` | `id` | NO ACTION | SET NULL | YES |
| `feedback` | `feedback_user_id_fkey` | `user_id` | `users` | `id` | NO ACTION | SET NULL | YES |
| `audit_logs` | `audit_logs_actor_id_fkey` | `actor_id` | `users` | `id` | NO ACTION | SET NULL | YES |
| `oauth_accounts` | `oauth_accounts_user_id_fkey` | `user_id` | `users` | `id` | NO ACTION | CASCADE | YES |
| `password_reset_tokens` | `password_reset_tokens_user_id_fkey` | `user_id` | `users` | `id` | NO ACTION | CASCADE | YES |
| `repair_teams` | `repair_teams_active_assignment_fk` | `active_assignment_id` | `repair_assignments` | `id` | NO ACTION | SET NULL | YES |
| `repair_assignments` | `repair_assignments_assigned_by_fkey` | `assigned_by` | `users` | `id` | NO ACTION | RESTRICT | YES |
| `repair_assignments` | `repair_assignments_incident_id_fkey` | `incident_id` | `incidents` | `id` | NO ACTION | SET NULL | YES |
| `repair_assignments` | `repair_assignments_report_id_fkey` | `report_id` | `reports` | `id` | NO ACTION | SET NULL | YES |
| `repair_assignments` | `repair_assignments_target_barangay_id_fkey` | `target_barangay_id` | `barangays` | `id` | NO ACTION | SET NULL | YES |
| `repair_assignments` | `repair_assignments_team_id_fkey` | `team_id` | `repair_teams` | `id` | NO ACTION | RESTRICT | YES |
| `repair_assignment_evidence` | `repair_assignment_evidence_assignment_id_fkey` | `assignment_id` | `repair_assignments` | `id` | NO ACTION | CASCADE | YES |
| `repair_assignment_evidence` | `repair_assignment_evidence_staff_id_fkey` | `staff_id` | `users` | `id` | NO ACTION | RESTRICT | YES |
| `repair_assignment_location_confirmations` | `repair_assignment_location_confirmations_assignment_id_fkey` | `assignment_id` | `repair_assignments` | `id` | NO ACTION | CASCADE | YES |
| `repair_assignment_location_confirmations` | `repair_assignment_location_confirmations_staff_id_fkey` | `staff_id` | `users` | `id` | NO ACTION | RESTRICT | YES |
| `staff_team_members` | `staff_team_members_assigned_by_fkey` | `assigned_by` | `users` | `id` | NO ACTION | RESTRICT | YES |
| `staff_team_members` | `staff_team_members_team_id_fkey` | `team_id` | `repair_teams` | `id` | NO ACTION | CASCADE | YES |
| `staff_team_members` | `staff_team_members_user_id_fkey` | `user_id` | `users` | `id` | NO ACTION | CASCADE | YES |
| `staff_barangay_assignments` | `staff_barangay_assignments_assigned_by_fkey` | `assigned_by` | `users` | `id` | NO ACTION | RESTRICT | YES |
| `staff_barangay_assignments` | `staff_barangay_assignments_barangay_id_fkey` | `barangay_id` | `barangays` | `id` | NO ACTION | CASCADE | YES |
| `staff_barangay_assignments` | `staff_barangay_assignments_user_id_fkey` | `user_id` | `users` | `id` | NO ACTION | CASCADE | YES |

**Junction tables (composite PKs):** `user_roles`(user_id,role_id), `role_permissions`(role_id,permission_id), `incident_reports`(incident_id,report_id), `incident_affected_areas`(incident_id,barangay_id), `staff_team_members`(team_id,user_id), `staff_barangay_assignments`(user_id,barangay_id). One-to-one-like: `user_profiles`(user_id), `notification_preferences`(user_id), `repair_assignment_location_confirmations`(assignment_id). All appropriate.


## 6) Entity-Relationship Diagram (Mermaid)

```mermaid
erDiagram
  USERS {
    bigint id PK
    uuid legacy_resident_uuid FK
    text email
    text username
    text password_hash
    text account_status
    text role
    timestampwithtimezone(6) created_at
    timestampwithtimezone(6) updated_at
    timestampwithtimezone(6) last_login
  }
  USERPROFILES {
    bigint user_id PK
    text full_name
    text contact_number
    text address
    bigint barangay_id FK
    text purok
    text profile_photo_path
    text preferred_language
    timestampwithtimezone(6) created_at
    timestampwithtimezone(6) updated_at
  }
  ROLES {
    bigint id PK
    text role_name
    text description
    timestampwithtimezone(6) created_at
  }
  USERROLES {
    bigint user_id PK
    bigint role_id PK
    bigint assigned_by FK
    timestampwithtimezone(6) assigned_at
  }
  PERMISSIONS {
    bigint id PK
    text permission_name
    text description
    timestampwithtimezone(6) created_at
  }
  ROLEPERMISSIONS {
    bigint role_id PK
    bigint permission_id PK
  }
  BARANGAYS {
    bigint id PK
    text barangay_name
    text area_description
    integer population
    doubleprecision latitude
    doubleprecision longitude
    text status
    timestampwithtimezone(6) created_at
    timestampwithtimezone(6) updated_at
  }
  USERSESSIONS {
    text token_hash PK
    bigint user_id FK
    text session_type
    text source
    timestampwithtimezone(6) created_at
    timestampwithtimezone(6) expires_at
  }
  REPORTS {
    bigint id PK
    text report_code
    bigint reporter_id FK
    bigint barangay_id FK
    text barangay_name
    text location
    text purok
    doubleprecision latitude
    doubleprecision longitude
    boolean location_confirmed
    text location_source
    doubleprecision location_accuracy_m
    timestampwithtimezone(6) date_time_noticed
    text description
    ... more_fields
  }
  REPORTEVIDENCE {
    bigint id PK
    text legacy_key
    bigint report_id FK
    text file_url
    text file_type
    text original_name
    bigint file_size
    bigint uploaded_by FK
    timestampwithtimezone(6) uploaded_at
  }
  REPORTVERIFICATIONS {
    bigint id PK
    text legacy_key
    bigint report_id FK
    bigint reviewer_id FK
    text decision
    text remarks
    timestampwithtimezone(6) reviewed_at
    timestampwithtimezone(6) created_at
  }
  REPORTSTATUSHISTORY {
    bigint id PK
    bigint report_id FK
    text event_type
    text title
    text details
    text old_status
    text new_status
    bigint changed_by FK
    text actor_name
    timestampwithtimezone(6) created_at
  }
  REPORTCOMMENTS {
    bigint id PK
    bigint report_id FK
    bigint user_id FK
    text comment
    timestampwithtimezone(6) created_at
  }
  INCIDENTS {
    bigint id PK
    text incident_code
    text title
    text incident_type
    text status
    timestampwithtimezone(6) start_time
    timestampwithtimezone(6) restored_at
    timestampwithtimezone(6) estimated_restoration
    text estimated_restoration_text
    text etr_reason
    bigint barangay_id FK
    text barangay_name
    text location
    text purok
    ... more_fields
  }
  INCIDENTREPORTS {
    bigint incident_id PK
    bigint report_id PK
    bigint linked_by FK
    timestampwithtimezone(6) linked_at
  }
  INCIDENTASSIGNMENTS {
    bigint id PK
    text legacy_key
    bigint incident_id FK
    bigint report_id FK
    bigint staff_id FK
    bigint team_id FK
    bigint repair_assignment_id FK
    bigint assigned_by FK
    text assignment_code
    text status
    text priority
    bigint target_barangay_id FK
    text target_barangay_name
    text target_purok
    ... more_fields
  }
  INCIDENTAFFECTEDAREAS {
    bigint id PK
    bigint incident_id FK
    bigint barangay_id FK
    text barangay_name
    text area_description
    timestampwithtimezone(6) created_at
  }
  OUTAGEUPDATES {
    bigint id PK
    text legacy_key
    bigint incident_id FK
    bigint report_id FK
    bigint assignment_id FK
    bigint updated_by FK
    text status
    text stage
    text remarks
    doubleprecision latitude
    doubleprecision longitude
    timestampwithtimezone(6) created_at
  }
  SCHEDULEDOUTAGES {
    bigint id PK
    text schedule_code
    text title
    bigint barangay_id FK
    text barangay_name
    text area
    date outage_date
    timestampwithtimezone(6) start_time
    timestampwithtimezone(6) end_time
    text reason
    text status
    bigint created_by FK
    timestampwithtimezone(6) created_at
    timestampwithtimezone(6) updated_at
  }
  ANNOUNCEMENTS {
    bigint id PK
    bigint created_by FK
    text title
    text content
    text category
    text status
    text image_path
    timestampwithtimezone(6) published_at
    timestampwithtimezone(6) created_at
  }
  NOTIFICATIONS {
    bigint id PK
    bigint user_id FK
    text title
    text message
    text type
    timestampwithtimezone(6) read_at
    timestampwithtimezone(6) created_at
  }
  NOTIFICATIONPREFERENCES {
    bigint id PK
    bigint user_id FK
    text channel
    boolean enabled
    timestampwithtimezone(6) created_at
    timestampwithtimezone(6) updated_at
  }
  FEEDBACK {
    bigint id PK
    bigint user_id FK
    bigint report_id FK
    bigint incident_id FK
    text user_name
    bigint barangay_id FK
    text barangay_name
    smallint rating
    text comments
    boolean restoration_confirmed
    timestampwithtimezone(6) created_at
  }
  AUDITLOGS {
    bigint id PK
    bigint actor_id FK
    text actor_name
    text role
    text action
    text entity_type
    text entity_id
    text detail
    text ip_address
    timestampwithtimezone(6) created_at
  }
  OAUTHACCOUNTS {
    text provider PK
    text provider_user_id PK
    bigint user_id FK
    timestampwithtimezone(6) created_at
  }
  OAUTHSTATES {
    text state_hash PK
    text provider
    timestampwithtimezone(6) expires_at
  }
  PASSWORDRESETTOKENS {
    text token_hash PK
    bigint user_id FK
    timestampwithtimezone(6) expires_at
    timestampwithtimezone(6) created_at
  }
  SETTINGS {
    text key PK
    text value
    timestampwithtimezone(6) updated_at
  }
  SMSLOGS {
    bigint id PK
    text phone_number
    text message
    text status
    text event_type
    timestampwithtimezone(6) created_at
  }
  REPAIRTEAMS {
    bigint id PK
    text team_code
    text name
    text lead_technician
    text contact_number
    text vehicle_type
    text base_station
    doubleprecision current_latitude
    doubleprecision current_longitude
    timestampwithtimezone(6) location_updated_at
    text status
    bigint active_assignment_id FK
    timestampwithtimezone(6) created_at
  }
  REPAIRASSIGNMENTS {
    bigint id PK
    text assignment_code
    bigint team_id FK
    bigint report_id FK
    bigint incident_id FK
    bigint assigned_by FK
    text status
    text priority
    bigint target_barangay_id FK
    text target_barangay_name
    text target_purok
    text target_location
    doubleprecision target_latitude
    doubleprecision target_longitude
    ... more_fields
  }
  REPAIRASSIGNMENTEVIDENCE {
    bigint id PK
    bigint assignment_id FK
    bigint staff_id FK
    text file_name
    text mime_type
    timestampwithtimezone(6) created_at
  }
  REPAIRASSIGNMENTLOCATIONCONFIRMATIONS {
    bigint assignment_id PK
    bigint staff_id FK
    text confirmed_purok
    text confirmed_location
    timestampwithtimezone(6) created_at
  }
  STAFFTEAMMEMBERS {
    bigint user_id PK
    bigint team_id PK
    bigint assigned_by FK
    timestampwithtimezone(6) assigned_at
  }
  STAFFBARANGAYASSIGNMENTS {
    bigint user_id PK
    bigint barangay_id PK
    bigint assigned_by FK
    timestampwithtimezone(6) assigned_at
  }
  USERS ||--1|1|| USER_PROFILES : rel
  USERS ||--1|N|| USER_ROLES : rel
  ROLES ||--1|N|| USER_ROLES : rel
  ROLES ||--1|N|| ROLE_PERMISSIONS : rel
  PERMISSIONS ||--1|N|| ROLE_PERMISSIONS : rel
  USERS ||--1|N|| REPORTS : rel
  REPORTS ||--1|N|| REPORT_EVIDENCE : rel
  REPORTS ||--1|N|| REPORT_VERIFICATIONS : rel
  REPORTS ||--1|N|| REPORT_STATUS_HISTORY : rel
  REPORTS ||--1|N|| REPORT_COMMENTS : rel
  INCIDENTS ||--1|N|| INCIDENT_REPORTS : rel
  REPORTS ||--1|N|| INCIDENT_REPORTS : rel
  INCIDENTS ||--1|N|| INCIDENT_AFFECTED_AREAS : rel
  BARANGAYS ||--1|N|| INCIDENT_AFFECTED_AREAS : rel
  INCIDENTS ||--1|N|| INCIDENT_ASSIGNMENTS : rel
  REPAIR_ASSIGNMENTS ||--1|1|| INCIDENT_ASSIGNMENTS : rel
  REPAIR_TEAMS ||--1|N|| REPAIR_ASSIGNMENTS : rel
  USERS ||--1|N|| REPAIR_ASSIGNMENTS : rel
  REPAIR_ASSIGNMENTS ||--1|N|| REPAIR_ASSIGNMENT_EVIDENCE : rel
  REPAIR_ASSIGNMENTS ||--1|1|| REPAIR_ASSIGNMENT_LOCATION_CONFIRMATIONS : rel
  USERS ||--1|N|| NOTIFICATIONS : rel
  USERS ||--1|1|| NOTIFICATION_PREFERENCES : rel
  USERS ||--1|N|| AUDIT_LOGS : rel
  BARANGAYS ||--1|N|| USERS : rel
  USERS ||--1|N|| STAFF_TEAM_MEMBERS : rel
  REPAIR_TEAMS ||--1|N|| STAFF_TEAM_MEMBERS : rel
  USERS ||--1|N|| STAFF_BARANGAY_ASSIGNMENTS : rel
  BARANGAYS ||--1|N|| STAFF_BARANGAY_ASSIGNMENTS : rel
  USERS ||--1|N|| FEEDBACK : rel
  INCIDENTS ||--1|N|| FEEDBACK : rel
```


## 7) Normalization Assessment (1NF/2NF/3NF)

| Principle | Assessment | Notes |
|---|---|---|
| 1NF | **PASS** | All tables have atomic values; no repeating groups. Junction tables used for M:N. |
| 2NF | **PASS** | All non-key columns depend on the whole primary key. Composite keys only on junction tables with no extra dependent attributes needing split. |
| 3NF | **PASS** | Most transitive dependencies removed. Intentional denormalizations remain: `reports.reporter_name/contact/email` snapshots for historical accuracy; `incidents.barangay_id/name`; `repair_assignments.target_barangay_name`; `incident_assignments.*_name` snapshots. These are justified for audit/history and report stability. |

**Verdict:** Appropriately normalized without over-normalizing. The snapshot/denormalized fields are correct for a public-record/audit system.


## 8) Security and Performance Review

### Security
| Check | Status | Notes |
|---|---|---|
| Credential handling | **OK** | Secrets via Render env vars (`sync:false`); not committed. Pool uses `NEON_DATABASE_URL`. |
| SQL injection protection | **OK** | Application uses parameterized queries (`$1`, `?`) in reviewed code paths. |
| Role-based access | **Partial / Needs action** | RBAC schema exists (roles/permissions/role_permissions + trigger). **Critical:** runtime connects as `neondb_owner` (full DDL/DML). Create least-privilege `powerwatch_app` role per `DATABASE_REVIEW.md` §6.5. |
| PII handling | **OK / Needs policy** | PII present (names, emails, phones, addresses, IP in audit_logs, snapshot blob). Define retention/deletion policy. |
| Token storage | **OK** | Session/reset tokens stored as hashes; checks added in 007. |
| SSL | **Needs action** | `sslmode=require` triggers pg warning; use `sslmode=verify-full` (keep `channel_binding=require`). |
| RLS | **Not enabled** | Not necessary with single app role; revisit if direct DB access granted. |

### Performance
| Check | Status | Notes |
|---|---|---|
| FK indexes | **OK** | Every FK column indexed (006/007 additions verified). |
| Query hot paths | **OK** | Added indexes for resident login, unread notifications, Admin lists, dispatch board. |
| Pagination | **App responsibility** | Schema supports (timestamps/IDs indexed). |
| Connection management | **OK** | Uses pg pools. Consider consolidating pools. |
| Large tables | **Monitor** | `audit_logs`, `sms_logs`, `notifications`, `outage_updates` can grow; plan retention/partitioning. |
| Extensions | **Minimal** | Only `plpgsql` installed. |


## 9) Improvements Applied (Safe, Additive, Verified)

| Change | Type | Status | Verification |
|---|---|---|---|
| Migration 007 (hardening) | Schema additive | **Applied to production** | Dry-run+apply, checksummed; 21/21 smoke then updated. |
| Migration 008 (role demotion fix) | Function replacement | **Applied to production** | Dry-run+apply; verified demotion removes old primary role. |
| Runtime SQLite indexes (10) | Additive indexes | **Applied** | `data/powerwatch.db` has all 10, `PRAGMA integrity_check=ok`, 0 FK violations. |
| `neon-backfill.js` guardrails | Script fix | **Applied** | Skips non-JSON bookkeeping settings; guards `legacy_resident_uuid` when target missing account. |
| `neon-deploy-schema.js` expectations | Config update | **Applied** | Now expects 69 FKs / 31 checks. |
| Tests updated | Tests | **Applied** | 91/91 pass; new tests for 007/008/backfill. |

**Safety notes:** No data deleted, no tables/columns dropped, no existing values changed, all legacy snapshot/resident tables untouched, protected tables preserved.


## 10) Migration Summary

| Migration | Purpose | Applied | Notes |
|---|---|---|---|
| 001_reference_accounts.sql | Core reference/accounts tables | YES (live) | Seeded roles/permissions baseline. |
| 002_operations.sql | Reports/incidents/dispatch | YES (live) | Operations model. |
| 003_supporting.sql | Supporting features | YES (live) | Extended tables. |
| 004_permissions.sql | RBAC | YES (live) | Permissions matrix. |
| 005_integrity_hardening.sql | FKs + checks | YES (live) | 68 FKs at that time. |
| 006_relationship_indexes.sql | Relationship indexes | YES (live) | Covered FK columns. |
| 007_production_hardening.sql | Triggers/checks/FK/indexes/views | **YES (live)** | Applied 2026-10-23. |
| 008_role_sync_demotion.sql | Role trigger fix | **YES (live)** | Applied 2026-10-23. |

**Pending:** None required. Recommended follow-ups are operational/security (least-priv role, sslmode=verify-full, retention) per `DATABASE_REVIEW.md`.


## 11) Test Results

| Test Suite | Result | Notes |
|---|---|---|
| `npm test` (all) | **91/91 PASS** | Full suite. |
| `tests/database-staging.test.js` | **12/12 PASS** | Deploy guardrails, migrations, indexes, role sync/demotion, backfill exclusions. |
| `scripts/postcheck.cjs` (rolled-back smoke) | **22/22 PASS** | Triggers, views, constraints, demotion, live data unchanged. |
| SQLite integrity | **PRAGMA integrity_check = ok** | 0 FK violations. |
| Live orphan/drift checks | **0 issues** | All FK orphans/drift/duplicates zero. |


## 12) Final Verification Checklist

| Item | Status | Notes |
|---|---|---|
| All 35 required tables exist | **PASS** | Verified live in Neon. |
| Every table has PK | **PASS** | Verified. |
| All FKs present and validated (69) | **PASS** | Verified. |
| All constraints validated (31 checks) | **PASS** | Verified. |
| Relationships correct for all modules | **PASS** | Users/Staff/Admin/Reports/Incidents/Assignments/Notifications/Feedback/Audit verified. |
| Junction tables correct | **PASS** | Composite PKs on all junctions. |
| Index coverage for FKs and hot paths | **PASS** | 136 indexes on app tables. |
| No orphaned records / no drift | **PASS** | Live scans clean. |
| Legacy tables untouched | **PASS** | app_snapshots/resident_* preserved. |
| Runtime app functional | **PASS** | All app tests pass. |
| Render/Neon integration correct | **PASS** | Config verified; migrations applied safely. |
| Security hardening documented + partial fixes applied | **PASS/PARTIAL** | Role sync fixed; least-priv role/sslmode still recommended. |
| Documentation updated | **PASS** | `DATABASE_REVIEW.md`, `DATABASE_RELATIONSHIPS.md`, `DATABASE_ARCHITECTURE.md`, `db/README.md`, this audit. |
