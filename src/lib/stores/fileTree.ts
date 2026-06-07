/**
 * Pure, side-effect-free helpers for the sidebar file tree (MDP-9).
 *
 * Kept in a plain `.ts` (no Svelte runes, no Tauri, no DOM) so the logic
 * can be unit-tested in isolation. The reactive store that orchestrates
 * lazy loading and persistence lives in `fileTree.svelte.ts`.
 */

import type { DirEntry } from "$lib/fs";

/** Extensions shown when the markdown-only filter is ON. Lower-case, with dot. */
export const MARKDOWN_EXTENSIONS = [".md", ".markdown", ".txt"] as const;

/**
 * A flattened, render-ready tree row.
 *
 * The tree is stored as a nested model in the store, but rendering and
 * virtualization operate over a flat list of visible rows (only expanded
 * folders contribute their children). `depth` drives indentation.
 */
export interface FlatNode {
  /** Absolute path — stable identity for keys, expansion and selection. */
  path: string;
  name: string;
  isDir: boolean;
  /** Nesting level; root entries are depth 0. */
  depth: number;
  /** Only meaningful for directories. */
  expanded: boolean;
  /**
   * `true` while a directory's children are being loaded for the first time.
   * Lets the UI show a spinner/skeleton without blocking.
   */
  loading: boolean;
}

/** Lower-case extension including the leading dot, or `""` when none. */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  // A leading dot (dotfile) or no dot at all ⇒ no extension.
  if (dot <= 0) return "";
  return name.slice(dot).toLowerCase();
}

/**
 * AC#4 — extension filter.
 *
 * Directories always pass (needed for navigation). Files pass only when
 * the filter is OFF, or when their extension is in {@link MARKDOWN_EXTENSIONS}.
 */
export function passesFilter(entry: DirEntry, markdownOnly: boolean): boolean {
  if (entry.isDir) return true;
  if (!markdownOnly) return true;
  return (MARKDOWN_EXTENSIONS as readonly string[]).includes(
    extensionOf(entry.name),
  );
}

/**
 * AC#4 helper applied to a whole directory listing.
 */
export function filterEntries(
  entries: readonly DirEntry[],
  markdownOnly: boolean,
): DirEntry[] {
  return entries.filter((e) => passesFilter(e, markdownOnly));
}

/**
 * Sort a single directory level: folders first, then files, each group
 * ordered case-insensitively by name (locale-aware, ties broken by raw
 * name so the order is deterministic).
 */
export function sortEntries(entries: readonly DirEntry[]): DirEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    const byName = a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
      numeric: true,
    });
    if (byName !== 0) return byName;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
}

/** Inclusive-exclusive window of flat-list indices to render. */
export interface VirtualWindow {
  /** First index to render (inclusive). */
  start: number;
  /** One past the last index to render (exclusive). */
  end: number;
  /** Total scrollable height in px for the spacer. */
  totalHeight: number;
  /** Top offset in px of the first rendered row. */
  offsetY: number;
}

/**
 * AC#3 — fixed-height-row virtualization.
 *
 * Given the scroll offset and viewport height, compute which slice of the
 * flat list to render plus an overscan margin. Pure arithmetic so it is
 * trivially testable: feed 5000 rows and assert the window stays bounded.
 *
 * @param total       number of rows in the flat list
 * @param rowHeight   fixed px height of one row (> 0)
 * @param scrollTop   current vertical scroll offset in px (>= 0)
 * @param viewport    visible height in px (>= 0)
 * @param overscan    extra rows rendered above & below the viewport (>= 0)
 */
export function computeWindow(
  total: number,
  rowHeight: number,
  scrollTop: number,
  viewport: number,
  overscan = 5,
): VirtualWindow {
  const safeRow = rowHeight > 0 ? rowHeight : 1;
  const clampedTotal = Math.max(0, Math.floor(total));
  const totalHeight = clampedTotal * safeRow;

  if (clampedTotal === 0) {
    return { start: 0, end: 0, totalHeight: 0, offsetY: 0 };
  }

  const top = Math.max(0, scrollTop);
  const view = Math.max(0, viewport);

  // Clamp the first-visible index so an over-scroll (scrollTop beyond the
  // content height) never produces a window past the end of the list.
  const firstVisible = Math.min(clampedTotal - 1, Math.floor(top / safeRow));
  const visibleCount = Math.ceil(view / safeRow);

  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(clampedTotal, firstVisible + visibleCount + overscan);

  return {
    start,
    end,
    totalHeight,
    offsetY: start * safeRow,
  };
}
