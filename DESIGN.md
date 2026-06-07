# mdpad++ — Design Brief

> Этот документ — источник правды по визуальному языку mdpad++.
> Claude Code читает его при работе над любой UI-задачей.
> Обновляй его после любых изменений палитры, типографики или правил компонентов.

## Философия

mdpad++ — это **dev-tool для письма**. Визуальный язык должен быть:

- **Тёплым.** Кремовый фон, мягкие тени, серифная типографика для rendered-контента. Никаких холодных синих VS Code-палитр.
- **Тихим.** Интерфейс не соревнуется с контентом за внимание. Контент (текст заметок) — главный, UI — рамка.
- **Плотным.** Разработчики ценят плотность информации больше воздуха. Но без claustrophobia.
- **Предсказуемым.** Никаких неожиданных анимаций, всплывающих подсказок без повода, декоративных элементов.
- **Быстрым.** Анимации максимум 150мс, никаких "easing showcase". Ничего не должно мешать скорости работы.
- **Консистентным.** Один радиус, одна сетка отступов, один набор теней. Вариативность — признак непродуманности.

Ориентиры по духу: **Anthropic** (claude.ai/console — тёплая палитра, серифный H1, ink-акцент, тонкие 1px-бордеры), **Typora** (тишина и фокус на контенте), **Linear** (плотность и лаконичность интерфейса), **Zed** (скорость и ощущение нативности).

Анти-ориентиры: Notion (слишком много воздуха для dev-tool), Obsidian (визуально перегружен), любые "AI-first" редакторы с фиолетовыми градиентами.

## Tech-решение

Используем **shadcn-svelte** (https://shadcn-svelte.com) как источник готовых компонентов. Компоненты **копируются в `src/lib/ui/`** и живут в репозитории как собственный код — даёт полный контроль над стилями и поведением, отсутствие зависимости от внешней версионируемой библиотеки.

Поверх shadcn-svelte работают **design tokens** — CSS custom properties, определённые в `src/styles/tokens.css` (типографика, размеры, отступы, тени, анимации) и `src/styles/themes/*.css` (цвета). Все компоненты используют только токены, никогда хардкод.

### Тема, акцент, плотность — через data-атрибуты

На корневой `<html>` ставятся атрибуты, переключающие CSS-переменные каскадно:

```html
<html data-theme="light" data-accent="ink" data-density="default"></html>
```

| Атрибут        | Значения                                   | Дефолт    | Где задаётся                                                                   |
| -------------- | ------------------------------------------ | --------- | ------------------------------------------------------------------------------ |
| `data-theme`   | `light`, `dark`                            | `light`   | `App.svelte` `$effect` при mount; пользователь сможет переключать после MDP-27 |
| `data-accent`  | (не задан) = ink, `coral`, `slate`, `sage` | ink       | `themes/*.css` пресеты; UI — MDP-27                                            |
| `data-density` | `compact`, `default`, `comfortable`        | `default` | `tokens.css` пресеты; UI — MDP-28                                              |

В MDP-38 поставлен только механизм; UI-настройки приходят в M6.

## Design tokens

### Цвета — Light (по умолчанию, тёплый кремовый Anthropic)

Палитра построена на тёплых кремовых поверхностях с чернильным акцентом. Бордеры — низко-контрастные тёплые серые. Никаких "ярких бренд-цветов" — минимум визуального шума, серифный H1 несёт визуальную ноту.

```css
/* src/styles/themes/light.css */
:root[data-theme="light"] {
  /* Surfaces — от самого глубокого к самому поднятому */
  --bg-base: #faf9f5; /* фон окна / редактора */
  --bg-elevated: #f5f3eb; /* сайдбар, таб-бар, статус-бар, gutter */
  --bg-overlay: #ffffff; /* попапы, floating toolbar, raw-блок */
  --bg-hover: #efece2;
  --bg-active: #e8e5d8;
  --bg-selection: #e6dfc6;

  /* Text */
  --fg-primary: #191919;
  --fg-secondary: #6b6960;
  --fg-tertiary: #9a978c;
  --fg-inverted: #faf9f5;

  /* Borders — тёплые, низко-контрастные */
  --border-subtle: #ece9dd;
  --border-default: #ddd9c8;
  --border-strong: #b8b3a0;

  /* Accent — ink black */
  --accent: #191919;
  --accent-hover: #000000;
  --accent-fg: #faf9f5; /* текст/иконка на accent-фоне */
  --accent-muted: rgba(25, 25, 25, 0.08); /* фон активного блока, бэйдж */

  /* Semantic */
  --danger: #c1554a;
  --warning: #b08a3e; /* gutter modified */
  --success: #5d8a5b; /* gutter added, saved */

  /* Syntax (raw mode) */
  --syntax-heading: #5a4f9a;
  --syntax-code: #a85a3e;
  --syntax-link: #3d6b8a;
}
```

**Пресеты акцента** (`data-accent="coral|slate|sage"`) — переопределяют `--accent`/`--accent-hover`/`--accent-fg`/`--accent-muted`. По умолчанию (атрибут не задан) — ink. Полный список — `src/styles/themes/light.css`.

### Цвета — Dark (тёплая charcoal, НЕ инверсия)

```css
:root[data-theme="dark"] {
  --bg-base: #1c1b18;
  --bg-elevated: #232220;
  --bg-overlay: #2a2826;
  --bg-hover: #2f2d2a;
  --bg-active: #353330;
  --bg-selection: #4a4530;

  --fg-primary: #ebe9e0;
  --fg-secondary: #9a978c;
  --fg-tertiary: #6b6960;

  --border-subtle: #2a2826;
  --border-default: #3a3733;
  --border-strong: #5a564f;

  --accent: #ebe9e0; /* ink-light */
  --accent-fg: #1c1b18;
  --accent-muted: rgba(235, 233, 224, 0.1);
}
```

Та же тёплая ось — никаких холодных серых. Те же имена переменных — компоненты не знают, какая тема активна.

### Типографика

Три семьи: **system sans** для UI, **JetBrains Mono** для редактора/моноширинных подписей, **Source Serif 4** для rendered markdown. Все три имеют системные фолбэки — приложение читаемо даже если бандл шрифтов не загрузился.

```css
:root {
  --font-ui:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto,
    "Helvetica Neue", sans-serif;
  --font-mono:
    "JetBrains Mono", ui-monospace, "SF Mono", "Cascadia Mono", "Fira Code",
    Menlo, Consolas, monospace;
  --font-prose: "Source Serif 4", "Charter", "Iowan Old Style", Georgia, serif;

  /* Sizes */
  --fs-xxs: 10px; /* kbd, micro-affordances */
  --fs-xs: 11px;
  --fs-sm: 12px;
  --fs-base: 13px;
  --fs-md: 14px;
  --fs-lg: 16px;
  --fs-xl: 20px; /* rendered H3 */
  --fs-2xl: 28px; /* rendered H2 */
  --fs-3xl: 36px; /* rendered H1 */

  --lh-tight: 1.2;
  --lh-normal: 1.5;
  --lh-prose: 1.7; /* только rendered markdown */

  --fw-regular: 400;
  --fw-medium: 500;
  --fw-bold: 600;
}
```

**Правило:** UI — `--fs-sm` или `--fs-base`. Текст в редакторе — `--fs-md`. Rendered markdown body — `--fs-md` с `--lh-prose` и `--font-prose`. Rendered H1/H2/H3 — `--fs-3xl` / `--fs-2xl` / `--fs-xl`.

**Web-шрифты vs системные.** Source Serif 4 и JetBrains Mono **бандлятся локально** в `public/fonts/` как `.woff2` (variable, 1 файл на семью × subset). `@font-face` декларации в `tokens.css` указывают на `/fonts/*.woff2` — без сетевых `@import`. Если файлы удалены — браузер мгновенно фолбэчится на системный сериф/моно, без визуальных скачков и без сетевых запросов. Subset покрыты: `latin`, `cyrillic` (≈ 127 КБ суммарно).

### Размеры, отступы, радиусы

Сетка **4px**. Всё кратно четырём.

```css
:root {
  --space-half: 2px; /* умышленное исключение — плотные тулбары */
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  --radius-sm: 3px; /* input, button, tab */
  --radius-md: 4px; /* panel, card, dropdown */
  --radius-lg: 6px; /* overlay (только большие поверхности) */

  --h-control-2xs: 16px; /* close-кнопка вкладки, мелкие icon-buttons */
  --h-control-xs: 22px; /* ghost icon-кнопки в sidebar/tabs-bar headers */
  --h-control-sm: 24px; /* recent-item, ghost SM buttons */
  --h-control-md: 28px;
  --h-control-lg: 32px;

  --dot-size: 7px; /* индикаторы dirty/saved */
  --kbd-size: 18px; /* min-width/height для <kbd> */
  --illustration-size: 64px; /* круг empty-state иллюстрации */
  --welcome-card-max: 460px; /* max-width welcome-карточки */

  --sidebar-width-default: 240px;
  --sidebar-width-min: 160px;
  --sidebar-width-max: 480px;
  --titlebar-height: 32px;
  --tabs-height: 36px;
  --statusbar-height: 24px;
  --tab-max-width: 220px;
  --splitter-width: 4px;
  --accent-indicator: 2px;
  --editor-pad-y: 24px;
  --editor-pad-x: 48px;
  --prose-max-width: 72ch;
}
```

**Density-пресеты** через `[data-density]` переопределяют `--tabs-height`, `--statusbar-height`, `--editor-pad-*`:

| `data-density` | tabs | statusbar | editor pad |
| -------------- | ---- | --------- | ---------- |
| `compact`      | 30   | 22        | 16 × 32    |
| (default)      | 36   | 24        | 24 × 48    |
| `comfortable`  | 40   | 28        | 32 × 64    |

### Тени

Мягкая многослойная overlay-тень. Используется **только для overlay-поверхностей** (попапы, dropdown, floating toolbar, modal).

```css
:root {
  --shadow-overlay:
    0 1px 2px rgba(25, 25, 25, 0.04), 0 8px 24px rgba(25, 25, 25, 0.08),
    0 0 0 1px var(--border-default);
}
```

Тёмная тема использует ту же декларацию (rgba от черного работает и на светлом, и на тёмном). Если потребуется отдельная dark-тень — добавить в `themes/dark.css`.

### Анимации

```css
:root {
  --motion-instant: 0ms; /* hover background */
  --motion-fast: 100ms; /* появление tooltip, dropdown, hover state */
  --motion-normal: 150ms; /* перерендер блока при F2 */
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
}
```

**Правила:**

- Никаких `transition: all`. Только конкретные свойства (`background`, `border-color`, `opacity`, `transform`, `color`).
- Никаких анимаций на `height` — высоту меняем мгновенно или через `transform: scaleY`.
- Skeleton-shimmer (loading) — `@keyframes shimmer 1.4s linear infinite`.

## Компоненты (правила)

### Кнопки

Три варианта: **primary** (фон `--accent`, текст `--accent-fg`, по одной на экран), **ghost** (прозрачный фон, граница `--border-default`, hover — `--bg-hover`), **icon-btn** (ghost без бордера, для тулбаров). Все — `--h-control-md` по умолчанию, `--radius-sm`, `--fs-sm`, `--fw-medium`, `--font-ui`.

### Inputs

`--h-control-md`, фон `--bg-overlay`, граница `--border-default`, focus — граница `--border-strong` + box-shadow `0 0 0 2px var(--accent-muted)`. Без inset shadow.

### Вкладки

Высота `--tabs-height` (36 default), max-width `--tab-max-width` (220) с ellipsis.

- **Active:** фон `--bg-base` (совпадает с областью редактора → визуальная связь), цвет `--fg-primary`, верхняя полоса `--accent` толщиной `--accent-indicator` (2px) через `::before`, нижняя 1px перекрышка бордера таб-бара через `::after`.
- **Idle:** фон `--bg-elevated`, цвет `--fg-secondary`.
- **Hover:** фон `--bg-hover`, цвет `--fg-primary`, появляется close-кнопка.
- **Dirty:** имя `italic`, точка-маркер 7px `--accent` слева вместо file-иконки. Цвет `--danger` НЕ применяется к dirty-вкладке в Anthropic-палитре (точка-индикатор достаточна).
- **Close** (`Icon name="x" size={12}`): 16×16, `--radius-sm`, opacity 0 → 1 на hover/active.

### Сайдбар

Фон `--bg-elevated`, header высотой `--tabs-height` (визуально совпадает с таб-баром), heading "Files" uppercase 11px `--fg-secondary`, справа 2 ghost-кнопки (`+`, folder-open) размером 22×22.

**Empty-state** (нет открытой папки): иконка-иллюстрация 64×64 в круге с бордером, заголовок `--fs-base` `--fw-medium`, объяснение `--fs-sm` `--fg-secondary`, primary "Открыть папку…", ghost "Создать файл", список "Недавние" моноширинным.

**Tree-row** (в MDP-9): высота 24px, отступ вложенности 14px/уровень. Папка — chevron + folder-иконка, `--fw-medium`. Файл — file-иконка ИЛИ dirty-точка. Hover `--bg-hover`. Active — `--bg-active` + левый бордер 2px `--accent`.

**Loading**: skeleton `.skel-row` с shimmer-анимацией.

### Редактор (welcome state в MDP-38)

Центрированная карточка max-width 460px, `--space-8` padding. Серифный H1 36px (`--fs-3xl`, `--font-prose`, `letter-spacing: -0.015em`). Параграф-объяснение `--font-prose` `--fs-md` `--lh-prose` `--fg-secondary`. Две кнопки (primary + ghost). Блок горячих клавиш с `<kbd>` элементами.

`<kbd>`: 18px min-width, 18px height, фон `--bg-elevated`, бордер `--border-default` снизу 2px, `--radius-sm`, `--font-mono` 10px.

### Floating toolbar (форматирование, MDP-16)

Plank: фон `--bg-overlay`, `--radius-md`, `--shadow-overlay`, padding `var(--space-1)`. Ghost-кнопки `--h-control-sm` (24×24), gap `var(--space-1)`. Между группами — разделитель 1px `--border-subtle`.

### Status bar

Высота `--statusbar-height` (24 default), фон `--bg-elevated`, `--fs-xs`, `--fg-secondary`. `display: flex; justify-content: space-between`.

- **Слева:** state (точка `.status-dot--saved`/`--dirty` + текст), "Стр N, Кол M", "Sel: 0".
- **Справа:** ghost-кнопка переноса (`wrap-text` icon + текст), "UTF-8", "LF", "Markdown" (`--fw-medium`, `--fg-primary`).
- Сегменты разделены вертикальными `--border-subtle`.

### Ресайз-хэндл (сплиттер)

Ширина `--splitter-width` (4px), фон прозрачный; при hover/focus/drag — `var(--accent)`. `cursor: col-resize`, фокус через клавиатуру, arrow-keys двигают границу. ARIA: `role="separator"` + `aria-orientation="vertical"` + `aria-valuemin/max/now`.

### Scroll bars

Нативные системные, перекрашенные через `scrollbar-color: var(--border-strong) transparent`. Width 10px, без стрелок.

## Иконки

**Lucide Icons** (https://lucide.dev, ISC). Размер по умолчанию **16×16**. В floating toolbar / маленьких контролах — **14×14**. В статус-баре — **11×11** (по дизайн-эстетике плотности). Цвет — `currentColor`.

Реализация — `src/lib/ui/Icon.svelte` (inline SVG) + `src/lib/ui/icons.ts` (path data, ISC). `lucide-svelte` не используется (несовместим со Svelte 5 runes).

```svelte
<Icon name="file-text" size={14} />
<Icon name="folder-open" size={13} />
```

Собственных иконок не рисуем. Иллюстрация empty-state сайдбара — inline SVG в самом компоненте (не иконка).

## Сценарии использования для примерки

Любой новый компонент проверяется на трёх сценариях:

1. **Маленькое окно** (640×400 — минимальный размер). Всё читаемо, сайдбар в collapsed-режиме, тулбары не перекрывают контент.
2. **Большое окно** (1920×1080). Контент не "плавает" в бескрайней пустоте — максимальная ширина rendered-контента ограничена `--prose-max-width` (72ch).
3. **Очень длинный документ** (5000+ строк). Gutter, диффы, рендер блоков — без визуальных багов.

И на двух темах (`data-theme="light"` + `data-theme="dark"`), и на трёх density-пресетах.

## Чек-лист соответствия дизайну (для PR review)

- [ ] Все цвета — через CSS-переменные, нет хардкода `#xxx` в компонентах.
- [ ] Все отступы — кратны 4px, через `--space-N`.
- [ ] Radius — только из `--radius-*`.
- [ ] Шрифт — `--font-ui` / `--font-mono` / `--font-prose`, не системно-захардкоженный.
- [ ] Иконки из `$lib/ui/Icon.svelte`, размер 11/13/14/16.
- [ ] Нет `transition: all` и анимаций на `height`.
- [ ] Компонент проверен на маленьком окне 640×400.
- [ ] И в light, и в dark теме — без визуальных артефактов.
- [ ] При `data-density="comfortable"` нет горизонтального скролла.
- [ ] При `data-accent="coral"` элементы, использующие `--accent`, перекрашиваются согласованно.

## Что обновлять по мере развития проекта

- При добавлении нового токена — дописывать сюда с объяснением, зачем он нужен.
- При отклонении от правила (например, единственное исключение с бордером 2px) — фиксировать причину.
- Новые компоненты из shadcn-svelte — дописывать в раздел "Компоненты" с правилами их кастомизации.
- При смене визуального направления (как переход с VS Code dark на Anthropic light в MDP-38) — оставлять явное упоминание предыдущей итерации в commit history, а не в DESIGN.md.
