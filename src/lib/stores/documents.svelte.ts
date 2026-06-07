/**
 * Document store (MDP-8).
 *
 * Reactive, runes-based store managing open Markdown documents:
 * paths, baseline contents, edit buffers, dirty flags and the
 * active tab pointer.
 *
 * No filesystem I/O — those concerns live in the Tauri-backed
 * commands introduced by MDP-7. This module is a pure
 * front-end state container.
 *
 * NOTE: filename is `documents.svelte.ts` (not the plain
 * `documents.ts` mentioned in the original MDP-8 spec) because
 * Svelte 5 runes (`$state`, `$derived`) are only compiled by
 * `vite-plugin-svelte` in files matching `*.svelte.[jt]s`.
 * Using a plain `.ts` extension would make `$state` a runtime
 * `ReferenceError`. See `tasks/MDP-8.md` § Решения.
 *
 * TODO(MDP-21): replace `localStorage` persistence with a
 * proper Tauri-backed session store via the FS commands from
 * MDP-7. localStorage is a stub for the bootstrap stage so
 * tabs survive a dev-server refresh.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocumentId = string;

export type DocumentMode = "rendered" | "mixed" | "raw";

export interface MDDocument {
  id: DocumentId;
  /** Absolute filesystem path, or `null` for an unsaved untitled doc. */
  path: string | null;
  /** Display name — file name or `"Untitled-N"`. */
  name: string;
  /** Content as last saved (or empty string for new untitled). */
  baseline: string;
  /** Current edit buffer. `baseline !== buffer` ⇒ dirty. */
  buffer: string;
  /** Editor mode (placeholder for MDP-15; defaults to `"rendered"`). */
  mode: DocumentMode;
  /** Line-wrap toggle (MDP-10). Per-document; defaults to `false`. */
  wrap: boolean;
}

interface PersistedShape {
  v: 1;
  documents: MDDocument[];
  activeId: DocumentId | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "mdpad-session-v1";
const PERSIST_DEBOUNCE_MS = 100;

// ---------------------------------------------------------------------------
// Internal state (Svelte 5 runes)
// ---------------------------------------------------------------------------

// `$state` arrays/objects are deeply reactive — mutations from the exported
// functions trigger updates in any `.svelte` file that reads them.
const documents = $state<MDDocument[]>([]);
let activeId = $state<DocumentId | null>(null);

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function getStorage(): Storage | null {
  // jsdom and browsers both expose `localStorage`; Tauri webview as well.
  // Wrapped so that access errors (privacy mode, SSR, etc.) fail-closed.
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function loadFromStorage(): void {
  const storage = getStorage();
  if (!storage) return;
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (raw === null || raw === "") return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupted JSON — fail-closed: leave state empty.
    return;
  }
  if (!isPersistedShape(parsed)) return;
  // Normalize: older persisted records (pre-MDP-10) have no `wrap` field.
  // `isMDDocument` accepts their absence; here we materialize the default so
  // the in-memory shape always satisfies `MDDocument`.
  const normalized = parsed.documents.map((d) => ({
    ...d,
    wrap: d.wrap === true,
  }));
  documents.splice(0, documents.length, ...normalized);
  activeId = parsed.activeId;
  // Ensure the persisted activeId still references a present document.
  if (activeId !== null && !documents.some((d) => d.id === activeId)) {
    activeId = documents[0]?.id ?? null;
  }
}

function isPersistedShape(value: unknown): value is PersistedShape {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.v !== 1) return false;
  if (!Array.isArray(v.documents)) return false;
  if (v.activeId !== null && typeof v.activeId !== "string") return false;
  return v.documents.every(isMDDocument);
}

function isMDDocument(value: unknown): value is MDDocument {
  if (typeof value !== "object" || value === null) return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    (d.path === null || typeof d.path === "string") &&
    typeof d.name === "string" &&
    typeof d.baseline === "string" &&
    typeof d.buffer === "string" &&
    (d.mode === "rendered" || d.mode === "mixed" || d.mode === "raw") &&
    // Backward compat (MDP-10): `wrap` may be absent in pre-MDP-10 records;
    // absence is valid (treated as false). When present it must be boolean.
    (d.wrap === undefined || typeof d.wrap === "boolean")
  );
}

function schedulePersist(): void {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(persistNow, PERSIST_DEBOUNCE_MS);
}

function persistNow(): void {
  persistTimer = null;
  const storage = getStorage();
  if (!storage) return;
  const payload: PersistedShape = {
    v: 1,
    // Spread into plain values to drop any internal reactive wrappers.
    documents: documents.map((d) => ({ ...d })),
    activeId,
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota, SecurityError, etc. — fail-closed; in-memory state is
    // still authoritative for the current session.
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findIndex(id: DocumentId): number {
  return documents.findIndex((d) => d.id === id);
}

function nextUntitledNumber(): number {
  // Choice: pick the smallest positive integer N for which no current
  // document is named "Untitled-N". Closing "Untitled-1" therefore
  // lets the next createUntitled re-use 1. Documented in MDP-8 spec §AC6.
  const used = new Set<number>();
  for (const d of documents) {
    const match = /^Untitled-(\d+)$/.exec(d.name);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > 0) used.add(n);
    }
  }
  for (let n = 1; ; n += 1) {
    if (!used.has(n)) return n;
  }
}

function makeId(): DocumentId {
  // Prefer crypto.randomUUID when available (browsers, Node ≥19, jsdom).
  // Fall back to a non-cryptographic but collision-resistant id otherwise.
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function basename(path: string): string {
  // Take the segment after the last `/` or `\`. Empty result falls back
  // to the original path so we never produce an empty display name.
  const cleaned = path.replace(/[\\/]+$/, "");
  const idx = Math.max(cleaned.lastIndexOf("/"), cleaned.lastIndexOf("\\"));
  const tail = idx === -1 ? cleaned : cleaned.slice(idx + 1);
  return tail === "" ? path : tail;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getDocuments(): readonly MDDocument[] {
  return documents;
}

export function getActiveId(): DocumentId | null {
  return activeId;
}

export function getActive(): MDDocument | null {
  if (activeId === null) return null;
  return documents.find((d) => d.id === activeId) ?? null;
}

export function isDirty(id: DocumentId): boolean {
  const doc = documents.find((d) => d.id === id);
  if (!doc) return false;
  return doc.baseline !== doc.buffer;
}

export function openFile(path: string, contents: string): DocumentId {
  const existing = documents.find((d) => d.path === path);
  if (existing) {
    activeId = existing.id;
    schedulePersist();
    return existing.id;
  }
  const doc: MDDocument = {
    id: makeId(),
    path,
    name: basename(path),
    baseline: contents,
    buffer: contents,
    mode: "rendered",
    wrap: false,
  };
  documents.push(doc);
  activeId = doc.id;
  schedulePersist();
  return doc.id;
}

export function createUntitled(): DocumentId {
  const n = nextUntitledNumber();
  const doc: MDDocument = {
    id: makeId(),
    path: null,
    name: `Untitled-${n}`,
    baseline: "",
    buffer: "",
    mode: "rendered",
    wrap: false,
  };
  documents.push(doc);
  activeId = doc.id;
  schedulePersist();
  return doc.id;
}

export function closeTab(id: DocumentId): void {
  const idx = findIndex(id);
  if (idx === -1) return;
  const wasActive = activeId === id;
  documents.splice(idx, 1);
  if (documents.length === 0) {
    activeId = null;
  } else if (wasActive) {
    // Activate the document that now sits at the same index (the "next" tab),
    // or the new last tab if we just removed the trailing one.
    const nextIdx = Math.min(idx, documents.length - 1);
    activeId = documents[nextIdx].id;
  }
  schedulePersist();
}

export function setActive(id: DocumentId): void {
  if (findIndex(id) === -1) return;
  activeId = id;
  schedulePersist();
}

export function updateBuffer(id: DocumentId, content: string): void {
  const doc = documents.find((d) => d.id === id);
  if (!doc) return;
  doc.buffer = content;
  schedulePersist();
}

export function markSaved(id: DocumentId, path?: string): void {
  const doc = documents.find((d) => d.id === id);
  if (!doc) return;
  doc.baseline = doc.buffer;
  if (path !== undefined) {
    doc.path = path;
    doc.name = basename(path);
  }
  schedulePersist();
}

export function setMode(id: DocumentId, mode: DocumentMode): void {
  const doc = documents.find((d) => d.id === id);
  if (!doc) return;
  doc.mode = mode;
  schedulePersist();
}

export function setWrap(id: DocumentId, wrap: boolean): void {
  const doc = documents.find((d) => d.id === id);
  if (!doc) return;
  doc.wrap = wrap;
  schedulePersist();
}

// ---------------------------------------------------------------------------
// Module init
// ---------------------------------------------------------------------------

loadFromStorage();
