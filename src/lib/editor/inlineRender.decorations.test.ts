/**
 * Независимые тесты для inlineRenderField и RenderedBlockWidget.
 * Написаны агентом test-writer по контракту и сигнатурам.
 * Реализация (inlineRender.ts) не читалась намеренно — структурная защита SENAR.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EditorState } from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import {
  inlineRender,
  inlineRenderField,
  RenderedBlockWidget,
  __clearRenderCache,
} from "$lib/editor/inlineRender";
import { parseBlocks } from "$lib/markdown/blocks";

// ---------------------------------------------------------------------------
// Вспомогательные функции
// ---------------------------------------------------------------------------

/** Создаёт EditorState с расширением inlineRender и возвращает набор декораций. */
function makeState(doc: string): { state: EditorState; set: DecorationSet } {
  const state = EditorState.create({ doc, extensions: [inlineRender()] });
  const set: DecorationSet = state.field(inlineRenderField);
  return { state, set };
}

/** Собирает все декорации из DecorationSet в массив. */
function collect(
  set: DecorationSet,
): Array<{ from: number; to: number; spec: unknown; widget: unknown }> {
  const out: Array<{
    from: number;
    to: number;
    spec: unknown;
    widget: unknown;
  }> = [];
  const cur = set.iter();
  while (cur.value !== null) {
    out.push({
      from: cur.from,
      to: cur.to,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spec: (cur.value as any).spec,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      widget: (cur.value as any).spec?.widget,
    });
    cur.next();
  }
  return out;
}

/**
 * Вычисляет ожидаемый диапазон декорации [from, end) по правилу контракта п.3:
 * если последний символ блока — \n, то end = block.to - 1, иначе end = block.to.
 */
function expectedRange(
  raw: string,
  from: number,
  to: number,
): { from: number; to: number } {
  const endsWithNewline = raw.charCodeAt(raw.length - 1) === 10; // '\n'
  return { from, to: endsWithNewline ? to - 1 : to };
}

// ---------------------------------------------------------------------------
// beforeEach: сброс кэша рендера для изоляции тестов
// ---------------------------------------------------------------------------

beforeEach(() => {
  __clearRenderCache();
});

// ===========================================================================
// 1. Пустые и whitespace-only документы
// ===========================================================================

describe("Пустой и whitespace-only документ", () => {
  it("AC#5: пустая строка → ноль декораций", () => {
    // AC#5: пустой документ — пустой набор
    const { set } = makeState("");
    const decs = collect(set);
    expect(decs).toHaveLength(0); // AC#5
  });

  it("AC#5: документ из одних пробелов → ноль декораций", () => {
    // AC#5: whitespace-only — пустой набор
    const { set } = makeState("   ");
    const decs = collect(set);
    expect(decs).toHaveLength(0); // AC#5
  });

  it("AC#5: документ из одних переводов строк → ноль декораций", () => {
    // AC#5: только \n — пустой набор
    const { set } = makeState("\n\n\n");
    const decs = collect(set);
    expect(decs).toHaveLength(0); // AC#5
  });

  it("AC#5: документ из смеси пробелов и переводов строк → ноль декораций", () => {
    // AC#5: whitespace-only mixed — пустой набор
    const { set } = makeState("  \n  \n  ");
    const decs = collect(set);
    expect(decs).toHaveLength(0); // AC#5
  });
});

// ===========================================================================
// 2. Количество декораций = количество блоков
// ===========================================================================

describe("AC#1: ровно одна декорация на каждый блок из parseBlocks", () => {
  it("один заголовок → одна декорация", () => {
    const doc = "# Привет\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(blocks.length); // AC#1
    expect(decs).toHaveLength(1); // AC#1: один блок
  });

  it("два блока (заголовок + параграф) → две декорации", () => {
    const doc = "# Заголовок\n\nАбзац текста.\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(blocks.length); // AC#1
    expect(decs).toHaveLength(2); // AC#1: ровно два блока
  });

  it("пять разных блоков → пять декораций", () => {
    const doc =
      [
        "# Заголовок",
        "",
        "Параграф.",
        "",
        "- пункт 1",
        "- пункт 2",
        "",
        "---",
        "",
        "> цитата",
      ].join("\n") + "\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(blocks.length); // AC#1: ровно столько, сколько блоков
  });

  it("документ с одним параграфом без завершающего \\n → одна декорация", () => {
    // edge case: строка без завершающего перевода строки
    const doc = "Текст без перевода строки";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(blocks.length); // AC#1
  });
});

// ===========================================================================
// 3. Порядок декораций совпадает с порядком блоков (по from)
// ===========================================================================

describe("AC#1: декорации идут в порядке документа", () => {
  it("декорации отсортированы по from в порядке возрастания", () => {
    const doc = "# H1\n\nПараграф.\n\n- a\n- b\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    for (let i = 1; i < decs.length; i++) {
      expect(decs[i].from).toBeGreaterThan(decs[i - 1].from); // AC#1: порядок документа
    }
  });
});

// ===========================================================================
// 4. block-level декорации: spec.block === true, spec.widget — RenderedBlockWidget
// ===========================================================================

describe("AC#2: каждая декорация — block-level с RenderedBlockWidget", () => {
  it("spec.block === true для заголовка", () => {
    const doc = "# Блок\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    expect(decs).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((decs[0].spec as any).block).toBe(true); // AC#2: block-level
  });

  it("spec.widget — экземпляр RenderedBlockWidget для параграфа", () => {
    const doc = "Обычный абзац.\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    expect(decs).toHaveLength(1);
    expect(decs[0].widget).toBeInstanceOf(RenderedBlockWidget); // AC#2: widget — RenderedBlockWidget
  });

  it("spec.block === true для каждой из нескольких декораций", () => {
    const doc = "# H\n\nP.\n\n- x\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    for (const dec of decs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((dec.spec as any).block).toBe(true); // AC#2: все block-level
    }
  });

  it("каждый widget — экземпляр RenderedBlockWidget в многоблочном документе", () => {
    const doc = "# H\n\nP.\n\n- x\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    for (const dec of decs) {
      expect(dec.widget).toBeInstanceOf(RenderedBlockWidget); // AC#2
    }
  });
});

// ===========================================================================
// 5. Диапазон декорации: правило про завершающий \n (п.3 контракта)
// ===========================================================================

describe("AC#3: диапазон декорации [from, end) с учётом завершающего \\n", () => {
  it("блок с завершающим \\n: end = block.to - 1 (\\n в диапазон не входит)", () => {
    const doc = "# Заголовок\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(1);
    const block = blocks[0];
    const expected = expectedRange(block.raw, block.from, block.to);
    expect(decs[0].from).toBe(expected.from); // AC#3: from совпадает с block.from
    expect(decs[0].to).toBe(expected.to); // AC#3: to = block.to - 1 (завершающий \n исключён)
  });

  it("блок без завершающего \\n: end = block.to (весь блок в диапазоне)", () => {
    // edge case: параграф в конце документа без \n
    const doc = "Текст без перевода";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(1);
    const block = blocks[0];
    const expected = expectedRange(block.raw, block.from, block.to);
    expect(decs[0].from).toBe(expected.from); // AC#3: from
    expect(decs[0].to).toBe(expected.to); // AC#3: to = block.to (без \n — весь диапазон)
  });

  it("несколько блоков: правило про \\n применяется к каждому независимо", () => {
    const doc = "# H\n\nАбзац.\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(blocks.length);
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const expected = expectedRange(block.raw, block.from, block.to);
      expect(decs[i].from).toBe(expected.from); // AC#3: from
      expect(decs[i].to).toBe(expected.to); // AC#3: правило \n
    }
  });

  it("code_fence с завершающим \\n: завершающий \\n исключён из диапазона", () => {
    const doc = "```js\nconst x = 1;\n```\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(blocks.length);
    const block = blocks[0];
    const expected = expectedRange(block.raw, block.from, block.to);
    expect(decs[0].from).toBe(expected.from); // AC#3
    expect(decs[0].to).toBe(expected.to); // AC#3: завершающий \n исключён
  });
});

// ===========================================================================
// 6. widget.raw и widget.type соответствуют блоку
// ===========================================================================

describe("AC#4: widget.raw === block.raw и widget.type === block.type", () => {
  it("заголовок: widget.raw совпадает с block.raw", () => {
    const doc = "# Привет мир\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    const widget = decs[0].widget as RenderedBlockWidget;
    expect(widget.raw).toBe(blocks[0].raw); // AC#4: raw
  });

  it("заголовок: widget.type === 'heading'", () => {
    const doc = "# Привет\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    const widget = decs[0].widget as RenderedBlockWidget;
    expect(widget.type).toBe(blocks[0].type); // AC#4: type
    expect(widget.type).toBe("heading"); // AC#4: конкретное значение
  });

  it("параграф: widget.raw и widget.type соответствуют блоку", () => {
    const doc = "Обычный текст.\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    const widget = decs[0].widget as RenderedBlockWidget;
    expect(widget.raw).toBe(blocks[0].raw); // AC#4: raw
    expect(widget.type).toBe("paragraph"); // AC#4: type
  });

  it("несколько блоков: каждый widget соответствует своему блоку", () => {
    const doc = "# H\n\nАбзац.\n\n- x\n- y\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(blocks.length);
    for (let i = 0; i < blocks.length; i++) {
      const widget = decs[i].widget as RenderedBlockWidget;
      expect(widget.raw).toBe(blocks[i].raw); // AC#4: raw для каждого блока
      expect(widget.type).toBe(blocks[i].type); // AC#4: type для каждого блока
    }
  });
});

// ===========================================================================
// 7. Корректность декораций для разных типов блоков
// ===========================================================================

describe("AC#4 (типы блоков): для каждого block-типа создаётся декорация с правильным widget.type", () => {
  // Составной документ со всеми поддерживаемыми типами блоков.
  // Блоки разделены пустыми строками для надёжного парсинга.
  const multiBlockDoc =
    [
      "# Заголовок", // heading
      "",
      "Обычный абзац.", // paragraph
      "",
      "- a", // list
      "- b",
      "",
      "```js", // code_fence
      "const x = 1;",
      "```",
      "",
      "> цитата", // blockquote
      "",
      "| a | b |", // table (GFM)
      "| --- | --- |",
      "| 1 | 2 |",
      "",
      "---", // hr
      "",
      "<div>x</div>", // html_block
    ].join("\n") + "\n";

  it("документ со всеми типами блоков: количество декораций = количество блоков из parseBlocks", () => {
    const { set } = makeState(multiBlockDoc);
    const decs = collect(set);
    const blocks = parseBlocks(multiBlockDoc);
    expect(decs).toHaveLength(blocks.length); // AC#1 + AC#4: все типы
  });

  it("heading: декорация с widget.type === 'heading'", () => {
    const doc = "# Заголовок\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const widget = decs[0].widget as RenderedBlockWidget;
    expect(widget.type).toBe("heading"); // AC#4: heading
  });

  it("paragraph: декорация с widget.type === 'paragraph'", () => {
    const doc = "Обычный абзац.\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const widget = decs[0].widget as RenderedBlockWidget;
    expect(widget.type).toBe("paragraph"); // AC#4: paragraph
  });

  it("list (unordered): декорация с widget.type === 'list'", () => {
    const doc = "- пункт 1\n- пункт 2\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const widget = decs[0].widget as RenderedBlockWidget;
    expect(widget.type).toBe("list"); // AC#4: list
  });

  it("list (ordered): декорация с widget.type === 'list'", () => {
    const doc = "1. один\n2. два\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const widget = decs[0].widget as RenderedBlockWidget;
    expect(widget.type).toBe("list"); // AC#4: list (ordered)
  });

  it("code_fence: декорация с widget.type === 'code_fence'", () => {
    const doc = "```js\nconst x = 1;\n```\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const widget = decs[0].widget as RenderedBlockWidget;
    expect(widget.type).toBe("code_fence"); // AC#4: code_fence
  });

  it("blockquote: декорация с widget.type === 'blockquote'", () => {
    const doc = "> цитата\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const widget = decs[0].widget as RenderedBlockWidget;
    expect(widget.type).toBe("blockquote"); // AC#4: blockquote
  });

  it("table (GFM): декорация с widget.type === 'table'", () => {
    const doc = "| a | b |\n| --- | --- |\n| 1 | 2 |\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const widget = decs[0].widget as RenderedBlockWidget;
    expect(widget.type).toBe("table"); // AC#4: table
  });

  it("hr: декорация с widget.type === 'hr'", () => {
    const doc = "---\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const widget = decs[0].widget as RenderedBlockWidget;
    expect(widget.type).toBe("hr"); // AC#4: hr
  });

  it("html_block: декорация с widget.type === 'html_block'", () => {
    const doc = "<div>x</div>\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const widget = decs[0].widget as RenderedBlockWidget;
    expect(widget.type).toBe("html_block"); // AC#4: html_block
  });

  it("составной документ: каждый виджет соответствует блоку parseBlocks по type и raw", () => {
    const { set } = makeState(multiBlockDoc);
    const decs = collect(set);
    const blocks = parseBlocks(multiBlockDoc);
    // Длина совпадает — проверена выше; здесь проверяем попарное соответствие
    const minLen = Math.min(decs.length, blocks.length);
    for (let i = 0; i < minLen; i++) {
      const widget = decs[i].widget as RenderedBlockWidget;
      expect(widget.type).toBe(blocks[i].type); // AC#4: type для каждого блока
      expect(widget.raw).toBe(blocks[i].raw); // AC#4: raw для каждого блока
    }
  });
});

// ===========================================================================
// 8. Пересборка набора при изменении документа (AC#6)
// ===========================================================================

describe("AC#6: пересборка декораций после изменения документа", () => {
  it("добавление параграфа после заголовка: две декорации вместо одной", () => {
    const initialDoc = "# Заголовок\n";
    const { state } = makeState(initialDoc);

    // Добавляем параграф после заголовка
    const insert = "\nНовый абзац.\n";
    const nextState = state.update({
      changes: { from: initialDoc.length, insert },
    }).state;
    const set2: DecorationSet = nextState.field(inlineRenderField);
    const decs2 = collect(set2);

    const newDoc = nextState.doc.toString();
    const blocks2 = parseBlocks(newDoc);
    expect(decs2).toHaveLength(blocks2.length); // AC#6: пересборка под новый текст
    expect(decs2).toHaveLength(2); // AC#6: теперь два блока
  });

  it("удаление всего содержимого → ноль декораций", () => {
    const initialDoc = "# Заголовок\n\nАбзац.\n";
    const { state } = makeState(initialDoc);

    const nextState = state.update({
      changes: { from: 0, to: initialDoc.length, insert: "" },
    }).state;
    const set2: DecorationSet = nextState.field(inlineRenderField);
    const decs2 = collect(set2);
    expect(decs2).toHaveLength(0); // AC#6 + AC#5: пустой документ после изменения
  });

  it("замена параграфа на заголовок: widget.type обновляется", () => {
    const initialDoc = "Обычный текст.\n";
    const { state } = makeState(initialDoc);

    const nextState = state.update({
      changes: { from: 0, to: initialDoc.length, insert: "# Заголовок\n" },
    }).state;
    const set2: DecorationSet = nextState.field(inlineRenderField);
    const decs2 = collect(set2);

    const newDoc = nextState.doc.toString();
    const blocks2 = parseBlocks(newDoc);
    expect(decs2).toHaveLength(1); // AC#6: один блок
    const widget = decs2[0].widget as RenderedBlockWidget;
    expect(widget.type).toBe(blocks2[0].type); // AC#6: widget соответствует новому блоку
    expect(widget.type).toBe("heading"); // AC#6: конкретный тип
  });

  it("изменение текста блока: widget.raw обновляется под новый raw", () => {
    const initialDoc = "# Старый заголовок\n";
    const { state } = makeState(initialDoc);

    const nextState = state.update({
      changes: {
        from: 2,
        to: "# Старый заголовок".length,
        insert: "Новый заголовок",
      },
    }).state;
    const set2: DecorationSet = nextState.field(inlineRenderField);
    const decs2 = collect(set2);

    const newDoc = nextState.doc.toString();
    const blocks2 = parseBlocks(newDoc);
    expect(decs2).toHaveLength(1);
    const widget = decs2[0].widget as RenderedBlockWidget;
    expect(widget.raw).toBe(blocks2[0].raw); // AC#6: raw соответствует новому содержимому
  });

  it("добавление блока в начало: диапазоны всех декораций корректны после сдвига", () => {
    const initialDoc = "Параграф.\n";
    const { state } = makeState(initialDoc);

    const prefix = "# Заголовок\n\n";
    const nextState = state.update({
      changes: { from: 0, insert: prefix },
    }).state;
    const set2: DecorationSet = nextState.field(inlineRenderField);
    const decs2 = collect(set2);

    const newDoc = nextState.doc.toString();
    const blocks2 = parseBlocks(newDoc);
    expect(decs2).toHaveLength(blocks2.length); // AC#6: два блока
    for (let i = 0; i < blocks2.length; i++) {
      const block = blocks2[i];
      const expected = expectedRange(block.raw, block.from, block.to);
      expect(decs2[i].from).toBe(expected.from); // AC#6 + AC#3: from после сдвига
      expect(decs2[i].to).toBe(expected.to); // AC#6 + AC#3: to после сдвига
    }
  });
});

// ===========================================================================
// 9. RenderedBlockWidget.eq()
// ===========================================================================

describe("RenderedBlockWidget.eq()", () => {
  it("eq: одинаковые raw и type → true", () => {
    const a = new RenderedBlockWidget("# Hello\n", "heading");
    const b = new RenderedBlockWidget("# Hello\n", "heading");
    expect(a.eq(b)).toBe(true); // контракт eq: совпадают raw И type
  });

  it("eq: разный raw, одинаковый type → false", () => {
    const a = new RenderedBlockWidget("# Hello\n", "heading");
    const b = new RenderedBlockWidget("# World\n", "heading");
    expect(a.eq(b)).toBe(false); // контракт eq: разный raw
  });

  it("eq: одинаковый raw, разный type → false", () => {
    const a = new RenderedBlockWidget("текст\n", "paragraph");
    const b = new RenderedBlockWidget("текст\n", "list");
    expect(a.eq(b)).toBe(false); // контракт eq: разный type
  });

  it("eq: разный raw и разный type → false", () => {
    const a = new RenderedBlockWidget("# H\n", "heading");
    const b = new RenderedBlockWidget("текст\n", "paragraph");
    expect(a.eq(b)).toBe(false); // контракт eq: ни raw, ни type не совпадают
  });

  it("eq: симметричность — a.eq(b) === b.eq(a)", () => {
    const a = new RenderedBlockWidget("# Hello\n", "heading");
    const b = new RenderedBlockWidget("# Hello\n", "heading");
    expect(a.eq(b)).toBe(b.eq(a)); // invariant: eq симметричен
  });

  it("eq: рефлексивность — a.eq(a) === true", () => {
    const a = new RenderedBlockWidget("# Hello\n", "heading");
    expect(a.eq(a)).toBe(true); // invariant: eq рефлексивен
  });

  it("eq: unicode raw совпадает → true", () => {
    // edge case: unicode в raw
    const a = new RenderedBlockWidget("Привет мир\n", "paragraph");
    const b = new RenderedBlockWidget("Привет мир\n", "paragraph");
    expect(a.eq(b)).toBe(true); // invariant: unicode не ломает eq
  });

  it("eq: пустой raw у обоих → true (edge case: пустая строка)", () => {
    // edge case: пустой raw (нестандартная ситуация)
    const a = new RenderedBlockWidget("", "paragraph");
    const b = new RenderedBlockWidget("", "paragraph");
    expect(a.eq(b)).toBe(true); // edge case: empty raw
  });
});

// ===========================================================================
// 10. RenderedBlockWidget.ignoreEvent()
// ===========================================================================

describe("RenderedBlockWidget.ignoreEvent()", () => {
  it("ignoreEvent() возвращает false для заголовка", () => {
    const w = new RenderedBlockWidget("# H\n", "heading");
    expect(w.ignoreEvent()).toBe(false); // контракт: ignoreEvent → false
  });

  it("ignoreEvent() возвращает false для параграфа", () => {
    const w = new RenderedBlockWidget("текст\n", "paragraph");
    expect(w.ignoreEvent()).toBe(false); // контракт: ignoreEvent → false
  });

  it("ignoreEvent() возвращает false для code_fence", () => {
    const w = new RenderedBlockWidget("```js\ncode\n```\n", "code_fence");
    expect(w.ignoreEvent()).toBe(false); // контракт: ignoreEvent → false
  });
});

// ===========================================================================
// 11. RenderedBlockWidget.toDOM()
// ===========================================================================

describe("RenderedBlockWidget.toDOM()", () => {
  it("toDOM() возвращает HTMLElement", () => {
    const w = new RenderedBlockWidget("# Hello\n", "heading");
    const el = w.toDOM();
    expect(el).toBeInstanceOf(HTMLElement); // контракт: toDOM() → HTMLElement
  });

  it("toDOM() для заголовка # Hello: содержит <h1>", () => {
    const w = new RenderedBlockWidget("# Hello\n", "heading");
    const el = w.toDOM();
    // Проверяем наличие h1 через querySelector
    expect(el.querySelector("h1")).not.toBeNull(); // контракт toDOM: heading → <h1>
  });

  it("toDOM() для заголовка ## Подзаголовок: содержит <h2>", () => {
    const w = new RenderedBlockWidget("## Подзаголовок\n", "heading");
    const el = w.toDOM();
    expect(el.querySelector("h2")).not.toBeNull(); // контракт toDOM: ## → <h2>
  });

  it("toDOM() для параграфа с **bold**: содержит <strong>", () => {
    const w = new RenderedBlockWidget("**жирный текст**\n", "paragraph");
    const el = w.toDOM();
    expect(el.querySelector("strong")).not.toBeNull(); // контракт toDOM: **text** → <strong>
  });

  it("toDOM() для параграфа с _italic_: содержит <em>", () => {
    const w = new RenderedBlockWidget("_курсив_\n", "paragraph");
    const el = w.toDOM();
    expect(el.querySelector("em")).not.toBeNull(); // контракт toDOM: _text_ → <em>
  });

  it("toDOM() для code_fence: содержит <code> или <pre>", () => {
    const w = new RenderedBlockWidget(
      "```js\nconst x = 1;\n```\n",
      "code_fence",
    );
    const el = w.toDOM();
    const hasCode =
      el.querySelector("code") !== null || el.querySelector("pre") !== null;
    expect(hasCode).toBe(true); // контракт toDOM: code_fence → <code>/<pre>
  });

  it("toDOM() для blockquote: содержит <blockquote>", () => {
    const w = new RenderedBlockWidget("> цитата\n", "blockquote");
    const el = w.toDOM();
    expect(el.querySelector("blockquote")).not.toBeNull(); // контракт toDOM: blockquote → <blockquote>
  });

  it("toDOM() для hr: содержит <hr>", () => {
    const w = new RenderedBlockWidget("---\n", "hr");
    const el = w.toDOM();
    expect(el.querySelector("hr")).not.toBeNull(); // контракт toDOM: hr → <hr>
  });

  it("toDOM() для table: содержит <table>", () => {
    const w = new RenderedBlockWidget(
      "| a | b |\n| --- | --- |\n| 1 | 2 |\n",
      "table",
    );
    const el = w.toDOM();
    expect(el.querySelector("table")).not.toBeNull(); // контракт toDOM: table → <table>
  });

  it("toDOM() для list (unordered): содержит <ul>", () => {
    const w = new RenderedBlockWidget("- a\n- b\n", "list");
    const el = w.toDOM();
    expect(el.querySelector("ul")).not.toBeNull(); // контракт toDOM: unordered list → <ul>
  });

  it("toDOM() для list (ordered): содержит <ol>", () => {
    const w = new RenderedBlockWidget("1. один\n2. два\n", "list");
    const el = w.toDOM();
    expect(el.querySelector("ol")).not.toBeNull(); // контракт toDOM: ordered list → <ol>
  });

  it("toDOM() для параграфа с Unicode: не ломается, innerHTML не пустой", () => {
    // edge case: unicode в содержимом
    const w = new RenderedBlockWidget("Привет мир 🎉\n", "paragraph");
    const el = w.toDOM();
    expect(el.innerHTML).not.toBe(""); // edge case: unicode
    expect(el.innerHTML.length).toBeGreaterThan(0);
  });

  it("toDOM() для очень длинной строки: возвращает HTMLElement без исключения", () => {
    // edge case: большая строка
    const longText = "A".repeat(5000) + "\n";
    const w = new RenderedBlockWidget(longText, "paragraph");
    expect(() => w.toDOM()).not.toThrow(); // edge case: большой размер входа
  });
});

// ===========================================================================
// 12. Безопасность: XSS-защита (SENAR fail-closed)
// ===========================================================================

describe("Безопасность: toDOM() не вставляет живой <script> из исходника", () => {
  it("параграф с <script>alert(1)</script>: querySelector('script') === null", () => {
    // negative: сырой HTML со script не должен исполняться
    const raw = "Текст <script>alert(1)</script> ещё\n";
    const w = new RenderedBlockWidget(raw, "paragraph");
    const el = w.toDOM();
    expect(el.querySelector("script")).toBeNull(); // negative: живого <script> нет
  });

  it("html_block с <script>: querySelector('script') === null", () => {
    // negative: html_block со script-тегом — тоже экранируется или удаляется
    const raw = "<script>alert(1)</script>\n";
    const w = new RenderedBlockWidget(raw, "html_block");
    const el = w.toDOM();
    expect(el.querySelector("script")).toBeNull(); // negative: живого <script> нет в html_block
  });

  it("параграф с <script>: innerHTML содержит экранированную форму, а не живой тег", () => {
    // negative: проверяем экранирование через &lt;script&gt;
    const raw = "Текст <script>alert(1)</script> ещё\n";
    const w = new RenderedBlockWidget(raw, "paragraph");
    const el = w.toDOM();
    // Либо экранирован (содержит &lt;script&gt;), либо полностью удалён (нет '<script>')
    const hasLiveScript = el.innerHTML.toLowerCase().includes("<script>");
    expect(hasLiveScript).toBe(false); // negative: живой тег script отсутствует в innerHTML
  });

  it("параграф с onerror-атрибутом в img: атрибут безопасно обработан", () => {
    // negative: XSS через onerror
    const raw = "![x](<img onerror=alert(1)>)\n";
    const w = new RenderedBlockWidget(raw, "paragraph");
    const el = w.toDOM();
    // Не должно быть живого onerror-атрибута на img
    const imgs = el.querySelectorAll("img[onerror]");
    expect(imgs.length).toBe(0); // negative: onerror не попадает в DOM
  });
});

// ===========================================================================
// 13. Инварианты набора декораций (по всему документу)
// ===========================================================================

describe("Инварианты: структурные свойства набора декораций", () => {
  it("invariant: from каждой декорации >= 0", () => {
    const doc = "# H\n\nP.\n\n- x\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    for (const dec of decs) {
      expect(dec.from).toBeGreaterThanOrEqual(0); // invariant: from >= 0
    }
  });

  it("invariant: to каждой декорации <= длина документа", () => {
    const doc = "# H\n\nP.\n\n- x\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    for (const dec of decs) {
      expect(dec.to).toBeLessThanOrEqual(doc.length); // invariant: to <= doc.length
    }
  });

  it("invariant: from < to для каждой декорации (ненулевой диапазон)", () => {
    const doc = "# H\n\nP.\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    for (const dec of decs) {
      expect(dec.from).toBeLessThan(dec.to); // invariant: from < to
    }
  });

  it("invariant: декорации не перекрываются (to[i] <= from[i+1])", () => {
    const doc = "# H\n\nP.\n\n- x\n\n---\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    for (let i = 1; i < decs.length; i++) {
      expect(decs[i - 1].to).toBeLessThanOrEqual(decs[i].from); // invariant: нет перекрытий
    }
  });

  it("invariant: widget.raw всегда является строкой", () => {
    const doc = "# H\n\nP.\n\n- x\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    for (const dec of decs) {
      const widget = dec.widget as RenderedBlockWidget;
      expect(typeof widget.raw).toBe("string"); // invariant: raw — строка
    }
  });

  it("invariant: widget.type — одно из допустимых значений BlockType", () => {
    const validTypes = new Set([
      "heading",
      "paragraph",
      "list",
      "code_fence",
      "blockquote",
      "table",
      "hr",
      "html_block",
      "reference",
    ]);
    const doc = "# H\n\nP.\n\n- x\n\n```\ncode\n```\n\n> q\n\n---\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    for (const dec of decs) {
      const widget = dec.widget as RenderedBlockWidget;
      expect(validTypes.has(widget.type)).toBe(true); // invariant: type — допустимое значение
    }
  });
});

// ===========================================================================
// 14. Edge cases
// ===========================================================================

describe("Edge cases", () => {
  it("edge case: один символ как параграф → одна декорация", () => {
    // edge case: single char
    const doc = "A";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(blocks.length); // edge case: single char
  });

  it("edge case: только заголовок без \\n в конце (EOF сразу)", () => {
    // edge case: нет завершающего \n
    const doc = "# Заголовок";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(blocks.length); // edge case: нет \n в конце
    if (decs.length > 0) {
      const block = blocks[0];
      const expected = expectedRange(block.raw, block.from, block.to);
      expect(decs[0].from).toBe(expected.from);
      expect(decs[0].to).toBe(expected.to); // edge case: to без \n = block.to
    }
  });

  it("edge case: кириллический параграф → декорация с корректным raw", () => {
    // edge case: unicode (кириллица)
    const doc = "Привет, мир!\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(1);
    const widget = decs[0].widget as RenderedBlockWidget;
    expect(widget.raw).toBe(blocks[0].raw); // edge case: unicode в raw
  });

  it("edge case: параграф с emoji → декорация создаётся без исключения", () => {
    // edge case: unicode emoji
    const doc = "Привет 🎉🚀\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(blocks.length); // edge case: emoji
  });

  it("edge case: несколько заголовков разных уровней → по одной декорации на каждый", () => {
    // edge case: repeated block type
    const doc = "# H1\n\n## H2\n\n### H3\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(blocks.length); // edge case: повторяющийся тип
    expect(decs).toHaveLength(3);
    for (const dec of decs) {
      const widget = dec.widget as RenderedBlockWidget;
      expect(widget.type).toBe("heading"); // edge case: все три — heading
    }
  });

  it("edge case: список сразу после заголовка (без пустой строки) → блоки определяются parseBlocks", () => {
    // edge case: tight sequence (нет пустой строки между блоками)
    const doc = "# H\n- a\n- b\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    // Мы не хардкодим ожидания парсера — сверяемся с parseBlocks
    expect(decs).toHaveLength(blocks.length); // edge case: tight layout
    for (let i = 0; i < blocks.length; i++) {
      const widget = decs[i].widget as RenderedBlockWidget;
      expect(widget.raw).toBe(blocks[i].raw); // edge case: raw совпадает
    }
  });

  it("edge case: blockquote с многострочным содержимым → одна декорация", () => {
    // edge case: multi-line blockquote
    const doc = "> строка 1\n> строка 2\n> строка 3\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(blocks.length); // edge case: multi-line blockquote
    if (blocks.length === 1) {
      expect(decs[0].widget).toBeInstanceOf(RenderedBlockWidget);
      const widget = decs[0].widget as RenderedBlockWidget;
      expect(widget.type).toBe("blockquote"); // edge case: тип blockquote
    }
  });

  it("edge case: code_fence без языка → декорация с type code_fence", () => {
    // edge case: code fence без идентификатора языка
    const doc = "```\ntext\n```\n";
    const { set } = makeState(doc);
    const decs = collect(set);
    const blocks = parseBlocks(doc);
    expect(decs).toHaveLength(blocks.length);
    const widget = decs[0].widget as RenderedBlockWidget;
    expect(widget.type).toBe("code_fence"); // edge case: no lang id
  });

  it("edge case: __clearRenderCache() изолирует состояние между тестами — два вызова makeState идемпотентны", () => {
    // invariant: кэш не переносит стейт между вызовами
    const doc = "# Hello\n";
    const { set: set1 } = makeState(doc);
    __clearRenderCache();
    const { set: set2 } = makeState(doc);
    const decs1 = collect(set1);
    const decs2 = collect(set2);
    // Оба набора должны содержать одинаковое количество декораций
    expect(decs1).toHaveLength(decs2.length); // invariant: кэш не ломает идемпотентность
    if (decs1.length > 0 && decs2.length > 0) {
      const w1 = decs1[0].widget as RenderedBlockWidget;
      const w2 = decs2[0].widget as RenderedBlockWidget;
      expect(w1.raw).toBe(w2.raw); // invariant: raw одинаков после clearCache
      expect(w1.type).toBe(w2.type); // invariant: type одинаков после clearCache
    }
  });
});
