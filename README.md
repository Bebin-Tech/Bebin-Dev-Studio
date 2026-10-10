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


## Database-backed app builder

New Studio generation now produces an application specification and a compiled, tested Node 24 backend rather than a UI-only HTML document. Local generation supports CRM, ERP/inventory, education, booking requests, finance, productivity, landing-page inquiries and storefront catalogs/unpaid orders. Groq produces a validated specification with up to eight modules and twelve fields each; it cannot execute arbitrary server code. The generated UI exposes real account creation, login/logout, record create/read/update/delete, search, pagination, database-backed inquiries and storefront orders. The catalog's Build backend from brief action now creates an app using this runtime; original authored design ZIPs remain available as separate starters.

Saved projects and versions include app_spec. Older projects are preserved; their preview explicitly says UI-only until regenerated. Restoring an old version restores its original backend status. Source edits remain in version history and downloads. Data-model changes to an app with saved records require an explicit migration or a new project; regeneration cannot silently discard its model. Source editing changes the frontend, not the validated backend data model; extend application.json and backend source in a downloaded project for custom business logic.

### Preview isolation

Sandboxed generated frames never receive Studio cookies or provider secrets. They send only whitelisted runtime requests through a message bridge checked against the exact active iframe window and its opaque origin. Studio validates project ownership and dispatches to the same API implementation used in exports. Separate tables namespace users, sessions, records and audit history by project. Preview session tokens are hashed and mapped server-side to the owning Studio user, so sessions restore without browser token storage. Preview account registration grants administrator access because only the owning Studio account can use that project namespace; standalone registration grants member access. Preview data/accounts are not exported. Project deletion removes its isolated records, users and sessions.

### Complete source ZIP

New app downloads include frontend HTML/styles/scripts, server.js, backend API routes and validators, database adapter, SQL migrations, application.json, blank .env.example, package.json, build/migration commands, independent end-to-end tests, Dockerfile, README and a preview source/checksum manifest. The frontend is extracted from the exact saved preview document into editable files. The existing HTML-only export remains available, but requires its backend to perform data operations.

Extract and open in VS Code with Node.js 24. Run npm install; copy .env.example to .env and configure a new administrator email/password; run npm run db:migrate, npm run build, npm test and npm start. Open http://127.0.0.1:4173. Local SQLite persists in data/. Production requires HTTPS, a durable data volume or Turso, and application-specific environment values. The downloaded server refuses incomplete production storage/origin configuration. Administrator credentials are bootstrap-only; after creation remove ADMIN_PASSWORD while retaining ADMIN_EMAIL. No Studio credentials, users or private database rows are bundled.

### Security and integrations

Generated password authentication uses asynchronous salted scrypt hashes, hashed expiring sessions, HTTP-only SameSite cookies and Secure/__Host- cookies on production HTTPS. JSON mutation requests require X-App-Request: 1 and valid browser origin; no CORS access is enabled. APIs use parameterized SQL, ownership checks, admin checks, input limits and rate limits. Forms remain saved if notification delivery fails. Orders calculate totals from server prices and are explicitly unpaid. Optional email uses Resend with a verified sender; optional AI uses Groq behind authenticated backend requests. Provider keys stay server-side and are blank in exports.

This compiler supports database record applications, not every possible product or integration. Known unsupported requests such as payment processing, OAuth, uploads, password recovery, realtime messaging and booking capacity automation are rejected rather than silently advertised as working. Additional custom business rules and providers require implementation and verification. The UI shows included modules and launch requirements; it does not label arbitrary generated apps production-ready. Test HTTPS, provider credentials/delivery, backup restore, privacy requirements and expected load before publishing your own app.

### Verification

The regression suite builds, migrates and independently runs eight generated application types; tests cover register/login/logout, ownership isolation, invalid fields, CRUD, inquiries, server-priced orders, CSRF protections, private-file denial, sessions and data after restart. SQLite and libSQL namespace tests exercise mocked provider success/failure and rate limits. The source reconstruction test verifies extracted frontend files match the saved preview. Browser QA registered a CRM preview account, saved a contact and inquiry, restored its session, downloaded the actual ZIP, installed it with zero reported npm vulnerabilities, migrated/built/tested it and verified standalone login, database writes and session restoration. Legacy authored template tests remain in place.

Reference APIs: [Node crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html), [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html). Security reviews and real-provider verification remain necessary for a final public application.
