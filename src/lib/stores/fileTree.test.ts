import { describe, it, expect } from "vitest";
import type { DirEntry } from "$lib/fs";
import {
  extensionOf,
  passesFilter,
  filterEntries,
  sortEntries,
  computeWindow,
  MARKDOWN_EXTENSIONS,
} from "./fileTree";

/**
 * MDP-9 — pure file-tree helper tests (no Tauri, no DOM, no runes).
 * Covers AC#3 (virtualization window) and AC#4 (extension filter, sort).
 */

function file(name: string, path = `/root/${name}`): DirEntry {
  return { name, path, isDir: false, size: 0 };
}
function dir(name: string, path = `/root/${name}`): DirEntry {
  return { name, path, isDir: true, size: 0 };
}

describe("extensionOf", () => {
  it("returns lower-case extension with dot", () => {
    expect(extensionOf("notes.MD")).toBe(".md");
    expect(extensionOf("a.Markdown")).toBe(".markdown");
  });
  it("returns empty for no extension or dotfiles", () => {
    expect(extensionOf("README")).toBe("");
    expect(extensionOf(".gitignore")).toBe("");
  });
});

describe("passesFilter (AC#4)", () => {
  it("directories always pass regardless of filter", () => {
    expect(passesFilter(dir("src"), true)).toBe(true);
    expect(passesFilter(dir("src"), false)).toBe(true);
  });

  it("with filter off, every file passes", () => {
    expect(passesFilter(file("photo.png"), false)).toBe(true);
    expect(passesFilter(file("notes.md"), false)).toBe(true);
  });

  it("with filter on, only md/markdown/txt files pass", () => {
    expect(passesFilter(file("notes.md"), true)).toBe(true);
    expect(passesFilter(file("doc.markdown"), true)).toBe(true);
    expect(passesFilter(file("log.txt"), true)).toBe(true);
    expect(passesFilter(file("photo.png"), true)).toBe(false);
    expect(passesFilter(file("script.js"), true)).toBe(false);
    expect(passesFilter(file("README"), true)).toBe(false);
  });

  it("filterEntries keeps dirs + relevant files, drops the rest", () => {
    const entries = [
      dir("docs"),
      file("a.md"),
      file("b.png"),
      file("c.txt"),
      file("d.rs"),
    ];
    const kept = filterEntries(entries, true).map((e) => e.name);
    expect(kept).toEqual(["docs", "a.md", "c.txt"]);
  });

  it("MARKDOWN_EXTENSIONS is the documented set", () => {
    expect([...MARKDOWN_EXTENSIONS]).toEqual([".md", ".markdown", ".txt"]);
  });
});

describe("sortEntries (AC#4 — folders first, then by name)", () => {
  it("places all folders before all files", () => {
    const sorted = sortEntries([
      file("zeta.md"),
      dir("beta"),
      file("alpha.md"),
      dir("alpha"),
    ]);
    expect(sorted.map((e) => `${e.isDir ? "D" : "F"}:${e.name}`)).toEqual([
      "D:alpha",
      "D:beta",
      "F:alpha.md",
      "F:zeta.md",
    ]);
  });

  it("sorts case-insensitively within a group", () => {
    const sorted = sortEntries([file("Banana.md"), file("apple.md")]);
    expect(sorted.map((e) => e.name)).toEqual(["apple.md", "Banana.md"]);
  });

  it("does not mutate the input array", () => {
    const input = [file("b.md"), file("a.md")];
    const copy = [...input];
    sortEntries(input);
    expect(input).toEqual(copy);
  });
});

describe("computeWindow (AC#3 — virtualization)", () => {
  it("returns an empty window for zero rows", () => {
    expect(computeWindow(0, 24, 0, 400)).toEqual({
      start: 0,
      end: 0,
      totalHeight: 0,
      offsetY: 0,
    });
  });

  it("computes total height from row count × row height", () => {
    const w = computeWindow(100, 24, 0, 240, 0);
    expect(w.totalHeight).toBe(2400);
  });

  it("at scrollTop 0 renders only the viewport rows + overscan", () => {
    // 240px viewport / 24px row = 10 visible; +5 overscan below = 15.
    const w = computeWindow(5000, 24, 0, 240, 5);
    expect(w.start).toBe(0);
    expect(w.end).toBe(15);
    expect(w.offsetY).toBe(0);
  });

  it("windows a slice in the middle and sets offsetY", () => {
    // scrollTop 2400 → first visible row = 100. overscan 5.
    const w = computeWindow(5000, 24, 2400, 240, 5);
    expect(w.start).toBe(95);
    expect(w.end).toBe(115);
    expect(w.offsetY).toBe(95 * 24);
  });

  it("bounds the rendered count for 5000 rows (performance)", () => {
    const w = computeWindow(5000, 24, 1200, 240, 8);
    const rendered = w.end - w.start;
    // viewport rows (10) + 2×overscan (16) = 26, never the full 5000.
    expect(rendered).toBeLessThanOrEqual(26);
    expect(rendered).toBeGreaterThan(0);
  });

  it("clamps the end to the total row count near the bottom", () => {
    const w = computeWindow(20, 24, 100000, 240, 5);
    expect(w.end).toBe(20);
    expect(w.start).toBeLessThanOrEqual(20);
  });

  it("treats a non-positive row height defensively", () => {
    const w = computeWindow(10, 0, 0, 100);
    expect(Number.isFinite(w.totalHeight)).toBe(true);
    expect(w.end).toBeGreaterThanOrEqual(0);
  });
});
