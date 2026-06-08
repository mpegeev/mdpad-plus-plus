import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import TabsBar from "./TabsBar.svelte";
import * as docs from "$lib/stores/documents.svelte";

/**
 * MDP-19 — TabsBar interaction tests.
 *
 * The documents store is a real singleton (pure front-end state, no external
 * boundary). We drive it through its public API and assert the bar wires
 * user interactions to it.
 *
 * Out of scope here: native drag-and-drop choreography (jsdom does not run a
 * real DnD pipeline). The deterministic reorder math is unit-tested directly
 * against `moveTab` in documents.test.ts; this file covers the wiring that
 * *is* observable in jsdom (auxclick close, context-menu → store calls,
 * tooltip, "+" button).
 */

const noop = () => {};

function resetStore(): void {
  for (const d of [...docs.getDocuments()]) {
    docs.closeTab(d.id);
  }
}

function renderBar(props: Record<string, unknown> = {}) {
  return render(TabsBar, {
    props: { sidebarCollapsed: false, onToggleSidebar: noop, ...props },
  });
}

function tabEls(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(".tab"));
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  resetStore();
});

describe("TabsBar — new tab button (AC#5)", () => {
  it("creates a new untitled document on click", async () => {
    const { container } = renderBar();
    await tick();
    const btn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="New tab"]',
    );
    expect(btn).not.toBeNull();
    expect(docs.getDocuments()).toHaveLength(0);
    await fireEvent.click(btn!);
    await tick();
    expect(docs.getDocuments()).toHaveLength(1);
    expect(docs.getActive()?.name).toBe("Untitled-1");
  });
});

describe("TabsBar — full-path tooltip (AC#4)", () => {
  it("uses the absolute path as the tab title when saved", async () => {
    docs.openFile("C:/notes/deep/file.md", "x");
    const { container } = renderBar();
    await tick();
    expect(tabEls(container)[0].getAttribute("title")).toBe(
      "C:/notes/deep/file.md",
    );
  });

  it("falls back to the name for an untitled document", async () => {
    docs.createUntitled();
    const { container } = renderBar();
    await tick();
    expect(tabEls(container)[0].getAttribute("title")).toBe("Untitled-1");
  });
});

describe("TabsBar — middle-click close (AC#2)", () => {
  it("closes the tab on auxclick with the middle button", async () => {
    const a = docs.openFile("/a.md", "a");
    docs.openFile("/b.md", "b");
    const { container } = renderBar();
    await tick();
    const firstTab = tabEls(container)[0];
    await fireEvent(
      firstTab,
      new MouseEvent("auxclick", { button: 1, bubbles: true }),
    );
    await tick();
    expect(docs.getDocuments().some((d) => d.id === a)).toBe(false);
    expect(docs.getDocuments()).toHaveLength(1);
  });

  it("does not close on auxclick with a non-middle button", async () => {
    docs.openFile("/a.md", "a");
    const { container } = renderBar();
    await tick();
    const firstTab = tabEls(container)[0];
    await fireEvent(
      firstTab,
      new MouseEvent("auxclick", { button: 2, bubbles: true }),
    );
    await tick();
    expect(docs.getDocuments()).toHaveLength(1);
  });
});

describe("TabsBar — context menu (AC#3)", () => {
  async function openMenu(container: HTMLElement, index = 0): Promise<void> {
    const tab = tabEls(container)[index];
    await fireEvent(
      tab,
      new MouseEvent("contextmenu", {
        button: 2,
        bubbles: true,
        clientX: 10,
        clientY: 10,
      }),
    );
    await tick();
  }

  function menuItem(label: string): HTMLButtonElement {
    const items = Array.from(
      document.querySelectorAll<HTMLButtonElement>(".context-menu__item"),
    );
    const found = items.find((el) => el.textContent?.trim() === label);
    expect(found, `menu item "${label}"`).toBeTruthy();
    return found!;
  }

  it("opens on right-click and lists all five actions", async () => {
    docs.openFile("/a.md", "a");
    docs.openFile("/b.md", "b");
    const { container } = renderBar();
    await tick();
    await openMenu(container);
    const labels = Array.from(
      document.querySelectorAll<HTMLElement>(".context-menu__item"),
    ).map((el) => el.textContent?.trim());
    expect(labels).toEqual([
      "Закрыть",
      "Закрыть другие",
      "Закрыть все",
      "Копировать путь",
      "Показать в боковой панели",
    ]);
  });

  it("Close closes the targeted tab", async () => {
    const a = docs.openFile("/a.md", "a");
    docs.openFile("/b.md", "b");
    const { container } = renderBar();
    await tick();
    await openMenu(container, 0);
    await fireEvent.click(menuItem("Закрыть"));
    await tick();
    expect(docs.getDocuments().some((d) => d.id === a)).toBe(false);
  });

  it("Close Others keeps only the targeted tab", async () => {
    docs.openFile("/a.md", "a");
    const b = docs.openFile("/b.md", "b");
    docs.openFile("/c.md", "c");
    const { container } = renderBar();
    await tick();
    await openMenu(container, 1); // target b
    await fireEvent.click(menuItem("Закрыть другие"));
    await tick();
    expect(docs.getDocuments().map((d) => d.id)).toEqual([b]);
  });

  it("Close All removes every tab", async () => {
    docs.openFile("/a.md", "a");
    docs.openFile("/b.md", "b");
    const { container } = renderBar();
    await tick();
    await openMenu(container);
    await fireEvent.click(menuItem("Закрыть все"));
    await tick();
    expect(docs.getDocuments()).toHaveLength(0);
  });

  it("Copy Path is disabled for an untitled document", async () => {
    docs.createUntitled();
    const { container } = renderBar();
    await tick();
    await openMenu(container);
    expect(menuItem("Копировать путь").disabled).toBe(true);
  });

  it("Copy Path writes the absolute path to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    docs.openFile("C:/notes/x.md", "x");
    const { container } = renderBar();
    await tick();
    await openMenu(container);
    await fireEvent.click(menuItem("Копировать путь"));
    await tick();
    expect(writeText).toHaveBeenCalledWith("C:/notes/x.md");
    vi.unstubAllGlobals();
  });

  it("Reveal in Sidebar invokes the callback with the tab id", async () => {
    const id = docs.openFile("/a.md", "a");
    const onRevealInSidebar = vi.fn();
    const { container } = renderBar({ onRevealInSidebar });
    await tick();
    await openMenu(container);
    await fireEvent.click(menuItem("Показать в боковой панели"));
    await tick();
    expect(onRevealInSidebar).toHaveBeenCalledWith(id);
  });

  it("closes the menu on Escape", async () => {
    docs.openFile("/a.md", "a");
    const { container } = renderBar();
    await tick();
    await openMenu(container);
    expect(document.querySelector(".context-menu")).not.toBeNull();
    await fireEvent.keyDown(window, { key: "Escape" });
    await tick();
    expect(document.querySelector(".context-menu")).toBeNull();
  });

  it("closes the menu on a pointerdown outside it (UI-8)", async () => {
    docs.openFile("/a.md", "a");
    const { container } = renderBar();
    await tick();
    await openMenu(container);
    expect(document.querySelector(".context-menu")).not.toBeNull();
    // Pointer down on the document body (outside the portal'd menu) dismisses.
    // jsdom lacks `PointerEvent`; a bubbling Event of the same type reaches the
    // same `svelte:window` onpointerdown listener the component registers.
    await fireEvent(document.body, new Event("pointerdown", { bubbles: true }));
    await tick();
    expect(document.querySelector(".context-menu")).toBeNull();
  });

  it("keeps the menu open on a pointerdown inside it (UI-8)", async () => {
    docs.openFile("/a.md", "a");
    const { container } = renderBar();
    await tick();
    await openMenu(container);
    const menuEl = document.querySelector<HTMLElement>(".context-menu");
    expect(menuEl).not.toBeNull();
    await fireEvent(menuEl!, new Event("pointerdown", { bubbles: true }));
    await tick();
    // A click inside the menu must not dismiss it (only item selection does).
    expect(document.querySelector(".context-menu")).not.toBeNull();
  });

  it("closes the menu on window scroll (UI-8)", async () => {
    docs.openFile("/a.md", "a");
    const { container } = renderBar();
    await tick();
    await openMenu(container);
    expect(document.querySelector(".context-menu")).not.toBeNull();
    await fireEvent.scroll(window);
    await tick();
    expect(document.querySelector(".context-menu")).toBeNull();
  });

  it("closes the menu on window resize (UI-8)", async () => {
    docs.openFile("/a.md", "a");
    const { container } = renderBar();
    await tick();
    await openMenu(container);
    expect(document.querySelector(".context-menu")).not.toBeNull();
    await fireEvent(window, new Event("resize"));
    await tick();
    expect(document.querySelector(".context-menu")).toBeNull();
  });
});
