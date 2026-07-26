import { test, expect } from '@playwright/test'

const SCREENSHOT_DIR = '../Screenshot/phase5-admin-panel'

// One continuous test, one login, deliberately -- the real authLimiter
// (10 req/15min on /api/auth/*) proved tight throughout this phase's
// development. Client-side navigation (clicking links, not page.goto)
// keeps the mounted ProtectedRoute's useMe() from refetching on every step.
test.describe('Admin panel: golden path', () => {
  test('company -> division -> shift -> checklist -> staff -> records', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'admin panel is desktop-first')

    // Fixed names, not timestamped -- backend/scripts/e2e-test-cleanup.ts
    // purges anything under these exact prefixes before each test:e2e run,
    // the same idempotency approach staff-flow.spec.ts uses via its own
    // seed script. A timestamped name here would leave fresh garbage
    // companies/users in the dev DB on every future run of this suite.
    const companyName = 'E2E Admin Co'
    const divisionName = 'E2E Admin Division'
    const staffName = 'E2E Admin Staffer'
    const companyName2 = 'E2E Admin Co 2'
    const divisionName2 = 'E2E Admin Division 2'

    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@ams.local')
    await page.getByLabel('Password').fill('Admin123!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/admin\/companies$/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-01-companies.png` })

    // -- Company --
    await page.getByRole('button', { name: /new company/i }).click()
    await page.getByLabel('Name').fill(companyName)
    await page.getByLabel('Email').fill('e2e-admin@example.com')
    await page.getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByText(companyName, { exact: true })).toBeVisible()

    // The company name itself is plain text now -- "See more detail" is the
    // only way into a company's detail page (no separate name link).
    await page
      .getByRole('row', { name: companyName })
      .getByRole('link', { name: /see more detail/i })
      .click()
    await expect(page).toHaveURL(/\/admin\/companies\/\d+$/)
    await expect(page.getByRole('heading', { name: companyName })).toBeVisible()

    // -- Division --
    await page.getByRole('button', { name: /new division/i }).click()
    await page.getByLabel('Name').fill(divisionName)
    await page.getByLabel('Late tolerance').fill('10')
    await page.getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByText(divisionName)).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-02-divisions.png` })

    await page.getByRole('link', { name: divisionName }).click()
    await expect(page).toHaveURL(/\/admin\/companies\/\d+\/divisions\/\d+$/)

    // -- Shift --
    await page.getByRole('button', { name: /new shift/i }).click()
    await page.getByLabel('Name').fill('E2E Morning Shift')
    await page.getByLabel('Start time').fill('08:00')
    await page.getByLabel('End time').fill('16:00')
    await page.getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByText('E2E Morning Shift')).toBeVisible()

    // -- Checklist template --
    await page.getByRole('button', { name: /new template/i }).click()
    await page.getByLabel('Title').fill('Opening Checklist')
    await page.getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByText('Opening Checklist')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-03-division-detail.png` })

    await page.getByRole('link', { name: 'Opening Checklist' }).click()
    await expect(page).toHaveURL(/\/checklists\/\d+$/)

    // -- Checklist items --
    await page.getByRole('button', { name: /new item/i }).click()
    await page.getByLabel('Description').fill('Check fire extinguisher')
    await page.getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByText('Check fire extinguisher')).toBeVisible()

    await page.getByRole('button', { name: /new item/i }).click()
    await page.getByLabel('Description').fill('Inspect emergency exits')
    await page.getByLabel('Requires photo').uncheck()
    await page.getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByText('Inspect emergency exits')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-04-checklist-items.png` })

    // -- A second company + division, existing only as a move-company
    // target below -- no shift/checklist needed for that. --
    await page.getByRole('link', { name: 'Companies' }).click()
    await expect(page).toHaveURL(/\/admin\/companies$/)
    await page.getByRole('button', { name: /new company/i }).click()
    await page.getByLabel('Name').fill(companyName2)
    await page.getByLabel('Email').fill('e2e-admin-2@example.com')
    await page.getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByText(companyName2)).toBeVisible()

    // -- Divisions live inside the company panel now, reached via an
    // explicit "See more detail" link rather than a top-level nav item. --
    await page
      .getByRole('row', { name: companyName2 })
      .getByRole('link', { name: /see more detail/i })
      .click()
    await expect(page).toHaveURL(/\/admin\/companies\/\d+$/)
    await expect(page.getByRole('heading', { name: companyName2 })).toBeVisible()
    await page.getByRole('button', { name: /new division/i }).click()
    await page.getByLabel('Name').fill(divisionName2)
    await page.getByLabel('Late tolerance').fill('10')
    await page.getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByText(divisionName2)).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-10-company-detail-divisions.png` })

    // -- Staff registration --
    await page.getByRole('link', { name: 'Staff' }).click()
    await expect(page).toHaveURL(/\/admin\/staff$/)
    await page.getByRole('button', { name: /register staff/i }).click()
    await page.getByLabel('Name').fill(staffName)
    await page.getByLabel('Email').fill('e2e-admin-staffer@test.local')
    await page.getByLabel('Password').fill('Password123!')
    await page.getByRole('combobox', { name: /company/i }).click()
    await page.getByRole('option', { name: companyName, exact: true }).click()
    await page.getByRole('combobox', { name: /division/i }).click()
    await page.getByRole('option', { name: divisionName, exact: true }).click()
    await page.getByRole('button', { name: /^register$/i }).click()
    await expect(page.getByText(staffName, { exact: true })).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-05-staff-list.png` })

    // Roster view confirms the role (the only place role is actually visible).
    // Exact-match the company/division names -- "E2E Admin Co 2" (created
    // above as a move-company target) would otherwise also match the plain
    // substring search for "E2E Admin Co".
    await page.getByText('Select a company', { exact: true }).click()
    await page.getByRole('option', { name: companyName, exact: true }).click()
    await page.getByText('Select a division', { exact: true }).click()
    await page.getByRole('option', { name: divisionName, exact: true }).click()
    // Scoped to the roster table specifically -- the flat Staff list above
    // is unfiltered (all companies) and can also contain a row matching
    // staffName, which would otherwise make this a strict-mode violation.
    const rosterTable = page.getByRole('table', { name: 'Staff roster' })
    const rosterRow = rosterTable.getByRole('row', { name: staffName })
    await expect(rosterRow.getByRole('cell', { name: 'STAFF', exact: true })).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-06-staff-roster.png` })

    // -- Move Company: move the staffer into the second company/division,
    // confirm they disappear from the old roster view and appear in the new
    // one. --
    await rosterRow.getByRole('button', { name: /move company/i }).click()
    await expect(page.getByRole('heading', { name: new RegExp(`move ${staffName}`, 'i') })).toBeVisible()
    await page.getByRole('combobox', { name: /company/i }).click()
    await page.getByRole('option', { name: companyName2 }).click()
    await page.getByRole('combobox', { name: /division/i }).click()
    await page.getByRole('option', { name: divisionName2 }).click()
    await page.getByRole('button', { name: /^move$/i }).click()
    await expect(page.getByRole('heading', { name: new RegExp(`move ${staffName}`, 'i') })).not.toBeVisible()
    await expect(page.getByText('No one assigned to this division yet.')).toBeVisible()

    // Revisit the Staff page fresh (remounts the roster pickers back to their
    // placeholder state) rather than reusing the still-selected company1/
    // division1 pickers, which no longer show the "Select a..." placeholder.
    await page.getByRole('link', { name: 'Companies' }).click()
    await page.getByRole('link', { name: 'Staff' }).click()
    await expect(page).toHaveURL(/\/admin\/staff$/)
    await page.getByText('Select a company', { exact: true }).click()
    await page.getByRole('option', { name: companyName2 }).click()
    await page.getByText('Select a division', { exact: true }).click()
    await page.getByRole('option', { name: divisionName2 }).click()
    await expect(page.getByRole('table', { name: 'Staff roster' }).getByRole('row', { name: staffName })).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-11-move-company.png` })

    // -- Attendance (fresh division, so an honest empty state) --
    await page.getByRole('link', { name: 'Attendance' }).click()
    await expect(page).toHaveURL(/\/admin\/attendance$/)
    await page.getByText('Select a company', { exact: true }).click()
    await page.getByRole('option', { name: companyName, exact: true }).click()
    await page.getByText('Select a division', { exact: true }).click()
    await page.getByRole('option', { name: divisionName, exact: true }).click()
    await expect(page.getByText('No records for this date.')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-07-attendance.png` })

    // -- Visits --
    // e2e-test-seed.ts seeds a supervisor + visit log directly via Prisma
    // (not this test) so there's real cross-company data to assert names
    // render for, without spending another authLimiter-budget login here.
    await page.getByRole('link', { name: 'Visits' }).click()
    await expect(page).toHaveURL(/\/admin\/visits$/)
    await expect(page.getByRole('heading', { name: 'Visit Logs' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Supervisor' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Company' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'E2E Playwright Supervisor' })).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-08-visits.png` })

    // -- Photos by staff member: search by name, not a pasted ID --
    await page.getByLabel('Supervisor').fill('Playwright Supervisor')
    await expect(page.getByRole('button', { name: 'E2E Playwright Supervisor' })).toBeVisible()
    await page.getByRole('button', { name: 'E2E Playwright Supervisor' }).click()
    await page.getByRole('button', { name: /look up/i }).click()
    // Scoped to the photo card itself, not just anywhere on the page --
    // the same company name is already visible in the table above, so an
    // unscoped assertion here wouldn't actually prove the picker worked.
    const photoCard = page.locator('img[alt="Visit"]').locator('xpath=..')
    await expect(photoCard).toBeVisible()
    await expect(photoCard.getByText(/^E2E Playwright Co/)).toBeVisible()
    await expect(photoCard.getByRole('button', { name: /download/i })).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-09-visit-photos-by-supervisor.png` })

    // -- Checklists: top-level page, replaces the old nested per-item
    // viewer. "By Division" is the default tab -- honest empty state since
    // the item created earlier never got a real submission (same bar as
    // Attendance's fresh-division check above). --
    await page.getByRole('link', { name: 'Checklists' }).click()
    await expect(page).toHaveURL(/\/admin\/checklists$/)
    await expect(page.getByRole('button', { name: 'By Division' })).toBeVisible()
    await page.getByText('Select a company', { exact: true }).click()
    await page.getByRole('option', { name: companyName, exact: true }).click()
    await page.getByText('Select a division', { exact: true }).click()
    await page.getByRole('option', { name: divisionName, exact: true }).click()
    await expect(page.getByText('No checklist photos for this date.')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-12-checklists-by-division.png` })

    // -- By Staff Member tab: search for the staffer registered earlier. --
    await page.getByRole('button', { name: 'By Staff Member' }).click()
    await page.getByLabel('Staff member').fill(staffName)
    await expect(page.getByRole('button', { name: staffName })).toBeVisible()
    await page.getByRole('button', { name: staffName }).click()
    await page.getByRole('button', { name: /look up/i }).click()
    await expect(page.getByText('No checklist photos for this date.')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-13-checklists-by-staff.png` })
  })
})
