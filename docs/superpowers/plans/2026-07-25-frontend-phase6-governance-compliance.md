# Frontend Phase 6 — Governance Compliance (spam-guard, screenshots, port/CORS fix)

## Context

User added two new governance files this session: a rewritten `CLAUDE.md` (adds a frontend spam-guard requirement — max 1 request/sec on core mutating actions — plus a deferred-until-later i18n requirement, and a `Screenshot/<phase>/` folder convention) and a new `docs/RULES.md` (session-start port hygiene, a per-phase definition-of-done, and three non-negotiables: never silently fix without logging, never remove a screenshot, never commit without approval). The user asked to hold the existing uncommitted work, read both new files, discuss, then plan the next phase — this phase operationalizes that reading into concrete work.

Two read-only checks were run against the current frontend before starting:

1. **Spam-guard audit**: the frontend has no `useMutation` anywhere — every mutating action guards its submit button via local `isSubmitting`/`isDeleting` state or react-hook-form's `formState.isSubmitting`, tied to `disabled={...}`. Covers login, check-in, check-out, checklist photo upload/submit, and every admin CRUD dialog + `ConfirmDialog` delete/deactivate flow. **Three real gaps found** (one during the audit, one during a later sweep): the Logout buttons in `AdminLayout.tsx`, `Dashboard.tsx`, and `MobileOnlyGate.tsx` called `useLogout()`'s handler directly via `onClick`, with no pending-state disable.
2. **Screenshot audit**: `frontend/e2e/screenshots/` held 23 flat PNGs from three spec files, each referencing its folder via one `const SCREENSHOT_DIR` string — so moving the folder only requires editing that one constant per spec file. A top-level `Screenshot/` folder already existed at the repo root (empty), presumably created by the user in anticipation of this convention.

The user also asked to fold in the still-open Vite port-instability / "fail to fetch" issue from the prior session rather than treat it as a separate detour, and confirmed the spam-guard should use the "disable button while pending" pattern already used everywhere else in the codebase, not a new hard-cooldown timer.

**Explicitly out of scope**, per `CLAUDE.md`'s own wording: i18n (English + Bahasa Indonesia) — not to be started "on middle development," only once all features are done.

## Plan

1. Fix the Vite port / fetch issue (investigate live, don't assume).
2. Spam-guard the logout buttons with the codebase's existing `isSubmitting`-style pattern.
3. Reorganize screenshots into `Screenshot/<phase>/`, preserving history via `git mv` where tracked.
4. Adopt `docs/RULES.md` as standing operating procedure: check/kill stale ports before testing, log every fix, never delete a screenshot, never commit without approval.
5. Write this plan doc before starting and a report doc after.

## Verification

- `npx tsc -b` / `npm run build` clean.
- Full Playwright regression (both projects) on a freshly restarted backend — all real tests green, correct self-skips only.
- Backend `npm test` — 220/220, confirming no regression from any backend-side fix made along the way.
- Manual end-to-end verification via `curl` against the real forwarded Codespace URLs (not `localhost`) with a matching `Origin` header, for login → session cookie → authenticated `/api/auth/me`.
- Everything left uncommitted; nothing pushed.
