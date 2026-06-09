/**
 * MDP-18 — интеграционные тесты блочного форматирования на смонтированном
 * EditorView. Проверяется то, что не выразимо на чистом ядре:
 *   - хоткеи `Ctrl+0..6` подключены в keymap и меняют уровень заголовка;
 *   - `Tab`/`Shift+Tab` меняют отступ ВНУТРИ списков и «проваливаются»
 *     (команда возвращает false) вне списков;
 *   - команды работают на multi-line выделении.
 *
 * Чистые преобразования (setHeadingLevel/indentListLines/outdentListLines)
 * покрыты контрактными тестами в `blockFormat.test.ts`.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { EditorView } from "@codemirror/view";
import Editor from "./Editor.svelte";
import { __clearRenderCache } from "./inlineRender";
import { commandForHeading, indentListCommand } from "./format";

beforeEach(() => {
  __clearRenderCache();
});

function getView(container: HTMLElement): EditorView {
  const dom = container.querySelector(".cm-editor") as HTMLElement | null;
  expect(dom).not.toBeNull();
  const view = EditorView.findFromDOM(dom!);
  expect(view).not.toBeNull();
  return view!;
}

/** Монтирует редактор в режиме raw (без декораций) с выделением [from,to). */
async function mountWithSelection(
  doc: string,
  from: number,
  to: number,
): Promise<EditorView> {
  const { container } = render(Editor, { props: { doc, mode: "raw" } });
  await tick();
  const view = getView(container);
  view.dispatch({ selection: { anchor: from, head: to } });
  await tick();
  return view;
}

function pressKey(
  view: EditorView,
  key: string,
  opts: Partial<KeyboardEventInit> = {},
): void {
  view.contentDOM.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
      ...opts,
    }),
  );
}

function pressTab(
  view: EditorView,
  opts: Partial<KeyboardEventInit> = {},
): void {
  view.contentDOM.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
      ...opts,
    }),
  );
}

describe("заголовки: хоткеи Ctrl+0..6 (AC: хоткеи)", () => {
  it("Ctrl+1 делает строку заголовком H1", async () => {
    const view = await mountWithSelection("hello", 0, 0);
    pressKey(view, "1");
    await tick();
    expect(view.state.doc.toString()).toBe("# hello");
  });

  it("Ctrl+6 ставит H6", async () => {
    const view = await mountWithSelection("t", 0, 1);
    pressKey(view, "6");
    await tick();
    expect(view.state.doc.toString()).toBe("###### t");
  });

  it("Ctrl+0 снимает заголовок (в параграф)", async () => {
    const view = await mountWithSelection("## hi", 0, 5);
    pressKey(view, "0");
    await tick();
    expect(view.state.doc.toString()).toBe("hi");
  });

  it("Ctrl+3 на multi-line выделении применяет ко всем строкам (AC: multi-line)", async () => {
    const view = await mountWithSelection("a\nb", 0, 3);
    pressKey(view, "3");
    await tick();
    expect(view.state.doc.toString()).toBe("### a\n### b");
  });

  it("commandForHeading применяется и через view напрямую (путь dropdown)", async () => {
    const view = await mountWithSelection("x", 0, 1);
    commandForHeading(2)(view);
    await tick();
    expect(view.state.doc.toString()).toBe("## x");
  });
});

describe("отступы списков: Tab/Shift+Tab (AC: indent/outdent)", () => {
  it("Tab внутри списка увеличивает отступ", async () => {
    const view = await mountWithSelection("- a", 2, 2);
    pressTab(view);
    await tick();
    expect(view.state.doc.toString()).toBe("  - a");
  });

  it("Shift+Tab внутри списка уменьшает отступ", async () => {
    const view = await mountWithSelection("  - a", 4, 4);
    pressTab(view, { shiftKey: true });
    await tick();
    expect(view.state.doc.toString()).toBe("- a");
  });

  it("Tab вне списка НЕ меняет документ (команда отказывается, дефолт срабатывает)", async () => {
    const view = await mountWithSelection("plain", 2, 2);
    pressTab(view);
    await tick();
    expect(view.state.doc.toString()).toBe("plain");
  });

  it("indentListCommand возвращает false вне списка", async () => {
    const view = await mountWithSelection("plain", 0, 0);
    expect(indentListCommand(view)).toBe(false);
  });

  it("indentListCommand возвращает true внутри списка", async () => {
    const view = await mountWithSelection("- a", 0, 0);
    expect(indentListCommand(view)).toBe(true);
  });

  it("Tab на multi-line выделении списка отступает все элементы (AC: multi-line)", async () => {
    const view = await mountWithSelection("- a\n- b", 0, 7);
    pressTab(view);
    await tick();
    expect(view.state.doc.toString()).toBe("  - a\n  - b");
  });
});
