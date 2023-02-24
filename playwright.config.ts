import { PlaywrightTestConfig, devices } from "@playwright/test";
import path from "path";

// Reference: https://playwright.dev/docs/test-configuration
// Also: https://github.com/vercel/next.js/blob/canary/examples/with-playwright/playwright.config.ts
const config: PlaywrightTestConfig = {
  workers: 2,
  timeout: 30 * 1000,
  testDir: path.join(__dirname, "e2e"),
  retries: 5,
  outputDir: "test-results/",

  // Run your local dev server before starting the tests:
  // https://playwright.dev/docs/test-advanced#launching-a-development-web-server-during-the-tests
  webServer: {
    command: "npm run dev",
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },

  use: {
    trace: "retry-with-trace",
  },

  projects: [
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    // {
    //   name: 'Desktop Firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //   },
    // },
    // {
    //   name: 'Desktop Safari',
    //   use: {
    //     ...devices['Desktop Safari'],
    //   },
    // },
    // Test against mobile viewports.
    {
      name: "Mobile Chrome",
      use: {
        ...devices["iPhone SE"],
      },
    },
    // {
    //   name: "Mobile Safari",
    //   use: devices["iPhone 12"],
    // },
  ],
};
export default config;
