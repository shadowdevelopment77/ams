# AMS — Admin Management System

A REST API + web app for a **Workforce Field Management System** — built for outsourcing companies that manage field staff (security, cleaning, maintenance, etc.) across multiple client companies. Handles role-based attendance, supervisor visit logging, and photo-verified daily checklists, with strict business rules enforced end-to-end.

> **Full-stack and tested end-to-end.** The API (`backend/`) has a full integration test suite; the frontend (`frontend/`) covers the full admin panel plus the STAFF and SUPERVISOR daily flows, installable as a PWA, with Playwright E2E coverage across both. Currently being prepped for a live, free-tier public deploy — see [`docs/PRODUCTION_LAUNCH.md`](docs/PRODUCTION_LAUNCH.md) for that plan, and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how it's all put together.

---

## Screenshots

<table>
<tr>
<td width="33%"><img src="https://raw.githubusercontent.com/shadowdevelopment77/ams/staging/Screenshot/readme-gallery/01-login.png" width="100%"/><br/><sub><b>Login</b> — with a one-click demo credentials card for anyone trying the app</sub></td>
<td width="33%"><img src="https://raw.githubusercontent.com/shadowdevelopment77/ams/staging/Screenshot/readme-gallery/02-admin-companies.png" width="100%"/><br/><sub><b>Admin</b> — companies at a glance</sub></td>
<td width="33%"><img src="https://raw.githubusercontent.com/shadowdevelopment77/ams/staging/Screenshot/readme-gallery/03-admin-attendance.png" width="100%"/><br/><sub><b>Admin</b> — attendance, filtered by company/division</sub></td>
</tr>
<tr>
<td width="33%"><img src="https://raw.githubusercontent.com/shadowdevelopment77/ams/staging/Screenshot/readme-gallery/04-admin-checklists.png" width="100%"/><br/><sub><b>Admin</b> — photo-verified checklist evidence, grouped by item</sub></td>
<td width="33%"><img src="https://raw.githubusercontent.com/shadowdevelopment77/ams/staging/Screenshot/readme-gallery/05-admin-visits.png" width="100%"/><br/><sub><b>Admin</b> — supervisor visit logs across companies</sub></td>
<td width="33%"><img src="https://raw.githubusercontent.com/shadowdevelopment77/ams/staging/Screenshot/readme-gallery/06-device-gate.png" width="100%"/><br/><sub><b>Device gate</b> — STAFF/SUPERVISOR routes refuse desktop browsers</sub></td>
</tr>
<tr>
<td width="33%"><img src="https://raw.githubusercontent.com/shadowdevelopment77/ams/staging/Screenshot/readme-gallery/07-staff-dashboard.png" width="100%"/><br/><sub><b>Staff</b> — checked in for the day</sub></td>
<td width="33%"><img src="https://raw.githubusercontent.com/shadowdevelopment77/ams/staging/Screenshot/readme-gallery/08-staff-checklist.png" width="100%"/><br/><sub><b>Staff</b> — submitting the daily checklist with photo evidence</sub></td>
<td width="33%"><img src="https://raw.githubusercontent.com/shadowdevelopment77/ams/staging/Screenshot/readme-gallery/09-supervisor-dashboard.png" width="100%"/><br/><sub><b>Supervisor</b> — today's client visits</sub></td>
</tr>
</table>

More screenshots (every phase of the build, staff check-in/out, PWA install, etc.) are on the [`staging`](https://github.com/shadowdevelopment77/ams/tree/staging/Screenshot) branch, alongside the full phase-by-phase implementation plans and test reports.

---

## Why this project

I used to work as an admin handling outsourced staff — attendance, shift schedules, checklists, that kind of day-to-day operational work. This project is my attempt to build the backend for a system that would have solved real problems I saw in that job: staff spread across multiple client companies, shift-based check-in/out, and proof-of-work checklists with photos. It's also how I taught myself backend development and testing while transitioning into it.

---

## Tech Stack

**Backend** (`backend/`)

| Layer | Tech |
|---|---|
| Runtime | Node.js, TypeScript |
| Framework | Express 5 |
| Database | PostgreSQL |
| ORM | Prisma 7 (with `@prisma/adapter-pg`) |
| Auth | Session-based (httpOnly cookies), bcrypt password hashing |
| Validation | Zod |
| File uploads | Multer (memory storage) → Cloudinary |
| Testing | Jest, ts-jest, Supertest (full integration tests against a real Postgres instance) |
| Rate limiting | express-rate-limit |

**Architecture:** repository pattern (interfaces + Prisma implementations) behind a service layer, soft deletes throughout (`is_deleted`/`deleted_at`, nothing is ever hard-deleted), lookup tables instead of enums for roles/statuses, and role-based middleware guarding every route.

**Frontend** (`frontend/`)

| Layer | Tech |
|---|---|
| Framework | React + Vite, TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (Base UI) |
| Routing | React Router v7 |
| Server state | TanStack Query |
| Forms | react-hook-form + Zod |
| PWA | vite-plugin-pwa — installable (manifest + service worker), no browser chrome once added to a phone's home screen |
| E2E testing | Playwright (desktop + mobile-viewport projects) |

Talks to the API directly over cookie-based session auth (`credentials: 'include'`) — no BFF/proxy layer. Covers the full admin panel (companies/divisions/shifts/checklists/staff/attendance/visits) and the STAFF (check-in → checklist → check-out) and SUPERVISOR (visit logging) daily flows, with a mobile-only device gate on the latter two roles (camera-capture integrity, not a hard security boundary — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)).

---

## Core Business Rules

- **Three roles:** `ADMIN` (full access, no company/division), `SUPERVISOR` (visit logs only, no company/division), `STAFF` (exactly one company + one division, required).
- **Staff attendance:** must check in before checking out; must check in before touching today's checklist; one check-in per day, enforced at both the application layer and the database (`@@unique([user_id, date])`), with a graceful fallback for race conditions on double check-in.
- **Checklists:** each item needs 1–3 photos before it can be submitted; a checklist "belongs" to a single day's attendance and can't be reopened once that day has passed.
- **Shifts** can cross midnight (e.g. 22:00–06:00) — early-leave detection accounts for this correctly.
- **Admin actions:** create/manage companies, divisions, shifts, and checklist templates; move staff between companies (which correctly re-validates their division against the *new* company); delete companies/divisions is blocked while active staff are still assigned, preventing orphaned state.

---

## Testing

**Backend** has **full integration tests, not just unit tests** — every test hits real HTTP routes via Supertest, exercises real middleware (auth, role checks, multipart file uploads, Zod validation), and reads/writes a real PostgreSQL test database. The only things mocked are outbound third-party calls (Cloudinary uploads, reverse geocoding) — everything else, including race-condition handling, runs for real.

**Modules covered:** Auth, Attendance, Visit Log, Checklist, Company, Division, Shift, User (including the staff-move and delete flows), Admin (the production reset-demo job).

Run the suite:
```bash
npm test
```

A handful of real bugs were caught and fixed *because* of this test suite, not despite it — including a session cookie name mismatch that silently broke all authenticated routes, an inverted conditional that let staff check in with shifts belonging to other divisions, a missing route parameter that made checkout permanently non-functional, and a couple of race conditions on double check-in / duplicate registration (now handled via database-level unique constraints with a graceful fallback, verified by firing concurrent requests in the test suite itself).

**Frontend** has Playwright E2E coverage across two projects (`desktop-chromium`, `mobile-chromium`): auth + device gate, the full admin panel golden path, the STAFF daily flow, and the SUPERVISOR visit flow. Run per-project with a fresh backend restart between each (the suite's real auth-call volume sits close to `authLimiter`'s budget in one continuous run):
```bash
cd frontend
npm run test:e2e -- --project=desktop-chromium
npm run test:e2e -- --project=mobile-chromium
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- A PostgreSQL database

### Setup
```bash
git clone https://github.com/shadowdevelopment77/ams.git
cd backend
npm install
```

Copy `backend/.env.example` to `backend/.env` and fill in real values — it documents every variable, including the optional ones (`PORT`, `CORS_ORIGIN`, `SESSION_TTL_HOURS` all have working defaults if omitted; `RESET_DEMO_SECRET` is only needed for the production reset-demo job, see [`docs/PRODUCTION_LAUNCH.md`](docs/PRODUCTION_LAUNCH.md)):
```bash
cp backend/.env.example backend/.env
```

Create `.env.test` (a **separate** database — the test suite wipes data between runs):
```
DATABASE_URL="postgresql://user:password@host:5432/dbname_test"
NODE_ENV=test
```

Apply the schema:
```bash
npx prisma migrate deploy
```

Seed lookup tables and a dev admin account (required — `POST /api/auth/register` needs an existing `ADMIN` session, so this is the only way to get the first user):
```bash
npx prisma db seed
```
This creates the `ADMIN`/`SUPERVISOR`/`STAFF` roles, the `PRESENT`/`LATE` attendance statuses, and a dev-only admin account (`admin@ams.local` / `Admin123!`, refused outright if `NODE_ENV=production`). Safe to re-run any time.

Run the dev server:
```bash
npm run dev
```

Run the tests:
```bash
npm test
```

### Frontend setup

In a second terminal, from the repo root:
```bash
cd frontend
npm install
```

Copy `frontend/.env.example` to `frontend/.env.local`:
```bash
cp frontend/.env.example frontend/.env.local
```

Run it (with the backend dev server from above already running):
```bash
npm run dev
```
Opens on `http://localhost:5174` (pinned via `vite.config.ts`'s `strictPort`) — update the backend's `CORS_ORIGIN` to match if you change it.

---

## Deployment

Not live yet — the full runbook for a free, permanently-online, self-resetting public demo (Render + Vercel/Netlify + Neon + Cloudinary + GitHub Actions, all $0/month) is written up in [`docs/PRODUCTION_LAUNCH.md`](docs/PRODUCTION_LAUNCH.md), including a `POST /api/admin/reset-demo` job that wipes all visitor-generated data every 2 hours, back to a clean empty slate (just the 3 admin logins + role/status lookup tables) — so each visitor builds their own example data live rather than exploring pre-seeded content.

---

## API Usage

The full endpoint reference is at [`docs/API.md`](docs/API.md) — auth model, response envelope details, upload constraints, and every route grouped by module. Handy for exploring the API directly (curl, Postman) alongside or instead of the UI.

The short version:
- Session-cookie auth (not JWT) — login sets an httpOnly `sessionId` cookie; send it back with every subsequent request (`credentials: 'include'` in fetch, `-b`/`-c` cookie jar in curl).
- All endpoints require an authenticated session except `POST /api/auth/login`. Registration is itself `ADMIN`-gated — log in as the seeded dev admin to create more users.
- Responses follow a consistent shape: `{ success: boolean, message: string, data | errors }`.

Quick smoke test once the dev server is running:
```bash
curl http://localhost:3000/health

curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ams.local","password":"Admin123!"}'

curl -b cookies.txt http://localhost:3000/api/auth/me
```

---

## Project Structure

`backend/src/`:
```
src/
├── modules/        # one folder per domain: auth, attendance, visit, checklist,
│                   # company, division, shift, user, admin (reset-demo job) —
│                   # each with controller / service / validation / router
├── repositories/   # interfaces + Prisma implementations (repository pattern)
├── middlewares/    # auth, role-based access, rate limiting, error handling
├── jobs/           # scheduled tasks (hourly expired-session cleanup)
├── seed/           # shared demo-data seed logic, used by both the manual
│                   # scripts/ and the production reset-demo endpoint
├── lib/            # shared clients: Prisma, Cloudinary, Multer
├── utils/          # shared helpers (date/shift math, error responses, uploads)
├── types/          # ambient type augmentation (Express.Request.user/sessionId)
└── __tests__/      # integration tests + shared test helpers/factories
```

`frontend/src/`:
```
src/
├── api/            # one file per backend module: fetch calls + typed responses
├── components/     # shared UI, including components/ui (shadcn, Base UI-backed)
├── features/       # one folder per domain: auth, attendance, checklist, visit,
│                   # and admin/ (mirrors the backend's module list: companies,
│                   # staff, attendance, checklists, visits)
├── hooks/          # useMe, useLogout, useIsMobile, useTodayAttendance
├── lib/            # queryClient, geolocation, downloadImage, virtualMobile, cn()
└── routes/         # router.tsx — the full route tree
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how these pieces fit together.

---

## Author

**Adly Fathur**
[LinkedIn](https://www.linkedin.com/in/adly-fathur-ichsani-kameswara-1a4243369/) · [adlydevelopment37@gmail.com](mailto:adlydevelopment37@gmail.com)
