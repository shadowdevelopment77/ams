# Production launch — Phase D: PWA setup — Report

See `docs/PRODUCTION_LAUNCH.md` §5 for the plan this implements.

## What was done

**Placeholder icons**: since you don't have a real logo yet, generated a simple placeholder set — a dark navy square with "AMS" text — using `sharp` (already a backend dependency, no new tooling needed) rendering an SVG at each required size. Written to `frontend/public/pwa-icons/`: `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon.png` (180×180). **These are explicitly placeholders** — swap them for a real logo whenever you have one; per `PRODUCTION_LAUNCH.md` §5.1, a single 512×512 (or 1024×1024) master PNG run through realfavicongenerator.net or `vite-plugin-pwa`'s own generator produces the full replacement set.

**`vite-plugin-pwa`** added to `frontend/` and configured in `vite.config.ts` — manifest (name, description, theme/background color, `display: 'standalone'`, `start_url: '/'`, the 3 icon variants including the maskable one for Android adaptive icons) plus the default generated service worker (`registerType: 'autoUpdate'`).

**`index.html`**: added the `apple-touch-icon` link tag (vite-plugin-pwa doesn't inject this one automatically) and a `theme-color` meta tag, and fixed the page title (was the Vite-default literal `"frontend"` — now `"AMS — Workforce Attendance"`, which also becomes the PWA's window title once installed).

**Virtual-mobile toggle removed from production**: the "Simulate mobile device (for testing)" checkbox on `LoginPage.tsx` is now wrapped in `{import.meta.env.DEV && (...)}` — present in `npm run dev`, completely absent from `npm run build`'s output. Worth noting honestly: this raises the bar from "one click for any visitor" to "a visitor would have to open devtools and manually set a localStorage key" — the underlying mechanism was never a hard security boundary to begin with (its own code comment already says so), so this change closes the casual/visible bypass, not a determined one, which matches what the audit flagged as the actual concern.

## Verification

- `npx tsc -b` — clean.
- `npm run build` — clean, and confirmed the actual output: `dist/manifest.webmanifest` (correct name/icons/display), `dist/sw.js` + `dist/workbox-*.js` (service worker), `dist/pwa-icons/*.png` (all 4 icons present), and `dist/index.html` correctly references the manifest, registers the service worker, and includes the apple-touch-icon link.
- `npm run lint` — same 3 pre-existing fast-refresh warnings as before (2 shadcn components + `PhotoCard.tsx`), nothing new.
- `npm install -D vite-plugin-pwa` flagged 13 vulnerabilities in its own dev-only dependency tree (build tooling like `workbox-build`, not shipped to the browser) — checked with `npm audit --omit=dev` and confirmed the only *production* vulnerabilities are pre-existing ones in `react-router-dom`, unrelated to this change and not something to fix here (npm itself flags the fix as a breaking major-version bump).

## What's still needed from you

The icons are functional placeholders, not final branding — swap them in whenever you have a real logo, following the spec in `PRODUCTION_LAUNCH.md` §5.1. Everything else (manifest, service worker, install prompt behavior) will keep working unchanged once you do.

## Commit

Left uncommitted, per the standing "review before commit" instruction for this plan.
