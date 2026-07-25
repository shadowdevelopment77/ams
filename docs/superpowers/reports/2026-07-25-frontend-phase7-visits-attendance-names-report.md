# Frontend Phase 7 Report — Admin panel: real names instead of raw IDs

See `docs/superpowers/plans/2026-07-25-frontend-phase7-visits-attendance-names.md` for the plan. This covers what was actually built and every real bug found along the way — this pass turned up more issues than expected, each logged here as found.

## Backend changes

1. **`backend/src/repositories/implementors/visit-log.repository.ts`** — added a `findAll` override with `include: { user: {select:{id,name}}, company: {select:{id,name}} }`, matching the pattern `attendance.repository.ts`'s `findByDate`/`findByLate` already use for the same problem. The interface's declared return type (`PaginatedResult<VisitLog>`) stays narrower than what's actually returned at runtime — the same established, working idiom this codebase already uses elsewhere (TypeScript's structural typing allows a return value with extra properties; the frontend independently types the richer shape it actually receives).
2. **`backend/src/modules/visit/visit.service.ts`** — `getVisitPhotos`'s response mapping was discarding the `company` object its own query already joined (via `findByUser`'s existing `include`), only keeping `company_id`. Now returns `company: {id, name}`.
3. **`backend/src/modules/attendance/attendance.service.ts`** — same bug, smaller: `getAttendancePhotos` discarded the already-joined `user` object, keeping only `user_id`. Now returns `user: {id, name}`.
4. **`GET /api/users` gains `search` and `role` query params**:
   - `backend/src/repositories/interfaces/user.interface.ts` — new `UserListParams` type (`search?: string`, `roleId?: number`).
   - `backend/src/repositories/implementors/user.repository.ts` — `findAllSafe` filters by `name: {contains, mode:'insensitive'}` when `search` is given, and by `company_roles: {some:{role_id, is_deleted:false}}` (joined through `UserCompanyRole`) when `roleId` is given.
   - `backend/src/modules/user/user.service.ts` — `getAll` resolves a `role` name (e.g. `'SUPERVISOR'`) to its id via the existing `roleRepository.findByName()` (already used in the registration flow) before calling the repository; an unknown role name returns an honest empty result rather than erroring.
   - `backend/src/modules/user/user.controller.ts` — threads `req.query.search`/`req.query.role` through, matching this route's existing manual-params style (no Zod schema was gating it before, none added now).

## Frontend changes

- **`frontend/src/api/visit.ts`** — `VisitLog` gains `user: {id,name}`/`company: {id,name}`; `VisitPhotoRecord` swaps `company_id` for `company: {id,name}`.
- **`frontend/src/api/attendance.ts`** — `AttendancePhotoRecord` swaps `user_id` for `user: {id,name}`.
- **`frontend/src/api/user.ts`** — `getUsers` accepts an optional `{search?, role?}`.
- **`frontend/src/features/admin/visits/VisitsPage.tsx`** — removed the "Names aren't shown here..." caveat; table columns are now `Supervisor`/`Company` rendering real names; the "Photos by staff member" control is now a debounced name-search combobox (custom-built, not a new dependency — the codebase has no combobox component yet) restricted to `role: 'SUPERVISOR'`, so the admin only ever sees and picks a name, never a raw ID; photo cards now show the company name.
- **`frontend/src/features/admin/attendance/AttendancePage.tsx`** — photo cards in the Photos view now show the staff member's name (previously showed no identifying label at all).

## Real bugs found and fixed beyond the original scope

1. **`e2e-test-seed.ts` broke fixture generation.** Adding a Prisma import to seed a supervisor+visit-log fixture (done to avoid spending 2 more requests against the tight `authLimiter` budget) caused dotenv's console banner to print to stdout, which `reset-fixtures.sh`'s `> data.json` redirect captured *ahead of* the actual JSON payload — corrupting the fixture file and breaking every spec that reads it (`SyntaxError: Unexpected token '◇'`). Fixed by having the script write `frontend/e2e/fixtures/data.json` directly via `fs.writeFileSync` instead of relying on shell redirection of its entire stdout; `reset-fixtures.sh` updated to match (no longer redirects the seed script's output).
2. **Accidental duplicate backend process** — restarted the backend mid-session via a backgrounded compound `cd && npm run dev &` command; the `cd` didn't persist to the outer shell (background compounds run in a subshell), so the restart actually re-ran inside `backend/` a second time while the frontend command that should have run there landed in the wrong directory. Caught immediately via `ps aux`, killed the stray duplicate by exact PID before it could accumulate the way the Phase 6 leak did. All subsequent restarts used `(cd dir && cmd &)` in an explicit subshell to avoid the pitfall.
3. **Transient Postgres advisory-lock timeout** on one `npm test` run (`prisma migrate deploy` couldn't acquire the lock within 10s) — not a real bug, a one-off contention from running two backend test invocations close together; resolved cleanly on retry.

## Fixtures

`backend/scripts/e2e-test-seed.ts` now also creates a fixed-identity supervisor (`E2E Playwright Supervisor` / `e2e-playwright-supervisor@test.local`) with one visit log, written directly via Prisma (not the HTTP API) specifically to stay within the `authLimiter` budget. `e2e-test-cleanup.ts` needed no changes — its existing `e2e-playwright-` email-prefix purge already covers the new supervisor account and cascades to its visit log.

`frontend/e2e/admin-panel.spec.ts` extended: asserts the `Supervisor`/`Company` column headers and a real name render in the Visits table, then exercises the full search-and-pick flow (type a partial name → see the seeded supervisor in the dropdown → click it → look up → see their real photos with the company name, scoped specifically to the photo card so the assertion can't accidentally pass just because the same company name is already visible in the table above).

## Verification

- `npx tsc -b` / `npm run build` — clean, both sides.
- Backend `npm test` — **225/225 passing** (220 prior + 5 new: visit join shape ×2, `GET /api/users` search/role/unknown-role ×3), zero regressions.
- Full Playwright regression, run per-project with a fresh backend restart between each (the suite's real auth-call count — logins/registers/logouts across both projects — sits right at the edge of the `authLimiter` budget in one continuous run, same known tension from Phase 6): **desktop-chromium 6/6 passing**, **mobile-chromium 6/6 passing**, correct self-skips only on both.
- Manual reasoning check: no raw ID renders anywhere in `VisitsPage` or `AttendancePage`'s photos view.

## Not done in this pass

- i18n — still explicitly deferred per `CLAUDE.md`.
- No further rate-limiter tuning — the per-project-run workaround stays the standing practice, matching precedent.

## Commit

Left uncommitted, per `docs/RULES.md`'s "never commit before approved" rule. All dev-server ports force-killed at the end of this pass, per the user's standing instruction.
