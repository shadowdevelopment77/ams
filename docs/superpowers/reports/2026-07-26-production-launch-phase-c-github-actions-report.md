# Production launch — Phase C: GitHub Actions workflows — Report

See `docs/PRODUCTION_LAUNCH.md` §4.5/§7.3 for the plan this implements.

## What was done

Two new workflow files:

- **`.github/workflows/reset-demo.yml`** — `cron: '0 */6 * * *'` (every 6 hours) plus `workflow_dispatch` (so you can also trigger it manually from the Actions tab in GitHub's UI, without waiting for the schedule). Calls `POST /api/admin/reset-demo` with the `RESET_DEMO_SECRET` repo secret as a Bearer token, using `--fail-with-body` so a non-2xx response both fails the workflow run and shows the response body in the log for debugging.
- **`.github/workflows/keep-alive.yml`** — `cron: '*/10 * * * *'` (every ~10 minutes), hits `GET /health`, same `--fail-with-body` pattern.

Both reference two repo secrets that don't exist yet: `BACKEND_URL` and `RESET_DEMO_SECRET`. This is expected and matches the plan — these files are prepared now, but won't run successfully until you've deployed the backend (Phase E covers adding the actual secrets once you have a real Render URL).

## Verification

No backend/frontend code changed in this phase, so no `tsc`/test/build run. What I could verify without a live deployment: parsed both new files (and `render.yaml`, written in Phase A) through a YAML parser (`python3 -c "import yaml; yaml.safe_load(...)"`) to confirm there are no syntax errors — all three parsed cleanly. Actual end-to-end verification (the workflows successfully calling a real deployed backend) can only happen after Render deployment, per the plan's Phase E manual steps.

## Commit

Left uncommitted, per the standing "review before commit" instruction for this plan.
