import { describe, it, expect } from "vitest";
import { parseBlocks, type Block } from "./blocks";
import specCases from "./__fixtures__/commonmark-spec.json";

/**
 * Спецификационная изоляция parseBlocks на официальном CommonMark spec
 * test suite (версия 0.31.2, ~650 кейсов).
 *
 * ## Зачем
 *
 * `parseBlocks` (MDP-11) изначально проверялся только тестами, написанными тем
 * же агентом, что и парсер — слепое пятно (см. MDP-41). Здесь мы прогоняем
 * парсер на эталонных входах из независимого источника (Джон МакФарлейн / жюри
 * имплементаторов cmark / markdown-it) и проверяем НАШИ инварианты блок-
 * разделения. Это НЕ сравнение HTML-вывода — у нас другая семантика: мы режем
 * исходник на блоки, а не рендерим.
 *
 * ## Источник фикстуры
 *
 * `__fixtures__/commonmark-spec.json` закоммичен как стабильная версия 0.31.2,
 * скачанная с https://spec.commonmark.org/0.31.2/spec.json. Решение коммитить,
 * а не подтягивать в test setup, — осознанное (SENAR правило 5, fail-closed):
 *  - детерминизм: тест не зависит от сети и доступности spec.commonmark.org;
 *  - воспроизводимость: версия зафиксирована, апгрейд spec — отдельный явный PR;
 *  - offline: `npm run test` работает без интернета.
 *
 * Каждый кейс — `{ markdown, html, example, start_line, end_line, section }`.
 * Мы используем только `markdown` (вход) и метаданные для имён тестов.
 */
interface SpecCase {
  markdown: string;
  html: string;
  example: number;
  start_line: number;
  end_line: number;
  section: string;
}

// Cast обоснован: spec.json — verbatim-фикстура CommonMark 0.31.2 с фиксированной
// схемой, а её целостность (длина + точное число кейсов) независимо проверяется
// тестом "в фикстуре ожидаемое число кейсов" ниже. `as` здесь не скрывает any —
// JSON-импорт уже типизирован структурно, мы лишь сужаем к именованному интерфейсу.
const cases = specCases as SpecCase[];

/**
 * Exclusions-list: кейсы CommonMark spec, которые наш блок-маппинг намеренно НЕ
 * покрывает. Все — **link reference definitions** в формах за рамками компактного
 * однострочного синтаксиса: многострочные (193, 195, 196, 198, 208, 541) либо
 * однострочные, но с синтаксисом мимо нашей регулярки — dest без пробела после
 * ':' (194) и экранированная кавычка внутри title (202).
 *
 * Причина общая для всех: markdown-it извлекает определения reference-ссылок в
 * `env.references` и НЕ эмитит для них токены. `findReferenceBlocks` детектирует
 * их отдельным проходом, но только в компактной форме — однострочный
 * `[label]: dest "title"` (опц. title-продолжением на следующей строке). Формы
 * ниже выходят за эти рамки, поэтому такие строки выпадают из координат (gap не
 * whitespace-only). Это известное ограничение parseBlocks из MDP-11, а не
 * регрессия: reference-определения в inline-render всё равно невидимы, их
 * приоритет низкий. Расширение детектора — отдельная задача.
 *
 * Каждое исключение верифицируется guard-тестом ниже ("(excluded) — базовые
 * инварианты держатся, строгая реконструкция нарушена"): если парсер однажды
 * научится обрабатывать такой кейс, guard упадёт и заставит убрать устаревшее
 * исключение.
 */
const EXCLUSIONS = new Map<number, string>([
  [193, "ref def: dest и title на отдельных строках (многострочная форма)"],
  [
    194,
    "ref def: dest сразу после ':' без пробела + экранированная ']' в label",
  ],
  [195, "ref def: dest в угловых скобках на следующей строке (многострочная)"],
  [196, "ref def: title растянут на несколько строк"],
  [198, "ref def: dest на следующей строке после label"],
  [202, 'ref def: экранированная кавычка внутри title (\\")'],
  [208, "ref def: label растянут на несколько строк"],
  [541, "ref def: многострочный label ([Foo\\n  bar]: /url)"],
]);

/**
 * Базовые инварианты одного блока и взаимного расположения блоков:
 *  - 0 <= from < to <= source.length
 *  - raw === source.slice(from, to)
 *  - блоки отсортированы по from и не перекрываются
 */
function assertBlockInvariants(source: string, blocks: Block[]): void {
  let prevTo = 0;
  for (const b of blocks) {
    expect(b.from).toBeGreaterThanOrEqual(0);
    expect(b.from).toBeLessThan(b.to);
    expect(b.to).toBeLessThanOrEqual(source.length);
    expect(b.raw).toBe(source.slice(b.from, b.to));
    // отсортированы по from и не перекрываются: следующий from >= предыдущего to
    expect(b.from).toBeGreaterThanOrEqual(prevTo);
    prevTo = b.to;
  }
}

/**
 * Строгая реконструкция: исходный markdown = конкатенация raw-полей блоков,
 * разделённых "промежутками" (gaps), где КАЖДЫЙ промежуток (до первого блока,
 * между блоками, после последнего) обязан быть whitespace-only (пустые строки).
 *
 * Возвращает `null`, если реконструкция точна, иначе строку-описание первого
 * нарушения (для диагностики и для exclusion-guard теста).
 */
function reconstructionViolation(
  source: string,
  blocks: Block[],
): string | null {
  let rebuilt = "";
  let cursor = 0;
  for (const b of blocks) {
    const gap = source.slice(cursor, b.from);
    if (!/^\s*$/.test(gap)) {
      return `non-whitespace gap before block@${b.from}: ${JSON.stringify(
        gap.slice(0, 60),
      )}`;
    }
    rebuilt += gap + b.raw;
    cursor = b.to;
  }
  const tail = source.slice(cursor);
  if (!/^\s*$/.test(tail)) {
    return `non-whitespace tail: ${JSON.stringify(tail.slice(0, 60))}`;
  }
  rebuilt += tail;
  if (rebuilt !== source) {
    return "rebuilt !== source";
  }
  return null;
}

const includedCases = cases.filter((c) => !EXCLUSIONS.has(c.example));
const excludedCases = cases.filter((c) => EXCLUSIONS.has(c.example));

describe("parseBlocks() против CommonMark spec 0.31.2", () => {
  it("в фикстуре ожидаемое число кейсов (защита от обрезанного/битого spec.json)", () => {
    // Точное число кейсов в CommonMark 0.31.2 — обновляется только при явном
    // апгрейде версии spec (отдельный PR), что и должно ломать этот тест.
    expect(cases.length).toBe(652);
  });

  it.each(
    includedCases.map(
      (c) => [`ex${c.example} [${c.section} L${c.start_line}]`, c] as const,
    ),
  )("%s — инварианты блоков и точная реконструкция", (_label, c) => {
    const src = c.markdown;
    const blocks = parseBlocks(src);

    assertBlockInvariants(src, blocks);

    const violation = reconstructionViolation(src, blocks);
    expect(violation, violation ?? undefined).toBeNull();
  });

  // Exclusion-guard: исключения должны оставаться актуальными. Базовые инварианты
  // (raw === slice, сортировка) держатся ВСЕГДА — даже для исключённых кейсов
  // парсер не должен врать про координаты. Нарушается у них только СТРОГАЯ
  // реконструкция. Если парсер научится обрабатывать такой кейс — этот тест
  // упадёт и потребует убрать устаревшее исключение из EXCLUSIONS.
  it.each(
    excludedCases.map((c) => [`ex${c.example} [${c.section}]`, c] as const),
  )(
    "%s (excluded) — базовые инварианты держатся, строгая реконструкция нарушена",
    (_label, c) => {
      const src = c.markdown;
      const blocks = parseBlocks(src);

      // Координаты честные даже для исключённых кейсов.
      assertBlockInvariants(src, blocks);

      // А вот строгая реконструкция обязана нарушаться — иначе исключение
      // устарело и его надо удалить.
      const violation = reconstructionViolation(src, blocks);
      expect(
        violation,
        `Исключение ex${c.example} устарело: строгая реконструкция теперь проходит. ` +
          `Убери его из EXCLUSIONS — парсер научился обрабатывать "${EXCLUSIONS.get(
            c.example,
          )}".`,
      ).not.toBeNull();
    },
  );
});
