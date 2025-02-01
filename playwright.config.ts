import { defineConfig, devices } from "@playwright/test";

// const timeout = 1_000_000;
const timeout = 15_000;

export default defineConfig({
  fullyParallel: true,
  maxFailures: 1,
  // workers: 1,
  // retries: 2,
  // repeatEach: 2,
  use: {
    baseURL: "http://127.0.0.1:8000",
  },
  webServer: {
    command: "serve",
    url: "http://127.0.0.1:8000",
    timeout: 5_000,
    reuseExistingServer: false,
    stderr: "ignore",
  },
  timeout,
  expect: { timeout: timeout / 2 },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          ignoreDefaultArgs: ["--headless=old"],
          // args: ["--headless"],
        },
      },
    },
  ],
});
