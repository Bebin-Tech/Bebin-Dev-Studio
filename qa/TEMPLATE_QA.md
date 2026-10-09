# Template redesign verification — October 9, 2026

The former 36 entries were 12 shared page structures multiplied by three palette/font variants. Their common header, split hero, orb illustration, card grid and footer caused the visual repetition.

The new catalog contains 20 authored compositions across 20 industries, with 16 styles and 20 domain illustrations. `lib/designs.js` owns each layout; `lib/catalog.js` supplies metadata; `lib/industry-client.js` supplies tested local controls. Downloads and previews use the same render pipeline. Framework filtering honestly lists the currently supported HTML/CSS/JavaScript + Node stack.

Nine automated test groups passed. Validation includes ZIP extraction, syntax/build checks, bundled project tests, running all 20 downloaded servers, asset serving, forms, login/logout, private account workflows, persistence, combined filters, duplicate rejection and exact preview/source parity. Every captured screenshot has a source hash and image hash in `public/screenshots/manifest.json`. Identical DOM compositions, artwork and design source are rejected; stale and duplicate screenshot files fail tests. These checks are admission gates, not a substitute for visual review of new designs.

Browser checks passed for:

- E-commerce category filters, cart additions and calculated totals.
- Finance expense creation and savings calculations.
- Kanban task creation and movement to Done, with updated progress.
- Social feed posting, likes and popularity ordering.
- Habit creation, daily completion and streak display.
- Education, healthcare, real-estate, travel, restaurant, portfolio, entertainment, agency and fitness filters.
- Energy estimates and combined industry/type/framework/style/function filters.
- All 20 illustrations loaded; all 20 mobile pages fit a 390px viewport without horizontal overflow.
- Actual browser-downloaded `ledger.zip` extracted, built, passed its bundled test and ran on port 4180. Its expense state persisted after reload; its savings calculator returned the expected result. The temporary server was stopped after testing.

The main application remains local at port 3000. No deployment occurred. Forms save requests to local SQLite; they do not confirm appointments/bookings or send email. Storefront carts do not process payments. Finance and energy calculators are arithmetic demonstrations. Social feeds, expenses, boards and habits are stored in the browser, not a multi-user cloud service. AI requires a configured backend Groq key.
