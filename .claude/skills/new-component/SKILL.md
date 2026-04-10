---
name: new-component
description: Scaffold a new Svelte 5 component following project conventions (shadcn-svelte, Tailwind, DESIGN.md tokens, runes API)
---

Create a new Svelte 5 component. Steps:

1. Read DESIGN.md for design tokens and component patterns
2. Read src/lib/ui/ for existing component examples
3. Create the component in the appropriate location under src/lib/
4. Use $state/$derived/$props (runes, no export let)
5. Colors via CSS variables, spacing multiples of 4px
6. Export from index file if it's a lib/ui component

Usage: /new-component <ComponentName> [description]
