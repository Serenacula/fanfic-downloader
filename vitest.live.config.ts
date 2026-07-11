import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/tests/live/**/*.live.test.ts"],
    setupFiles: ["src/tests/setup.ts"],
    testTimeout: 60_000,
    fileParallelism: false,
    retry: 0,
  },
});
