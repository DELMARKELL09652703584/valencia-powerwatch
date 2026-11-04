# Valencia PowerWatch — Neon development schema

This directory contains the versioned PostgreSQL schema for the normalized
Valencia PowerWatch database. The schema is deployed additively to the
production branch's `public` schema (the branch Render uses) and can also be
exercised on an isolated Neon development branch. The live application still
reads and writes its SQLite + Neon snapshot/resident-account design; adding
these tables does not change runtime behaviour.

See `DATABASE_RELATIONSHIPS.md` in the project root for the generated
table-by-table relationship reference (primary keys, foreign keys, cardinality,
delete rules, and module coverage).

## Safety contract

The staging scripts refuse to run unless all of these are true:

- `POWERWATCH_ALLOW_NEON_DEV=1`
- `NEON_DEV_DATABASE_URL` points to the development branch
- `NODE_ENV` is not `production`
- the development URL is not identical to `NEON_DATABASE_URL` or
  `NEON_SOURCE_DATABASE_URL`
- the development URL does not use the same Neon endpoint host as either
  production URL

The scripts never read `NEON_DATABASE_URL` as a target. They never write to the
production branch. `POWERWATCH_SOURCE_NEON_URL` is optional and is opened in a
`READ ONLY` transaction only to copy resident accounts and resident sessions
into staging.

`npm run db:audit:neon` is the production-safe exception for schema inspection:
it opens a `BEGIN READ ONLY` transaction and rolls it back. It performs no DDL
or data writes. Prefer setting `POWERWATCH_AUDIT_DATABASE_URL` to a dedicated
read-only Neon role; otherwise it uses `DATABASE_URL` / `NEON_DATABASE_URL`
inside the read-only transaction. Add `-- --details` to print every required
table's columns, constraints, and indexes. The connection URL is never printed.

The single exception is `scripts/production/neon-deploy-schema.js`, which deploys the
schema itself (DDL only, never row data) to the production branch. It requires
`POWERWATCH_ALLOW_PRODUCTION_DDL=1`, refuses `NODE_ENV=production`, verifies the
target is a Neon endpoint, defaults to a dry run that always rolls back, and
runs every pending migration in one transaction. Existing snapshot and resident
tables are never altered by it.

## Deploy the schema to the production branch

Render connects to the branch in `DATABASE_URL` (with `NEON_DATABASE_URL` as a
backward-compatible alias). To create the 35 tables there:

```powershell
$env:POWERWATCH_ALLOW_PRODUCTION_DDL = "1"
npm run db:deploy          # dry run: applies + verifies, then rolls back
npm run db:deploy:apply    # commits
Remove-Item Env:\POWERWATCH_ALLOW_PRODUCTION_DDL
```

Both commands print a verification block: 35 required tables, 69 foreign keys,
31 CHECK constraints, validated constraints, primary keys on every table, and
the seeded roles, permissions, and role-permission matrix. The script records
each applied file in `schema_migrations` and refuses to continue if an applied
file changes.

Deploying the schema does not migrate application data. The normalized tables
start empty; the running system keeps using the SQLite snapshot and the
`resident_accounts` / `resident_sessions` tables until the application is
switched over.

## Target schema

The migrations create 35 application tables:

- **24 core tables**: users, profiles, roles, permissions, barangays, sessions,
  reports, evidence, verification, status history, comments, incidents,
  incident/report links, assignments, affected areas, outage updates, scheduled
  outages, announcements, notifications, preferences, feedback, and audit logs.
- **11 supporting tables**: OAuth accounts/states, password-reset tokens,
  settings, SMS logs, repair teams/assignments, assignment evidence/location
  confirmations, staff team membership, and staff barangay scope.

`repair_assignment_updates` is folded into `outage_updates`.
`report_attachments`, `incident_links`, `incident_areas`, `citizen_feedback`,
`sessions`, and `resident_sessions` are folded into their corresponding core
tables.

## 1. Create the development branch

Use one of the two methods below. Do not run migrations against the default
production branch.

### Method A — Neon CLI

```powershell
npx --yes neonctl@latest auth
npx --yes neonctl@latest branches create --project-id soft-rain-77737541 --name development
npx --yes neonctl@latest connection-string development --project-id soft-rain-77737541
```

Copy the returned connection string into the untracked `.env.staging.local`:

```dotenv
NEON_DEV_DATABASE_URL=postgresql://...
POWERWATCH_ALLOW_NEON_DEV=1
```

### Method B — Neon API helper

Set a Neon API key locally (never commit it), then run:

```powershell
$env:NEON_API_KEY = "napi_..."
$env:NEON_PROJECT_ID = "soft-rain-77737541"
npm run db:branch:create
```

The helper creates or reuses a branch named `development`, gets its connection
URI, and writes the URI only to the ignored `.env.staging.local` file. It does
not print the URI.

Optional branch settings:

```dotenv
NEON_DEV_BRANCH_NAME=development
NEON_PARENT_BRANCH_ID=
NEON_DB_NAME=neondb
NEON_DB_ROLE=neondb_owner
```

`neondb_owner` is appropriate for an isolated development branch because the
migration needs DDL privileges. Never use the owner URL on production routes.

## 2. Run migrations, backfill, and validation

```powershell
npm run db:migrate:neon
npm run db:backfill:neon
npm run db:validate:neon
```

Or run all three:

```powershell
npm run db:staging
```

The SQLite source defaults to `data/powerwatch.db`. Override it with:

```dotenv
POWERWATCH_SQLITE_PATH=data/powerwatch.db
```

To include the resident account and session hashes from the existing Neon
resident tables, add the production connector as a **read-only source** only
when explicitly needed:

```dotenv
POWERWATCH_SOURCE_NEON_URL=postgresql://...
```

The backfill uses `BEGIN READ ONLY` for that source. It never writes there.

## 3. What the commands do

| Command | Purpose |
|---|---|
| `npm run db:branch:create` | Creates/reuses the Neon `development` branch and writes its URL to `.env.staging.local` |
| `npm run db:migrate:neon` | Applies `database/migrations/*.sql` in order, records checksums in `schema_migrations`, and verifies all 35 expected tables |
| `npm run db:backfill:neon` | Idempotently copies users, profiles, roles, sessions, barangays, reports, incidents, dispatch, notifications, audit, OAuth, settings, SMS, and support data |
| `npm run db:validate:neon` | Checks counts, foreign keys, roles, barangay mapping, evidence links, and SHA-256 session hashes |
| `npm run db:audit:neon` | Audits the configured Neon schema and data-integrity indicators in a read-only transaction |
| `npm run db:deploy` | Dry-runs the schema deployment on `NEON_DATABASE_URL` and rolls back |
| `npm run db:deploy:apply` | Commits pending migrations to `NEON_DATABASE_URL` (needs `POWERWATCH_ALLOW_PRODUCTION_DDL=1`) |
| `npm run db:seed:reference` | Dry-runs the 31-barangay and settings seed on `NEON_DATABASE_URL` and rolls back |
| `npm run db:seed:reference:apply` | Commits the reference seed (needs `POWERWATCH_ALLOW_PRODUCTION_SEED=1`) |

## 4. Idempotency and rollback

- Migrations use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and
  seed `ON CONFLICT` clauses. Applied migration checksums prevent silent edits.
- Backfills use upserts or conflict-safe inserts and preserve source integer IDs
  where possible. Identity sequences are synchronized after each run.
- Deleting the development branch is the rollback. Do not delete or reset the
  production branch while testing this schema.
- If a migration fails, fix it in a new migration file. Do not edit an already
  applied migration on a shared branch.

## 5. Validation expectations

After a clean backfill, validation should report:

- four roles and at least ten permissions;
- 31 barangays from the local source;
- every user with a profile and at least one role;
- every report with a reporter;
- mapped barangay IDs for all known barangay names;
- no orphan report/incident/assignment/evidence foreign keys;
- zero non-SHA-256 session hashes;
- table counts at least equal to the SQLite source counts.

The command exits non-zero on any failure, so it can gate a future staging
deployment.

## 6. Local preflight result

The migrations, idempotent backfill, and validation were exercised locally
against the actual `data/powerwatch.db` source using a PostgreSQL-compatible
in-memory engine before the Neon run:

- all four migrations applied;
- all 35 application tables plus `schema_migrations` were created;
- 31 barangays, 2 users, 1 report, 1 incident, 2 status-history rows, 9
  settings, and 1 audit row were backfilled;
- running the backfill a second time produced identical counts;
- all validation checks passed.

This is a preflight, not a substitute for a real run. The live deployment on
2026-10-23 used the same migrations through `scripts/production/neon-deploy-schema.js`
against the production branch:

- migrations 001-006 committed in one transaction;
- 35 domain tables plus `schema_migrations` created next to the 5 pre-existing
  snapshot/resident tables, none of which were structurally altered;
- 68 foreign keys across the 35 tables, 132 indexes, 19 validated CHECK constraints, and a primary
  key on every table;
- 4 roles, 24 permissions, and 53 role-permission rows seeded;
- the unrelated Neon sample table `playing_with_neon` was dropped (10 rows of
  tutorial data, no foreign keys); it was the only table removed;
- 31 barangays (all with coordinates) and 7 configuration settings were seeded
  idempotently; demo bookkeeping keys (`demo_cleanup_version`, `seed_version`)
  were deliberately excluded;
- every foreign key column now has a supporting index;
- a rolled-back functional test inserted a full report -> incident -> dispatch
  -> feedback -> audit chain and confirmed that invalid status, role, rating,
  progress, duplicate-code, and orphan-foreign-key rows are rejected.

Migration **007_production_hardening** was then applied on 2026-10-23:

- 10 tables now auto-maintain `updated_at` through
  `powerwatch_touch_updated_at`, while still preserving an explicitly supplied
  timestamp (the backfill relies on that);
- 12 new CHECK constraints (coordinate ranges and pairs, an outage-update subject,
  SHA-256 token hashes, JSON settings), for 31 validated CHECKs total;
- the missing `users.legacy_resident_uuid -> resident_accounts(id)` foreign key,
  giving 69 foreign keys across the 35 tables;
- 15 indexes, including the live resident login/session lookups and the Admin
  list orderings, bringing the schema to 147 indexes;
- `users.role` is kept in sync with `user_roles` by
  `users_sync_primary_role`;
- the read-only views `v_user_effective_permissions` and
  `v_data_quality_issues`;
- a rolled-back functional test (22 checks) exercised the triggers, the report
  -> incident link chain, and the new rejection paths. The live row counts
  (3 resident accounts, 2 sessions, 1 snapshot) were unchanged.

Migration **008_role_sync_demotion** corrected the role trigger from 007:

- changing `users.role` now removes the previous primary role from `user_roles`
  before granting the new one. Without this, demoting an administrator would
  leave the `administrator` grant in place and the account would keep the
  administrator permissions through the matrix.
- explicitly granted extra roles are preserved unless one of them is the role
  being replaced.

`scripts/production/neon-backfill.js` now skips `seed_version` and `demo_cleanup_version`,
the two SQLite migration markers that are not valid JSON. This matches
`neon-seed-reference.js` and keeps the `settings_value_json_check` from 007
from blocking a future backfill.

## 7. Current source mapping notes


- SQLite `users` remains the operational source for staff/admin profiles and staff assignments. Neon `resident_accounts` and `resident_sessions` provide persistent credentials and sessions for residents and provisioned staff; the `role` column distinguishes personnel accounts.
- The normalized Neon `users` table is not the active CRUD store for staff workflows. No schema migration is required for staff provisioning because the existing persistent account/session tables already have role, contact, and session fields.
- Resident session UUIDs are mapped through `users.legacy_resident_uuid`, which
  is foreign-keyed to `resident_accounts(id)`. The link is only written when the
  target branch contains the referenced resident account (a branch created from
  production does; a reset branch may not).
- Only session hashes are copied. Raw cookies/tokens are rejected.
- `report_attachments` and report photo paths become `report_evidence`.
- `report_status_history` becomes `report_status_history` plus `outage_updates`
  entries for the incident timeline.
- `repair_assignments` is preserved as a support table and mirrored into
  `incident_assignments` for the normalized assignment model.
- `sms_logs` contains phone numbers. Access to the development branch must be
  restricted exactly like production.
