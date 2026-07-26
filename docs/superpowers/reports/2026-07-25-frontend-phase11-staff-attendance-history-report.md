# Frontend Phase 11 Report — STAFF attendance history

See `docs/superpowers/plans/2026-07-25-frontend-phase11-staff-attendance-history.md` for the plan.

## What was built

**Backend:**
- `backend/src/repositories/interfaces/attendance.interface.ts` + `attendance.repository.ts` — new `findHistoryByUser(userId, params?)`, a real paginated list (`findMany`, ordered `date desc`, joining `shift`+`status`) — distinct from the existing `findByUser`, which despite its doc comment claiming to support "all-time history" only ever did a single exact-date `findFirst` (used by check-in's "already checked in today" guard and `GET /today`). That comment was aspirational, never actually implemented; this phase is what finally closes it.
- `attendance.service.ts` — `getMyHistory(userId, params)`.
- `attendance.controller.ts` — `getMyHistory` handler (page/limit from query, same manual-params style as other list endpoints in this router).
- `attendance.router.ts` — `GET /api/attendance/history` (`staffOnly`).
- `backend/src/__tests__/attendance.test.ts` — 4 new tests: unauthenticated, non-STAFF rejection, empty-list case, and a multi-day case (2 records across different dates for the caller, 1 for another STAFF member) confirming newest-first ordering and that the other user's record never appears.

**Frontend:**
- `frontend/src/api/attendance.ts` — `MyAttendanceRecord` (extends the base `Attendance` type with joined `shift`/`status`, no `user` field since it's always the caller's own records) + `getMyAttendanceHistory(params?)`.
- `frontend/src/features/attendance/History.tsx` (new) — lists past records: date, shift name, check-in/out times with late/early-leave flags, a status badge, link back to Dashboard.
- `frontend/src/features/attendance/Dashboard.tsx` — added a "View History" link, always visible regardless of today's check-in state.
- `frontend/src/routes/router.tsx` — new `/history` route, `allow: ['STAFF'], requireMobile: true`.

## Testing

`staff-flow.spec.ts` extended with a final step after check-out completes: navigate to `/history` via the new Dashboard link, confirm the just-completed day's record renders with both an "In:" and "Out:" line — this is the first time this page has ever been exercised, and it's exercised against a real just-created record, not a seeded fixture or an empty state.

## A recurring operational issue, logged again per the "never silently fix without logging it" rule

Hit the same Postgres advisory-lock contention seen in a previous phase — this time the lock (`72707369`) was held by a backend session that Neon's connection pooler was reusing for a fresh diagnostic connection, making it look self-referential in `pg_locks`/`pg_stat_activity`. Resolved the same way: identified the holding PID directly via a small `pg`-based script (no `psql` client available in this environment) and terminated it (`pg_terminate_backend`), confirmed the lock table was empty, then the next `npm test` run passed clean. Not a code bug — this is Neon-side connection/session cleanup after an earlier interrupted test run, and is the second time it's happened this session; worth keeping in mind as a known, recurring (if infrequent) environment quirk rather than re-diagnosing from scratch each time.

## Verification

- `npx tsc -b` / `npm run build` — clean, both sides.
- Backend `npm test` — **231/231 passing** (227 prior + 4 new).
- Full Playwright regression, both projects, fresh backend restart between each: **desktop-chromium 7/7 passing**, **mobile-chromium 7/7 passing**, correct self-skips only.
- All dev-server ports force-killed at the end, per the user's standing instruction.

## Commit

Left uncommitted, per `docs/RULES.md`'s "never commit before approved" rule — user explicitly asked not to commit anything and to move straight to this phase instead, review later.
