import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Hearst Connect E2E tests.
 *
 * Tests run against the local dev server on port 4105.
 * Install browsers with: pnpm exec playwright install chromium
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:4105",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:4105",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
