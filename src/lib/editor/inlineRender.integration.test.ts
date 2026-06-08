/**
 * Интеграционные тесты inline-рендера (MDP-12) на уровне смонтированного
 * EditorView. В отличие от `inlineRender.decorations.test.ts` (чистая проверка
 * набора декораций), здесь поднимается реальный CodeMirror через компонент
 * `Editor.svelte` — это ловит ошибки выравнивания block-декораций по границам
 * строк (CM6 бросает при отрисовке, если диапазон не на границе строки) и
 * проверяет фактический DOM.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { EditorView } from "@codemirror/view";
import Editor from "./Editor.svelte";
import { inlineRenderField } from "./inlineRender";

function getView(container: HTMLElement): EditorView {
  const dom = container.querySelector(".cm-editor") as HTMLElement | null;
  expect(dom).not.toBeNull();
  const view = EditorView.findFromDOM(dom!);
  expect(view).not.toBeNull();
  return view!;
}

const MULTI_BLOCK = [
  "# Заголовок",
  "",
  "Обычный абзац с **жирным**.",
  "",
  "- пункт a",
  "- пункт b",
  "",
  "> цитата",
  "",
  "```js",
  "const x = 1;",
  "```",
].join("\n");

describe("inline-рендер: интеграция с EditorView", () => {
  it("документ открывается отрендеренным — в DOM есть .cm-md-block с HTML", async () => {
    const { container } = render(Editor, { props: { doc: MULTI_BLOCK } });
    await tick();
    const view = getView(container);

    // Набор декораций непуст.
    const set = view.state.field(inlineRenderField);
    expect(set.size).toBeGreaterThan(0);

    // Виджеты отрисованы в DOM и содержат именно HTML-рендер, а не сырой MD.
    const blocks = container.querySelectorAll(".cm-md-block");
    expect(blocks.length).toBeGreaterThan(0);
    expect(container.querySelector(".cm-md-block h1")).not.toBeNull();
    expect(container.querySelector(".cm-md-block strong")).not.toBeNull();
  });

  it("монтирование многоблочного документа не бросает (выравнивание block-декораций корректно)", async () => {
    // Смешиваем варианты границ: финальный блок без завершающего \n,
    // блоки, разделённые пустой строкой, и список из нескольких строк.
    const doc = "# A\n\npara one\n\n- l1\n- l2\n\nlast no newline";
    expect(() => render(Editor, { props: { doc } })).not.toThrow();
    await tick();
  });

  it("mode=raw — блоки НЕ заменяются, виден сырой Markdown", async () => {
    // MDP-15: режим raw — прямой наследник прежнего `inlineRender=false`
    // (декораций нет вовсе). Проп заменён на `mode` при переключении режимов.
    const { container } = render(Editor, {
      props: { doc: MULTI_BLOCK, mode: "raw" },
    });
    await tick();
    const view = getView(container);

    // Поля декораций нет в состоянии вовсе (расширение не подключено).
    expect(() => view.state.field(inlineRenderField)).toThrow();
    expect(container.querySelector(".cm-md-block")).toBeNull();
    // Сырой синтаксис присутствует в тексте контента.
    expect(view.dom.querySelector(".cm-content")?.textContent).toContain("#");
  });

  it("изменение текста перерендеривает затронутый блок", async () => {
    const { container } = render(Editor, { props: { doc: "# Старый" } });
    await tick();
    const view = getView(container);

    expect(container.querySelector(".cm-md-block h1")?.textContent).toBe(
      "Старый",
    );

    // Правим текст заголовка через документ (raw-слой остаётся источником).
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "# Новый" },
    });
    await tick();

    expect(container.querySelector(".cm-md-block h1")?.textContent).toBe(
      "Новый",
    );
  });

  it("смена типа блока перерендеривает в правильный тег", async () => {
    const { container } = render(Editor, { props: { doc: "просто абзац" } });
    await tick();
    const view = getView(container);
    expect(container.querySelector(".cm-md-block h2")).toBeNull();

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "## Теперь H2" },
    });
    await tick();
    expect(container.querySelector(".cm-md-block h2")).not.toBeNull();
  });

  it("транзакция без изменения документа НЕ пересобирает набор декораций (стабильность при скролле)", async () => {
    // Скролл/перемещение каретки не меняют документ → набор декораций должен
    // остаться тем же инстансом. Это и есть механизм плавного скролла: при
    // скролле пересборки декораций нет, лениво вызывается только toDOM.
    const { container } = render(Editor, { props: { doc: MULTI_BLOCK } });
    await tick();
    const view = getView(container);
    const before = view.state.field(inlineRenderField);

    view.dispatch({ selection: { anchor: 0 } });
    await tick();
    const after = view.state.field(inlineRenderField);

    expect(after).toBe(before);
  });

  it("правка одного блока переиспользует DOM соседнего (eq предотвращает ререндер)", async () => {
    const doc = "# AAA\n\nBBB para";
    const { container } = render(Editor, { props: { doc } });
    await tick();
    const view = getView(container);

    const blocksBefore = container.querySelectorAll(".cm-md-block");
    expect(blocksBefore.length).toBe(2);
    const secondBefore = blocksBefore[1];

    // Правим ТОЛЬКО первый блок (заголовок); второй блок не меняется.
    view.dispatch({ changes: { from: 2, to: 5, insert: "ZZZ" } });
    await tick();

    expect(container.querySelector(".cm-md-block h1")?.textContent).toBe("ZZZ");
    const blocksAfter = container.querySelectorAll(".cm-md-block");
    expect(blocksAfter.length).toBe(2);
    // Соседний (неизменённый) блок — тот же DOM-узел: eq() вернул true и CM
    // переиспользовал виджет, а не отрисовал заново.
    expect(blocksAfter[1]).toBe(secondBefore);
  });

  it("большой документ (5000 строк) монтируется без ошибок и строит декорации", async () => {
    // 5000 строк = 2500 заголовков, разделённых пустой строкой → 2500 блоков.
    const lines: string[] = [];
    for (let i = 0; i < 2500; i++) {
      lines.push(`# Заголовок ${i}`);
      lines.push("");
    }
    const big = lines.join("\n");

    let view: EditorView | undefined;
    expect(() => {
      const { container } = render(Editor, { props: { doc: big } });
      view = getView(container);
    }).not.toThrow();
    await tick();

    expect(view!.state.doc.lines).toBeGreaterThanOrEqual(5000);
    const set = view!.state.field(inlineRenderField);
    expect(set.size).toBe(2500);
  });
});
