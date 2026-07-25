# Frontend Phase 9 Report — Virtual mobile test mode

See `docs/superpowers/plans/2026-07-25-frontend-phase9-virtual-mobile-mode.md` for the plan.

## What was built

- **`frontend/src/lib/virtualMobile.ts`** — `isVirtualMobileEnabled()` / `setVirtualMobile(enabled)`, wrapping a single `localStorage` key (`ams:virtualMobile`).
- **`frontend/src/hooks/useIsMobile.ts`** — checks `isVirtualMobileEnabled()` first, returning `true` immediately if set; otherwise falls through to the existing Client Hints / UA-regex detection unchanged. The override can only ever push the result toward "mobile," never the reverse — it can't be used to defeat the gate.
- **`frontend/src/components/VirtualMobileBanner.tsx`** — a small amber banner ("Simulating mobile (testing only)" + "Turn off" button); clicking turns the override off and reloads, so the real device check re-asserts immediately without needing a fresh login.
- **`frontend/src/components/ProtectedRoute.tsx`** — renders the banner above the route's children whenever `requireMobile` is true and the override is active.
- **`frontend/src/features/auth/LoginPage.tsx`** — a labeled checkbox ("Simulate mobile device (for testing)") that reads/writes the stored state; checked immediately (not deferred to form submit), matching how a login-page toggle should behave.

## Verification

- `npx tsc -b` / `npm run build` — clean.
- Full Playwright regression, both projects, fresh backend restart between each: **desktop-chromium 7/7 passing** (new virtual-mobile test included — checkbox → real dashboard reached on a genuine desktop UA/viewport → banner visible → "Turn off" → gate re-asserts immediately → logout), **mobile-chromium 6/6 passing** (new test correctly self-skips there, since the whole point is proving it works on desktop).
- Backend `npm test` — **225/225 passing**, unaffected (no backend code touched this phase).
- All dev-server ports force-killed at the end, per the user's standing instruction.

## Housekeeping done alongside this phase

- Deleted `frontend/test-results/` and `frontend/playwright-report/` — regenerable Playwright output, already gitignored, just disk clutter from this session's debugging.
- Condensed the cross-session working plan file (`~/.claude/plans/continue-backend-work-from-vectorized-twilight.md`) from 424 lines of historical detail down to a short status index — every completed phase already has a permanent plan+report pair in `docs/superpowers/`, so the working file no longer needed to duplicate that detail.

## Commit

Left uncommitted, per `docs/RULES.md`'s "never commit before approved" rule.
