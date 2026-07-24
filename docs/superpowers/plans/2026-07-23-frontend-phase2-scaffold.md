# Frontend Phase 2 Plan — Scaffold

Part of the larger "Frontend Kickoff" effort (backend gap-closing → merge to main → scaffold → app shell → STAFF flow MVP). This doc covers just the scaffold step: standing up an empty-but-correctly-wired `frontend/` app, nothing screen-specific yet.

## Goal

Get a `frontend/` folder in this repo that boots, type-checks, and builds cleanly, with the exact stack already agreed on in discussion, so Phase 3 (app shell) can start writing actual features immediately instead of fighting tooling setup.

## Decisions and why

**React + Vite + TypeScript, not Next.js.** Auth here is httpOnly session cookies, not JWT — there's no server-rendering benefit to chase, and the backend already *is* the API layer. A plain client-rendered SPA avoids fighting Next's SSR model for a cookie-gated, role-routed app, and Vite's dev server is exactly what the backend's `CORS_ORIGIN` default (`http://localhost:5173`) already assumes.

**Tailwind CSS v4 + shadcn/ui, not a component-kit like MUI, not hand-written CSS.** shadcn/ui components are copied into the repo (not an installed black-box dependency), so they're fully editable — useful for a project with three very different role-based UIs (dense ADMIN tables vs. simple mobile STAFF/SUPERVISOR forms) that will need real customization, not just theming. Tailwind v4 matches this project's general pattern of running current majors (Prisma 7, Express 5, Zod 4 on the backend).

**TanStack Query, react-hook-form + Zod, React Router** — installed now, wired up in Phase 3. TanStack Query avoids hand-rolled loading/error state for every API call; react-hook-form + Zod mirrors the backend's own Zod-validation style, so the same mental model (schema → validated shape) applies on both sides; React Router is the standard choice for a role-gated multi-page SPA.

**Monorepo placement (`frontend/` beside `backend/`)** and **native `<input type="file" capture>` for photo capture** — already decided earlier in this conversation, not re-litigated here.

## Plan

1. `npm create vite@latest frontend -- --template react-ts` for the base scaffold.
2. Install Tailwind v4 (`tailwindcss` + `@tailwindcss/vite`), wire the Vite plugin and `@import "tailwindcss"` in `index.css`.
3. Set up the `@/*` → `./src/*` path alias (`tsconfig.app.json` + `vite.config.ts`) — required before shadcn's CLI will accept the project.
4. Run `npx shadcn@latest init` to generate `components.json`, the base `Button` component, and CSS theme variables.
5. Install `react-router-dom`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers` — not wired up yet, just available for Phase 3.
6. Create the folder skeleton: `src/{api, components, features/auth, features/attendance, features/checklist, hooks, lib, routes}`.
7. `.env.local` with `VITE_API_URL=http://localhost:3000` — no `.env.example`, per the user's earlier stated preference; the var is documented directly in the root README instead.
8. Strip the Vite template's demo landing page (`App.tsx`, `App.css`, unused SVG/PNG assets) down to a minimal placeholder proving the stack renders — the demo content would just be deleted in Phase 3/4 anyway.
9. Update root `README.md`: Tech Stack, Getting Started, Project Structure, API Usage — the "no frontend yet" framing is now stale.

## Verification

- `npx tsc -b` — 0 errors.
- `npm run build` — clean production build.
- `npm run dev` — boots on `:5173`, page and entry module both serve without transform errors.
- `npm run lint` — passes (aside from a harmless, expected warning from shadcn's own generated code).
