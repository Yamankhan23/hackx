import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Explicit so this never picks up compiled duplicates from dist/ (or
    // anything else outside src) regardless of build state or cwd.
    include: ["src/__tests__/**/*.test.ts"],
  },
});
