# src/lib/ui — shadcn-svelte components

Components in this directory are **copied** from [shadcn-svelte](https://shadcn-svelte.com)
and live in the repository as owned source code. There is no runtime dependency on a
shadcn package — the files are ours to read, edit, and extend.

## Copying a component

```bash
npx shadcn-svelte@latest add <component-name>
```

Components are placed in `src/lib/ui/<component-name>/`. After copying:

1. Replace any hardcoded color values (`#xxx`, `rgb(...)`) with CSS custom properties
   from `src/styles/tokens.css` and `src/styles/themes/`.
2. Replace any hardcoded spacing with `--space-N` tokens.
3. Verify the component passes the DESIGN.md checklist before committing.

## Rules

- **No hardcoded colors.** Use `var(--fg-primary)`, `var(--bg-elevated)`, etc.
- **No hardcoded spacing.** Use `var(--space-N)` or the Tailwind spacing scale
  (which is already mapped to CSS variables in `tailwind.config.js`).
- **Radii only from tokens.** `--radius-sm`, `--radius-md`, `--radius-lg`.
- **Icons from `$lib/ui/Icon.svelte`.** Size 14×14 or 16×16, color via `currentColor`.
  Add new icons to `$lib/ui/icons.ts` (SVG path data from Lucide, ISC license).
- **No animation on `all` or `height`.** Only `background`, `border-color`, `opacity`.

## cn() helper

All class composition uses the `cn()` helper from `$lib/ui/utils.ts`:

```ts
import { cn } from "$lib/ui/utils";

const cls = cn("base-class", conditional && "extra-class", props.class);
```

## DESIGN.md checklist (copy here for quick reference)

- [ ] All colors via CSS variables, no `#xxx` hardcode in components
- [ ] All spacing multiples of 4px via `--space-N`
- [ ] Radius only from `--radius-*`
- [ ] Font: `--font-ui` or `--font-mono`, not custom
- [ ] Icons from `$lib/ui/Icon.svelte`, size 14/16
- [ ] No animation on `all` or `height`
- [ ] Component tested at 640×400 window
- [ ] Dark theme works (light — after MDP-27)
