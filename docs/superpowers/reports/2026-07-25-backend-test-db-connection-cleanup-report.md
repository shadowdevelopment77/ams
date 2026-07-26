# Backend Report — Test DB connection cleanup (never-interrupted test rule)

User asked for a standing fix so backend test runs never get blocked again by a stuck database session, after this recurred twice in one session. Root-caused two separate, real issues rather than just patching around the symptom each time.

## Root cause #1: `prisma.$disconnect()` doesn't close the underlying `pg.Pool`

`backend/src/lib/prisma.ts` constructs a `pg.Pool` manually and hands it to Prisma via `@prisma/adapter-pg`. `prisma.$disconnect()` only tears down Prisma's own query-engine reference to that pool — it never calls `pool.end()`. Every test file's `afterAll` was calling only `$disconnect()`, so the raw pool connection lingered past each test file's end. This is exactly what Jest's recurring `Force exiting Jest: ... async operations that kept running` warning was pointing at, on every single run, silently masked because `package.json`'s `test` script already passes `--forceExit`.

**Fix**: `prisma.ts` now exports `disconnectPrisma()`, which calls both `prisma.$disconnect()` and `pool.end()`. `setup.ts`'s `afterAll` and `globalSetup.ts`'s teardown both switched to use it instead of calling `$disconnect()` directly. Verified with `--detectOpenHandles` (no `--forceExit`): the full suite now exits cleanly on its own, twice in a row, with no warning at all.

## Root cause #2: the test DB uses Neon's pooled endpoint, and Prisma's migration lock is session-scoped

`backend/.env.test`'s `DATABASE_URL` points at Neon's `-pooler` host. `prisma migrate deploy` takes a session-level Postgres advisory lock (`pg_advisory_lock`) for the duration of the migration — a well-known bad combination with transaction-mode connection pooling, since the pooler can hand a *later* client the same underlying backend process an *earlier* session's lock is still attached to, without the pooler necessarily resetting session state in between. This is almost certainly why the lock kept turning up "stuck" for minutes at a time across unrelated test invocations this session.

**Fix**: `globalSetup.ts` now checks for and clears any stale holder of Prisma's fixed migration lock ID (`72707369`) before every `migrate deploy` attempt, logging when it does so (never a silent fix). This is proactive/self-healing rather than reactive — no more manually diagnosing and terminating a stuck session by hand every time this recurs.

**A real near-miss caught during verification, not shipped**: the first version of this cleanup crashed the whole process. `pg_locks` reported the lock as held by a pid that, because of the exact pooler behavior described above, turned out to be the *cleanup client's own freshly-opened connection* — terminating "the stale holder" terminated itself mid-query, and `pg.Client` has no default error handler, so the unhandled `'error'` event crashed the process outright. Fixed by: attaching an error handler to the cleanup client (so a self-inflicted disconnect can never crash the run), explicitly skipping a pid that matches the cleanup client's own backend pid (queried via `pg_backend_pid()`), and wrapping every step in try/catch so a failure here can only ever fall back to "proceed anyway," never take down the whole test run.

## Verification

- Ran the full suite twice back-to-back with `--detectOpenHandles` (no `--forceExit`): both passed 231/231, both exited cleanly on their own, no crash, no stale-lock warning needed on the second run (proving the connection cleanup fix works, not just the lock-recovery fallback).
- Separately confirmed the lock-recovery path fires and works correctly when a real stale lock exists (caught and cleared one from an earlier interrupted run mid-session, logged clearly, test run proceeded normally).

## Not done (flagged, not decided unilaterally)

The most thorough fix for the pooler/advisory-lock interaction would be running `prisma migrate deploy` against a **direct** (non-pooled) Neon connection string instead of the pooled one — Prisma's own docs recommend this via `directUrl` in the datasource block specifically for this class of issue. That requires a direct connection string from the Neon dashboard, which isn't something to go find and wire in without checking first. The self-healing lock-clear above is a solid, verified fix on its own; the `directUrl` change would be a nice-to-have on top, not something blocking right now.
