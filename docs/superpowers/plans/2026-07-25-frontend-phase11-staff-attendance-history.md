# Frontend Phase 11 — STAFF attendance history

## Context

Last standing candidate from the earlier phase-suggestion list: STAFF's Dashboard only ever showed today's status — no way to see past days at all. No screen existed and no backend endpoint supported it either; the only per-user lookup available (`attendanceRepository.findByUser`) does a single exact-date match, used internally by `checkIn`/`getToday`, not a real paginated history list.

## Plan

**Backend:**
- New `findHistoryByUser(userId, params?)` on `attendance.repository.ts`, mirroring `findByDate`/`findByLate`'s shape (paginated, joins `shift`+`status`), ordered by `date desc`, scoped to `user_id`.
- `attendance.service.ts`/`controller.ts`/`router.ts` — thin `getMyHistory` wrapper, new `GET /api/attendance/history` route (`staffOnly`).
- Tests added to `attendance.test.ts`: 401/403, empty-list case, and a multi-day case confirming newest-first ordering and that another STAFF member's records never leak in.

**Frontend:**
- `api/attendance.ts` — `MyAttendanceRecord` type (joins `shift`/`status`, no `user` since it's always the caller's own) + `getMyAttendanceHistory(params?)`.
- `features/attendance/History.tsx` (new) — lists past records (date, shift name, in/out times, late/early-leave flags, status badge), link back to Dashboard.
- `Dashboard.tsx` — added a "View History" link (always visible, not conditional on today's attendance state).
- `router.tsx` — new `/history` route (`allow: ['STAFF'], requireMobile: true`).
- `staff-flow.spec.ts` extended: after completing check-in → checklist → check-out, visits `/history` and confirms the just-completed day's record renders (first real exercise of this page, not just an empty-state check).

## Verification

- `npx tsc -b` / `npm run build` clean, both sides.
- Backend `npm test` full suite green, including new history tests.
- Full Playwright regression, both projects, fresh backend restart between each.
