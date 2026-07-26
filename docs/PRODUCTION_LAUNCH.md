# Production Launch Plan — AMS

This is the complete runbook for taking AMS from "runs in a Codespace" to "permanently online, free, portfolio-ready demo."

**Status: all the code/config work is done (Phases A-D below). What's left is entirely manual steps only you can do** — creating accounts, clicking deploy, entering secrets. See §9 for exactly what's left and in what order. Detailed reports for each phase live in the project's `staging` branch history, not `main`.

---

## 1. The goal, in plain terms

You want a live link you can hand to recruiters, indefinitely, at **zero ongoing cost**, that:
- Always works when someone clicks it (accepting a short "waking up" delay is fine, a broken app is not).
- Lets a visitor log in as ADMIN, STAFF, or SUPERVISOR and actually use the real flows (check-in/out, checklists with real camera photos, visit logging, the admin panel).
- Resets itself automatically every 2 hours to a clean, empty slate (just the 3 admin logins + role/status lookup tables) — so it never accumulates junk, never runs out of free storage, and every visitor (or you, live in an interview) builds their own example data from scratch rather than seeing canned content.
- Looks and feels like a real installed app on a phone (an icon on the home screen, no browser address bar), even though it's just a website underneath.

Everything below is designed around **$0/month**, using services you already have accounts on (Neon, Cloudinary) plus a small number of new free signups.

---

## 2. The stack

| Piece | Service | Why | Cost |
|---|---|---|---|
| Database | **Neon** (already in use) | Already set up, generous free tier, serverless Postgres | Free |
| Photo storage | **Cloudinary** (already in use) | Already set up, 25GB storage + bandwidth free tier | Free |
| Backend hosting | **Render** (free Web Service) | Deploys a Node/Express app straight from GitHub, zero config beyond env vars | Free |
| Frontend hosting | **Vercel** or **Netlify** (free tier) | Static SPA hosting, both auto-detect Vite, instant global CDN, no spin-down (unlike the backend) | Free |
| Scheduling | **GitHub Actions** (scheduled workflows) | Free for public repos (2,000 min/month free even for private repos), used for the 2-hourly reset and a keep-alive ping | Free |

### The one tradeoff you should know about upfront

Render's free tier **spins the backend down after ~15 minutes of no traffic**, and the next request has to "wake it up" — this takes roughly 30–60 seconds. There is no way to fully avoid this on a $0 plan; it's the price of free compute.

What we'll do about it:
- A GitHub Actions workflow pings `GET /health` every ~10 minutes, keeping the backend awake during normal hours so most real visitors never see the cold start.
- Even if someone does hit a cold backend, the **frontend loads instantly regardless** (Vercel/Netlify serve static files from a CDN with no spin-down at all) — the visitor sees the login page immediately, and only the first API call (e.g. clicking "Login") shows a brief loading state while the backend wakes up. That's a normal, forgivable UX for a free demo, not a broken app.

---

## 3. Real blockers — fix these first

**✅ Done** (full report on the `staging` branch). These were found during a production-readiness audit and would cause actual breakage or risk once deployed, independent of everything else in this doc.

### 3.1 Cross-site session cookie is currently broken for a real deploy

`backend/src/modules/auth/auth.controller.ts` currently sets:
```ts
secure:   process.env.NODE_ENV === 'production',
sameSite: 'lax',
```
`CLAUDE.md` already documents the *intended* design ("lax + non-secure for local/same-site dev, none + secure for cross-site production") — but the code never actually implements the second half. Once the frontend (Vercel/Netlify domain) and backend (Render domain) are on different domains, `sameSite: 'lax'` will silently stop the browser from sending the cookie back on API calls. Login will appear to succeed (you'll see `Set-Cookie` in the response) but the very next request will look logged-out.

**Fix**: make both flags branch together on environment:
```ts
const isProd = process.env.NODE_ENV === 'production'
res.cookie('sessionId', session.id, {
  httpOnly: true,
  secure:   isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge:   /* existing value, unchanged */,
})
```
(`sameSite: 'none'` legally requires `secure: true` — browsers reject `none` without `secure`, which is why they must change together.)

### 3.2 No graceful shutdown

Render (and most hosts) sends `SIGTERM` before killing a container on redeploy/restart. Right now nothing in `backend/src` listens for it, so in-flight requests get dropped mid-response and the Postgres pool isn't drained. `backend/src/lib/prisma.ts` already exports a `disconnectPrisma()` function — it's just never called from a shutdown hook.

**Fix**: in `backend/src/index.ts` (or wherever the server starts listening), add:
```ts
process.on('SIGTERM', async () => {
  await disconnectPrisma()
  server.close(() => process.exit(0))
})
```

### 3.3 No deploy config files

Render can deploy straight from a `render.yaml` at the repo root (backend), and Vercel/Netlify are close to zero-config for a Vite app but still benefit from an explicit config. Both are covered in the step-by-step runbook (§7) — Render specifically wants a `render.yaml` describing the build/start commands and env var names (not values).

### 3.4 No `.env.example`

Neither `backend/` nor `frontend/` has one today. Full content is in §6 below — these files get committed (never the real `.env`), so anyone (including future-you) can see exactly what needs to be filled in.

---

## 4. The scheduled demo-reset job

**✅ Done** (full report on the `staging` branch). This is the core new feature: every 2 hours, an automated job wipes all real-visitor-generated data back to a clean, **empty** slate — no pre-seeded demo dataset. So the app never runs out of free storage, never looks broken from accumulated cruft, and every visitor (or you, live in an interview) builds their own companies/staff/checklists/attendance from scratch through the actual UI, rather than exploring canned data.

Some details below changed slightly from the original draft during implementation — corrected in place, not just appended, so this stays the accurate reference.

### 4.1 What gets wiped

- Every `Attendance` row, every `ChecklistSubmission` + `ChecklistPhoto` row, every `VisitLog` row.
- Every Cloudinary image those rows point to — but **only** the ones actually on Cloudinary. Since production no longer reseeds any placeholder data, the only photos that can exist at all are ones a *real visitor* uploaded through the actual camera-capture flow (check-in/out, checklist items, visit logs) — these need explicit deletion via Cloudinary's Admin API (`cloudinary.api.delete_resources([...public_ids])`) before the DB rows referencing them are dropped.
- Every non-admin `User` + their `UserCompanyRole`, plus `Company`, `Division`, `Shift`, `ChecklistTemplate`, `ChecklistItem` — all of it deleted, none of it recreated. Whatever an ADMIN (a visitor, or you) built up gets fully removed, not replaced with fresh canned data.

### 4.2 What's kept, untouched

- `UserRole` and `AttendanceStatus` lookup tables (never touched by any cleanup — they're structural, not demo data).
- All 3 ADMIN `User` rows are **never deleted**. Two of them (the public demo admins) have their password reset to a fixed known value each cycle. The third (your personal admin, real email) is left completely alone — password, session, everything.
- That's it. Everything else — companies, divisions, shifts, checklist templates/items, STAFF/SUPERVISOR users, attendance, checklists, visits — is wiped every cycle and stays empty until an ADMIN creates it again through the real UI.

### 4.3 Local dev seeding — unaffected, separate from production

`resetDemo()` no longer seeds anything — this was a deliberate decision: production should always settle back to just the 3 admin logins + lookup tables, so real content only ever exists because someone (a visitor, or you live in an interview) built it through the actual UI, not because it was pre-seeded.

The seed functions themselves (`backend/src/seed/demo*.ts` — companies/divisions/staff/supervisor, checklist templates + submissions, attendance, visit logs) still exist in the codebase and are still useful — but only for **local development**, via `backend/scripts/manual-test-seed*.ts`, so you (or an assistant working on the codebase) have a realistic dataset to test features against locally. Production never calls them.

### 4.4 The admin accounts

| Account | Email | Password | Purpose | Reset behavior |
|---|---|---|---|---|
| Demo Admin 1 | `admin.demo1@ams.local` | `DemoAdmin123!` | Public, listed on your portfolio/README for anyone to try | Password reset to this value every 2h |
| Demo Admin 2 | `admin.demo2@ams.local` | `DemoAdmin123!` | Same as above — a second public login so two visitors browsing at once each have "their own" admin session without any perceived conflict | Password reset every 2h |
| Your personal admin | *your real email, your choice* | *your choice* | For you specifically — ongoing access, testing, showing recruiters live if you want to drive it yourself | **Never touched** |

**How the personal admin actually works — simpler than the original draft assumed**: no code creates or manages it. The reset job's wipe logic only ever touches `STAFF`/`SUPERVISOR` users — every `ADMIN` account is automatically safe, whichever email it uses. So once the 2 demo admins exist (the reset job creates them on its very first run) and you can log in as one of them, register your own account with your real email through the normal admin-gated `POST /api/auth/register` flow, once. It then persists forever across every future reset, with zero special-casing needed. This also solves the bootstrapping problem: on a brand-new production database with no admin at all yet, the *first* reset-demo run (triggered manually or by the first scheduled tick) is what creates the 2 demo admins in the first place.

**A technical fact worth knowing**: the `Session` model has no "one session per account" restriction. Every login just inserts a new session row, so in reality even a *single* shared admin account already supports multiple people logged in simultaneously from different browsers with zero conflict. Having 2 distinct demo logins isn't a technical necessity — it's purely so visitors never have to wonder "is someone else using this right now," which is a nicer demo experience.

### 4.5 The endpoint and how it's triggered

New route: `POST /api/admin/reset-demo`, protected by a shared-secret header (not a user session, since this is called by an automated script, not a logged-in person):
```
Authorization: Bearer <RESET_DEMO_SECRET>
```
If the header doesn't match the `RESET_DEMO_SECRET` env var, `401`. This keeps the endpoint safe from random discovery while being trivially callable from a GitHub Actions workflow.

`.github/workflows/reset-demo.yml` and `.github/workflows/keep-alive.yml` both exist in the repo already. Neither can actually succeed yet — they need a real deployed `BACKEND_URL` and the matching secrets, added once you've deployed the backend (§7.3). That's expected; they're prepared and waiting.

### 4.6 Explicitly out of scope (your call, both reasonable to skip for now)

- **Verifying that registered emails are real/deliverable.** Right now, `email` fields are only format-validated (looks like an email), never actually verified (no confirmation link sent). Doing this properly needs an email-sending service — there are free tiers (e.g. Resend's free plan) that would work, but it's a real feature addition (confirmation tokens, an email template, a "resend confirmation" flow) and not something this launch needs. Flagged here as a good "v2" improvement, not a blocker.
- **Password change/reset for end users.** Confirmed: nothing like this exists in the codebase today. Fine for an MVP portfolio demo where accounts are either disposable (reset every 2h) or personal (only you use it).

---

## 5. Installable PWA

**✅ Done, with a placeholder icon** (full report on the `staging` branch).

### 5.1 The icon situation right now

Since you didn't have a logo yet, a simple placeholder was generated (dark navy square, "AMS" text) at `frontend/public/pwa-icons/` — `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon.png`. Everything works end-to-end with these; swap them out whenever you have real branding:

- Make **one master icon**: 512×512 (or 1024×1024) PNG, simple/flat design (it gets scaled down to 48×48 on some launchers), no baked-in rounded corners (the OS applies its own mask), solid/simple background.
- Run it through **realfavicongenerator.net** (or `vite-plugin-pwa`'s own generator) to produce the same 4 files, same names, same folder — no code changes needed, just replace the files.

### 5.2 What was actually implemented

`vite-plugin-pwa` is installed and configured in `frontend/vite.config.ts` — manifest (name "AMS — Workforce Attendance", `display: 'standalone'`, the 3 icon variants including the maskable one) plus an auto-generated service worker. `index.html` got the apple-touch-icon link tag, a theme-color meta tag, and a real page title (was the Vite-default `"frontend"`).

**What this actually gets you**: on a phone, the browser offers "Add to Home Screen" (or does so automatically after a couple of visits, depending on the browser). Once added, there's a real icon on the home screen, and opening it launches a standalone window with no visible browser UI — exactly the myPertamina-style effect you described. Under the hood it's 100% still your website; there's no app store, no APK, no native build step.

### 5.3 Virtual-mobile toggle — removed from production

The "Simulate mobile device (for testing)" checkbox on the login page is now wrapped in `import.meta.env.DEV` — present in `npm run dev`, completely absent from `npm run build`'s output. Worth being precise about what this does and doesn't achieve: it removes the one-click UI toggle for casual visitors; it does not (and can't) stop someone who deliberately opens devtools and sets the underlying `localStorage` key by hand — the mechanism was never a hard security boundary (its own code comment says so), and that hasn't changed. This closes the visible, casual bypass, which is what actually mattered.

---

## 6. Full environment variable reference

### `backend/.env.example` (new file)
```bash
# Postgres connection string (Neon) -- get this from your Neon project dashboard.
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# Cloudinary -- get these from your Cloudinary dashboard (Settings > API Keys).
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Set to "production" on Render -- flips cookie secure/sameSite flags and
# blocks the dev-only seed admin account from being (re)created.
NODE_ENV=production

# Render sets this automatically -- only needed for local dev.
PORT=3000

# Comma-separated list of frontend origins allowed to call this API.
# Must be your real Vercel/Netlify URL(s) once deployed.
CORS_ORIGIN=https://your-frontend.vercel.app

# How long a login session lasts, in hours. Defaults to 2 if unset.
SESSION_TTL_HOURS=2

# Shared secret the GitHub Actions reset-demo workflow must send as a
# Bearer token to POST /api/admin/reset-demo. Generate a long random
# string (e.g. `openssl rand -hex 32`) and put the SAME value here and
# in the GitHub repo secret of the same name.
RESET_DEMO_SECRET=change-me-to-a-long-random-string
```

### `frontend/.env.example` (new file)
```bash
# The deployed backend's URL (Render). No trailing slash.
VITE_API_URL=https://your-backend.onrender.com
```

---

## 7. Step-by-step deployment runbook

Everything code-side is ready (`render.yaml`, both `.env.example` files, both GitHub Actions workflow files, the reset-demo endpoint). What's left below is genuinely manual — account creation, dashboard clicks, entering real secret values — none of it is something I can do on your behalf. Do these roughly in order, check each box as you go.

### 7.1 Backend (Render) — you already have the account, never deployed yet
- [ ] From your existing Render account: "New Web Service" → connect this GitHub repo. Render should detect `render.yaml` at the repo root automatically (build/start commands and env var *names* are already defined there — you just need to fill in real *values*).
- [ ] In Render's Environment tab, fill in real values for: `DATABASE_URL` (your Neon connection string), `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` (your Cloudinary dashboard), `CORS_ORIGIN` (leave a placeholder for now, you'll update it after 7.2), `RESET_DEMO_SECRET` (generate with `openssl rand -hex 32` or similar — this exact value also goes into the GitHub secret in 7.3).
- [ ] Deploy, wait for the first build to finish, note the resulting URL (`https://<something>.onrender.com`).

### 7.2 Frontend (Vercel or Netlify) — you'll need to create this account
I can't create this account for you — signup requires your own email/GitHub OAuth and ToS acceptance in your own browser. It's free and takes about 2 minutes (vercel.com or netlify.com, "sign up with GitHub").
- [ ] Import this GitHub repo, set root directory to `frontend/`.
- [ ] Framework preset: Vite (both platforms auto-detect this — no config file needed on this side).
- [ ] Add env var `VITE_API_URL` = the Render URL from 7.1.
- [ ] Deploy, note the resulting URL.
- [ ] Go back to Render, set `CORS_ORIGIN` to this exact frontend URL, redeploy the backend.

### 7.3 GitHub Actions secrets (both workflow files already exist in the repo)
- [ ] Repo Settings → Secrets and variables → Actions → add `BACKEND_URL` (the Render URL from 7.1) and `RESET_DEMO_SECRET` (same value you put on Render in 7.1).
- [ ] Go to the Actions tab, manually run "Reset demo data" once ("Run workflow" button) — this is what actually creates the first 2 demo admin accounts on a brand-new database (see §4.4).
- [ ] Manually run "Keep backend warm" once too, to confirm it can reach `/health`.

### 7.4 Bootstrap your personal admin
- [ ] Log in as `admin.demo1@ams.local` / `DemoAdmin123!` (created by the reset workflow you just ran).
- [ ] Use the admin panel's user registration to create your own admin account with your real email and a password of your choice.
- [ ] Confirm you can log in as that account — this one is never touched by any future reset.

### 7.5 Smoke test checklist
- [ ] Visit the frontend URL cold (after letting the backend sleep ~15 min) — confirm the login page loads instantly and the app doesn't hang forever even during a cold start.
- [ ] Log in as a demo admin, your personal admin, and a seeded STAFF account — confirm the cross-site cookie actually works (this is the §3.1 fix — test it for real, in a real browser, not just trust the code).
- [ ] On a phone browser, confirm "Add to Home Screen" is offered and the installed icon opens without browser chrome.
- [ ] Manually trigger the reset-demo workflow again, then confirm: old data is gone, fresh demo companies/staff/checklists/visits exist, both demo admin logins still work with the reset password, and your personal admin is untouched.

---

## 8. Icon replacement (whenever you have a real logo)

- [ ] Prepare the master icon per §5.1.
- [ ] Generate the 4-file set (same filenames: `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon.png`), drop them into `frontend/public/pwa-icons/`, overwriting the placeholders.
- [ ] Optionally update the `theme_color`/`background_color` in `vite.config.ts` to match your branding.
- [ ] Rebuild/redeploy the frontend — no other code changes needed.

---

## 9. What's actually left to do

Everything buildable is built (Phases A-D, see the reports linked at the top). What remains is exclusively manual, human-only steps:

1. **Deploy the backend on Render** (§7.1) — you have the account, just never clicked deploy.
2. **Create a Vercel or Netlify account and deploy the frontend** (§7.2) — genuinely can't be done for you.
3. **Add the 2 GitHub Actions secrets and run both workflows once manually** (§7.3).
4. **Bootstrap your personal admin account** (§7.4) — a one-time login + register, using the admin panel's own UI.
5. **Run the smoke test** (§7.5) to confirm the cross-site cookie fix actually works in the real world, not just in theory.
6. **Whenever you get around to it**: replace the placeholder PWA icon with real branding (§8) — everything works fine without this, it's purely cosmetic.
