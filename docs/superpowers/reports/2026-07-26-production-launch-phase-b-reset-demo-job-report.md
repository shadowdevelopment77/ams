# Production launch — Phase B: reset-demo endpoint + reseed logic — Report

See `docs/PRODUCTION_LAUNCH.md` §4 for the plan this implements.

## What was done

**New endpoint**: `POST /api/admin/reset-demo`, guarded by `backend/src/middlewares/reset-demo-auth.middleware.ts` — checks `Authorization: Bearer <RESET_DEMO_SECRET>` against the env var, `401` on any mismatch or missing header. No session/role check, since the caller is an automated scheduler, not a logged-in user. New module: `backend/src/modules/admin/` (`admin.router.ts`, `admin.controller.ts`, `admin.service.ts`), wired into `app.ts` at `/api/admin`.

**Shared seed logic extracted**: the 4 existing `backend/scripts/manual-test-seed*.ts` scripts had their core logic pulled out into `backend/src/seed/` (`demoCompaniesAndStaff.ts`, `demoChecklists.ts`, `demoAttendance.ts`, `demoVisits.ts`), each exporting one importable function. The standalone scripts now just call these and print the result — behavior unchanged, still safe to run manually (`npx ts-node scripts/manual-test-seed.ts` etc.), but the logic is no longer duplicated between "dev script" and "production job."

**A real bug found and fixed along the way**: `manual-test-seed-checklist.ts` still referenced `requires_photo: true` when creating checklist items — a field removed from the schema in an earlier session but never caught, because `scripts/` isn't included in the project's `tsconfig.json` (`include: ["src/**/*", ...]`), so `tsc --noEmit` never actually checked it. This script would have crashed the moment someone ran it. Fixed as part of moving this logic into `src/seed/demoChecklists.ts` (which *is* covered by `tsc`), and confirmed by actually running all 4 scripts against the dev database (see Verification).

**What `resetDemo()` does, in order**:
1. Collects every `photo_url`/`checkout_photo_url` from `Attendance`, `ChecklistPhoto`, and `VisitLog` before deleting anything.
2. Filters to ones actually hosted on Cloudinary (`res.cloudinary.com` in the URL — the seed scripts' `picsum.photos` URLs never match) via a new `backend/src/utils/cloudinaryUrl.ts` helper, and deletes those through `cloudinary.api.delete_resources()` (chunked at 100 per call, Cloudinary's Admin API limit).
3. Deletes DB rows in FK-safe order (children before parents — `ChecklistPhoto` → `ChecklistSubmission` → `Attendance`/`VisitLog` → `ChecklistItem` → `ChecklistTemplate` → `Shift` → non-admin `Session`/`UserCompanyRole`/`User` → `Division` → `Company`). `UserCompanyRole`'s `onDelete: Restrict` on company/division (from an earlier phase's data-integrity fix) meant non-admin role rows had to go before `Division`/`Company` could be dropped.
4. Reseeds via the 4 extracted functions, in the same order the standalone scripts assume (companies/staff → checklists → attendance → visits).
5. Finds-or-creates 2 fixed demo admin accounts (`admin.demo1@ams.local`, `admin.demo2@ams.local`) and resets their password to a known value every call.

**On the "3rd personal admin" from the original plan**: no code needed for this, and it isn't hardcoded anywhere. The wipe logic only ever touches `STAFF`/`SUPERVISOR` users — every `ADMIN` account, whichever email it uses, is automatically safe. So there's nothing to "find-or-create" for a personal admin: once the 2 demo admins exist (created by this job's first run) and can log in, you register your own account with your real email through the normal admin-gated `POST /api/auth/register` flow, once, and it persists across every future reset forever, same as the existing dev-seed `admin@ams.local` would if it existed in production. This is simpler than the original plan draft and avoids putting any personal email in a public repo.

**Tests** (`backend/src/__tests__/admin.test.ts`, 4 new): the auth gate (no header / wrong token → 401), and one comprehensive test that sets up a fixture attendance with a real-looking Cloudinary URL plus a separate "other admin" account, runs the reset, and asserts: the Cloudinary mock was actually called with the right `public_id`, lookup tables are untouched, the fixture staff/attendance is gone, the other admin is completely untouched (same password), the 2 demo admins exist with the reset password, and fresh demo data exists. A second test confirms a demo admin whose password was previously changed gets reset back to the known value. Cloudinary's Admin API is now mocked in `setup.ts` (it wasn't before — only the higher-level `uploadImage` wrapper was mocked, but this job calls `cloudinary.api.delete_resources` directly).

## What's still unverified

Per the plan's stated caveat: **the Cloudinary deletion path has only been exercised against the mock**, never against a real Cloudinary account. The regex that extracts a `public_id` from a `secure_url` was hand-verified against the two URL shapes Cloudinary actually produces (with and without a version segment), and the delete call itself is a standard, well-documented Cloudinary Admin API call — but the first time this runs for real (against actual uploaded photos, in production) is the true test. Flagging this clearly rather than presenting it as equally proven as the rest.

Also not addressed (out of scope, matches the plan): no DB transaction wraps the whole wipe+reseed — if it fails partway through, the app is left partially reset until the next scheduled run or a manual retrigger. Acceptable for a demo reset job, not something a portfolio project needs hardened further right now.

## Verification

- `npx tsc --noEmit` — clean.
- `npm test` — 264/264 passing (260 from Phase A + 4 new).
- Ran all 4 refactored standalone seed scripts directly against the dev database (`npx ts-node scripts/manual-test-seed*.ts`) — all completed successfully, including the checklist one that would previously have crashed.

## Commit

Left uncommitted, per the standing "review before commit" instruction for this plan.
