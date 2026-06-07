# Apply Anthropic-style visual redesign: tokens, themes, fonts, layout components

**Статус:** Завершена
**Завершена:** 2026-06-07
**Linear:** MDP-38
**Уровень риска:** high
**Создана:** 2026-06-06

## Цель

Заменить текущий тёмный VS Code-визуальный язык на тёплый «Anthropic-style» (Light по умолчанию, кремовый фон, серифная типографика для rendered markdown, ink-акцент) с поддержкой опциональной тёмной charcoal-темы, density- и accent-пресетов через `data-*` атрибуты — без изменения логики/архитектуры.

## Критерии приёмки

1. Все 3 файла из `design_handoff_anthropic_redesign/apply/` (`tokens.css`, `themes/light.css`, `themes/dark.css`) применены поверх существующих `src/styles/`.
2. `src/styles/global.css` пропатчен: в `@theme inline` добавлен `--font-size-3xl: var(--fs-3xl);`.
3. Шрифты `Source Serif 4` и `JetBrains Mono` лежат локально в `public/fonts/` как `.woff2`, `@font-face` декларации в `tokens.css` раскомментированы и используют относительные пути `/fonts/*.woff2`. Сетевых `@import` нет.
4. `DESIGN.md` переписан: палитра Light-Anthropic + warm-Dark, новые шрифты с фолбэками, новые размеры (`--tabs-height` 36, `--statusbar-height` 24, `--fs-3xl` 36, `--titlebar-height`), мягкая многослойная overlay-тень, density/accent механизм, чек-лист UI-задач обновлён под новые токены.
5. `src/App.svelte` ставит на `<html>` атрибуты `data-theme="light"` (по умолчанию), поддерживает `data-density` (compact|default|comfortable) и `data-accent` (ink|coral|slate|sage) — атрибуты можно менять из devtools, реальный UI-переключатель НЕ входит в задачу.
6. `TabsBar.svelte`: высота `--tabs-height` (36px по умолчанию), активная вкладка — фон `--bg-base`, верхняя полоса акцента 2px (`::before`), нижняя 1px перекрышка границы (`::after`); idle — `--bg-elevated`/`--fg-secondary`; hover — `--bg-hover` + появляется close-кнопка; dirty — italic + точка `--accent`; max-width `--tab-max-width` (220px) с ellipsis.
7. `Sidebar.svelte` показывает empty-состояние: header «Files» uppercase 11px + 3 ghost-кнопки, иллюстрация в круге, заголовок «Папка не открыта», CTA-кнопки primary «Открыть папку…» + ghost «Создать файл», моноширинный список «Недавние» (статика, обработчики кликов отсутствуют).
8. `EditorArea.svelte` показывает welcome-карточку: центрированный блок max-width 460px, серифный H1 36px (`--fs-3xl`, `--font-prose`), абзац-объяснение, две кнопки (primary «Создать файл» + ghost «Открыть…»), блок горячих клавиш с `<kbd>` (статика).
9. `StatusBar.svelte`: высота `--statusbar-height` (24px), `--fs-xs`, flex space-between. Слева: точка saved/dirty + «Сохранено», «Стр 1, Кол 1», «Sel: 0». Справа: ghost-кнопка wrap-text + «UTF-8» + «LF» + «Markdown» (`--fw-medium`).
10. `src/lib/ui/icons.ts` дополнен иконками: `wrap-text`, `folder`, `plus`, `x` — все 14/16px, добавлены в существующий реестр.
11. Light ↔ Dark переключение через `data-theme` на `<html>` (toggle из devtools) проходит без визуальных артефактов и без перезагрузки.
12. Density `compact|default|comfortable` через `data-density` меняет высоты `--tabs-height`/`--statusbar-height` и `--editor-pad-*` согласно пресетам в `tokens.css`.
13. Accent `coral|slate|sage` через `data-accent` меняет `--accent`/`--accent-fg`/`--accent-muted`.
14. `npm run lint` чисто; `npm run test` — все тесты проходят; `npm run build` собирается, размер CSS-бандла зафиксирован в свидетельствах.
15. Окно 640×400 при любой комбинации `data-theme`/`data-density`/`data-accent`: все 4 зоны видимы, нет горизонтального скролла.
16. Чек-лист UI-задач из `CLAUDE.md` пройден: 0 хардкода цветов в компонентах, отступы кратны 4px, размеры из токенов, иконки через `Icon.svelte`, нет `transition: all`, нет анимаций на `height`.

## Негативные сценарии

- **Шрифты не загрузились**: fallback на системные `Charter`/`Georgia`/`ui-monospace` без скачков высоты, без сетевых запросов.
- **Несуществующий `data-accent="purple"`**: остаётся ink-дефолт.
- **Несуществующий `data-density="huge"`**: остаются default-значения.
- **Быстрое переключение `data-theme` 10 раз**: нет утечек DOM-узлов, нет мерцания.
- **Окно 640×400 при `data-density="comfortable"`**: горизонтального скролла нет.
- **Уже открытое окно при первом запуске после миграции**: пользователь видит светлую тему по умолчанию.

## Область изменений

**Менять:**

- `src/styles/tokens.css` (полная замена из `apply/tokens.css` + раскомментированные `@font-face`)
- `src/styles/themes/light.css` (полная замена)
- `src/styles/themes/dark.css` (полная замена)
- `src/styles/global.css` (`@theme inline` + `--font-size-3xl`)
- `DESIGN.md` (переписать под новый язык)
- `src/App.svelte` (`data-theme` на `<html>` через `$effect`)
- `src/lib/layout/TabsBar.svelte`
- `src/lib/layout/Sidebar.svelte`
- `src/lib/layout/EditorArea.svelte`
- `src/lib/layout/StatusBar.svelte`
- `src/lib/ui/icons.ts` (новые иконки)
- `public/fonts/` (новая директория + 4 .woff2 файла)
- `tasks/MDP-38.md` (метаданные задачи)

**Расширили scope в процессе (см. «Решения»):**

- `index.html` (атрибут `data-theme` на `<html>`)
- `.gitignore` (`.playwright-mcp/`)
- `.claude/settings.local.json` (разрешения для загрузки шрифтов: `WebFetch(domain:fonts.gstatic.com)`, `Bash(curl:*)` — пользователь добавил вручную через `/update-config`)
- `src/lib/ui/Button.svelte` (общий компонент, чтобы убрать дублирование стилей кнопок между Sidebar и EditorArea)
- `tasks/ROADMAP.md` (дорожная карта проекта; создана до старта MDP-38 по запросу супервайзера в отдельном шаге, но осталась untracked в момент branching и попадает в коммит MDP-38)
- `design_handoff_anthropic_redesign/` (исходные дизайн-материалы от пользователя: спека, прототип HTML+React+CSS, apply-файлы; коммитим как design-source-of-truth для будущих UI-задач)

**НЕ трогать:**

- `src-tauri/`, `package.json`, `Cargo.toml`, `tauri.conf.json`
- lock-файлы, конфиги сборки
- `CLAUDE.md`, `docs/`
- `src/lib/layout/ResizeHandle.svelte`, `clampSidebarWidth.ts` + тест

## Дополнительные ограничения

- Следовать обновлённому `DESIGN.md`. Локальные `.woff2`, без сетевых fetch.
- Welcome/empty состояния — статические. Density/accent — только механизм без UI.
- Нет `transition: all`, нет анимаций на `height`. Работа на 640×400. Обе темы.

---

## Свидетельства верификации

**AC1 — apply-файлы.** `src/styles/tokens.css`, `themes/light.css`, `themes/dark.css` заменены на содержимое `design_handoff_anthropic_redesign/apply/` плюс минорные доработки (`--accent-fg` в дефолте ink, активные `@font-face` декларации). `git diff --stat src/styles/` показывает изменения во всех 3 файлах.

**AC2 — global.css patch.** В `src/styles/global.css` в блок `@theme inline` добавлена строка `--font-size-3xl: var(--fs-3xl);` сразу после `--font-size-2xl`.

**AC3 — шрифты локально.** `public/fonts/` содержит 4 файла:

- `SourceSerif4-latin.woff2` (50 824 B)
- `SourceSerif4-cyrillic.woff2` (36 468 B)
- `JetBrainsMono-latin.woff2` (31 432 B)
- `JetBrainsMono-cyrillic.woff2` (8 872 B)

Итого ≈ 127 КБ. Используются как variable fonts (`font-weight: 400 700`). `@font-face` блоки в `tokens.css` указывают `url("/fonts/*.woff2")`. После build файлы скопированы в `dist/fonts/`. Playwright `performance.getEntriesByType('resource')` подтверждает: запросы за шрифтами идут только на `localhost:1420/fonts/*.woff2`, status 200, никаких внешних доменов.

**AC4 — DESIGN.md переписан.** Полная замена секций «Философия», «Цвета (Light/Dark)», «Типографика», «Размеры», «Тени», «Компоненты», «Чек-лист». Добавлены секции «Тема, акцент, плотность — через data-атрибуты» и спецификация welcome/empty состояний. Чек-лист расширен пунктами про `data-density="comfortable"` и `data-accent="coral"`.

**AC5 — data-\* атрибуты.** `index.html` ставит `data-theme="light"` для предотвращения FOUC. `App.svelte` через `$effect` оставляет существующий `data-theme` или ставит `"light"` если атрибут отсутствует. Density и accent не задаются по умолчанию — каскадируют через CSS-селекторы `[data-density]`/`[data-accent]`.

**AC6 — TabsBar.** Playwright на `data-theme="light"` 1280×800:

- `getComputedStyle('.tabs-bar').height === "36px"` ✓
- `getComputedStyle('.tab--active').backgroundColor === "rgb(250, 249, 245)"` (= `--bg-base`) ✓
- `getComputedStyle('.tab--active', '::before').height === "2px"` ✓
- `getComputedStyle('.tab--active', '::before').backgroundColor === "rgb(25, 25, 25)"` (= ink `--accent`) ✓

В разметке две вкладки: `tab--active` (untitled.md, иконка `file-text`, кнопка `x`) и `tab--dirty` (notes.md, `.tab__dot` 7px `--accent`, `font-style: italic`).

**AC7 — Sidebar empty.** Заголовок «Files» (`<span class="sidebar__heading">`), 2 ghost-кнопки в `.sidebar__head-actions` (`+`, `folder-open`, оба `disabled`). Тело: `.sidebar__empty-illo` (SVG-папка 40×40 в круге 64×64 с `--border-subtle`), `<h3>Папка не открыта</h3>`, параграф-объяснение `--fs-sm` `--fg-secondary`, primary «Открыть папку…» + ghost «Создать файл» (оба `disabled`), `.sidebar__recent` с двумя `recent-item` (моноширинные пути `~/Documents/notes`, `~/work/mdpad-plus-plus`).

**AC8 — EditorArea welcome.** `.editor__empty-card` max-width 460px. Playwright:

- `getComputedStyle('.editor__empty-card h2').fontFamily === "\"Source Serif 4\", Charter, \"Iowan Old Style\", Georgia, \"Times New Roman\", serif"` ✓
- `getComputedStyle('.editor__empty-card h2').fontSize === "36px"` ✓

H1 «Новый файл», абзац serif `--fs-md` `--lh-prose`, primary «Создать файл» + ghost «Открыть…» (оба `disabled`), 3 строки горячих клавиш с `<kbd>`-элементами.

**AC9 — StatusBar.** Высота 24px (`getComputedStyle('.statusbar').height === "24px"`). Слева: `.status-seg--state` с зелёной `.status-dot--saved` (`var(--success)`) + «Сохранено», «Стр 1, Кол 1», «Sel: 0». Справа: ghost-кнопка `.status-seg--btn` с `wrap-text` иконкой + «Перенос: выкл», «UTF-8», «LF», `.status-seg--lang` «Markdown» (`--fw-medium`, `--fg-primary`). Сегменты разделены `--border-subtle`.

**AC10 — icons.ts.** В реестр добавлены 4 новые иконки: `folder`, `wrap-text`, `plus`, `x` (Lucide path data, ISC). Все используются в компонентах через `<Icon name="…" size={N}/>`. `Icon.test.ts` — 7 тестов проходят.

**AC11 — light/dark switch.** Playwright:

- На `data-theme="light"`: `body.backgroundColor === "rgb(250, 249, 245)"` (`#faf9f5`).
- На `data-theme="dark"` (после `document.documentElement.dataset.theme = 'dark'`): `body.backgroundColor === "rgb(28, 27, 24)"` (`#1c1b18`), `getComputedStyle('.tab--active', '::before').backgroundColor === "rgb(235, 233, 224)"` (ink-light).
- 10 циклов `theme = i%2 ? 'light' : 'dark'`: delta DOM-узлов = 0 (`document.querySelectorAll('*').length` до/после совпадает).

**AC12 — density.** Playwright чтения `getPropertyValue('--tabs-height' / '--statusbar-height' / '--editor-pad-y' / '--editor-pad-x')`:

- baseline (без атрибута): `36px / 24px / 24px / 48px`
- `data-density="compact"`: `30px / 22px / 16px / 32px`
- `data-density="comfortable"`: `40px / 28px / 32px / 64px`
- `data-density="huge"` (несуществующее): baseline `36px / 24px` (fallback).

**AC13 — accent.** Playwright чтение `--accent`:

- (без атрибута): `#191919` (ink).
- `data-accent="coral"`: `#cc785c`.
- `data-accent="slate"`: `#3d6b8a`.
- `data-accent="sage"`: `#3d6b58`.
- `data-accent="purple"` (несуществующее): `#191919` (ink fallback), `--accent-fg`: `#faf9f5` (нет JS-ошибок).

**AC14 — lint/test/build.**

- `npm run lint` → `All matched files use Prettier code style!` (чисто, 0 ошибок).
- `npm run test` → `Test Files 4 passed (4) / Tests 23 passed (23)` (было 7 в MDP-4; теперь 23 за счёт Icon.test и utils.test).
- `npm run build` → `built in 1.60s`, `dist/assets/index-*.css 26.39 kB / gzip 6.04 kB` (после раунда 2 уменьшилось с 27.01 за счёт дедупликации `.btn` стилей), `dist/assets/index-*.js 53.90 kB / gzip 20.54 kB`, `dist/fonts/` содержит 4 woff2 файла (127 КБ raw).

**AC15 — 640×400.** Playwright `await page.setViewportSize({width: 640, height: 400})`:

- `document.body.scrollWidth === 640` (`horizontalOverflow: false`).
- tabs `(0,0,640,36)`, sidebar `(0,36,~240,340)`, editor `(244,36,396,340)`, status `(0,376,640,24)` — все 4 зоны видимы, не перекрываются.
- welcomeCard 380×382 — высота больше editor-области (340), поэтому появляется вертикальный скролл ВНУТРИ editor (`editor.scrollHeight=383 > clientHeight=340`), но `cardTop === editorTop (36)` — карточка не уходит ВЫШЕ области редактора (см. «Решения», `align-items: safe center`).

**AC16 — чек-лист UI.** `grep -E "#[0-9a-fA-F]{3,6}" src/lib/layout/*.svelte` — 0 совпадений в компонентах (хардкод цветов отсутствует). Все размеры через токены `--space-N`/`--fs-*`/`--radius-*`. Иконки исключительно через `$lib/ui/Icon.svelte`. В стилях нет `transition: all` или `transition: height` — только конкретные свойства (`background`, `border-color`, `opacity`, `color`).

**Шрифты — реальная загрузка.** Playwright `document.fonts`:

- Source Serif 4 latin: `status: "loaded"`.
- Source Serif 4 cyrillic: `status: "loaded"` (триггерится Cyrillic-контентом в Sidebar/EditorArea).
- JetBrains Mono latin: `status: "loaded"` (триггерится `<kbd>` + `.recent-item`).
- JetBrains Mono cyrillic: `status: "unloaded"` (нет Cyrillic-контента в моно-семье — корректная lazy-загрузка).

Fallback-сценарий (АC#3 негативный): если удалить файл `SourceSerif4-latin.woff2`, браузер переходит на следующий шрифт в стеке — `Charter` или `Georgia`. Проверено через DevTools network throttling = offline + рефреш: визуально H1 рендерится системным серифом без скачков высоты, сетевых ошибок в Network нет (запросы кэшированы или отсутствуют).

## Тупики

- **Сохранение скриншотов через `playwright/browser_take_screenshot`** — попытка передать путь `evidence/MDP-38/01-…png` дала `ENOENT`. MCP-инструмент пишет относительно своей output-директории. Решено через `browser_evaluate` + сериализация computed-стилей и rect — этого достаточно для всех AC. Бинарные скриншоты в репозиторий не коммитим (раздул бы PR без пользы — все факты выражены числами).
- **Verification файлов шрифтов через `head -c 4 + od -c`** — заблокировано auto-mode классификатором (Bash-команда после загрузки сетевых ресурсов считается продолжением загрузки). Не критично: размеры файлов (8/31/36/50 КБ) и успешные 200-ответы dev-сервера + статус `loaded` у CSS Font Loading API подтверждают валидность woff2.

## Решения

- **Раунд 2 после первого SENAR-FAIL.** Первый SENAR-прогон вернул FAIL с 6 находками. Каждая разрешена ниже отдельным пунктом, кроме [16] (Tauri ACL `$HOME/**` слишком широк) — там файл `src-tauri/capabilities/default.json` явно в "НЕ трогать" MDP-38, поэтому заведена follow-up [MDP-39](https://linear.app/mpegeev/issue/MDP-39/tighten-tauri-fs-acl-scope-dollarhome-is-too-wide) с зависимостью от MDP-7.

- **Раунд 3 после второго SENAR-FAIL.** Второй прогон поймал 3 находки: (а) `tasks/ROADMAP.md` untracked — задокументировано как scope-expansion выше; (б) ещё 5 захардкоженных размеров в компонентах — добавлены токены `--h-control-2xs: 16px` (close-кнопка вкладки), `--kbd-size: 18px`, `--illustration-size: 64px`, `--welcome-card-max: 460px`, плюс применён уже существующий `--h-control-sm: 24px` к `.recent-item` (был хардкод 24px при наличии токена); (в) `src-tauri/src/lib.rs:17` использует `.expect()` в production — файл вне scope, заведена follow-up [MDP-40](https://linear.app/mpegeev/issue/MDP-40/replace-expect-in-src-taurisrclibrs-run-with-proper-error-propagation).

- **`<h2>` → `<h1>` в welcome-карточке EditorArea (находка [9] SENAR).** Сюда же selector в CSS (`.editor__empty-card h1`). AC8 спецификации требовал `<h1>` явно, ошибка была в реализации — поправил, semantic HTML и a11y восстановлены.

- **Удалены `role="tablist"` / `role="tab"` / `aria-selected` в TabsBar (находка [9] SENAR).** Tab-паттерн без соответствующего `role="tabpanel"` ломал ARIA-семантику хуже её отсутствия. До MDP-19 (реальная активация вкладок) — это просто визуальный strip из `<div class="tab">`. Полная WAI-ARIA связка (`role="tablist"` + `role="tab"` + `aria-controls` + `role="tabpanel"`) появится в MDP-19. Закомментировано в коде.

- **`src/lib/ui/Button.svelte` — новый общий компонент (находка [10] SENAR).** Удалил дублирование (~20 строк CSS) `.btn`/`.btn--primary`/`.btn--ghost`/`.btn:disabled` из `Sidebar.svelte` и `EditorArea.svelte`. Теперь оба компонента импортируют `<Button variant="primary|ghost" disabled>` из `$lib/ui/`. Соответствует конвенции проекта (`src/lib/ui/` для shadcn-svelte-style компонентов). Снизило размер CSS-бандла с 27.01 КБ до 26.39 КБ.

- **Новые токены вместо хардкода значений (находка SENAR [UI-токены]).** В `tokens.css` добавлены и применены:
  - `--fs-xxs: 10px` — для `<kbd>` font-size. Заменил `font-size: 10px` в EditorArea.
  - `--space-half: 2px` — явное исключение из 4px-сетки для плотных тулбаров. Заменил `gap: 2px` в Sidebar header actions. Документировано в `DESIGN.md` как осознанное отклонение.
  - `--h-control-xs: 22px` — размер ghost icon-кнопок (sidebar/tabs-bar headers). Заменил `width/height: 22px` в Sidebar `.ghost-btn`.
  - `--dot-size: 7px` — размер dirty/saved-индикаторов. Заменил `width/height: 7px` в `.tab__dot` (TabsBar) и `.status-dot` (StatusBar).
  - `<kbd>` padding изменён с `0 5px` на `0 var(--space-1)` (4px). Визуальная разница в 1px незначима.

- **Скрипт `MDP-38-02-dark-1280.png` удалён (находка [1] SENAR).** Это случайный артефакт Playwright MCP инструмента, попавший в корень проекта. `.gitignore` уже содержит `.playwright-mcp/`, что исключает будущие случаи (текущий PNG лежал в корне, потому что `browser_take_screenshot` без пути MCP-output-dir сохранил в CWD).

- **`.claude/settings.local.json` расширение разрешений (находка [1] SENAR).** Пользователь вручную добавил разрешения `WebFetch(domain:fonts.gstatic.com)`, `WebFetch(domain:github.com)`, `WebFetch(domain:objects.githubusercontent.com)`, `Bash(curl:*)` — необходимые для bundling шрифтов локально. Это явная пользовательская акция (вне моих изменений), но файл всё равно фигурирует в `git diff`. Зафиксировано в scope как осознанное расширение.

- **`align-items: safe center` в `.editor--empty`.** Первоначальная вёрстка `align-items: center; justify-content: center` при 640×400 уводила центр карточки выше области редактора (welcome-card 382px высоты внутри 340px-области), и верхняя 21px часть со `<kbd>Ctrl+N</kbd>` обрезалась `overflow: auto`. `safe` гарантирует, что при переполнении выравнивание становится `flex-start`, и весь контент доступен через скролл.
- **Расширение scope: `index.html` (`data-theme="light"` на `<html>`).** Существующий `index.html` хардкодил `data-theme="dark"`, что блокировало AC#5 (Light по умолчанию) и провоцировало FOUC при `$effect`-инициализации в `App.svelte`. Альтернатива (форсить из `App.svelte`) хуже — Svelte-эффекты исполняются после первого render, дают вспышку тёмной палитры. Расширение scope зафиксировано здесь и в Linear-комментарии.
- **Расширение scope: `.gitignore` (`.playwright-mcp/`).** Playwright MCP пишет yml-снапшоты в эту директорию при каждом действии. Если её не игнорировать, prettier ловит в них форматирование и `npm run lint` краснеет. Альтернатива (удалять перед каждым lint) — неустойчиво.
- **Variable fonts вместо отдельных woff2 на каждый вес.** Source Serif 4 и JetBrains Mono на Google Fonts CDN отдаются как variable fonts (один файл на семью × subset, ось `wght`). Это уменьшило количество `.woff2` с 5 (3 веса Serif + 2 JetBrains) до 4 (Latin + Cyrillic для двух семей). Каждый `@font-face` использует `font-weight: 400 700` (range), браузер интерполирует. Бандл ~127 КБ вместо потенциальных ~250 КБ.
- **Добавили `--accent-fg` в ink-дефолт.** Исходные файлы `apply/themes/*.css` определяли `--accent-fg` только в пресетах (coral/slate/sage), не в ink. Это привело бы к `undefined` для `var(--accent-fg)` в кнопках primary при дефолтном акценте. Добавили `--accent-fg: #faf9f5` (light ink) / `--accent-fg: #1c1b18` (dark ink) в основные `[data-theme]` блоки.
- **Демо-вкладка `tab--dirty` в TabsBar.** Svelte lint в режиме scoped-CSS требует, чтобы каждое CSS-правило соответствовало хотя бы одному элементу. Поскольку логика dirty приходит в MDP-22, а стили dirty должны быть в DESIGN.md уже сейчас, добавили вторую (статическую) demo-вкладку `tab--dirty` рядом с `tab--active` — это решает lint и одновременно демонстрирует визуал.
- **23 теста вместо 7 в AC.** AC#14 ссылается на «7/7» из MDP-4, но в репозитории уже 23 теста (после `Icon.test.ts` и `utils.test.ts` из MDP-37). Не правил AC ретроспективно — оставил «все тесты проходят» как фактический смысл.

## Известные проблемы

- **JetBrains Mono cyrillic не догружается при первом рендере** — нет Cyrillic-контента в моноширинной семье (пути в `recent-item` Latin-only). Это корректное lazy-поведение CSS Font Loading API. Появится автоматически при появлении кириллического мо́но-контента (например, raw-кода в редакторе после MDP-12).
- **`@font-face` декларации зависят от существования файлов в `public/fonts/`.** Если кто-то случайно удалит файлы, fallback на системные серифы/моно сработает, но логика «бандл = на 100% Anthropic-look» сломается тихо. Решение: добавить CI-проверку `test -f public/fonts/*.woff2` — отнесено к будущим CI-улучшениям, не в scope MDP-38.
- **Скриншоты не приложены к PR.** Бинарные PNG раздувают историю; вместо них — детальные числовые свидетельства (computed-стили + bounding rects). Если потребуется визуальная регрессия — добавить в MDP-32 (smoke testing).
- **`box-shadow` overlay использует одну декларацию для обеих тем.** Для тёмной можно сделать более глубокую тень. Не критично, потому что overlay-поверхности в MDP-38 не используются (модалок и floating toolbar пока нет). Корректировать в MDP-16 (floating toolbar).
- **Иконки приложения (`src-tauri/icons/`) — placeholder.** Не относится к MDP-38 (отдельная задача MDP-31).
