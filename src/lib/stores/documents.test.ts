import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

/**
 * MDP-8 — documents store unit tests.
 *
 * Each test re-imports the store via `vi.resetModules()` so the
 * module-level `$state` arrays are recreated and the tests stay
 * independent (the store is a singleton in production but a
 * per-test fixture here).
 *
 * Test-env note: Node 26 disables the experimental built-in
 * `localStorage` (warns `--localstorage-file was not provided`)
 * AND jsdom 25 declines to expose its own when running under
 * Node 26 — the result is `window.localStorage === undefined`
 * in jsdom even though `sessionStorage` is present. To keep the
 * store under test we install a tiny in-memory polyfill below.
 * Production (browser, Tauri webview) is unaffected.
 */

type StoreModule = typeof import("./documents.svelte");

const STORAGE_KEY = "mdpad-session-v1";

function installLocalStoragePolyfill(): void {
  if (typeof window === "undefined") return;
  if (typeof window.localStorage !== "undefined") return;
  const store = new Map<string, string>();
  const polyfill: Storage = {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key: string) =>
      store.has(key) ? (store.get(key) as string) : null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, "localStorage", {
    value: polyfill,
    configurable: true,
    writable: false,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: polyfill,
    configurable: true,
    writable: false,
  });
}

installLocalStoragePolyfill();

async function loadStore(): Promise<StoreModule> {
  vi.resetModules();
  return await import("./documents.svelte");
}

beforeEach(() => {
  // Pending debounced persist timers from the previous test's module
  // instance would otherwise fire mid-init and clobber the new
  // (empty) storage. Cancel them, then wipe storage clean.
  vi.useFakeTimers();
  vi.clearAllTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("openFile", () => {
  it("creates a new document with path, name, baseline and buffer", async () => {
    const s = await loadStore();
    const id = s.openFile("C:/notes/a.md", "hello");
    const docs = s.getDocuments();
    expect(docs).toHaveLength(1);
    expect(docs[0].id).toBe(id);
    expect(docs[0].path).toBe("C:/notes/a.md");
    expect(docs[0].name).toBe("a.md");
    expect(docs[0].baseline).toBe("hello");
    expect(docs[0].buffer).toBe("hello");
    expect(docs[0].mode).toBe("rendered");
    expect(s.getActiveId()).toBe(id);
  });

  it("returns the existing id and activates it when path already open", async () => {
    const s = await loadStore();
    const first = s.openFile("C:/notes/a.md", "hello");
    const otherId = s.openFile("C:/notes/b.md", "other"); // active becomes b
    expect(s.getActiveId()).toBe(otherId);
    const second = s.openFile("C:/notes/a.md", "different content");
    expect(second).toBe(first);
    expect(s.getDocuments()).toHaveLength(2);
    expect(s.getActiveId()).toBe(first);
    // Existing baseline/buffer are NOT overwritten on re-open.
    const a = s.getDocuments().find((d) => d.id === first);
    expect(a?.baseline).toBe("hello");
    expect(a?.buffer).toBe("hello");
  });
});

describe("createUntitled", () => {
  it("assigns sequential 'Untitled-N' names with unique ids", async () => {
    const s = await loadStore();
    const a = s.createUntitled();
    const b = s.createUntitled();
    const c = s.createUntitled();
    const names = s.getDocuments().map((d) => d.name);
    expect(names).toEqual(["Untitled-1", "Untitled-2", "Untitled-3"]);
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it("fills gaps: closing Untitled-1 lets the next createUntitled re-use 1", async () => {
    // Documented choice: smallest-unused-N. See `nextUntitledNumber` in
    // documents.svelte.ts (rationale: Linear MDP-8).
    const s = await loadStore();
    const a = s.createUntitled();
    s.createUntitled(); // Untitled-2
    s.closeTab(a); // removes Untitled-1
    const c = s.createUntitled();
    const fresh = s.getDocuments().find((d) => d.id === c);
    expect(fresh?.name).toBe("Untitled-1");
  });

  it("makes the newly-created untitled the active document", async () => {
    const s = await loadStore();
    s.openFile("/x.md", "x");
    const u = s.createUntitled();
    expect(s.getActiveId()).toBe(u);
  });
});

describe("closeTab", () => {
  it("removes a non-active tab without touching active", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    const b = s.openFile("/b.md", "b"); // active = b
    s.closeTab(a);
    expect(s.getDocuments().map((d) => d.id)).toEqual([b]);
    expect(s.getActiveId()).toBe(b);
  });

  it("activates the next tab when closing the active one", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    const b = s.openFile("/b.md", "b");
    const c = s.openFile("/c.md", "c");
    s.setActive(b);
    s.closeTab(b); // active was b → next at the same index is c
    expect(s.getActiveId()).toBe(c);
    expect(s.getDocuments().map((d) => d.id)).toEqual([a, c]);
  });

  it("activates the previous tab when closing the last one", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    const b = s.openFile("/b.md", "b"); // active = b (last)
    s.closeTab(b);
    expect(s.getActiveId()).toBe(a);
  });

  it("clears active to null when the last tab is closed", async () => {
    const s = await loadStore();
    const a = s.createUntitled();
    s.closeTab(a);
    expect(s.getDocuments()).toHaveLength(0);
    expect(s.getActiveId()).toBeNull();
    expect(s.getActive()).toBeNull();
  });

  it("is a no-op for an unknown id", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.closeTab("does-not-exist");
    expect(s.getDocuments().map((d) => d.id)).toEqual([a]);
    expect(s.getActiveId()).toBe(a);
  });
});

describe("dirty tracking", () => {
  it("updateBuffer marks the document dirty; markSaved clears it", async () => {
    const s = await loadStore();
    const id = s.openFile("/a.md", "hello");
    expect(s.isDirty(id)).toBe(false);
    s.updateBuffer(id, "hello world");
    expect(s.isDirty(id)).toBe(true);
    s.markSaved(id);
    expect(s.isDirty(id)).toBe(false);
    const doc = s.getDocuments().find((d) => d.id === id);
    expect(doc?.baseline).toBe("hello world");
    expect(doc?.buffer).toBe("hello world");
  });

  it("isDirty returns false for an unknown id", async () => {
    const s = await loadStore();
    expect(s.isDirty("missing")).toBe(false);
  });

  it("updateBuffer with the same content as baseline keeps the doc clean", async () => {
    const s = await loadStore();
    const id = s.openFile("/a.md", "x");
    s.updateBuffer(id, "x");
    expect(s.isDirty(id)).toBe(false);
  });
});

describe("setActive", () => {
  it("switches the active document", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.openFile("/b.md", "b"); // active = b after this call
    s.setActive(a);
    expect(s.getActiveId()).toBe(a);
    expect(s.getActive()?.id).toBe(a);
  });

  it("is a no-op for an unknown id", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.setActive("nope");
    expect(s.getActiveId()).toBe(a);
  });
});

describe("markSaved with path", () => {
  it("updates path and derived name when a new path is provided", async () => {
    const s = await loadStore();
    const id = s.createUntitled();
    s.updateBuffer(id, "fresh content");
    s.markSaved(id, "C:/work/notes/draft.md");
    const doc = s.getDocuments().find((d) => d.id === id);
    expect(doc?.path).toBe("C:/work/notes/draft.md");
    expect(doc?.name).toBe("draft.md");
    expect(doc?.baseline).toBe("fresh content");
    expect(s.isDirty(id)).toBe(false);
  });

  it("handles forward-slash paths", async () => {
    const s = await loadStore();
    const id = s.createUntitled();
    s.markSaved(id, "/home/user/file.md");
    const doc = s.getDocuments().find((d) => d.id === id);
    expect(doc?.name).toBe("file.md");
  });

  it("is a no-op for an unknown id", async () => {
    const s = await loadStore();
    s.markSaved("missing", "/anywhere.md");
    expect(s.getDocuments()).toHaveLength(0);
  });
});

describe("setMode", () => {
  it("updates the editor mode", async () => {
    const s = await loadStore();
    const id = s.openFile("/a.md", "a");
    s.setMode(id, "raw");
    expect(s.getDocuments().find((d) => d.id === id)?.mode).toBe("raw");
    s.setMode(id, "mixed");
    expect(s.getDocuments().find((d) => d.id === id)?.mode).toBe("mixed");
  });

  it("is a no-op for an unknown id", async () => {
    const s = await loadStore();
    s.setMode("missing", "raw");
    expect(s.getDocuments()).toHaveLength(0);
  });
});

describe("setWrap (line wrap, MDP-10)", () => {
  it("openFile creates a document with wrap defaulting to false", async () => {
    const s = await loadStore();
    const id = s.openFile("/a.md", "a");
    expect(s.getDocuments().find((d) => d.id === id)?.wrap).toBe(false);
  });

  it("createUntitled creates a document with wrap defaulting to false", async () => {
    const s = await loadStore();
    const id = s.createUntitled();
    expect(s.getDocuments().find((d) => d.id === id)?.wrap).toBe(false);
  });

  it("setWrap toggles the per-document wrap flag", async () => {
    const s = await loadStore();
    const id = s.openFile("/a.md", "a");
    s.setWrap(id, true);
    expect(s.getDocuments().find((d) => d.id === id)?.wrap).toBe(true);
    s.setWrap(id, false);
    expect(s.getDocuments().find((d) => d.id === id)?.wrap).toBe(false);
  });

  it("setWrap is per-document — does not affect other docs", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    const b = s.openFile("/b.md", "b");
    s.setWrap(a, true);
    expect(s.getDocuments().find((d) => d.id === a)?.wrap).toBe(true);
    expect(s.getDocuments().find((d) => d.id === b)?.wrap).toBe(false);
  });

  it("is a no-op for an unknown id", async () => {
    const s = await loadStore();
    s.setWrap("missing", true);
    expect(s.getDocuments()).toHaveLength(0);
  });
});

describe("localStorage persistence", () => {
  it("round-trips state across a module reload", async () => {
    const s1 = await loadStore();
    s1.openFile("/persistent.md", "saved content");
    const untitledId = s1.createUntitled();
    s1.updateBuffer(untitledId, "in progress");
    s1.setMode(untitledId, "raw");
    // Force the debounce timer to fire so the persist happens before reload.
    vi.advanceTimersByTime(150);

    // Reload the module: in production this simulates a page refresh.
    const s2 = await loadStore();
    const docs = s2.getDocuments();
    expect(docs).toHaveLength(2);
    expect(docs[0].path).toBe("/persistent.md");
    expect(docs[0].baseline).toBe("saved content");
    expect(docs[1].name).toBe("Untitled-1");
    expect(docs[1].buffer).toBe("in progress");
    expect(docs[1].mode).toBe("raw");
    expect(s2.getActiveId()).toBe(untitledId);
    expect(s2.isDirty(untitledId)).toBe(true);
  });

  it("round-trips the wrap flag across a module reload", async () => {
    const s1 = await loadStore();
    const id = s1.openFile("/wrap.md", "x");
    s1.setWrap(id, true);
    vi.advanceTimersByTime(150);

    const s2 = await loadStore();
    const doc = s2.getDocuments().find((d) => d.path === "/wrap.md");
    expect(doc?.wrap).toBe(true);
  });

  it("loads legacy records without `wrap`, defaulting it to false", async () => {
    // Pre-MDP-10 persisted shape: documents have no `wrap` field at all.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 1,
        documents: [
          {
            id: "legacy-id",
            path: "/legacy.md",
            name: "legacy.md",
            baseline: "x",
            buffer: "x",
            mode: "rendered",
          },
        ],
        activeId: "legacy-id",
      }),
    );
    const s = await loadStore();
    const doc = s.getDocuments().find((d) => d.id === "legacy-id");
    expect(doc).toBeDefined();
    expect(doc?.wrap).toBe(false);
  });

  it("falls back to empty state when storage contains corrupted JSON", async () => {
    localStorage.setItem(STORAGE_KEY, "{ this is not json");
    const s = await loadStore();
    expect(s.getDocuments()).toEqual([]);
    expect(s.getActiveId()).toBeNull();
  });

  it("falls back to empty state when storage contains JSON of the wrong shape", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 999, foo: "bar" }));
    const s = await loadStore();
    expect(s.getDocuments()).toEqual([]);
    expect(s.getActiveId()).toBeNull();
  });

  it("repairs a persisted activeId that no longer references a present doc", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 1,
        documents: [
          {
            id: "real-id",
            path: "/a.md",
            name: "a.md",
            baseline: "x",
            buffer: "x",
            mode: "rendered",
          },
        ],
        activeId: "ghost-id",
      }),
    );
    const s = await loadStore();
    expect(s.getActiveId()).toBe("real-id");
  });

  it("debounces saves: the timer fires within ~100 ms", async () => {
    vi.useFakeTimers();
    const s = await loadStore();
    s.openFile("/a.md", "a");
    // Before the debounce window elapses, storage is empty.
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    vi.advanceTimersByTime(150);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.v).toBe(1);
    expect(parsed.documents).toHaveLength(1);
  });
});
