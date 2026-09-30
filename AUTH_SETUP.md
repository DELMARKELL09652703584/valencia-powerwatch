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