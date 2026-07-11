import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "src/tests/live/**"],
    setupFiles: ["src/tests/setup.ts"],
  },
});
