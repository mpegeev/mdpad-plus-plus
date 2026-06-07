/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";

// Vitest-specific overrides. Mirrors `vite.config.ts` for runtime test needs,
// but adds `server.fs.allow` so the worktree setup (node_modules junction-linked
// from the main checkout) can serve files whose realpath is outside the
// worktree root. Without this, `@testing-library/svelte/vite` injects a
// setupFile path that Vite refuses to read because its resolved path escapes
// the project root sandbox.
export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: {
    alias: {
      $lib: "/src/lib",
    },
  },
  server: {
    fs: {
      allow: ["..", "../.."],
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.test.{ts,js}"],
  },
});
