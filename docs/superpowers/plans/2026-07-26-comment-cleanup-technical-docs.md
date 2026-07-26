# Aggressive comment cleanup + full technical documentation

## Context

User wants inline code comments trimmed aggressively (much of what's there duplicates reasoning already permanently recorded in `docs/superpowers/reports/`), plus full technical documentation covering backend-to-frontend architecture — `docs/API.md` only covers the endpoint reference, and the root `README.md` is stale (still describes the frontend as "in progress").

## Plan

**A. Comment cleanup** — module-by-module through `backend/src/` and `frontend/src/`, removing narrative/historical comments and comments restating obvious code. Keep only comments encoding a genuinely non-obvious cross-file coupling, library quirk, or business-logic gotcha. Test files (`__tests__/`, `e2e/`) treated more conservatively — cut narrative, keep test-integrity-preserving explanations.

**B. Documentation** — new `docs/ARCHITECTURE.md` (backend architecture, data model, frontend architecture, testing strategy, deployment status); refresh the stale root `README.md`; `docs/API.md` untouched.

## Verification

- `tsc` clean both sides after the comment pass.
- Backend `npm test` full suite green.
- Spot-check a representative file per module.
