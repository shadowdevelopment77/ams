# AMS Backend API Reference

Base URL (dev): `http://localhost:3000`. All business endpoints are under `/api`.

## Auth model

- Session-cookie auth. `POST /api/auth/login` sets an httpOnly `sessionId` cookie (2 hour expiry, `sameSite: lax`, `secure` in production only).
- Every frontend request that needs auth must be sent with `credentials: 'include'` (fetch) or `withCredentials: true` (axios) — the cookie is httpOnly, so it's never readable/settable from JS, only the browser handles it.
- CORS is scoped via the `CORS_ORIGIN` env var (default `http://localhost:5173`, Vite's default dev port) with `credentials: true`. If your frontend dev server runs on a different port, set `CORS_ORIGIN` in `backend/.env` to match it exactly — a wildcard origin cannot be paired with credentialed requests, so this must be an exact match, not `*`.
- Three roles: `ADMIN`, `SUPERVISOR`, `STAFF`. Each endpoint below lists which role(s) it requires (`authMiddleware` alone just means "any authenticated user").
- The very first ADMIN account isn't created through the API (register is itself admin-gated) — it's seeded via `npx prisma db seed` (see `backend/prisma/seed.ts`; dev credentials `admin@ams.local` / `Admin123!`, refused in production).
- **Restoring session state on app load/refresh**: the session cookie is httpOnly, so the frontend has no way to read it directly, and `login`'s response body is the only place user identity is ever returned otherwise. Call `GET /api/auth/me` once when the app mounts — `200` means the session is valid (response body is the current user), `401` means not logged in, redirect to the login screen. Don't cache user identity in localStorage as a substitute for this — it can't tell you whether the server-side session is still valid.

## Response envelope

Every endpoint returns one of:
```json
{ "success": true,  "message": "...", "data": <payload> }
{ "success": false, "message": "...", "errors": null | [{...zod issues}] }
```
**Paginated list endpoints nest an extra `data` layer** — the outer `data` field is itself `{ data: [...], total, page, limit, totalPages }`. So for a list endpoint, the actual array is at `response.data.data`, not `response.data`. `limit` defaults to 10, max 100.

## Uploads

Three upload endpoints (`checkin`, `checkout`, checklist photo, visit photo) all use the same constraints: `multipart/form-data`, field name per endpoint below, `image/jpeg` / `image/png` / `image/webp` only, **1MB max per file**. A disallowed type returns `400` with a message matching `jpeg, png, and webp`; an oversized file returns `413` with a message matching `file too large`.

---

## Auth (`/api/auth`)

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | /register | ADMIN | `{name, email, password, role, company_id?, division_id?}` — ADMIN/SUPERVISOR must NOT include company_id/division_id; STAFF must include both |
| POST | /login | none | `{email, password}` → sets `sessionId` cookie |
| POST | /logout | none (reads cookie if present) | — |
| GET | /me | any authenticated user | — → `{id, name, email, phone, role, companyId?, divisionId?}` for the current session |

## Users (`/api/users`) — all ADMIN

| Method | Path | Notes |
|---|---|---|
| GET | / | paginated list, excludes password |
| GET | /:id | |
| GET | /company/:companyId/division/:divisionId | paginated |
| PUT | /:id | `{name?, email?, phone?}` — profile fields only, not password/role |
| PUT | /:id/move-company | `{company_id, division_id}` — STAFF only |
| DELETE | /:id | soft delete, also invalidates their sessions |

## Company (`/api/company`) — all ADMIN

Full CRUD: `GET /`, `GET /:id`, `POST /` `{name, code, address?, phone?, email?, logo_url?}`, `PUT /:id` (same fields, partial), `DELETE /:id` (blocked if active staff still assigned).

## Divisions (`/api/divisions`) — all ADMIN

Full CRUD: `GET /`, `GET /:id`, `GET /company/:companyId`, `POST /` `{company_id, name, late_tolerance_minutes?}`, `PUT /:id`, `DELETE /:id` (blocked if active staff assigned).

## Shift (`/api/shift`) — all ADMIN

`GET /company/:companyId/division/:divisionId` (no unscoped "list all" — always requires both ids), `GET /:id`, `POST /` `{company_id, division_id, name, start_time, end_time}` (`"HH:mm"` format), `PUT /:id`, `DELETE /:id`.

## Attendance (`/api/attendance`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /checkin | STAFF | multipart, field `photo`, body `{shift_id, latitude?, longitude?}` |
| PATCH | /checkout/:id | STAFF | multipart, field `checkout_photo`, body `{checkout_latitude?, checkout_longitude?}` |
| PATCH | /early-leave/:id | STAFF | `{early_leave_reason}` |
| GET | / | ADMIN | query: `companyId`, `divisionId` (required), `date?`, `page?`, `limit?`, `statusId?` |
| GET | /late | ADMIN | same query shape |
| GET | /attendance-photos | ADMIN | same query shape |

One checkin per user per day (`409` on a second attempt, race-safe). No `getById` or delete — attendance is a workflow resource driven by checkin→checkout→early-leave, not freeform CRUD.

## Checklist (`/api/checklist`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /templates | ADMIN | `{company_id, division_id, title}` |
| GET | /templates | ADMIN | query: `companyId`, `divisionId` (required) |
| GET | /templates/:id | ADMIN | |
| PUT | /templates/:id | ADMIN | |
| DELETE | /templates/:id | ADMIN | |
| POST | /items | ADMIN | `{template_id, order_no, description, requires_photo}` |
| GET | /items/template/:templateId | ADMIN | paginated |
| GET | /items/:id | ADMIN | |
| PUT | /items/:id | ADMIN | |
| DELETE | /items/:id | ADMIN | |
| GET | /my-checklist | STAFF | today's checklist submissions for the caller |
| POST | /:attendanceId/items/:itemId/photo | STAFF | multipart, field `photo`; today-only, max 3 photos/item |
| POST | /:attendanceId/submit | STAFF | fails if any item has no photo |
| GET | /evidence/item/:itemId | ADMIN | query: `companyId` (required), `date?`, `page?`, `limit?` |

## Visit (`/api/visit`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | / | SUPERVISOR | multipart, field `photo`, body `{company_id, latitude?, longitude?, notes?}` |
| GET | /my-visits | SUPERVISOR | own visits, query: `date?`, `page?`, `limit?` |
| GET | / | ADMIN | all visits, same query shape |
| GET | /:id | ADMIN | |
| DELETE | /:id | ADMIN | soft delete |
| GET | /user/:userId/photos | ADMIN | query: `date?`, `page?`, `limit?` |

No update endpoint and no per-user daily limit (unlike attendance) — visit logs are a read-mostly evidence trail by design.

## Misc

- `GET /health` — no auth, not rate-limited. Returns `{success:true, message:'Healthy', data:{status:'ok'}}`.
- Rate limits: 100 req/15min on all of `/api/*`, additionally 10 req/15min on `/api/auth/*`. Both skipped when `NODE_ENV=test`.
