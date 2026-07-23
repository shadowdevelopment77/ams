# AMS Backend — Reconciliation, Bug Fixes & Hardening (Plan 1 of 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get the AMS backend (`/home/shadowxz/Downloads/project/ams/backend`) into a fully working, fully tested, deployable state — merging in a real integration test suite that already exists on an unmerged branch, fixing three concrete bugs, and provisioning cloud infra so it can be built/run/tested from GitHub Codespaces (the user's laptop — a Celeron N2xx with 4GB RAM — cannot run Node/Postgres locally at all).

**Architecture:** No architectural changes. This plan reconciles two diverged git branches of the same well-designed codebase, fixes 2 auth-ordering bugs + 1 error-handling bug, and wires up free-tier cloud infrastructure (Neon Postgres, existing Cloudinary pipeline) so the app is runnable and testable end to end.

**Tech Stack:** Express 5, TypeScript, Prisma 7 (`@prisma/adapter-pg`), PostgreSQL (Neon), session-cookie auth, Zod, Multer + sharp + Cloudinary, Jest + ts-jest + Supertest.

## Context

This is a portfolio project for an outsourcing-company workforce management app (attendance/visitlog/checklist, 3 roles: ADMIN/SUPERVISOR/STAFF, multi-tenant via Company→Division). The user lost their previous portfolio project when their PC died, and is now rebuilding this one but can't run Node or Postgres on their current machine — everything has to happen in GitHub Codespaces, with this plan as the exact script to follow there.

Investigation (full repo history + branch diffing, not just the working tree) found the project is in much better shape than it first looked. The `main` branch is missing an entire integration test suite, but that suite **already exists**, fully written, on an unmerged branch: `origin/test/jest/all`. The two branches diverged from a common ancestor and each picked up real, non-overlapping work — `main` has minor service fixes the test branch lacks; the test branch has the test suite plus two real bug **fixes** that `main` never received (not "regressions main introduced" — main simply never merged them):

1. `attendance.service.ts`'s `checkIn` is missing a `try/catch` around the DB write that turns a `P2002` unique-constraint violation (`@@unique([user_id, date])`) into a clean `409 "Already checked in today"` instead of an unhandled crash under concurrent requests.
2. `rate-limit.middleware.ts` is missing a `skip: () => process.env.NODE_ENV === 'test'` clause, which the test suite needs to avoid self-rate-limiting during a fast test run.

Separately, `main`'s `prisma/seed.ts` calls `prisma.submissionStatus.createMany(...)` — a model that was dropped in the most recent migration (`20260707201930_remove_review_supervisor`). This will crash at seed time. The test branch's `seed.ts` never had this call added — merging fixes it for free.

The root `README.md` (135 lines, exists only on `main`) already describes this test suite in detail, including its concurrency tests, as if it were merged — it currently reads as aspirational/false, but becomes **accurate** the moment this merge happens. No README rewrite is needed.

Two additional, pre-existing bugs were found identically on both branches (unrelated to the divergence, confirmed via diff showing these files are untouched by either branch since the merge-base):

- `auth.router.ts`: `POST /register` runs Zod validation (`validateRegister`) *before* the `adminOnly` auth check, so an unauthenticated caller gets validation feedback instead of failing closed with 401.
- `attendance.router.ts`: `POST /checkin` and `PATCH /checkout/:id` run Multer's file upload *before* the `staffOnly` auth check, meaning an unauthenticated request can make the server buffer an uploaded file into memory before ever checking who's asking.

And one error-handling gap: `error.middleware.ts` only special-cases `AppError` instances. Multer's own `fileFilter` currently throws a plain `Error` (not `AppError`), and Multer's built-in `LIMIT_FILE_SIZE` error is a `MulterError` (also not `AppError`) — both currently fall through to a generic, unstructured `500`, instead of the app's normal `{success:false, message, errors}` JSON shape at the correct status code.

**Decisions already made, not open for reconsideration in this plan:**
- Dev/build/test environment: **GitHub Codespaces** (already used by the user; local machine can't run this stack).
- Photo storage: **keep Cloudinary** as-is — it's already fully implemented (multer memory → sharp compress → Cloudinary stream upload) and has a generous free tier (25GB storage + 25GB bandwidth/month). No migration to S3/R2.
- Dev database: **Neon Postgres** free tier.
- Test database: **a second Neon branch** of the same project (not a devcontainer Postgres container — this repo has no `.devcontainer/` yet, and adding one just to run Postgres is more moving parts than a one-click Neon branch for zero functional gain).
- This plan does **not** cover deployment (Render/Vercel) or the frontend (React+Vite PWA) — those are Plan 2 and Plan 3, staged separately so each plan ships something independently verifiable.

**Execution ownership — who actually runs what, and where:**
Claude Code in this session runs on the user's local machine via a Bash tool — it has no separate connection into GitHub Codespaces and cannot execute anything there directly. Concretely:
- **Task 0 and Task 1 (git-only, no Node/npm needed)** are executed directly in this session, against the local clone at `/home/shadowxz/Downloads/project/ams`, which is a real git repo wired to `origin` (`github.com/shadowdevelopment77/ams.git`). Plain git operations (branch, merge, commit) run fine on this hardware regardless of spec.
- **Pushing the resulting branch to `origin`** is a separate, explicit confirmation step (visible to others / affects the shared GitHub repo) — not bundled automatically into "accept the plan." Ask before running `git push`.
- **Tasks 2–6 (anything needing `npm install`, Prisma, Jest, or `npm run dev`)** require a real Node runtime. This session will NOT attempt to run those on the user's local Celeron N2xx/4GB machine — that's the exact workload the user already said this hardware can't handle, and why Codespaces was chosen. Those tasks are written as an exact runbook for the user (or a fresh Claude Code session started inside the Codespace) to execute there, using the plan doc committed into the repo (see Task 0) as the script to follow.

## Global Constraints

- All commands in this plan are meant to be run inside a GitHub Codespace opened on this repo, not on the user's local machine.
- Every database operation (migrate, seed, test) must target Neon, never a local Postgres (none exists in this environment).
- `.env` and `.env.test` are never committed — only `.env.example` / `.env.test.example` are.
- Keep `main`'s version verbatim wherever a merge conflict is purely cosmetic (confirmed identical route ordering/behavior on both sides) — do not "fix" formatting during the merge.
- Repository path: `/home/shadowxz/Downloads/project/ams` (backend at `/home/shadowxz/Downloads/project/ams/backend`). Git remote `origin` = `https://github.com/shadowdevelopment77/ams.git`, already fetched locally with `test/jest/all` present as `origin/test/jest/all`.

---

## Task 0: Commit this plan into the repo so it's available in Codespaces

**Files:**
- Create: `/home/shadowxz/Downloads/project/ams/docs/superpowers/plans/2026-07-23-backend-reconciliation.md`

- [ ] **Step 1: Copy the plan file into the repo**

```bash
mkdir -p /home/shadowxz/Downloads/project/ams/docs/superpowers/plans
cp /home/shadowxz/.claude/plans/steady-wibbling-deer.md /home/shadowxz/Downloads/project/ams/docs/superpowers/plans/2026-07-23-backend-reconciliation.md
```

- [ ] **Step 2: Commit it on the reconciliation branch (created in Task 1, Step 1) — so do this step after Task 1 Step 1, before Task 1 Step 2**

```bash
cd /home/shadowxz/Downloads/project/ams
git add docs/superpowers/plans/2026-07-23-backend-reconciliation.md
git commit -m "Add backend reconciliation plan doc"
```

This makes the plan visible in the repo (and therefore inside any Codespace opened on this branch) as the runbook for Tasks 2–6.

---

## Task 1: Reconcile `main` and `origin/test/jest/all`

**Files:**
- Modify (auto-merges cleanly, no manual conflict resolution): `backend/.gitignore`, `backend/prisma/seed.ts`, `backend/src/middlewares/rate-limit.middleware.ts`, `backend/src/modules/attendance/attendance.service.ts`, `backend/src/index.ts`
- Create (auto-merges cleanly): `backend/jest.config.js`, `backend/src/__tests__/attendance.test.ts`, `backend/src/__tests__/auth.test.ts`, `backend/src/__tests__/checklist.test.ts`, `backend/src/__tests__/company.test.ts`, `backend/src/__tests__/divisiont.test.ts`, `backend/src/__tests__/shift.test.ts`, `backend/src/__tests__/user.test.ts`, `backend/src/__tests__/visit.test.ts`, `backend/src/__tests__/env.ts`, `backend/src/__tests__/globalSetup.ts`, `backend/src/__tests__/setup.ts`, `backend/src/__tests__/helpers/factories.ts`, `backend/src/__tests__/helpers/request.ts`
- Conflict — resolve by keeping `main`'s version exactly: `backend/src/modules/shift/shift.router.ts`, `backend/src/modules/user/user.router.ts`, and possibly `backend/prisma.config.ts`, `backend/tsconfig.json` (single-line changes on both sides — may auto-merge; if `git status` lists either as conflicted, treat identically)
- Delete: `backend/src/utils/response.ts` (byte-identical duplicate of `backend/src/utils/error.response/response.ts`; confirmed via `git grep` that nothing imports the bare path)

- [ ] **Step 1: Create the integration branch from a clean, up-to-date `main`**

```bash
cd /home/shadowxz/Downloads/project/ams
git checkout main
git status
```
Expected: `nothing to commit, working tree clean`

```bash
git fetch origin
git checkout -b chore/reconcile-test-suite
```

- [ ] **Step 2: Merge the test branch in**

```bash
git merge --no-ff origin/test/jest/all -m "Merge origin/test/jest/all: restore integration test suite, checkin race-condition handling, and test-mode rate-limit bypass"
```

Expected output ends with:
```
Auto-merging backend/.gitignore
Auto-merging backend/prisma/seed.ts
Auto-merging backend/src/index.ts
Auto-merging backend/src/middlewares/rate-limit.middleware.ts
Auto-merging backend/src/modules/attendance/attendance.service.ts
CONFLICT (content): Merge conflict in backend/src/modules/shift/shift.router.ts
CONFLICT (content): Merge conflict in backend/src/modules/user/user.router.ts
Automatic merge failed; fix conflicts and then commit the result.
```
`prisma.config.ts` and `tsconfig.json` each only changed by one identical line on both sides and will most likely auto-merge; if `git status` also lists either as "both modified," resolve it the same way as the two routers below.

- [ ] **Step 3: Resolve conflicts by keeping `main`'s version verbatim**

```bash
git checkout --ours -- backend/src/modules/shift/shift.router.ts backend/src/modules/user/user.router.ts
git add backend/src/modules/shift/shift.router.ts backend/src/modules/user/user.router.ts
```
Only if `git status` shows these as conflicted too:
```bash
git checkout --ours -- backend/prisma.config.ts backend/tsconfig.json
git add backend/prisma.config.ts backend/tsconfig.json
```

- [ ] **Step 4: Verify nothing else is unresolved**

```bash
git status
```
Expected: `All conflicts fixed but you are still merging.` — only the files above listed under "Changes to be committed."

- [ ] **Step 5: Finish the merge commit**

```bash
git commit --no-edit
```

- [ ] **Step 6: Confirm the cosmetic files are byte-identical to pre-merge `main`**

```bash
git diff main..HEAD -- backend/src/modules/shift/shift.router.ts backend/src/modules/user/user.router.ts backend/prisma.config.ts backend/tsconfig.json
```
Expected: no output.

- [ ] **Step 7: Confirm the intended fixes actually landed**

```bash
git diff main..HEAD -- backend/src/modules/attendance/attendance.service.ts
```
Expected: shows a new `import { Prisma } from '../../../generated/prisma'` and a `try { ... } catch (err) { if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw new AppError('Already checked in today', 409); throw err }` block wrapping `attendanceRepository.create(...)`.

```bash
git diff main..HEAD -- backend/src/middlewares/rate-limit.middleware.ts backend/.gitignore backend/prisma/seed.ts
```
Expected: shows `const isTest = process.env.NODE_ENV === 'test'` + `skip: () => isTest` added to both `apiLimiter` and `authLimiter`; `.env.test` added to `.gitignore`; the `prisma.submissionStatus.createMany(...)` block removed from `seed.ts`.

- [ ] **Step 8: Remove the dead duplicate file**

```bash
grep -rn "from ['\"].*utils/response['\"]" backend/src --include="*.ts" | grep -v "error.response/response"
```
Expected: no output (confirms nothing imports the bare path).

```bash
git rm backend/src/utils/response.ts
git commit -m "Remove dead duplicate utils/response.ts (superseded by utils/error.response/response.ts, confirmed unused)"
```

- [ ] **Step 9: Sanity-check the full resulting diff against pre-merge `main`**

```bash
git diff main..HEAD --stat
```
Expected: additions for `jest.config.js` + all 8 `__tests__/*.test.ts` files + `helpers/{factories,request}.ts` + `env.ts`/`globalSetup.ts`/`setup.ts`; modifications to `.gitignore`, `seed.ts`, `rate-limit.middleware.ts`, `attendance.service.ts`; deletion of `utils/response.ts`; **zero changes** to `shift.router.ts`, `user.router.ts`, `prisma.config.ts`, `tsconfig.json`, `README.md`.

---

## Task 2: Create `.env.example` and `.env.test.example`

**Files:**
- Create: `backend/.env.example`
- Create: `backend/.env.test.example`

**Interfaces:**
- Consumes: env var names read by `backend/src/lib/prisma.ts` (`DATABASE_URL`), `backend/src/lib/cloudinary.ts` (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`), `backend/src/index.ts` (`PORT`), and `backend/src/__tests__/env.ts`/`globalSetup.ts` (`.env.test`'s `DATABASE_URL`, `NODE_ENV`).

- [ ] **Step 1: Create `backend/.env.example`**

```bash
# Postgres connection string. Recommended: Neon (https://neon.tech) free tier.
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# Server
PORT=3000
NODE_ENV=development

# Cloudinary — used for check-in/check-out selfies, checklist photos, and
# visit-log photos (see src/lib/cloudinary.ts and src/utils/uploadImage.ts).
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

- [ ] **Step 2: Create `backend/.env.test.example`**

```bash
# Separate Postgres database used ONLY by the Jest integration suite.
# src/__tests__/setup.ts wipes all rows (except UserRole/AttendanceStatus
# lookup tables) before EVERY test — never point this at dev or prod.
#
# Recommended: a second Neon branch of your dev project (e.g. "test") —
# see Task 3 for setup instructions.
DATABASE_URL="postgresql://user:password@host/dbname_test?sslmode=require"

NODE_ENV=test
```
Cloudinary vars are intentionally omitted — `src/__tests__/setup.ts` mocks `uploadImage` entirely, so tests never call real Cloudinary.

- [ ] **Step 3: Commit**

```bash
git add backend/.env.example backend/.env.test.example
git commit -m "Add .env.example and .env.test.example documenting required environment variables"
```

---

## Task 3: Provision Neon databases, apply migrations, seed, and verify boot

**Files:** none (infra/verification checkpoint gating Tasks 4–6; `.env`/`.env.test` are git-ignored and never committed).

- [ ] **Step 1: Provision the dev database**

In the Neon console (https://neon.tech): create a project (e.g. `ams`), copy its pooled connection string. This becomes `backend/.env`'s `DATABASE_URL`.

- [ ] **Step 2: Provision the test database as a second Neon branch**

In the Neon console: your `ams` project → Branches → "Create branch" → name it `test` → copy its connection string. This becomes `backend/.env.test`'s `DATABASE_URL`.

- [ ] **Step 3: Create the real env files (inside the Codespace, git-ignored)**

```bash
cd /home/shadowxz/Downloads/project/ams/backend
cp .env.example .env
cp .env.test.example .env.test
```
Hand-edit both to paste in the real Neon connection strings and Cloudinary credentials (from your Cloudinary dashboard).

- [ ] **Step 4: Install dependencies and generate the Prisma client**

```bash
npm install
npx prisma generate
```
Expected: `✔ Generated Prisma Client (v7.x.x) to ./generated/prisma`.

- [ ] **Step 5: Apply migrations to the dev database**

```bash
npx prisma migrate deploy
```
Expected: `19 migrations found ... All migrations have been successfully applied.`

- [ ] **Step 6: Seed the dev database**

```bash
npx prisma db seed
```
Expected: `Seed done` printed, process exits 0. If it instead throws referencing `submissionStatus`, Task 1's merge did not land correctly — stop and re-check `git diff main..HEAD -- backend/prisma/seed.ts`.

- [ ] **Step 7: Boot the dev server and smoke-test it**

```bash
npm run dev
```
Expected: `Server running on port 3000` with no uncaught startup errors.

In a second terminal:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"x","password":"x"}'
```
Expected: `400` or `401` — a real JSON error response (not a connection failure), confirming the app, DB adapter, and middleware chain are wired correctly end-to-end. Stop the dev server (`Ctrl+C`) once confirmed.

- [ ] **Step 8: Run the full test suite against the test database**

`globalSetup.ts` automatically runs `prisma migrate deploy` against `.env.test`'s `DATABASE_URL` — no manual migration of the test DB needed.

```bash
npm test
```
Expected: Jest's `globalSetup` log lines (`[globalSetup] Applying migrations...`, `[globalSetup] Seeding lookup tables...`, `[globalSetup] Done.`), then:
```
Test Suites: 8 passed, 8 total
Tests:       XX passed, XX total
```
If any suite fails here, treat it as a genuine finding to investigate (use the `superpowers:systematic-debugging` skill) before proceeding to Task 4 — don't assume it's caused by the reconciliation without checking.

---

## Task 4: Fix middleware ordering (auth before validation/upload)

### 4a. `auth.router.ts` — `/register`

**Files:**
- Modify: `backend/src/__tests__/auth.test.ts`
- Modify: `backend/src/modules/auth/auth.router.ts`

- [ ] **Step 1: Write the failing test**

In `backend/src/__tests__/auth.test.ts`, inside the `describe('POST /api/auth/register', ...)` block, add this directly after the existing `it('rejects an unauthenticated request even with a valid body', ...)` test (that existing test uses a *valid* body on purpose and can't catch this bug — we need the inverse: invalid body + no auth):

```ts
  it('rejects an unauthenticated request with 401 even when the body also fails validation', async () => {
    // Proves adminOnly now runs before validateRegister. Under the current
    // (buggy) ordering — validateRegister, adminOnly — this invalid body
    // would be rejected by Zod with a 400 before the auth check is ever
    // reached, meaning an anonymous caller gets validation feedback instead
    // of a clean fail-closed 401.
    const res = await api().post('/api/auth/register').send({
      name: 'A', // too short
      email: 'not-an-email',
      password: '123', // too short
      role: '',
    })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd backend
npx jest auth.test.ts -t "rejects an unauthenticated request with 401 even when the body also fails validation"
```
Expected: **FAIL** — `expect(received).toBe(expected) // Expected: 401, Received: 400`.

- [ ] **Step 3: Apply the fix**

In `backend/src/modules/auth/auth.router.ts`, swap the middleware order on the `/register` line only:

```ts
import { Router } from "express"
import {authController} from "./auth.controller"
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import {validateRegister, validateLogin} from './auth.validation'


const router = Router()
const adminOnly = [authMiddleware, roleMiddleware("ADMIN")]


router.post("/register", adminOnly, validateRegister, authController.register)
router.post("/login", validateLogin, authController.login)
router.post("/logout", authController.logout)


export default router
```

- [ ] **Step 4: Run the test again to confirm it passes, then the full auth suite**

```bash
npx jest auth.test.ts -t "rejects an unauthenticated request with 401 even when the body also fails validation"
npx jest auth.test.ts
```
Expected: both **PASS** — the new test passes, and none of the existing register/login/logout/session tests regress (they all authenticate first, so reordering doesn't affect them).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/auth/auth.router.ts backend/src/__tests__/auth.test.ts
git commit -m "Fix: run adminOnly auth check before validateRegister on POST /api/auth/register"
```

### 4b. `attendance.router.ts` — `/checkin` and `/checkout/:id`

**Files:**
- Modify: `backend/src/__tests__/attendance.test.ts`
- Modify: `backend/src/modules/attendance/attendance.router.ts`

- [ ] **Step 1: Write the failing tests**

In `backend/src/__tests__/attendance.test.ts`, inside the `describe('POST /api/attendance/checkin', ...)` block, add this directly after the existing `it('rejects an unauthenticated request', ...)` test:

```ts
  it('rejects an unauthenticated request with 401 even when the body also fails validation (no shift_id, no photo)', async () => {
    // Under the current (buggy) ordering — multer, validateCheckIn, staffOnly
    // — a missing shift_id gets caught by validateCheckIn's Zod schema with a
    // 400 before the auth check ever runs, leaking validation feedback to an
    // anonymous caller instead of failing closed with 401.
    const res = await api().post('/api/attendance/checkin')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })
```

Then add a new `describe` block, appended after the `checkin` describe block closes (before `describe('PATCH /api/attendance/checkout/:id', ...)`):

```ts
describe('PATCH /api/attendance/checkout/:id — auth-before-upload ordering', () => {
  it('rejects an unauthenticated request with 401 before multer ever processes the file', async () => {
    const res = await api()
      .patch('/api/attendance/checkout/some-nonexistent-id')
      .attach('checkout_photo', Buffer.from('not-an-image'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
      })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run them to confirm they fail**

```bash
npx jest attendance.test.ts -t "rejects an unauthenticated request with 401 even when the body also fails validation"
npx jest attendance.test.ts -t "rejects an unauthenticated request with 401 before multer ever processes the file"
```
Expected: **FAIL** on both — the checkin one gets `400` (Zod validation ran first), the checkout one gets a `500` (Task 5's error-handling fix hasn't landed yet — that's expected at this point, both are "not 401").

- [ ] **Step 3: Apply the fix**

In `backend/src/modules/attendance/attendance.router.ts`, move `staffOnly` to the front of both chains:

```ts
import { Router } from "express"
import { attendanceController }from "./attendance.controller"
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import {validateCheckIn, validateCheckOut, validateEarlyLeaveReason} from './attendance.validation'
import { uploadAttendance } from '../../lib/multer'

const router = Router()
const staffOnly = [authMiddleware, roleMiddleware("STAFF")]
const adminOnly = [authMiddleware, roleMiddleware("ADMIN")]


router.post("/checkin", staffOnly, uploadAttendance.single("photo"), validateCheckIn, attendanceController.checkIn)
router.patch("/checkout/:id", staffOnly, uploadAttendance.single("checkout_photo"), validateCheckOut, attendanceController.checkOut)
router.get("/", adminOnly, attendanceController.getByDate)
router.get("/late", adminOnly, attendanceController.getLate)
router.patch("/early-leave/:id", validateEarlyLeaveReason, staffOnly, attendanceController.submitEarlyLeaveReason)
router.get("/attendance-photos", adminOnly, attendanceController.getAttendancePhotos)

export default router
```

Note: `early-leave/:id` has the identical `validateEarlyLeaveReason, staffOnly` ordering issue and is deliberately left as-is here — out of scope for this plan. If you want it fixed later, apply the same reorder + an analogous test.

- [ ] **Step 4: Run the tests again to confirm they pass, then the full attendance suite**

```bash
npx jest attendance.test.ts -t "rejects an unauthenticated request with 401 even when the body also fails validation"
npx jest attendance.test.ts -t "rejects an unauthenticated request with 401 before multer ever processes the file"
npx jest attendance.test.ts
```
Expected: both new tests **PASS**; full suite still green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/attendance/attendance.router.ts backend/src/__tests__/attendance.test.ts
git commit -m "Fix: run staffOnly auth check before multer upload and validation on checkin/checkout"
```

---

## Task 5: Structured error responses for Multer errors

**Files:**
- Modify: `backend/src/__tests__/attendance.test.ts`
- Modify: `backend/src/lib/multer.ts`
- Modify: `backend/src/middlewares/error.middleware.ts`

**Interfaces:**
- Consumes: `AppError` class from `backend/src/utils/error.response/appError.ts` (constructor `new AppError(message: string, statusCode: number)`), `sendError` from `backend/src/utils/error.response/response.ts` (signature `sendError(res, message, statusCode)`).

- [ ] **Step 1: Write the failing tests**

In `backend/src/__tests__/attendance.test.ts`, add a new `describe` block after the checkin `describe` block closes (depends on Task 4b being done, since these tests need to actually reach multer):

```ts
describe('POST /api/attendance/checkin — malformed upload handling', () => {
  it('rejects a disallowed file type with a structured 400 response, not a generic 500', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', shift.id)
      .attach('photo', Buffer.from('not-an-image'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/jpeg, png, and webp/i)
  })

  it('rejects a file over the 1MB limit with a structured 413 response, not a generic 500', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const oversized = Buffer.alloc(1 * 1024 * 1024 + 1, 'a') // 1 byte over MAX_SIZE

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', shift.id)
      .attach('photo', oversized, { filename: 'huge.jpg', contentType: 'image/jpeg' })

    expect(res.status).toBe(413)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/file too large/i)
  })
})
```

- [ ] **Step 2: Run them to confirm they fail**

```bash
npx jest attendance.test.ts -t "rejects a disallowed file type with a structured 400 response"
npx jest attendance.test.ts -t "rejects a file over the 1MB limit with a structured 413 response"
```
Expected: **FAIL** on both — current `errorMiddleware` returns `500` / `"Internal server error"` for both, since neither a plain file-filter `Error` nor a `MulterError` is an `AppError` instance.

- [ ] **Step 3: Fix `backend/src/lib/multer.ts`**

```ts
import multer from "multer"
import { AppError } from "../utils/error.response/appError"

const imageFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"]
  if (!allowed.includes(file.mimetype)) {
    return cb(new AppError("Only JPEG, PNG, and WEBP images allowed", 400))
  }
  cb(null, true)
}

const MAX_SIZE = 1 * 1024 * 1024 // 1MB

export const uploadAttendance = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: imageFilter,
})

export const uploadChecklist = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: imageFilter,
})

export const uploadVisit = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: imageFilter,
})
```

- [ ] **Step 4: Fix `backend/src/middlewares/error.middleware.ts`**

Multer's own size-limit error (`LIMIT_FILE_SIZE`) is raised by Multer itself before `imageFilter` ever runs, and is a `multer.MulterError`, not an `AppError` — it needs its own branch:

```ts
// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { sendError } from '../utils/error.response/response'
import { AppError } from '../utils/error.response/appError'

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    const statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    return sendError(res, err.message, statusCode)
  }

  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode)
  }

  console.error(err)  // log unexpected errors
  return sendError(res, 'Internal server error', 500)
}
```

- [ ] **Step 5: Run the tests again to confirm they pass, then the full attendance suite**

```bash
npx jest attendance.test.ts -t "rejects a disallowed file type with a structured 400 response"
npx jest attendance.test.ts -t "rejects a file over the 1MB limit with a structured 413 response"
npx jest attendance.test.ts
```
Expected: both new tests **PASS**; no regression elsewhere (valid-photo tests still hit the `cb(null, true)` path unchanged).

- [ ] **Step 6: Commit**

```bash
git add backend/src/lib/multer.ts backend/src/middlewares/error.middleware.ts backend/src/__tests__/attendance.test.ts
git commit -m "Fix: surface Multer file-type/size-limit errors as structured 400/413 JSON responses"
```

---

## Task 6: Full-suite verification

**Files:** none — verification only.

- [ ] **Step 1: Type-check and run the full suite from a clean state**

```bash
cd /home/shadowxz/Downloads/project/ams/backend
npm run build
```
Expected: `tsc` exits 0, no type errors.

```bash
npm test
```
Expected:
```
Test Suites: 8 passed, 8 total
Tests:       XX passed, XX total
```
Specifically confirm the concurrency test in `attendance.test.ts` (`'handles two simultaneous checkins from the same staff — exactly one succeeds'`) passes — it's the one directly exercising the restored `P2002` catch block from Task 1.

- [ ] **Step 2: Re-run the two ordering/upload-fix files in isolation**

```bash
npx jest auth.test.ts attendance.test.ts
```
Expected: both green (rules out test-order interdependence from the bite-sized commits).

- [ ] **Step 3: Final boot smoke check**

```bash
npm run dev
```
Expected: `Server running on port 3000`. `Ctrl+C` to stop once confirmed.

- [ ] **Step 4: Confirm the branch's total diff against original `main` matches intent**

```bash
cd /home/shadowxz/Downloads/project/ams
git log --oneline main..HEAD
git diff main..HEAD --stat
```
Expected: commits for the merge, the dead-file removal, the `.env.example`/`.env.test.example` addition, and the three bug fixes — nothing else.

- [ ] **Step 5: Commit any incidental lockfile changes, if present**

```bash
git status
```
If `backend/package-lock.json` shows as modified (from `npm install` in Task 3):
```bash
git add backend/package-lock.json
git commit -m "Update lockfile after dependency install for test-suite verification"
```
Otherwise, nothing to commit — this task is verification-only.

Branch `chore/reconcile-test-suite` is now fully reconciled, green, and ready to merge into `main` (via PR or direct merge, your call — outside this plan's scope). Plan 2 (React+Vite PWA frontend) and Plan 3 (Render/Vercel/Neon/Cloudinary deployment) build on top of this.

## Verification

End-to-end, this plan is verified when, from a fresh Codespace on this repo:
1. `npm install && npx prisma generate && npx prisma migrate deploy && npx prisma db seed` all succeed against a real Neon dev database with no errors.
2. `npm run dev` boots cleanly and `curl` against `/api/auth/login` returns a real JSON error response.
3. `npm test` reports all 8 suites passing against a real Neon test database, including the concurrency test.
4. `npm run build` type-checks cleanly.
5. `git diff main..HEAD --stat` shows exactly: the test suite + 2 fixes merged in, 1 dead file removed, 2 env-example files added, 2 auth-ordering bugs fixed, 1 error-handling bug fixed — nothing else.
