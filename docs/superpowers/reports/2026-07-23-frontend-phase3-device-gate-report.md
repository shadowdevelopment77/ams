# Frontend Phase 3.5 Report — Mobile-Only Access for STAFF/SUPERVISOR

See `docs/superpowers/plans/2026-07-23-frontend-phase3-device-gate.md` for the plan and full rationale. This covers what was built, plus a note extracted while building it.

## What was built

| File | What, and why |
|---|---|
| `src/hooks/useIsMobile.ts` | `navigator.userAgentData?.mobile` (Client Hints) first, falling back to a `/Android\|iPhone\|iPad\|iPod/i` User-Agent regex for Safari/Firefox, which don't support Client Hints. Comment states plainly that this is a client-side workflow guardrail, not a security boundary — both signals are spoofable via devtools. |
| `src/components/MobileOnlyGate.tsx` | Full-page "This app is only available on mobile devices" message with a logout button, so a supervisor/staff who hits this on desktop isn't stuck signed in with no way out. |
| `src/components/ProtectedRoute.tsx` | New optional `requireMobile?: boolean` prop, checked *after* the existing loading/auth/role checks — renders `MobileOnlyGate` instead of `children` when set and `useIsMobile()` is false. |
| `src/routes/router.tsx` | `requireMobile` set on the STAFF dashboard route. |

## Small refactor along the way

`MobileOnlyGate`'s logout button needed the exact same logic `DashboardStub` already had (call `logout()`, clear the `me` query cache via `removeQueries` — not `setQueryData(key, undefined)`, which is a no-op — then navigate to `/login`). Rather than copy it a second time, extracted `src/hooks/useLogout.ts` and switched both components to use it. Two identical copies of session-clearing logic felt like exactly the kind of thing that causes a bug later when only one copy gets updated.

## Verification — UPDATED: real browser verification now complete

The Claude-in-Chrome extension never connected despite install + connect + two separate fresh sessions (documented at the time in the plan file's HANDOFF notes). Rather than keep waiting on it, verification moved to a self-contained Playwright suite driven directly from this environment — see `docs/superpowers/plans/2026-07-23-frontend-phase3-app-shell.md`'s "OVERNIGHT AUTONOMOUS RUN" addendum for the full reasoning. This closes what was previously the open item below.

**What was actually run (real Chromium, not just curl/regex-in-isolation):**
- `npx tsc -b` and `npm run build` — both clean.
- 6 realistic User-Agent strings checked against the regex fallback in isolation — all correct (kept from the earlier pass).
- **Full Playwright E2E suite** (`frontend/e2e/auth-and-device-gate.spec.ts`), run against a real dev backend + dev DB, real Chromium — both a `desktop-chromium` project (real desktop UA + viewport) and a `mobile-chromium` project (`devices['Pixel 7']`, a real mobile UA via Client Hints — this is what actually exercises the Client Hints code path that was previously unverified). **10/10 real tests passing** (2 further tests correctly self-skip on the inapplicable project — the desktop-vs-mobile assertions only make sense on one project each). Screenshots captured explicitly at every step, in `frontend/e2e/screenshots/`.
- Confirmed explicitly: a STAFF user on a desktop UA sees `MobileOnlyGate`, not the dashboard, and its logout button works; a STAFF user on a mobile UA (Client Hints) reaches the real dashboard, not the gate.

**Two real bugs found and fixed by this pass** (both were invisible to the earlier curl/regex-only verification, exactly why real browser testing mattered):
1. **Native HTML5 email validation silently pre-empted the app's own Zod error message.** `LoginPage`'s `<form>` had no `noValidate`, so the browser's own "Please include an '@'..." tooltip intercepted submission before React/Zod ever ran — the custom "Invalid email format" message was dead code for this case. Fixed by adding `noValidate` to the form.
2. **`useLogout` had no error handling.** If the backend logout call failed for any reason (observed for real: the auth rate limiter tripping mid-test-run), the `async` handler's rejected promise silently aborted the whole function — the query cache never cleared and `navigate('/login')` never ran, leaving the user stuck on the page with no visible error and no way out via that button. Fixed with a try/catch that logs the failure but still clears local state and navigates regardless, since a client-side-only logout is better than a user stuck unable to leave the screen.

**Also confirmed, not a bug:** the real `authLimiter` (10 req/15min) genuinely trips when both Playwright projects run back-to-back sharing one backend process's in-memory rate-limit store — this is the rate limiter correctly doing its job under real load, not a defect. Backend was left untouched; testing workflow instead restarts the dev backend between full project runs so each gets a clean budget (documented in the Phase 4 report for anyone continuing this suite later).

**Backend regression check:** `npm test` in `backend/` — still 220/220 passing, confirming tonight's frontend-only changes didn't affect backend behavior.

## Commit

Committed to `feature/frontend-setup` (frontend-folder commits — note: the frontend-commit exception itself is suspended for tonight's overnight run specifically; this file and the rest of tonight's `frontend/` changes are left uncommitted for morning review, per the user's explicit instruction).
