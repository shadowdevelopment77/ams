# Sharpen the app — Move-Company/roster bugs, inactive-user guard, checklist grouping, manual test data

## Context

User did real manual testing of the admin panel (create staff → move company → deactivate) and found real bugs, plus wants a UI restructure and bulk test data. Investigated via 2 Explore agents before planning.

**Bugs found:**
1. `StaffPage.tsx`'s `handleDelete` only invalidates `['admin','users']`, never `['admin','roster', ...]` — roster can show a just-deactivated staffer as still "Active."
2. Neither `moveToCompany` nor the "Move Company" button check `is_active` — an inactive user can still be moved.
3. Root cause of an orphaned-user finding: `UserCompanyRole` has no unique constraint on `user_id`, and its company/division FKs use `ON DELETE SET NULL` instead of the app's normal soft-delete-only pattern — a hard-delete (e.g. via Prisma Studio) silently nulls out the FK, bypassing the "blocked if active staff assigned" rule.

**Decisions:** keep company/division intact on deactivation (just block moves); fix the schema root cause now; reuse the existing `admin@ams.local` for seed data.

**Also requested:** group the Checklists admin page's photo grid by checklist item with a "…see more" expand; add bulk manual-test data (3 companies, 2-3 divisions each, 13 STAFF + 1 SUPERVISOR).

## Plan

**A.** `StaffPage.tsx`'s `handleDelete` invalidates `['admin','roster']` too; `moveToCompany` rejects inactive users (400); "Move Company" button hidden for inactive rows.

**B.** `UserCompanyRole` gets `@@unique([user_id])` + `onDelete: Restrict` on company/division relations — new migration, after checking/cleaning any existing duplicate rows in the dev DB.

**C.** `ChecklistsPage.tsx`'s `PhotoGrid` groups already-fetched records by `item.id`, shows first 4-5 photos per group + a "…see more" expand toggle — pure client-side change, no backend/API change needed.

**D.** New `backend/scripts/manual-test-seed.ts` — 3 companies × 2-3 divisions (7 total), 13 STAFF + 1 SUPERVISOR, reuses `admin@ams.local`, direct-Prisma (mirrors `factories.ts`), idempotent, prints credentials.

## Verification

- `tsc`/build clean, both sides.
- Backend `npm test` green + new coverage (inactive-move rejection, unique constraint).
- Manually run the seed script against dev DB, confirm data + logins work.
- Full Playwright regression, both projects, fresh backend restart between each.
