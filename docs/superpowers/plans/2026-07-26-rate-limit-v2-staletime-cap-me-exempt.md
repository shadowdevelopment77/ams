# Rate limit v2 — query caching, cap headroom, /me exemption

## Context

User hit `apiLimiter`'s 429 again during manual testing, but this time from a single ADMIN session (not the shared-IP problem fixed last phase). Root cause: `frontend/src/lib/queryClient.ts` sets no `staleTime`, defaulting to 0 — every query refetches on every mount and every window-focus event, including `GET /api/auth/me`. Normal admin navigation (switching between Companies/Divisions/Staff/Visits/Checklists while building out a company→division→shift→checklist) generated 100+ real requests within minutes. Once `apiLimiter` started returning 429 on `/me`, `ProtectedRoute` likely treated that as "logged out," retried login, and `authLimiter` tripped too.

## Plan

1. `frontend/src/lib/queryClient.ts` — add `staleTime: 30_000` to `defaultOptions.queries`. Cuts redundant refetching at the source (TanStack Query only refetches-on-focus/mount when actually stale).
2. `backend/src/middlewares/rate-limit.middleware.ts` — `apiLimiter`: raise `max` 100 → 300 (safe now it's correctly per-user, not shared); `skip` now also exempts `GET /api/auth/me` entirely (passive identity check, same reasoning already used to exclude it from `authLimiter`).

## Verification

- `tsc` clean both sides.
- Backend `npm test` green.
- Manual: replay a similar admin session, confirm no 429; confirm `GET /api/auth/me` never decrements `RateLimit-Remaining`.
