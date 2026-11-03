# Community Authentication Setup

Copy `.env.example` to `.env` and configure only the providers you plan to use. Keep `.env` private and never commit provider or mail credentials.

## Google Sign-In

Create a Google OAuth web client. Add `http://localhost:4000/api/auth/oauth/google/callback` as an authorized redirect URI for local development, then set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `PUBLIC_BASE_URL` in `.env`.

## Facebook Sign-In

Create and configure a Facebook Login app, enable the email permission, and allow `http://localhost:4000/api/auth/oauth/facebook/callback` as the redirect URI. Set `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`, and `PUBLIC_BASE_URL` in `.env`.

For production, set `PUBLIC_BASE_URL` to the public HTTPS origin and register the matching HTTPS callback URLs with each provider.

## Password Recovery

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. The recovery link is single-use and expires after 30 minutes. Without complete SMTP settings, the app keeps recovery unavailable and reports that configuration is missing.

After changing `.env`, restart the Node server. The login screen reads configured-provider status from the server and offers the matching actions.

## Account storage

Resident accounts and resident sessions are stored in Neon (`resident_accounts`, `resident_sessions`) and mirrored into SQLite. Administrator, staff, and utility accounts/sessions use SQLite. Session values in both stores are SHA-256 hashes; the raw token exists only in the browser cookie. This is the existing custom Node.js authentication, not Neon Better Auth.

If `NEON_DATABASE_URL` is absent, resident auth uses the SQLite fallback unless `PERSISTENT_AUTH_REQUIRED=true`. If Neon is configured but unreachable, resident login and session checks can fail until Neon returns; admin/staff SQLite sessions are unaffected.

## Render production configuration

Store all secrets in Render, never in the repository. The current Render service configures:

- `NEON_DATABASE_URL` (secret; production uses the least-privilege role `powerwatch_app_mvjwen4u`, not `neondb_owner`)
- `POWERWATCH_SNAPSHOT_ENABLED=true`

The app role has only `CONNECT`, schema `USAGE`, and `SELECT`/`INSERT`/`UPDATE`/`DELETE` on the five application tables. Use `neondb_owner` only for controlled schema provisioning or snapshot recovery; a fresh database needs the owner to create the tables before the app role can use them.

To enable OAuth and password recovery in production, add `PUBLIC_BASE_URL`, the provider client IDs/secrets, and SMTP settings in Render. Without complete SMTP settings, password recovery stays disabled; OAuth actions remain unavailable until their credentials are configured.

Use HTTPS callback URLs:

- `https://valencia-powerwatch.onrender.com/api/auth/oauth/google/callback`
- `https://valencia-powerwatch.onrender.com/api/auth/oauth/facebook/callback`

After changing Render environment variables, redeploy or restart the service.

## Security

- Never commit `.env`, `data/powerwatch.db`, or database backups. The GitHub repository is private, but old history still contains the database; purge it before making the repository public again.
- The real admin and resident passwords were rotated after the public-download exposure window. Their sessions were invalidated, and both the latest and rolling backup snapshots were verified with the new hashes. Deliver credentials privately and change them after the first login.
- The built-in administrator can change their own password from the authenticated profile screen after confirming the current password. Staff-side reset, role, status, delete, admin recovery, and forgot-password flows remain blocked for that account.
- Session tokens are stored as SHA-256 hashes. Pre-hardening plaintext sessions are invalidated; production had 0 sessions when this changed.
- Cookies are `httpOnly` and `SameSite=Lax`; `Secure` is set whenever the request is HTTPS. The app trusts one Render proxy hop for `req.secure`.
- Profile photos under `/uploads/profile_*` require authentication and are limited to the owner, administrators, and utility users. Only announcement images are public.
- Production uses the least-privilege Neon role `powerwatch_app_mvjwen4u`, which cannot create roles, databases, or tables. Runtime DDL is skipped when the five tables already exist; use `neondb_owner` only for deliberate schema maintenance.