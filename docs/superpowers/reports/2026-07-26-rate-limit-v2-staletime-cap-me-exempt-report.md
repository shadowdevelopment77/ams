# Rate limit v2 Report — query caching, cap headroom, /me exemption

See `docs/superpowers/plans/2026-07-26-rate-limit-v2-staletime-cap-me-exempt.md` for the plan.

## What was built

- `frontend/src/lib/queryClient.ts` — added `staleTime: 30_000` to the global `defaultOptions.queries`. Previously unset (TanStack Query defaults to `staleTime: 0`), so every query was stale from the instant it landed — every panel switch and every browser-tab focus event refetched everything currently mounted, including `GET /api/auth/me`. This was the real cause of a single ADMIN session generating 100+ real requests in minutes just from ordinary navigation while setting up a company/division/shift/checklist.
- `backend/src/middlewares/rate-limit.middleware.ts` — `apiLimiter`: raised `max` from 100 to 300 (safe now that it's correctly keyed per-user from the previous phase, not a shared building-wide bucket — this is headroom for one busy admin session, not a reopened "many users share one limit" problem). Added a `skip` condition exempting `GET /api/auth/me` entirely — it's a passive, side-effect-free identity check that `ProtectedRoute` fires on every navigation/focus, and rate-limiting it the same as real data endpoints created a self-inflicted lockout: a 429 on `/me` reads as "logged out" to the frontend, which retries login, which then trips `authLimiter` too. Matches the reasoning already documented for why `authLimiter` itself excludes this same route.

## Testing

- `npx tsc --noEmit` (backend) / `npx tsc -b` + `npm run build` (frontend) — clean.
- Backend `npm test` — 255/255 passing (rate-limit enforcement is skipped in the test environment either way, unaffected).
- Manual verification intentionally left to the user this round, per their stated preference to run the dev servers themselves and watch the logs directly.

## Commit

Left uncommitted, per the standing "review later" pattern.
