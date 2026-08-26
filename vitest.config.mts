import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["**/*.test.ts", "**/dist/**", "**/.next/**", "e2e/**"],
    },
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "e2e/**"],
  },
});
