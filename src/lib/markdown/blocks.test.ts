import { describe, it, expect } from "vitest";
import { parseBlocks, type Block } from "./blocks";

/**
 * Утилита: для каждого блока должно выполняться
 *  - 0 <= from < to <= source.length
 *  - raw === source.slice(from, to)
 *  - блоки отсортированы по from
 *  - блоки не перекрываются
 */
function assertBlocksInvariants(source: string, blocks: Block[]): void {
  let prevTo = -1;
  for (const b of blocks) {
    expect(b.from).toBeGreaterThanOrEqual(0);
    expect(b.from).toBeLessThan(b.to);
    expect(b.to).toBeLessThanOrEqual(source.length);
    expect(b.raw).toBe(source.slice(b.from, b.to));
    expect(b.from).toBeGreaterThanOrEqual(prevTo);
    prevTo = b.to;
  }
}

describe("parseBlocks()", () => {
  // ============================================================
  // Negative / empty cases
  // ============================================================

  it("возвращает [] для пустого источника", () => {
    expect(parseBlocks("")).toEqual([]);
  });

  it("возвращает [] для источника из пробелов и переводов строк", () => {
    expect(parseBlocks("   \n\n  \n")).toEqual([]);
    expect(parseBlocks("\n\n\n")).toEqual([]);
    expect(parseBlocks("\t  \t")).toEqual([]);
  });

  // ============================================================
  // Singular blocks
  // ============================================================

  it("парсит один параграф", () => {
    const src = "Просто текст.\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[0].raw).toBe("Просто текст.\n");
  });

  it("парсит heading + paragraph как два блока", () => {
    const src = "# Заголовок\n\nАбзац после.\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("heading");
    expect(blocks[0].raw).toBe("# Заголовок\n");
    expect(blocks[1].type).toBe("paragraph");
    expect(blocks[1].raw).toBe("Абзац после.\n");
  });

  it("парсит ordered и unordered list как отдельные блоки", () => {
    const src = "- a\n- b\n\n1. one\n2. two\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("list");
    expect(blocks[0].raw).toBe("- a\n- b\n");
    expect(blocks[1].type).toBe("list");
    expect(blocks[1].raw).toBe("1. one\n2. two\n");
  });

  it("вложенный список с кодом — один блок list со всем содержимым в raw", () => {
    const src = "- top\n\n  ```js\n  const x = 1;\n  ```\n\n- next\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("list");
    expect(blocks[0].raw).toContain("- top");
    expect(blocks[0].raw).toContain("```js");
    expect(blocks[0].raw).toContain("- next");
  });

  it("парсит fenced code block с языком — один code_fence, включая заборы", () => {
    const src = "```js\nconst x = 1;\nconsole.log(x);\n```\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("code_fence");
    expect(blocks[0].raw).toBe("```js\nconst x = 1;\nconsole.log(x);\n```\n");
  });

  it("парсит blockquote, занимающий несколько строк, как один блок", () => {
    const src = "> первая строка\n> вторая строка\n> третья строка\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("blockquote");
    expect(blocks[0].raw).toBe(src);
  });

  it("парсит GFM-таблицу как один блок table", () => {
    const src = "| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("table");
    expect(blocks[0].raw).toBe(src);
  });

  it("парсит горизонтальную линию как hr", () => {
    const src = "---\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("hr");
    expect(blocks[0].raw).toBe("---\n");
  });

  it("парсит html_block (`<div>`) как один блок html_block", () => {
    const src = "<div>\n  hello\n</div>\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("html_block");
    expect(blocks[0].raw).toBe(src);
  });

  it("парсит reference link определение как блок reference", () => {
    const src = '[foo]: https://example.com "title"\n';
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("reference");
    expect(blocks[0].raw).toBe(src);
  });

  it("парсит reference без title как блок reference", () => {
    const src = "[bar]: https://example.com/bar\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("reference");
  });

  it("парсит reference с title на следующей строке", () => {
    const src = '[baz]: https://example.com\n  "Long title here"\n';
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("reference");
    expect(blocks[0].raw).toBe(src);
  });

  it("парсит indented code block как code_fence (4-пробельная нотация)", () => {
    const src = "Абзац.\n\n    indented code\n    line 2\n\nПосле.\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(3);
    expect(blocks[1].type).toBe("code_fence");
    expect(blocks[1].raw).toContain("indented code");
  });

  // ============================================================
  // Mixed / sequence
  // ============================================================

  it("в смешанном документе все типы блоков распознаются в правильном порядке", () => {
    const src = [
      "# H1",
      "",
      "Параграф.",
      "",
      "- li 1",
      "- li 2",
      "",
      "1. one",
      "2. two",
      "",
      "```js",
      "const x = 1;",
      "```",
      "",
      "> цитата",
      "",
      "| a | b |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "---",
      "",
      "<div>html</div>",
      "",
      "[ref]: https://example.com",
      "",
    ].join("\n");
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    const types = blocks.map((b) => b.type);
    expect(types).toEqual([
      "heading",
      "paragraph",
      "list",
      "list",
      "code_fence",
      "blockquote",
      "table",
      "hr",
      "html_block",
      "reference",
    ]);
  });

  // ============================================================
  // Edge cases
  // ============================================================

  it("корректно обрабатывает источник без завершающего \\n", () => {
    const src = "# H1\n\nАбзац";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(2);
    expect(blocks[1].type).toBe("paragraph");
    // Блок-параграф включает текст до конца файла; нет краха при отсутствии \n.
    expect(blocks[1].raw).toBe("Абзац");
  });

  it("байтовые офсеты точны при смешанных \\n и \\r\\n переводах строк", () => {
    const src = "# H1\r\n\r\nАбзац 1.\r\n\r\nАбзац 2.\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe("heading");
    expect(blocks[0].raw).toBe("# H1\r\n");
    expect(blocks[1].type).toBe("paragraph");
    expect(blocks[1].raw).toBe("Абзац 1.\r\n");
    expect(blocks[2].type).toBe("paragraph");
    expect(blocks[2].raw).toBe("Абзац 2.\n");
  });

  it("незакрытый fenced code block не валит парсер, raw совпадает с source.slice", () => {
    const src = "```js\nconst x = 1;\nstill in fence\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    // Markdown-it сам тянет fence до EOF — один блок code_fence.
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("code_fence");
  });

  it("очень большой ввод не падает (10 МБ синтетика)", () => {
    const unit = "# Заголовок\n\nКакой-то текст.\n\n";
    // 10 МБ ≈ 10 * 1024 * 1024 байт; unit ≈ 41 байт → ~256 000 повторений.
    const src = unit.repeat(256_000);
    const blocks = parseBlocks(src);
    expect(blocks.length).toBeGreaterThan(0);
    // Выборочная проверка инвариантов на ~500 блоках (первый, последний и
    // ~498 равномерно-распределённых). Полный пробег по 512 000+ блокам
    // занимает >15 секунд и не добавляет уверенности относительно выборки —
    // парсер детерминирован, и регрессии видны на любом sample.
    const step = Math.max(1, Math.floor(blocks.length / 500));
    const sample: Block[] = [];
    for (let i = 0; i < blocks.length; i += step) sample.push(blocks[i]);
    sample.push(blocks[blocks.length - 1]);
    assertBlocksInvariants(src, sample);
  });

  it("фиксированная нагрузка 5000 строк парсится без сбоев", () => {
    const lines: string[] = [];
    for (let i = 0; i < 5000; i++) {
      lines.push(`## Заголовок ${i}`);
      lines.push("");
      lines.push(`Абзац ${i} с **жирным** и _курсивом_.`);
      lines.push("");
    }
    const src = lines.join("\n");
    const blocks = parseBlocks(src);
    expect(blocks.length).toBeGreaterThan(9000); // 5000 headings + 5000 paragraphs
    // Инварианты по всем ~10 000 блокам — реальная корректность, не wall-clock.
    // Производительность мерим вручную/в perf-тестах (MDP-30), не в unit-тесте,
    // чтобы не флакать на медленных CI-агентах.
    assertBlocksInvariants(src, blocks);
  });

  // ============================================================
  // Boundaries between adjacent blocks
  // ============================================================

  it("пустая строка между блоками не принадлежит ни одному из них", () => {
    const src = "Первый абзац.\n\nВторой абзац.\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(2);
    // Первый блок заканчивается на байте после "Первый абзац.\n", не включает "\n" пустой строки.
    expect(blocks[0].raw).toBe("Первый абзац.\n");
    expect(blocks[1].raw).toBe("Второй абзац.\n");
    // Между ними точно один байт "\n", не принадлежащий блокам.
    expect(src.slice(blocks[0].to, blocks[1].from)).toBe("\n");
  });

  it("блоки отсортированы по from даже при вкраплении reference между параграфами", () => {
    const src = "Первый.\n\n[ref]: https://example.com\n\nВторой.\n";
    const blocks = parseBlocks(src);
    assertBlocksInvariants(src, blocks);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[1].type).toBe("reference");
    expect(blocks[2].type).toBe("paragraph");
    // Сортировка по from гарантирует, что reference между параграфами не "уехал" в конец.
    expect(blocks[0].from).toBeLessThan(blocks[1].from);
    expect(blocks[1].from).toBeLessThan(blocks[2].from);
  });
});
