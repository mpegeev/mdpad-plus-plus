import { describe, it, expect } from "vitest";
import {
  toggleWrap,
  toggleInlineWrap,
  toggleCodeFence,
  type FormatRange,
} from "./format";

/**
 * MDP-17 — тесты чистого ядра форматирующих преобразований.
 *
 * SENAR-правило 4: задача детерминированная (правильный ответ известен
 * заранее), поэтому тесты написаны СТРОГО ПО КОНТРАКТУ (сигнатуры + критерии
 * приёмки) ДО реализации и не подгоняются под код. В идеале их пишет субагент
 * test-writer; в данной среде инструмент субагента недоступен, поэтому тесты
 * написаны разработчиком исключительно от контракта ниже — та же спецификация,
 * что получил бы test-writer.
 *
 * Контракт чистого ядра (без EditorView, детерминированно):
 *
 *   toggleWrap(text, from, to, open, close): FormatRange
 *     - Если выделение [from,to) ещё НЕ обёрнуто парой open/close — обернуть:
 *       результат содержит вставленные open перед выделением и close после.
 *       Новое выделение охватывает исходный текст БЕЗ маркеров.
 *     - Если выделение УЖЕ обёрнуто (маркеры внутри выделения по краям ИЛИ
 *       непосредственно вокруг выделения) — снять обёртку (toggle-off).
 *       Новое выделение охватывает развёрнутый текст.
 *     - Пустое выделение (from === to): вставить open+close и поставить
 *       каретку МЕЖДУ ними (from === to === исходный from + open.length).
 *     - FormatRange = { text: string; from: number; to: number }.
 *
 *   toggleInlineWrap(text, from, to, marker): FormatRange
 *     = toggleWrap(text, from, to, marker, marker) (симметричный маркер).
 *
 *   toggleCodeFence(text, from, to): FormatRange
 *     - Оборачивает выбранные строки в строки-ограждения ```. Открывающая и
 *       закрывающая ``` — на ОТДЕЛЬНЫХ строках до/после выделенного блока.
 *     - Toggle-off: если выбранный блок уже окружён строками ``` — снять их.
 *     - Работает по границам строк (выделение расширяется до целых строк).
 */

describe("toggleWrap — обёртка/снятие парой маркеров", () => {
  it("оборачивает выделение **bold**", () => {
    // text="bold", выделено [0,4)
    const r = toggleWrap("bold", 0, 4, "**", "**");
    expect(r.text).toBe("**bold**");
    // новое выделение охватывает "bold" без маркеров
    expect(r.from).toBe(2);
    expect(r.to).toBe(6);
  });

  it("toggle-off: снимает **bold**, когда маркеры вокруг выделения", () => {
    // text="**bold**", выделено внутреннее "bold" [2,6)
    const r = toggleWrap("**bold**", 2, 6, "**", "**");
    expect(r.text).toBe("bold");
    expect(r.from).toBe(0);
    expect(r.to).toBe(4);
  });

  it("toggle-off: снимает, когда маркеры включены в выделение", () => {
    // text="**bold**", выделено всё включая маркеры [0,8)
    const r = toggleWrap("**bold**", 0, 8, "**", "**");
    expect(r.text).toBe("bold");
    expect(r.from).toBe(0);
    expect(r.to).toBe(4);
  });

  it("пустое выделение: вставляет маркеры, каретка между ними", () => {
    const r = toggleWrap("", 0, 0, "**", "**");
    expect(r.text).toBe("****");
    expect(r.from).toBe(2);
    expect(r.to).toBe(2);
  });

  it("сохраняет окружающий текст при обёртке в середине", () => {
    // text="a bold c", выделено "bold" [2,6)
    const r = toggleWrap("a bold c", 2, 6, "**", "**");
    expect(r.text).toBe("a **bold** c");
    expect(r.from).toBe(4);
    expect(r.to).toBe(8);
  });

  it("асимметричные маркеры (underline) — обёртка", () => {
    const r = toggleWrap("x", 0, 1, "<u>", "</u>");
    expect(r.text).toBe("<u>x</u>");
    expect(r.from).toBe(3);
    expect(r.to).toBe(4);
  });

  it("асимметричные маркеры (underline) — toggle-off вокруг выделения", () => {
    const r = toggleWrap("<u>x</u>", 3, 4, "<u>", "</u>");
    expect(r.text).toBe("x");
    expect(r.from).toBe(0);
    expect(r.to).toBe(1);
  });
});

describe("toggleInlineWrap — bold/italic/inline-code", () => {
  it("bold: оборачивает", () => {
    const r = toggleInlineWrap("bold", 0, 4, "**");
    expect(r.text).toBe("**bold**");
    expect(r.from).toBe(2);
    expect(r.to).toBe(6);
  });

  it("bold: toggle-off", () => {
    const r = toggleInlineWrap("**bold**", 2, 6, "**");
    expect(r.text).toBe("bold");
    expect(r.from).toBe(0);
    expect(r.to).toBe(4);
  });

  it("italic: оборачивает", () => {
    const r = toggleInlineWrap("it", 0, 2, "*");
    expect(r.text).toBe("*it*");
    expect(r.from).toBe(1);
    expect(r.to).toBe(3);
  });

  it("italic: toggle-off", () => {
    const r = toggleInlineWrap("*it*", 1, 3, "*");
    expect(r.text).toBe("it");
    expect(r.from).toBe(0);
    expect(r.to).toBe(2);
  });

  it("inline-code: оборачивает одиночным бэктиком", () => {
    const r = toggleInlineWrap("code", 0, 4, "`");
    expect(r.text).toBe("`code`");
    expect(r.from).toBe(1);
    expect(r.to).toBe(5);
  });

  it("inline-code: toggle-off", () => {
    const r = toggleInlineWrap("`code`", 1, 5, "`");
    expect(r.text).toBe("code");
    expect(r.from).toBe(0);
    expect(r.to).toBe(4);
  });
});

describe("toggleCodeFence — многострочное ограждение", () => {
  it("оборачивает однострочное выделение в fence на отдельных строках", () => {
    const r = toggleCodeFence("line", 0, 4);
    expect(r.text).toBe("```\nline\n```");
  });

  it("оборачивает многострочное выделение, fence отдельными строками", () => {
    const text = "a\nb\nc";
    const r = toggleCodeFence(text, 0, 5);
    expect(r.text).toBe("```\na\nb\nc\n```");
  });

  it("toggle-off: снимает окружающий fence", () => {
    const text = "```\na\nb\n```";
    // выделение охватывает внутренние строки a,b
    const r = toggleCodeFence(text, 4, 7);
    expect(r.text).toBe("a\nb");
  });

  it("toggle-off однострочного fence-блока", () => {
    const text = "```\nline\n```";
    const r = toggleCodeFence(text, 4, 8);
    expect(r.text).toBe("line");
  });

  it("расширяет выделение до целых строк перед обёрткой", () => {
    // text="hello", выделено только "ell" [1,4) — fence всё равно охватит строку
    const r = toggleCodeFence("hello", 1, 4);
    expect(r.text).toBe("```\nhello\n```");
  });

  it("сохраняет окружающие строки при обёртке средней строки", () => {
    const text = "before\nmid\nafter";
    // выделено "mid" (строка целиком), индексы строки mid: 7..10
    const r = toggleCodeFence(text, 7, 10);
    expect(r.text).toBe("before\n```\nmid\n```\nafter");
  });
});

describe("FormatRange — форма результата", () => {
  it("toggleWrap возвращает объект с числовыми from/to и строкой text", () => {
    const r: FormatRange = toggleWrap("x", 0, 1, "*", "*");
    expect(typeof r.text).toBe("string");
    expect(typeof r.from).toBe("number");
    expect(typeof r.to).toBe("number");
  });
});
