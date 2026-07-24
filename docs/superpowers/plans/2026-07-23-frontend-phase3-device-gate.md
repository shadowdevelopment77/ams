# Frontend Phase 3.5 Plan — Mobile-Only Access for STAFF/SUPERVISOR

Addendum to Phase 3 (app shell), blocking Phase 4. Companion to the real-browser verification pass (also blocking Phase 4, but gated on the Chrome extension being connected — tracked separately, not covered by this doc).

## The requirement, and why

User: "admin role can open from desktop and mobile phone, but supervisor and staff only can open using mobile phone, because i don't want miss match the feature of captured photos."

The reasoning is sound: check-in/checkout/checklist/visit photos all use a native `<input type="file" accept="image/*" capture="environment">`. On a phone, `capture` opens the camera directly. On a desktop browser, there's no rear camera to defer to, so the same input just falls back to an ordinary file picker — meaning a supervisor or staff member on a desktop could attach *any* existing image file instead of taking a live photo, defeating the entire point of the photo requirement (proof of actually being on-site, not proof of owning a JPEG).

## Decisions and why

**A client-side route guard, not a backend check.** A `User-Agent` (or Client Hints) check is exactly as spoofable server-side as client-side — an HTTP header the client controls either way. Enforcing it in Express wouldn't add real protection over enforcing it in React, just an extra round-trip. This is a workflow guardrail against *accidental* desktop use by cooperative employees, not a security boundary against someone deliberately trying to bypass it. Worth being explicit about that limitation up front rather than implying a false guarantee.

**Detection: `navigator.userAgentData?.mobile` first, User-Agent regex fallback.** Client Hints (`userAgentData`) is the more modern, harder-to-casually-misreport signal, but is Chromium-only — Safari and Firefox don't support it, so a regex fallback (`/Android|iPhone|iPad|iPod/i` against `navigator.userAgent`) covers those. Not using viewport width as the signal: resizing a desktop browser window to look narrow is a one-click devtools action, arguably even less friction to bypass than spoofing a UA string, so it wouldn't be a meaningfully stronger check for the extra complexity.

**Enforced at the `ProtectedRoute` layer, not the login page.** Which role someone is isn't known until after they authenticate — the login form itself has to stay open on any device, or a legitimate STAFF user couldn't even attempt to log in and find out they need a phone. The gate is a new optional `requireMobile` prop on `ProtectedRoute`, checked only after the existing auth/role checks pass.

**Scope: the whole app for STAFF/SUPERVISOR, not just the camera screens.** Taking "supervisor and staff only can open using mobile phone" at face value rather than narrowing it to "only the photo screens need this" — one rule per role is simpler to reason about and matches what was actually said. Flagged in the plan for correction if a narrower, per-screen interpretation was actually intended.

## Plan

1. `src/hooks/useIsMobile.ts` — returns a boolean; Client Hints primary, UA regex fallback, as above.
2. `src/components/MobileOnlyGate.tsx` — full-page message ("This app is only available on mobile devices — please open it on your phone") with a logout button, so a supervisor/staff who lands here on desktop isn't stuck signed in with no way out.
3. `src/components/ProtectedRoute.tsx` — add `requireMobile?: boolean` prop; when true and `useIsMobile()` is false, render `MobileOnlyGate` instead of `children` (after the existing loading/auth/role checks, which stay unchanged).
4. `src/routes/router.tsx` — set `requireMobile` on the STAFF dashboard route.

## Verification

- `npx tsc -b` / `npm run build` — clean.
- Once Chrome is connected: verify via devtools device emulation (or a real UA override) that a STAFF login on a "desktop" UA hits the gate, and on a "mobile" UA reaches the dashboard; confirm the gate's logout button actually logs out and returns to `/login`.
- Until then: manual code review + confirming the logic reads correctly (this alone does not satisfy the "no known bugs" bar for anything UI-rendering-dependent — flagged honestly in the report, not glossed over).
