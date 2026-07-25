# Frontend Phase 9 — Virtual mobile test mode

## Context

`CLAUDE.md`: *"make like virtual mobile to manual test on desktop for staff and supervisor flow... instead using mobile phone i need using from desktop browser, but the rule can only using phone still on there (if its possible)"* — the user wants a way to test STAFF/SUPERVISOR flows from their desktop browser without a real phone, while keeping the real mobile-only gate (`ProtectedRoute`'s `requireMobile`, see Phase 3.5) fully intact for actual use.

Two design questions, both asked and confirmed directly:
1. **Activation**: a visible, labeled checkbox on the login page ("Simulate mobile device (for testing)") rather than a hidden URL param or devtools trick — acceptable since this is a portfolio project with no real end users to protect from seeing a testing control.
2. **Persistence**: stored in `localStorage`, stays on across reloads/the whole session until explicitly turned off — not reset on every login.

## Plan

- `frontend/src/lib/virtualMobile.ts` (new) — `isVirtualMobileEnabled()`/`setVirtualMobile()`, a thin `localStorage` wrapper.
- `frontend/src/hooks/useIsMobile.ts` — checks the virtual override first; only ever makes the hook return `true` when deliberately turned on, never bypasses genuine detection in the other direction.
- `frontend/src/components/VirtualMobileBanner.tsx` (new) — small persistent banner shown on every mobile-gated route while the override is active, with a "Turn off" button that clears it and reloads — so it's never silently left on and forgotten.
- `frontend/src/components/ProtectedRoute.tsx` — renders the banner above `children` whenever `requireMobile` and the override is on.
- `frontend/src/features/auth/LoginPage.tsx` — the checkbox itself, reflecting/writing `virtualMobile.ts`'s stored state.
- `frontend/e2e/auth-and-device-gate.spec.ts` — new test: check the box, log in as STAFF on `desktop-chromium`, confirm the real dashboard (not `MobileOnlyGate`) with the banner visible, click "Turn off," confirm the gate re-asserts immediately on the same desktop UA/viewport, log out.

No backend changes.

## Verification

- `npx tsc -b` / `npm run build` clean.
- Full Playwright regression, both projects, fresh backend restart between each: new test passes on `desktop-chromium`, correctly self-skips on `mobile-chromium`.
- Backend `npm test` unaffected (no backend code touched).
