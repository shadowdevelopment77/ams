import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fixtures from './fixtures/data.json' with { type: 'json' }

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_PHOTO = path.join(__dirname, 'fixtures', 'test-photo.jpg')
const SCREENSHOT_DIR = '../Screenshot/phase4-staff-flow'

// Only meaningful on a real mobile UA -- desktop would hit MobileOnlyGate
// before ever reaching these screens (that's Phase 3.5's own coverage).
test.describe('STAFF daily flow: check-in -> checklist -> check-out', () => {
  test('full flow with real photo uploads', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-chromium',
      'the STAFF flow screens are mobile-only per Phase 3.5 -- desktop would hit MobileOnlyGate first'
    )

    await page.goto('/login')
    await page.getByLabel('Email').fill(fixtures.staffEmail)
    await page.getByLabel('Password').fill(fixtures.staffPassword)
    await page.getByRole('button', { name: /sign in/i }).click()

    // -- Dashboard: not checked in yet --
    await expect(page.getByText(/haven't checked in today/i)).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-dashboard-not-checked-in.png` })

    // -- Check-in --
    await page.getByRole('link', { name: /check in/i }).click()
    await expect(page).toHaveURL(/\/checkin$/)
    await page.getByLabel('Shift').selectOption({ value: String(fixtures.shiftId) })
    await page.getByRole('button', { name: /take photo/i }).click()
    await page.setInputFiles('input[type="file"]', TEST_PHOTO)
    await expect(page.getByRole('img', { name: /selected photo preview/i })).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-checkin-form-filled.png` })
    await page.getByRole('button', { name: /^check in$/i }).click()

    // Back on dashboard, now checked in.
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText(/checked in at/i)).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-dashboard-checked-in.png` })

    // -- Refresh mid-flow: state must survive via GET /api/attendance/today --
    await page.reload()
    await expect(page.getByText(/checked in at/i)).toBeVisible()

    // -- Checklist --
    // 3 distinct items (seeded by e2e-test-seed.ts) so the flow is actually
    // visible as a real checklist, not a single row. Each item allows 1-3
    // photos (backend: submit needs >=1, uploadPhoto caps at 3 -- see
    // checklist.service.ts).
    await page.getByRole('link', { name: /view checklist/i }).click()
    await expect(page).toHaveURL(/\/checklist$/)

    const itemDescriptions = [
      'Check fire extinguisher',
      'Inspect emergency exit signage',
      'Verify first aid kit is stocked',
    ]
    for (const description of itemDescriptions) {
      await expect(page.getByText(description)).toBeVisible()
    }
    // Each item's card is the <p> description's parent -- scoping interactions
    // to it is what lets 3 "Take photo" / "Add photo" buttons coexist on the
    // page without Playwright's strict-mode ambiguity.
    const cardFor = (description: string) => page.locator('p', { hasText: description }).locator('xpath=..')

    async function addPhoto(card: ReturnType<typeof cardFor>) {
      // The upload button's accessible name changes ("Add photo (n/3)" ->
      // "Uploading...") synchronously the instant the click handler fires,
      // before the network request even starts -- a text/visibility-based
      // wait would be satisfied by that instant label change, not by the
      // upload actually finishing (this is exactly the race that broke this
      // suite earlier). Wait on the real network responses instead: the photo
      // POST itself, then the my-checklist refetch that invalidateQueries
      // triggers, which is what actually updates the photo count on screen.
      const uploadResponse = page.waitForResponse(
        (res) => res.url().includes('/photo') && res.request().method() === 'POST'
      )
      const refetchResponse = page.waitForResponse(
        (res) => res.url().includes('/my-checklist') && res.request().method() === 'GET'
      )
      await card.getByRole('button', { name: /take photo/i }).click()
      await card.locator('input[type="file"]').setInputFiles(TEST_PHOTO)
      await card.getByRole('button', { name: /add photo/i }).click()
      await uploadResponse
      await refetchResponse
    }

    // First item gets the full 1-to-3 demonstration: add-another affordance,
    // then confirm the control disappears once the real cap is hit.
    const item1 = cardFor(itemDescriptions[0])
    for (let photoNum = 0; photoNum < 3; photoNum++) {
      await addPhoto(item1)
    }
    await expect(item1.getByRole('button', { name: /add photo/i })).toHaveCount(0)

    // Remaining items each get just the minimum (1 photo) -- enough to submit.
    for (const description of itemDescriptions.slice(1)) {
      await addPhoto(cardFor(description))
    }

    // The thumbnails point at real Cloudinary URLs, not local blobs -- give
    // them a moment to actually finish downloading and painting before the
    // screenshot, otherwise a still-loading <img> can render blank.
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-checklist-photo-uploaded.png` })
    await page.getByRole('button', { name: /submit checklist/i }).click()

    // Submitting navigates back to the dashboard.
    await expect(page).toHaveURL(/\/$/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-dashboard-after-checklist-submit.png` })

    // -- Check-out --
    await page.getByRole('link', { name: /check out/i }).click()
    await expect(page).toHaveURL(/\/checkout$/)
    await page.getByRole('button', { name: /take photo/i }).click()
    await page.setInputFiles('input[type="file"]', TEST_PHOTO)
    await expect(page.getByRole('img', { name: /selected photo preview/i })).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/15-checkout-form-filled.png` })
    await page.getByRole('button', { name: /^check out$/i }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText(/you're done for today/i)).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/16-dashboard-checked-out.png` })

    // -- History: today's just-completed cycle shows up, not just an
    // empty state -- this is the first time this page is ever exercised. --
    await page.getByRole('link', { name: /view history/i }).click()
    await expect(page).toHaveURL(/\/history$/)
    await expect(page.getByText(/in:/i)).toBeVisible()
    await expect(page.getByText(/out:/i)).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/17-attendance-history.png` })
  })
})
