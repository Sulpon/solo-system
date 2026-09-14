import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Test-only config, entirely separate from the Next.js build (next.config.ts
// / next build / tauri build are all untouched by this file). Scoped to
// app/**  - only where real .test.ts(x) files live - so it never tries to
// collect anything from node_modules or the Rust/Tauri side.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.mts"],
    include: ["app/**/*.test.{ts,tsx}"],
    css: false,
  },
});
