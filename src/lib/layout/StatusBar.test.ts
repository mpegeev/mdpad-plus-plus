import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import StatusBar from "./StatusBar.svelte";
import * as docs from "$lib/stores/documents.svelte";

/**
 * MDP-10 — StatusBar wrap-toggle tests.
 *
 * The documents store is a real singleton (a pure front-end state container,
 * no external boundaries to mock). We drive it through its public API and
 * assert the StatusBar's wrap button reflects and mutates that state.
 *
 * Each test starts from a clean store by closing any open tabs.
 */

function resetStore(): void {
  for (const d of [...docs.getDocuments()]) {
    docs.closeTab(d.id);
  }
}

function wrapButton(container: HTMLElement): HTMLButtonElement {
  const btn = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Toggle line wrap"]',
  );
  expect(btn).not.toBeNull();
  return btn!;
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  resetStore();
});

describe("StatusBar — line wrap toggle", () => {
  it("disabled when there is no active document", async () => {
    const { container } = render(StatusBar);
    await tick();
    const btn = wrapButton(container);
    expect(btn.disabled).toBe(true);
  });

  it("shows 'выкл' and aria-pressed=false when active doc has wrap off", async () => {
    docs.openFile("/a.md", "a"); // wrap defaults to false
    const { container } = render(StatusBar);
    await tick();
    const btn = wrapButton(container);
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(btn.textContent).toContain("выкл");
  });

  it("shows 'вкл' and aria-pressed=true when active doc has wrap on", async () => {
    const id = docs.openFile("/a.md", "a");
    docs.setWrap(id, true);
    const { container } = render(StatusBar);
    await tick();
    const btn = wrapButton(container);
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.textContent).toContain("вкл");
  });

  it("click toggles the active document's wrap in the store", async () => {
    const id = docs.openFile("/a.md", "a");
    expect(docs.getActive()?.wrap).toBe(false);

    const { container } = render(StatusBar);
    await tick();
    const btn = wrapButton(container);

    await fireEvent.click(btn);
    await tick();
    expect(docs.getActive()?.wrap).toBe(true);
    expect(btn.getAttribute("aria-pressed")).toBe("true");

    await fireEvent.click(btn);
    await tick();
    expect(docs.getDocuments().find((d) => d.id === id)?.wrap).toBe(false);
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });
});

/**
 * MDP-15 — StatusBar render-mode toggle.
 *
 * The button cycles the active document's mode rendered → mixed → raw →
 * rendered. Three icons are present (eye/panel-top/code) with the active one
 * highlighted via `aria-current`.
 */

function modeButton(container: HTMLElement): HTMLButtonElement {
  const btn = container.querySelector<HTMLButtonElement>(
    "button.status-seg--mode",
  );
  expect(btn).not.toBeNull();
  return btn!;
}

function activeModeIndicator(container: HTMLElement): string | null {
  const el = container.querySelector<HTMLElement>(
    ".mode-ind[aria-current='true']",
  );
  return el?.getAttribute("data-mode") ?? null;
}

describe("StatusBar — render mode toggle (MDP-15)", () => {
  it("disabled when there is no active document", async () => {
    const { container } = render(StatusBar);
    await tick();
    expect(modeButton(container).disabled).toBe(true);
  });

  it("renders all three mode icons (rendered/mixed/raw)", async () => {
    docs.openFile("/a.md", "a");
    const { container } = render(StatusBar);
    await tick();
    const modes = Array.from(
      container.querySelectorAll<HTMLElement>(".mode-ind"),
    ).map((el) => el.getAttribute("data-mode"));
    expect(modes).toEqual(["rendered", "mixed", "raw"]);
  });

  it("highlights the active document's current mode", async () => {
    const id = docs.openFile("/a.md", "a"); // defaults to rendered
    const { container } = render(StatusBar);
    await tick();
    expect(activeModeIndicator(container)).toBe("rendered");

    docs.setMode(id, "mixed");
    await tick();
    expect(activeModeIndicator(container)).toBe("mixed");
  });

  it("click cycles the mode rendered → mixed → raw → rendered in the store", async () => {
    const id = docs.openFile("/a.md", "a");
    expect(docs.getActive()?.mode).toBe("rendered");

    const { container } = render(StatusBar);
    await tick();
    const btn = modeButton(container);

    await fireEvent.click(btn);
    await tick();
    expect(docs.getDocuments().find((d) => d.id === id)?.mode).toBe("mixed");

    await fireEvent.click(btn);
    await tick();
    expect(docs.getDocuments().find((d) => d.id === id)?.mode).toBe("raw");

    await fireEvent.click(btn);
    await tick();
    expect(docs.getDocuments().find((d) => d.id === id)?.mode).toBe("rendered");
  });
});
