# Frontend Phase 3 Report — App Shell (API client + auth)

See `docs/superpowers/plans/2026-07-23-frontend-phase3-app-shell.md` for the plan and the reasoning behind each choice. This doc covers what was actually built and verified.

## What was built

| File | What, and why |
|---|---|
| `src/api/client.ts` | `apiFetch<T>()` — the one place `credentials: 'include'` and envelope-unwrapping happen. Throws a typed `ApiError` (status, message, zod issues) on `success: false` or non-2xx, so every caller gets consistent error handling for free. |
| `src/api/auth.ts` | `login()`, `logout()`, `getMe()`, and the `CurrentUser`/`Role` types. `phone` is typed `string \| null \| undefined` — verified against a real `/me` response that it comes back as Prisma's raw `null`, not `undefined`, so a stricter `phone?: string` would have been subtly wrong. |
| `src/lib/queryClient.ts` | Single `QueryClient`, `retry: false` globally — a `401` on `/me` shouldn't retry 3 times before resolving to "not logged in." |
| `src/hooks/useMe.ts` | Wraps the `/me` query; exposes `{user, isLoading, isAuthenticated}` and specifically distinguishes a `401` (`isUnauthenticated`) from a genuine fetch failure. |
| `src/components/ProtectedRoute.tsx` | Loading state while `useMe()` resolves, redirect to `/login` if unauthenticated, redirect to `/login` if the role isn't in the route's `allow` list (currently just `['STAFF']`), otherwise renders children. |
| `src/features/auth/LoginPage.tsx` | react-hook-form + a Zod schema copied field-for-field from `backend/src/modules/auth/auth.validation.ts`'s `loginSchema`. On success, invalidates the `me` query (so `useMe()` picks up the new session before navigating) and routes to `/`. Server-side errors (wrong password, etc.) surface via `ApiError.message`. |
| `src/features/attendance/DashboardStub.tsx` | Placeholder post-login screen — "Logged in as {name} ({role})" + a logout button. Real dashboard is Phase 4. |
| `src/routes/router.tsx` | `createBrowserRouter`: `/login` public, `/` protected (`STAFF` only). |
| `src/main.tsx` | Now wraps `<RouterProvider>` in `<QueryClientProvider>`. |
| Added shadcn components: `input.tsx`, `label.tsx`, `card.tsx` | Needed for the login form. No new npm dependencies pulled in for any of the three (verified via `git diff package.json` — empty). |
| Deleted `src/App.tsx` | No longer referenced — `main.tsx` renders the router directly now instead of a single `<App/>`. |

## A bug hit twice now, and a real logic bug caught before it shipped

**Same shadcn CLI alias bug as Phase 2, again.** `npx shadcn@latest add input label card` wrote the three new files to a literal `./@/components/ui/` folder again, not `src/components/ui/`. Moved them to the correct location the same way as Phase 2. Confirmed pattern: **any future `npx shadcn add`** in this project will need the same manual fix — noting this plainly so it isn't a surprise next time.

**`queryClient.setQueryData(ME_QUERY_KEY, undefined)` on logout does nothing.** First draft of the logout handler tried to clear the cached user by setting the query data to `undefined` — but TanStack Query treats `undefined` as "no update," not "clear the value," so the stale cached user would have stuck around after logout until the next full refetch. Caught this before it shipped and switched to `queryClient.removeQueries()`, which actually clears the cache entry.

## Verification

**What was actually run, and what it proves:** no Chrome extension is connected in this session (checked directly — `claude-in-chrome` reported it isn't set up), so the real click-through-in-a-browser step from the plan's verification section could not be performed. In its place, I ran the exact HTTP sequence the frontend's `api/` layer makes, against the real dev backend + dev DB, with a real STAFF user created via the admin account for the test:

1. `GET /api/auth/me` unauthenticated → `401` (this is exactly what `ProtectedRoute` checks to decide whether to redirect to `/login`).
2. `POST /api/auth/login` as a real STAFF user → `200`, response shape `{user: {id,name,email,role}}` matches `login()`'s declared return type exactly.
3. `GET /api/auth/me` with the session cookie → `200`, full shape `{id,name,email,phone,role,companyId,divisionId}` matches `CurrentUser` exactly (this is what caught the `phone: null` typing issue above).
4. Repeated the same `/me` call with the same cookie (simulating a page refresh) → same `200` result, proving session state actually persists server-side across what would be a reload, not just immediately after login.
5. `POST /api/auth/logout` → `200`.
6. `GET /api/auth/me` again, same (now-dead) cookie → `401` — proves a post-logout visit to `/` would correctly bounce back to `/login` instead of showing stale data.

Also confirmed, statically: `npx tsc -b` and `npm run build` both clean; every new/changed source file (`main.tsx`, `router.tsx`, `LoginPage.tsx`, `DashboardStub.tsx`, `ProtectedRoute.tsx`) served over the Vite dev server with a `200` and no transform errors in the server log.

**What this does *not* prove:** actual React rendering, client-side redirect behavior, form validation error display, or loading-state UI — none of that can be exercised without a real browser. If you want that level of confidence before moving on, either connect the Chrome extension (`/chrome` or https://claude.ai/chrome) so I can drive it directly next time, or click through it yourself: `cd backend && npm run dev`, `cd frontend && npm run dev`, visit `http://localhost:5173/`.

Test fixtures (the company/division/staff user created for step 2 above) were cleaned up afterward — verified via a direct Prisma query, zero left over.

## Commit

Committed to `feature/frontend-setup` (frontend-folder commits are now scoped-allowed per your instruction).
