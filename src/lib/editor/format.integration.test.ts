/**
 * MDP-17 — интеграционные тесты форматирующих команд на смонтированном
 * EditorView. Проверяется поведение, не выразимое на чистом ядре:
 *   - команды (toggleBold/...) корректно меняют документ через view.dispatch;
 *   - хоткеи Ctrl+B/I/U/Ctrl+` подключены в keymap редактора и срабатывают.
 *
 * Чистые преобразования покрыты в `format.test.ts`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { EditorView } from "@codemirror/view";
import Editor from "./Editor.svelte";
import { __clearRenderCache } from "./inlineRender";
import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleInlineCode,
  toggleCodeFenceCommand,
} from "./format";

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

describe("команды форматирования через view.dispatch", () => {
  it("toggleBold оборачивает выделение в **…**", async () => {
    const view = await mountWithSelection("bold", 0, 4);
    toggleBold(view);
    await tick();
    expect(view.state.doc.toString()).toBe("**bold**");
  });

  it("toggleBold повторно снимает обёртку (toggle-off)", async () => {
    const view = await mountWithSelection("**bold**", 2, 6);
    toggleBold(view);
    await tick();
    expect(view.state.doc.toString()).toBe("bold");
  });

  it("toggleItalic оборачивает в *…*", async () => {
    const view = await mountWithSelection("it", 0, 2);
    toggleItalic(view);
    await tick();
    expect(view.state.doc.toString()).toBe("*it*");
  });

  it("toggleUnderline оборачивает в <u>…</u>", async () => {
    const view = await mountWithSelection("u", 0, 1);
    toggleUnderline(view);
    await tick();
    expect(view.state.doc.toString()).toBe("<u>u</u>");
  });

  it("toggleInlineCode оборачивает в `…`", async () => {
    const view = await mountWithSelection("code", 0, 4);
    toggleInlineCode(view);
    await tick();
    expect(view.state.doc.toString()).toBe("`code`");
  });

  it("toggleCodeFenceCommand оборачивает многострочное выделение в fence", async () => {
    const view = await mountWithSelection("a\nb", 0, 3);
    toggleCodeFenceCommand(view);
    await tick();
    expect(view.state.doc.toString()).toBe("```\na\nb\n```");
  });
});

describe("хоткеи подключены в keymap редактора (AC#5)", () => {
  it("Ctrl+B вызывает toggleBold", async () => {
    const view = await mountWithSelection("bold", 0, 4);
    pressKey(view, "b");
    await tick();
    expect(view.state.doc.toString()).toBe("**bold**");
  });

  it("Ctrl+I вызывает toggleItalic", async () => {
    const view = await mountWithSelection("it", 0, 2);
    pressKey(view, "i");
    await tick();
    expect(view.state.doc.toString()).toBe("*it*");
  });

  it("Ctrl+U вызывает toggleUnderline", async () => {
    const view = await mountWithSelection("u", 0, 1);
    pressKey(view, "u");
    await tick();
    expect(view.state.doc.toString()).toBe("<u>u</u>");
  });

  it("Ctrl+` вызывает toggleInlineCode", async () => {
    const view = await mountWithSelection("code", 0, 4);
    pressKey(view, "`");
    await tick();
    expect(view.state.doc.toString()).toBe("`code`");
  });
});

describe("пустое выделение — каретка между маркерами", () => {
  it("toggleBold на пустом выделении ставит каретку внутрь **|**", async () => {
    const view = await mountWithSelection("", 0, 0);
    toggleBold(view);
    await tick();
    expect(view.state.doc.toString()).toBe("****");
    const sel = view.state.selection.main;
    expect(sel.empty).toBe(true);
    expect(sel.head).toBe(2);
  });
});

describe("dispatch-вызовы не падают без обработчиков", () => {
  it("команда возвращает true (обработала событие)", async () => {
    const view = await mountWithSelection("x", 0, 1);
    const spy = vi.spyOn(view, "dispatch");
    expect(toggleBold(view)).toBe(true);
    expect(spy).toHaveBeenCalled();
  });
});
