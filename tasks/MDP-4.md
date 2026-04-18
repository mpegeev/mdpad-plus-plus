# Main layout: tabs bar + sidebar + editor area + status bar

**Статус:** Завершена
**Завершена:** 2026-04-18
**Linear:** MDP-4
**Уровень риска:** standard
**Создана:** 2026-04-18

## Цель

Создать основной layout приложения: панель вкладок, сайдбар с деревом файлов, область редактора, статус-бар.

## Критерии приёмки

1. Окно приложения разделено на 4 зоны: вкладки (сверху), сайдбар (слева), редактор (центр), статус-бар (снизу).
2. Сайдбар можно ресайзить мышью в диапазоне 160–480px.
3. Сайдбар сворачивается кнопкой — область редактора занимает всю ширину.
4. При размере окна 640×400 (минимальный) все зоны видимы и читаемы, ничего не обрезается.
5. Все зоны пока содержат placeholder-текст — реальная функциональность в задачах M2.
6. Все цвета и отступы используют CSS-переменные из `DESIGN.md` (без хардкода).

## Негативные сценарии

- Ресайз сайдбара за пределы 160px / 480px — ширина ограничивается, не ломает layout.
- Быстрый ресайз окна до минимального размера — элементы не наезжают друг на друга, нет горизонтального скролла.
- Сворачивание/разворачивание сайдбара 10 раз подряд — нет утечки DOM-элементов, нет визуальных артефактов.

## Область изменений

**Менять:**

- `src/App.svelte` (в т.ч. замена демо дизайн-системы из MDP-34 на основной layout — старый комментарий в файле сам анонсировал эту замену)
- `src/lib/` (новые компоненты layout; расширение `src/lib/ui/icons.ts` — иконки `panel-left`, `panel-left-close` для кнопки toggle)
- `src/styles/global.css`
- `src/styles/tokens.css` (добавить токены `--tab-max-width`, `--splitter-width`, `--accent-indicator`)
- `DESIGN.md` (синхронизировать новые токены и описание сплиттера)
- `tasks/MDP-4.md` (метаданные задачи SENAR)

**НЕ трогать:**

- `src-tauri/`
- `package.json`, `Cargo.toml`, `tauri.conf.json`
- lock-файлы (`package-lock.json`, `Cargo.lock`)
- конфиги сборки (Vite, ESLint, Prettier, tsconfig)
- `CLAUDE.md`, `docs/`

## Дополнительные ограничения

- Следовать `DESIGN.md`: цвета через CSS-переменные, отступы кратны 4px, radius из `--radius-*`, шрифт `--font-ui`/`--font-mono`.
- Иконки — через `src/lib/ui/Icon.svelte` (размер 14/16).
- Не добавлять зависимостей.
- Нет анимаций на `all` или `height`.
- Компонент должен работать на окне 640×400.
- Тёмная тема обязательна (светлая — после MDP-27).

---

## Свидетельства верификации

**AC1 — 4 зоны layout.** Playwright на 1280×800 (dev @ :1420): tabs `(0,0,1280,32)`, sidebar `(0,32,240,746)`, resize-handle `(240,32,4,746)`, editor `(244,32,1036,746)`, status `(0,778,1280,22)`. Зоны не перекрываются, занимают весь viewport.

**AC2 — ресайз 160–480px.** Unit-тесты `clampSidebarWidth` (6/6 проходят, включая кейсы ниже min, выше max, на границах, NaN, custom bounds). Ручная проверка через Playwright pointer-drag: `+1000px → 480`, `-1000px → 160`. Вывод: `npm run test` → `Tests 7 passed (7)`.

**AC3 — collapse.** Playwright: после клика по toggle-кнопке `aria-label` меняется с "Hide sidebar" на "Show sidebar"; в DOM исчезают `.app__sidebar` и `.resize-handle` (через `{#if !sidebarCollapsed}`); `.app__editor` растягивается на всю ширину (640px при окне 640×400, 1280px при 1280×800).

**AC4 — 640×400 minimum.** Playwright: `document.body.scrollWidth === 640`, горизонтального скролла нет, все 4 зоны видимы. Достигнуто за счёт `overflow: hidden` на `.app` и `min-width: 0` на flex-контейнерах.

**AC5 — placeholder-текст.** Sidebar: header "FILES" + пустое тело. Editor: "Editor will mount here in MDP-9 / MDP-10. F2 toggles raw mode once the CodeMirror wiring lands." StatusBar: "Ready / UTF-8 / LF / (spacer) / Markdown". TabsBar: одна активная вкладка "untitled.md".

**AC6 — CSS-переменные без хардкода.** Grep по `#[0-9a-fA-F]{3,6}` в `src/lib/layout/*.svelte` — 0 совпадений. Все размерные литералы вынесены в токены: `--tab-max-width`, `--splitter-width`, `--accent-indicator` (добавлены в `src/styles/tokens.css` и `DESIGN.md`).

**Негативные сценарии.** Ресайз за границы → clamp в `clampSidebarWidth` (unit-тесты). Быстрый ресайз окна до 640×400 → нет горизонтального скролла (Playwright). 10 циклов collapse → в DOM остаётся ровно 1 sidebar/0 при collapsed, 1/1 при expanded (DOM-leak нет, благодаря полному unmount через `{#if}`).

**Проверки окружения.** `npm run lint` → чисто. `npm run test` → 7/7 passed. `npm run build` → 1.42s, 48.66 kB js + 14.41 kB css.

**SENAR-ревью (standard).** Повторный прогон: `VERDICT: PASS`, 9 PASS / 0 FAIL / 1 N/A. Первый прогон дал FAIL на 4 пунктах — все разрешены супервайзером или исправлены (см. раздел "Решения").

## Тупики

- Component-тесты для `ResizeHandle` (pointer-drag, keyboard-nav) без новой зависимости написать нельзя: Vitest + jsdom без `@testing-library/svelte` не даёт удобного способа монтировать компонент и диспатчить pointer-события так, чтобы Svelte-listener'ы их приняли. Попытка через `dispatchEvent(new KeyboardEvent(...))` на реальном DOM-узле в dev-сервере показала, что Svelte 5 не подхватывает синтетические события того же типа через delegation. Обходной путь (Playwright) в репо не зафиксирован — принят осознанно на standard-уровне.

## Решения

- **Пустая функция `clampSidebarWidth` в отдельном модуле.** Вместо встраивания логики в `ResizeHandle.svelte` вынесено в `src/lib/layout/clampSidebarWidth.ts` ради unit-тестируемости: единственный способ покрыть AC2 автоматизировано без новых зависимостей.
- **Полный unmount sidebar через `{#if !sidebarCollapsed}`.** Альтернатива — `width: 0` при collapse — оставляет handle и sidebar в DOM. Unmount решает негативный сценарий "10 циклов без утечки" напрямую, ценой потери потенциальной анимации ширины (которая и так запрещена DESIGN.md).
- **svelte-ignore на a11y-правила в ResizeHandle.** `eslint-plugin-svelte` не распознаёт WAI-ARIA splitter pattern (role="separator" с tabindex и обработчиками клавиш). Альтернатива — отключать правила глобально — хуже: скрыла бы реальные ошибки в других файлах. Выбрано локальное подавление с комментарием-обоснованием.
- **Расширение scope MDP-4 на `src/styles/tokens.css` и `DESIGN.md`.** Первый SENAR-прогон корректно указал хардкод `200px / 4px / 2px`. Выбор: либо оставить хардкод (FAIL по DESIGN.md), либо добавить токены (трогает `tokens.css` и `DESIGN.md` — формально вне первоначального scope). Супервайзер одобрил расширение scope; scope задачи обновлён.

## Известные проблемы

- Component-тесты для pointer-drag и keyboard-nav отсутствуют (см. "Тупики"). Будет закрыто, когда появится задача на добавление `@testing-library/svelte` или аналогичного инструмента.
- Горизонтальная прокрутка вкладок (при большом количестве открытых файлов) не реализована — placeholder содержит ровно одну вкладку. Это вне AC MDP-4, но следует учесть в задаче на реальную систему вкладок (M2).
- Светлая тема не проверена — по CLAUDE.md это задача MDP-27. Тёмная работает через существующие `src/styles/themes/dark.css`.
- Иконки приложения (`src-tauri/icons/`) — placeholder, как и было отмечено в CLAUDE.md. Не относится к MDP-4.
