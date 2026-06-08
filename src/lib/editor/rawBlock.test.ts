/**
 * Независимые тесты для MDP-13: активный raw-блок в inlineRender.
 * Написаны агентом test-writer по контракту, критериям приёмки и сигнатурам.
 * Реализация (inlineRender.ts) не читалась намеренно — структурная защита SENAR.
 *
 * Покрывает:
 *   - findBlockAt (чистая функция)
 *   - rawBlockField + setRawBlock (StateField + StateEffect)
 *   - inlineRenderField: пропускает активный raw-блок
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EditorState } from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import {
  inlineRender,
  inlineRenderField,
  rawBlockField,
  setRawBlock,
  findBlockAt,
  __clearRenderCache,
} from "$lib/editor/inlineRender";
import { parseBlocks } from "$lib/markdown/blocks";

// ---------------------------------------------------------------------------
// Вспомогательные функции
// ---------------------------------------------------------------------------

/** Создаёт EditorState с расширением inlineRender. */
function makeState(doc: string): EditorState {
  return EditorState.create({ doc, extensions: [inlineRender()] });
}

/** Собирает стартовые офсеты всех декораций из DecorationSet. */
function decoStarts(set: DecorationSet): number[] {
  const starts: number[] = [];
  const it = set.iter();
  while (it.value !== null) {
    starts.push(it.from);
    it.next();
  }
  return starts;
}

/** Считает число декораций в DecorationSet. */
function decoCount(set: DecorationSet): number {
  return decoStarts(set).length;
}

// ---------------------------------------------------------------------------
// beforeEach: сброс кэша рендера для изоляции тестов
// ---------------------------------------------------------------------------

beforeEach(() => {
  __clearRenderCache();
});

// ===========================================================================
// 1. findBlockAt — чистая функция
// ===========================================================================

describe("findBlockAt: поиск блока по позиции", () => {
  // Документ с тремя чёткими блоками: заголовок, параграф, список.
  const doc = [
    "# Заголовок",
    "",
    "Параграф текста.",
    "",
    "- пункт 1",
    "- пункт 2",
    "",
  ].join("\n");

  it("AC#1: позиция внутри блока (from < pos < to) возвращает этот блок", () => {
    const blocks = parseBlocks(doc);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    const b = blocks[0];
    // pos строго внутри первого блока
    const mid = b.from + Math.floor((b.to - b.from) / 2);
    const result = findBlockAt(doc, mid);
    expect(result).not.toBeNull(); // AC#1: блок найден
    expect(result!.from).toBe(b.from); // AC#1: тот же блок по from
    expect(result!.to).toBe(b.to); // AC#1: тот же блок по to
  });

  it("AC#2: граница pos === block.from возвращает блок", () => {
    const blocks = parseBlocks(doc);
    const b = blocks[0];
    const result = findBlockAt(doc, b.from);
    expect(result).not.toBeNull(); // AC#2: from включительно
    expect(result!.from).toBe(b.from); // AC#2: правильный блок
  });

  it("AC#2: граница pos === block.to возвращает блок", () => {
    const blocks = parseBlocks(doc);
    const b = blocks[0];
    const result = findBlockAt(doc, b.to);
    expect(result).not.toBeNull(); // AC#2: to включительно
    expect(result!.from).toBe(b.from); // AC#2: правильный блок
  });

  it("AC#2: граница pos === block.from для второго блока возвращает второй блок", () => {
    const blocks = parseBlocks(doc);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    const b = blocks[1];
    const result = findBlockAt(doc, b.from);
    expect(result).not.toBeNull(); // AC#2: from второго блока включительно
    expect(result!.from).toBe(b.from); // AC#2: второй блок по from
  });

  it("AC#3: позиция в пустой строке между блоками возвращает null", () => {
    const blocks = parseBlocks(doc);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    // Пустая строка между блоком 0 и блоком 1: позиция = b[0].to + 1
    // (block[0].to — это начало разделителя "\n\n"; позиция внутри него)
    // Надёжно: ищем позицию, которую не покрывает ни один блок.
    const coveredPositions = new Set<number>();
    for (const b of blocks) {
      for (let p = b.from; p <= b.to; p++) {
        coveredPositions.add(p);
      }
    }
    // Найдём первую позицию, не покрытую ни одним блоком
    let gapPos: number | null = null;
    for (let p = 0; p < doc.length; p++) {
      if (!coveredPositions.has(p)) {
        gapPos = p;
        break;
      }
    }
    if (gapPos === null) {
      // Если пробелов нет в этом документе — пропускаем assertion (нечем проверить)
      return;
    }
    const result = findBlockAt(doc, gapPos);
    expect(result).toBeNull(); // AC#3: пробел между блоками → null
  });

  it("AC#4: пустой документ — null для позиции 0", () => {
    const result = findBlockAt("", 0);
    expect(result).toBeNull(); // AC#4: пустой doc → null
  });

  it("AC#4: whitespace-only документ — null для любой позиции", () => {
    const ws = "   \n   \n   ";
    expect(findBlockAt(ws, 0)).toBeNull(); // AC#4: whitespace-only, pos=0
    expect(findBlockAt(ws, 4)).toBeNull(); // AC#4: whitespace-only, pos=4
    expect(findBlockAt(ws, ws.length)).toBeNull(); // AC#4: whitespace-only, pos=len
  });

  it("AC#5: многоблочный документ — для позиций в разных блоках возвращает разные блоки", () => {
    const blocks = parseBlocks(doc);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    const b0 = blocks[0];
    const b1 = blocks[1];
    // Позиции внутри двух разных блоков
    const pos0 = b0.from + 1;
    const pos1 = b1.from + 1;
    const r0 = findBlockAt(doc, pos0);
    const r1 = findBlockAt(doc, pos1);
    expect(r0).not.toBeNull(); // AC#5: блок 0 найден
    expect(r1).not.toBeNull(); // AC#5: блок 1 найден
    expect(r0!.from).toBe(b0.from); // AC#5: блок 0 правильный
    expect(r1!.from).toBe(b1.from); // AC#5: блок 1 правильный
    expect(r0!.from).not.toBe(r1!.from); // AC#5: это разные блоки
  });

  it("AC#5: для позиции внутри третьего блока возвращается третий блок", () => {
    const blocks = parseBlocks(doc);
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    const b2 = blocks[2];
    const pos = b2.from + 1;
    const result = findBlockAt(doc, pos);
    expect(result).not.toBeNull(); // AC#5: третий блок найден
    expect(result!.from).toBe(b2.from); // AC#5: третий блок правильный
  });

  it("edge case: документ из одного символа — findBlockAt(doc, 0) находит блок", () => {
    const d = "A";
    const blocks = parseBlocks(d);
    if (blocks.length > 0) {
      const result = findBlockAt(d, 0);
      expect(result).not.toBeNull(); // edge case: single char
      expect(result!.from).toBe(blocks[0].from);
    }
  });

  it("edge case: unicode-документ — findBlockAt корректен для кириллических позиций", () => {
    const d = "# Привет\n\nМир!\n";
    const blocks = parseBlocks(d);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    const b = blocks[0];
    const result = findBlockAt(d, b.from + 2);
    expect(result).not.toBeNull(); // edge case: unicode
    expect(result!.from).toBe(b.from);
  });
});

// ===========================================================================
// 2. rawBlockField + setRawBlock
// ===========================================================================

describe("rawBlockField: хранение активного raw-блока", () => {
  const doc = ["# Заголовок", "", "Параграф.", "", "- пункт"].join("\n") + "\n";

  it("AC#6: начальное значение rawBlockField === null", () => {
    const state = makeState(doc);
    expect(state.field(rawBlockField)).toBeNull(); // AC#6: начальный null
  });

  it("AC#7: после setRawBlock.of(B.from) поле === B.from", () => {
    const state = makeState(doc);
    const blocks = parseBlocks(doc);
    const b = blocks[0];
    const next = state.update({ effects: setRawBlock.of(b.from) }).state;
    expect(next.field(rawBlockField)).toBe(b.from); // AC#7: поле = B.from
  });

  it("AC#7: после setRawBlock.of(null) поле снова null", () => {
    const state = makeState(doc);
    const blocks = parseBlocks(doc);
    const b = blocks[0];
    const withRaw = state.update({ effects: setRawBlock.of(b.from) }).state;
    expect(withRaw.field(rawBlockField)).toBe(b.from); // промежуточная проверка
    const reset = withRaw.update({ effects: setRawBlock.of(null) }).state;
    expect(reset.field(rawBlockField)).toBeNull(); // AC#7: сброс → null
  });

  it("AC#7: переключение между двумя блоками", () => {
    const state = makeState(doc);
    const blocks = parseBlocks(doc);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    const b0 = blocks[0];
    const b1 = blocks[1];
    const s1 = state.update({ effects: setRawBlock.of(b0.from) }).state;
    expect(s1.field(rawBlockField)).toBe(b0.from); // AC#7: первый блок активен
    const s2 = s1.update({ effects: setRawBlock.of(b1.from) }).state;
    expect(s2.field(rawBlockField)).toBe(b1.from); // AC#7: переключились на второй
  });

  it("AC#8: после вставки текста в начало документа rawBlockField сдвигается вместе с блоком", () => {
    // Задаём raw-блок (второй блок), затем вставляем текст в начало.
    // Поле должно сдвинуться так, чтобы снова указывать на начало того же блока.
    const state = makeState(doc);
    const blocksBefore = parseBlocks(doc);
    expect(blocksBefore.length).toBeGreaterThanOrEqual(2);
    const secondBlockFrom = blocksBefore[1].from;

    // Активируем второй блок
    const withRaw = state.update({
      effects: setRawBlock.of(secondBlockFrom),
    }).state;

    // Вставляем текст в начало
    const insertion = "вставка\n\n";
    const afterInsert = withRaw.update({
      changes: { from: 0, insert: insertion },
    }).state;

    // Определяем новый from второго блока через parseBlocks нового документа
    const newDoc = afterInsert.doc.toString();
    const blocksAfter = parseBlocks(newDoc);
    expect(blocksAfter.length).toBeGreaterThanOrEqual(2);
    // "Второй блок по смыслу" — тот, чей raw совпадает с raw второго блока до вставки
    const expectedRaw = blocksBefore[1].raw;
    const newBlock = blocksAfter.find((b) => b.raw === expectedRaw);
    expect(newBlock).not.toBeUndefined(); // AC#8: блок с тем же raw присутствует
    const newFrom = newBlock!.from;

    const fieldValue = afterInsert.field(rawBlockField);
    expect(fieldValue).toBe(newFrom); // AC#8: поле сдвинулось = from блока в новом документе
  });

  it("AC#8: после вставки текста перед активным блоком поле не равно старому from", () => {
    // Вставка в начало сдвигает все блоки — поле не должно остаться на старом значении
    const state = makeState(doc);
    const blocksBefore = parseBlocks(doc);
    expect(blocksBefore.length).toBeGreaterThanOrEqual(2);
    const b = blocksBefore[1];

    const withRaw = state.update({ effects: setRawBlock.of(b.from) }).state;
    const insertion = "новый блок\n\n";
    const afterInsert = withRaw.update({
      changes: { from: 0, insert: insertion },
    }).state;

    const fieldValue = afterInsert.field(rawBlockField);
    // Вставка сдвинула второй блок вперёд — старое значение b.from уже неверно
    expect(fieldValue).not.toBe(b.from); // AC#8: старый from устарел после сдвига
  });
});

// ===========================================================================
// 3. inlineRenderField: пропускает активный raw-блок
// ===========================================================================

describe("inlineRenderField: набор декораций при активном raw-блоке", () => {
  // Документ с несколькими блоками (все дают декорации)
  const doc = [
    "# Заголовок",
    "",
    "Параграф один.",
    "",
    "Параграф два.",
    "",
    "- пункт А",
    "- пункт Б",
    "",
  ].join("\n");

  it("AC#9: изначально (raw=null) число декораций === числу блоков parseBlocks", () => {
    const state = makeState(doc);
    const set = state.field(inlineRenderField);
    const blocks = parseBlocks(doc);
    expect(decoCount(set)).toBe(blocks.length); // AC#9: ровно по блоку
  });

  it("AC#9: изначально стартовые позиции декораций включают from каждого блока", () => {
    const state = makeState(doc);
    const set = state.field(inlineRenderField);
    const blocks = parseBlocks(doc);
    const starts = decoStarts(set);
    for (const b of blocks) {
      expect(starts).toContain(b.from); // AC#9: каждый блок представлен
    }
  });

  it("AC#10: после setRawBlock.of(B.from) декорация с B.from отсутствует", () => {
    const state = makeState(doc);
    const blocks = parseBlocks(doc);
    const b = blocks[0];
    const next = state.update({ effects: setRawBlock.of(b.from) }).state;
    const set = next.field(inlineRenderField);
    const starts = decoStarts(set);
    expect(starts).not.toContain(b.from); // AC#10: активный блок убран из декораций
  });

  it("AC#10: после setRawBlock.of(B.from) общее число декораций на 1 меньше", () => {
    const state = makeState(doc);
    const blocks = parseBlocks(doc);
    const countBefore = decoCount(state.field(inlineRenderField));
    const b = blocks[1]; // второй блок
    const next = state.update({ effects: setRawBlock.of(b.from) }).state;
    const countAfter = decoCount(next.field(inlineRenderField));
    expect(countAfter).toBe(countBefore - 1); // AC#10: на одну декорацию меньше
  });

  it("AC#10: для каждого блока поочерёдно — при его активации декорация исчезает", () => {
    const blocks = parseBlocks(doc);
    for (const b of blocks) {
      __clearRenderCache();
      const state = makeState(doc);
      const next = state.update({ effects: setRawBlock.of(b.from) }).state;
      const starts = decoStarts(next.field(inlineRenderField));
      expect(starts).not.toContain(b.from); // AC#10: каждый блок при активации убирается
    }
  });

  it("AC#11: после setRawBlock.of(null) декорация на B.from восстановлена", () => {
    const state = makeState(doc);
    const blocks = parseBlocks(doc);
    const b = blocks[0];
    const withRaw = state.update({ effects: setRawBlock.of(b.from) }).state;
    const reset = withRaw.update({ effects: setRawBlock.of(null) }).state;
    const starts = decoStarts(reset.field(inlineRenderField));
    expect(starts).toContain(b.from); // AC#11: декорация восстановлена
  });

  it("AC#11: после setRawBlock.of(null) число декораций восстановлено", () => {
    const state = makeState(doc);
    const blocks = parseBlocks(doc);
    const countInitial = decoCount(state.field(inlineRenderField));
    const b = blocks[0];
    const withRaw = state.update({ effects: setRawBlock.of(b.from) }).state;
    const reset = withRaw.update({ effects: setRawBlock.of(null) }).state;
    expect(decoCount(reset.field(inlineRenderField))).toBe(countInitial); // AC#11: число восстановлено
  });

  it("AC#12: при активном B декорации всех остальных блоков на месте", () => {
    const state = makeState(doc);
    const blocks = parseBlocks(doc);
    const b = blocks[0]; // делаем первый блок активным
    const next = state.update({ effects: setRawBlock.of(b.from) }).state;
    const starts = decoStarts(next.field(inlineRenderField));
    for (const other of blocks) {
      if (other.from === b.from) continue;
      expect(starts).toContain(other.from); // AC#12: остальные блоки не тронуты
    }
  });

  it("AC#12: при активном среднем блоке крайние блоки сохраняют декорации", () => {
    const state = makeState(doc);
    const blocks = parseBlocks(doc);
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    const midIdx = Math.floor(blocks.length / 2);
    const bMid = blocks[midIdx];
    const bFirst = blocks[0];
    const bLast = blocks[blocks.length - 1];
    const next = state.update({ effects: setRawBlock.of(bMid.from) }).state;
    const starts = decoStarts(next.field(inlineRenderField));
    expect(starts).toContain(bFirst.from); // AC#12: первый блок на месте
    expect(starts).toContain(bLast.from); // AC#12: последний блок на месте
    expect(starts).not.toContain(bMid.from); // AC#10: средний убран
  });

  it("AC#12: ровно один блок отсутствует в декорациях при активном raw", () => {
    const state = makeState(doc);
    const blocks = parseBlocks(doc);
    const b = blocks[2];
    const next = state.update({ effects: setRawBlock.of(b.from) }).state;
    const starts = decoStarts(next.field(inlineRenderField));
    // Из всех блоков ровно один (b) не представлен
    const missing = blocks.filter((bl) => !starts.includes(bl.from));
    expect(missing).toHaveLength(1); // AC#12: ровно один блок пропущен
    expect(missing[0].from).toBe(b.from); // AC#12: пропущен именно активный
  });

  it("negative: setRawBlock.of(null) на изначально пустом rawBlock — декорации не меняются", () => {
    const state = makeState(doc);
    const blocks = parseBlocks(doc);
    const countBefore = decoCount(state.field(inlineRenderField));
    // Двойной сброс не должен ломать набор декораций
    const afterNull = state.update({ effects: setRawBlock.of(null) }).state;
    expect(decoCount(afterNull.field(inlineRenderField))).toBe(countBefore); // negative: двойной null безопасен
    for (const b of blocks) {
      expect(decoStarts(afterNull.field(inlineRenderField))).toContain(b.from); // negative: все блоки остаются
    }
  });

  it("edge case: документ из одного блока — при активации декорация пропадает, наборе 0 элементов", () => {
    const singleDoc = "# Единственный заголовок\n";
    __clearRenderCache();
    const state = makeState(singleDoc);
    const blocks = parseBlocks(singleDoc);
    expect(blocks).toHaveLength(1);
    const b = blocks[0];
    const next = state.update({ effects: setRawBlock.of(b.from) }).state;
    expect(decoCount(next.field(inlineRenderField))).toBe(0); // edge case: одиночный блок стал raw → 0 декораций
  });

  it("edge case: активируем последний блок из длинного документа — остальные на месте", () => {
    const state = makeState(doc);
    const blocks = parseBlocks(doc);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    const bLast = blocks[blocks.length - 1];
    const next = state.update({ effects: setRawBlock.of(bLast.from) }).state;
    const starts = decoStarts(next.field(inlineRenderField));
    expect(starts).not.toContain(bLast.from); // edge case: последний убран
    for (const b of blocks.slice(0, -1)) {
      expect(starts).toContain(b.from); // edge case: предыдущие не тронуты
    }
  });

  it("invariant: после любого setRawBlock число декораций = блоки - 1 (если raw !== null)", () => {
    const blocks = parseBlocks(doc);
    const totalBlocks = blocks.length;
    for (const b of blocks) {
      __clearRenderCache();
      const s = makeState(doc);
      const next = s.update({ effects: setRawBlock.of(b.from) }).state;
      expect(decoCount(next.field(inlineRenderField))).toBe(totalBlocks - 1); // invariant: N-1 декораций при активном raw
    }
  });
});
