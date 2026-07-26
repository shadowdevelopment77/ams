# Frontend Phase 5 Report — Admin Panel

See `docs/superpowers/plans/2026-07-24-frontend-phase5-admin-panel.md` for the plan and rationale. This covers what was actually built, the real bugs found along the way, and the dev-DB cleanup that came out of this phase.

## What was built

**Foundation:**

| File | What |
|---|---|
| `src/components/ui/{table,dialog,select,textarea,badge,skeleton}.tsx` | New shadcn primitives (`base-nova` style, matching the 4 already installed). The CLI's known alias bug recurred — wrote all 6 files to a literal `frontend/@/components/ui/` directory instead of resolving to `src/`. Moved manually, verified with a clean build. |
| `src/lib/formErrors.ts` | `mapApiError()` — splits an `ApiError` into per-field messages (from the backend's Zod `issues` array) and a top-level message, so Dialog forms can show inline field errors instead of only a banner. |
| `src/api/pagination.ts` | Typed `PaginatedResult<T>` + a query-string helper, matching the backend's real envelope shape (confirmed against `base.interface.ts` and test files) — with the one known exception (`GET /checklist/templates` returns a plain array) typed honestly rather than forced into the same shape. |
| `src/components/ConfirmDialog.tsx` | Shared delete-confirmation dialog, reused across every entity (Company, Division, Shift, Template, Item) rather than rebuilt five times. |
| `src/features/admin/AdminLayout.tsx` + nested routes in `router.tsx` | Sidebar + `Outlet`, mounted at `/admin` behind `ProtectedRoute allow={['ADMIN']}` (no `requireMobile` — reused as-is, no changes needed). First use of React Router's nested-route/`Outlet` pattern in this codebase. |

**Feature screens**, all frontend-only — the entire admin CRUD surface (Company, Division, Shift, Checklist templates/items, Users, Attendance/Visit read views) already existed on the backend, fully tested:

- **Companies** (`/admin/companies`) — list, create/edit/delete via Dialog.
- **Company detail → Divisions** (`/admin/companies/:id`) — same CRUD pattern, nested.
- **Division detail → Shifts + Checklist templates** (`/admin/companies/:id/divisions/:id`) — two sections on one page, since both cascade from a division.
- **Checklist items** (`.../checklists/:templateId`) — per-item `order_no`/`requires_photo`; editing an item can't change `requires_photo` (matches the backend's `updateItemSchema`, which excludes that field on purpose).
- **Staff** (`/admin/staff`) — register (STAFF/SUPERVISOR, with conditional company/division pickers matching the backend's cross-field validation), edit profile, deactivate, plus a "roster by company & division" browser — the *only* place a user's role is actually visible, since the flat `GET /api/users` list doesn't join role data at all.
- **Attendance** (`/admin/attendance`) — company/division/date-scoped, three views (All / Late only / Photos) sharing one filter state.
- **Visits** (`/admin/visits`) — list + delete, plus a photos-by-staff-member lookup (the endpoint where `date` filtering actually works).

## Two real backend gaps found, deliberately not fixed

Flagged during planning, confirmed correct by building against them:

1. `GET /api/visit`'s `date` query param is silently ignored by the service (only `page`/`limit` are read). The Visits list ships without a date filter rather than offering a UI control that would silently do nothing.
2. `GET /api/visit` also doesn't join `user`/`company` data — the list shows raw IDs, with an explicit note in the UI explaining why. No endpoint changes a user's `role`, and `PUT /api/users/:id/move-company` only works for STAFF — "promote to SUPERVISOR" isn't buildable without new backend work.

Neither blocks the panel's core CRUD; both are called out directly in the UI rather than hidden.

## Real bugs found and fixed

1. **ADMIN login redirected straight back to `/login`.** `LoginPage.tsx` always navigated to `/` after login, but `/` is `ProtectedRoute allow={['STAFF']}` — an ADMIN landing there failed the role check and bounced back immediately. Found the moment the very first Company-page smoke check tried to log in as ADMIN. Fixed by making the redirect role-aware (`user.role === 'ADMIN' ? '/admin' : '/'`), using the role already returned by `login()` directly rather than a second round-trip.
2. **`Select` showed raw IDs instead of names.** Base UI's `Select.Value` doesn't auto-derive its displayed text from the selected `SelectItem`'s children the way Radix does — without an `items` map or a children-as-function prop, it just renders the raw `value` string. Company/division pickers were showing "30", "28" instead of the company/division names. Fixed everywhere it's used (`RegisterUserDialog`, `StaffPage`'s roster browser, `AttendancePage`) with a children function that looks up the label from the already-fetched list.

## A design gap caught before it became permanent test debt

`admin-panel.spec.ts`'s first draft created a fresh, timestamped company/staff on every run with no cleanup — unlike `staff-flow.spec.ts`, which uses a fixed identity reset before each run via `e2e-test-seed.ts`/`e2e-test-cleanup.ts`. Left as-is, every future `npm run test:e2e` would leave a new orphaned company in the dev DB permanently. Caught this before committing: switched the spec to fixed names (`E2E Admin Co`, `e2e-admin-staffer@test.local`) and extended `e2e-test-cleanup.ts` to purge both fixture prefixes (`e2e-playwright-`/`E2E Playwright Co` and the new `e2e-admin-`/`E2E Admin Co`). Verified idempotency directly: ran the reset → test cycle twice in a row, confirmed the second cleanup removed exactly the first run's leftovers before recreating.

## Dev DB cleanup

While verifying each screen live, iterative testing left behind 11 throwaway companies (and their cascade-linked staff) under ad-hoc names (`Smoke Test Co`, `Nested Test Co`, `Checklist Test Co`, `Staff Test Co` ×6, an early un-cleaned `Admin E2E Co`) — from before the fixed-name convention above existed. Removed all of them via a one-time script, explicitly excluding `Manual Test Co` (predates this session, not mine to remove). Confirmed clean afterward: only the real `Admin` account and the pre-existing `Manual Test Staff` record remain outside of the managed E2E fixture prefixes.

## Verification

- `npx tsc -b` / `npm run build` — clean throughout, checked after every stage, not just at the end.
- Every screen live-verified in real Chromium via Playwright before moving to the next stage — not just type-checked. Each stage's throwaway smoke check caught something real (the login redirect bug on Company, the Select label bug on Staff) before it could compound into the next stage.
- Full regression after the phase: `auth-and-device-gate.spec.ts` 5/5 on both projects (confirms the `LoginPage` redirect fix didn't break the STAFF login path), `staff-flow.spec.ts` 1/1, `admin-panel.spec.ts` 1/1 — run on fresh backends per the established rate-limit-aware workflow (the real `authLimiter`, 10 req/15min, was hit repeatedly during iterative admin-panel development itself, always correctly attributed and never worked around).
- Backend regression: `npm test` — **220/220 passing**, zero backend production code touched this phase (only the two permanent E2E fixture scripts, extended).

## Not done in this pass (by design, matching the plan's stated scope)

- Edge-case/negative-path E2E coverage (409 conflicts, validation error surfacing beyond the golden path) — the plan explicitly scoped this phase to golden-path coverage given its size.
- Any UI for the two backend gaps above (visit date filtering, role changes) — would require new backend endpoints, out of scope per "leave backend alone unless necessary."

## Commit

Left uncommitted, per this session's working agreement — reviewed together with the rest of the session's changes before committing.
