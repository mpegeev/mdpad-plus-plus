/**
 * Интеграционные тесты активного raw-блока (MDP-13) на уровне смонтированного
 * EditorView. Здесь проверяются взаимодействия, которые нельзя выразить на
 * уровне чистого EditorState: нажатия F2/Esc (реальный `KeyboardEvent`,
 * диспатчится в `contentDOM` и проходит через keymap CM6 — `rawBlockField`
 * меняется только через биндинг, так что тест подтверждает именно его), двойной
 * клик по виджету (снятие виджета + каретка в начало блока) и инвариант
 * «перемещение каретки не делает блок raw автоматически» (AC#5).
 *
 * Чистая логика полей/findBlockAt покрыта в `rawBlock.test.ts` (агент
 * test-writer, без доступа к реализации) — здесь её не дублируем.
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
  findBlockAt,
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

// Документ из двух блоков, разделённых пустой строкой.
const TWO_BLOCKS = ["# Заголовок", "", "Абзац текста."].join("\n");

describe("активный raw-блок: F2", () => {
  it("F2 на блоке под кареткой снимает его виджет и запоминает позицию", async () => {
    const { container } = render(Editor, { props: { doc: TWO_BLOCKS } });
    await tick();
    const view = getView(container);

    const blocks = parseBlocks(TWO_BLOCKS);
    const second = blocks[1];

    // Ставим каретку во второй блок и жмём F2.
    view.dispatch({ selection: { anchor: second.from + 1 } });
    pressKey(view, "F2");
    await tick();

    expect(view.state.field(rawBlockField)).toBe(second.from);
    // Виджета второго блока больше нет в наборе декораций.
    expect(decoStarts(view)).not.toContain(second.from);
    // Первый блок остаётся отрендеренным.
    expect(decoStarts(view)).toContain(blocks[0].from);
    // Каретка — в начале второго блока (AC: фокус в начало блока).
    expect(view.state.selection.main.head).toBe(second.from);
  });

  it("повторный F2 на том же блоке возвращает рендер (toggle)", async () => {
    const { container } = render(Editor, { props: { doc: TWO_BLOCKS } });
    await tick();
    const view = getView(container);
    const blocks = parseBlocks(TWO_BLOCKS);

    // Каретка по умолчанию в позиции 0 → первый блок.
    pressKey(view, "F2");
    await tick();
    expect(view.state.field(rawBlockField)).toBe(blocks[0].from);

    pressKey(view, "F2");
    await tick();
    expect(view.state.field(rawBlockField)).toBeNull();
    expect(decoStarts(view)).toContain(blocks[0].from);
  });

  it("F2 вне блока (пустой документ) — no-op", async () => {
    // В пустом документе нет блоков → каретка не внутри блока, F2 не действует.
    const { container } = render(Editor, { props: { doc: "" } });
    await tick();
    const view = getView(container);
    expect(findBlockAt("", 0)).toBeNull();

    pressKey(view, "F2");
    await tick();

    expect(view.state.field(rawBlockField)).toBeNull();
  });
});

describe("активный raw-блок: Esc", () => {
  it("Esc возвращает рендер активного блока", async () => {
    const { container } = render(Editor, { props: { doc: TWO_BLOCKS } });
    await tick();
    const view = getView(container);
    const blocks = parseBlocks(TWO_BLOCKS);

    // Активируем блок программно через эффект.
    view.dispatch({ effects: setRawBlock.of(blocks[1].from) });
    await tick();
    expect(view.state.field(rawBlockField)).toBe(blocks[1].from);

    pressKey(view, "Escape");
    await tick();

    expect(view.state.field(rawBlockField)).toBeNull();
    expect(decoStarts(view)).toContain(blocks[1].from);
  });

  it("Esc без активного блока ничего не ломает (поле остаётся null)", async () => {
    const { container } = render(Editor, { props: { doc: TWO_BLOCKS } });
    await tick();
    const view = getView(container);

    expect(view.state.field(rawBlockField)).toBeNull();
    expect(() => pressKey(view, "Escape")).not.toThrow();
    await tick();
    expect(view.state.field(rawBlockField)).toBeNull();
  });
});

describe("активный raw-блок: двойной клик по виджету", () => {
  it("двойной клик по виджету снимает его и ставит каретку в начало блока", async () => {
    const { container } = render(Editor, { props: { doc: TWO_BLOCKS } });
    await tick();
    const view = getView(container);
    const blocks = parseBlocks(TWO_BLOCKS);

    // Двойной клик по виджету второго блока (его HTML — параграф).
    const widgets = container.querySelectorAll(".cm-md-block");
    expect(widgets.length).toBe(blocks.length);
    const secondWidget = widgets[1];

    secondWidget.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await tick();

    expect(view.state.field(rawBlockField)).toBe(blocks[1].from);
    expect(view.state.selection.main.head).toBe(blocks[1].from);
    expect(decoStarts(view)).not.toContain(blocks[1].from);
    // Соседний блок не затронут.
    expect(decoStarts(view)).toContain(blocks[0].from);
  });

  it("одиночный клик по виджету НЕ переводит блок в raw", async () => {
    const { container } = render(Editor, { props: { doc: TWO_BLOCKS } });
    await tick();
    const view = getView(container);

    const secondWidget = container.querySelectorAll(".cm-md-block")[1];
    secondWidget.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    secondWidget.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();

    // Одиночный клик не активирует raw — это делает только двойной клик / F2.
    expect(view.state.field(rawBlockField)).toBeNull();
  });
});

describe("активный raw-блок: ручная модель (AC#5)", () => {
  it("перемещение каретки в другой блок не делает старый/новый блок raw автоматически", async () => {
    const { container } = render(Editor, { props: { doc: TWO_BLOCKS } });
    await tick();
    const view = getView(container);
    const blocks = parseBlocks(TWO_BLOCKS);

    // Делаем первый блок активным (raw) явно.
    view.dispatch({ effects: setRawBlock.of(blocks[0].from) });
    await tick();
    expect(view.state.field(rawBlockField)).toBe(blocks[0].from);

    // Перемещаем каретку во второй блок — БЕЗ F2/клика.
    view.dispatch({ selection: { anchor: blocks[1].from + 1 } });
    await tick();

    // Активный блок не изменился: первый всё ещё raw, второй НЕ стал raw.
    expect(view.state.field(rawBlockField)).toBe(blocks[0].from);
    expect(decoStarts(view)).toContain(blocks[1].from);
    expect(decoStarts(view)).not.toContain(blocks[0].from);
  });

  it("внешняя замена всего документа сбрасывает активный блок (fail-closed)", async () => {
    const { container } = render(Editor, { props: { doc: TWO_BLOCKS } });
    await tick();
    const view = getView(container);
    const blocks = parseBlocks(TWO_BLOCKS);

    view.dispatch({ effects: setRawBlock.of(blocks[1].from) });
    await tick();
    expect(view.state.field(rawBlockField)).toBe(blocks[1].from);

    // Полная замена буфера (как делает doc-sync эффект Editor.svelte при смене
    // содержимого): старый блок удалён → активный блок должен сброситься в null,
    // а не остаться «висячей» позицией, случайно совпадающей с новым блоком.
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: "# Совсем другой",
      },
    });
    await tick();

    expect(view.state.field(rawBlockField)).toBeNull();
    // Все блоки нового документа отрендерены.
    const newBlocks = parseBlocks(view.state.doc.toString());
    for (const b of newBlocks) {
      expect(decoStarts(view)).toContain(b.from);
    }
  });

  it("правка активного raw-блока сохраняет его активным (позиция мапится)", async () => {
    const doc = ["вставка-будет-выше", "", "целевой абзац"].join("\n");
    const { container } = render(Editor, { props: { doc } });
    await tick();
    const view = getView(container);
    const second = parseBlocks(doc)[1];

    view.dispatch({ effects: setRawBlock.of(second.from) });
    await tick();

    // Вставляем текст в самое начало документа — позиция блока сдвигается.
    view.dispatch({ changes: { from: 0, insert: "ещё строка\n\n" } });
    await tick();

    const newSecondIndex = 2; // было 2 блока, добавили блок сверху → целевой стал 3-м
    const blocksAfter = parseBlocks(view.state.doc.toString());
    expect(view.state.field(rawBlockField)).toBe(
      blocksAfter[newSecondIndex].from,
    );
    expect(decoStarts(view)).not.toContain(blocksAfter[newSecondIndex].from);
  });
});
