# Frontend Phase 15 — Mandatory GPS + location display, search threshold, company code auto-generation

## Context

User raised three separate improvements:

1. **Location on photos.** Attendance and VisitLog already have `latitude`/`longitude`/`location_address` (+ `checkout_*` for attendance) in the schema, and a working, policy-compliant reverse-geocode call (`backend/src/utils/geocode.ts`, Nominatim, proper `User-Agent` header) already runs during check-in/check-out/visit-create — but the frontend never actually captures GPS (zero calls to `navigator.geolocation` anywhere), so these fields are always empty in practice, and even when populated, the photo-listing endpoints never include `location_address` in their response mapping. GPS should be mandatory and blocking — no location, no submission. Checklist has no location columns of its own, but a submission always happens under an already-located attendance, so it can just display that attendance's `location_address`.

2. **Search-suggestion threshold.** The debounced staff/supervisor name search already uses Prisma's `mode: 'insensitive'` — no case bug. The actual friction was the `debouncedQuery.length >= 2` minimum before suggestions appear — user wants it to fire from the first character.

3. **Company Code → auto-generated alias.** `Company.code` is a plain, non-unique `String`, never used as a lookup key anywhere. Auto-generate from `name` via an initials heuristic (e.g. "PT Sanjaya Abadi" → "PTSA"), no uniqueness enforcement.

## Plan

**A. Mandatory GPS capture** — `frontend/src/lib/geolocation.ts` (new, wraps `navigator.geolocation.getCurrentPosition` in a Promise) wired into `CheckIn.tsx`/`CheckOut.tsx`/`LogVisit.tsx`'s submit handlers, blocking with a clear error on denial/failure. `attendance.validation.ts`/`visit.validation.ts` — lat/lng fields become required (service layer already handles them).

**B. Location display** — `getAttendancePhotos`/`getVisitPhotos`/checklist's `mapEvidence` add `location_address`-derived fields to their response mapping (already stored, just not exposed); frontend types + photo cards render it below the existing timestamp line.

**C. Search threshold** — `VisitsPage.tsx`/`ChecklistsPage.tsx`: minimum-length gate `>= 2` → `>= 1`.

**D. Company code auto-generation** — new `backend/src/utils/companyCode.ts` helper (all-caps tokens kept whole, else first letter, concatenated); `code` becomes optional in validation, filled in by `company.service.ts`'s `create()` when absent; `CompanyFormDialog.tsx` drops the Code input entirely.

## Verification

- `npx tsc -b` / `npm run build` clean, both backend and frontend.
- Backend `npm test` full suite green, plus new `generateCompanyCode` test cases.
- Full Playwright regression, both projects, fresh backend restart between each — Playwright contexts need `geolocation`/`permissions: ['geolocation']` granted for the STAFF/SUPERVISOR flows to still pass under mandatory GPS.
- Manual: confirm a real browser location prompt and blocking behavior on denial.
