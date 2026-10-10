# Passwordless authentication setup

The implementation is tested locally. Do not activate it on production until at least one provider is configured and tested. Never commit credentials. Configure server-only environment variables in Vercel and an ignored local `.env` for local testing.

## Google first

1. Open https://console.cloud.google.com/auth/clients and select the intended Google Cloud project.
2. Configure the Google Auth Platform application name as Bebin Dev Studio, support email, and audience. If the app is in Testing, add your Google account as a test user. Google may require additional verification before worldwide release.
3. Create a Web application OAuth client.
4. Add this exact authorized redirect URI:
   `https://bebin-dev.vercel.app/api/auth/google/callback`
5. For local testing add `http://127.0.0.1:3016/api/auth/google/callback`.
6. Set server-only variables:
   - `APP_BASE_URL=https://bebin-dev.vercel.app`
   - `GOOGLE_CLIENT_ID` from the client
   - `GOOGLE_CLIENT_SECRET` from the client
7. Locally use `APP_BASE_URL=http://127.0.0.1:3016` and `PORT=3016`.
8. Test account selection, callback, refresh, restart and logout before deploying. Keep secrets out of screenshots, chat, logs and frontend code.

## Email later

Use an email provider with a verified sender. Configure `EMAIL_FROM` and either `RESEND_API_KEY` or `SMTP_HOST`, `SMTP_PORT` (465 or 587), `SMTP_USER`, and `SMTP_PASSWORD`. Resend send-email API and SMTP over TLS are supported. Do not use a made-up sender/domain. Emails contain a single-use link that expires in 15 minutes. Same-browser links complete sign-in automatically; another browser requires confirmation to protect against scanners and unintended sign-in.

Google accounts with a third-party email address may require mailbox proof before account linking. Gmail and verified managed Workspace identities can use Google alone.

## Sessions and platform scope

Production sessions use Secure, HttpOnly, SameSite=Lax host-only cookies. Random session tokens are hashed in the database and renewed at most once daily, with a rolling 400-day maximum. Manual logout revokes the session. Browser-cleared cookies, revocation or expiration require sign-in again. No authentication tokens are written to localStorage. Network failures display a retry screen without clearing the session.

Desktop and mobile web have distinct responsive login layouts. This repository does not contain a native Android/iOS app. Native clients would additionally need system-browser OAuth, verified app links and platform credential storage.

Password endpoints are disabled by default and always disabled in production/Vercel. `AUTH_LEGACY_PASSWORD=true` is for isolated local regression tests only, never production. Existing account IDs and project data are preserved.

## Validation

`npm test` validates email confirmation, expiry/reuse rejection, persistent and revoked sessions on SQLite and libsql, signed Google ID tokens, OAuth state/PKCE, failed delivery, existing application workflows, and all downloadable template builds. These tests use test identities and an injected mailer; they do not prove live Google credentials or actual mailbox delivery. `npm run build` verifies source syntax. Live provider checks remain required.
