/**
 * Форматирующие действия редактора (MDP-17).
 *
 * Две части:
 *   (а) ЧИСТОЕ ЯДРО — детерминированные преобразования над строкой и
 *       диапазоном выделения. Без EditorView, без побочных эффектов. Каждое
 *       возвращает новый полный текст документа и новое выделение. Это
 *       позволяет юнит-тестировать каждое преобразование (SENAR-правило 4).
 *   (б) CM6 Command-обёртки — читают текущее выделение из state, применяют
 *       чистую функцию и диспатчат транзакцию с корректным новым выделением.
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
 * Обернуть выделение `[from, to)` парой `open`/`close` либо снять обёртку,
 * если она уже присутствует (toggle).
 *
 * Распознавание «уже обёрнуто» — два случая:
 *   1. Маркеры ВКЛЮЧЕНЫ в выделение: текст выделения начинается на `open`
 *      и заканчивается на `close`.
 *   2. Маркеры ВОКРУГ выделения: непосредственно перед `from` стоит `open`,
 *      а сразу после `to` — `close`.
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

  // Случай 1: маркеры включены в выделение.
  if (
    selected.length >= open.length + close.length &&
    selected.startsWith(open) &&
    selected.endsWith(close)
  ) {
    const inner = selected.slice(open.length, selected.length - close.length);
    const next = text.slice(0, from) + inner + text.slice(to);
    return { text: next, from, to: from + inner.length };
  }

  // Случай 2: маркеры непосредственно вокруг выделения.
  if (
    from - open.length >= 0 &&
    to + close.length <= text.length &&
    text.slice(from - open.length, from) === open &&
    text.slice(to, to + close.length) === close
  ) {
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

/**
 * Обернуть выделенные строки в ограждение ``` (открывающая и закрывающая —
 * на отдельных строках) либо снять его (toggle).
 *
 * Выделение расширяется до целых строк. Распознавание «уже в fence»: строка
 * непосредственно над расширенным выделением равна `` ``` ``, и строка
 * непосредственно под ним — тоже.
 */
export function toggleCodeFence(
  text: string,
  from: number,
  to: number,
): FormatRange {
  // Расширяем границы выделения до начала/конца строк.
  const lineStart = text.lastIndexOf("\n", from - 1) + 1;
  let lineEnd = text.indexOf("\n", to);
  if (lineEnd === -1) lineEnd = text.length;

  const before = text.slice(0, lineStart);
  const block = text.slice(lineStart, lineEnd);
  const after = text.slice(lineEnd);

  // Проверяем, окружён ли блок строками-ограждениями.
  // `before` оканчивается на "```\n", `after` начинается с "\n```".
  const fencedAbove =
    before === FENCE + "\n" || before.endsWith("\n" + FENCE + "\n");
  const fencedBelow =
    after === "\n" + FENCE || after.startsWith("\n" + FENCE + "\n");

  if (fencedAbove && fencedBelow) {
    // Снять ограждение: убрать строку ``` сверху и снизу.
    const newBefore = before.slice(0, before.length - (FENCE.length + 1));
    const newAfter = after.slice(FENCE.length + 1);
    const next = newBefore + block + newAfter;
    const newFrom = newBefore.length;
    return { text: next, from: newFrom, to: newFrom + block.length };
  }

  // Обернуть в ограждение.
  const wrapped = FENCE + "\n" + block + "\n" + FENCE;
  const next = before + wrapped + after;
  const newFrom = before.length + FENCE.length + 1;
  return { text: next, from: newFrom, to: newFrom + block.length };
}

// ----- CM6 Command-обёртки -----

/**
 * Универсальная обёртка: применяет чистую функцию `fn` к главному выделению
 * текущего state и диспатчит транзакцию с новым текстом и выделением.
 *
 * Чистые функции работают над полным текстом документа, поэтому здесь мы
 * заменяем весь документ результатом и переустанавливаем выделение. Для
 * редактора заметок (плоский Markdown) это корректно и предсказуемо.
 */
function applyFormat(
  fn: (text: string, from: number, to: number) => FormatRange,
): Command {
  return (view) => {
    const { state } = view;
    const range = state.selection.main;
    const text = state.doc.toString();
    const result = fn(text, range.from, range.to);
    view.dispatch({
      changes: { from: 0, to: state.doc.length, insert: result.text },
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
