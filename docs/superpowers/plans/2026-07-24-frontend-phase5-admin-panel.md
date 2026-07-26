# Frontend Phase 5 Plan — Admin Panel

## Why

The STAFF daily flow (Phase 4) is shipped and committed. Companies, divisions, shifts, checklist templates/items, and staff users currently only exist via hand-run scripts or curl — there's no way to see or verify the real admin workflow, which the user flagged directly ("I can't see properly if the app is working or not") while reviewing the checklist screenshots. Scope confirmed with the user: companies/divisions/shifts, checklist templates/items, staff/supervisor management, and read-only attendance/visit records — desktop-first, since ADMIN is the one role explicitly allowed on any device (unlike STAFF/SUPERVISOR's mobile-only gate from Phase 3.5).

## What's already there

Two Explore agents mapped both sides before this plan was written, so nothing below is guessed:

**Backend — the entire admin CRUD surface already exists and is tested.** Company, Division, Shift, Checklist templates/items, Users, plus read-only Attendance (`getByDate`, `getLate`, `getAttendancePhotos`) and Visit log endpoints, all gated by `roleMiddleware('ADMIN')`. This phase is a **frontend-only build** — no new backend endpoints needed for the core CRUD. Full endpoint-by-endpoint reference (method, role, request shape, response shape) is in the exploration notes folded into the main plan file; the short version:
- Company/Division/Shift: standard CRUD, soft-delete, 409 on duplicate-name or active-staff-still-assigned.
- Checklist templates (`GET /templates` — **not paginated**, returns a plain array, unlike everything else) and items (paginated), plus an admin evidence viewer (`GET /evidence/item/:itemId`).
- `POST /api/auth/register` is how ADMIN creates STAFF/SUPERVISOR users; `src/modules/user/` handles list/edit/deactivate/move-company afterward.
- Attendance/Visit are read-only reporting endpoints, all requiring `companyId`+`divisionId` (and Attendance also requires `date`, defaulting to today).

**Two real backend gaps found, deliberately not fixed here** (leaving backend alone per standing preference — neither blocks the CRUD build):
1. `GET /api/visit`'s `date` query param is accepted by validation but silently ignored by the service — a date filter on the all-visits list would be dead UI, so it ships without one. Per-user visit photos (`GET /api/visit/user/:userId/photos`) genuinely does filter by date, so that's used instead.
2. No endpoint changes a user's `role`, and `PUT /api/users/:id/move-company` only works for STAFF. "Promote STAFF to SUPERVISOR" isn't buildable without new backend work — out of scope, noted for later.

**Frontend — only 4 shadcn primitives exist** (Button, Card, Input, Label), the router is flat with no layout/`Outlet` pattern anywhere, no Table/Dialog/Select/pagination component exists, and `ApiError.issues` (Zod field errors) is captured but never consumed by any form. Everything else — the `apiFetch<T>`/`ApiError` client convention, `ProtectedRoute` (already supports `allow={['ADMIN']}` with no `requireMobile`, no changes needed), `cn()`, and the RHF+Zod form pattern from `LoginPage` — is solid and reusable as-is.

## Approach

Data cascades **Company → Division → Shift / Checklist Template → Checklist Item**, and the backend's own list endpoints enforce that shape (shifts and checklist templates have no unscoped "list all," only company+division-scoped lists). So the admin UI follows the same hierarchy — drill in from a Company list — rather than flat top-level pages each needing their own company/division picker.

**Foundation, built once and reused everywhere below:**
- `npx shadcn@latest add table dialog select textarea badge skeleton` (same `base-nova` style already configured for the 4 existing components).
- `src/features/admin/AdminLayout.tsx` — sidebar nav + `<Outlet/>`, mounted at `/admin` behind `<ProtectedRoute allow={['ADMIN']}>`.
- First use of nested routes (`children:` + `Outlet`) in `src/routes/router.tsx` — nothing in this codebase does this yet.
- A typed helper for the `PaginatedResult<T>` envelope (`{data, total, page, limit, totalPages}`), honestly typed against the one real exception (checklist templates returns a plain array).
- Field-error mapping so a Dialog form can surface `ApiError.issues` (Zod validation errors) against the right field, not just a generic banner — matters more here than in `LoginPage` since admin forms have more fields.
- **Company list + create/edit/delete** built first, against this foundation, to prove the whole pattern before repeating it three more times.

**Then, in dependency order:** Division+Shift (nested under a company), Checklist templates+items (nested under a division), Staff/Supervisor management (`/admin/staff` — list/register/edit/move-company/deactivate; no role-change UI, per gap #2 above), then the read-only Attendance/Visit views (`/admin/attendance`, `/admin/visits` — visit list ships without a date filter, per gap #1 above).

## Testing

Playwright golden-path coverage per stage as it's built — create company → division → shift → checklist template → item; register a staff user; load the attendance/visit views — matching the rigor from Phases 3.5/4, but not exhaustive edge-case coverage given the size of this phase.

## Docs

This plan doc now; one consolidated report doc (`docs/superpowers/reports/2026-07-24-frontend-phase5-admin-panel-report.md`) after, covering the whole phase rather than one per stage.
