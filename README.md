# Bebin Dev Studio

A local website creation workspace with private accounts, saved projects and version history, source editing, responsive previews, HTML exports, Groq generation and a real downloadable template catalog.

## Run

Use Node.js 24. Install the locked dependencies before starting.

```sh
npm ci
node server.js
```

Configure Google or email sign-in using [AUTH_SETUP.md](AUTH_SETUP.md), then open http://127.0.0.1:3000. New accounts are created after identity verification. Data persists in `data/studio.sqlite`.

## Groq

Create `.env` from `.env.example`, set `GROQ_API_KEY` locally, and restart the server. The current configured model is `openai/gpt-oss-20b`, verified against the account's available Groq models. Change `GROQ_MODEL` when needed. Settings includes a connection test; the Studio supports prompt enhancement and AI generation. Credentials remain in the backend; `.env` is excluded from Git, Docker and downloadable projects. Never publish the real file.

## Appearance and accessibility

Light, Dark and Aurora themes persist in the account and a local preference for the login screen. Aurora and login motion respect reduced-motion preferences. The supplied logo is preserved. Navigation and welcome text support English, Spanish, French, Hindi and Arabic, with locale-aware dates and Arabic layout direction; editor and catalog helper copy remains English.

## Template catalog

20 individually authored source projects cover 20 industries and 16 design styles. The old palette variants were retired. Every entry owns a distinct DOM composition, custom layout CSS and domain-specific vector illustration. Each entry has an actual rendered screenshot, isolated preview and complete downloadable ZIP. Downloads include HTML, CSS, JavaScript, SVG assets, package scripts, README, a Node backend and SQLite storage for submissions and accounts. Shopping carts, filters, task tools and reading lists run locally. Contact submissions are saved locally; payments and email delivery are not connected. Admin tasks are browser-local and scoped by account, rather than a cloud-synced task service.

`lib/designs.js` defines individually authored layouts, styles and vector artwork. `lib/catalog.js` provides their metadata. `lib/catalog-integrity.js` rejects duplicate DOM structures even when text or colors change, and rejects duplicated artwork or design source. `lib/templates.js` renders the category-specific projects. The current 20-item collection is filtered from its manifest and paginated. Sources generate only when requested. Large-scale search should move all facets to indexed database queries before scaling. To expand the library, author a new composition and meaningful interaction, provide unique artwork, capture a 1280×760 browser screenshot, update its source/image hashes in public/screenshots/manifest.json, then run all tests. Cosmetic layout clones are rejected during server startup. Stale or duplicate previews fail tests. The application currently contains 20 distinct templates. Industry, project type, framework, style and functionality filters are combined with search. All current exports use HTML/CSS/JavaScript and Node, the framework option reflects that actual stack. Larger catalog scale has not been load-tested.

## Validation

```sh
node --test tests/*.test.js
node --check server.js
node --check public/app.js
```

The suite extracts, builds, tests and launches all 20 source archives and exercises registration, login/logout, form validation, static routes and credential-file isolation. Main workflows cover account isolation, persisted projects/settings, versions, restoration and exports. Mocked provider tests cover success and errors. `catalog-validation.json` records project hashes and validation outcomes.

Optional live integration test with the local QA account and a configured key:

This legacy local QA helper requires `AUTH_LEGACY_PASSWORD=true` on a non-production local server and `STUDIO_TEST_EMAIL` / `STUDIO_TEST_PASSWORD` for an existing local test account. Never enable legacy authentication on production. Test credentials are not bundled.

```sh
node tests/live-groq.mjs
```

The live Groq connection, enhancement and HTML generation passed on October 9, 2026; generated JavaScript passed syntax validation. Evidence is in `qa/live-groq-result.json`.

## Hosting status

Vercel uses the Node application preset and Node 24. Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN as server-only environment variables for persistent accounts, sessions, projects and versions. The app refuses to start on Vercel without remote storage. Local installations retain SQLite. Atomic writes and database-backed auth/AI limits work across instances. AI usage is limited to 40 requests per user and 200 globally per day. Configure GROQ_API_KEY and optionally GROQ_MODEL on the server. Never use NEXT_PUBLIC_ or VITE_ prefixes for credentials. The health endpoint /api/health checks database access without exposing credentials. Operational monitoring, backups, verified email/password recovery and large-scale load testing remain production follow-ups.

