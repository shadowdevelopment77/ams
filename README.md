# AMS — Admin Management System

A REST API + web app for a **Workforce Field Management System** — built for outsourcing companies that manage field staff (security, cleaning, maintenance, etc.) across multiple client companies. Handles role-based attendance, supervisor visit logging, and photo-verified daily checklists, with strict business rules enforced end-to-end.

> **Backend-first.** The API (`backend/`) was built and hardened first, with a full integration test suite — see [Testing](#testing) and [API Usage](#api-usage) for how to explore it without a UI. The frontend (`frontend/`) is now being scaffolded on top of it; it's early and not yet usable end-to-end.

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

**Frontend** (`frontend/`) — in progress

| Layer | Tech |
|---|---|
| Framework | React + Vite, TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Routing | React Router |
| Server state | TanStack Query |
| Forms | react-hook-form + Zod |

Talks to the API directly over cookie-based session auth (`credentials: 'include'`) — no BFF/proxy layer.

---

## Core Business Rules

- **Three roles:** `ADMIN` (full access, no company/division), `SUPERVISOR` (visit logs only, no company/division), `STAFF` (exactly one company + one division, required).
- **Staff attendance:** must check in before checking out; must check in before touching today's checklist; one check-in per day, enforced at both the application layer and the database (`@@unique([user_id, date])`), with a graceful fallback for race conditions on double check-in.
- **Checklists:** each item needs 1–3 photos before it can be submitted; a checklist "belongs" to a single day's attendance and can't be reopened once that day has passed.
- **Shifts** can cross midnight (e.g. 22:00–06:00) — early-leave detection accounts for this correctly.
- **Admin actions:** create/manage companies, divisions, shifts, and checklist templates; move staff between companies (which correctly re-validates their division against the *new* company); delete companies/divisions is blocked while active staff are still assigned, preventing orphaned state.

---

## Testing

This project has **full integration tests, not just unit tests** — every test hits real HTTP routes via Supertest, exercises real middleware (auth, role checks, multipart file uploads, Zod validation), and reads/writes a real PostgreSQL test database. The only things mocked are outbound third-party calls (Cloudinary uploads, reverse geocoding) — everything else, including race-condition handling, runs for real.

**Modules covered:** Auth, Attendance, Visit Log, Checklist, Company, Division, Shift, User (including the staff-move and delete flows).

Run the suite:
```bash
npm test
```

A handful of real bugs were caught and fixed *because* of this test suite, not despite it — including a session cookie name mismatch that silently broke all authenticated routes, an inverted conditional that let staff check in with shifts belonging to other divisions, a missing route parameter that made checkout permanently non-functional, and a couple of race conditions on double check-in / duplicate registration (now handled via database-level unique constraints with a graceful fallback, verified by firing concurrent requests in the test suite itself).

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

Create `.env`:
```
DATABASE_URL="postgresql://user:password@host:5432/dbname"
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Optional — both have working defaults if omitted
PORT=3000
CORS_ORIGIN=http://localhost:5173
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

### Frontend setup (in progress)

In a second terminal, from the repo root:
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
VITE_API_URL=http://localhost:3000
```

Run it (with the backend dev server from above already running):
```bash
npm run dev
```
Opens on `http://localhost:5173` — matches the backend's default `CORS_ORIGIN`, so no extra config needed on either side.

---

## API Usage

The frontend isn't functional yet, so the API is still worth exploring directly. **Full endpoint reference: [`docs/API.md`](docs/API.md)** — auth model, response envelope details, upload constraints, and every route grouped by module.

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
│                   # company, division, shift, user — each with
│                   # controller / service / validation / router
├── repositories/   # interfaces + Prisma implementations (repository pattern)
├── middlewares/    # auth, role-based access, rate limiting, error handling
├── jobs/           # scheduled tasks (hourly expired-session cleanup)
├── lib/            # shared clients: Prisma, Cloudinary, Multer
├── utils/          # shared helpers (date/shift math, error responses, uploads)
├── types/          # ambient type augmentation (Express.Request.user/sessionId)
└── __tests__/      # integration tests + shared test helpers/factories
```

`frontend/src/` (in progress):
```
src/
├── api/            # fetch client + typed endpoint calls
├── components/     # shared UI, including components/ui (shadcn)
├── features/       # one folder per domain: auth, attendance, checklist
├── hooks/          # shared React hooks
├── lib/            # utilities (e.g. shadcn's cn() helper)
└── routes/         # route/page components
```

---

## Author

**Adly Fathur**
[LinkedIn](https://www.linkedin.com/in/adly-fathur-ichsani-kameswara-1a4243369/) · [adlydevelopment37@gmail.com](mailto:adlydevelopment37@gmail.com)
