# Frontend Phase 13 — Photo downloads, Move-Company UI, Divisions nav rework

## Context

User asked for four things in one message. Investigated all four before planning (3 Explore agents):

1. **Checklist photo naming "bug"** — user believed the evidence viewer wasn't calling their `ChecklistPhoto` schema properly. Traced the full path: Prisma model `ChecklistPhoto` (`backend/prisma/schema.prisma:290`) → repo include `photos` (`checklist.repository.ts:141-174`) → JSON field `photo_url` → frontend `ChecklistEvidence` type (`frontend/src/api/checklist.ts`) → `ChecklistItemsPage.tsx:222` (`photo.photo_url`). **No mismatch found anywhere** — confirmed with the user, who agreed nothing's actually broken here. No code change for this item.
2. **Downloadable photos** — none of the three admin photo viewers (checklist evidence, attendance, visits) have any download affordance today. All photos are Cloudinary `secure_url`s, cross-origin from the frontend, so a plain `<a download>` won't force a save dialog — needs a fetch-to-blob helper. User confirmed: all three viewers should get it.
3. **Move-company UI** — backend already fully implements this (`PUT /api/users/:id/move-company`, ADMIN-only, STAFF-only target, validates division belongs to new company — `user.service.ts:56-71`, fully tested in `user.test.ts:131-260`). The frontend API wrapper already exists and is unused (`frontend/src/api/user.ts:84-91`, `moveUserCompany`). There's just no UI to trigger it.
4. **Divisions nav rework** — Phase 8 added a top-level `/admin/divisions` sidebar entry + `DivisionsPage.tsx` because divisions were "hard to find" nested under a specific company. User now wants the opposite: remove the top-level nav entry, and reach divisions via an explicit "See more detail →" link on each company row in `CompaniesPage.tsx`, landing on the existing `CompanyDetailPage.tsx` (which already renders the full `DivisionsList` for that company — no change needed there). Confirmed with user.

## Plan

**A. Shared photo-download helper**
- New `frontend/src/lib/downloadImage.ts`: `downloadImage(url, filename)` — fetch → blob → `URL.createObjectURL` → hidden `<a download>` click → revoke.
- Download button wired into `ChecklistItemsPage.tsx`, `VisitsPage.tsx`, `AttendancePage.tsx` photo grids.

**B. Move-Company UI**
- New `MoveCompanyDialog.tsx` (mirrors `RegisterUserDialog.tsx`'s cascading Company→Division pattern).
- `StaffPage.tsx` roster table gets an Actions column with a "Move Company" button for STAFF rows, wired to the existing (previously unused) `moveUserCompany` API wrapper.

**C. Divisions nav rework**
- Remove top-level `/admin/divisions` nav item, `DivisionsPage.tsx`, and its route.
- `CompaniesPage.tsx` gets a "See more detail →" link per row into `CompanyDetailPage.tsx` (unchanged, already shows full divisions list).
- `admin-panel.spec.ts` updated to match.

## Verification

- `npx tsc -b` / `npm run build` clean (frontend only, no backend changes).
- Full Playwright regression, both projects, fresh backend restart between each.
- Manual: confirm a photo download in each of the three viewers is a real file save.
