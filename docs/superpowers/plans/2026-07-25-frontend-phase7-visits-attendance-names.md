# Frontend Phase 7 — Admin panel: real names instead of raw IDs

## Context

User flagged a real backend/frontend gap in the admin panel: the Visits page showed raw `user_id`/`company_id` instead of names (the page even had a standing comment admitting this), and the "search photos by staff member" control was a plain text box requiring a pasted user UUID. Explicit ask: show supervisor name + company name, let the photo search be done by name — no raw ID should ever be visible to the admin using this panel.

Investigated and confirmed exact root causes before building:

1. `GET /api/visit`'s list query had no `include` at all — the repository had no `findAll` override, so it fell through to the generic base repository's plain `findMany`.
2. The "photos by user" endpoint already fetched the company join and threw it away in its response mapping.
3. Attendance's photo view had the identical smaller gap (join existed, mapping discarded it, and the frontend never rendered a name at all).
4. No name-search existed for users — `GET /api/users` was pagination-only, no `search` param, and didn't return `role` (role lives in a separate junction table).

User decisions: fix the Attendance photos sibling gap in the same pass; restrict the user-search picker to SUPERVISOR accounts only via a join through `UserCompanyRole`.

## Plan

**Backend**: add a `findAll` override on `visit-log.repository.ts` joining `user`/`company` names; fix `visit.service.ts`'s `getVisitPhotos` and `attendance.service.ts`'s `getAttendancePhotos` to surface the names their queries already join instead of discarding them; extend `GET /api/users` with optional `search` (name contains) and `role` (resolved via the existing `roleRepository.findByName()`, joined through `UserCompanyRole`) params.

**Frontend**: update `visit.ts`/`attendance.ts`/`user.ts` API types to match; rebuild `VisitsPage.tsx`'s table and photo picker around names, with a debounced name-search combobox restricted to `role: 'SUPERVISOR'`; add a name label to `AttendancePage.tsx`'s photo cards.

**Testing**: backend unit tests for the new join/params; extend `e2e-test-seed.ts` to seed a supervisor + visit log directly via Prisma (not the HTTP API, to avoid spending 2 more requests against the tight `authLimiter` budget); extend `admin-panel.spec.ts` to assert names render and exercise the search-and-pick flow end-to-end.

## Verification

- `npx tsc -b` / `npm run build` clean both sides.
- Backend `npm test` full suite green, including new tests.
- Full Playwright regression, both projects, fresh backend restart between each (this suite's real auth-call count sits right at the edge of the rate limiter's budget in one continuous run).
