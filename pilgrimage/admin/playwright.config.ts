import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests for the admin app. Run from `pilgrimage/admin`:
 *   npx playwright install
 *   npm run test:e2e
 *
 * Starts `next dev` automatically unless SKIP_WEB_SERVER=1 (then use BASE_URL).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.SKIP_WEB_SERVER
    ? undefined
    : {
        command: "TURBOPACK_ROOT=$(pwd) npx next dev -p 3000",
        url: "http://127.0.0.1:3000/login",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
