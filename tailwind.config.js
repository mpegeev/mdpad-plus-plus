/** @type {import('tailwindcss').Config} */
// Content detection only — theme is defined via @theme in src/styles/global.css.
// No hardcoded colors: all design tokens live in src/styles/themes/ as CSS variables.
export default {
  content: ["./index.html", "./src/**/*.{svelte,ts,js}"],
};
