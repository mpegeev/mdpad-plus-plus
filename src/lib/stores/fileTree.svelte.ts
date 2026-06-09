/**
 * Sidebar file-tree store (MDP-9).
 *
 * Reactive, runes-based state for the directory tree rendered in the
 * sidebar:
 *   - the currently open root folder,
 *   - a lazily-loaded nested model (children fetched on first expand),
 *   - the markdown-only filter toggle,
 *   - last-folder persistence in `localStorage`.
 *
 * Filesystem access is injected as a thin pair of functions so the store
 * stays unit-testable: tests pass stub `pickFolder`/`listDir` instead of
 * mocking the Tauri boundary globally. Production wiring uses the real
 * helpers from `$lib/fs`.
 *
 * Pure logic (filter, sort, virtualization window) lives in the sibling
 * `fileTree.ts`; this module only orchestrates I/O and reactive state.
 *
 * Filename note: `.svelte.ts` (not plain `.ts`) so Svelte 5 runes
 * (`$state`, `$derived`) are compiled — same reason as documents.svelte.ts.
 */

import type { DirEntry } from "$lib/fs";
import { pickFolder as realPickFolder, listDir as realListDir } from "$lib/fs";
import { filterEntries, sortEntries, type FlatNode } from "./fileTree";
import { ancestorDirsToReveal } from "./revealPath";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  expanded: boolean;
  loading: boolean;
  /** `null` ⇒ children not loaded yet. `[]` ⇒ loaded, empty. */
  children: TreeNode[] | null;
}

/** Injected filesystem boundary — swapped for stubs in tests. */
export interface FileTreeDeps {
  pickFolder: (defaultDir?: string) => Promise<string | null>;
  listDir: (path: string) => Promise<DirEntry[]>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "mdpad-last-folder-v1";

// ---------------------------------------------------------------------------
// State (Svelte 5 runes)
// ---------------------------------------------------------------------------

let rootPath = $state<string | null>(null);
let rootNodes = $state<TreeNode[]>([]);
let markdownOnly = $state(false);
let rootLoading = $state(false);
let rootError = $state<string | null>(null);

let deps: FileTreeDeps = {
  pickFolder: realPickFolder,
  listDir: realListDir,
};

// ---------------------------------------------------------------------------
// Persistence (localStorage; mirrors documents.svelte.ts approach)
// ---------------------------------------------------------------------------

function getStorage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function persistRoot(path: string | null): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (path === null) storage.removeItem(STORAGE_KEY);
    else storage.setItem(STORAGE_KEY, path);
  } catch {
    // Quota / SecurityError — fail-closed; in-memory state remains valid.
  }
}

/** Read the persisted folder path, or `null` if none / unavailable. */
export function readPersistedFolder(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw === null || raw === "" ? null : raw;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function makeNode(entry: DirEntry): TreeNode {
  return {
    name: entry.name,
    path: entry.path,
    isDir: entry.isDir,
    size: entry.size,
    expanded: false,
    loading: false,
    children: null,
  };
}

function toNodes(entries: DirEntry[]): TreeNode[] {
  // Sort once on load; filter is applied at flatten time so toggling the
  // filter never requires a re-fetch.
  return sortEntries(entries).map(makeNode);
}

function findNode(path: string): TreeNode | null {
  const stack: TreeNode[] = [...rootNodes];
  while (stack.length > 0) {
    const n = stack.pop() as TreeNode;
    if (n.path === path) return n;
    if (n.children) stack.push(...n.children);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API — accessors
// ---------------------------------------------------------------------------

export function getRootPath(): string | null {
  return rootPath;
}

export function isMarkdownOnly(): boolean {
  return markdownOnly;
}

export function isRootLoading(): boolean {
  return rootLoading;
}

export function getRootError(): string | null {
  return rootError;
}

/**
 * Flatten the nested tree into the list of currently-visible rows,
 * honouring expansion state and the markdown-only filter. Pure read of
 * reactive state ⇒ callers can wrap in `$derived`.
 */
export function getFlatNodes(): FlatNode[] {
  const out: FlatNode[] = [];

  function walk(nodes: TreeNode[], depth: number): void {
    // Reuse the pure filter so files hidden by the toggle never render,
    // while directories always stay visible for navigation.
    const visible = filterEntries(
      nodes.map((n) => ({
        name: n.name,
        path: n.path,
        isDir: n.isDir,
        size: n.size,
      })),
      markdownOnly,
    );
    const visiblePaths = new Set(visible.map((e) => e.path));

    for (const node of nodes) {
      if (!visiblePaths.has(node.path)) continue;
      out.push({
        path: node.path,
        name: node.name,
        isDir: node.isDir,
        depth,
        expanded: node.expanded,
        loading: node.loading,
      });
      if (node.isDir && node.expanded && node.children) {
        walk(node.children, depth + 1);
      }
    }
  }

  walk(rootNodes, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Public API — mutations
// ---------------------------------------------------------------------------

/** Inject a custom filesystem boundary (tests). */
export function __setDeps(custom: FileTreeDeps): void {
  deps = custom;
}

/** Restore the production filesystem boundary (tests teardown). */
export function __resetDeps(): void {
  deps = { pickFolder: realPickFolder, listDir: realListDir };
}

export function toggleMarkdownOnly(): void {
  markdownOnly = !markdownOnly;
}

/**
 * Load (or reload) a folder as the tree root. Lists the top level eagerly;
 * deeper levels stay lazy. Persists the path for the next session.
 */
export async function openFolderPath(path: string): Promise<void> {
  rootLoading = true;
  rootError = null;
  try {
    const entries = await deps.listDir(path);
    rootPath = path;
    rootNodes = toNodes(entries);
    persistRoot(path);
  } catch (err) {
    // Fail-closed: surface the error, leave any prior tree untouched.
    rootError = err instanceof Error ? err.message : String(err);
  } finally {
    rootLoading = false;
  }
}

/**
 * AC#1 — prompt for a folder via the dialog, then load it. No-op if the
 * user cancels.
 */
export async function pickAndOpenFolder(): Promise<void> {
  const chosen = await deps.pickFolder(rootPath ?? undefined);
  if (chosen === null) return;
  await openFolderPath(chosen);
}

/**
 * AC#3 — lazily load a directory's children the first time it is expanded.
 * Subsequent toggles only flip the `expanded` flag (no re-fetch).
 */
export async function toggleDir(path: string): Promise<void> {
  const node = findNode(path);
  if (!node || !node.isDir) return;

  if (node.expanded) {
    node.expanded = false;
    return;
  }

  node.expanded = true;
  if (node.children !== null) return; // already loaded

  node.loading = true;
  try {
    const entries = await deps.listDir(path);
    node.children = toNodes(entries);
  } catch {
    // Fail-closed: collapse again and leave children unloaded so the next
    // expand retries. (No global error banner for per-folder failures.)
    node.children = null;
    node.expanded = false;
  } finally {
    node.loading = false;
  }
}

/**
 * Expand-to-path (MDP-47): раскрывает все родительские каталоги от корня дерева
 * до `filePath`, лениво загружая детей сверху вниз. После раскрытия строка файла
 * становится достижимой в дереве; её подсветка/скролл — забота Sidebar по
 * активному документу.
 *
 * Fail-closed: нет открытого корня, файл вне корня (посегментно), либо нужный
 * каталог отсутствует в дереве (расхождение FS) → no-op без исключений.
 * Каталоги раскрываются строго последовательно (await), т.к. дети следующего
 * уровня появляются только после ленивой загрузки предыдущего.
 */
export async function revealPath(filePath: string): Promise<void> {
  if (rootPath === null) return;
  const ancestors = ancestorDirsToReveal(filePath, rootPath);
  for (const dir of ancestors) {
    const node = findNode(dir);
    if (!node || !node.isDir) return; // каталога нет в дереве — fail-closed
    // Раскрываем только если свёрнут: toggleDir на раскрытом — свернёт.
    if (!node.expanded) await toggleDir(dir);
  }
}

/**
 * On startup, restore the tree from the persisted folder if one exists.
 * Safe to call when nothing is stored (no-op).
 */
export async function restoreLastFolder(): Promise<void> {
  const saved = readPersistedFolder();
  if (saved === null) return;
  await openFolderPath(saved);
}
