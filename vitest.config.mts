import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        resources: "usable",
      },
    },
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules",
      "tests/e2e/**/*",
      "**/*.spec.ts", // Exclude Playwright spec files
      ".next",
      "playwright",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/",
        "tests/",
        "**/*.config.{ts,js,mjs,mts}",
        "**/next-env.d.ts",
        ".next/",
        ".sst/",
        "playwright/",
        "instrumentation*.ts",
        "proxy.ts",
        "**/layout.tsx",
        "**/providers.tsx",
        "**/themes/**",
        "**/emscripten/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

