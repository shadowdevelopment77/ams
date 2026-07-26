import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5174',
    screenshot: 'on',
    trace: 'retain-on-failure',
    // GPS is mandatory-blocking for check-in/check-out/visit-log (CLAUDE.md);
    // Chromium doesn't grant real location without this, so staff/supervisor
    // flows would otherwise hang on the browser permission prompt.
    permissions: ['geolocation'],
    geolocation: { latitude: -6.2088, longitude: 106.8456 },
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
})
