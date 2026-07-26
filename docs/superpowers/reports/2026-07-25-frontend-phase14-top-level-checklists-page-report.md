# Frontend Phase 14 Report — Top-level Checklists admin page

See `docs/superpowers/plans/2026-07-25-frontend-phase14-top-level-checklists-page.md` for the plan.

## What was built

**Backend**
- Replaced the single-item-scoped `GET /api/checklist/evidence/item/:itemId` with two broader endpoints:
  - `GET /api/checklist/photos/by-division?companyId=&divisionId=&date=` — mirrors `getAttendancePhotos`.
  - `GET /api/checklist/photos/by-user/:userId?date=` — mirrors `getVisitPhotos`.
- Both join company/division/item/submitter context in one query (`ChecklistSubmission → item → template → company/division`, plus `attendance → user`), removing the old evidence-viewer's "timestamp only, no location" gap.
- `checklist.repository.ts` / `.interface.ts` / `.service.ts` / `.controller.ts` / `.router.ts` / `.validation.ts` all updated accordingly; `findByItemAndDate`/`getByItemAndDate` fully removed (nothing else called them).
- `checklist.test.ts` — old (nonexistent) evidence tests replaced with full coverage for both new endpoints: auth/role checks, 404s for missing company/division/user, empty states, real multi-photo data with full context assertions, and cross-division/cross-user isolation. 52 tests in this file, 242 in the full suite, all passing.

**Frontend**
- `frontend/src/api/checklist.ts` — `ChecklistEvidence`/`getChecklistEvidence` replaced with `ChecklistPhotoRecord` + `getChecklistPhotosByDivision`/`getChecklistPhotosByUser`.
- New `frontend/src/features/admin/checklist/ChecklistsPage.tsx` — top-level page with two tabs: "By Division" (cascading Company→Division Select + date, mirrors Attendance) and "By Staff Member" (debounced name search filtered to `role: 'STAFF'`, mirrors Visits). Every photo card now shows the item's `description` as its "location" label, plus company/division/submitter context and a Download button.
- `AdminLayout.tsx` + `router.tsx` — added the `/admin/checklists` nav entry + route.
- `ChecklistItemsPage.tsx` — removed the nested "View Photos" button/state/section entirely, per the consolidation decision.
- `CompaniesPage.tsx` — removed the clickable company-name link; "See more detail →" is now the only way into a company's detail page.
- `admin-panel.spec.ts` — swapped the first company's name-link navigation for "See more detail →"; removed the nested evidence test block; added coverage for both new Checklists tabs (honest empty states, matching this file's established precedent).

## A real bug found and fixed along the way

`backend/scripts/e2e-test-cleanup.ts` (shared E2E fixture-reset infra) turned out to have a pre-existing gap: it only cleaned up `ChecklistSubmission`/`Attendance` rows belonging to users matching the `e2e-*` email prefixes, but checklist items and shifts under the `E2E Admin Co`/`E2E Playwright Co` test companies could accumulate submissions/attendance from *any* user (e.g. old manual testing against the same fixed company names). This surfaced as two consecutive `RESTRICT` foreign-key violations (`ChecklistSubmission_item_id_fkey`, then `Attendance_shift_id_fkey`) the first time the reset script tried to delete a checklist item that actually had orphaned evidence attached. Fixed by cleaning up submissions/photos by `item_id` and attendance by `division_id` directly, independent of which user owns them, before deleting the items/shifts themselves. This was blocking, so it had to be fixed to get Playwright running at all — logged here rather than fixed silently.

## Testing

Full regression, both projects, fresh backend restart before each (killed by exact PID, not `pkill -f`, per the note from Phase 13): **desktop-chromium 7/7 passing**, **mobile-chromium 7/7 passing**, correct self-skips only. `npx tsc -b` / `npm run build` clean throughout. Backend `npm test`: 242/242 passing.

## Commit

Left uncommitted, per the user's standing "review later" pattern.

## Port cleanup

Backend and frontend dev servers force-killed by exact PID at the end of this turn. `frontend/.env.local`'s `VITE_API_URL` restored to the forwarded Codespace URL for manual browser testing.
