# Aggressive comment cleanup + full technical documentation — Report

See `docs/superpowers/plans/2026-07-26-comment-cleanup-technical-docs.md` for the plan.

## What was done

**A. Comment cleanup**
- Backend `src/`: 293 → 188 comment lines (~36% reduction). Went module-by-module through `modules/`, `repositories/`, `middlewares/`, `utils/`, `lib/`. Cut: pure restate-the-obvious comments (`// check password` directly above a password check), plain section-label comments (`//ADMIN`, `//template`), file self-references (`// src/middlewares/x.ts`), and — the main target — long "here's the bug-fix history" narratives in recently-added code (`lib/prisma.ts`, `globalSetup.ts`, `rate-limit.middleware.ts`, `auth.middleware.ts`, `resolve-user.middleware.ts`) that duplicated what's already permanently written in `docs/superpowers/reports/`. Kept: genuine cross-file couplings (cookie maxAge must match session expiry), library/API quirks (Prisma delegate dispatch, Nominatim, Base UI), non-obvious business-logic notes, and the `// ─── Section ───` divider convention (a deliberate, consistent codebase-wide navigation aid, not narrative).
- Backend `__tests__/`: lighter, conservative pass per the plan — trimmed the two biggest narrative blocks (`globalSetup.ts`'s advisory-lock investigation, `setup.ts`'s mock rationale) and the "buggy ordering" duplicated blocks in `auth.test.ts`/`attendance.test.ts`, but left test-shape-explaining comments alone (e.g. the deterministic-shift-time rationale, race-condition test intent) — these prevent a future edit from "fixing" something that isn't broken.
- Frontend `src/`: 172 → 150 comment lines. Most frontend comments were already justified "mirrors backend X.validation.ts" coupling notes or genuine gotchas (z.coerce/react-hook-form generic mismatches, TanStack Query cache-invalidation quirks, Cloudinary CORS) — kept those, cut the ones referencing `docs/superpowers/plans/...` paths directly (the reasoning itself was kept, tightened to stand on its own without the doc pointer).
- `frontend/e2e/`: left as-is — already appropriately tight for what a Playwright suite needs to stay maintainable (explains real constraints like the `authLimiter` budget and fixture-prefix conventions).

**B. Documentation**
- New `docs/ARCHITECTURE.md` — system overview, backend architecture (layering, module list, data model highlights incl. the `UserCompanyRole` unique-constraint/`onDelete: Restrict` fix, auth/session model, rate-limiting identity-keying design, uploads), frontend architecture (structure, routing/access control, TanStack Query `staleTime` decision, device-gating philosophy, business-rule-driven UI patterns), testing strategy (backend integration-test philosophy, Playwright E2E constraints), current status.
- Refreshed the root `README.md`: it was stale in several places — still described the frontend as "in progress"/"not yet usable end-to-end" (untrue for many phases), and its own quickstart instructions had drifted from reality (`CORS_ORIGIN`/dev URL still said port `5173`, the actual Vite default, when the project pinned `5174` via `strictPort` back in an earlier phase). Updated: intro framing, tech stack table, Testing section (added frontend/Playwright), Getting Started (frontend setup is real now, correct port), Project Structure (filled in the frontend tree properly), and linked `ARCHITECTURE.md` throughout.
- `docs/API.md` left untouched — already a solid, current endpoint reference; `ARCHITECTURE.md` complements it rather than duplicating it.

## Verification

- `npx tsc --noEmit` (backend) / `npx tsc -b` + `npm run build` (frontend) — clean after every batch of comment edits, not just at the end.
- Backend `npm test` — 255/255 passing after the full cleanup pass.

## Commit

Left uncommitted, per the standing "review later" pattern.
