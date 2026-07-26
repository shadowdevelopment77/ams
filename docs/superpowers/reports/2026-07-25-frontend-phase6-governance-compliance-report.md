# Frontend Phase 6 Report — Governance Compliance

See `docs/superpowers/plans/2026-07-25-frontend-phase6-governance-compliance.md` for the plan. This covers what was actually found and fixed, including several real bugs beyond the original scope, surfaced only once full end-to-end verification was actually run instead of assumed.

## 1. Port / "fail to fetch" issue — three real, compounding causes found

The user reported Vite kept landing on inconsistent ports (5173 vs 5174) and that fetch still failed even with a "locked" port. Diagnosed live, not guessed:

1. **`frontend/vite.config.ts` had lost its `server.port`/`strictPort` config entirely** (present earlier in the session, gone by this one — reverted at some point, by whom is not established). Without it, Vite silently falls back to 5173 whenever nothing else claims it first, which is the exact "always changes" symptom. Fixed: restored `server: { port: 5174, strictPort: true }`.
2. **Codespace ports 3000 and 5174 had reverted to `private` visibility.** This is a Codespace default (resets are normal, not something anyone broke), and it disguises itself as a CORS failure: a private port silently 302-redirects unauthenticated requests to a GitHub sign-in gate, which `fetch()` can't follow. Confirmed via `curl -i` showing `401`/`www-authenticate: tunnel`. Fixed: `gh codespace ports visibility {3000,5174}:public`.
3. **`backend/.env`'s `CORS_ORIGIN` only ever held one origin at a time**, requiring a manual edit + backend restart every time testing switched between `localhost` (Playwright, which runs inside the Codespace) and the forwarded Codespace URL (the user's own external browser). This is the exact back-and-forth that caused repeated confusion earlier in the session. Fixed with the user's approval: `backend/src/app.ts`'s CORS origin is now parsed as a comma-separated list (`allowedOrigins = CORS_ORIGIN.split(',')`), and `backend/.env` now lists both `http://localhost:5174` and the forwarded URL simultaneously — no more flipping required going forward.

All three verified together via `curl` against the real forwarded URLs (not `localhost`) with a matching `Origin` header: login → 200 + session cookie, `GET /api/auth/me` → 200 with the cookie honored.

## 2. A fourth, deeper bug found only once Playwright ran end-to-end: cross-site cookie failure

Restarting cleanly with the above three fixes still left the *first* Playwright run failing everywhere with the same shape: login `POST` returns 200 and sets the session cookie, but the very next `GET /api/auth/me` returns 401. Root-caused via the backend's own request log, not assumed: `frontend/.env.local`'s `VITE_API_URL` pointed at the forwarded backend URL (`https://...-3000.app.github.dev`) while Playwright loads the frontend via `http://localhost:5174`. `localhost` and `*.app.github.dev` are different **sites** (confirmed against the public suffix list — `.dev` is a real gTLD, `app.github.dev` isn't separately listed), so the session cookie's `SameSite=Lax` correctly refuses to attach on the follow-up cross-site `fetch()`. This isn't a CORS problem — `Access-Control-Allow-Origin` was already correct — cookies and CORS are separate gates and both must pass.

Fixed **for the Playwright verification pass only**: `VITE_API_URL` set to `http://localhost:3000` (same-site as `localhost:5174`) for the duration of testing, then reverted back to the forwarded backend URL once verification was complete, since the user's own manual browser access goes through the forwarded frontend URL — which is same-site with the forwarded backend URL, so the cookie flows correctly there too. `playwright.config.ts`'s `baseURL` was similarly reset to `http://localhost:5174` (it had been mistakenly pointed at the forwarded URL mid-session — Playwright runs inside the Codespace and never needs it).

## 3. A fifth bug, found only after the cookie fix: `authLimiter` blanket-mounted on `GET /api/auth/me`

With the cookie issue fixed, a full suite run still failed non-deterministically depending on how many prior auth calls had already run: `authLimiter` (10 requests/15min) was mounted on the *entire* `/api/auth` router in `app.ts`, including `GET /api/auth/me` — the passive "am I still logged in" check the frontend calls on every page load and refresh. This isn't a test-only problem: a real logged-in user with the app open on a couple of tabs, or who refreshes a few times, could exhaust the same 10-request budget meant to stop login/register brute-forcing and get locked out of their own already-valid session for up to 15 minutes.

**Flagged to the user before fixing** (this touches security-relevant rate-limiting config, outside this phase's original scope) — approved. Fixed: `authLimiter` moved from the blanket `app.use("/api/auth", authLimiter, authRouter)` mount in `app.ts` down to per-route application inside `auth.router.ts`, applied only to `POST /register`, `POST /login`, `POST /logout` (the actual brute-force-relevant endpoints). `GET /me` now runs under the ordinary `apiLimiter` (100/15min) like every other read endpoint. `backend/npm test` re-run after this change: still 220/220, confirming nothing depended on the old blanket mount.

## 4. A sixth, smaller bug: hardcoded stale port in `staff-flow.spec.ts`

Even after all of the above, `mobile-chromium`'s `staff-flow.spec.ts` still failed on three `toHaveURL('http://localhost:5173/')` assertions — a literal leftover from before the port was pinned to 5174. Fixed by making all three assertions relative to `baseURL` (`toHaveURL(/\/$/)`) instead of hardcoding any port, so this class of bug can't recur if the port ever changes again.

## 5. Spam-guard: logout buttons

Audited every mutating action for a pending-state guard on its submit control. Found and fixed **three** unguarded logout buttons (one found in the initial audit, a second found in a follow-up sweep once `tsc -b` was already clean): `AdminLayout.tsx`, `Dashboard.tsx`, and `MobileOnlyGate.tsx`. Each now has a local `isLoggingOut` state set before calling `logout()`, with `disabled={isLoggingOut}` on the button — matching the exact `isSubmitting`/`isDeleting` pattern already used everywhere else in the codebase (login, check-in, check-out, checklist submit, every admin CRUD dialog, `ConfirmDialog`). No new abstraction introduced.

## 6. Screenshot reorganization

Moved all 23 existing screenshots out of `frontend/e2e/screenshots/` into the pre-existing root `Screenshot/` folder, split by phase:
- `Screenshot/phase3.5-device-gate/` — `01`–`08` (from `auth-and-device-gate.spec.ts`)
- `Screenshot/phase4-staff-flow/` — `10`–`16` (from `staff-flow.spec.ts`)
- `Screenshot/phase5-admin-panel/` — `admin-01`–`admin-08` (from `admin-panel.spec.ts`)

Used `git mv` for the tracked files (preserves history) and plain `mv` + `git add` for the ones that were still untracked. Updated each spec file's single `SCREENSHOT_DIR` constant to point at the new relative path. Old `frontend/e2e/screenshots/` directory left empty (not deleted — nothing to delete, and the "never remove a screenshot" rule means moving, not discarding, was always the intent).

## Verification

- `npx tsc -b` — clean.
- Full Playwright regression, run per-project with a fresh backend restart between each (this suite's real, continuous auth-call count — logins, registers, logouts across both projects — sits right at 11 in a single unbroken run, one over the 10/15min `authLimiter` budget; splitting by project rather than further loosening the limiter was the chosen fix, consistent with this session's established "restart before testing" workflow): **desktop-chromium 6/6 passed** (2 correctly self-skip), **mobile-chromium 6/6 passed** (2 correctly self-skip).
- Backend `npm test` — **220/220 passing**, confirming the CORS and rate-limiter changes introduced no regressions.
- Manual end-to-end verification via `curl` against the real forwarded Codespace URLs with a matching `Origin` header: login → 200 + session cookie, `GET /api/auth/me` → 200 with the cookie honored, frontend page → 200.
- Final state left running for the user's own manual testing: `VITE_API_URL` back to the forwarded backend URL (matches the user's own browser access pattern, same-site with the forwarded frontend URL so cookies work), `CORS_ORIGIN` now holds both `localhost:5174` and the forwarded URL simultaneously so no further manual flipping is needed between Playwright runs and manual testing.

## Not done in this pass

- i18n — explicitly deferred per `CLAUDE.md`'s own instruction not to start it mid-development.
- No further rate-limiter tuning beyond the `/me` exemption — the exact threshold (10/15min on login/register/logout) is an intentional security value, not touched.

## Commit

Left uncommitted, per `docs/RULES.md`'s "never commit before approved" rule and this session's standing working agreement.
