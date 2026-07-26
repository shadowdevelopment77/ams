# Phase 15 Report — Mandatory GPS + location display, search threshold, company code auto-generation

Plan: `docs/superpowers/plans/2026-07-25-frontend-phase15-gps-location-search-company-code.md`

## Summary

Shipped all four parts of the plan:

**A. Mandatory GPS.** `frontend/src/lib/geolocation.ts` wraps `navigator.geolocation.getCurrentPosition` in a Promise. `CheckIn.tsx`, `CheckOut.tsx`, `LogVisit.tsx` all call it before submitting and surface a clear blocking error if location access is denied/unavailable — no location, no submission, matching the mobile-only device-gate precedent. Backend `checkInSchema`/`checkOutSchema`/`createVisitLogSchema` changed `latitude`/`longitude` (and `checkout_*`) from optional to required via Zod.

**B. Location display.** `attendance.service.ts`'s `getAttendancePhotos` now returns `checkin_address`/`checkout_address`; `visit.service.ts`'s `getVisitPhotos` returns `address`; `checklist.service.ts`'s `mapEvidence` returns `location_address` (sourced from the submission's own attendance, since checklist items have no location columns of their own). All three admin photo viewers (`AttendancePage.tsx`, `VisitsPage.tsx`, `ChecklistsPage.tsx`) render the address in muted text directly below each timestamp.

**C. Search threshold.** `VisitsPage.tsx`/`ChecklistsPage.tsx`'s debounced staff/supervisor name search now fires from the first character (`debouncedQuery.length >= 1`, was `>= 2`). Debounce delay unchanged at 300ms.

**D. Company code auto-generation.** New `backend/src/utils/companyCode.ts`: `generateCompanyCode(name)` keeps already-all-caps tokens whole (e.g. "PT") and takes the first letter of every other word, concatenated with no separator ("PT Sanjaya Abadi" → "PTSA"). `company.validation.ts`'s `code` is now optional; `company.service.ts`'s `create()` fills it in via `data.code || generateCompanyCode(data.name)` with **no uniqueness check**, per explicit user instruction — two companies can legitimately share a generated code since it's a display-only alias, never used as a lookup key anywhere in the app. Frontend `CompanyInput.code` is now optional and `CompanyFormDialog.tsx`'s Code field was removed entirely (input, label, validation, submit payload) for both create and edit — the code is still visible read-only via the Companies table / company detail header.

## Bugs found and fixed along the way (not in the original plan)

1. **`admin-panel.spec.ts` still filled a "Code" input** that no longer exists after Part D removed it from `CompanyFormDialog.tsx` — the golden-path test would have failed permanently. Fixed by deleting the two `.getByLabel('Code').fill(...)` calls.

2. **Strict-mode ambiguity in the Staff page's move-company assertions.** `StaffPage.tsx` renders two separate `<table>`s: an unfiltered flat "all staff" list and a filtered "Roster by company & division" table. Both can contain a row matching the same staffer's name at the same time, so `page.getByRole('row', { name: staffName })` intermittently resolved to two elements depending on where the staffer landed in the flat list's pagination — a latent bug in the test, not something previously guaranteed to pass. Fixed by adding `aria-label="Staff roster"` to the roster `<Table>` (a real accessibility improvement, not just test convenience) and scoping the two affected assertions in `admin-panel.spec.ts` to `page.getByRole('table', { name: 'Staff roster' })`.

3. **Confirmed (not a bug): the `apiLimiter` (100 req/15min) is tighter than the current test suite's actual per-project request volume.** A single continuous `admin-panel.spec.ts` run now costs close to 100 requests on its own (two companies, two divisions, a shift, two templates, several checklist items, a staff registration, a move-company round trip, plus all the page-load GETs each step triggers). Running the full spec file list back-to-back in one project, as previous phases did, now trips 429s partway through — this is pre-existing rate-limiter tightness that the growing admin-panel test surfaced, not something Phase 15 introduced. Worked around for this verification pass by restarting the backend (which resets the in-memory rate-limit store) between every individual spec file, not just between the two Playwright projects. Flagging this because future phases will hit the same wall — worth a conversation about raising `apiLimiter`'s `max` for local/dev use, or `skip`-ing it in non-production envs, next time this comes up (no code change made here without approval, per CLAUDE.md's "report before optimizing" rule).

## Verification

- `npx tsc --noEmit` (backend) — clean.
- `npx tsc -b` + `npm run build` (frontend) — clean.
- Backend `npm test` — **245/245 passing**, including 3 new `generateCompanyCode` cases in `company.test.ts` (plain name, all-caps legal-entity prefix, and an explicit collision case confirming no uniqueness error).
- Full Playwright regression, both projects, backend restarted between every spec file (not just between projects, per the note above): `admin-panel.spec.ts` (desktop, 1/1), `auth-and-device-gate.spec.ts` (desktop 6/6 + 1 correct skip, mobile 5/5 + 2 correct skips), `staff-flow.spec.ts` (mobile, 1/1 — confirms mandatory GPS works end-to-end with `playwright.config.ts`'s new `geolocation`/`permissions: ['geolocation']` grant), `supervisor-flow.spec.ts` (mobile, 1/1). All passing, correct self-skips only.
- Manual GPS-denial check not performed in a real browser this session (would require withdrawing the Playwright-granted permission interactively); the automated coverage above proves both the happy path (GPS granted → submission succeeds, address recorded and displayed) and the Zod-level enforcement (backend rejects missing coordinates) — denial-path UI copy was eyeballed in `CheckIn.tsx`/`CheckOut.tsx`/`LogVisit.tsx`'s catch blocks during code review.

## Status: done, verified, uncommitted
