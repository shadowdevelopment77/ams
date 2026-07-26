# CLAUDE.md — <Ams App>

## What this project is

A workforce management system backend + frontend for outsourcing companies that manage field staff (security, cleaning, drivers, etc.) across multiple client companies. Built by a solo developer transitioning from an admin/outsourcing-operations background into backend development. Portfolio project — no real users/data, meant to demonstrate backend architecture and test discipline to recruiters.

## Roles and permissions
- ADMIN — full access to everything. No company_id/division_id (not tied to any single company). Can create/manage companies, divisions, shifts, checklist templates/items. Can register new users (including other admins). Can move STAFF between companies (re-validating their division against the new company). Can delete companies/divisions/users — deleting a company or division is BLOCKED if it still has active staff assigned.
- SUPERVISOR — no company_id/division_id either. Only feature: visit logging (capture a photo + notes when visiting a client company). No one-visit-per-day limit — can log multiple visits, including to the same company on the same day.
- STAFF — must have exactly one company_id AND one division_id, always (enforced at registration and at move-company time). Core flows: check in (photo + shift required) → do checklist (photo-verified, 1-3 photos per item) → check out (photo required, triggers early-leave flag if before shift end). One check-in per day, enforced at both the app layer and a DB-level unique constraint (@@unique([user_id, date])) with a race-condition fallback (P2002 handling) verified by firing concurrent requests in tests. 

## Core business rules
- Division names are unique per-company, but the same name can repeat across different companies (e.g. two companies can each have a "Security" division).
- Shifts can cross midnight (e.g. 22:00–06:00); early-leave detection correctly accounts for this.
- Staff can't touch today's checklist without checking in first. A checklist "belongs" to a single day's attendance — it can't be reopened once that attendance is no longer "today's."
- Each checklist item needs 1–3 photos before the whole checklist can be submitted; submission is blocked if any item has zero photos.
- Session-based auth (httpOnly cookie named sessionId, not JWT). Session TTL is configurable via SESSION_TTL_HOURS env var (defaults to 2 hours if unset).
- Cookie flags: secure/sameSite are environment-aware — lax + non-secure for local/same-site dev, none + secure for cross-site production (frontend and backend on different domains).

## frontend side
- make sure you you set time out on main core business (checkin, checkout, login, logout, register, or any CRUD which is fill the Database) so user cant spam it make it maximum 1 sec
- make 2 type language english and bahasa indonesia, after all feature is done don't make on middle development
- make like virtual mobile to manual test on desktop for staff and supervisor flow , so in this app i want to test staff and supervisor flow also , instead using mobile phone i need using from desktop browser,  but the rule can only using phone still on there (if its possible)


## Architecture

# Backend
- Stack: TypeScript, Express 5, PostgreSQL, Prisma 7 (custom client output path, @prisma/adapter-pg), Zod validation, Multer → Cloudinary for photo uploads, bcrypt for passwords.
- Pattern: repository pattern (interfaces + Prisma implementations) behind a service layer behind controllers. Soft deletes everywhere (is_deleted/deleted_at, never hard-deleted). Lookup tables instead of enums (UserRole, AttendanceStatus), seeded once, referenced by FK.
- Modules (each with controller/service/validation/router): auth, attendance, visit, checklist, company, division, shift, user.

# Frontend
- Stack: React 19, TypeScript, Vite, TanStack Query, React Hook Form
Zod, React Router, shadcn/ui, Tailwind v4.
- Structure: api/ (one file per backend module, wraps fetch calls), features/ (pages grouped by domain: admin, attendance, auth, checklist), components/ (shared, including ProtectedRoute, MobileOnlyGate, ConfirmDialog, PhotoInput), hooks/ (useMe, useLogout, useIsMobile, useTodayAttendance).
- Device-gating: ADMIN can use any device (desktop is the comfortable default, not enforced). STAFF/SUPERVISOR are blocked immediately at login if not detected as a real mobile device (matchMedia '(pointer: coarse)' + UA check) — this isn't just UX preference, it protects the integrity of "photos must be a live camera capture," since desktop browsers fall back to a plain file picker instead of opening a camera.



## Current status (remove this after phase complete, this is just hook what we do right now)
Backend: all 8 modules built and fully tested.
Frontend: in progress via Claude Code, phased (the phase-by-phase plans/reports live on the `staging` branch, not `main`).
Not yet deployed (deployment paused — see docs for reasoning around free-tier hosting constraints).


## Test
- generate for file test, and make sure your test is accurate for every feature
- if u meet any fail or bug on your test, make sure you make report into separate md file
- loop the test every time you make new feature or fix something
- i need you to give me instruction for make any manual test using md file

## Commands
# Backend (run from backend/)
- Run tests: npm test
- Start dev server: npm run dev
- Build: npm run build
- Reset test database: DATABASE_URL="<ams_test connection string>" npx prisma migrate reset --force
- Apply migrations (no reset): npx prisma migrate deploy
# Frontend (run from frontend/)
- Start dev server: npm run dev
- Run E2E tests: npm run test:e2e
- Build: npm run build
- Lint: npm run lint

## additional 
- read RULEs.md inside folder docs
- every screenshot progress must be inside Screenshot folder, inside this folder you must make new folder every phase (ex: phase xxxxxx , then all ss progress inside that) 
- my command actually its not full i just write for that i know, if u need add the command u can do that and dont forget to log it
- if my app need optimize you must report and make plan what will you build into my app (you can explain and make file md) you need my approval first
- make technical documentation also for me to understand this