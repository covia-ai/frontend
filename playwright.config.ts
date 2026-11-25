import { defineConfig, devices } from "@playwright/test";

// Browser end-to-end tests, in two projects:
// - "mocked" (e2e/*.spec.ts): against a venue mocked in the browser
//   (e2e/fixtures/mock-venue.ts). No Java venue needed; runs in CI.
// - "venue" (e2e/venue/*.spec.ts): against a real venue at 127.0.0.1:8080
//   (e2e/fixtures/real-venue.ts). Skipped when none is running, unless
//   E2E_REQUIRE_VENUE is set (pnpm test:e2e:venue).
//
// Locally, an already-running `pnpm dev` on :3000 is reused. Never let this
// start `pnpm build` while dev is up: both write .next/ and dev breaks.
const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // The dev server compiles each route on first visit, which can take a while.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mocked", testIgnore: "venue/**", use: { ...devices["Desktop Chrome"] } },
    { name: "venue", testMatch: "venue/**/*.spec.ts", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // CI tests the production build; the mock venue is the local one that
    // non-production builds list (NEXT_PUBLIC_IS_ENV_PROD=false).
    command: process.env.CI ? `pnpm build && pnpm start --port ${PORT}` : `pnpm dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { NEXT_PUBLIC_IS_ENV_PROD: "false" },
  },
});
