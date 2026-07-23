# Full Feature + Multi-User Concurrency Test Report — 2026-07-23

Follow-up validation pass requested after the hardening pass and the `GET /api/auth/me` addition, on branch `chore/reconcile-test-suite`. Scope: re-test every feature, add real multi-user concurrency coverage (not single-endpoint hammering), exercise the real upload/rate-limit pipeline against the dev server + dev Neon DB + real Cloudinary, and report honestly on anything that fails.

## Summary

| | Result |
|---|---|
| `npm run build` | 0 errors |
| `npm test` (Jest/Supertest, test DB) | **213/213 passing**, 9/9 suites |
| Live walkthrough (dev server, dev DB, real Cloudinary, real rate limits) | **48/48 checks passing** |
| Bugs found in application code | **None** |
| Bugs found in this session's own test tooling | 2, both fixed before the final run (see below) |
| Dev DB left clean after the walkthrough | Yes — verified by direct query, 0 leftover fixtures |
| Ready for frontend development | **Yes** |

---

## 1. Jest suite — added multi-user concurrency coverage

The existing suite already had race-condition tests, but every one of them fires the *same* request repeatedly from a *single* actor (e.g. two identical registration calls racing on one email, to prove the unique-constraint/lock holds). That proves idempotency under contention — it does not prove that concurrent requests from *different* users stay correctly isolated from each other.

New file: `backend/src/__tests__/concurrency.test.ts`, 5 scenarios, all firing genuinely different requests from genuinely different users via `Promise.all`:

1. **Concurrent logins, 3 different users (ADMIN/SUPERVISOR/STAFF)** — asserts each login response carries that caller's own identity, and that the resulting `Session` rows map 1:1 to the correct `user_id` with no cross-wiring.
2. **Concurrent `GET /api/auth/me`, 3 different sessions** — the most direct test for request-context bleed. A shared/global-state bug would surface here as user A getting user B's identity back.
3. **Concurrent checkins, 3 different staff (different companies/divisions/shifts)** — asserts all succeed and each `Attendance` row is attributed to the correct user/company/division/shift.
4. **Concurrent registration, 4 different emails, same admin** — contrasts with the existing same-email race test; proves no deadlock/lock contention on concurrent writes to `User` + `UserCompanyRole` when the writes don't actually collide.
5. **Heterogeneous concurrent burst** — a staff checkin, a supervisor visit-log create, an admin company list, and an admin company create, fired simultaneously as three different authenticated users. Asserts no 500s and that each caller's data stayed correctly scoped to them.

All 5 passed on the first run, no fixes needed here.

**Full suite result:** 9 suites (`attendance`, `auth`, `checklist`, `company`, `concurrency`, `division`, `shift`, `user`, `visit`), 213 tests, all green. (208 pre-existing + 5 new.)

**Known infra flakiness, unrelated to code:** `prisma migrate deploy` in `globalSetup.ts` hit its usual `P1002` advisory-lock timeout on the first back-to-back run today — self-resolved after a ~18s wait and retry, as in every prior session. This is a Neon pooled-connection quirk, not a bug; noting it again for continuity.

---

## 2. Live end-to-end walkthrough — real server, real dev DB, real Cloudinary

Jest's `setup.ts` mocks `uploadImage`/`reverseGeocode` outright and `NODE_ENV=test` disables both rate limiters, so the automated suite never touches the real Cloudinary/sharp pipeline or the real `express-rate-limit` behavior. To close that gap, a disposable script (`backend/scripts/e2e-walkthrough.ts` — written, run, then **deleted**, never committed) drove the actual `npm run dev` server over real HTTP with real JPEGs generated via `sharp`.

**Covered, all passing (48/48 checks):**
- Health check, CORS preflight headers against the configured `CORS_ORIGIN`.
- Admin login → `/me` → role/password-leak checks.
- Error paths: wrong password (401), unauthenticated `/me` and `/company` (401 both).
- Company / division / shift creation.
- Admin registers STAFF + SUPERVISOR.
- Staff: checklist template + item (admin) → checkin with a real photo (verified the returned `photo_url` is a genuine `https://...cloudinary...` URL, not a mock) → checklist photo upload → checklist submit → checkout with a real photo → early-leave reason submission.
- Malformed uploads: wrong file type → 400, oversized (2MB > 1MB limit) file → 413.
- Supervisor: login, visit log with real photo, `my-visits` read-back.
- Admin reads across every module: company, division, shift, users (password-exclusion re-verified), checklist template, checklist evidence, attendance by-date, attendance-photos, visit by id, visit-by-user-photos.
- A live concurrent burst (3 different logged-in users hitting `/me` simultaneously, plus an admin company-list call) against the real pooled Neon connection — confirmed no identity cross-wiring.
- Deliberately exhausted the real `authLimiter` (10 req/15min) and confirmed a genuine `429` — the limiter works under real conditions, not just in theory.
- Cleanup: every fixture created (company, division, shift, users, sessions, checklist template/item/submission, attendance, visit log) removed afterward — **verified by a direct DB query showing 0 leftover rows**.

**Transparency note:** this uploaded a handful of tiny (20×20px) real test JPEGs to the project's actual Cloudinary account. Negligible on the free tier, stated here for the record rather than glossed over.

---

## 3. Investigation: 3 "failures" on the first walkthrough run — all traced to test-script ordering, not backend bugs

The first run of the walkthrough script surfaced 4 failures. All were investigated by reading the actual service code, not assumed:

1. **`POST checklist item photo` → "Checklist submission not found"** and **`POST checklist submit` → "No checklist items found"** — Root cause: `attendance.service.ts`'s `checkIn()` calls a private `bulkCreateChecklist()` that snapshots whatever checklist templates exist for the division **at the moment of checkin** and creates `ChecklistSubmission` rows from them. My script's first draft created the checklist template *after* calling checkin, so there was nothing to snapshot. This is existing, intentional behavior (matches the pattern already used in `attendance.test.ts`'s factories) — not a bug. **Fix:** reordered the script to create the template/item before checkin, re-ran, passed.

2. **`PATCH early-leave` → "Not an early leave"** — Root cause: `attendance.service.ts`'s `submitEarlyLeaveReason()` requires `attendance.early_leave` to already be `true`, and that flag is only computed by `checkOut()` (`early_leave: now < shiftEnd`). My script's first draft called the early-leave endpoint *before* checkout. This is correct-by-design API sequencing (checkout determines whether a leave was early; the reason is attached afterward), not a bug. **Fix:** reordered to submit the early-leave reason after checkout, re-ran, passed.

3. **Concurrent burst: supervisor `/me` "identity mismatch"** — Root cause: a test-script budgeting miscount, not a security issue. By the time the concurrent 3-way `/me` burst fired, 8 `/api/auth/*` calls had already been made against the fresh dev server; the burst's 3 concurrent calls pushed the running total to 11, one over the real 10/15min `authLimiter`, so one of the three legitimately got `429`. The original assertion only checked for an exact email match and treated the `429`'s empty body as a mismatch. **Fix:** the assertion now explicitly distinguishes "wrong identity on a 200" (a real leak, would fail) from "rate-limited" (expected, passes) from "no two concurrent responses returned the same email" (the actual cross-user-leak check). Re-ran: all three got 200 with correct, non-duplicated identities, plus the dedicated rate-limit-trip check further down still independently confirmed the real 429 behavior.

No application code changed as a result of this investigation — every one of these was the throwaway test script being wrong about the API's actual (correct) behavior, corrected before the final clean run reported above.

---

## 4. Readiness verdict

Backend is ready to build the frontend against. Everything from the earlier hardening pass and the `/auth/me` follow-up holds under this deeper pass:

- No new bugs found in application code this session.
- Session-cookie auth, role gating, and per-user data scoping all hold correctly under genuine multi-user concurrent load, both in the isolated test DB and against the live dev server.
- The real upload pipeline (sharp compression + Cloudinary) and the real rate limiters both behave as documented under actual conditions, not just mocked ones.
- `docs/API.md` (written in the prior session) accurately reflects the endpoints exercised here — no drift found.

**Uncommitted, per the standing "manual commit" preference:** `backend/src/__tests__/concurrency.test.ts` (new) is the only change from this session; everything else remains as it was — the accumulated hardening-pass + `/auth/me` changes from prior sessions, still uncommitted, still awaiting your review.
