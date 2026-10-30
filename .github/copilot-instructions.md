# Valencia PowerWatch Project Instructions

## GitHub, Render, and Neon workflow

For every code, UI, backend, or database change:

1. Inspect the current branch, remote, and working-tree diff before editing. Preserve unrelated user changes; stage and commit only files belonging to the requested task. Never include `.env` files, credentials, database files, uploaded data, or other secrets.
2. Run the smallest relevant tests, then the full `npm test` suite when practical. Do not publish changes with known failures without explaining them and obtaining the user's direction.
3. Commit and push task-owned changes to `DELMARKELL09652703584/valencia-powerwatch` using the repository's existing branch/PR policy. Never force-push or claim a commit or push succeeded unless the result is verified.
4. Render is configured in `render.yaml` to auto-deploy `main` and run `npm ci && node --test`. After a push intended for production, verify the matching deployment completed, inspect its logs for build/runtime errors, and check `/api/health` and the affected live feature. A successful push alone is not proof of deployment. Do not change production service settings or bypass a failed deployment to claim success.
5. Before database work, inspect [DATABASE_ARCHITECTURE.md](../DATABASE_ARCHITECTURE.md), [DATABASE_DESIGN_MAPPING.md](../DATABASE_DESIGN_MAPPING.md), and [db/README.md](../db/README.md). Production currently uses SQLite for operational workflows, Neon for durable snapshots/files and resident authentication, and a normalized Neon schema that is not yet the active CRUD store for those workflows. Do not assume that adding a Neon table automatically integrates application reads/writes.
6. Only create and apply a migration when the requested feature needs a schema change. Follow the repository's migration scripts and staging/development-branch workflow first; verify the migration and data after application. Preserve existing production records. Never reset, truncate, drop, or overwrite production data as a shortcut. Get explicit user confirmation before any destructive or irreversible production data operation.
7. Keep database URLs and provider credentials in secured environment configuration only. Do not print, commit, or expose secret values. Verify Neon connectivity without displaying credentials; report clearly if access or authorization is unavailable.
8. For each task, report separately what was changed, the commit/push result, Render deployment and live verification, Neon migration/connectivity result (or why no migration was needed), and the tests run. Mark any inaccessible or unverified step as incomplete; never infer success from configuration alone.

## Existing validation

- Run the full test suite with `npm test` (equivalent to the CI command `node --test`).
- GitHub Actions runs tests on pushes and pull requests targeting `main`.
- Consult the deployment and database architecture documents linked above before changing production integration behavior.
