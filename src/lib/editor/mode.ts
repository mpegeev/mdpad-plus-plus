/**
 * Render-mode helper (MDP-15).
 *
 * The editor has three per-document render modes (see `DocumentMode` in the
 * documents store):
 *   - `rendered` — every top-level block is rendered (default, Typora-like).
 *   - `mixed`    — the block under the caret is shown raw, the rest rendered.
 *   - `raw`      — the whole document is plain Markdown, no decorations.
 *
 * `cycleMode` is the single source of truth for the cyclic order used by the
 * status-bar button and the Ctrl+E shortcut. It is a pure, deterministic
 * function — same input always yields the same output — so its behaviour is
 * pinned by tests written independently (SENAR rule 4, `test-writer`).
 */

import type { DocumentMode } from "$lib/stores/documents.svelte";

/**
 * Returns the next render mode in the cycle
 * `rendered → mixed → raw → rendered`.
 *
 * Pure and total: defined for all three `DocumentMode` values.
 */
export function cycleMode(mode: DocumentMode): DocumentMode {
  switch (mode) {
    case "rendered":
      return "mixed";
    case "mixed":
      return "raw";
    case "raw":
      return "rendered";
  }
}
