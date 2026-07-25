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

    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@ams.local')
    await page.getByLabel('Password').fill('Admin123!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/admin\/companies$/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-01-companies.png` })

    // -- Company --
    await page.getByRole('button', { name: /new company/i }).click()
    await page.getByLabel('Name').fill(companyName)
    await page.getByLabel('Code').fill('E2EADMIN')
    await page.getByLabel('Email').fill('e2e-admin@example.com')
    await page.getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByText(companyName)).toBeVisible()

    await page.getByRole('link', { name: companyName }).click()
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

    // -- Staff registration --
    await page.getByRole('link', { name: 'Staff' }).click()
    await expect(page).toHaveURL(/\/admin\/staff$/)
    await page.getByRole('button', { name: /register staff/i }).click()
    await page.getByLabel('Name').fill(staffName)
    await page.getByLabel('Email').fill('e2e-admin-staffer@test.local')
    await page.getByLabel('Password').fill('Password123!')
    await page.getByRole('combobox', { name: /company/i }).click()
    await page.getByRole('option', { name: companyName }).click()
    await page.getByRole('combobox', { name: /division/i }).click()
    await page.getByRole('option', { name: divisionName }).click()
    await page.getByRole('button', { name: /^register$/i }).click()
    await expect(page.getByText(staffName, { exact: true })).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-05-staff-list.png` })

    // Roster view confirms the role (the only place role is actually visible).
    await page.getByText('Select a company', { exact: true }).click()
    await page.getByRole('option', { name: companyName }).click()
    await page.getByText('Select a division', { exact: true }).click()
    await page.getByRole('option', { name: divisionName }).click()
    const rosterRow = page.getByRole('row', { name: staffName })
    await expect(rosterRow.getByRole('cell', { name: 'STAFF', exact: true })).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-06-staff-roster.png` })

    // -- Attendance (fresh division, so an honest empty state) --
    await page.getByRole('link', { name: 'Attendance' }).click()
    await expect(page).toHaveURL(/\/admin\/attendance$/)
    await page.getByText('Select a company', { exact: true }).click()
    await page.getByRole('option', { name: companyName }).click()
    await page.getByText('Select a division', { exact: true }).click()
    await page.getByRole('option', { name: divisionName }).click()
    await expect(page.getByText('No records for this date.')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-07-attendance.png` })

    // -- Visits --
    await page.getByRole('link', { name: 'Visits' }).click()
    await expect(page).toHaveURL(/\/admin\/visits$/)
    await expect(page.getByRole('heading', { name: 'Visit Logs' })).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-08-visits.png` })
  })
})
