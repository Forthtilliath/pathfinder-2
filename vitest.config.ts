import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Playwright specs live in e2e/ and must not be picked up by Vitest.
    include: ["tests/**/*.test.ts"],
  },
});
