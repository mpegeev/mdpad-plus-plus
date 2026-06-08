/**
 * Форматирующие действия редактора (MDP-17).
 *
 * Две части:
 *   (а) ЧИСТОЕ ЯДРО — детерминированные преобразования над строкой и
 *       диапазоном выделения. Без EditorView, без побочных эффектов. Каждое
 *       возвращает новый полный текст документа и новое выделение. Это
 *       позволяет юнит-тестировать каждое преобразование (SENAR-правило 4).
 *   (б) CM6 Command-обёртки — читают текущее выделение из state, применяют
 *       чистую функцию и диспатчат МИНИМАЛЬНЫЙ changeset (только изменённый
 *       диапазон) с корректным новым выделением.
 *
 * Inline-разметка:
 *   - bold:        `**…**`
 *   - italic:      `*…*`
 *   - underline:   `<u>…</u>` (через HTML — у CommonMark подчёркивания нет)
 *   - inline-code: `` `…` ``
 *   - code-fence:  строки ``` до и после выделения (для многострочного блока)
 *
 * Toggle: повторное применение к уже обёрнутому выделению снимает обёртку.
 *
 * Различение «уже обёрнуто» vs «соседний маркер» (ретро-ревью D1/D2):
 *   - симметричные маркеры (`*`, `**`, `` ` ``) считают длину РУНА маркерного
 *     символа вплотную к выделению. Снятие валидно лишь когда руна — цельная
 *     обёртка ровно этого маркера (учёт чётности: один `*` из `**` НЕ является
 *     italic-обёрткой);
 *   - асимметричные маркеры (`<u>`/`</u>`, `(`/`)`) сравнивают символы по обе
 *     стороны напрямую.
 *
 * Решение по ПУСТОМУ выделению (from === to):
 *   - inline-обёртки вставляют пару маркеров и ставят каретку МЕЖДУ ними,
 *     чтобы пользователь сразу печатал внутри (например, `**|**`).
 *   - code-fence для пустого выделения оборачивает текущую (пустую) строку,
 *     помещая каретку на пустую строку между ограждениями.
 */

import { keymap } from "@codemirror/view";
import type { Command } from "@codemirror/view";

/** Результат чистого преобразования: новый полный текст + новое выделение. */
export interface FormatRange {
  /** Новый полный текст документа после преобразования. */
  text: string;
  /** Начало нового выделения (индекс в `text`). */
  from: number;
  /** Конец нового выделения (индекс в `text`). */
  to: number;
}

/** Маркер ```. */
const FENCE = "```";

/**
 * Длина руна символа `ch`, заканчивающегося В позиции `end` (т.е. символы
 * `text[end-1]`, `text[end-2]`, … равные `ch`).
 */
function runBefore(text: string, end: number, ch: string): number {
  let n = 0;
  let i = end - 1;
  while (i >= 0 && text[i] === ch) {
    n++;
    i--;
  }
  return n;
}

/**
 * Длина руна символа `ch`, начинающегося В позиции `start` (символы
 * `text[start]`, `text[start+1]`, … равные `ch`).
 */
function runAfter(text: string, start: number, ch: string): number {
  let n = 0;
  let i = start;
  while (i < text.length && text[i] === ch) {
    n++;
    i++;
  }
  return n;
}

/** Маркер симметричен, если open === close и состоит из одного повторяющегося символа. */
function isSymmetricMarker(open: string, close: string): boolean {
  if (open !== close || open.length === 0) return false;
  const ch = open[0];
  for (let i = 1; i < open.length; i++) {
    if (open[i] !== ch) return false;
  }
  return true;
}

/**
 * Обернуть выделение `[from, to)` парой `open`/`close` либо снять обёртку,
 * если она уже присутствует (toggle).
 *
 * Распознавание «уже обёрнуто» — два случая:
 *   1. Маркеры ВКЛЮЧЕНЫ в выделение: текст выделения начинается на `open`
 *      и заканчивается на `close`.
 *   2. Маркеры ВОКРУГ выделения: непосредственно перед `from` стоит `open`,
 *      а сразу после `to` — `close`. Для симметричных маркеров дополнительно
 *      проверяется чётность руна, чтобы не спутать слой italic с частью bold
 *      (ретро-ревью D1).
 *
 * При снятии выделение охватывает развёрнутый текст; при обёртке — исходный
 * текст без маркеров. Пустое выделение → каретка между вставленными маркерами.
 */
export function toggleWrap(
  text: string,
  from: number,
  to: number,
  open: string,
  close: string,
): FormatRange {
  const selected = text.slice(from, to);
  const symmetric = isSymmetricMarker(open, close);

  // Случай 1: маркеры включены в выделение.
  // Для симметричных маркеров не считаем выделение цельной обёрткой, если оно
  // лишь начинается и заканчивается маркером, но между ними — другой маркер
  // того же символа (например '**x** and **y**'): требуем, чтобы это была
  // именно непрерывная обёртка (ретро-ревью D2).
  if (
    selected.length >= open.length + close.length &&
    selected.startsWith(open) &&
    selected.endsWith(close) &&
    isWholeWrap(selected, open, close, symmetric)
  ) {
    const inner = selected.slice(open.length, selected.length - close.length);
    const next = text.slice(0, from) + inner + text.slice(to);
    return { text: next, from, to: from + inner.length };
  }

  // Случай 2: маркеры непосредственно вокруг выделения.
  if (isWrappedAround(text, from, to, open, close, symmetric)) {
    const next =
      text.slice(0, from - open.length) +
      selected +
      text.slice(to + close.length);
    const newFrom = from - open.length;
    return { text: next, from: newFrom, to: newFrom + selected.length };
  }

  // Иначе — обернуть.
  const next = text.slice(0, from) + open + selected + close + text.slice(to);
  const newFrom = from + open.length;
  return { text: next, from: newFrom, to: newFrom + selected.length };
}

/**
 * Является ли `selected` цельной обёрткой `open…close` (а не двумя соседними
 * обёртками). Для симметричных маркеров отвергаем случай, когда внутреннее
 * содержимое само начинается/заканчивается тем же маркерным символом так, что
 * выделение распадается на несколько обёрток ('**x** and **y**').
 */
function isWholeWrap(
  selected: string,
  open: string,
  close: string,
  symmetric: boolean,
): boolean {
  if (!symmetric) return true;
  const ch = open[0];
  const inner = selected.slice(open.length, selected.length - close.length);
  // Внутренность не должна вплотную примыкать к маркеру тем же символом —
  // иначе руна на границе длиннее маркера и это не цельная обёртка.
  if (inner.length > 0 && (inner[0] === ch || inner[inner.length - 1] === ch)) {
    return false;
  }
  return true;
}

/**
 * Окружено ли выделение `[from, to)` маркерами `open`/`close` вплотную.
 * Для симметричных маркеров используется подсчёт руна с учётом чётности:
 * снятие валидно только если руна слева и справа — целое число обёрток данного
 * маркера (`(run - len) % (len) === 0` сводится для одиночного символа к тому,
 * что лишних символов того же маркера не остаётся «не парными»).
 */
function isWrappedAround(
  text: string,
  from: number,
  to: number,
  open: string,
  close: string,
  symmetric: boolean,
): boolean {
  if (from - open.length < 0 || to + close.length > text.length) return false;

  if (!symmetric) {
    return (
      text.slice(from - open.length, from) === open &&
      text.slice(to, to + close.length) === close
    );
  }

  const ch = open[0];
  const len = open.length;
  const left = runBefore(text, from, ch);
  const right = runAfter(text, to, ch);
  if (left < len || right < len) return false;
  // Руна должна быть «совместима» с маркером: после снятия len символов
  // остаток руны не должен быть невалидным «висячим» маркером.
  // Для одиночного символа (len=1): руна чётной длины — это пары (bold),
  // снимать один italic-маркер нельзя; руна нечётной длины содержит italic.
  // Общее правило: (left - len) и (right - len) должны быть чётными.
  return (left - len) % 2 === 0 && (right - len) % 2 === 0;
}

/**
 * Обернуть/снять симметричным inline-маркером (`**`, `*`, `` ` ``).
 * Частный случай `toggleWrap` с равными open/close.
 */
export function toggleInlineWrap(
  text: string,
  from: number,
  to: number,
  marker: string,
): FormatRange {
  return toggleWrap(text, from, to, marker, marker);
}

/** Является ли строка открывающим ограждением (``` + опциональная info-string). */
function isFenceOpen(line: string): boolean {
  return line.startsWith(FENCE);
}

/** Является ли строка закрывающим ограждением (только ``` и пробелы). */
function isFenceClose(line: string): boolean {
  return line.startsWith(FENCE) && line.slice(FENCE.length).trim() === "";
}

/**
 * Обернуть выделенные строки в ограждение ``` (открывающая и закрывающая —
 * на отдельных строках) либо снять его (toggle).
 *
 * Выделение расширяется до целых строк. Снятие (ретро-ревью D3/D4):
 *   - сканируем НАРУЖУ от строк выделения: вверх — до открывающего ограждения
 *     (``` с возможной info-string), вниз — до закрывающего (``` ).
 *   - если объемлющее ограждение найдено, удаляем обе его строки, сохраняя
 *     содержимое.
 */
export function toggleCodeFence(
  text: string,
  from: number,
  to: number,
): FormatRange {
  const lines = text.split("\n");

  // Смещения начала каждой строки в исходном тексте.
  const lineStart: number[] = [];
  {
    let acc = 0;
    for (const ln of lines) {
      lineStart.push(acc);
      acc += ln.length + 1; // +1 за '\n'
    }
  }

  // Индексы строк, затронутых выделением.
  const lineEndExclusive = (i: number): number =>
    lineStart[i] + lines[i].length;
  let selStartLine = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lineStart[i] <= from) selStartLine = i;
    else break;
  }
  let selEndLine = selStartLine;
  for (let i = selStartLine; i < lines.length; i++) {
    selEndLine = i;
    if (lineEndExclusive(i) >= to) break;
  }

  // Поиск объемлющего ограждения наружу.
  let openLine = -1;
  for (let i = selStartLine - 1; i >= 0; i--) {
    if (isFenceOpen(lines[i])) {
      openLine = i;
      break;
    }
  }
  let closeLine = -1;
  for (let i = selEndLine + 1; i < lines.length; i++) {
    if (isFenceClose(lines[i])) {
      closeLine = i;
      break;
    }
  }

  if (openLine !== -1 && closeLine !== -1) {
    // Снять ограждение: удалить строки openLine и closeLine.
    const kept = lines.filter((_, i) => i !== openLine && i !== closeLine);
    const next = kept.join("\n");
    // Новое выделение — содержимое, ранее бывшее между ограждениями.
    const contentLines = lines.slice(openLine + 1, closeLine);
    const before = lines.slice(0, openLine).join("\n");
    const newFrom = before.length + (openLine > 0 ? 1 : 0);
    const content = contentLines.join("\n");
    return { text: next, from: newFrom, to: newFrom + content.length };
  }

  // Обернуть выделенные строки в ограждение.
  const block = lines.slice(selStartLine, selEndLine + 1).join("\n");
  const head = lines.slice(0, selStartLine);
  const tail = lines.slice(selEndLine + 1);
  const wrappedLines = [...head, FENCE, block, FENCE, ...tail];
  const next = wrappedLines.join("\n");

  const beforeBlock = [...head, FENCE].join("\n");
  const newFrom = beforeBlock.length + 1; // +1 за '\n' перед block
  return { text: next, from: newFrom, to: newFrom + block.length };
}

// ----- CM6 Command-обёртки -----

/**
 * Универсальная обёртка: применяет чистую функцию `fn` к главному выделению
 * текущего state и диспатчит МИНИМАЛЬНУЮ транзакцию, затрагивающую только
 * изменённый диапазон (общий префикс/суффикс с исходным документом
 * отбрасываются). Это сохраняет undo-историю на больших документах
 * (ретро-ревью R1).
 */
function applyFormat(
  fn: (text: string, from: number, to: number) => FormatRange,
): Command {
  return (view) => {
    const { state } = view;
    const range = state.selection.main;
    const text = state.doc.toString();
    const result = fn(text, range.from, range.to);

    // Вычисляем минимальный изменённый диапазон: общий префикс и суффикс.
    let start = 0;
    const maxPrefix = Math.min(text.length, result.text.length);
    while (start < maxPrefix && text[start] === result.text[start]) start++;

    let endOld = text.length;
    let endNew = result.text.length;
    while (
      endOld > start &&
      endNew > start &&
      text[endOld - 1] === result.text[endNew - 1]
    ) {
      endOld--;
      endNew--;
    }

    view.dispatch({
      changes: {
        from: start,
        to: endOld,
        insert: result.text.slice(start, endNew),
      },
      selection: { anchor: result.from, head: result.to },
      scrollIntoView: true,
      userEvent: "input.format",
    });
    view.focus();
    return true;
  };
}

/** Обернуть/снять `**bold**` (Ctrl+B). */
export const toggleBold: Command = applyFormat((text, from, to) =>
  toggleInlineWrap(text, from, to, "**"),
);

/** Обернуть/снять `*italic*` (Ctrl+I). */
export const toggleItalic: Command = applyFormat((text, from, to) =>
  toggleInlineWrap(text, from, to, "*"),
);

/** Обернуть/снять `<u>underline</u>` (Ctrl+U). */
export const toggleUnderline: Command = applyFormat((text, from, to) =>
  toggleWrap(text, from, to, "<u>", "</u>"),
);

/** Обернуть/снять `` `inline-code` `` (Ctrl+`). */
export const toggleInlineCode: Command = applyFormat((text, from, to) =>
  toggleInlineWrap(text, from, to, "`"),
);

/** Обернуть/снять ограждение ``` (хоткей не задан — только команда). */
export const toggleCodeFenceCommand: Command = applyFormat(toggleCodeFence);

/**
 * Раскладка хоткеев форматирования. Подключается в Editor.svelte рядом с
 * остальными keymap. Code-fence намеренно без хоткея (AC#5).
 */
export const formatKeymap = keymap.of([
  { key: "Ctrl-b", run: toggleBold },
  { key: "Ctrl-i", run: toggleItalic },
  { key: "Ctrl-u", run: toggleUnderline },
  { key: "Ctrl-`", run: toggleInlineCode },
]);
