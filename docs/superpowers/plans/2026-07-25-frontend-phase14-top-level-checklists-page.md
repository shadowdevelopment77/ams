# Frontend Phase 14 — Top-level Checklists admin page

## Context

User pointed out that Attendance and Visits both have their own top-level admin page with a photo-browsing view, but Checklist evidence is only reachable by drilling 4 levels deep (Companies → a company → a division → a template → an item → "View Photos"), with no top-level nav entry — they tried to find a checklist photo view "using user" (like Visits' staff-search) and couldn't. They also pointed out the existing nested viewer only shows a submitter name + timestamp per photo, no "location" (which checklist item the photo actually belongs to) — unlike Attendance/Visits, which don't need this since a photo there is always exactly one-per-record, but checklist items can hold 1-3 photos each.

Investigated via 2 Explore agents:
- No broad checklist-photo endpoint exists — only `GET /api/checklist/evidence/item/:itemId?companyId=&date=`, which requires a pre-known `itemId`.
- FK chain confirmed: `ChecklistPhoto → submission → item → template → { company_id, division_id }`, and separately `submission → attendance → user`. A single joined query can pull company/division/item description/submitter name/photos/submitted_at at once.

User decisions:
1. Build both browse modes as tabs — company/division picker (mirrors Attendance) and staff-name search (mirrors Visits, filtered to `role: 'STAFF'`).
2. Remove the nested per-item "View Photos" viewer entirely once the top-level page ships.
3. Also remove the clickable company-name link on `CompaniesPage.tsx` — "See more detail →" becomes the only way into company detail.

## Plan

**Backend**
- Replace `findByItemAndDate` with `findByDivisionAndDate(companyId, divisionId, date, params)` and `findByUserAndDate(userId, date, params)` in the checklist repository/interface.
- `checklist.service.ts` — `getPhotosByDivision` / `getPhotosByUser`, replacing `getByItemAndDate`.
- `checklist.router.ts` — `GET /photos/by-division` and `GET /photos/by-user` (ADMIN-only), replacing `GET /evidence/item/:itemId`.
- `checklist.test.ts` — replace old evidence-endpoint tests with coverage for both new endpoints.

**Frontend**
- `frontend/src/api/checklist.ts` — replace `ChecklistEvidence`/`getChecklistEvidence` with `ChecklistPhotoRecord` + `getChecklistPhotosByDivision`/`getChecklistPhotosByUser`.
- New `frontend/src/features/admin/checklist/ChecklistsPage.tsx` — two tabs, each with its own picker + date input, photo grid showing item description ("location"), submitter/company/division context, and a Download button (reusing `downloadImage`).
- `ChecklistItemsPage.tsx` — remove the nested "View Photos" viewer.
- `AdminLayout.tsx` + `router.tsx` — add the `/admin/checklists` nav entry + route.
- `CompaniesPage.tsx` — remove the company-name link, keep "See more detail →".
- `admin-panel.spec.ts` — update company navigation to use "See more detail →"; remove the nested evidence test; add coverage for the new Checklists page.

## Verification

- `npx tsc -b` / `npm run build` clean.
- Backend `npm test` full suite green.
- Full Playwright regression, both projects, fresh backend restart between each.
