# Handoff: mdpad++ — Anthropic-style визуальный редизайн

## Overview

Пакет описывает новое визуальное направление mdpad++ — **тёплый, светлый, «Anthropic-style»** язык (кремовый фон, серифная типографика в rendered-контенте, строгий чёрный/«ink» акцент) с опциональной тёмной темой. Это редизайн поверх существующей архитектуры (Tauri + Svelte 5 + CodeMirror 6) — **меняется только визуальный слой**: токены, темы, стили компонентов. Логика, структура DOM, поведение F2/вкладок/дерева файлов остаются как в `docs/architecture.md`.

> ⚠️ **Важно про направление.** Текущий `DESIGN.md` в репозитории описывает тёмный VS Code / Linear-стиль (`#1a1a1a`, синий акцент `#4f9cff`). Этот хэндофф его **заменяет** на Anthropic-направление. Раздел «Миграция DESIGN.md» ниже описывает, что переписать.

## About the Design Files

Файлы в `prototype/` — это **дизайн-референсы, сделанные в HTML/React**. Это НЕ продакшн-код для копирования. Задача разработчика — **воспроизвести эти экраны в существующем стеке проекта** (Svelte 5 компоненты в `src/lib/layout/`, токены в `src/styles/`), используя устоявшиеся паттерны репозитория (shadcn-svelte, `Icon.svelte`, CSS-переменные).

React/JSX в прототипе — лишь удобный способ собрать кликабельный макет. Маппинг «React-фрагмент → Svelte-компонент» дан ниже в разделе «Screens / Views».

## Fidelity

**High-fidelity (hifi).** Цвета, типографика, отступы, радиусы, состояния — финальные. Воспроизводить пиксельно, используя CSS-переменные проекта. Все значения — в разделе «Design Tokens».

## Как открыть прототип

- `prototype/prototype.html` — **кликабельный прототип** всего приложения. Кнопка ⚙ справа снизу (Tweaks) переключает: тему light/dark, акцент (Ink/Coral/Slate/Sage), плотность, расположение вкладок (сверху/сбоку), экран (editor / empty / sidebar states / open-folder dialog), номера строк, перенос, и **RAW frame** (Bold/Thin/None).
- `prototype/canvas.html` — **обзорный canvas**: все состояния рядом. Своя Tweaks-панель с Mood / Voice / Texture для примерки общего «настроения».

Оба используют общие `styles.css` (токены + темы) и `editor.css` (компоненты).

---

## Screens / Views

Маппинг на существующие Svelte-компоненты в `src/lib/layout/`.

### 1. Editor с контентом + активный RAW-блок (F2)

- **React-фрагмент:** `EditorWithContent` / `Editor` (`app.jsx`)
- **Svelte-цель:** `EditorArea.svelte`
- **Назначение:** основной режим. Markdown-блоки отрендерены (серифный `--font-prose`), один блок переведён в raw по F2.
- **Layout:** flex-строка `[gutter 56px][контент max-width 820px, центрирован]`. Вертикальный скролл на всей области. Floating toolbar — `position: absolute`, по центру снизу.
- **Rendered-блоки** (класс `.mdblock--*`): h1 36px / h2 28px (с нижним бордером) / p 14px `line-height 1.7` сериф / blockquote (левый бордер 3px акцент, фон `--bg-elevated`, italic) / ul (кастомный буллет ::before) / code (`--font-mono` 12px, фон `--bg-elevated`, бэйдж языка) / table (моноширинные ячейки, хедер uppercase 11px).
- **Активный блок:** фон `--accent-muted`, бордер `--border-subtle`, hover на остальных — `rgba(25,25,25,0.018)`.
- **RAW-блок** (`.mdblock--raw`): по умолчанию (Bold) — фон `--bg-overlay`, бордер `1px solid var(--accent)`, `box-shadow: 0 0 0 4px var(--accent-muted)`, бэйдж «RAW · F2 to render» абсолютно спозиционирован сверху-слева. Подсветка синтаксиса токенами `.tok--heading/code/link/...`. Мигающий курсор `.raw-cursor`.
  - **RAW frame = Thin:** бордер `1px solid var(--border-default)`, без свечения, бэйдж — контурный.
  - **RAW frame = None:** без рамки, фон `--bg-elevated`, левый бордер 2px, бэйдж — строчный.

### 2. Editor пустой (welcome / placeholder)

- **React-фрагмент:** `EditorEmpty`
- **Svelte-цель:** пустое состояние `EditorArea.svelte`
- **Layout:** центрированная карточка max-width 460px. Кламп-подсказка `Ctrl+N`, серифный заголовок 36px, абзац-объяснение, две кнопки (primary «Создать файл» + ghost «Открыть…»), блок горячих клавиш (`<kbd>` с нижним бордером 2px).

### 3. Sidebar — file tree

- **React-фрагмент:** `SidebarTree` / `Sidebar state="tree"`
- **Svelte-цель:** `Sidebar.svelte`
- **Layout:** колонка. Header 36px (заголовок «Files» uppercase 11px + 3 ghost-кнопки). Searchbox. Хлебная крошка пути. Скроллируемое тело с деревом.
- **Строки дерева** (`.tree-row`): высота 24px, отступ вложенности 14px/уровень. Папка — chevron + folder-иконка, `--fw-medium`. Файл — file-иконка ИЛИ dirty-точка. Hover `--bg-hover`. Active — `--bg-active` + левый бордер 2px акцент. Dirty — имя italic, точка `--accent`.

### 4. Sidebar — empty (open folder flow / CTA)

- **React-фрагмент:** `SidebarEmpty`
- **Назначение:** нет открытой папки. Иконка-иллюстрация в круге, заголовок «Папка не открыта», объяснение, primary «Открыть папку…», ghost «Создать файл», список «Недавние» (моноширинные пути).

### 5. Sidebar — loading

- **React-фрагмент:** `SidebarLoading`
- **Скелетоны** `.skel-row`: shimmer-анимация (`@keyframes shimmer`, 1.4s linear), разная ширина, stagger по `animation-delay`.

### 6. Open folder dialog (модалка)

- **React-фрагмент:** `OpenFolderDialog`
- **Layout:** backdrop `rgba(25,25,25,0.32)` + blur. Модалка 460px: header с иконкой + close, строка пути (хлебные крошки), скроллируемый список папок (текущая подсвечена `--accent-muted`), footer с подсказкой + Отмена/primary.

### 7. Tabs (все состояния)

- **React-фрагмент:** `TabsBar` / `Tab` / `TabsDetail`
- **Svelte-цель:** `TabsBar.svelte`
- **Состояния:**
  - **Active:** фон `--bg-base` (совпадает с областью редактора → визуальная связь), верхняя полоса акцента 2px (`::before`), нижний 1px `--bg-base` перекрывает бордер таб-бара (`::after`).
  - **Idle:** фон `--bg-elevated`, текст `--fg-secondary`.
  - **Hover:** фон `--bg-hover`, появляется close-кнопка.
  - **Dirty:** dirty-точка слева вместо иконки файла, имя italic.
  - **Close:** 16px, `opacity:0` → `1` на hover/active.
- Высота вкладки = `--tabs-height`. Max-width = 220px с ellipsis.

### 8. Status bar

- **React-фрагмент:** `StatusBar`
- **Svelte-цель:** `StatusBar.svelte`
- **Layout:** flex space-between, высота `--statusbar-height`, `--fs-xs`.
  - **Слева:** состояние (точка saved/dirty + «Сохранено/Изменено»), «Стр N, Кол M», «Sel: 0».
  - **Справа:** переключатель переноса (ghost-кнопка с иконкой wrap-text), кодировка (UTF-8), EOL (LF), язык (Markdown, `--fw-medium`).
- Сегменты разделены вертикальными бордерами `--border-subtle`.

### 9. Line numbers + gutter

- Ширина 56px, `--font-mono` 11px, фон `--bg-elevated`, правый бордер. `position: sticky; left: 0`.
- **Diff-маркеры** в gutter: `.gutter__line--modified` (`--warning`), `--added` (`--success`), `--deleted` (`--danger`) — 2px полоса справа.

### 10. Floating toolbar (форматирование)

- **React-фрагмент:** `FloatingToolbar`
- Plank: фон `--bg-overlay`, `--radius-md`, `--shadow-overlay`, padding 4px. Ghost-кнопки 28px. Группы (heading | bold/italic/code/link | list/ordered/quote/table) разделены 1px `.ftb-sep`.

### 11. Title bar (window chrome — Tauri)

- **React-фрагмент:** `TitleBar`
- Высота 32px, `-webkit-app-region: drag`, логотип-плашка + «<file> — mdpad++», справа min/max/close (close краснеет на hover). Воспроизводить только если используется кастомная рамка окна Tauri (`decorations: false`).

---

## Interactions & Behavior

- **F2:** активный rendered-блок → raw (снятие `Decoration.replace` widget, см. `architecture.md`). Визуально: появляется `.mdblock--raw` с рамкой по настройке RAW frame.
- **Клик по блоку:** активирует (фон `--accent-muted`).
- **Клик по вкладке:** активирует; close-кнопка закрывает.
- **Sidebar папки:** клик по строке-папке раскрывает/сворачивает (chevron rotate).
- **Status bar wrap-toggle:** переключает `--prose`-ширину / nowrap.
- **Анимации:** только `background` / `border-color` / `opacity` / `transform`, 100–150ms, `--ease-out: cubic-bezier(0.2,0,0,1)`. Никаких `transition: all` и анимаций `height`. Курсор в raw — `@keyframes blink` 1s step-end. Skeleton — shimmer 1.4s.

## State Management

Состояния, которые отражает UI (стор-уровень, имена — ориентир):

- `activeTabId`, `tabs[] { id, name, dirty }`
- `activeBlockId` (какой блок в raw)
- `lineWrap`, `lineNumbers` (boolean)
- `sidebarVisible`, `sidebarState` ∈ { tree, empty, loading }
- `theme` ∈ { light, dark }, `accent` ∈ { ink, orange, blue, green }, `density` ∈ { compact, default, comfortable }, `tabsLayout` ∈ { top, side }, `rawFrame` ∈ { bold, thin, none }
- Позиция курсора `line/col`, `encoding`, `eol`, `language` для status bar.

Тема/акцент/плотность/rawFrame применяются как `data-*`-атрибуты на корне (`data-theme`, `data-accent`, `data-density`, `data-raw-frame`) — CSS-переменные каскадируют. Это прямо переносится на `<html>` в Svelte.

---

## Design Tokens

### Маппинг на репозиторий

- Семейства, размеры, spacing, радиусы,高ы контролов → **`src/styles/tokens.css`**.
- Цвета light → **`src/styles/themes/light.css`** (селектор `:root[data-theme="light"]`).
- Цвета dark → **`src/styles/themes/dark.css`** (переписать под тёплую палитру ниже).
- Полные исходные значения — в `prototype/styles.css`.

### Цвета — Light (Anthropic)

```
--bg-base:      #faf9f5   /* тёплый кремовый — фон окна/редактора */
--bg-elevated:  #f5f3eb   /* сайдбар, таб-бар, статус-бар, gutter */
--bg-overlay:   #ffffff   /* попапы, floating toolbar, raw-блок */
--bg-hover:     #efece2
--bg-active:    #e8e5d8
--bg-selection: #e6dfc6

--fg-primary:   #191919
--fg-secondary: #6b6960
--fg-tertiary:  #9a978c
--fg-inverted:  #faf9f5

--border-subtle:  #ece9dd
--border-default: #ddd9c8
--border-strong:  #b8b3a0

--danger:  #c1554a
--warning: #b08a3e   /* gutter modified */
--success: #5d8a5b   /* gutter added, saved */

/* Syntax (raw mode) */
--syntax-heading: #5a4f9a
--syntax-code:    #a85a3e
--syntax-link:    #3d6b8a
--syntax-marker:  #b8b3a0
```

### Акцент (4 варианта, по умолчанию «Ink»)

```
ink (default): --accent #191919  --accent-fg #faf9f5  --accent-muted rgba(25,25,25,.08)
orange/Coral:  --accent #cc785c  --accent-fg #ffffff  --accent-muted rgba(204,120,92,.12)
blue/Slate:    --accent #3d6b8a  --accent-fg #ffffff  --accent-muted rgba(61,107,138,.12)
green/Sage:    --accent #3d6b58  --accent-fg #ffffff  --accent-muted rgba(61,107,88,.12)
```

Применяется через `[data-accent="..."]`; для «ink» атрибут снимается (значения по умолчанию в `:root`).

### Цвета — Dark (тёплая, НЕ инверсия)

```
--bg-base #1c1b18  --bg-elevated #232220  --bg-overlay #2a2826
--bg-hover #2f2d2a  --bg-active #353330  --bg-selection #4a4530
--fg-primary #ebe9e0  --fg-secondary #9a978c  --fg-tertiary #6b6960
--border-subtle #2a2826  --border-default #3a3733  --border-strong #5a564f
--accent #ebe9e0 (ink-dark)  --accent-fg #1c1b18
--syntax-heading #b39ed4  --syntax-code #d99a7a  --syntax-link #7aa6c4
```

### Типографика

```
--font-ui:    "Styrene B", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif
--font-mono:  "JetBrains Mono", ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace
--font-prose: "Source Serif 4", "Charter", "Iowan Old Style", Georgia, serif   /* rendered markdown */

Sizes:  --fs-xs 11 / --fs-sm 12 / --fs-base 13 / --fs-md 14 (editor) / --fs-lg 16 / --fs-xl 20 / --fs-2xl 28 (h2) / --fs-3xl 36 (h1)
Line-h: --lh-tight 1.2 / --lh-normal 1.5 / --lh-prose 1.7
Weight: 400 / 500 / 600 (без 700+)
```

> Шрифты: **Source Serif 4** и **JetBrains Mono** — веб-шрифты. Текущий `DESIGN.md` требует «только системные». Это сознательное отклонение ради Anthropic-вида — либо бандлить шрифты локально в `src-tauri`/assets (рекомендуется для мгновенного старта), либо оставить системные серифы (Charter/Georgia) как фолбэк. **Решение за вами — отметьте в DESIGN.md.**

### Spacing / радиусы / размеры

```
Spacing (4px): 0/4/8/12/16/20/24/32/40
Radius: --radius-sm 3 / --radius-md 4 / --radius-lg 6
Heights: --h-control-sm 24 / -md 28 / -lg 32
Panels: --sidebar-width 240 / --tabs-height 36 / --statusbar-height 24 / --titlebar-height 32 / --tab-max-width 220
--accent-indicator: 2px  --prose-max-width: 72ch
Shadow (overlay only): 0 1px 2px rgba(25,25,25,.04), 0 8px 24px rgba(25,25,25,.08), 0 0 0 1px var(--border-default)
Motion: --motion-fast 100ms / --motion-normal 150ms / --ease-out cubic-bezier(0.2,0,0,1)
```

### Density (через `[data-density]`)

```
compact:     tabs 30 / statusbar 22 / editor pad 16×32
default:     tabs 36 / statusbar 24 / editor pad 24×48
comfortable: tabs 40 / statusbar 28 / editor pad 32×64
```

---

## Миграция DESIGN.md

`DESIGN.md` — то, что Claude Code читает на каждой UI-задаче. Что обновить:

1. **Палитра** → заменить тёмную VS Code на Light-Anthropic выше; dark-тема становится вторичной (тёплая).
2. **Акцент** → `#4f9cff` (синий) ушёл; по умолчанию «ink» `#191919` + 3 пресета.
3. **Типографика** → добавить `--font-prose` (Source Serif 4) для rendered markdown; зафиксировать решение по веб-шрифтам vs системным.
4. **Размеры** → `--tabs-height` 32→36, `--statusbar-height` 22→24, добавить `--titlebar-height`, `--fs-2xl` 24→28, `--fs-3xl` 36.
5. **Тени** → раньше «почти не используем / тёмные»; теперь мягкая многослойная overlay-тень (значение выше).
6. **Новые токены/состояния** → `--accent-muted`, density-пресеты, `[data-raw-frame]` (Bold/Thin/None), Mood/Voice/Texture (опционально, только для демо-canvas).
7. **Ориентиры по духу** → добавить Anthropic / Typora; убрать «никаких тёплых тонов».

## Files

```
apply/                     — ★ ГОТОВЫЕ К ВСТАВКЕ файлы под вашу структуру (начни отсюда)
  apply/README.md          — куда что копировать + патч global.css + что изменилось
  apply/tokens.css         → заменяет src/styles/tokens.css
  apply/themes/light.css   → заменяет src/styles/themes/light.css
  apply/themes/dark.css    → заменяет src/styles/themes/dark.css

prototype/prototype.html   — кликабельный прототип (открыть первым; ⚙ Tweaks)
prototype/canvas.html      — обзор всех состояний рядом (Mood/Voice/Texture)
prototype/styles.css       — ИСТОЧНИК токенов + темы light/dark + акценты + density
prototype/editor.css       — ИСТОЧНИК стилей всех компонентов (.mdblock, .tab, .sidebar, .statusbar, .gutter, .floating-toolbar, .modal …)
prototype/app.jsx          — компоненты прототипа (TitleBar, TabsBar, Sidebar, Editor, RawBlock, StatusBar, FloatingToolbar)
prototype/canvas-app.jsx   — статические фрагменты всех экранов
prototype/canvas-tweaks.jsx, design-canvas.jsx, tweaks-panel.jsx — обвязка демо (в продакшн не переносится)
```

## Предлагаемая нарезка задач (Linear)

1. **MDP-XX — Токены + Light-тема:** перенести палитру/типографику/spacing в `tokens.css` + `themes/light.css`, обновить `DESIGN.md`. (фундамент, блокирует остальные)
2. **MDP-XX — Dark-тема:** тёплая dark-палитра в `themes/dark.css`.
3. **MDP-XX — TabsBar:** active/idle/hover/dirty/close по спеке экрана 7.
4. **MDP-XX — Sidebar:** tree / empty / loading + open-folder dialog (экраны 3–6).
5. **MDP-XX — EditorArea + rendered блоки:** `.mdblock--*`, серифная типографика (экран 1).
6. **MDP-XX — RAW-режим:** стили raw-блока + переключатель RAW frame (Bold/Thin/None).
7. **MDP-XX — StatusBar + gutter + diff-маркеры** (экраны 8–9).
8. **MDP-XX — Floating toolbar** (экран 10).
9. **MDP-XX — Density + акцент-пресеты** (data-атрибуты + настройки).

```

```
