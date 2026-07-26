# Frontend Phase 12 Report — Checklist evidence viewer

See `docs/superpowers/plans/2026-07-25-frontend-phase12-checklist-evidence-viewer.md` for the plan.

## What was built

- **`frontend/src/api/checklist.ts`** — `ChecklistEvidence` type + `getChecklistEvidence(itemId, companyId, date?, params?)`, wrapping the backend's existing `GET /api/checklist/evidence/item/:itemId` (which was never consumed by any frontend code before this).
- **`frontend/src/features/admin/companies/ChecklistItemsPage.tsx`** — each item row now has a "View Photos" button. Clicking it opens a section below the table: a date picker (defaults to today) and a photo grid, each photo labeled with the submitting staff member's name (`attendance.user.name`, joined server-side already). Same inline-section UX already established by `VisitsPage.tsx`'s and `AttendancePage.tsx`'s own photo views — no new pattern introduced.

## Testing

`admin-panel.spec.ts` extended: after creating the "Check fire extinguisher" item, opens its evidence viewer and asserts the honest empty state renders (`No submissions for this item on this date.`). Deliberately did not fabricate a full attendance+checklist-submission chain to show a real photo here — that would need a second login inside this already-one-login-by-design test file, and this suite's real auth-call count already sits close to the `authLimiter` budget's edge across a full run. Matches this same file's own existing precedent (the Attendance section already accepts a fresh division's genuine empty state as sufficient coverage, for the identical reason).

## Verification

- `npx tsc -b` / `npm run build` — clean.
- Backend `npm test` — 231/231 unaffected (no backend code touched; the endpoint already existed).
- Full Playwright regression, both projects, fresh backend restart between each: **desktop-chromium 7/7 passing**, **mobile-chromium 7/7 passing**, correct self-skips only.
- All dev-server ports force-killed at the end, per the user's standing instruction.

## A caught mistake during verification

Restarted the backend into the wrong working directory mid-verification (had already `cd`'d into `frontend/` from the previous step, then ran a background `npm run dev` intending it for the backend without `cd`-ing first — it silently started a second Vite instance on port 5174 while writing its own log to the path I'd meant for the backend). Caught immediately via `pwd`/`ss -tlnp` before any test run used the wrong server, killed the stray process, and restarted both correctly with explicit `(cd <dir> && ...)` subshells. No test results were affected.

## Commit

Left uncommitted, per `docs/RULES.md`'s "never commit before approved" rule.
