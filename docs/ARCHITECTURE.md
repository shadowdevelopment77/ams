# AMS — Architecture

Deep-dive companion to [`API.md`](API.md) (endpoint reference) and the root [`README.md`](../README.md) (setup/quickstart). This doc explains *how the system is put together and why*, backend to frontend.

## System overview

AMS is a workforce field-management system for outsourcing companies managing staff (security, cleaning, drivers, etc.) across multiple client companies. Three roles — `ADMIN`, `SUPERVISOR`, `STAFF` — cover admin setup/oversight, client-visit logging, and daily attendance + photo-verified checklists respectively.

```
frontend/  React + Vite SPA, talks directly to the API over cookie session auth
backend/   Express 5 API, Prisma 7 + PostgreSQL, session-cookie auth
```

No BFF/proxy layer — the frontend calls the backend directly with `credentials: 'include'`.

## Backend architecture

### Layering

Each domain module (`backend/src/modules/<name>/`) follows the same shape:

```
<name>.router.ts       route table + middleware chains (auth, role, rate limit, validation)
<name>.controller.ts   thin HTTP glue: parse req, call service, sendSuccess/sendError
<name>.service.ts      business logic, orchestrates repositories
<name>.validation.ts   Zod schemas + validation middleware
```

Modules: `auth`, `attendance`, `visit`, `checklist`, `company`, `division`, `shift`, `user`.

Below the service layer sits the **repository pattern**: `backend/src/repositories/interfaces/` defines the contract per model, `backend/src/repositories/implementors/` has the Prisma-backed implementation, and `index.repositories.ts` wires up one singleton instance of each, imported by services. `PrismaBaseRepository` (`implementors/base.repository.ts`) supplies generic CRUD + pagination; each concrete repository just declares `modelName` and adds its own query methods.

### Data model highlights

- **Soft deletes everywhere** — `is_deleted`/`deleted_at` on every domain table, nothing hard-deleted in any production code path.
- **Lookup tables instead of enums** — `UserRole` and `AttendanceStatus` are real tables (seeded once, referenced by FK), not Prisma enums — makes adding a new role/status a data change, not a migration.
- **`UserCompanyRole`** is the join between a `User` and their company/division assignment + role. `@@unique([user_id])` (added after a real orphaned-assignment bug) — exactly one row per user, ever. `company_id`/`division_id` are nullable (ADMIN/SUPERVISOR are never assigned one; STAFF always is, enforced at the application layer) with `onDelete: Restrict` on both FKs, matching the soft-delete-only architecture — a stray hard-delete of a Company/Division fails loudly instead of silently orphaning assignments.
- **`Attendance`** has `@@unique([user_id, date])` — one check-in per person per day, enforced at the DB level with a `P2002`-catching fallback in the service for the race-condition case (verified by firing concurrent requests in tests).
- **`ChecklistSubmission`/`ChecklistPhoto`** — a submission belongs to one `Attendance` + one `ChecklistItem`; up to 3 photos per submission (`MAX_PHOTOS_PER_ITEM` in `checklist.service.ts`). No location columns of its own — checklist location display reuses the parent `Attendance`'s own `location_address`.
- **GPS**: `Attendance` (check-in and check-out separately) and `VisitLog` each store `latitude`/`longitude`/a reverse-geocoded `location_address` (`backend/src/utils/geocode.ts`, via Nominatim). Coordinates are required (not optional) at the Zod layer — the frontend captures them via the browser Geolocation API and blocks submission without them.

### Auth & session model

Session-cookie auth, not JWT: `POST /api/auth/login` sets an httpOnly `sessionId` cookie (`SESSION_TTL_HOURS` env var, defaults to 2h). `backend/src/middlewares/auth.middleware.ts`'s `resolveSessionUser` does the cookie → `Session` → `User` → `UserCompanyRole` lookup once; `authMiddleware` wraps it and rejects on failure, `resolve-user.middleware.ts`'s `resolveUser` wraps the same function but never rejects (used purely so the rate limiter can key by identity — see below). Cookie flags are environment-aware: `lax` + non-secure for local/same-site dev, `none` + `secure` for cross-site production.

### Rate limiting

Two limiters (`backend/src/middlewares/rate-limit.middleware.ts`), both keyed by **identity, not raw IP** — an earlier version defaulted to IP-based keying, which meant every user behind one office router/NAT shared a single budget (a real problem at this app's actual target scale — dozens of staff on one office wifi). `authLimiter` (login/register/logout, 10/15min) keys by the submitted email; `apiLimiter` (everything else, 300/15min) keys by `req.user?.id` once `resolveUser` has resolved it, falling back to IP only for anonymous requests. `GET /api/auth/me` is exempt from `apiLimiter` entirely — it's a passive check fired on every navigation/focus, and rate-limiting it the same as real endpoints risks a cascading lockout (a 429 on `/me` reads as "logged out," triggers a login retry, which then trips `authLimiter` too).

### Uploads

Photos (check-in, check-out, checklist items, visit logs) go through Multer (memory storage, JPEG/PNG/WEBP only, 1MB limit) → `sharp` compression → Cloudinary (`backend/src/utils/uploadImage.ts`).

## Frontend architecture

### Structure

```
src/api/         one file per backend module, wraps fetch calls + response types
src/features/    pages grouped by domain: auth, attendance, checklist, visit, admin/*
src/components/  shared UI incl. components/ui (shadcn, Base UI-backed)
src/hooks/       useMe, useLogout, useIsMobile, useTodayAttendance
src/lib/         queryClient, geolocation, downloadImage, virtualMobile, formErrors
src/routes/      router.tsx (React Router v7 route tree)
```

`features/admin/` mirrors the backend's module list, one page per domain (Companies, Staff, Attendance, Checklists, Visits), all under `AdminLayout.tsx`.

### Routing & access control

`ProtectedRoute` (`components/ProtectedRoute.tsx`) wraps every route: checks `useMe()` for auth + role (`allow: Role[]`), and optionally `requireMobile` for STAFF/SUPERVISOR routes. Device gating (`useIsMobile`) is a **workflow guardrail, not a security boundary** — it stops accidental desktop use of camera-capture screens, not a determined bypass; both signals it checks are client-controlled. A login-page checkbox (`lib/virtualMobile.ts`) lets STAFF/SUPERVISOR flows be tested from a desktop browser without weakening the real gate for actual use.

### Server state

TanStack Query, with a global `staleTime: 30_000` (`lib/queryClient.ts`) — this was added after ordinary admin navigation (switching panels, tab refocus) was refetching everything from scratch on every mount/focus and generating well over 100 real requests in minutes, tripping `apiLimiter`. 30s keeps data reasonably fresh while letting normal back-and-forth reuse what was just fetched.

### Business-rule-driven UI patterns

- **Mandatory GPS** — `lib/geolocation.ts`'s `getCurrentPosition()` wraps the browser API in a Promise; check-in, check-out, and visit-log all call it before submitting and block with a clear error on denial, mirroring the photo-required guard.
- **Move-Company** — admin action gated on the target being an active STAFF member (both server- and client-side); moving an inactive user is rejected.
- **Checklist evidence** — the admin Checklists page groups photos by item (not a flat list), since an item can have 1-3 photos from possibly several staff — a flat grid made different items indistinguishable once photos left their per-item context.

## Testing strategy

**Backend**: Jest + Supertest, full integration tests — every test hits real HTTP routes, exercises real middleware (auth, roles, multipart uploads, Zod validation), and reads/writes a real Postgres test database (`backend/.env.test`, wiped between tests via `__tests__/setup.ts`). Only outbound third-party calls (Cloudinary, Nominatim) are mocked. `globalSetup.ts` self-heals a known Neon-pooler/advisory-lock interaction that could otherwise block `migrate deploy` between runs.

**Frontend**: Playwright E2E (`frontend/e2e/`), two projects (`desktop-chromium`, `mobile-chromium`) covering auth/device-gate, STAFF daily flow, SUPERVISOR visit flow, and the full admin panel golden path. Run **per-project with a fresh backend restart between each** — a full continuous run across both projects exceeds `authLimiter`'s budget on its own. `geolocation`/`permissions: ['geolocation']` are pre-granted in `playwright.config.ts` so the mandatory-GPS flows don't hang on a browser permission prompt.

## Current status

Backend: all 8 modules built and fully tested. Frontend: built out through many phases (admin panel, STAFF/SUPERVISOR flows, checklist evidence, GPS, rate-limit hardening) — see `docs/superpowers/plans/` and `docs/superpowers/reports/` for phase-by-phase history. Not yet deployed (paused on free-tier hosting constraints).
