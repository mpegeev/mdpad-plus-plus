/**
 * Контрактные тесты MDP-18: чистые функции блочного форматирования.
 * Написаны агентом test-writer по контракту, критериям приёмки и сигнатурам.
 * Реализация (format.ts) не читалась — структурная защита SENAR (правило 4).
 *
 * Покрывает:
 *   - setHeadingLevel  (установить/снять/сменить уровень ATX-заголовка)
 *   - indentListLines  (добавить 2 пробела к строкам-элементам списка)
 *   - outdentListLines (убрать до 2 пробелов с начала строк-элементов списка)
 *
 * Каждый тест проверяет text, from И to результата.
 * Комментарии ссылаются на критерии приёмки (AC#N), инварианты и edge case.
 */

import { describe, it, expect } from "vitest";
import { setHeadingLevel, indentListLines, outdentListLines } from "./format";
import type { FormatRange } from "./format";

// ---------------------------------------------------------------------------
// Вспомогательный хелпер: извлечь выделенный фрагмент из результата
// ---------------------------------------------------------------------------

function selected(result: FormatRange): string {
  return result.text.slice(result.from, result.to);
}

// ===========================================================================
// setHeadingLevel
// ===========================================================================

describe("setHeadingLevel — установка уровня ATX-заголовка", () => {
  // -----------------------------------------------------------------------
  // Обязательные кейсы из спецификации
  // -----------------------------------------------------------------------

  it("AC#1: применяет H1 к одиночной строке без заголовка", () => {
    // "hello", from=0, to=0 — каретка на строке → вся строка затронута
    const result = setHeadingLevel("hello", 0, 0, 1);
    expect(result.text).toBe("# hello"); // AC#1
    expect(result.from).toBe(0); // AC#1: начало затронутой строки
    expect(result.to).toBe(7); // AC#1: конец содержимого строки (без \n)
  });

  it("AC#1: каретка в середине строки затрагивает всю строку", () => {
    // "hello", from=2, to=2 — каретка внутри строки
    const result = setHeadingLevel("hello", 2, 2, 3);
    expect(result.text).toBe("### hello"); // AC#1
    expect(result.from).toBe(0); // AC#1: from = начало строки в новом тексте
    expect(result.to).toBe(9); // AC#1: to = конец содержимого строки
  });

  it("AC#1: смена уровня H1 → H3", () => {
    // "# hello", from=0, to=7
    const result = setHeadingLevel("# hello", 0, 7, 3);
    expect(result.text).toBe("### hello"); // AC#1: старый префикс снят, новый добавлен
    expect(result.from).toBe(0); // AC#1
    expect(result.to).toBe(9); // AC#1
  });

  it("AC#1: снятие заголовка H3 → параграф (level=0)", () => {
    // "### hello", from=0, to=9
    const result = setHeadingLevel("### hello", 0, 9, 0);
    expect(result.text).toBe("hello"); // AC#1: префикс полностью удалён
    expect(result.from).toBe(0); // AC#1
    expect(result.to).toBe(5); // AC#1
  });

  it("AC#1: идемпотентность — H2 применяется к уже H2", () => {
    // "## x", from=0, to=4
    const result = setHeadingLevel("## x", 0, 4, 2);
    expect(result.text).toBe("## x"); // AC#1: текст не изменился
    expect(result.from).toBe(0); // AC#1
    expect(result.to).toBe(4); // AC#1
  });

  it("AC#1: пустая строка + level>0 → решётки без висячего пробела", () => {
    // "", from=0, to=0 — content пустой → "#" (без пробела)
    const result = setHeadingLevel("", 0, 0, 1);
    expect(result.text).toBe("#"); // AC#1: нет висячего пробела
    expect(result.from).toBe(0); // AC#1
    expect(result.to).toBe(1); // AC#1
  });

  it("AC#1: пустая строка + level=0 → остаётся пустой", () => {
    const result = setHeadingLevel("", 0, 0, 0);
    expect(result.text).toBe(""); // AC#1
    expect(result.from).toBe(0); // AC#1
    expect(result.to).toBe(0); // AC#1
  });

  it("AC#1: '#' без пробела не является заголовком — оборачивается как текст", () => {
    // "#nospace" не совпадает с /^(#{1,6})(?:[ \t]+|$)/ → добавить "# " перед целым
    const result = setHeadingLevel("#nospace", 0, 0, 1);
    expect(result.text).toBe("# #nospace"); // AC#1: нет распознавания
    expect(result.from).toBe(0); // AC#1
    expect(result.to).toBe(10); // AC#1
  });

  it("AC#1: 7 решёток не являются заголовком — оборачиваются как текст", () => {
    // "####### x" — 7 '#' → не ATX-заголовок → content = "####### x"
    const result = setHeadingLevel("####### x", 0, 0, 1);
    expect(result.text).toBe("# ####### x"); // AC#1
    expect(result.from).toBe(0); // AC#1
    expect(result.to).toBe(11); // AC#1
  });

  it("AC#1: multi-line — обе строки в выделении получают заголовок H2", () => {
    // "hello\nworld", from=0, to=11 — две строки затронуты
    const result = setHeadingLevel("hello\nworld", 0, 11, 2);
    expect(result.text).toBe("## hello\n## world"); // AC#1: обе строки
    expect(result.from).toBe(0); // AC#1
    expect(result.to).toBe(17); // AC#1: конец "## world" = 17
  });

  it("AC#1: частичное multi-line выделение — только первые две строки затронуты", () => {
    // "a\nb\nc", from=0, to=3 → затронуты строки 'a' и 'b' (lineStart[1]=2, lineLen[1]=1, 2+1=3>=3)
    const result = setHeadingLevel("a\nb\nc", 0, 3, 1);
    expect(result.text).toBe("# a\n# b\nc"); // AC#1: строка 'c' не тронута
    expect(result.from).toBe(0); // AC#1
    expect(result.to).toBe(7); // AC#1: конец "# b" = 7
  });

  it("AC#1: снятие заголовка H6 → параграф", () => {
    // "###### x", from=0, to=8
    const result = setHeadingLevel("###### x", 0, 8, 0);
    expect(result.text).toBe("x"); // AC#1: все решётки убраны
    expect(result.from).toBe(0); // AC#1
    expect(result.to).toBe(1); // AC#1
  });

  it("AC#1: ведущие пробелы сохраняются при добавлении заголовка", () => {
    // "  text", from=0, to=0 → leadingWs="  ", rest="text"
    const result = setHeadingLevel("  text", 0, 0, 1);
    expect(result.text).toBe("  # text"); // AC#1: пробелы сохранены
    expect(result.from).toBe(0); // AC#1
    expect(result.to).toBe(8); // AC#1
  });

  // -----------------------------------------------------------------------
  // Дополнительные edge cases
  // -----------------------------------------------------------------------

  it("edge case: H6 — максимальный уровень заголовка", () => {
    const result = setHeadingLevel("text", 0, 4, 6);
    expect(result.text).toBe("###### text"); // edge case: level=6
    expect(result.from).toBe(0);
    expect(result.to).toBe(11);
  });

  it("edge case: смена H6 → H1", () => {
    const result = setHeadingLevel("###### text", 0, 11, 1);
    expect(result.text).toBe("# text"); // edge case: уменьшение уровня
    expect(result.from).toBe(0);
    expect(result.to).toBe(6);
  });

  it("edge case: ATX-заголовок с концевым пробелом в content — пробел сохраняется", () => {
    // "# hello " — content после снятия префикса = "hello " (пробел в конце)
    const result = setHeadingLevel("# hello ", 0, 8, 2);
    expect(result.text).toBe("## hello "); // edge case: trailing space в content
    expect(result.from).toBe(0);
    expect(result.to).toBe(9);
  });

  it("edge case: заголовок занимает только строку с #-токеном без контента", () => {
    // "# " — ATX с пустым content → content="" → при level=2 → "##"
    const result = setHeadingLevel("# ", 0, 2, 2);
    expect(result.text).toBe("##"); // edge case: пустой content после снятия "# "
    expect(result.from).toBe(0);
    expect(result.to).toBe(2);
  });

  it("edge case: заголовок tab-отступом перед решётками — ATX-распознавание с ведущим табом", () => {
    // "\t# title" → leadingWs="\t", rest="# title" → ATX → content="title"
    const result = setHeadingLevel("\t# title", 0, 8, 2);
    expect(result.text).toBe("\t## title"); // edge case: tab-отступ сохранён
    expect(result.from).toBe(0);
    expect(result.to).toBe(9);
  });

  it("edge case: unicode-символы в content — длина вычисляется по code units", () => {
    // "# 🎉" — content после снятия "# " = "🎉" (2 code units)
    const result = setHeadingLevel("# 🎉", 0, 4, 2);
    expect(result.text).toBe("## 🎉"); // edge case: emoji в content
    expect(result.from).toBe(0);
    expect(result.to).toBe(5);
  });

  it("edge case: снятие заголовка с unicode-content", () => {
    const result = setHeadingLevel("## Привет", 0, 9, 0);
    expect(result.text).toBe("Привет"); // edge case: unicode при level=0
    expect(result.from).toBe(0);
    expect(result.to).toBe(6);
  });

  it("edge case: H1 с табом как разделителем распознаётся как заголовок", () => {
    // "#\ttitle" → rest="#\ttitle" → /^(#{1,6})(?:[ \t]+|$)/ совпадёт → content="title"
    const result = setHeadingLevel("#\ttitle", 0, 7, 0);
    expect(result.text).toBe("title"); // edge case: таб-разделитель в ATX
    expect(result.from).toBe(0);
    expect(result.to).toBe(5);
  });

  it("edge case: три строки, каретка на средней — затронута только одна строка", () => {
    // "aaa\nbbb\nccc", from=5, to=5 — попадаем на строку "bbb"
    const result = setHeadingLevel("aaa\nbbb\nccc", 5, 5, 1);
    expect(result.text).toBe("aaa\n# bbb\nccc"); // edge case: только средняя строка
    expect(result.from).toBe(4); // edge case: from = начало строки "# bbb" в новом тексте
    expect(result.to).toBe(9); // edge case: to = конец "# bbb"
  });

  it("edge case: строка из одного символа '#' (без пробела после) уровень 0", () => {
    // "#" — не ATX (нет пробела/конца совпадения с контентом), level=0 → без изменений
    const result = setHeadingLevel("#", 0, 1, 0);
    expect(result.text).toBe("#"); // edge case: одиночный # не ATX
    expect(result.from).toBe(0);
    expect(result.to).toBe(1);
  });

  // -----------------------------------------------------------------------
  // Иммутабельность
  // -----------------------------------------------------------------------

  it("invariant: входная строка не мутируется", () => {
    const input = "## hello";
    const inputCopy = input;
    setHeadingLevel(input, 0, 8, 1);
    expect(input).toBe(inputCopy); // invariant: иммутабельность
  });

  // -----------------------------------------------------------------------
  // Структурные инварианты
  // -----------------------------------------------------------------------

  it("invariant: from <= to в результате", () => {
    const cases: Array<() => FormatRange> = [
      () => setHeadingLevel("hello", 0, 5, 1),
      () => setHeadingLevel("# hello", 0, 7, 0),
      () => setHeadingLevel("", 0, 0, 3),
      () => setHeadingLevel("a\nb", 0, 3, 2),
    ];
    for (const fn of cases) {
      const r = fn();
      expect(r.from).toBeLessThanOrEqual(r.to); // invariant: from<=to
    }
  });

  it("invariant: from и to не выходят за границы result.text", () => {
    const r = setHeadingLevel("hello\nworld", 0, 11, 2);
    expect(r.from).toBeGreaterThanOrEqual(0); // invariant: from>=0
    expect(r.to).toBeLessThanOrEqual(r.text.length); // invariant: to<=text.length
  });
});

// ===========================================================================
// indentListLines
// ===========================================================================

describe("indentListLines — добавление отступа к строкам-элементам списка", () => {
  // -----------------------------------------------------------------------
  // Обязательные кейсы из спецификации
  // -----------------------------------------------------------------------

  it("AC#2: маркерный список с '-' получает 2 пробела", () => {
    const result = indentListLines("- a", 0, 0);
    expect(result.text).toBe("  - a"); // AC#2
    expect(result.from).toBe(0); // AC#2
    expect(result.to).toBe(5); // AC#2
  });

  it("AC#2: нумерованный список 'N.' получает 2 пробела", () => {
    const result = indentListLines("1. a", 0, 0);
    expect(result.text).toBe("  1. a"); // AC#2
    expect(result.from).toBe(0); // AC#2
    expect(result.to).toBe(6); // AC#2
  });

  it("AC#2: не-список строка не изменяется", () => {
    const result = indentListLines("text", 0, 0);
    expect(result.text).toBe("text"); // AC#2: без изменений
    expect(result.from).toBe(0); // AC#2
    expect(result.to).toBe(4); // AC#2
  });

  it("AC#2: multi-line — обе строки-элементы списка получают отступ", () => {
    const result = indentListLines("- a\n- b", 0, 7);
    expect(result.text).toBe("  - a\n  - b"); // AC#2
    expect(result.from).toBe(0); // AC#2
    expect(result.to).toBe(11); // AC#2: конец "  - b" = 11
  });

  it("AC#2: смешанные строки — только список получает отступ", () => {
    // "- a\ntext": строка 0 — список, строка 1 — нет
    const result = indentListLines("- a\ntext", 0, 8);
    expect(result.text).toBe("  - a\ntext"); // AC#2: "text" без изменений
    expect(result.from).toBe(0); // AC#2
    expect(result.to).toBe(10); // AC#2: конец "text" в новом тексте = 10
  });

  it("AC#2: маркер '*' распознаётся как список", () => {
    const result = indentListLines("* x", 0, 0);
    expect(result.text).toBe("  * x"); // AC#2
    expect(result.from).toBe(0); // AC#2
    expect(result.to).toBe(5); // AC#2
  });

  it("AC#2: маркер '+' распознаётся как список", () => {
    const result = indentListLines("+ x", 0, 0);
    expect(result.text).toBe("  + x"); // AC#2
    expect(result.from).toBe(0); // AC#2
    expect(result.to).toBe(5); // AC#2
  });

  it("AC#2: нумерованный список с ')' распознаётся", () => {
    const result = indentListLines("2) x", 0, 0);
    expect(result.text).toBe("  2) x"); // AC#2
    expect(result.from).toBe(0); // AC#2
    expect(result.to).toBe(6); // AC#2
  });

  it("AC#2: дефис без пробела не является элементом списка", () => {
    const result = indentListLines("-no", 0, 0);
    expect(result.text).toBe("-no"); // AC#2: не список
    expect(result.from).toBe(0); // AC#2
    expect(result.to).toBe(3); // AC#2
  });

  it("AC#2: голый маркер '-' без контента — является списком", () => {
    // "-" совпадает с /^\s*[-*+](?:[ \t]|$)/ по $
    const result = indentListLines("-", 0, 0);
    expect(result.text).toBe("  -"); // AC#2: голый маркер — элемент списка
    expect(result.from).toBe(0); // AC#2
    expect(result.to).toBe(3); // AC#2
  });

  it("AC#2: уже вложенный элемент получает ещё 2 пробела", () => {
    const result = indentListLines("  - a", 0, 0);
    expect(result.text).toBe("    - a"); // AC#2: накапливается
    expect(result.from).toBe(0); // AC#2
    expect(result.to).toBe(7); // AC#2
  });

  // -----------------------------------------------------------------------
  // Дополнительные edge cases
  // -----------------------------------------------------------------------

  it("edge case: девятизначный номер в нумерованном списке — максимум 9 цифр", () => {
    // /^\s*\d{1,9}[.)]/ — 9 цифр допустимо
    const result = indentListLines("123456789. item", 0, 0);
    expect(result.text).toBe("  123456789. item"); // edge case: 9 цифр
    expect(result.from).toBe(0);
    expect(result.to).toBe(17);
  });

  it("edge case: 10-значный номер НЕ является элементом списка", () => {
    // /^\s*\d{1,9}[.)]/ — 10 цифр не совпадёт
    const result = indentListLines("1234567890. item", 0, 0);
    expect(result.text).toBe("1234567890. item"); // edge case: 10 цифр — не список
    expect(result.from).toBe(0);
    expect(result.to).toBe(16);
  });

  it("edge case: '* ' с табом после маркера — распознаётся как список", () => {
    // "*\titem" совпадает с /^\s*[-*+](?:[ \t]|$)/
    const result = indentListLines("*\titem", 0, 0);
    expect(result.text).toBe("  *\titem"); // edge case: таб после маркера
    expect(result.from).toBe(0);
    expect(result.to).toBe(8);
  });

  it("edge case: '1)\t' — нумерованный с табом распознаётся", () => {
    const result = indentListLines("1)\titem", 0, 0);
    expect(result.text).toBe("  1)\titem"); // edge case: таб после номера
    expect(result.from).toBe(0);
    expect(result.to).toBe(9);
  });

  it("edge case: строка только из пробелов — не список", () => {
    const result = indentListLines("   ", 0, 0);
    expect(result.text).toBe("   "); // edge case: только пробелы
    expect(result.from).toBe(0);
    expect(result.to).toBe(3);
  });

  it("edge case: unicode-контент в списке — длина правильная", () => {
    const result = indentListLines("- Привет", 0, 0);
    expect(result.text).toBe("  - Привет"); // edge case: unicode
    expect(result.from).toBe(0);
    expect(result.to).toBe(10);
  });

  it("edge case: три строки, только первая и третья — список", () => {
    // "- a\ntext\n* b": from=0, to=12
    const result = indentListLines("- a\ntext\n* b", 0, 12);
    expect(result.text).toBe("  - a\ntext\n  * b"); // edge case: пропуск не-списка
    expect(result.from).toBe(0);
    expect(result.to).toBe(16);
  });

  it("edge case: каретка в середине строки (from === to, не в начале) — строка всё равно затронута", () => {
    const result = indentListLines("- item", 2, 2);
    expect(result.text).toBe("  - item"); // edge case: from=to≠0
    expect(result.from).toBe(0);
    expect(result.to).toBe(8);
  });

  // -----------------------------------------------------------------------
  // Иммутабельность
  // -----------------------------------------------------------------------

  it("invariant: входная строка не мутируется", () => {
    const input = "- hello";
    const inputCopy = input;
    indentListLines(input, 0, 0);
    expect(input).toBe(inputCopy); // invariant: иммутабельность
  });

  // -----------------------------------------------------------------------
  // Структурные инварианты
  // -----------------------------------------------------------------------

  it("invariant: from <= to в результате", () => {
    const cases: Array<() => FormatRange> = [
      () => indentListLines("- a", 0, 3),
      () => indentListLines("text", 0, 4),
      () => indentListLines("- a\n- b", 0, 7),
    ];
    for (const fn of cases) {
      const r = fn();
      expect(r.from).toBeLessThanOrEqual(r.to); // invariant: from<=to
    }
  });

  it("invariant: from и to не выходят за границы result.text", () => {
    const r = indentListLines("- a\ntext\n* b", 0, 12);
    expect(r.from).toBeGreaterThanOrEqual(0); // invariant: from>=0
    expect(r.to).toBeLessThanOrEqual(r.text.length); // invariant: to<=text.length
  });
});

// ===========================================================================
// outdentListLines
// ===========================================================================

describe("outdentListLines — удаление отступа со строк-элементов списка", () => {
  // -----------------------------------------------------------------------
  // Обязательные кейсы из спецификации
  // -----------------------------------------------------------------------

  it("AC#3: удаляет 2 пробела из '  - a'", () => {
    const result = outdentListLines("  - a", 0, 0);
    expect(result.text).toBe("- a"); // AC#3
    expect(result.from).toBe(0); // AC#3
    expect(result.to).toBe(3); // AC#3
  });

  it("AC#3: удаляет ровно 2 из 4 ведущих пробелов", () => {
    const result = outdentListLines("    - a", 0, 0);
    expect(result.text).toBe("  - a"); // AC#3: 2 снято, 2 осталось
    expect(result.from).toBe(0); // AC#3
    expect(result.to).toBe(5); // AC#3
  });

  it("AC#3: 0 ведущих пробелов — без изменений", () => {
    const result = outdentListLines("- a", 0, 0);
    expect(result.text).toBe("- a"); // AC#3: нечего убирать
    expect(result.from).toBe(0); // AC#3
    expect(result.to).toBe(3); // AC#3
  });

  it("AC#3: 1 ведущий пробел — удаляется 1", () => {
    const result = outdentListLines(" - a", 0, 0);
    expect(result.text).toBe("- a"); // AC#3: удалён 1 пробел
    expect(result.from).toBe(0); // AC#3
    expect(result.to).toBe(3); // AC#3
  });

  it("AC#3: нумерованный список с 2 ведущими пробелами", () => {
    const result = outdentListLines("  1. a", 0, 0);
    expect(result.text).toBe("1. a"); // AC#3
    expect(result.from).toBe(0); // AC#3
    expect(result.to).toBe(4); // AC#3
  });

  it("AC#3: не-список строка с ведущими пробелами — без изменений", () => {
    const result = outdentListLines("  text", 0, 0);
    expect(result.text).toBe("  text"); // AC#3: не список — не трогаем
    expect(result.from).toBe(0); // AC#3
    expect(result.to).toBe(6); // AC#3
  });

  it("AC#3: multi-line — обе строки-элементы списка теряют 2 пробела", () => {
    const result = outdentListLines("  - a\n  - b", 0, 11);
    expect(result.text).toBe("- a\n- b"); // AC#3
    expect(result.from).toBe(0); // AC#3
    expect(result.to).toBe(7); // AC#3
  });

  it("AC#3: ведущий таб перед маркером — таб не снимается", () => {
    // "\t- a" → элемент списка (\s* совпадёт), но ведущий символ — таб, не пробел
    // min(2, 0 пробелов) = 0 → без изменений
    const result = outdentListLines("\t- a", 0, 0);
    expect(result.text).toBe("\t- a"); // AC#3: таб не снимается
    expect(result.from).toBe(0); // AC#3
    expect(result.to).toBe(4); // AC#3
  });

  // -----------------------------------------------------------------------
  // Дополнительные edge cases
  // -----------------------------------------------------------------------

  it("edge case: 3 ведущих пробела — снимаются только 2", () => {
    const result = outdentListLines("   - a", 0, 0);
    expect(result.text).toBe(" - a"); // edge case: min(2,3)=2
    expect(result.from).toBe(0);
    expect(result.to).toBe(4);
  });

  it("edge case: 6 ведущих пробелов — снимаются ровно 2", () => {
    const result = outdentListLines("      - a", 0, 0);
    expect(result.text).toBe("    - a"); // edge case: снято 2 из 6
    expect(result.from).toBe(0);
    expect(result.to).toBe(7);
  });

  it("edge case: маркер '*' с 2 ведущими пробелами", () => {
    const result = outdentListLines("  * x", 0, 0);
    expect(result.text).toBe("* x"); // edge case: маркер *
    expect(result.from).toBe(0);
    expect(result.to).toBe(3);
  });

  it("edge case: маркер '+' с 2 ведущими пробелами", () => {
    const result = outdentListLines("  + x", 0, 0);
    expect(result.text).toBe("+ x"); // edge case: маркер +
    expect(result.from).toBe(0);
    expect(result.to).toBe(3);
  });

  it("edge case: нумерованный ')' с 2 ведущими пробелами", () => {
    const result = outdentListLines("  2) x", 0, 0);
    expect(result.text).toBe("2) x"); // edge case: маркер )
    expect(result.from).toBe(0);
    expect(result.to).toBe(4);
  });

  it("edge case: смешанные строки — только список-строки теряют пробелы", () => {
    // "  - a\n  text\n  * b": строка 0 — список, строка 1 — нет, строка 2 — список
    const result = outdentListLines("  - a\n  text\n  * b", 0, 18);
    expect(result.text).toBe("- a\n  text\n* b"); // edge case: пропуск не-списка
    expect(result.from).toBe(0);
    expect(result.to).toBe(14);
  });

  it("edge case: outdent → indent round-trip восстанавливает исходный текст", () => {
    const original = "  - item";
    const outdented = outdentListLines(original, 0, original.length);
    expect(outdented.text).toBe("- item"); // edge case: round-trip шаг 1

    const reindented = indentListLines(
      outdented.text,
      0,
      outdented.text.length,
    );
    expect(reindented.text).toBe(original); // edge case: round-trip шаг 2
  });

  it("edge case: голый маркер '- ' без контента с 2 пробелами", () => {
    const result = outdentListLines("  - ", 0, 0);
    expect(result.text).toBe("- "); // edge case: голый маркер с пробелом
    expect(result.from).toBe(0);
    expect(result.to).toBe(2);
  });

  it("edge case: выделение результата — диапазон корректен даже без изменений", () => {
    // "- a" — 0 ведущих пробелов → текст не изменился, но from/to всё равно диапазон строки
    const result = outdentListLines("- a", 0, 3);
    expect(result.from).toBe(0); // edge case: from = начало строки
    expect(result.to).toBe(3); // edge case: to = конец строки
    expect(selected(result)).toBe("- a"); // edge case: выделение на строке
  });

  it("edge case: unicode-контент в списке с 2 ведущими пробелами", () => {
    const result = outdentListLines("  - Привет", 0, 0);
    expect(result.text).toBe("- Привет"); // edge case: unicode
    expect(result.from).toBe(0);
    expect(result.to).toBe(8);
  });

  it("edge case: каретка в середине строки — строка всё равно затронута", () => {
    const result = outdentListLines("  - item", 3, 3);
    expect(result.text).toBe("- item"); // edge case: from=to≠0
    expect(result.from).toBe(0);
    expect(result.to).toBe(6);
  });

  // -----------------------------------------------------------------------
  // Иммутабельность
  // -----------------------------------------------------------------------

  it("invariant: входная строка не мутируется", () => {
    const input = "  - hello";
    const inputCopy = input;
    outdentListLines(input, 0, 0);
    expect(input).toBe(inputCopy); // invariant: иммутабельность
  });

  // -----------------------------------------------------------------------
  // Структурные инварианты
  // -----------------------------------------------------------------------

  it("invariant: from <= to в результате", () => {
    const cases: Array<() => FormatRange> = [
      () => outdentListLines("  - a", 0, 5),
      () => outdentListLines("- a", 0, 3),
      () => outdentListLines("  text", 0, 6),
      () => outdentListLines("  - a\n  - b", 0, 11),
    ];
    for (const fn of cases) {
      const r = fn();
      expect(r.from).toBeLessThanOrEqual(r.to); // invariant: from<=to
    }
  });

  it("invariant: from и to не выходят за границы result.text", () => {
    const r = outdentListLines("  - a\n  text\n  * b", 0, 18);
    expect(r.from).toBeGreaterThanOrEqual(0); // invariant: from>=0
    expect(r.to).toBeLessThanOrEqual(r.text.length); // invariant: to<=text.length
  });
});
