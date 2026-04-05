import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setupTests.js"],

    reporters: ["default", "junit"],

    outputFile: {
      junit: "reports/junit.xml",
    },

    coverage: {
      provider: "v8",
      reportsDirectory: "reports/coverage",
      reporter: ["text", "html", "lcov"],
    },
  },
});