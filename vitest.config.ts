import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "relay/**/*.test.ts", "tracker/**/*.test.ts"],
    passWithNoTests: true,
  },
});
