/**
 * Inline-render extension (MDP-12) — ключевая фича редактора.
 *
 * Каждый верхнеуровневый блок Markdown (см. `parseBlocks`) заменяется
 * декорацией `Decoration.replace({ widget, block: true })`, виджет которой
 * рендерит HTML-представление блока через `markdown-it`. Документ открывается
 * сразу «как Typora»: исходник остаётся плоским Markdown в `EditorState`, а
 * рендер — это слой декораций поверх него.
 *
 * ## Почему StateField, а не ViewPlugin
 *
 * В тексте задачи фигурирует «ViewPlugin строит DecorationSet». Технически это
 * невыполнимо: CodeMirror 6 запрещает отдавать **block-виджеты** и декорации,
 * **перекрывающие перенос строки**, из функции-провайдера (ViewPlugin) — такие
 * декорации влияют на вертикальную раскладку, а высоты строк должны быть
 * известны до отрисовки viewport, тогда как плагины исполняются позже. Их
 * нужно отдавать напрямую из `StateField` (facet `EditorView.decorations`).
 * Поэтому весь набор декораций строится в `StateField`. (Замена блока всегда
 * перекрывает переносы строк, кроме однострочного документа без финального
 * перевода строки.)
 *
 * ## Лень и производительность
 *
 * Диапазоны декораций строятся на весь документ (block-декорации обязаны быть
 * известны целиком — это требование CM6). Но это дёшево: `parseBlocks` — O(n),
 * а виджеты хранят только `raw`-строку. Дорогой `markdown-it.render` отложен в
 * `toDOM()`, который CodeMirror вызывает **лениво** — лишь для виджетов внутри
 * (или рядом с) viewport. Результат рендера кешируется по `raw`, поэтому при
 * скролле повторного рендеринга нет, а правка одного блока не перерисовывает
 * остальные. Это и обеспечивает плавный скролл на больших документах: скролл
 * не меняет документ → набор декораций стабилен → пересборки нет.
 *
 * ## Безопасность
 *
 * Рендер-инстанс `markdown-it` создаётся с `html: false` (по умолчанию):
 * сырой HTML в исходнике **экранируется**, а не вставляется как разметка.
 * Встроенный `validateLink` markdown-it блокирует `javascript:` / `vbscript:`
 * / небезопасные `data:`-URL. Поэтому `innerHTML` из вывода рендера безопасен
 * без дополнительного санитайзера (его добавление потребовало бы новой
 * зависимости — вне области задачи). Парсер блоков (`blocks.ts`) использует
 * отдельный инстанс с `html: true` для нарезки на блоки — он HTML не рендерит.
 *
 * Отдельно про блоки типа `html_block`: парсер (`blocks.ts`) сознательно
 * включает `html: true`, чтобы такие блоки получили тип `html_block`, и их
 * `raw` — это буквально сырой HTML. Но рендер этого `raw` идёт через наш
 * инстанс с `html: false`, поэтому HTML экранируется (как текст), а не
 * исполняется. Разница в конфигурации двух инстансов и есть барьер: тест XSS
 * в `inlineRender.decorations.test.ts` фиксирует это поведение для html_block.
 *
 * ## Активный raw-блок (MDP-13)
 *
 * Один блок может быть «активным» — показанным как сырой Markdown для правки.
 * Его позицию (offset начала блока) хранит `rawBlockField: StateField<number |
 * null>`; `null` — все блоки отрендерены. `buildDecorations` пропускает блок,
 * чей `from` совпадает с активным, поэтому его виджет не строится и пользователь
 * видит исходный текст. Переключение — только явными действиями: клик по
 * виджету, F2 (toggle), Esc (вернуть рендер). Перемещение каретки активный блок
 * НЕ меняет.
 *
 * ## Авто-ререндер при потере фокуса / Esc (MDP-14)
 *
 * Когда активный raw-блок теряет фокус (редактор получает DOM-событие `blur`),
 * он автоматически возвращается в рендер: обработчик диспатчит `setRawBlock.of(null)`.
 * Это `rawBlockBlurHandler`. Esc уже покрыт командой `escapeRawBlock` и НЕ трогает
 * selection — каретка остаётся на своей позиции после возврата к рендеру.
 *
 * Чтобы переход render↔raw не «прыгал», `.cm-md-block` получает плавный fade по
 * `opacity` (`--motion-fast`). Высоту НЕ анимируем (запрет DESIGN.md), а её скачок
 * сглаживает `estimatedHeight` виджета (оценка до измерения) + fade появления.
 */

import { EditorView, WidgetType, Decoration, keymap } from "@codemirror/view";
import type { DecorationSet, Command } from "@codemirror/view";
import {
  StateField,
  StateEffect,
  RangeSetBuilder,
  MapMode,
  EditorState,
} from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import MarkdownIt from "markdown-it";
import { parseBlocks, type Block, type BlockType } from "$lib/markdown/blocks";

// ---------------------------------------------------------------------------
// Кэш рендера raw → html
// ---------------------------------------------------------------------------

// Отдельный от парсера инстанс: `html: false` экранирует сырой HTML (см.
// «Безопасность» в шапке файла). Дефолты markdown-it: linkify/breaks off.
const renderer = new MarkdownIt({ html: false });

// Ключ — сама `raw`-строка блока (Map сравнивает строки по значению, без риска
// коллизий числового хэша). Кэш ограничен, чтобы не течь на длинных сессиях с
// множеством уникальных блоков: при переполнении выбрасываем самый старый ключ
// (insertion-order Map → первый ключ — самый ранний).
const RENDER_CACHE_MAX = 2000;
const renderCache = new Map<string, string>();

// Грубая оценка высоты строки в px для `estimatedHeight` (см. виджет ниже).
// Эвристика, не обязана быть точной — CM6 уточняет высоту при измерении.
const ESTIMATED_LINE_HEIGHT_PX = 20;

function renderCached(raw: string): string {
  const hit = renderCache.get(raw);
  if (hit !== undefined) return hit;
  const html = renderer.render(raw);
  if (renderCache.size >= RENDER_CACHE_MAX) {
    const oldest = renderCache.keys().next().value;
    if (oldest !== undefined) renderCache.delete(oldest);
  }
  renderCache.set(raw, html);
  return html;
}

/**
 * Сбрасывает кэш рендера. Нужен в тестах для изоляции; в проде не вызывается.
 */
export function __clearRenderCache(): void {
  renderCache.clear();
}

// ---------------------------------------------------------------------------
// Виджет отрендеренного блока
// ---------------------------------------------------------------------------

/**
 * Заменяет один блок Markdown его HTML-рендером.
 *
 * `eq()` сравнивает по `raw` + `type`: если содержимое блока не изменилось,
 * CodeMirror переиспользует уже отрисованный DOM (даже если блок сдвинулся по
 * позиции — её хранит сам диапазон декорации, а не виджет). Это ключ к тому,
 * чтобы правка одного блока не перерисовывала соседние.
 */
export class RenderedBlockWidget extends WidgetType {
  /** Кол-во строк исходника — для оценки высоты до измерения. */
  private readonly lineCount: number;

  constructor(
    readonly raw: string,
    readonly type: BlockType,
  ) {
    super();
    let lines = 1;
    for (let i = 0; i < raw.length; i++) {
      if (raw.charCodeAt(i) === 0x0a /* \n */) lines++;
    }
    this.lineCount = lines;
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof RenderedBlockWidget &&
      other.raw === this.raw &&
      other.type === this.type
    );
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "cm-md-block";
    wrap.setAttribute("data-block-type", this.type);
    // Безопасно: renderer создан с `html: false` (см. шапку файла).
    wrap.innerHTML = renderCached(this.raw);
    return wrap;
  }

  /**
   * Грубая оценка высоты до фактического измерения — помогает CM6 рассчитать
   * размер скроллбара на больших документах, пока виджет не отрисован.
   * Уточняется автоматически при первом измерении.
   */
  get estimatedHeight(): number {
    return this.lineCount * ESTIMATED_LINE_HEIGHT_PX;
  }

  /**
   * Возвращаем `false`: события (клик/выделение) обрабатывает редактор, чтобы
   * клик по блоку позиционировал каретку. Это фундамент для F2 / click-to-edit
   * (MDP-13). Дефолт `WidgetType.ignoreEvent` (true) сделал бы блок «глухим».
   */
  ignoreEvent(): boolean {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Активный raw-блок (MDP-13)
// ---------------------------------------------------------------------------

/**
 * Эффект смены активного raw-блока. Значение — offset начала блока (`block.from`)
 * или `null`, чтобы вернуть всё к рендеру.
 */
export const setRawBlock = StateEffect.define<number | null>();

/**
 * Позиция активного (raw) блока — его `from`, либо `null`, если активного нет.
 *
 * Меняется ТОЛЬКО эффектом `setRawBlock` (клик / F2 / Esc). При изменении
 * документа позиция мапится через `changes`, чтобы остаться привязанной к началу
 * того же блока. Селекция/скролл поле не трогают — это и есть «ручная» модель из
 * AC: перемещение каретки не делает блок raw автоматически.
 */
export const rawBlockField = StateField.define<number | null>({
  create() {
    return null;
  },
  update(value, tr) {
    let next = value;
    // Сначала переносим позицию через правки документа (привязка к началу блока,
    // assoc -1 — позиция остаётся слева от вставки ровно на границе). `TrackDel`
    // заставляет mapPos вернуть `null`, если позицию начала блока удалили
    // (например, внешняя замена всего буфера через doc-проп Editor.svelte):
    // тогда активного блока больше нет — fail-closed остаёмся на null, чтобы не
    // было «висячей» позиции, случайно совпадающей с началом другого блока.
    if (next !== null && tr.docChanged) {
      next = tr.changes.mapPos(next, -1, MapMode.TrackDel);
    }
    // Затем применяем явный эффект — он задаёт значение в координатах нового
    // документа (мы никогда не совмещаем setRawBlock с правкой в одной транзакции).
    for (const effect of tr.effects) {
      if (effect.is(setRawBlock)) {
        next = effect.value;
      }
    }
    return next;
  },
});

/**
 * Находит блок, содержащий позицию `pos` (`from <= pos <= to`), либо `null`.
 *
 * Границы инклюзивны с обеих сторон: каретка в самом начале или в самом конце
 * блока считается «внутри» него. Блоки не пересекаются и отсортированы по `from`,
 * поэтому на общей границе двух блоков (без пустой строки между ними) вернётся
 * первый — для toggle это не важно. Чистая функция: один и тот же вход даёт один
 * и тот же выход.
 */
export function findBlockAt(source: string, pos: number): Block | null {
  for (const block of parseBlocks(source)) {
    if (pos >= block.from && pos <= block.to) return block;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Построение набора декораций
// ---------------------------------------------------------------------------

/**
 * Строит `DecorationSet` из блоков документа.
 *
 * Для каждого блока создаётся block-level replace-декорация на диапазоне
 * `[block.from, end)`, где `end` — конец последней содержательной строки
 * блока (финальный `\n` блока **исключён**, чтобы перенос строки оставался
 * границей между виджетами, а не съедался декорацией). `block.from` и `end`
 * лежат на границах строк CM6 — обязательное условие для block-декораций.
 *
 * Блок, чей `from` совпадает с `rawFrom`, **пропускается**: он активен (raw),
 * виджет для него не строится, пользователь видит исходный Markdown (MDP-13).
 */
function buildDecorations(
  source: string,
  rawFrom: number | null,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const block of parseBlocks(source)) {
    if (rawFrom !== null && block.from === rawFrom) continue;
    let end = block.to;
    // Отрезаем завершающий перевод строки блока: он — разделитель, не контент.
    if (end > block.from && source.charCodeAt(end - 1) === 0x0a /* \n */) {
      end -= 1;
    }
    if (end <= block.from) continue;
    builder.add(
      block.from,
      end,
      Decoration.replace({
        widget: new RenderedBlockWidget(block.raw, block.type),
        block: true,
      }),
    );
  }
  return builder.finish();
}

// ---------------------------------------------------------------------------
// StateField + публичная фабрика расширения
// ---------------------------------------------------------------------------

/**
 * Поле с набором декораций рендера. Пересобирается при изменении документа ИЛИ
 * при смене активного raw-блока (`rawBlockField`) — иначе скролл/выделение набор
 * не трогают, что и обеспечивает стабильность при скролле. Читает `rawBlockField`,
 * поэтому в стеке расширений обязано идти ПОСЛЕ него (см. `inlineRender()`).
 * Экспортируется для проверки корректности декораций в тестах.
 */
export const inlineRenderField = StateField.define<DecorationSet>({
  create(state) {
    // `rawBlockField` всегда добавляется вместе с этим полем (см. `inlineRender`),
    // поэтому в норме присутствует. Но при переключении режима (MDP-15) оба поля
    // могут сниматься в одной reconfigure-транзакции, и порядок демонтажа полей
    // CM6 не гарантирован — читаем нетребовательной формой с фолбэком на `null`,
    // чтобы не упасть на «Field is not present».
    return buildDecorations(
      state.doc.toString(),
      state.field(rawBlockField, false) ?? null,
    );
  },
  update(deco, tr) {
    const rawNew = tr.state.field(rawBlockField, false) ?? null;
    const rawOld = tr.startState.field(rawBlockField, false) ?? null;
    if (!tr.docChanged && rawNew === rawOld) return deco;
    return buildDecorations(tr.state.doc.toString(), rawNew);
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ---------------------------------------------------------------------------
// Команды и обработчики: F2 / Esc / клик (MDP-13)
// ---------------------------------------------------------------------------

/**
 * F2 — toggle raw-режима блока под кареткой. Если блок уже активен (raw),
 * возвращает его в рендер; иначе делает активным и ставит каретку в его начало.
 * Если каретка не внутри блока (пустая строка/пустой документ) — no-op.
 */
export const toggleRawBlock: Command = (view) => {
  const { state } = view;
  const block = findBlockAt(state.doc.toString(), state.selection.main.head);
  if (!block) return false;
  if (state.field(rawBlockField) === block.from) {
    view.dispatch({ effects: setRawBlock.of(null) });
  } else {
    view.dispatch({
      effects: setRawBlock.of(block.from),
      selection: { anchor: block.from },
    });
  }
  return true;
};

/**
 * Esc — возвращает рендер активного блока. Если активного нет, не перехватывает
 * клавишу (возвращает `false`), чтобы Esc оставался доступен другим обработчикам.
 */
export const escapeRawBlock: Command = (view) => {
  if (view.state.field(rawBlockField) === null) return false;
  view.dispatch({ effects: setRawBlock.of(null) });
  return true;
};

const rawBlockKeymap = keymap.of([
  { key: "F2", run: toggleRawBlock, preventDefault: true },
  { key: "Escape", run: escapeRawBlock },
]);

/**
 * Двойной клик по виджету блока: делает блок активным (raw), ставит каретку в
 * его начало и забирает фокус. Виджет снимается при пересборке декораций.
 * Одиночный клик намеренно НЕ перехватываем — он оставляет дефолтное поведение
 * CodeMirror (позиционирование каретки рядом с блоком), чтобы можно было просто
 * ткнуть в текст, не входя в raw. `posAtDOM` берёт позицию структурно (без
 * layout) — работает и в jsdom-тестах.
 */
const rawBlockClickHandler = EditorView.domEventHandlers({
  dblclick(event, view) {
    const target = event.target as HTMLElement | null;
    const widget = target?.closest(".cm-md-block");
    if (!widget) return false;
    // Валидация перед posAtDOM: узел обязан принадлежать DOM редактора. closest
    // от target внутри редактора это уже гарантирует, но проверка fail-closed
    // защищает от чужого элемента с таким же классом (posAtDOM иначе бросил бы).
    if (!view.dom.contains(widget)) return false;
    const pos = view.posAtDOM(widget as HTMLElement);
    const block = findBlockAt(view.state.doc.toString(), pos);
    if (!block) return false;
    view.dispatch({
      effects: setRawBlock.of(block.from),
      selection: { anchor: block.from },
    });
    view.focus();
    return true;
  },
});

/**
 * Потеря фокуса редактором (MDP-14): если есть активный raw-блок, возвращаем его
 * в рендер — `setRawBlock.of(null)`. Поведение «потерял фокус → отрендерился».
 *
 * `view.dom.contains(event.relatedTarget)` отсеивает «внутренние» blur (фокус ушёл
 * к другому элементу самого редактора, например к скроллбару) — в этом случае
 * содержательной потери фокуса нет, блок остаётся raw. Если `relatedTarget` вне
 * редактора или `null` (фокус ушёл наружу/в никуда) — ререндерим.
 *
 * Возвращаем `false`: blur — не «команда», мы не «поглощаем» событие, только
 * реагируем побочным эффектом (диспатч).
 *
 * Fail-closed перед диспатчем (RISK-1): при быстром закрытии/смене вкладки blur
 * может прийти, когда view уже отсоединён от DOM (но обработчик ещё навешан).
 * Диспатч в такой view бессмысленен и может бросить из-за гонки уничтожения.
 * Проверяем `view.dom.isConnected`: это самый дешёвый и точный признак того,
 * что view ещё в живом дереве документа — не диспатчим, если он отсоединён.
 * `try/catch` дополнительно страхует от гонки, когда view отсоединяется ровно
 * между проверкой и диспатчем; пустого `catch {}` нет — причина задокументирована.
 */
const rawBlockBlurHandler = EditorView.domEventHandlers({
  blur(event, view) {
    if (view.state.field(rawBlockField) === null) return false;
    const next = event.relatedTarget;
    if (next instanceof Node && view.dom.contains(next)) return false;
    // View отсоединён от документа (вкладку закрыли/сменили) — диспатч не нужен
    // и небезопасен.
    if (!view.dom.isConnected) return false;
    try {
      view.dispatch({ effects: setRawBlock.of(null) });
    } catch {
      // Гонка уничтожения: view отсоединился между проверкой и dispatch.
      // Глотаем намеренно — ререндерить уже нечего, состояние выбрасывается.
    }
    return false;
  },
});

/**
 * Типографика отрендеренного блока. Всё через дизайн-токены (DESIGN.md):
 * цвета не хардкодятся, отступы кратны 4px (`--space-half` — задокументированное
 * исключение), радиусы из `--radius-*`. Тело — `--font-prose`; код — `--font-mono`.
 * Размеры заголовков размечены в `tokens.css` именно под rendered-контент
 * (`--fs-3xl`=H1, `--fs-2xl`=H2, `--fs-xl`=H3). Тонкая полировка — позже.
 */
export const inlineRenderThemeSpec: Record<string, Record<string, string>> = {
  ".cm-md-block": {
    padding: "var(--space-1) 0",
    fontFamily: "var(--font-prose)",
    fontSize: "var(--fs-md)",
    lineHeight: "var(--lh-prose)",
    color: "var(--fg-primary)",
    // Плавный fade появления/исчезновения виджета при переходе render↔raw
    // (MDP-14). Анимируем ТОЛЬКО opacity — height/all запрещены DESIGN.md, иначе
    // были бы «прыжки» высоты. Длительность/кривая — из motion-токенов.
    transition: "opacity var(--motion-fast) var(--ease-out)",
  },
  ".cm-md-block > :first-child": { marginTop: "0" },
  ".cm-md-block > :last-child": { marginBottom: "0" },

  // Заголовки.
  ".cm-md-block h1": {
    fontSize: "var(--fs-3xl)",
    fontWeight: "var(--fw-bold)",
    lineHeight: "var(--lh-tight)",
    margin: "var(--space-4) 0 var(--space-2)",
  },
  ".cm-md-block h2": {
    fontSize: "var(--fs-2xl)",
    fontWeight: "var(--fw-bold)",
    lineHeight: "var(--lh-tight)",
    margin: "var(--space-4) 0 var(--space-2)",
  },
  ".cm-md-block h3": {
    fontSize: "var(--fs-xl)",
    fontWeight: "var(--fw-bold)",
    lineHeight: "var(--lh-tight)",
    margin: "var(--space-3) 0 var(--space-2)",
  },
  ".cm-md-block h4, .cm-md-block h5, .cm-md-block h6": {
    fontSize: "var(--fs-lg)",
    fontWeight: "var(--fw-bold)",
    lineHeight: "var(--lh-tight)",
    margin: "var(--space-3) 0 var(--space-2)",
  },

  // Абзацы и акценты.
  ".cm-md-block p": { margin: "var(--space-2) 0" },
  ".cm-md-block strong": { fontWeight: "var(--fw-bold)" },
  ".cm-md-block em": { fontStyle: "italic" },
  ".cm-md-block a": {
    color: "var(--syntax-link)",
    textDecoration: "underline",
  },

  // Списки.
  ".cm-md-block ul, .cm-md-block ol": {
    margin: "var(--space-2) 0",
    paddingLeft: "var(--space-6)",
  },
  ".cm-md-block li": { margin: "var(--space-half) 0" },

  // Инлайн-код и блоки кода.
  ".cm-md-block code": {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--fs-sm)",
    color: "var(--syntax-code)",
  },
  ".cm-md-block pre": {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--fs-sm)",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-3)",
    overflow: "auto",
    margin: "var(--space-2) 0",
  },
  ".cm-md-block pre code": {
    color: "var(--fg-primary)",
    padding: "0",
    background: "none",
  },

  // Цитаты и разделители.
  ".cm-md-block blockquote": {
    margin: "var(--space-2) 0",
    paddingLeft: "var(--space-3)",
    borderLeft: "2px solid var(--border-default)",
    color: "var(--syntax-quote)",
    fontStyle: "italic",
  },
  ".cm-md-block hr": {
    border: "none",
    borderTop: "1px solid var(--border-default)",
    margin: "var(--space-4) 0",
  },

  // Таблицы (GFM).
  ".cm-md-block table": {
    borderCollapse: "collapse",
    margin: "var(--space-2) 0",
  },
  ".cm-md-block th, .cm-md-block td": {
    border: "1px solid var(--border-default)",
    padding: "var(--space-1) var(--space-2)",
    textAlign: "left",
  },
  ".cm-md-block th": {
    fontWeight: "var(--fw-bold)",
    background: "var(--bg-elevated)",
  },
};

/**
 * Типографика отрендеренного блока как CM6-расширение. Спецификация вынесена в
 * `inlineRenderThemeSpec` (экспортируется), чтобы тесты могли дёшево проверять
 * правила (например запрет анимаций all/height — AC#3 MDP-14) без layout.
 */
const inlineRenderTheme = EditorView.baseTheme(inlineRenderThemeSpec);

/**
 * Фабрика расширения inline-рендера. Добавь в стек расширений `EditorState`,
 * чтобы документ открывался отрендеренным по блокам.
 *
 * Порядок важен: `rawBlockField` идёт ПЕРЕД `inlineRenderField`, потому что тот
 * читает значение поля в `create`/`update` (CM6 инициализирует поля по порядку).
 * `rawBlockKeymap`/`rawBlockClickHandler` добавлены раньше основного keymap из
 * `Editor.svelte`, поэтому F2/Esc/клик имеют приоритет над дефолтными биндингами.
 * `rawBlockBlurHandler` (MDP-14) возвращает блок в рендер при потере фокуса.
 */
export function inlineRender(): Extension {
  return [
    rawBlockField,
    inlineRenderField,
    rawBlockKeymap,
    rawBlockClickHandler,
    rawBlockBlurHandler,
    inlineRenderTheme,
  ];
}

// ---------------------------------------------------------------------------
// Mixed-режим: блок под кареткой автоматически raw (MDP-15)
// ---------------------------------------------------------------------------

/**
 * Расширение mixed-режима. В отличие от `rendered`, где блок становится raw
 * только явным действием (F2/клик), в mixed активный raw-блок **следует за
 * кареткой**: блок, в котором находится `head`, всегда показан как сырой
 * Markdown, остальные отрендерены.
 *
 * Реализация — `EditorState.transactionExtender`, а НЕ асинхронный dispatch из
 * `updateListener`. Причина: extender выполняется при построении транзакции и
 * может дополнить её эффектом `setRawBlock` в той же транзакции, поэтому
 * `rawBlockField` обновляется синхронно вместе с селекцией — без мигания
 * (рендер → raw в два кадра) и без рекурсивного повторного dispatch.
 *
 * Алгоритм: если в транзакции изменилась селекция или документ, вычисляем блок
 * под новой `head` (в координатах нового документа) и, если его `from` отличается
 * от текущего активного, добавляем `setRawBlock.of(<from>)`. Каретка вне любого
 * блока (пустая строка между блоками, пустой документ) → `setRawBlock.of(null)`,
 * т.е. все блоки рендерятся. Если транзакция уже несёт собственный `setRawBlock`
 * (F2/клик/Esc) — мы его не трогаем, чтобы не конфликтовать с явными действиями.
 *
 * Добавляется ПОВЕРХ `inlineRender()` (которое уже даёт `rawBlockField` и набор
 * декораций) — отдельной фабрикой, чтобы Editor мог включать/выключать слежение
 * за кареткой через Compartment, не пересоздавая остальной inline-рендер.
 */
export function mixedModeExtension(): Extension {
  return EditorState.transactionExtender.of((tr) => {
    // Реагируем только на изменение селекции или документа: скролл и прочие
    // транзакции набор raw-блока не трогают.
    if (!tr.selection && !tr.docChanged) return null;
    // Не вмешиваемся, если транзакция уже задаёт активный блок явно
    // (F2/Esc/двойной клик кладут собственный setRawBlock).
    for (const effect of tr.effects) {
      if (effect.is(setRawBlock)) return null;
    }
    // `tr.newDoc`/`tr.newSelection` — состояние ПОСЛЕ применения транзакции,
    // в координатах нового документа (то же, что увидит rawBlockField).
    const head = tr.newSelection.main.head;
    const block = findBlockAt(tr.newDoc.toString(), head);
    const nextRaw = block ? block.from : null;
    // Нетребовательное чтение (`require: false`) с фолбэком на `null`: при
    // reconfigure-транзакции, переключающей режим (MDP-15), `rawBlockField` может
    // отсутствовать в `startState` (поля inline-рендера снимаются), и требовательная
    // форма бросила бы «Field is not present». Так же защищён `inlineRenderField`.
    const currentRaw = tr.startState.field(rawBlockField, false) ?? null;
    if (nextRaw === currentRaw) return null;
    return { effects: setRawBlock.of(nextRaw) };
  });
}
