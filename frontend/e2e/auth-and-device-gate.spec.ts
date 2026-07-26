import { test, expect } from '@playwright/test'
import fixtures from './fixtures/data.json' with { type: 'json' }

const SCREENSHOT_DIR = '../Screenshot/phase3.5-device-gate'

test.describe('Auth flow + mobile-only device gate (Phase 3.5 Part A)', () => {
  test('unauthenticated visit to / redirects to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-unauth-redirect-to-login.png` })
  })

  test('wrong password shows a server error message', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(fixtures.staffEmail)
    await page.getByLabel('Password').fill('definitely-wrong-password')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-wrong-password-error.png` })
  })

  test('invalid email format shows a client-side validation error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('not-an-email')
    await page.getByLabel('Password').fill('whatever')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/invalid email format/i)).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-invalid-email-client-validation.png` })
  })

  test('successful STAFF login, refresh persistence, and logout', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(fixtures.staffEmail)
    await page.getByLabel('Password').fill(fixtures.staffPassword)
    await page.getByRole('button', { name: /sign in/i }).click()

    // On a desktop browser (this project's default), a STAFF login should
    // land on the mobile-only gate, not the dashboard -- see next test block
    // for the explicit assertion. Here we just confirm login succeeded by
    // leaving /login (the gate and the dashboard are both post-auth states).
    await expect(page).not.toHaveURL(/\/login$/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-after-staff-login-desktop.png` })

    await page.reload()
    await expect(page).not.toHaveURL(/\/login$/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-after-refresh-still-logged-in.png` })

    await page.getByRole('button', { name: /logout/i }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-after-logout.png` })
  })
})

test.describe('Mobile-only device gate: desktop vs mobile', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('STAFF on a desktop viewport sees the mobile-only gate, not the dashboard', async ({
    page,
  }, testInfo) => {
    // This test's whole point is a real desktop UA + desktop viewport. The
    // mobile-chromium project overrides viewport but keeps its Pixel 7
    // User-Agent (which useIsMobile() correctly reads via Client Hints),
    // so running this under that project would test an invalid combination
    // (desktop-sized viewport, mobile UA) and fail for the wrong reason.
    test.skip(
      testInfo.project.name !== 'desktop-chromium',
      'desktop-vs-mobile UA distinction only makes sense on the desktop project'
    )
    await page.goto('/login')
    await page.getByLabel('Email').fill(fixtures.staffEmail)
    await page.getByLabel('Password').fill(fixtures.staffPassword)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/mobile only/i)).toBeVisible()
    await expect(page.getByText(/only available on mobile devices/i)).toBeVisible()
    // The dashboard's identifying text must NOT be present.
    await expect(page.getByText(/logged in as/i)).not.toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-desktop-sees-mobile-only-gate.png` })

    // The gate's own logout button must work too, so a desktop STAFF user
    // isn't stuck signed in with no way out.
    await page.getByRole('button', { name: /logout/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('Virtual mobile mode: desktop testing override', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('checking "simulate mobile" on login lets a desktop browser reach the real dashboard', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-chromium',
      'the whole point is proving this works on a real desktop UA + viewport'
    )
    await page.goto('/login')
    await page.getByLabel('Email').fill(fixtures.staffEmail)
    await page.getByLabel('Password').fill(fixtures.staffPassword)
    await page.getByLabel(/simulate mobile device/i).check()
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/logged in as/i)).toBeVisible()
    await expect(page.getByText(/mobile only/i)).not.toBeVisible()
    await expect(page.getByText(/simulating mobile/i)).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-virtual-mobile-reaches-dashboard.png` })

    // Turning it off re-asserts the real gate immediately (reload, not a
    // fresh login) -- same desktop UA/viewport, now genuinely blocked again.
    await page.getByRole('button', { name: /turn off/i }).click()
    await expect(page.getByText(/mobile only/i)).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-virtual-mobile-turned-off-gate-returns.png` })

    await page.getByRole('button', { name: /logout/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('Mobile-only device gate: mobile succeeds', () => {
  test('STAFF on a real mobile UA reaches the dashboard, not the gate', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-chromium',
      'this is specifically testing the mobile-chromium project\'s device emulation'
    )
    await page.goto('/login')
    await page.getByLabel('Email').fill(fixtures.staffEmail)
    await page.getByLabel('Password').fill(fixtures.staffPassword)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/logged in as/i)).toBeVisible()
    await expect(page.getByText(/mobile only/i)).not.toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-mobile-reaches-real-dashboard.png` })
  })
})
