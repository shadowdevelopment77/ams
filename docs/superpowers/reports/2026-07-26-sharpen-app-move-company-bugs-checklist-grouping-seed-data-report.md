# Sharpen the app Report — Move-Company/roster bugs, inactive-user guard, checklist grouping, manual test data

See `docs/superpowers/plans/2026-07-26-sharpen-app-move-company-bugs-checklist-grouping-seed-data.md` for the plan.

## What was built

**A. App-level bug fixes**
- `StaffPage.tsx`'s `handleDelete` now also invalidates `['admin', 'roster']` (was only invalidating `['admin', 'users']`), so the roster no longer shows a stale "Active" row right after deactivating someone.
- `user.service.ts`'s `moveToCompany` now rejects (400, "Cannot move an inactive user") if the target user's `is_active` is false.
- `StaffPage.tsx`'s roster row only renders "Move Company" when `entry.userRole.name === 'STAFF' && entry.user.is_active`.

**B. Schema hardening** — confirmed and fixed the actual root cause
- Found and reproduced the exact bug in the dev DB: a STAFF user ("shadow") with `company_id`/`division_id` both `null`, `updated_at` an hour after `created_at` — consistent with a move having wiped the assignment. A second orphaned "shadow" test account was also found. Both were disposable manual-test accounts with no attendance/session data — deleted per your choice.
- `UserCompanyRole` had no unique constraint on `user_id` and its company/division FKs used `ON DELETE SET NULL` (traced to migration `20260524071053_add_visit_log_and_refactor`, which silently regressed an earlier, stricter `ON DELETE RESTRICT` from the very first migration). New migration `20260726040312_unique_user_company_role_restrict_delete` adds `@@unique([user_id])` and restores `onDelete: Restrict` on both FKs — a hard-delete of a Company/Division now fails loudly instead of silently nulling out a staff assignment.
- Applied to both the dev DB and (automatically, via `globalSetup.ts`) the test DB.

**C. Checklist admin page — grouped by item**
- `ChecklistsPage.tsx`'s `PhotoGrid` now groups the already-fetched photos by checklist item (heading = item description), each group shown as a horizontally-scrolling row capped at 5 visible photos, with a "…see more (N)" toggle per group that expands to show the rest. Pure client-side restructure — no backend/API changes needed, since `getChecklistPhotosByDivision`/`getChecklistPhotosByUser` already return every submission for the scope in one request.

**D. Manual-test seed data**
- New `backend/scripts/manual-test-seed.ts` (idempotent, direct-Prisma, run via `npx ts-node scripts/manual-test-seed.ts`): 3 companies (PT Sanjaya Abadi: Security/Cleaning/Driver; PT Mitra Sejahtera: Security/Cleaning; CV Berkah Jaya: Security/Cleaning — 7 divisions total), 13 STAFF distributed 2-per-division (1 division gets 1), 1 SUPERVISOR, reuses the existing `admin@ams.local` (no second admin created). One default shift per division so STAFF can actually check in. Shared password `Password123!`, printed to console along with every created account as a table.
- Ran once against the dev DB, then re-ran after the Playwright suite's fixture reset wiped it (confirmed idempotent both times — no duplicate-key errors).

## Testing

- Backend: added "rejects moving a deactivated STAFF member" (confirms the 400 + that the original assignment is untouched) and a direct-Prisma test confirming the new unique constraint actually rejects a second `UserCompanyRole` row for the same user. Full suite: **247/247 passing**.
- Frontend: clean `tsc -b` / `npm run build`.
- Full Playwright regression, both projects, fresh backend restart between each: **desktop-chromium 7/7**, **mobile-chromium 7/7**, correct self-skips only.

## Commit

Left uncommitted, per your standing "review later" pattern. The new migration file is included in that uncommitted state — flagging since migrations are usually treated as more permanent than other file changes, but keeping it consistent with everything else this session until you review.

## Dev servers left running (deliberate deviation from the usual "kill all ports" habit)

Since the explicit point of this phase is for you to manually test right now, both dev servers are left **running** (backend on 3000, frontend on 5174, both port-visibility set to public) instead of being killed at the end of this turn. `frontend/.env.local` is pointed at your forwarded Codespace URL. The dev DB has the manual-test seed data loaded — log in as `admin@ams.local` / `Admin123!`, or any of the 13 staff / 1 supervisor accounts printed by the seed script, password `Password123!` for all of them.
