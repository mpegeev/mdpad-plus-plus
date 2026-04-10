import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Tauri ожидает фиксированный порт и не использует эту переменную
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [svelte()],

  // Запрещаем Vite очищать терминал, чтобы не съедать вывод Rust
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      // Tauri-сборка ходит через свой watcher
      ignored: ["**/src-tauri/**"],
    },
  },

  // Tauri использует Chromium на Linux/Windows и WebKit на macOS
  envPrefix: ["VITE_", "TAURI_ENV_*"],

  build: {
    // Tauri 2 поддерживает современные таргеты
    target:
      process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },

  resolve: {
    alias: {
      $lib: "/src/lib",
    },
  },
});
