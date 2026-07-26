# Frontend Phase 12 — Checklist evidence viewer

## Context

User asked what was still missing on the admin panel's checklist side. Checklist template/item CRUD (setup) already existed via `ChecklistItemsPage.tsx`, but there was no way for an admin to actually see what STAFF submitted — no photo evidence view, unlike Attendance and Visits, which both already have one. The backend already had the endpoint for this (`GET /api/checklist/evidence/item/:itemId?companyId=&date=`), just never wired up to any UI. Confirmed this was the intended gap directly with the user before building.

## Plan

- `frontend/src/api/checklist.ts` — `ChecklistEvidence` type (submission + `photos` + `attendance.user`, no `item` since the caller already knows which item) + `getChecklistEvidence(itemId, companyId, date?, params?)`.
- `frontend/src/features/admin/companies/ChecklistItemsPage.tsx` — added a "View Photos" action per item row, opening a date-scoped evidence section below the table (date picker defaulting to today, grid of submitted photos each labeled with the submitting staff member's name) — matches the same inline-section pattern `VisitsPage.tsx`/`AttendancePage.tsx` already use for their own photo views.
- `admin-panel.spec.ts` extended: opens the evidence viewer for the item just created in that same test and asserts the honest empty state ("No submissions for this item on this date.") — matching this file's own existing precedent of accepting a fresh/empty-state check for a brand-new division's Attendance view, rather than fabricating a full attendance+submission chain (and its extra login) just for this assertion.

No backend changes — the endpoint already existed.

## Verification

- `npx tsc -b` / `npm run build` clean.
- Backend `npm test` unaffected (no backend code touched).
- Full Playwright regression, both projects, fresh backend restart between each.
