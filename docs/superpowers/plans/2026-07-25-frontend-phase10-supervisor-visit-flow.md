# Frontend Phase 10 — SUPERVISOR visit-logging flow

## Context

SUPERVISOR was the one role with zero frontend built — the backend has supported visit logging (`POST /api/visit`, `GET /api/visit/my-visits`) since early in the project, but no screens existed. User picked this over STAFF attendance history as the next phase.

Investigated before building and found two real, blocking gaps:

1. **`GET /api/company` was ADMIN-only.** `POST /api/visit` requires a `company_id`, but there was no way for a SUPERVISOR to discover which companies exist to pick from — this was flagged as a known gap all the way back in the original STAFF-flow planning ("SUPERVISOR's equivalent gap... visit-log creation needs a company_id"), never closed until now.
2. **`LoginPage` would have bounced a SUPERVISOR straight back to `/login`.** The post-login redirect only ever sent non-ADMIN users to `/`, which is `ProtectedRoute allow={['STAFF']}` — a SUPERVISOR landing there fails the role check immediately. Never hit before because no SUPERVISOR frontend existed to expose it.

## Plan

**Backend**: `company.router.ts` restructured from a blanket `roleMiddleware('ADMIN')` mount to per-route — `GET /` and `GET /:id` now allow `ADMIN` or `SUPERVISOR` (read-only), `POST`/`PUT`/`DELETE` stay `ADMIN`-only. Regression tests added/updated in `company.test.ts`.

**Frontend**, mirroring the existing STAFF-flow architecture exactly (same component shapes, same mobile-gating):
- `api/visit.ts` — `createVisitLog(companyId, photo, notes?)` (multipart, mirrors `checkIn()`), `getMyVisits(params?)`.
- `features/visit/VisitDashboard.tsx` — SUPERVISOR's landing page (mirrors `attendance/Dashboard.tsx`): identity line, "Log a Visit" button, a list of today's visits logged so far (no one-visit-per-day limit, so a list rather than a single status), logout.
- `features/visit/LogVisit.tsx` — the form (mirrors `attendance/CheckIn.tsx`): company `<select>` (reusing `getCompanies()`), `PhotoInput`, optional notes `Textarea`, submit.
- `router.tsx` — new `/visits` and `/visits/new` routes (`allow: ['SUPERVISOR'], requireMobile: true`).
- `LoginPage.tsx` — redirect now branches three ways (ADMIN → `/admin`, SUPERVISOR → `/visits`, STAFF → `/`).
- `e2e-test-seed.ts` extended to seed a supervisor + one visit log (already done in Phase 7 for the admin search-picker test) — reused here, plus the missing `supervisorPassword` added to the fixture output (Phase 7 never needed to log in as this account, only search for its name).
- `supervisor-flow.spec.ts` (new) — login as the seeded supervisor, see the pre-seeded visit on the dashboard, log a second real visit (same company, same day — proving no one-visit-per-day limit), see both.

## Verification

- `npx tsc -b` / `npm run build` clean, both sides.
- Backend `npm test` full suite green, including new/updated company-access tests.
- Full Playwright regression, both projects, fresh backend restart between each.
