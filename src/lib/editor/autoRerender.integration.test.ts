/**
 * Интеграционные тесты авто-ререндера (MDP-14) на смонтированном EditorView.
 *
 * Проверяется поведение из критериев приёмки:
 *  - blur редактора при активном raw-блоке возвращает его в рендер
 *    (`rawBlockField` → null, виджет блока снова в наборе декораций);
 *  - blur при отсутствии активного блока ничего не ломает;
 *  - blur с фокусом, ушедшим ВНУТРЬ редактора, raw-блок НЕ сбрасывает;
 *  - Esc возвращает рендер и НЕ теряет позицию каретки (selection сохраняется).
 *
 * Команды Esc/F2/клик как таковые покрыты в `rawBlock.integration.test.ts`;
 * здесь — только новое поведение MDP-14, без дублирования.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { EditorView } from "@codemirror/view";
import Editor from "./Editor.svelte";
import {
  inlineRenderField,
  rawBlockField,
  setRawBlock,
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

/** Стартовые позиции block-replace-декораций в наборе. */
function decoStarts(view: EditorView): number[] {
  const starts: number[] = [];
  const it = view.state.field(inlineRenderField).iter();
  while (it.value) {
    starts.push(it.from);
    it.next();
  }
  return starts;
}

function pressKey(view: EditorView, key: string): void {
  view.contentDOM.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
}

/** Эмулирует потерю фокуса редактором. `related` — куда ушёл фокус (или null). */
function blur(view: EditorView, related: EventTarget | null = null): void {
  view.contentDOM.dispatchEvent(
    new FocusEvent("blur", { bubbles: true, relatedTarget: related }),
  );
}

// Документ из двух блоков, разделённых пустой строкой.
const TWO_BLOCKS = ["# Заголовок", "", "Абзац текста."].join("\n");

describe("авто-ререндер: потеря фокуса (AC#1)", () => {
  it("blur при активном raw-блоке возвращает его в рендер", async () => {
    const { container } = render(Editor, { props: { doc: TWO_BLOCKS } });
    await tick();
    const view = getView(container);
    const blocks = parseBlocks(TWO_BLOCKS);

    // Активируем второй блок (raw).
    view.dispatch({ effects: setRawBlock.of(blocks[1].from) });
    await tick();
    expect(view.state.field(rawBlockField)).toBe(blocks[1].from);
    expect(decoStarts(view)).not.toContain(blocks[1].from);

    // Фокус уходит наружу редактора.
    blur(view, null);
    await tick();

    expect(view.state.field(rawBlockField)).toBeNull();
    // Виджет второго блока снова в наборе — блок отрендерен.
    expect(decoStarts(view)).toContain(blocks[1].from);
    expect(decoStarts(view)).toContain(blocks[0].from);
  });

  it("blur без активного блока ничего не меняет (поле остаётся null)", async () => {
    const { container } = render(Editor, { props: { doc: TWO_BLOCKS } });
    await tick();
    const view = getView(container);

    expect(view.state.field(rawBlockField)).toBeNull();
    expect(() => blur(view, null)).not.toThrow();
    await tick();
    expect(view.state.field(rawBlockField)).toBeNull();
  });

  it("blur с фокусом, ушедшим внутрь редактора, не сбрасывает raw-блок", async () => {
    const { container } = render(Editor, { props: { doc: TWO_BLOCKS } });
    await tick();
    const view = getView(container);
    const blocks = parseBlocks(TWO_BLOCKS);

    view.dispatch({ effects: setRawBlock.of(blocks[0].from) });
    await tick();
    expect(view.state.field(rawBlockField)).toBe(blocks[0].from);

    // relatedTarget — узел внутри DOM редактора: содержательной потери фокуса нет.
    blur(view, view.contentDOM);
    await tick();

    expect(view.state.field(rawBlockField)).toBe(blocks[0].from);
    expect(decoStarts(view)).not.toContain(blocks[0].from);
  });
});

describe("авто-ререндер: Esc сохраняет каретку (AC#2)", () => {
  it("Esc возвращает рендер и не теряет позицию каретки", async () => {
    const { container } = render(Editor, { props: { doc: TWO_BLOCKS } });
    await tick();
    const view = getView(container);
    const blocks = parseBlocks(TWO_BLOCKS);

    // Активируем второй блок и ставим каретку в его середину.
    const caret = blocks[1].from + 3;
    view.dispatch({
      effects: setRawBlock.of(blocks[1].from),
      selection: { anchor: caret },
    });
    await tick();
    expect(view.state.field(rawBlockField)).toBe(blocks[1].from);
    expect(view.state.selection.main.head).toBe(caret);

    pressKey(view, "Escape");
    await tick();

    // Блок отрендерен, НО каретка осталась на той же позиции (не сброшена).
    expect(view.state.field(rawBlockField)).toBeNull();
    expect(view.state.selection.main.head).toBe(caret);
    expect(view.state.selection.main.anchor).toBe(caret);
  });
});
