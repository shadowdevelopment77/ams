# Rate limiter identity keying

## Context

User asked, while manually testing, whether hitting `apiLimiter`'s 429 would recur at real scale (300 staff at one client, same office wifi, checking in around shift start). Confirmed: yes. Neither `apiLimiter` (100 req/15min, global) nor `authLimiter` (10 req/15min, login/register/logout) specify a `keyGenerator`, so both default to IP-based keying — everyone behind one office router shares a single bucket. A shift-start rush would exhaust `authLimiter` (10 total logins for the whole building per 15 min) almost instantly.

## Plan

1. Extract the cookie→session→user→role lookup out of `auth.middleware.ts` into a shared `resolveSessionUser` helper. `authMiddleware` uses it and rejects on failure (unchanged behavior); a new `resolveUser` middleware uses it and never rejects (just calls `next()`, with or without `req.user` set).
2. Mount `resolveUser` ahead of `apiLimiter` in `app.ts` so the limiter can see who's calling.
3. Re-key `apiLimiter` by `req.user?.id ?? req.ip` (per-user once authenticated). Re-key `authLimiter` by the submitted email (falls back to IP for logout, which has none) — this properly scopes login throttling to "attempts against one account" instead of "requests from one IP."
4. No numeric cap changes — once correctly keyed, both limits are per-person/per-account, which was never the actual problem.

## Verification

- `npx tsc --noEmit` clean.
- New tests for `resolveUser` (populates req.user on valid session, passes through cleanly on missing/invalid/expired).
- Full backend `npm test` green (rate-limit enforcement itself is skipped in test env already, unaffected).
- Manual sanity check: two different accounts from the same IP don't interfere with each other.
