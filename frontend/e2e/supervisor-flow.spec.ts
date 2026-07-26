import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fixtures from './fixtures/data.json' with { type: 'json' }

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_PHOTO = path.join(__dirname, 'fixtures', 'test-photo.jpg')
const SCREENSHOT_DIR = '../Screenshot/phase10-supervisor-flow'

// Only meaningful on a real mobile UA -- desktop would hit MobileOnlyGate
// before ever reaching these screens (same mobile-only rule as STAFF).
test.describe('SUPERVISOR visit-logging flow', () => {
  test('logs a visit with a real photo, sees it on the dashboard', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-chromium',
      'the SUPERVISOR flow screens are mobile-only, same as STAFF'
    )

    await page.goto('/login')
    await page.getByLabel('Email').fill(fixtures.supervisorEmail)
    await page.getByLabel('Password').fill(fixtures.supervisorPassword)
    await page.getByRole('button', { name: /sign in/i }).click()

    // -- Dashboard: e2e-test-seed.ts already logged one visit for this
    // supervisor today, so this proves the real list renders, not just an
    // empty state -- and also that landing here works at all (this role
    // never had a frontend before this phase; login used to bounce back
    // to /login since `/` is STAFF-only). --
    await expect(page).toHaveURL(/\/visits$/)
    await expect(page.getByText(fixtures.supervisorName)).toBeVisible()
    await expect(page.getByText("Today's visits")).toBeVisible()
    await expect(page.getByText('E2E fixture visit')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-dashboard-with-seeded-visit.png` })

    // -- Log a new visit (no one-visit-per-day limit, so this is a 2nd
    // visit to the same company on the same day -- exactly what CLAUDE.md
    // says SUPERVISOR should be allowed to do). --
    await page.getByRole('link', { name: /log a visit/i }).click()
    await expect(page).toHaveURL(/\/visits\/new$/)
    await page.getByLabel('Company').selectOption({ value: String(fixtures.companyId) })
    await page.getByRole('button', { name: /take photo/i }).click()
    await page.setInputFiles('input[type="file"]', TEST_PHOTO)
    await expect(page.getByRole('img', { name: /selected photo preview/i })).toBeVisible()
    await page.getByLabel(/notes/i).fill('E2E: second visit, same company, same day')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-log-visit-form-filled.png` })
    await page.getByRole('button', { name: /^log visit$/i }).click()

    // Back on the dashboard, now showing both visits.
    await expect(page).toHaveURL(/\/visits$/)
    await expect(page.getByText('E2E: second visit, same company, same day')).toBeVisible()
    await expect(page.getByText('E2E fixture visit')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-dashboard-with-both-visits.png` })
  })
})
