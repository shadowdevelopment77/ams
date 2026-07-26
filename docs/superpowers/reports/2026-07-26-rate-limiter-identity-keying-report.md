# Rate limiter identity keying — Report

See `docs/superpowers/plans/2026-07-26-rate-limiter-identity-keying.md` for the plan.

## What was built

- `backend/src/middlewares/auth.middleware.ts` — extracted the cookie→session→user→role lookup into a shared `resolveSessionUser(req)` helper returning a typed `SessionResolution` (`{ ok: true, user, sessionId }` or `{ ok: false, reason }`). `authMiddleware` now calls it and rejects on failure exactly as before (same status codes/messages).
- New `backend/src/middlewares/resolve-user.middleware.ts` — `resolveUser`, a best-effort wrapper around the same shared function that **never rejects**: on any failure it just calls `next()` with no `req.user` set. Mounted ahead of `apiLimiter` in `app.ts` (`app.use('/api', resolveUser, apiLimiter)`) purely so the limiter can see who's calling.
- `backend/src/middlewares/rate-limit.middleware.ts` — `apiLimiter` now keys by `req.user?.id ?? ipKeyGenerator(req.ip)`; `authLimiter` (login/register/logout) now keys by the submitted `email` (falling back to IP for logout, which has none). No numeric caps changed — once properly keyed, 100/15min per person and 10/15min per account were never the actual problem.

## A regression caught and fixed mid-implementation

First pass moved the "delete an expired session" side effect into the shared `resolveSessionUser` function. Since `resolveUser` now runs on *every* request ahead of the route's own `authMiddleware`, it would resolve (and delete) an expired session first — so by the time the real `authMiddleware` ran a moment later, the session was already gone, and it reported "Not authenticated" instead of "Session expired." Caught by the existing `auth.test.ts` suite (`rejects an expired session`), not silently shipped. Fixed by keeping `resolveSessionUser` purely read-only and moving the deletion into `authMiddleware`'s own reject path, where it belongs.

## Testing

- New `backend/src/__tests__/session-resolution.test.ts` (8 tests): `resolveSessionUser`'s four outcomes (no session / invalid / expired / no role / success), plus `resolveUser`'s "never rejects" contract verified against a minimal standalone Express app (no session → passes through, garbage session → passes through, valid session → `req.user` populated correctly).
- Full backend suite: **255/255 passing** (first run caught the regression above at 254/255; fixed, then green).
- Manual sanity check against the running dev server: logged in as two different seeded staff accounts (`budi.santoso@ams.local`, `siti.rahma@ams.local`) from the same machine, fired 15 rapid `/api/auth/me` requests as Budi (`RateLimit-Remaining` correctly drained 99 → 85), then checked Siti's own remaining count — still a full **99**, completely unaffected by Budi's request volume. Confirms two users sharing one IP now get independent budgets instead of draining a shared one.

## Commit

Left uncommitted, per the standing "review later" pattern.

## Dev servers

Left running (backend picked up the change automatically via `nodemon`'s file-watch restart — confirmed in the logs) since you're still in the middle of manual testing this session.
