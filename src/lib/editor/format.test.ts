/**
 * Независимые тесты для MDP-17: чистое ядро форматирования (format.ts).
 * Написаны агентом test-writer по контракту, критериям приёмки и сигнатурам.
 * Реализация (format.ts) не читалась — структурная защита SENAR (правило 4).
 *
 * Покрывает:
 *   - toggleWrap   (wrap / unwrap-вокруг / пустое выделение)
 *   - toggleInlineWrap (apply / toggle-off / вложенность / пустое)
 *   - toggleCodeFence  (wrap / toggle-off / частичное выделение / info-string)
 *
 * Каждый тест утверждает ровно одно детерминированное значение.
 * Комментарии ссылаются на критерии приёмки (AC#N), инварианты и edge case.
 */

import { describe, it, expect } from "vitest";
import { toggleWrap, toggleInlineWrap, toggleCodeFence } from "./format";
import type { FormatRange } from "./format";

// ---------------------------------------------------------------------------
// Вспомогательный хелпер: извлечь выделенный фрагмент из результата
// ---------------------------------------------------------------------------

function selected(result: FormatRange): string {
  return result.text.slice(result.from, result.to);
}

// ===========================================================================
// toggleWrap
// ===========================================================================

describe("toggleWrap — оборачивание парой open/close", () => {
  // -----------------------------------------------------------------------
  // AC#1: оборачивание
  // -----------------------------------------------------------------------

  it("AC#1: оборачивает слово тегами <u></u>", () => {
    // "hello world": "world" = [6, 11)
    const result = toggleWrap("hello world", 6, 11, "<u>", "</u>");
    expect(result.text).toBe("hello <u>world</u>"); // AC#1
    expect(selected(result)).toBe("world"); // AC#1: выделение между маркерами
  });

  it("AC#1: оборачивает выделение в середине текста односимвольными маркерами", () => {
    // "foo bar baz": "bar" = [4, 7)
    const result = toggleWrap("foo bar baz", 4, 7, "(", ")");
    expect(result.text).toBe("foo (bar) baz"); // AC#1
    expect(selected(result)).toBe("bar"); // AC#1
  });

  it("AC#1: оборачивает выделение в начале строки", () => {
    // "hello": всё = [0, 5)
    const result = toggleWrap("hello", 0, 5, "[", "]");
    expect(result.text).toBe("[hello]"); // AC#1
    expect(selected(result)).toBe("hello"); // AC#1
  });

  it("AC#1: оборачивает многосимвольными маркерами <u></u> слово в середине", () => {
    // "one two three": "two" = [4, 7)
    const result = toggleWrap("one two three", 4, 7, "<u>", "</u>");
    expect(result.text).toBe("one <u>two</u> three"); // AC#1
    expect(selected(result)).toBe("two"); // AC#1
  });

  it("AC#1: оборачивает только конечное слово", () => {
    // "first last": "last" = [6, 10)
    const result = toggleWrap("first last", 6, 10, "<u>", "</u>");
    expect(result.text).toBe("first <u>last</u>"); // AC#1
    expect(selected(result)).toBe("last"); // AC#1
  });

  // -----------------------------------------------------------------------
  // AC#2: снятие обёртки (маркеры непосредственно вокруг выделения)
  // -----------------------------------------------------------------------

  it("AC#2 unwrap-вокруг: снимает <u></u>, стоящие непосредственно вокруг выделения", () => {
    // "hello <u>world</u>":
    //   '<' = 6, 'u' = 7, '>' = 8, 'w' = 9 ... 'd' = 13
    //   from=9 (после '<u>'), to=14 (до '</u>')
    const text = "hello <u>world</u>";
    const result = toggleWrap(text, 9, 14, "<u>", "</u>");
    expect(result.text).toBe("hello world"); // AC#2
    expect(selected(result)).toBe("world"); // AC#2
  });

  it("AC#2 unwrap-вокруг: снимает односимвольные маркеры [ ]", () => {
    // "[hello]": 'h' = 1, 'o' = 5
    // from=1, to=6 → выделяем "hello"
    const result = toggleWrap("[hello]", 1, 6, "[", "]");
    expect(result.text).toBe("hello"); // AC#2
    expect(selected(result)).toBe("hello"); // AC#2
  });

  it("AC#2 unwrap-вокруг: снимает маркеры в конце текста", () => {
    // "prefix(end)": '(' = 6, 'e'=7,'n'=8,'d'=9, ')' = 10
    // from=7, to=10 → выделяем "end"
    const result = toggleWrap("prefix(end)", 7, 10, "(", ")");
    expect(result.text).toBe("prefixend"); // AC#2
    expect(selected(result)).toBe("end"); // AC#2
  });

  // -----------------------------------------------------------------------
  // AC#4: пустое выделение
  // -----------------------------------------------------------------------

  it("AC#4 empty: пустое выделение вставляет маркеры, каретка между ними", () => {
    // "hello", from=2, to=2 → "he<u></u>llo"
    // '<u>' = 3 символа, каретка после неё: 2+3=5
    const result = toggleWrap("hello", 2, 2, "<u>", "</u>");
    expect(result.text).toBe("he<u></u>llo"); // AC#4
    expect(result.from).toBe(result.to); // AC#4: каретка (пустое выделение)
    expect(result.from).toBe(5); // AC#4: 2 + len('<u>') = 5
  });

  it("AC#4 empty: пустое выделение в начале с односимвольными маркерами", () => {
    // "abc", from=0, to=0 → "()abc"
    // каретка: 0 + len('(') = 1
    const result = toggleWrap("abc", 0, 0, "(", ")");
    expect(result.text).toBe("()abc"); // AC#4
    expect(result.from).toBe(result.to); // AC#4: каретка
    expect(result.from).toBe(1); // AC#4: 0 + len('(') = 1
  });

  it("AC#4 empty: пустое выделение в конце текста", () => {
    // "abc", from=3, to=3 → "abc[]"
    // каретка: 3 + len('[') = 4
    const result = toggleWrap("abc", 3, 3, "[", "]");
    expect(result.text).toBe("abc[]"); // AC#4
    expect(result.from).toBe(result.to); // AC#4
    expect(result.from).toBe(4); // AC#4: 3 + 1 = 4
  });

  // -----------------------------------------------------------------------
  // edge case
  // -----------------------------------------------------------------------

  it("edge case: unicode — оборачивает текст с кириллицей", () => {
    // "Привет мир": 'П'=0...'т'=5, ' '=6, 'м'=7,'и'=8,'р'=9
    // from=7, to=10
    const result = toggleWrap("Привет мир", 7, 10, "<u>", "</u>");
    expect(result.text).toBe("Привет <u>мир</u>"); // edge case: unicode
    expect(selected(result)).toBe("мир"); // edge case: unicode
  });
});

// ===========================================================================
// toggleInlineWrap
// ===========================================================================

describe("toggleInlineWrap — inline-маркеры (*, **, `)", () => {
  // -----------------------------------------------------------------------
  // AC#1: оборачивание
  // -----------------------------------------------------------------------

  it("AC#1 italic apply: оборачивает слово одинарной звёздочкой", () => {
    // "hello world": "world" = [6, 11)
    const result = toggleInlineWrap("hello world", 6, 11, "*");
    expect(result.text).toBe("hello *world*"); // AC#1
    expect(selected(result)).toBe("world"); // AC#1
  });

  it("AC#1 bold apply: оборачивает слово '**'", () => {
    // "hello world": "world" = [6, 11)
    const result = toggleInlineWrap("hello world", 6, 11, "**");
    expect(result.text).toBe("hello **world**"); // AC#1
    expect(selected(result)).toBe("world"); // AC#1
  });

  it("AC#1 inline-code apply: оборачивает слово обратными кавычками", () => {
    // "hello world": "world" = [6, 11)
    const result = toggleInlineWrap("hello world", 6, 11, "`");
    expect(result.text).toBe("hello `world`"); // AC#1
    expect(selected(result)).toBe("world"); // AC#1
  });

  it("AC#1: оборачивает в начале документа", () => {
    // "bold text here": "bold" = [0, 4)
    const result = toggleInlineWrap("bold text here", 0, 4, "**");
    expect(result.text).toBe("**bold** text here"); // AC#1
    expect(selected(result)).toBe("bold"); // AC#1
  });

  it("AC#1: оборачивает ровно три символа в середине", () => {
    // "one two three": "two" = [4, 7)
    const result = toggleInlineWrap("one two three", 4, 7, "*");
    expect(result.text).toBe("one *two* three"); // AC#1
    expect(selected(result)).toBe("two"); // AC#1
  });

  // -----------------------------------------------------------------------
  // AC#2 + AC#3: снятие обёртки (toggle-off)
  // -----------------------------------------------------------------------

  it("AC#3 unwrap-внутри italic: '*word*', выделить 'word' (from=1,to=5) → 'word'", () => {
    // '*'=0, 'w'=1,'o'=2,'r'=3,'d'=4, '*'=5
    const result = toggleInlineWrap("*word*", 1, 5, "*");
    expect(result.text).toBe("word"); // AC#3
    expect(selected(result)).toBe("word"); // AC#3
  });

  it("AC#3 unwrap-внутри bold: '**word**', выделить 'word' (from=2,to=6) → 'word'", () => {
    // '*'=0,'*'=1,'w'=2,'o'=3,'r'=4,'d'=5,'*'=6,'*'=7  — длина 8
    // wait: w=2,o=3,r=4,d=5 → to=6
    const result = toggleInlineWrap("**word**", 2, 6, "**");
    expect(result.text).toBe("word"); // AC#3
    expect(selected(result)).toBe("word"); // AC#3
  });

  it("AC#3 unwrap-внутри inline-code: '`code`', выделить 'code' (from=1,to=5) → 'code'", () => {
    // '`'=0,'c'=1,'o'=2,'d'=3,'e'=4,'`'=5
    const result = toggleInlineWrap("`code`", 1, 5, "`");
    expect(result.text).toBe("code"); // AC#3
    expect(selected(result)).toBe("code"); // AC#3
  });

  it("AC#2 unwrap-вокруг: выделено '*world*' целиком (from=6,to=13) → маркеры сняты", () => {
    // "hello *world* end":
    // 'h'=0...'o'=4,' '=5,'*'=6,'w'=7,'o'=8,'r'=9,'l'=10,'d'=11,'*'=12,' '=13...
    // выделяем '*world*' = [6, 13)
    const result = toggleInlineWrap("hello *world* end", 6, 13, "*");
    expect(result.text).toBe("hello world end"); // AC#2
    expect(selected(result)).toBe("world"); // AC#2
  });

  // -----------------------------------------------------------------------
  // AC#5 КРИТИЧНО: вложенность — добавление слоя без разрушения соседнего
  // -----------------------------------------------------------------------

  it("AC#5 нет ложного unwrap: '**bold**', выделить 'bold' (from=2,to=6), marker='*' → '***bold***'", () => {
    // '**bold**': '*'=0,'*'=1,'b'=2,'o'=3,'l'=4,'d'=5,'*'=6,'*'=7
    // выделяем "bold" = [2, 6) — marker='*' НЕ должен снять один '*' из '**'
    const result = toggleInlineWrap("**bold**", 2, 6, "*");
    expect(result.text).toBe("***bold***"); // AC#5: добавлен слой, не сорван
    expect(selected(result)).toBe("bold"); // AC#5
  });

  it("AC#5 unwrap italic из bold-italic: '***bold***', выделить 'bold' (from=3,to=7), marker='*' → '**bold**'", () => {
    // '***bold***': '*'=0,'*'=1,'*'=2,'b'=3,'o'=4,'l'=5,'d'=6,'*'=7,'*'=8,'*'=9
    // выделяем "bold" = [3, 7) — снимаем один слой italic
    const result = toggleInlineWrap("***bold***", 3, 7, "*");
    expect(result.text).toBe("**bold**"); // AC#5
    expect(selected(result)).toBe("bold"); // AC#5
  });

  it("AC#5 нет порчи при двух bold-блоках: '**x** and **y**', from=0, to=15, marker='*'", () => {
    // "**x** and **y**" длина 15: индексы 0-14
    // '*'=0,'*'=1,'x'=2,'*'=3,'*'=4,' '=5,'a'=6,'n'=7,'d'=8,' '=9,'*'=10,'*'=11,'y'=12,'*'=13,'*'=14
    // Внешних '*' нет → оборачиваем весь текст: '***x** and **y***'
    const result = toggleInlineWrap("**x** and **y**", 0, 15, "*");
    // AC#5: результат НЕ является ложным unwrap
    expect(result.text).not.toBe("x** and **y"); // AC#5: критично
    // AC#5: внутренние bold-блоки сохранены
    expect(result.text).toContain("**x**"); // AC#5: первый bold цел
    expect(result.text).toContain("**y**"); // AC#5: второй bold цел
  });

  // -----------------------------------------------------------------------
  // AC#4: пустое выделение
  // -----------------------------------------------------------------------

  it("AC#4 empty italic: пустое выделение вставляет '**', каретка между маркерами", () => {
    // "hello", from=3, to=3 → "hel**lo"
    // каретка: 3 + len('*') = 4
    const result = toggleInlineWrap("hello", 3, 3, "*");
    expect(result.text).toBe("hel**lo"); // AC#4
    expect(result.from).toBe(result.to); // AC#4: каретка
    expect(result.from).toBe(4); // AC#4: 3 + 1 = 4
  });

  it("AC#4 empty bold: пустое выделение вставляет '****', каретка посередине", () => {
    // "hello", from=2, to=2 → "he****llo"
    // каретка: 2 + len('**') = 4
    const result = toggleInlineWrap("hello", 2, 2, "**");
    expect(result.text).toBe("he****llo"); // AC#4
    expect(result.from).toBe(result.to); // AC#4: каретка
    expect(result.from).toBe(4); // AC#4: 2 + 2 = 4
  });

  it("AC#4 empty inline-code: пустое выделение в пустом документе вставляет '``'", () => {
    // "", from=0, to=0 → "``"
    // каретка: 0 + len('`') = 1
    const result = toggleInlineWrap("", 0, 0, "`");
    expect(result.text).toBe("``"); // AC#4
    expect(result.from).toBe(result.to); // AC#4: каретка
    expect(result.from).toBe(1); // AC#4: 0 + 1 = 1
  });

  // -----------------------------------------------------------------------
  // edge case
  // -----------------------------------------------------------------------

  it("edge case: multi-word italic — весь документ оборачивается", () => {
    // "one two three": from=0, to=13
    const result = toggleInlineWrap("one two three", 0, 13, "*");
    expect(result.text).toBe("*one two three*"); // edge case
    expect(selected(result)).toBe("one two three"); // edge case
  });

  it("edge case: unicode в bold", () => {
    // "Привет мир": 'м'=7,'и'=8,'р'=9, from=7, to=10
    const result = toggleInlineWrap("Привет мир", 7, 10, "**");
    expect(result.text).toBe("Привет **мир**"); // edge case: unicode
    expect(selected(result)).toBe("мир"); // edge case
  });

  it("edge case: односимвольное выделение italic", () => {
    // "abc": 'b' = [1, 2)
    const result = toggleInlineWrap("abc", 1, 2, "*");
    expect(result.text).toBe("a*b*c"); // edge case: single char
    expect(selected(result)).toBe("b"); // edge case
  });

  it("edge case: apply и toggle-off round-trip для целого слова", () => {
    // apply: "word", from=0, to=4 → "*word*"
    const applyResult = toggleInlineWrap("word", 0, 4, "*");
    expect(applyResult.text).toBe("*word*"); // edge case: round-trip apply

    // toggle-off: "*word*", выделяем "word" = [1, 5)
    // '*'=0,'w'=1,'o'=2,'r'=3,'d'=4,'*'=5
    const toggleResult = toggleInlineWrap("*word*", 1, 5, "*");
    expect(toggleResult.text).toBe("word"); // edge case: round-trip toggle-off
  });
});

// ===========================================================================
// toggleCodeFence
// ===========================================================================

describe("toggleCodeFence — блок кода (``` ... ```)", () => {
  // -----------------------------------------------------------------------
  // AC#7: оборачивание строк
  // -----------------------------------------------------------------------

  it("AC#7 wrap одна строка: оборачивает выделенную строку fence-блоком", () => {
    // "hello", from=0, to=5
    const result = toggleCodeFence("hello", 0, 5);
    expect(result.text).toBe("```\nhello\n```"); // AC#7
    expect(selected(result)).toBe("hello"); // AC#7: выделение на содержимом
  });

  it("AC#7 wrap несколько строк: оборачивает все строки диапазона", () => {
    // "line1\nline2\nline3", from=0, to=17
    const text = "line1\nline2\nline3";
    const result = toggleCodeFence(text, 0, text.length);
    expect(result.text).toBe("```\nline1\nline2\nline3\n```"); // AC#7
    expect(selected(result)).toBe("line1\nline2\nline3"); // AC#7
  });

  it("AC#7 wrap: частичное выделение строки — в fence идёт целая строка", () => {
    // "before\ncode line\nafter"
    // 'c'=7 в "code line" (after 'before\n'), выделяем "code" = [7, 11)
    // from=7, to=11 → вся строка "code line" = [7, 16) должна уйти в fence
    const text = "before\ncode line\nafter";
    const result = toggleCodeFence(text, 7, 11);
    expect(result.text).toContain("```\ncode line\n```"); // AC#7: целые строки
  });

  it("AC#7 wrap одной строки в середине документа с контекстом", () => {
    // "first\nsecond\nthird": "second" = [6, 12)
    // 'f'=0...'t'=4,'s'=5(нет, '\n'=5),'s'=6,'e'=7,'c'=8,'o'=9,'n'=10,'d'=11,'\n'=12
    // from=6, to=12
    const text = "first\nsecond\nthird";
    const result = toggleCodeFence(text, 6, 12);
    expect(result.text).toContain("```\nsecond\n```"); // AC#7
  });

  // -----------------------------------------------------------------------
  // AC#7 toggle-off: снятие fence
  // -----------------------------------------------------------------------

  it("AC#7 toggle-off: выделить 'foo' внутри '```\\nfoo\\nbar\\n```' → снять весь fence-блок", () => {
    // "```\nfoo\nbar\n```":
    // '`'=0,'`'=1,'`'=2,'\n'=3,'f'=4,'o'=5,'o'=6,'\n'=7,'b'=8,'a'=9,'r'=10,'\n'=11,'`'=12,'`'=13,'`'=14
    // "foo" = [4, 7)
    const text = "```\nfoo\nbar\n```";
    const result = toggleCodeFence(text, 4, 7);
    expect(result.text).toBe("foo\nbar"); // AC#7: весь fence снят, содержимое сохранено
  });

  it("AC#7 toggle-off с info-string: '```js\\ncode\\n```', выделить 'code' → 'code'", () => {
    // "```js\ncode\n```":
    // '`'=0,'`'=1,'`'=2,'j'=3,'s'=4,'\n'=5,'c'=6,'o'=7,'d'=8,'e'=9,'\n'=10,'`'=11,'`'=12,'`'=13
    // "code" = [6, 10)
    const text = "```js\ncode\n```";
    const result = toggleCodeFence(text, 6, 10);
    expect(result.text).toBe("code"); // AC#7: info-string снята вместе с fence
  });

  it("AC#7 toggle-off частичного выделения: выделена только 'line1' из многострочного блока → снять весь блок", () => {
    // "```\nline1\nline2\nline3\n```":
    // '`'=0-2,'\n'=3,'l'=4-8 (line1),'\n'=9,'l'=10-14 (line2),'\n'=15,'l'=16-20 (line3),'\n'=21,'`'=22-24
    // "line1" = [4, 9)
    const text = "```\nline1\nline2\nline3\n```";
    const result = toggleCodeFence(text, 4, 9);
    expect(result.text).toBe("line1\nline2\nline3"); // AC#7: весь блок снят
  });

  it("AC#7 toggle-off: сканирование наружу — выделена средняя строка 'beta'", () => {
    // "```\nalpha\nbeta\ngamma\n```":
    // '`'=0-2,'\n'=3,'a'=4-8 (alpha),'\n'=9,'b'=10-13 (beta),'\n'=14,'g'=15-19 (gamma),'\n'=20,'`'=21-23
    // "beta" = [10, 14)
    const text = "```\nalpha\nbeta\ngamma\n```";
    const result = toggleCodeFence(text, 10, 14);
    expect(result.text).toBe("alpha\nbeta\ngamma"); // AC#7: сканирование наружу
  });

  it("AC#7 toggle-off с контекстом: fence-блок окружён другим текстом", () => {
    // "before\n```\nfoo\n```\nafter":
    // 'b'=0-5,'\n'=6,'`'=7-9,'\n'=10,'f'=11,'o'=12,'o'=13,'\n'=14,'`'=15-17,'\n'=18,'a'=19-23
    // "foo" = [11, 14)
    const text = "before\n```\nfoo\n```\nafter";
    const result = toggleCodeFence(text, 11, 14);
    expect(result.text).toBe("before\nfoo\nafter"); // AC#7: только fence снят
  });

  it("AC#7 toggle-off с info-string 'python'", () => {
    // "```python\nprint('hello')\n```":
    // '`'=0-2,'p'=3,'y'=4,'t'=5,'h'=6,'o'=7,'n'=8,'\n'=9
    // 'p'=10,...print('hello') длина 14 → [10, 24),'\n'=24,'`'=25-27
    const text = "```python\nprint('hello')\n```";
    const result = toggleCodeFence(text, 10, 24);
    expect(result.text).toBe("print('hello')"); // AC#7: info-string 'python' снята
  });

  // -----------------------------------------------------------------------
  // edge case
  // -----------------------------------------------------------------------

  it("edge case: пустой документ — оборачивается в fence", () => {
    // "", from=0, to=0 → "```\n\n```" (пустая строка содержимого)
    const result = toggleCodeFence("", 0, 0);
    expect(result.text).toBe("```\n\n```"); // edge case: пустой документ
  });

  it("edge case: round-trip для одной строки — apply затем toggle-off возвращает оригинал", () => {
    // "my code" → apply → "```\nmy code\n```"
    // Внутри: '`'=0-2,'\n'=3,'m'=4,'y'=5,' '=6,'c'=7,'o'=8,'d'=9,'e'=10,'\n'=11,'`'=12-14
    // "my code" = [4, 11)
    const applyResult = toggleCodeFence("my code", 0, 7);
    expect(applyResult.text).toBe("```\nmy code\n```"); // edge case: apply

    const toggleResult = toggleCodeFence(applyResult.text, 4, 11);
    expect(toggleResult.text).toBe("my code"); // edge case: round-trip toggle-off
  });

  it("edge case: toggle-off уже существующего fence без info-string", () => {
    // "```\nhello world\n```":
    // '`'=0-2,'\n'=3,'h'=4-14 (hello world),'\n'=15,'`'=16-18
    // "hello world" = [4, 15)
    const text = "```\nhello world\n```";
    const result = toggleCodeFence(text, 4, 15);
    expect(result.text).toBe("hello world"); // edge case: round-trip toggle-off
  });

  it("edge case: unicode внутри fence — toggle-off корректен с кириллицей", () => {
    // "```\nПривет\n```":
    // '`'=0-2,'\n'=3,'П'=4,'р'=5,'и'=6,'в'=7,'е'=8,'т'=9,'\n'=10,'`'=11-13
    // "Привет" = [4, 10)
    const text = "```\nПривет\n```";
    const result = toggleCodeFence(text, 4, 10);
    expect(result.text).toBe("Привет"); // edge case: unicode toggle-off
  });

  it("edge case: однострочный документ без переносов — wrap добавляет переносы строк", () => {
    // "single line", from=0, to=11 → не должно слипаться '```single line```'
    const result = toggleCodeFence("single line", 0, 11);
    expect(result.text).toBe("```\nsingle line\n```"); // edge case: разделители строк
  });
});

// ===========================================================================
// Инварианты структуры FormatRange
// ===========================================================================

describe("инварианты FormatRange — структурные свойства результата", () => {
  it("invariant: from <= to для всех функций", () => {
    const cases: Array<() => FormatRange> = [
      () => toggleWrap("hello", 1, 3, "(", ")"),
      () => toggleWrap("hello", 2, 2, "(", ")"),
      () => toggleInlineWrap("hello", 1, 3, "*"),
      () => toggleInlineWrap("hello", 2, 2, "**"),
      () => toggleCodeFence("hello", 0, 5),
      () => toggleCodeFence("hello", 2, 2),
    ];
    for (const fn of cases) {
      const r = fn();
      expect(r.from).toBeLessThanOrEqual(r.to); // invariant: from<=to
    }
  });

  it("invariant: from и to не выходят за границы result.text", () => {
    const cases: Array<() => FormatRange> = [
      () => toggleWrap("hello world", 6, 11, "<u>", "</u>"),
      () => toggleInlineWrap("foo bar", 4, 7, "*"),
      () => toggleCodeFence("some code", 0, 9),
    ];
    for (const fn of cases) {
      const r = fn();
      expect(r.from).toBeGreaterThanOrEqual(0); // invariant: from>=0
      expect(r.to).toBeLessThanOrEqual(r.text.length); // invariant: to<=text.length
    }
  });

  it("invariant: text является строкой и не null/undefined", () => {
    const r = toggleWrap("test", 0, 4, "*", "*");
    expect(typeof r.text).toBe("string"); // invariant: text is string
    expect(r.text).not.toBeNull(); // invariant: text not null
    expect(r.text).toBeDefined(); // invariant: text defined
  });

  it("invariant: префикс и суффикс вне выделения сохраняются после toggleWrap", () => {
    // "some important text": wrap "important" [5, 14)
    const original = "some important text";
    const r = toggleWrap(original, 5, 14, "[", "]");
    expect(r.text).toContain("some "); // invariant: префикс сохранён
    expect(r.text).toContain("important"); // invariant: выделенное сохранено
    expect(r.text).toContain(" text"); // invariant: суффикс сохранён
  });

  it("invariant: символы вне fence сохраняются после toggleCodeFence wrap", () => {
    // "before\ncode\nafter": wrap "code" [7, 11)
    // 'b'=0-5,'\n'=6,'c'=7-10,'\n'=11,'a'=12-16
    const text = "before\ncode\nafter";
    const r = toggleCodeFence(text, 7, 11);
    expect(r.text).toContain("before"); // invariant: текст до fence сохранён
    expect(r.text).toContain("code"); // invariant: содержимое сохранено
    expect(r.text).toContain("after"); // invariant: текст после fence сохранён
  });
});
