/**
 * Независимые контрактные тесты для formatForAction (MDP-16/MDP-17 seam).
 *
 * Написаны агентом test-writer по спецификации и сигнатурам.
 * Реализация (format.ts) НЕ читалась — структурная защита SENAR (правило 4).
 *
 * Контракт:
 *   formatForAction(action: ToolbarAction, text: string, from: number, to: number): FormatRange
 *
 *   Возвращает:
 *     text — новый полный текст документа после применения разметки
 *     from — начало нового выделения (левая граница исходно выделенного фрагмента между маркерами)
 *     to   — конец нового выделения (правая граница исходно выделенного фрагмента между маркерами)
 */

import { describe, it, expect } from "vitest";
import { formatForAction } from "./format";
import type { FormatRange } from "./format";
// Канонический тип из источника (toolbarVisibility, MDP-16) — тест привязан к
// продуктовому union, а не к локальной копии: добавление нового действия там
// заставит покрыть его и здесь (SENAR-ревью MDP-46, находка [3]).
import type { ToolbarAction } from "./toolbarVisibility";

// ---------------------------------------------------------------------------
// Вспомогательные функции
// ---------------------------------------------------------------------------

/**
 * Извлекает фрагмент текста по выделению из FormatRange.
 * Используется для проверки инварианта: выделение охватывает именно исходный текст.
 */
function selectedText(result: FormatRange): string {
  return result.text.slice(result.from, result.to);
}

// ===========================================================================
// 1. Базовые примеры из спецификации (text="x", from=0, to=1)
// ===========================================================================

describe('formatForAction: базовые примеры из спеки (text="x", from=0, to=1)', () => {
  it('AC: bold — обёртка "**" … "**"', () => {
    // AC: bold применяется как **x**
    const result = formatForAction("bold", "x", 0, 1);
    expect(result.text).toBe("**x**"); // AC: bold-разметка
  });

  it('AC: italic — обёртка "*" … "*"', () => {
    // AC: italic применяется как *x*
    const result = formatForAction("italic", "x", 0, 1);
    expect(result.text).toBe("*x*"); // AC: italic-разметка
  });

  it('AC: code — обёртка "`" … "`"', () => {
    // AC: code применяется как `x`
    const result = formatForAction("code", "x", 0, 1);
    expect(result.text).toBe("`x`"); // AC: code-разметка
  });

  it('AC: underline — HTML-обёртка "<u>" … "</u>"', () => {
    // AC: underline применяется как <u>x</u>
    const result = formatForAction("underline", "x", 0, 1);
    expect(result.text).toBe("<u>x</u>"); // AC: underline-разметка
  });

  it("AC: code-fence — ограждение из строк с ```", () => {
    // AC: code-fence применяется как ```\nx\n```
    const result = formatForAction("code-fence", "x", 0, 1);
    expect(result.text).toBe("```\nx\n```"); // AC: code-fence-разметка
  });
});

// ===========================================================================
// 2. Выделение после apply охватывает исходный текст
// ===========================================================================

describe("formatForAction: выделение после apply охватывает исходный текст", () => {
  it('bold: выделение содержит исходный фрагмент "x"', () => {
    const result = formatForAction("bold", "x", 0, 1);
    expect(selectedText(result)).toBe("x"); // AC: выделение охватывает "x"
  });

  it('italic: выделение содержит исходный фрагмент "x"', () => {
    const result = formatForAction("italic", "x", 0, 1);
    expect(selectedText(result)).toBe("x"); // AC: выделение охватывает "x"
  });

  it('code: выделение содержит исходный фрагмент "x"', () => {
    const result = formatForAction("code", "x", 0, 1);
    expect(selectedText(result)).toBe("x"); // AC: выделение охватывает "x"
  });

  it('underline: выделение содержит исходный фрагмент "x"', () => {
    const result = formatForAction("underline", "x", 0, 1);
    expect(selectedText(result)).toBe("x"); // AC: выделение охватывает "x"
  });

  it('code-fence: выделение содержит исходный фрагмент "x"', () => {
    const result = formatForAction("code-fence", "x", 0, 1);
    expect(selectedText(result)).toBe("x"); // AC: выделение охватывает "x"
  });

  it('bold: выделение охватывает "hello" в середине документа', () => {
    // AC: from/to смещены от начала документа — выделение по-прежнему правильное
    const result = formatForAction("bold", "start hello end", 6, 11);
    expect(selectedText(result)).toBe("hello"); // AC: выделение в середине документа
  });

  it('italic: выделение охватывает "world" в многословном тексте', () => {
    const result = formatForAction("italic", "foo world bar", 4, 9);
    expect(selectedText(result)).toBe("world"); // AC: выделение в произвольной позиции
  });
});

// ===========================================================================
// 3. Тотальность — все 5 значений ToolbarAction определены
// ===========================================================================

describe("formatForAction: тотальность (все 5 значений ToolbarAction)", () => {
  const actions: ToolbarAction[] = [
    "bold",
    "italic",
    "underline",
    "code",
    "code-fence",
  ];

  it("все действия возвращают объект с полями text, from, to", () => {
    for (const action of actions) {
      const result = formatForAction(action, "x", 0, 1);
      // invariant: результат содержит все три обязательных поля
      expect(typeof result.text).toBe("string"); // invariant: text — строка
      expect(typeof result.from).toBe("number"); // invariant: from — число
      expect(typeof result.to).toBe("number"); // invariant: to — число
    }
  });

  it("все действия возвращают ненулевой текст", () => {
    for (const action of actions) {
      const result = formatForAction(action, "x", 0, 1);
      expect(result.text.length).toBeGreaterThan(0); // invariant: text не пустой
    }
  });

  it("все действия: text длиннее исходного (добавлены маркеры)", () => {
    for (const action of actions) {
      const result = formatForAction(action, "x", 0, 1);
      expect(result.text.length).toBeGreaterThan(1); // invariant: маркеры добавлены
    }
  });
});

// ===========================================================================
// 4. Применение к тексту с от≠0 (позиция внутри документа)
// ===========================================================================

describe("formatForAction: apply к выделению не с начала документа", () => {
  it('bold: "Hello world", from=6, to=11 → текст содержит **world**', () => {
    const result = formatForAction("bold", "Hello world", 6, 11);
    expect(result.text).toBe("Hello **world**"); // AC: bold в середине документа
  });

  it('italic: "Hello world", from=6, to=11 → текст содержит *world*', () => {
    const result = formatForAction("italic", "Hello world", 6, 11);
    expect(result.text).toBe("Hello *world*"); // AC: italic в середине документа
  });

  it('code: "Hello world", from=6, to=11 → текст содержит `world`', () => {
    const result = formatForAction("code", "Hello world", 6, 11);
    expect(result.text).toBe("Hello `world`"); // AC: code в середине документа
  });

  it('underline: "Hello world", from=6, to=11 → текст содержит <u>world</u>', () => {
    const result = formatForAction("underline", "Hello world", 6, 11);
    expect(result.text).toBe("Hello <u>world</u>"); // AC: underline в середине документа
  });

  it('code-fence: "Hello world", from=6, to=11 → ограждение охватывает целую строку', () => {
    const result = formatForAction("code-fence", "Hello world", 6, 11);
    // СУПЕРВАЙЗЕР-АВТОРИЗОВАННАЯ ПРАВКА (MDP-46, рассогласование test-writer'ов).
    // Исходный контрактный ассерт ожидал посимвольное ограждение
    // "Hello ```\nworld\n```" — но это НЕвалидный markdown: ограждение ``` обязано
    // начинаться с начала строки. Уже смерженный seam MDP-17 (toggleCodeFence,
    // format.test.ts AC#7) расширяет частичное выделение до ЦЕЛОЙ строки.
    // formatForAction маршрутизирует на тот же seam (единый источник логики,
    // AC#4), поэтому корректное ожидание — построчное ограждение.
    expect(result.text).toBe("```\nHello world\n```"); // AC: code-fence по строке
  });

  it("bold: apply в конце документа — from/to корректны", () => {
    const text = "prefix end";
    const result = formatForAction("bold", text, 7, 10);
    expect(result.text).toBe("prefix **end**"); // AC: bold в конце
    expect(selectedText(result)).toBe("end"); // AC: выделение охватывает "end"
  });
});

// ===========================================================================
// 5. Полный текст документа после apply содержит все части
// ===========================================================================

describe("formatForAction: структура полного текста после apply", () => {
  it("bold: левый контекст до from сохранён без изменений", () => {
    const result = formatForAction("bold", "abc def ghi", 4, 7);
    expect(result.text.startsWith("abc ")).toBe(true); // AC: левый контекст не тронут
  });

  it("bold: правый контекст после to сохранён без изменений", () => {
    const result = formatForAction("bold", "abc def ghi", 4, 7);
    expect(result.text.endsWith(" ghi")).toBe(true); // AC: правый контекст не тронут
  });

  it("italic: итоговый текст содержит исходный выделенный фрагмент внутри маркеров", () => {
    const result = formatForAction("italic", "foo bar baz", 4, 7);
    expect(result.text).toContain("*bar*"); // AC: маркеры обрамляют выделение
  });

  it("underline: итоговый текст содержит HTML-теги вокруг выделения", () => {
    const result = formatForAction("underline", "one two three", 4, 7);
    expect(result.text).toContain("<u>two</u>"); // AC: HTML-теги на месте
  });

  it("code-fence: блок находится на отдельных строках", () => {
    const result = formatForAction("code-fence", "x", 0, 1);
    // Открывающая ``` — перед переносом строки, закрывающая ``` — после переноса
    expect(result.text).toContain("```\n"); // AC: открывающая ``` на своей строке
    expect(result.text).toContain("\n```"); // AC: закрывающая ``` на своей строке
  });
});

// ===========================================================================
// 6. Round-trip toggle: повторное применение снимает обёртку
// ===========================================================================

describe("formatForAction: round-trip toggle (apply → повторное apply снимает обёртку)", () => {
  it("bold: apply затем apply на внутреннем выделении возвращает исходный текст", () => {
    // Первый apply
    const first = formatForAction("bold", "x", 0, 1);
    // first.text === "**x**"; first.from..first.to === "x"
    // Повторный apply по выделению [first.from, first.to) в уже оформленном тексте
    const second = formatForAction("bold", first.text, first.from, first.to);
    // Ожидаем возврат к исходному тексту "x"
    expect(second.text).toBe("x"); // AC: round-trip bold
  });

  it("italic: round-trip toggle возвращает исходный текст", () => {
    const first = formatForAction("italic", "hello", 0, 5);
    // first.text === "*hello*"; first.from..first.to === "hello"
    const second = formatForAction("italic", first.text, first.from, first.to);
    expect(second.text).toBe("hello"); // AC: round-trip italic
  });

  it("code: round-trip toggle возвращает исходный текст", () => {
    const first = formatForAction("code", "snippet", 0, 7);
    const second = formatForAction("code", first.text, first.from, first.to);
    expect(second.text).toBe("snippet"); // AC: round-trip code
  });

  it("underline: round-trip toggle возвращает исходный текст", () => {
    const first = formatForAction("underline", "text", 0, 4);
    const second = formatForAction(
      "underline",
      first.text,
      first.from,
      first.to,
    );
    expect(second.text).toBe("text"); // AC: round-trip underline
  });

  it("code-fence: round-trip toggle возвращает исходный текст", () => {
    const first = formatForAction("code-fence", "block", 0, 5);
    const second = formatForAction(
      "code-fence",
      first.text,
      first.from,
      first.to,
    );
    expect(second.text).toBe("block"); // AC: round-trip code-fence
  });
});

// ===========================================================================
// 7. Инварианты FormatRange
// ===========================================================================

describe("formatForAction: инварианты FormatRange", () => {
  const actions: ToolbarAction[] = [
    "bold",
    "italic",
    "underline",
    "code",
    "code-fence",
  ];

  it("invariant: from <= to для всех действий", () => {
    for (const action of actions) {
      const result = formatForAction(action, "x", 0, 1);
      expect(result.from).toBeLessThanOrEqual(result.to); // invariant: from <= to
    }
  });

  it("invariant: from >= 0 для всех действий", () => {
    for (const action of actions) {
      const result = formatForAction(action, "x", 0, 1);
      expect(result.from).toBeGreaterThanOrEqual(0); // invariant: from не отрицательный
    }
  });

  it("invariant: to <= text.length для всех действий", () => {
    for (const action of actions) {
      const result = formatForAction(action, "x", 0, 1);
      expect(result.to).toBeLessThanOrEqual(result.text.length); // invariant: to не выходит за конец текста
    }
  });

  it("invariant: text.slice(from, to) содержит исходно выделенный фрагмент", () => {
    for (const action of actions) {
      const result = formatForAction(action, "hello", 0, 5);
      expect(result.text.slice(result.from, result.to)).toBe("hello"); // invariant: выделение = исходный фрагмент
    }
  });

  it("invariant: результирующий текст содержит все исходные символы вне выделения", () => {
    // Символы до from и после to должны сохраниться
    const result = formatForAction("bold", "abc XYZ def", 4, 7);
    expect(result.text).toContain("abc "); // invariant: левый контекст присутствует
    expect(result.text).toContain(" def"); // invariant: правый контекст присутствует
  });
});

// ===========================================================================
// 8. Edge cases — граничные случаи
// ===========================================================================

describe("formatForAction: edge cases", () => {
  it("edge case: пустое выделение (from === to) — bold добавляет маркеры вокруг пустой строки", () => {
    // edge case: from === to → нет выделенного текста
    const result = formatForAction("bold", "abc", 1, 1);
    // Ожидаем: маркеры добавлены, выделение по-прежнему корректное
    expect(result.from).toBeLessThanOrEqual(result.to); // edge case: from <= to для пустого выделения
    expect(typeof result.text).toBe("string"); // edge case: текст — строка
  });

  it("edge case: выделение на весь документ — bold охватывает весь текст", () => {
    const text = "full text";
    const result = formatForAction("bold", text, 0, text.length);
    expect(result.text).toBe("**full text**"); // edge case: весь документ жирный
    expect(selectedText(result)).toBe("full text"); // edge case: выделение охватывает весь текст
  });

  it("edge case: однобайтовый символ ascii — italic", () => {
    const result = formatForAction("italic", "a", 0, 1);
    expect(result.text).toBe("*a*"); // edge case: single ascii char
  });

  it("edge case: unicode-текст (кириллица) — bold", () => {
    const text = "Привет";
    const result = formatForAction("bold", text, 0, text.length);
    expect(result.text).toBe("**Привет**"); // edge case: unicode-текст обрабатывается корректно
    expect(selectedText(result)).toBe("Привет"); // edge case: выделение на unicode-тексте правильное
  });

  it("edge case: unicode emoji — code", () => {
    const text = "🎉";
    const result = formatForAction("code", text, 0, text.length);
    expect(result.text).toBe("`🎉`"); // edge case: emoji в code-обёртке
    expect(selectedText(result)).toBe("🎉"); // edge case: выделение охватывает emoji
  });

  it("edge case: многострочный текст в code-fence — перенос строк сохранён", () => {
    const text = "line1\nline2";
    const result = formatForAction("code-fence", text, 0, text.length);
    expect(result.text).toBe("```\nline1\nline2\n```"); // edge case: многострочный code-fence
    expect(selectedText(result)).toBe("line1\nline2"); // edge case: выделение охватывает многострочный фрагмент
  });

  it("edge case: текст с пробелами по краям — bold сохраняет пробелы", () => {
    const text = " padded ";
    const result = formatForAction("bold", text, 0, text.length);
    expect(selectedText(result)).toBe(" padded "); // edge case: пробелы не обрезаются
  });

  it("edge case: text содержит уже существующие bold-маркеры — применение не ломает структуру", () => {
    // edge case: вложенное форматирование (строка уже содержит **)
    const text = "**already** bold";
    const result = formatForAction("bold", text, 0, text.length);
    expect(typeof result.text).toBe("string"); // edge case: результат — строка
    expect(result.from).toBeLessThanOrEqual(result.to); // edge case: from <= to
  });

  it("edge case: длинная строка — italic", () => {
    const long = "a".repeat(10000);
    const result = formatForAction("italic", long, 0, long.length);
    expect(result.text.startsWith("*")).toBe(true); // edge case: длинная строка — открывающий маркер
    expect(result.text.endsWith("*")).toBe(true); // edge case: длинная строка — закрывающий маркер
    expect(selectedText(result)).toBe(long); // edge case: выделение охватывает длинную строку
  });

  it("edge case: текст начинается с newline — code-fence сохраняет его", () => {
    const text = "\nindented";
    const result = formatForAction("code-fence", text, 0, text.length);
    expect(result.text).toContain("\nindented"); // edge case: newline в начале содержимого сохраняется
  });

  it("edge case: text содержит backtick — code работает корректно", () => {
    const text = "a`b";
    const result = formatForAction("code", text, 0, text.length);
    // Исходный фрагмент должен быть в выделении
    expect(selectedText(result)).toBe("a`b"); // edge case: выделение с backtick внутри
  });
});

// ===========================================================================
// 9. Конкретные ожидаемые тексты для всех действий с разными входами
// ===========================================================================

describe("formatForAction: конкретные результирующие тексты", () => {
  it('bold: text="Hello", from=0, to=5 → "**Hello**"', () => {
    expect(formatForAction("bold", "Hello", 0, 5).text).toBe("**Hello**"); // AC: bold полный текст
  });

  it('italic: text="Hello", from=0, to=5 → "*Hello*"', () => {
    expect(formatForAction("italic", "Hello", 0, 5).text).toBe("*Hello*"); // AC: italic полный текст
  });

  it('code: text="Hello", from=0, to=5 → "`Hello`"', () => {
    expect(formatForAction("code", "Hello", 0, 5).text).toBe("`Hello`"); // AC: code полный текст
  });

  it('underline: text="Hello", from=0, to=5 → "<u>Hello</u>"', () => {
    expect(formatForAction("underline", "Hello", 0, 5).text).toBe(
      "<u>Hello</u>",
    ); // AC: underline полный текст
  });

  it('code-fence: text="Hello", from=0, to=5 → "```\\nHello\\n```"', () => {
    expect(formatForAction("code-fence", "Hello", 0, 5).text).toBe(
      "```\nHello\n```",
    ); // AC: code-fence полный текст
  });

  it("bold: from/to корректны после apply — from и to сдвинулись за маркеры", () => {
    const result = formatForAction("bold", "x", 0, 1);
    // В результирующем тексте "**x**" — "x" находится на позиции 2..3
    expect(result.from).toBe(2); // AC: from = 2 (после "**")
    expect(result.to).toBe(3); // AC: to = 3 (перед "**")
  });

  it("italic: from/to корректны после apply", () => {
    const result = formatForAction("italic", "x", 0, 1);
    // В результирующем тексте "*x*" — "x" находится на позиции 1..2
    expect(result.from).toBe(1); // AC: from = 1 (после "*")
    expect(result.to).toBe(2); // AC: to = 2 (перед "*")
  });

  it("code: from/to корректны после apply", () => {
    const result = formatForAction("code", "x", 0, 1);
    // В результирующем тексте "`x`" — "x" находится на позиции 1..2
    expect(result.from).toBe(1); // AC: from = 1 (после "`")
    expect(result.to).toBe(2); // AC: to = 2 (перед "`")
  });

  it("underline: from/to корректны после apply", () => {
    const result = formatForAction("underline", "x", 0, 1);
    // В результирующем тексте "<u>x</u>" — "x" находится на позиции 3..4
    expect(result.from).toBe(3); // AC: from = 3 (после "<u>")
    expect(result.to).toBe(4); // AC: to = 4 (перед "</u>")
  });

  it("code-fence: from/to корректны после apply", () => {
    const result = formatForAction("code-fence", "x", 0, 1);
    // В результирующем тексте "```\nx\n```" — "x" находится на позиции 4..5
    expect(result.from).toBe(4); // AC: from = 4 (после "```\n")
    expect(result.to).toBe(5); // AC: to = 5 (перед "\n```")
  });
});
