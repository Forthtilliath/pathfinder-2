import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;
// Own port, never reused: a running `astro dev` (4321) has no search index and would skew the results.
const PORT = 4329;

/**
 * End-to-end tests against the built site (`npm run build` first):
 * Pagefind search only exists in the build, not in `astro dev`.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  // Chromium only: one browser keeps the CI short.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run preview -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
