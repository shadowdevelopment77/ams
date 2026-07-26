# Frontend Phase 10 Report — SUPERVISOR visit-logging flow

See `docs/superpowers/plans/2026-07-25-frontend-phase10-supervisor-visit-flow.md` for the plan.

## What was built

**Backend:**
- `backend/src/modules/company/company.router.ts` — restructured from `router.use(authMiddleware, roleMiddleware('ADMIN'))` (blanket) to explicit per-route middleware. `GET /` and `GET /:id` now accept `ADMIN` or `SUPERVISOR`; `POST`/`PUT`/`DELETE` remain `ADMIN`-only.
- `backend/src/repositories/implementors/visit-log.repository.ts` — `findByUser`'s `include` gained `user: {select:{id,name}}` alongside the existing `company` join, so `/my-visits`'s response shape is consistent with the admin list's (`findAll`) shape — the frontend's single `VisitLog` type now honestly matches both endpoints instead of silently missing a field on one of them.
- `backend/src/__tests__/company.test.ts` — the two stale "rejects a non-ADMIN user" tests for `GET /api/company`/`GET /api/company/:id` (which used a SUPERVISOR account) were replaced with "rejects a STAFF user" (STAFF still correctly blocked) plus two new tests confirming SUPERVISOR can now read both endpoints.

**Frontend:**
- `frontend/src/api/visit.ts` — `createVisitLog(companyId, photo, notes?)` and `getMyVisits(params?)`.
- `frontend/src/features/visit/VisitDashboard.tsx` (new) and `LogVisit.tsx` (new) — SUPERVISOR's landing page and visit-logging form, built as direct structural mirrors of `attendance/Dashboard.tsx` and `attendance/CheckIn.tsx` respectively (same component shapes, same spam-guard pattern, same `PhotoInput` reuse).
- `frontend/src/routes/router.tsx` — `/visits` and `/visits/new`, both `allow: ['SUPERVISOR'], requireMobile: true`.
- `frontend/src/features/auth/LoginPage.tsx` — redirect logic now branches three ways instead of two.

## Two real bugs found and fixed before this feature could work at all

1. **`GET /api/company` was ADMIN-only**, with no way for a SUPERVISOR to discover companies to log a visit against — flagged as a known gap since the very first STAFF-flow planning session, never closed until this phase actually needed it.
2. **`LoginPage`'s redirect would have sent SUPERVISOR to `/`** (STAFF-only), immediately failing the role check and bouncing back to `/login` — never hit before because no SUPERVISOR frontend existed to expose it.

Both are exactly the kind of gap this project's own planning docs predicted ("both are real, both are fast-follows once STAFF flow is proven out") — closed now that the fast-follow actually arrived.

## Fixtures

`e2e-test-seed.ts` already seeded a fixed-identity supervisor (`E2E Playwright Supervisor`) with one visit log as of Phase 7 (for the admin search-picker test), but never exposed a `supervisorPassword` in its output — Phase 7 only ever needed to *search for* this account's name, never log in as it. Added the missing field so `supervisor-flow.spec.ts` could actually authenticate.

`supervisor-flow.spec.ts` (new): logs in as the seeded supervisor, confirms the pre-existing seeded visit renders on the dashboard (proving the list isn't just an empty-state check), logs a second real visit to the same company on the same day (explicitly proving SUPERVISOR's no-one-visit-per-day-limit rule), confirms both visits show.

## Verification

- `npx tsc -b` / `npm run build` — clean, both sides.
- Backend `npm test` — **227/227 passing** (225 prior + 2 new company-access tests).
- Full Playwright regression, both projects, fresh backend restart between each: **desktop-chromium 7/7 passing**, **mobile-chromium 7/7 passing** (the new supervisor-flow test correctly runs only on `mobile-chromium`, same mobile-only rule as STAFF).
- All dev-server ports force-killed at the end, per the user's standing instruction.

## Not done in this pass

- SUPERVISOR's own visit *history* beyond today (matches the same "today only" scope STAFF's dashboard already has — `GET /api/visit/my-visits` defaults to today's date server-side).
- Geolocation capture in the visit-logging form — the backend supports optional `latitude`/`longitude` (triggering reverse-geocoding into `location_address`), but capturing it client-side wasn't asked for and adds a browser permission prompt that would complicate E2E testing; left as a possible future enhancement.

## Commit

Left uncommitted, per `docs/RULES.md`'s "never commit before approved" rule.
