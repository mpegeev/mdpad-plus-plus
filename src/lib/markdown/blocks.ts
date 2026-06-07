import MarkdownIt from "markdown-it";

/**
 * Тип одного токена markdown-it. Используем `ReturnType` чтобы не зависеть от
 * конкретного subpath-импорта (`markdown-it/lib/token.mjs`), которого может не
 * быть в более новых версиях DefinitelyTyped.
 */
type MarkdownItToken = ReturnType<MarkdownIt["parse"]>[number];

/**
 * Тип блока верхнего уровня документа Markdown.
 *
 * - `heading` — заголовок ATX (`#…######`) или setext (`===` / `---`).
 * - `paragraph` — обычный абзац.
 * - `list` — список верхнего уровня (`bullet_list` или `ordered_list`); вложенные
 *   списки и параграфы внутри элементов НЕ выносятся как отдельные блоки.
 * - `code_fence` — fenced (` ``` ` / `~~~`) или indented (4 пробела) блок кода.
 * - `blockquote` — цитата (`> …`) целиком, со всем вложенным содержимым.
 * - `table` — GFM-таблица.
 * - `hr` — горизонтальная линия (`---`, `***`, `___`).
 * - `html_block` — HTML-блок верхнего уровня.
 * - `reference` — определение ссылки `[label]: url "title"`.
 */
export type BlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "code_fence"
  | "blockquote"
  | "table"
  | "hr"
  | "html_block"
  | "reference";

/**
 * Блок markdown-документа с точными character-границами в исходном тексте.
 *
 * Инвариант: `0 <= from < to <= source.length` и `raw === source.slice(from, to)`.
 */
export interface Block {
  /** Начальный character-офсет (UTF-16 code unit) в исходном тексте (0-based, inclusive). */
  from: number;
  /** Конечный character-офсет (UTF-16 code unit) (exclusive); всегда строго больше `from`. */
  to: number;
  /** Семантический тип блока. */
  type: BlockType;
  /** Эквивалент `source.slice(from, to)`; пригоден для рендеринга/инспекции. */
  raw: string;
}

/**
 * Сопоставление типов токенов markdown-it → нашим `BlockType`.
 *
 * `code_block` (indented 4-space) маппим в `code_fence` — структурно это
 * тоже "блок кода", inline-render должен обращаться с ними одинаково.
 */
const TOKEN_TYPE_MAP: Record<string, BlockType> = {
  heading_open: "heading",
  paragraph_open: "paragraph",
  bullet_list_open: "list",
  ordered_list_open: "list",
  blockquote_open: "blockquote",
  table_open: "table",
  fence: "code_fence",
  code_block: "code_fence",
  hr: "hr",
  html_block: "html_block",
};

/**
 * Регулярка для строки определения reference link `[label]: dest [title]`.
 *
 * Поддерживаем компактный однострочный вариант (title в том же ряду, либо без
 * title). Многострочные определения (title на следующей строке) детектируем
 * отдельным дополнительным шагом.
 */
const REFERENCE_LINE_REGEX =
  /^ {0,3}\[((?:[^\]\\]|\\.)+)\]:[ \t]+\S+(?:[ \t]+(?:"[^"]*"|'[^']*'|\([^)]*\)))?[ \t]*$/;

/**
 * Регулярка для строки, начинающей reference link, но без title (или с title
 * на следующей строке).
 */
const REFERENCE_LABEL_DEST_REGEX =
  /^ {0,3}\[((?:[^\]\\]|\\.)+)\]:[ \t]+\S+[ \t]*$/;

/**
 * Регулярка для строки-продолжения с title (`  "title"` / `  'title'` / `  (title)`).
 */
const REFERENCE_TITLE_CONT_REGEX = /^ {1,}(?:"[^"]*"|'[^']*'|\([^)]*\))[ \t]*$/;

/**
 * Вычисляет массив character-офсетов (UTF-16 code units) начала каждой строки.
 *
 * Для строки `i` (`0 <= i < numLines`) её содержимое лежит в
 * `[lineOffsets[i], lineOffsets[i + 1])`. Последний элемент массива равен
 * `source.length`, чтобы блок, заканчивающийся на последней строке, корректно
 * сворачивался в `source.slice(from, source.length)`.
 *
 * Учитывает оба варианта переноса строк — `\n` и `\r\n` — поскольку `\r`
 * остаётся частью строки и не сдвигает character-счёт (UTF-16 code units).
 */
function buildLineOffsets(source: string): number[] {
  const offsets: number[] = [0];
  for (let i = 0; i < source.length; i++) {
    if (source.charCodeAt(i) === 0x0a /* \n */) {
      offsets.push(i + 1);
    }
  }
  // Если документ не оканчивается на \n, добавляем "виртуальный" конец последней строки.
  if (offsets[offsets.length - 1] !== source.length) {
    offsets.push(source.length);
  }
  return offsets;
}

/**
 * Возвращает character-офсет (UTF-16 code unit) конца строки `lineEnd` (exclusive), безопасно
 * обрабатывая случай, когда токен указывает строку за пределами файла.
 */
function lineEndOffset(
  lineOffsets: number[],
  lineEnd: number,
  sourceLength: number,
): number {
  if (lineEnd >= lineOffsets.length) return sourceLength;
  return lineOffsets[lineEnd];
}

/**
 * Парсит верхнеуровневые токены markdown-it в массив `Block`, отсортированный
 * по `from`.
 *
 * Шаги:
 *  1. Сканируем `tokens`, отбирая токены уровня 0 (top-level).
 *  2. Для блочных пар `*_open` / `*_close` используем `map: [lineStart, lineEnd)`
 *     открывающего токена (markdown-it гарантирует, что `map[1]` покрывает
 *     полный диапазон блока, включая вложенное содержимое — см. блок-кейсы для
 *     списков и blockquote).
 *  3. Для само-закрывающихся (`fence`, `code_block`, `hr`, `html_block`) — `map` напрямую.
 *  4. Превращаем линейные индексы в character-офсеты (UTF-16 code units) через `lineOffsets`.
 */
function tokensToBlocks(
  tokens: MarkdownItToken[],
  lineOffsets: number[],
  sourceLength: number,
  source: string,
): Block[] {
  const blocks: Block[] = [];

  for (const token of tokens) {
    // Только верхнеуровневые: list_items и параграфы внутри списка/blockquote
    // имеют level > 0 и не должны попадать как отдельные блоки.
    if (token.level !== 0) continue;
    if (!token.map) continue;

    // Закрывающие токены отдельных Block-ов не порождают: их диапазон уже
    // покрыт map открывающего.
    if (token.nesting === -1) continue;

    const mappedType = TOKEN_TYPE_MAP[token.type];
    if (!mappedType) continue;

    const [lineStart, lineEnd] = token.map;
    const from = lineOffsets[lineStart];
    let to = lineEndOffset(lineOffsets, lineEnd, sourceLength);

    // markdown-it часто указывает `map[1]` на строку ПОСЛЕ содержимого
    // (например, для списков это blank-разделитель). По контракту "пустые
    // строки между блоками не принадлежат ни одному блоку" — отрезаем
    // trailing blank-lines из диапазона.
    while (to > from) {
      let lastLineStart = to - 1;
      while (lastLineStart > from && source[lastLineStart - 1] !== "\n") {
        lastLineStart--;
      }
      if (source.slice(lastLineStart, to).trim() === "") {
        to = lastLineStart;
      } else {
        break;
      }
    }

    // Защита от пустого диапазона: токен с from === to не имеет смысла как Block.
    if (to <= from) continue;

    blocks.push({
      from,
      to,
      type: mappedType,
      raw: source.slice(from, to),
    });
  }

  return blocks;
}

/**
 * Сканирует строки источника, не покрытые ни одним токен-блоком, и детектирует
 * определения reference links.
 *
 * Markdown-it извлекает reference-ы в `env.references` и не эмитит для них
 * токены вообще, поэтому без отдельного прохода они выпадают из координат.
 */
function findReferenceBlocks(
  source: string,
  lineOffsets: number[],
  tokenBlocks: Block[],
): Block[] {
  const numLines = lineOffsets.length - 1;
  if (numLines === 0) return [];

  // Битовая маска "строка покрыта токеном". Считаем sweep-ом за O(numLines + n*log n)
  // вместо наивного O(numLines * numBlocks): сортируем блоки по `from` и идём по
  // строкам, продвигая текущий "активный" блок.
  const covered = new Array<boolean>(numLines).fill(false);
  const sortedBlocks = tokenBlocks.slice().sort((a, b) => a.from - b.from);
  let blockIdx = 0;
  for (let line = 0; line < numLines; line++) {
    const lineStart = lineOffsets[line];
    const lineEnd = lineOffsets[line + 1];
    // Промотать блоки, которые закончились до начала текущей строки.
    while (
      blockIdx < sortedBlocks.length &&
      sortedBlocks[blockIdx].to <= lineStart
    ) {
      blockIdx++;
    }
    // Если текущий блок ещё активен и пересекается со строкой — строка покрыта.
    if (
      blockIdx < sortedBlocks.length &&
      sortedBlocks[blockIdx].from < lineEnd
    ) {
      covered[line] = true;
    }
  }

  const refs: Block[] = [];

  for (let line = 0; line < numLines; line++) {
    if (covered[line]) continue;

    const lineStart = lineOffsets[line];
    const lineEnd = lineOffsets[line + 1];
    // Убираем терминатор строки для матчинга регуляркой.
    const rawLine = source.slice(lineStart, lineEnd).replace(/\r?\n$/, "");

    // Сначала проверяем `[label]: dest` без inline-title — если следующая строка
    // выглядит как title-продолжение (`  "title"`), объединяем их в один Block.
    // Этот case проверяется ПЕРВЫМ: однострочный матчер `REFERENCE_LINE_REGEX`
    // тоже пропустит "label: dest" без title, и мы бы потеряли continuation.
    if (
      REFERENCE_LABEL_DEST_REGEX.test(rawLine) &&
      line + 1 < numLines &&
      !covered[line + 1]
    ) {
      const nextStart = lineOffsets[line + 1];
      const nextEnd = lineOffsets[line + 2];
      const nextRawLine = source
        .slice(nextStart, nextEnd)
        .replace(/\r?\n$/, "");
      if (REFERENCE_TITLE_CONT_REGEX.test(nextRawLine)) {
        refs.push({
          from: lineStart,
          to: nextEnd,
          type: "reference",
          raw: source.slice(lineStart, nextEnd),
        });
        // Пропустить строку с title, чтобы не парсить её повторно.
        line++;
        continue;
      }
    }

    // Однострочный reference (title в той же строке либо без title).
    if (REFERENCE_LINE_REGEX.test(rawLine)) {
      refs.push({
        from: lineStart,
        to: lineEnd,
        type: "reference",
        raw: source.slice(lineStart, lineEnd),
      });
      continue;
    }
  }

  return refs;
}

// Singleton: создание `MarkdownIt` — заметная аллокация, парсер re-entrant и
// stateless по входу, переиспользовать безопасно.
//
// Опции:
//  - `html: true` — нужен, чтобы markdown-it эмитил отдельный токен `html_block`
//    для верхнеуровневых HTML-блоков. С дефолтным `html: false` `<div>foo</div>`
//    превращается в обычный paragraph, и мы потеряли бы тип `html_block` из AC.
//    На безопасность это не влияет: мы не рендерим HTML — мы только режем
//    исходник на блоки и возвращаем `raw` как есть.
//  - Таблицы (GFM) включены в markdown-it по умолчанию, дополнительно их не
//    активируем.
const md = new MarkdownIt({ html: true });

/**
 * Разбивает Markdown-документ на массив верхнеуровневых блоков с точными
 * character-границами.
 *
 * Контракт:
 *  - Пустой или whitespace-only вход → `[]`.
 *  - Блоки возвращаются в порядке появления в исходнике (отсортированы по `from`).
 *  - Для каждого блока выполнено `raw === source.slice(from, to)` и `from < to`.
 *  - Вложенное содержимое (item в `list`, параграф в `blockquote`) НЕ
 *    выносится в отдельный блок — оно лежит внутри `raw` родителя.
 *  - Пустые строки между блоками не принадлежат ни одному блоку.
 *
 * Поведение при некорректном входе:
 *  - Незакрытый fence — markdown-it сам "тянет" блок до EOF, корректно.
 *  - Смешанные `\n` и `\r\n` — character-офсеты (UTF-16) остаются точными.
 *  - Большой ввод — `O(n)` по длине, парсинг markdown-it `O(n)`.
 */
export function parseBlocks(source: string): Block[] {
  if (source.length === 0) return [];
  // Whitespace-only: markdown-it всё равно вернёт пустые токены, но мы хотим
  // ранний выход для очевидного случая.
  if (/^\s*$/.test(source)) return [];

  const lineOffsets = buildLineOffsets(source);
  const tokens = md.parse(source, {});
  const tokenBlocks = tokensToBlocks(
    tokens,
    lineOffsets,
    source.length,
    source,
  );
  const refBlocks = findReferenceBlocks(source, lineOffsets, tokenBlocks);

  const all = tokenBlocks.concat(refBlocks);
  all.sort((a, b) => a.from - b.from);
  return all;
}
