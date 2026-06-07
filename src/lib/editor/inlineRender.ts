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
 */

import { EditorView, WidgetType, Decoration } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { StateField, RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import MarkdownIt from "markdown-it";
import { parseBlocks, type BlockType } from "$lib/markdown/blocks";

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
 */
function buildDecorations(source: string): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const block of parseBlocks(source)) {
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
 * Поле с набором декораций рендера. Пересобирается только при изменении
 * документа (скролл/выделение не трогают набор — пока весь документ рендерится
 * целиком; активный raw-блок появится в MDP-13). Экспортируется для проверки
 * корректности декораций в тестах.
 */
export const inlineRenderField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state.doc.toString());
  },
  update(deco, tr) {
    if (!tr.docChanged) return deco;
    return buildDecorations(tr.state.doc.toString());
  },
  provide: (f) => EditorView.decorations.from(f),
});

/**
 * Типографика отрендеренного блока. Всё через дизайн-токены (DESIGN.md):
 * цвета не хардкодятся, отступы кратны 4px (`--space-half` — задокументированное
 * исключение), радиусы из `--radius-*`. Тело — `--font-prose`; код — `--font-mono`.
 * Размеры заголовков размечены в `tokens.css` именно под rendered-контент
 * (`--fs-3xl`=H1, `--fs-2xl`=H2, `--fs-xl`=H3). Тонкая полировка — позже.
 */
const inlineRenderTheme = EditorView.baseTheme({
  ".cm-md-block": {
    padding: "var(--space-1) 0",
    fontFamily: "var(--font-prose)",
    fontSize: "var(--fs-md)",
    lineHeight: "var(--lh-prose)",
    color: "var(--fg-primary)",
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
});

/**
 * Фабрика расширения inline-рендера. Добавь в стек расширений `EditorState`,
 * чтобы документ открывался отрендеренным по блокам.
 */
export function inlineRender(): Extension {
  return [inlineRenderField, inlineRenderTheme];
}
