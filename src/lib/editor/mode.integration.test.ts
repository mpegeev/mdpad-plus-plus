/**
 * Интеграционные тесты режимов отображения (MDP-15) на смонтированном
 * EditorView. Проверяется поведение, не выразимое на чистом EditorState:
 *   - raw: нет ни одной block-replace-декорации (весь документ raw);
 *   - rendered: все блоки отрендерены, активного raw-блока нет;
 *   - mixed: блок под кареткой автоматически становится raw, соседние — нет;
 *   - переключение режима НЕ пересоздаёт EditorView (Compartment, не remount);
 *   - Ctrl+E вызывает проп onCycleMode (хоткей в keymap редактора).
 *
 * Чистая циклическая логика cycleMode покрыта в `mode.test.ts`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { EditorView } from "@codemirror/view";
import Editor from "./Editor.svelte";
import {
  inlineRenderField,
  rawBlockField,
  __clearRenderCache,
} from "./inlineRender";
import { parseBlocks } from "$lib/markdown/blocks";

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

/** Стартовые позиции block-replace-декораций активного набора (или []). */
function decoStarts(view: EditorView): number[] {
  const set = view.state.field(inlineRenderField, false);
  if (!set) return [];
  const starts: number[] = [];
  const it = set.iter();
  while (it.value) {
    starts.push(it.from);
    it.next();
  }
  return starts;
}

function pressCtrlE(view: EditorView): void {
  view.contentDOM.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "e",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
}

const TWO_BLOCKS = ["# Заголовок", "", "Абзац текста."].join("\n");

describe("mode=raw", () => {
  it("не строит ни одной декорации — весь документ raw", async () => {
    const { container } = render(Editor, {
      props: { doc: TWO_BLOCKS, mode: "raw" },
    });
    await tick();
    const view = getView(container);
    // Поля inlineRender вообще нет в raw → декораций нет.
    expect(view.state.field(inlineRenderField, false)).toBeUndefined();
    expect(container.querySelectorAll(".cm-md-block").length).toBe(0);
  });
});

describe("mode=rendered", () => {
  it("рендерит все блоки, активного raw-блока нет", async () => {
    const { container } = render(Editor, {
      props: { doc: TWO_BLOCKS, mode: "rendered" },
    });
    await tick();
    const view = getView(container);
    const blocks = parseBlocks(TWO_BLOCKS);
    for (const b of blocks) {
      expect(decoStarts(view)).toContain(b.from);
    }
    expect(view.state.field(rawBlockField)).toBeNull();
  });
});

describe("mode=mixed", () => {
  it("блок под кареткой при монтировании становится raw (каретка в позиции 0)", async () => {
    const { container } = render(Editor, {
      props: { doc: TWO_BLOCKS, mode: "mixed" },
    });
    await tick();
    const view = getView(container);
    const blocks = parseBlocks(TWO_BLOCKS);
    // Каретка по умолчанию в 0 → первый блок raw.
    expect(view.state.field(rawBlockField)).toBe(blocks[0].from);
    expect(decoStarts(view)).not.toContain(blocks[0].from);
    // Второй блок остаётся отрендеренным.
    expect(decoStarts(view)).toContain(blocks[1].from);
  });

  it("перемещение каретки в другой блок переносит raw на него автоматически", async () => {
    const { container } = render(Editor, {
      props: { doc: TWO_BLOCKS, mode: "mixed" },
    });
    await tick();
    const view = getView(container);
    const blocks = parseBlocks(TWO_BLOCKS);

    // Двигаем каретку во второй блок (без F2/клика).
    view.dispatch({ selection: { anchor: blocks[1].from + 1 } });
    await tick();

    expect(view.state.field(rawBlockField)).toBe(blocks[1].from);
    expect(decoStarts(view)).not.toContain(blocks[1].from);
    // Первый блок снова отрендерен.
    expect(decoStarts(view)).toContain(blocks[0].from);
  });

  it("каретка вне любого блока (пустой документ) → активного raw-блока нет", async () => {
    // В пустом документе блоков нет → findBlockAt вернёт null → setRawBlock(null),
    // ничего не показывается raw (и нечего рендерить).
    const { container } = render(Editor, {
      props: { doc: "", mode: "mixed" },
    });
    await tick();
    const view = getView(container);

    expect(view.state.field(rawBlockField)).toBeNull();
    expect(container.querySelectorAll(".cm-md-block").length).toBe(0);
  });
});

describe("переключение режима через проп", () => {
  it("rendered → raw → rendered НЕ пересоздаёт EditorView (тот же инстанс)", async () => {
    const { container, rerender } = render(Editor, {
      props: { doc: TWO_BLOCKS, mode: "rendered" },
    });
    await tick();
    const before = getView(container);
    expect(decoStarts(before).length).toBeGreaterThan(0);

    await rerender({ doc: TWO_BLOCKS, mode: "raw" });
    await tick();
    const after = getView(container);
    expect(after).toBe(before);
    expect(after.state.field(inlineRenderField, false)).toBeUndefined();

    await rerender({ doc: TWO_BLOCKS, mode: "rendered" });
    await tick();
    expect(getView(container)).toBe(before);
    expect(decoStarts(before).length).toBeGreaterThan(0);
  });

  it("переключение mixed → rendered сбрасывает активный raw-блок", async () => {
    const { container, rerender } = render(Editor, {
      props: { doc: TWO_BLOCKS, mode: "mixed" },
    });
    await tick();
    const view = getView(container);
    expect(view.state.field(rawBlockField)).not.toBeNull();

    await rerender({ doc: TWO_BLOCKS, mode: "rendered" });
    await tick();
    expect(view.state.field(rawBlockField)).toBeNull();
    const blocks = parseBlocks(TWO_BLOCKS);
    for (const b of blocks) {
      expect(decoStarts(view)).toContain(b.from);
    }
  });
});

describe("Ctrl+E", () => {
  it("вызывает проп onCycleMode при сфокусированном редакторе", async () => {
    const onCycleMode = vi.fn();
    const { container } = render(Editor, {
      props: { doc: TWO_BLOCKS, mode: "rendered", onCycleMode },
    });
    await tick();
    const view = getView(container);

    pressCtrlE(view);
    await tick();

    expect(onCycleMode).toHaveBeenCalledTimes(1);
  });

  it("не падает, если onCycleMode не передан", async () => {
    const { container } = render(Editor, {
      props: { doc: TWO_BLOCKS, mode: "rendered" },
    });
    await tick();
    const view = getView(container);
    expect(() => pressCtrlE(view)).not.toThrow();
  });
});
