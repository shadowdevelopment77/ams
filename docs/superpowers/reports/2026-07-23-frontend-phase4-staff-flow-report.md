# Frontend Phase 4 Report — STAFF Flow Screens

See `docs/superpowers/plans/2026-07-23-frontend-phase4-staff-flow.md` for the plan and rationale. This covers what was actually built, the bugs found while verifying it end-to-end in a real browser, and the one genuine debugging saga of the night.

## What was built

| File | What, and why |
|---|---|
| `src/api/attendance.ts` | `Attendance` interface matching the Prisma model, `getTodayAttendance()`, `checkIn(shiftId, photo)`, `checkOut(attendanceId, photo)` — the latter two build `FormData` since the backend expects `multipart/form-data`. |
| `src/api/shift.ts` | `getMyDivisionShifts()` against the Phase 0 endpoint. |
| `src/api/checklist.ts` | `getMyChecklist()`, `uploadChecklistPhoto(attendanceId, itemId, photo)`, `submitChecklist(attendanceId)`. |
| `src/hooks/useTodayAttendance.ts` | Wraps `getTodayAttendance()` in a TanStack Query hook; also exports `useInvalidateTodayAttendance()` so check-in/check-out can force a refetch after mutating. |
| `src/components/PhotoInput.tsx` | Shared native `<input type="file" accept="image/*" capture="environment">` with a local blob-URL preview and a "Take photo" / "Retake photo" button. Used by check-in, checklist, and check-out — one component instead of three copies. |
| `src/features/attendance/Dashboard.tsx` | Replaces `DashboardStub` (deleted). Three states driven by `useTodayAttendance()`: no attendance → "Check In" CTA; checked in, not out → "View Checklist" + "Check Out"; checked out → completion summary. |
| `src/features/attendance/CheckIn.tsx` | Shift `<select>` (plain HTML, not a shadcn Select — no need for the extra complexity here) + `PhotoInput`, submits, invalidates the today-attendance query, navigates home. |
| `src/features/checklist/Checklist.tsx` | Per-item: photo grid if already uploaded, otherwise `PhotoInput` + "Upload photo". "Submit Checklist" surfaces the backend's own completeness error directly rather than duplicating that validation client-side. |
| `src/features/attendance/CheckOut.tsx` | Same `PhotoInput` pattern, submits, navigates home. |
| `src/routes/router.tsx` | Rewritten with all four routes (`/`, `/checkin`, `/checklist`, `/checkout`), all `ProtectedRoute` with `allow: ['STAFF']` + `requireMobile: true` (Phase 3.5's gate, unchanged in shape). |

**One correction made while building, not a bug found later:** this project's shadcn setup uses **Base UI**, not Radix — polymorphic rendering uses a `render` prop (`<Button render={<Link to="/checkin" />}>Check In</Button>`), not Radix's `asChild`. Caught via `tsc` before it ever ran, since Base UI's `Button` doesn't accept `asChild` at all.

## Testing

`frontend/e2e/staff-flow.spec.ts` — full flow with a real generated JPEG (`sharp`, 200×200, matching the backend's own e2e walkthrough approach): login → check-in with shift + photo → dashboard reflects checked-in state → **page reload mid-flow** (proves `/api/attendance/today` genuinely recovers state, not just client memory) → checklist photo upload → submit → dashboard → check-out with photo → completion state. Screenshots captured at every step (`frontend/e2e/screenshots/10` through `15`). Fixtures (`frontend/e2e/reset-fixtures.sh` + the two disposable backend scripts) create a real company/division/shift/checklist template+item and a real STAFF user via actual HTTP calls, not mocks.

## The debugging saga: checklist submit failing in-browser only

The flow test initially failed at the checklist-submit step with the backend's real validation error, "All checklist items must have at least one photo" — every time, reproducibly. This looked like it could be a real app bug, so it got the full treatment before being dismissed:

- Direct Prisma query against the dev DB, right after a failed run, confirmed the submission row **did** have a photo attached with a valid Cloudinary URL.
- A `curl` call replicating the exact same `POST /:attendanceId/submit` request (same staff session, same attendance ID) **succeeded immediately**.

That combination — DB state correct, backend logic correct via curl, browser-driven request still rejected — meant the bug had to be in the frontend's request *timing*, not the backend or the data. Root cause, found by writing a heavily instrumented debug spec that logged every `/api/*` response with a timestamp: **`Checklist.tsx`'s upload button flips its own accessible text from "Upload photo" to "Uploading…" synchronously, the instant the click handler starts** (`setUploadingItemId(itemId)` runs before the `await` on the actual network call). The E2E test's wait condition — "the 'Upload photo' button is no longer visible, therefore the upload finished" — was satisfied by that instant text change, not by the upload actually completing. The test then clicked "Submit Checklist" up to ~1 second before the photo POST had even resolved.

This was a **test bug, not an app bug** — the app's own behavior (showing "Uploading…" immediately, keeping the button disabled, only swapping to the read-only photo grid once the query genuinely refetches) is correct UX. Fixed by rewriting the wait in `staff-flow.spec.ts` to key off an actual network signal (`page.waitForResponse` on the photo POST) followed by waiting for the button element itself — matched under *either* label — to be detached from the DOM, which only happens once the query invalidation's refetch lands and the UI branch genuinely swaps over.

The temporary `frontend/e2e/debug-checklist.spec.ts` used to diagnose this has been deleted now that the real fix is in place and confirmed.

## Post-review fix: checklist only supported 1 photo per item, not the real 1-3 range

Raised by the user during morning review, before any commit. The overnight testing only ever exercised the 1-photo-minimum path for a checklist item. Confirmed by reading the backend directly: `checklist.service.ts:20` sets `MAX_PHOTOS_PER_ITEM = 3`, and `submitAll` (line 187-190) only requires *at least one* photo, not exactly one — the real range is 1 to 3. `Checklist.tsx`, however, rendered the upload control only while `photos.length === 0`, permanently switching to a read-only thumbnail grid the instant one photo landed — there was no way to reach photo #2 or #3 through the UI at all.

Also confirmed while investigating: there is no delete/replace-photo endpoint anywhere in `checklist.router.ts` — once uploaded, a photo can't be removed, only added to. Left as an accepted, out-of-scope limitation per the user's call, not touched.

**Fix** (`Checklist.tsx`): the thumbnail grid and the upload control are no longer mutually exclusive — both render together whenever `photos.length < 3`, with the button labeled `Add photo (n/3)` so the count is always visible; the control disappears only once the real cap is hit. No API or backend changes needed — `uploadChecklistPhoto` already supported being called more than once per item.

**Test coverage extended** (`staff-flow.spec.ts`): the checklist step now uploads 3 photos in a loop (not 1), proving the add-another affordance and the real cap, and asserts the upload control is fully gone (`toHaveCount(0)`) at 3/3 before submitting. Each iteration waits on the actual photo-POST response and the subsequent `my-checklist` refetch, rather than any button-text signal — applying the same lesson from the earlier submit-race bug.

**A genuine near-miss while verifying this**: the first screenshot taken after the 3-photo loop showed only 2 thumbnails, even though the test's own assertions had already passed. Checked the database directly (`checklistPhoto` rows) — all 3 photos were there, correctly linked, with distinct Cloudinary URLs. Not a bug: the third `<img>` (pointing at a real Cloudinary URL, not a local blob) simply hadn't finished downloading and painting at the exact millisecond the screenshot fired. Added `page.waitForLoadState('networkidle')` before that screenshot call; re-ran and confirmed all 3 thumbnails now render correctly (`13-checklist-photo-uploaded.png`, updated).

Re-verified after the fix: `tsc -b` clean, `npm run build` clean, `staff-flow.spec.ts` passing on a fresh backend.

## Post-review fix: fixtures only ever had 1 checklist item

Also raised during morning review — the checklist screenshot only ever showed a single item, which made it hard to tell whether the app was really handling a checklist (plural) or just one hardcoded row. `backend/scripts/e2e-test-seed.ts` now creates 3 real items via the same real HTTP `POST /api/checklist/items` calls as before ("Check fire extinguisher", "Inspect emergency exit signage", "Verify first aid kit is stocked"), and prints `itemIds: number[]` instead of a single `itemId`. `e2e-test-cleanup.ts` needed no changes — it already deletes all items under a template's ID, regardless of count.

`staff-flow.spec.ts`'s checklist step now scopes its interactions per item card (`page.locator('p', { hasText: description }).locator('xpath=..')`) since 3 items can each have their own visible "Take photo" / "Add photo" button at once, which would otherwise trip Playwright's strict-mode ambiguity on a page-wide locator. Item 1 still gets the full 3-photo demonstration; items 2 and 3 each get the 1-photo minimum, so the resulting screenshot shows a realistic mixed state — matches how a real shift would likely look, not artificially uniform.

## Rate limiter, revisited

Running the full suite unfiltered against one long-lived backend process reliably tripped the real `authLimiter` (10 req/15min on `/api/auth/*`) partway through — expected, not a defect (documented already in the Phase 3.5 report). Phase 4 made this more visible because the `mobile-chromium` project now carries more auth-heavy tests than `desktop-chromium` (it alone runs both the "mobile succeeds" gate test and the full staff flow, each with their own login). Workflow adapted accordingly rather than weakening the limiter: full suite runs are split into fresh-backend passes — `desktop-chromium` fits in one clean run; `mobile-chromium` needs its own fresh backend, and the auth spec's rate-limit-sensitive tests were verified in smaller batches against fresh backend starts when the full-mobile-project budget ran out mid-suite.

## Final verification state

- `npx tsc -b` — clean.
- `desktop-chromium`, one fresh backend: **5/5 real tests pass**, 2 correctly self-skip (mobile-only assertions).
- `mobile-chromium`, `auth-and-device-gate.spec.ts`, fresh backend: **4/4 real tests pass**, 1 correctly self-skips (desktop-only assertion); the remaining "mobile succeeds" gate test verified passing in its own fresh-backend run.
- `mobile-chromium`, `staff-flow.spec.ts`, fresh backend: **1/1 passes** — full check-in → checklist → check-out loop, including the mid-flow reload.
- Backend regression: `npm test` in `backend/` — **220/220 passing**, no backend production code touched this session (only the disposable `backend/scripts/e2e-test-*.ts` fixtures scripts).

## Disposable scripts — kept, not deleted

`backend/scripts/e2e-test-cleanup.ts` and `backend/scripts/e2e-test-seed.ts` were built under this project's "disposable script" convention, but they're now wired into `frontend/package.json`'s `test:e2e` / `test:e2e:reset-fixtures` scripts as permanent supporting infrastructure for the new Playwright suite — deleting them would break `npm run test:e2e` for anyone running this suite again later. Judgment call: keeping them, since the E2E suite itself is being added as a lasting capability, not a one-off diagnostic. Flagging this explicitly in case that call should go the other way.

## Commit

Left uncommitted, per tonight's overnight-run instruction (no commits anywhere, including `frontend/`, until morning review).
