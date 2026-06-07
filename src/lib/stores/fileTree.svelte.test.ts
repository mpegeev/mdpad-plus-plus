import { describe, it, expect, beforeEach, vi } from "vitest";
import type { DirEntry } from "$lib/fs";

/**
 * MDP-9 — file-tree store tests.
 *
 * The store injects its filesystem boundary (pickFolder / listDir) via
 * `__setDeps`, so these tests pass stubs instead of mocking Tauri globally.
 * Covers AC#1 (pick→open), AC#3 (lazy expand), AC#4 (filter on flatten)
 * and AC#6 (persist + restore last folder).
 *
 * localStorage polyfill mirrors documents.test.ts (jsdom under Node 26
 * does not expose localStorage).
 */

type StoreModule = typeof import("./fileTree.svelte");

const STORAGE_KEY = "mdpad-last-folder-v1";

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

async function loadStore(): Promise<StoreModule> {
  vi.resetModules();
  return await import("./fileTree.svelte");
}

function file(name: string, parent = "/root"): DirEntry {
  return { name, path: `${parent}/${name}`, isDir: false, size: 1 };
}
function dir(name: string, parent = "/root"): DirEntry {
  return { name, path: `${parent}/${name}`, isDir: true, size: 0 };
}

beforeEach(() => {
  localStorage.clear();
});

describe("openFolderPath + getFlatNodes (AC#2, AC#4 sort)", () => {
  it("lists the root and flattens sorted entries (folders first)", async () => {
    const s = await loadStore();
    const listDir = vi.fn(async () => [file("z.md"), dir("src"), file("a.md")]);
    s.__setDeps({ pickFolder: vi.fn(), listDir });

    await s.openFolderPath("/root");

    expect(listDir).toHaveBeenCalledWith("/root");
    expect(s.getRootPath()).toBe("/root");
    expect(s.getFlatNodes().map((n) => n.name)).toEqual([
      "src",
      "a.md",
      "z.md",
    ]);
    expect(s.getFlatNodes().every((n) => n.depth === 0)).toBe(true);
  });
});

describe("toggleMarkdownOnly (AC#4 filter)", () => {
  it("hides non-md files but keeps directories", async () => {
    const s = await loadStore();
    s.__setDeps({
      pickFolder: vi.fn(),
      listDir: vi.fn(async () => [dir("docs"), file("a.md"), file("b.png")]),
    });
    await s.openFolderPath("/root");
    expect(s.getFlatNodes().map((n) => n.name)).toEqual([
      "docs",
      "a.md",
      "b.png",
    ]);

    s.toggleMarkdownOnly();
    expect(s.isMarkdownOnly()).toBe(true);
    expect(s.getFlatNodes().map((n) => n.name)).toEqual(["docs", "a.md"]);
  });
});

describe("toggleDir (AC#3 lazy expand)", () => {
  it("loads children only on first expand and reuses them after", async () => {
    const s = await loadStore();
    const listDir = vi.fn(async (path: string) => {
      if (path === "/root") return [dir("sub")];
      if (path === "/root/sub") return [file("inner.md", "/root/sub")];
      return [];
    });
    s.__setDeps({ pickFolder: vi.fn(), listDir });

    await s.openFolderPath("/root");
    expect(listDir).toHaveBeenCalledTimes(1);
    // Collapsed: only the folder row is visible.
    expect(s.getFlatNodes().map((n) => n.name)).toEqual(["sub"]);

    await s.toggleDir("/root/sub"); // expand → fetch
    expect(listDir).toHaveBeenCalledTimes(2);
    expect(s.getFlatNodes().map((n) => n.name)).toEqual(["sub", "inner.md"]);
    expect(s.getFlatNodes()[1].depth).toBe(1);

    await s.toggleDir("/root/sub"); // collapse → no fetch
    await s.toggleDir("/root/sub"); // expand again → no re-fetch
    expect(listDir).toHaveBeenCalledTimes(2);
    expect(s.getFlatNodes().map((n) => n.name)).toEqual(["sub", "inner.md"]);
  });
});

describe("persistence + restore (AC#6)", () => {
  it("persists the opened folder under the documented key", async () => {
    const s = await loadStore();
    s.__setDeps({
      pickFolder: vi.fn(),
      listDir: vi.fn(async () => [file("a.md")]),
    });
    await s.openFolderPath("/notes");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("/notes");
  });

  it("restoreLastFolder rebuilds the root from the persisted path", async () => {
    localStorage.setItem(STORAGE_KEY, "/saved");
    const s = await loadStore();
    const listDir = vi.fn(async () => [file("x.md", "/saved")]);
    s.__setDeps({ pickFolder: vi.fn(), listDir });

    await s.restoreLastFolder();

    expect(listDir).toHaveBeenCalledWith("/saved");
    expect(s.getRootPath()).toBe("/saved");
    expect(s.getFlatNodes().map((n) => n.name)).toEqual(["x.md"]);
  });

  it("restoreLastFolder is a no-op when nothing is persisted", async () => {
    const s = await loadStore();
    const listDir = vi.fn();
    s.__setDeps({ pickFolder: vi.fn(), listDir });
    await s.restoreLastFolder();
    expect(listDir).not.toHaveBeenCalled();
    expect(s.getRootPath()).toBeNull();
  });
});

describe("pickAndOpenFolder (AC#1)", () => {
  it("calls pickFolder then loads the chosen path", async () => {
    const s = await loadStore();
    const pickFolder = vi.fn(async () => "/chosen");
    const listDir = vi.fn(async () => [file("a.md", "/chosen")]);
    s.__setDeps({ pickFolder, listDir });

    await s.pickAndOpenFolder();

    expect(pickFolder).toHaveBeenCalledTimes(1);
    expect(listDir).toHaveBeenCalledWith("/chosen");
    expect(s.getRootPath()).toBe("/chosen");
  });

  it("does nothing when the dialog is cancelled", async () => {
    const s = await loadStore();
    const pickFolder = vi.fn(async () => null);
    const listDir = vi.fn();
    s.__setDeps({ pickFolder, listDir });

    await s.pickAndOpenFolder();

    expect(listDir).not.toHaveBeenCalled();
    expect(s.getRootPath()).toBeNull();
  });
});

describe("error handling (fail-closed)", () => {
  it("surfaces a root listing error without crashing", async () => {
    const s = await loadStore();
    s.__setDeps({
      pickFolder: vi.fn(),
      listDir: vi.fn(async () => {
        throw new Error("EACCES");
      }),
    });
    await s.openFolderPath("/locked");
    expect(s.getRootError()).toContain("EACCES");
    expect(s.getRootPath()).toBeNull();
  });
});
