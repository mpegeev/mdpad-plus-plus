import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * MDP-9 — integration of the "open a file from the tree" flow.
 *
 * Mocks the Tauri invoke boundary (`@tauri-apps/api/core`) so that the real
 * fs.ts wrapper (`listDir`, `readFile`) runs against fake command results,
 * then verifies the documents store opens / activates the right tab — the
 * exact behavior the Sidebar double-click handler relies on.
 *
 * localStorage polyfill mirrors documents.test.ts.
 */

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

function installLocalStoragePolyfill(): void {
  if (typeof window === "undefined") return;
  if (typeof window.localStorage !== "undefined") return;
  const store = new Map<string, string>();
  const polyfill: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => {
      store.delete(k);
    },
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
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

async function load() {
  vi.resetModules();
  const fs = await import("$lib/fs");
  const docs = await import("./documents.svelte");
  return { fs, docs };
}

beforeEach(() => {
  // Fake timers stop the documents store's debounced persist (100ms) from
  // firing across test boundaries and leaking state into the next reload.
  vi.useFakeTimers();
  vi.clearAllTimers();
  invoke.mockReset();
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("tree double-click → readFile → openFile", () => {
  it("reads the file via the Tauri boundary and opens it as the active tab", async () => {
    invoke.mockImplementation(async (cmd: string, args: { path: string }) => {
      if (cmd === "list_dir") {
        return [
          { name: "note.md", path: "/root/note.md", is_dir: false, size: 5 },
        ];
      }
      if (cmd === "read_file") {
        expect(args.path).toBe("/root/note.md");
        return "# hello";
      }
      throw new Error(`unexpected command ${cmd}`);
    });

    const { fs, docs } = await load();

    const entries = await fs.listDir("/root");
    expect(entries).toEqual([
      { name: "note.md", path: "/root/note.md", isDir: false, size: 5 },
    ]);

    const contents = await fs.readFile(entries[0].path);
    const id = docs.openFile(entries[0].path, contents);

    const active = docs.getActive();
    expect(active?.id).toBe(id);
    expect(active?.path).toBe("/root/note.md");
    expect(active?.name).toBe("note.md");
    expect(active?.buffer).toBe("# hello");
  });

  it("activates the existing tab instead of opening a duplicate", async () => {
    invoke.mockImplementation(async (cmd: string) => {
      if (cmd === "read_file") return "content";
      throw new Error(`unexpected command ${cmd}`);
    });

    const { fs, docs } = await load();

    const c1 = await fs.readFile("/root/a.md");
    const first = docs.openFile("/root/a.md", c1);
    // Open a different file so 'a.md' is no longer active.
    docs.openFile("/root/b.md", "b");
    expect(docs.getActiveId()).not.toBe(first);

    // Re-open a.md: should re-activate, not duplicate.
    const c2 = await fs.readFile("/root/a.md");
    const again = docs.openFile("/root/a.md", c2);

    expect(again).toBe(first);
    expect(docs.getActiveId()).toBe(first);
    expect(docs.getDocuments()).toHaveLength(2);
  });
});
