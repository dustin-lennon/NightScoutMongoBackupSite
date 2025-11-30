import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.PLAYWRIGHT_WORKERS 
    ? parseInt(process.env.PLAYWRIGHT_WORKERS, 10)
    : process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "PLAYWRIGHT_TEST=true bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      PLAYWRIGHT_TEST: "true",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "test-secret-for-playwright",
      DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || "test-client-id",
      DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || "test-client-secret",
      ALLOWED_DISCORD_USER_ID: process.env.ALLOWED_DISCORD_USER_ID || "123456789",
    },
  },
});

