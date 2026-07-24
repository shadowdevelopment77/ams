# Frontend Phase 3 Plan — App Shell (API client + auth)

Builds directly on Phase 2's scaffold (`docs/superpowers/plans/2026-07-23-frontend-phase2-scaffold.md`). Goal: a working login → protected-route → logout loop, proving the whole auth pipeline end-to-end, with no attendance-specific screens yet — those are Phase 4.

## Decisions and why

**A hand-written `fetch` wrapper, not axios.** The backend's response envelope (`{success, message, data|errors}`, with the `data.data` nesting on paginated lists — see `docs/API.md`) needs unwrapping and error-typing on every call regardless of which HTTP client is used, so axios wouldn't remove any of that work — it would just be one more dependency for what a ~30-line `fetch` wrapper already covers. Session-cookie auth needs `credentials: 'include'` either way.

**`GET /api/auth/me` is the source of truth for auth state, not client-side state.** The session cookie is httpOnly — the frontend can never read it directly, so there is no way to know "am I logged in" except asking the server. Caching the result in TanStack Query (rather than re-fetching manually everywhere) means every component that needs "who's logged in" reads from one cache entry, and a `401` response is treated as a normal "logged out" state, not a query error to retry.

**Route protection via a wrapper component checking the cached `useMe()` result, not a router `loader`.** React Router loaders run before render and would need their own fetch-and-cache logic outside TanStack Query, duplicating the auth check. A `<ProtectedRoute>` that reads `useMe()` keeps exactly one code path for "who is the current user."

**Role gating built in now, even though only STAFF exists as a real flow.** `<ProtectedRoute allow={['STAFF']}>` costs nothing extra today and means Phase 4+ (SUPERVISOR, ADMIN) don't require reworking the route-guard itself, only adding routes.

**Zod login schema mirrors the backend's `loginSchema` shape exactly** (`backend/src/modules/auth/auth.validation.ts`: `email` via `z.email()`, `password` min-length 1) — same validation contract on both sides, same mental model as the rest of this project.

## Plan

1. `src/api/client.ts` — `apiFetch<T>(path, options)`: prefixes `VITE_API_URL`, sets `credentials: 'include'`, parses the JSON envelope, throws a typed `ApiError` (status + message + zod issues if present) on `success: false` or a non-2xx.
2. `src/api/auth.ts` — typed functions: `login(email, password)`, `logout()`, `getMe()`, calling the client above against `/api/auth/{login,logout,me}`.
3. `src/lib/queryClient.ts` — a single `QueryClient` instance; wired into `main.tsx` via `QueryClientProvider`.
4. `src/hooks/useMe.ts` — `useQuery` wrapping `getMe()`; a 401 resolves to `{isAuthenticated: false}` rather than an error state (using `retry: false` and treating 401 specifically, not `throwOnError`).
5. `src/components/ProtectedRoute.tsx` — reads `useMe()`; shows a loading state while pending, redirects to `/login` if unauthenticated, redirects to `/login` (or a "not authorized" state) if the role doesn't match an allowed list, otherwise renders its children.
6. `src/routes/router.tsx` — `createBrowserRouter`: `/login` (public), `/` (protected, `STAFF` only for now, renders a stub "Logged in as {name} · [Logout]" dashboard placeholder — the real dashboard is Phase 4).
7. `src/features/auth/LoginPage.tsx` — react-hook-form + the Zod schema above, calls `login()`, on success invalidates the `me` query (so `useMe()` picks up the new session) and navigates to `/`.
8. Logout — a button on the stub dashboard calling `logout()`, then clearing the `me` query cache and navigating to `/login`.
9. `main.tsx` — wrap `<RouterProvider>` in `<QueryClientProvider>`.

## Verification

- `npx tsc -b` — 0 errors.
- `npm run build` — clean.
- Manual click-through against the real dev backend (`npm run dev` in `backend/`) + dev DB: visiting `/` while logged out redirects to `/login`; logging in with the seeded dev admin's credentials... *(note: dev admin is ADMIN, not STAFF — for a true STAFF-role check, log in as a STAFF user created via the admin account first, or verify the role gate rejects ADMIN from the STAFF-only route as expected)*; refreshing the page preserves the logged-in state (proves `useMe()` correctly restores session, not just post-login state); logout clears the session and redirects to `/login`; visiting `/` again post-logout redirects back to `/login` instead of showing stale cached data.
