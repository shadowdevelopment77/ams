# Backend Test & Bug Report — 2026-07-23

Continuation of `docs/superpowers/plans/2026-07-23-backend-reconciliation.md` from Task 3, run inside this GitHub Codespace on branch `chore/reconcile-test-suite`.

## Summary

| | Before this session | After this session |
|---|---|---|
| `npm run dev` | **Crashed** — TS2339 on `req.user`/`req.sessionId` | Boots cleanly, `Server running on port 3000` |
| Admin user | None existed; no way to create one | Seeded via `npx prisma db seed` |
| `npm test` | 200/200 passing (bugs existed but untested) | **205/205 passing**, 8/8 suites |
| `npm run build` | — (not run) | 0 errors |
| Known bugs (auth order, upload order, Multer errors) | Present | Fixed, each with a regression test |

All 5 commits from this session are on `chore/reconcile-test-suite`, not pushed to `origin`.

---

## 1. Blocker: TS2339 on `req.user` / `req.sessionId` — fixed

**Root cause (confirmed, not stale cache):** `src/types/express.d.ts` declares a global `Express.Request` augmentation (`req.user`, `req.sessionId`) that nothing in the codebase ever `import`s — it's ambient/global-only, picked up by `tsc`'s project-wide `include` glob. `nodemon` runs `npm run dev` via `ts-node`, which by default only type-checks files reachable via `require`/`import` starting from the entry point — it never pulls in `express.d.ts`, so under `ts-node` the augmentation silently doesn't apply, while `npx tsc --noEmit` (which compiles the whole `include` glob) looked clean. That's why the two commands disagreed.

**Fix:** added `"ts-node": { "files": true }` to `backend/tsconfig.json`, which tells `ts-node` to eagerly load all files from `tsconfig`'s `include`/`files` instead of inferring them lazily from imports.

**Verified:** `npm run dev` now boots cleanly with no compile errors; `npx tsc --noEmit` still clean.

**Commit:** `0de153a` — *Fix: set ts-node.files=true so nodemon picks up global Express.Request type augmentation*

---

## 2. Blocker: no way to seed/create an admin user — fixed

Two compounding gaps, both confirmed by reading the code (not assumed):

1. `prisma/seed.ts` only ever created `UserRole`/`AttendanceStatus` lookup rows — zero `User` rows.
2. `POST /api/auth/register` is gated behind `adminOnly` auth — there was never a way to create the *first* admin through the API (chicken-and-egg).
3. Additionally, `package.json` had **no `"prisma": {"seed": ...}` key**, so `npx prisma db seed` (which the original reconciliation plan's Task 3 Step 6 assumes works) would have failed outright with Prisma's "no seed file found" error — a gap in the original plan, not just a local environment issue.

**Fix:**
- Added `"prisma": {"seed": "ts-node prisma/seed.ts"}` to `backend/package.json`.
- Extended `prisma/seed.ts` to upsert a bootstrap admin (idempotent, safe to re-run), guarded to refuse running when `NODE_ENV=production`.

**Dev admin credentials (local/dev only, printed to console on seed):**
```
email:    admin@ams.local
password: Admin123!
```
Re-seed any time with `npx prisma db seed` from `backend/`.

**Verified end-to-end:**
```
POST /api/auth/login {"email":"admin@ams.local","password":"Admin123!"}
→ 200 OK, Set-Cookie: sessionId=..., body: {"success":true,...,"role":"ADMIN"}
```

**Commit:** `12cdb8c` — *Wire up prisma db seed and bootstrap a dev-only admin user*

---

## 3. Bug: `/register` validated the body before checking who's asking — fixed

`auth.router.ts` ran `validateRegister` before `adminOnly`, so an anonymous caller with an invalid body got Zod validation feedback (400) instead of failing closed with 401 — a minor information-disclosure/fail-open pattern (an unauthenticated caller can probe validation rules on an admin-only endpoint).

**Fix:** swapped to `adminOnly, validateRegister`.

**Regression test added** (`auth.test.ts`): anonymous request with an intentionally invalid body now correctly gets 401, not 400.

**Result:** `auth.test.ts` — 26/26 passing.

**Commit:** `d30a7c3`

---

## 4. Bug: checkin/checkout uploaded files before checking auth — fixed

`attendance.router.ts`'s `/checkin` and `/checkout/:id` ran Multer's file upload (buffering the file into memory) and Zod validation *before* the `staffOnly` check. An unauthenticated request could make the server do real work (buffer an arbitrary uploaded file) before ever verifying who's asking — a resource-exhaustion-adjacent issue as well as the same fail-open pattern as #3.

**Fix:** moved `staffOnly` to the front of both middleware chains.

**Regression tests added** (`attendance.test.ts`): unauthenticated checkin (no body) → 401 instead of 400; unauthenticated checkout with a file attached → 401 instead of 500 (see #5 for why it was 500 before both fixes).

**Note — left deliberately unfixed, confirmed still present:** `PATCH /early-leave/:id` has the identical ordering bug (`validateEarlyLeaveReason, staffOnly` — validation before auth). This was flagged as out-of-scope in the original plan and is not touched here. Worth the same fix + test in a follow-up.

**Commit:** `4e2766a`

---

## 5. Bug: Multer errors returned unstructured 500s — fixed

`error.middleware.ts` only special-cased `AppError`. Two Multer failure paths fell through to a generic, unstructured `{"message":"Internal server error"}` 500 instead of the app's normal JSON error shape:
- `imageFilter`'s reject path threw a plain `Error` (not `AppError`) for disallowed file types.
- Multer's own `LIMIT_FILE_SIZE` error is a `multer.MulterError`, also not an `AppError`.

**Fix:**
- `multer.ts`: `imageFilter` now throws `new AppError("Only JPEG, PNG, and WEBP images allowed", 400)`.
- `error.middleware.ts`: added a `multer.MulterError` branch — `LIMIT_FILE_SIZE` → 413, everything else → 400 — using the existing `sendError` helper, checked before the `AppError` branch.

**Regression tests added** (`attendance.test.ts`): disallowed file type (`.exe`) → structured 400 with a message matching `/jpeg, png, and webp/i`; oversized file (1MB+1 byte) → structured 413 with a message matching `/file too large/i`.

**Result:** `attendance.test.ts` — 34/34 passing.

**Commit:** `e3c548f`

---

## 6. New finding: flaky back-to-back `npm test` runs via Postgres advisory lock

**Not fixed — flagging for awareness, not blocking.** Running `npx jest <file>` (or `npm test`) twice in quick succession against the same Neon test database intermittently fails `globalSetup`'s `prisma migrate deploy` with:
```
Error: P1002 — Timed out trying to acquire a postgres advisory lock (SELECT pg_advisory_lock(...)). Timeout: 10000ms.
```
This reproduced twice during this session's verification passes, and cleared both times after waiting ~15-20s and retrying — never required any manual intervention.

**Likely cause:** `.env.test`'s `DATABASE_URL` points at a Neon **pooled** connection endpoint (`...-pooler.c-3...`). Prisma's own docs note that advisory locking used by `migrate deploy` doesn't reliably interact with transaction-mode connection poolers (PgBouncer-style, which Neon's pooler uses) — a session-scoped lock can outlive what looks like a closed connection if the pooler reuses the underlying server-side session. `npm test`'s `--forceExit` flag likely compounds this by not giving in-flight connections a clean chance to close between consecutive runs.

**Suggested follow-up (not applied — infra config change, out of scope for this session):** point `globalSetup.ts`'s migration step at Neon's **direct/unpooled** connection string instead of the pooled one (Prisma's documented pattern is a separate `DIRECT_DATABASE_URL` used only for `migrate`/`db push`, while the app and pooled test connections keep using the pooled URL). Low priority — the flakiness is a wait-and-retry annoyance, not a correctness issue, and never affected the app's own runtime behavior in this session.

---

## Final verification (all green)

```
npm run build   → tsc, 0 errors
npm test        → Test Suites: 8 passed, 8 total / Tests: 205 passed, 205 total
npx jest auth.test.ts attendance.test.ts   → 2 passed, 2 total / 60 passed, 60 total (isolation re-check)
npm run dev     → Server running on port 3000, no errors
```

`git diff origin/main..HEAD --stat`: 28 files changed — matches intent (merged test suite, dead-file removal, env examples, 3 known bug fixes, plus this session's ts-node config fix, seed/admin bootstrap, and their regression tests). No unrelated changes.

## Commits this session
```
d30a7c3 Fix: run adminOnly auth check before validateRegister on POST /api/auth/register
4e2766a Fix: run staffOnly auth check before multer upload and validation on checkin/checkout
e3c548f Fix: surface Multer file-type/size-limit errors as structured 400/413 JSON responses
0de153a Fix: set ts-node.files=true so nodemon picks up global Express.Request type augmentation
12cdb8c Wire up prisma db seed and bootstrap a dev-only admin user
```

Not pushed to `origin` — that's a separate, explicit step per the original plan's conventions.
