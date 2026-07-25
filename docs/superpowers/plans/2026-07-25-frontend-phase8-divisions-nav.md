# Frontend Phase 8 — Discoverable Divisions nav

## Context

User couldn't find Division management in the admin panel. Confirmed: it exists (`CompanyDetailPage.tsx`, reached via `Companies → click a company → Divisions section`) but has no top-level sidebar entry — the only way in was through a specific company's detail page. Backend has no unscoped "list all divisions" endpoint (divisions only ever exist scoped to a company), so the nesting was intentional, but nothing in the UI signaled it. User asked for it to be made more discoverable, not just explained.

## Plan

Matched the existing company-picker pattern `AttendancePage.tsx`/`VisitsPage.tsx` already use for company-scoped top-level views:

1. Extracted the Divisions table + CRUD out of `CompanyDetailPage.tsx` into a reusable `DivisionsList.tsx` taking `companyId` as a prop — same logic, no behavior change.
2. New `DivisionsPage.tsx` (top-level): a company picker `Select`, then renders `<DivisionsList companyId={selected} />`.
3. Added `/admin/divisions` to `AdminLayout.tsx`'s sidebar nav and `router.tsx`.
4. Extended `admin-panel.spec.ts` to click the new nav item, pick a company, and confirm the division created earlier in the same test flow is visible there too.

No backend changes — pure frontend navigation fix reusing existing endpoints/components.

## Verification

- `npx tsc -b` / `npm run build` clean.
- Full Playwright regression (both projects, fresh backend restarts) green.
- Backend `npm test` unaffected (no backend code touched).
