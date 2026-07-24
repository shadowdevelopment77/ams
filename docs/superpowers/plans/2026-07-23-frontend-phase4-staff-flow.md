# Frontend Phase 4 Plan — STAFF Flow Screens (the MVP milestone)

Part of tonight's overnight autonomous run — see the "OVERNIGHT AUTONOMOUS RUN" section in `docs/superpowers/plans/2026-07-23-frontend-phase3-app-shell.md` for why this proceeds directly from Phase 3.5's verification closing, without a separate check-in. This is the actual deliverable: a working check-in → checklist → check-out loop for a STAFF user.

## Screens and why they're structured this way

**Dashboard replaces `DashboardStub`.** Calls `GET /api/attendance/today` (built in Phase 0) and renders one of three states based on the result:
- `data: null` → not checked in yet → "Check In" CTA, routes to `/checkin`.
- `data.check_out_at: null` (checked in, not out) → routes to `/checklist` and `/checkout`, using `data.id` as the attendance ID for both.
- `data.check_out_at` set → day complete, simple summary, no further actions.

This is the same design already verified end-to-end via curl in the Phase 3 report — the dashboard is what makes that `/today` endpoint's whole reason for existing (recovering state after a refresh) actually visible.

**Check-in** (`/checkin`) — `GET /api/shift/my-division` (built in Phase 0) populates a `<select>` of the caller's own division's shifts. Native `<input type="file" accept="image/*" capture="environment">` for the photo (decided earlier this project — opens the phone's camera directly, and is what Phase 3.5's whole mobile-only gate exists to protect). Submits `POST /api/attendance/checkin` as `multipart/form-data`. On success, back to `/` (dashboard), which will now show the checked-in state.

**Checklist** (`/checklist`) — `GET /api/checklist/my-checklist` returns each submission with its `item` (description, `requires_photo`) and `photos` already joined (`checklistSubmissionRepository.findByAttendance` — confirmed via `checklist.repository.ts`). Each item gets its own native file input hitting `POST /:attendanceId/items/:itemId/photo`; a "Submit checklist" button calls `POST /:attendanceId/submit`, which the backend already rejects with a clear error if any item still has no photo — that error surfaces directly, no need to duplicate the completeness check client-side.

**Check-out** (`/checkout`) — same native-file-input pattern, `PATCH /api/attendance/checkout/:id`.

**Routing:** all three new routes are `ProtectedRoute allow={['STAFF']} requireMobile` — same gate as the dashboard, consistent with Phase 3.5's "whole app for STAFF" scope decision. The attendance ID for checklist/checkout comes from the `/today` query (already fetched for the dashboard, re-used via TanStack Query's cache rather than re-fetched) rather than a route param — there is exactly one "today" per STAFF user, no need to encode it in the URL.

## Testing

Extends the Playwright suite from Phase 3.5 with a full flow spec: check in with a real generated JPEG (`sharp`, same approach the backend's own e2e walkthrough script used), upload a checklist photo, submit, check out — screenshots at each step, using the same fixture company/division/shift/template/item already seeded by `e2e-test-seed.ts`. Malformed-upload paths (wrong type, oversized) are already covered by the backend's own Jest suite (220/220 passing) — not re-verified at the E2E layer, since that would just be re-testing backend validation through a slower path for no new confidence.

## Verification

- `npx tsc -b` / `npm run build` — clean.
- Full Playwright run (both projects, backend restarted between them per tonight's established rate-limit workaround) — the new flow spec plus the existing Phase 3.5 spec, all green.
- Manual reasoning check: does a page refresh mid-flow (e.g., after checkin, before checklist) correctly resume at the right screen via `/today`? Covered by the flow spec reloading between steps.
