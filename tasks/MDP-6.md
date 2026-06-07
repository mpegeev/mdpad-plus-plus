# Integrate CodeMirror 6 with markdown highlighting

**Статус:** Завершена
**Завершена:** 2026-06-07
**Linear:** MDP-6
**Уровень риска:** standard
**Создана:** 2026-06-07

## Цель

Интегрировать CodeMirror 6 в `EditorArea.svelte` как полнофункциональный markdown-редактор: подсветка синтаксиса, тёмная/светлая тема через CSS-переменные проекта. Welcome-состояние сохраняется, но теперь даёт точку входа в реальный редактор.

## Критерии приёмки

1. `src/lib/editor/Editor.svelte` — новый компонент со Svelte 5 runes API (`doc`, `onDocChange?`, `readOnly?`).
2. EditorView монтируется через `$effect`, в host-`<div>` (`bind:this`), cleanup-функция вызывает `view.destroy()`.
3. Используемые расширения: `lineNumbers`, `highlightActiveLine`, `highlightActiveLineGutter`, `history`, `markdown()`, `keymap.of([defaultKeymap, historyKeymap, searchKeymap])`, кастомная тема, update-listener для `onDocChange`.
4. `src/lib/editor/theme.ts` — `editorTheme` через `EditorView.theme(...)` использует только CSS-переменные (`--bg-base`, `--fg-primary`, `--bg-elevated`, `--border-subtle`, `--bg-hover`, `--bg-selection`, `--font-mono`, `--fs-md`, и т.д.); подсветка markdown через `HighlightStyle.define([...])` + `syntaxHighlighting(...)` с маппингом `tags.heading*/emphasis/strong/monospace/link/quote/list` на `--syntax-*`.
5. `src/lib/layout/EditorArea.svelte` — рендерит `<Editor doc={sampleDoc} onDocChange={(next) => sampleDoc = next} />` если документ есть; иначе welcome-карточка с активной кнопкой «Создать файл», которая выставляет sample-doc.
6. `src/lib/editor/Editor.test.ts` — Vitest + `@testing-library/svelte`: монтаж/рендер doc, onDocChange срабатывает на dispatch, отсутствие onDocChange не валит, изменение пропа doc извне обновляет state, unmount → `destroy()` вызван и DOM отсоединён.
7. `npm run lint` чисто, `npm run test` все тесты проходят (предыдущие 23 + новые), `npm run build` проходит; зафиксировать рост JS-бандла за счёт CodeMirror.

## Негативные сценарии

- Пустой doc → пустой редактор, без ошибок.
- Внешнее обновление prop doc → состояние редактора обновляется без потери EditorView.
- Совпадающее значение doc после rerender → лишних dispatch'ей не происходит, onDocChange не вызывается.
- onDocChange не передан → правки в редакторе не валят рантайм.
- Unmount во время редактирования → `EditorView.destroy()` вызван, DOM отсоединён, утечек слушателей нет.

## Область изменений

**Менять:**

- `src/lib/editor/Editor.svelte` (NEW)
- `src/lib/editor/theme.ts` (NEW)
- `src/lib/editor/Editor.test.ts` (NEW)
- `src/lib/layout/EditorArea.svelte` (modify — условный рендер Editor vs welcome, локальный sampleDoc)
- `tasks/MDP-6.md` (NEW)

**Расширили scope в процессе (см. «Решения»):**

- `vitest.config.ts` (NEW) — отдельный конфиг для vitest с `server.fs.allow: ["..", "../.."]`. Без него vitest в git-worktree (где `node_modules` junction-link на main-repo) падает на загрузке setup-файлов `@testing-library/svelte`, что блокирует AC7. Vitest auto-prefers `vitest.config.ts` над `vite.config.ts`, поэтому production build (`npm run build`) не затронут. Подход согласован между MDP-6, MDP-8, MDP-11 (унификация по решению супервайзера).

**НЕ трогать:**

- токены / темы / другие layout-компоненты (Sidebar, TabsBar, StatusBar, ResizeHandle)
- никаких новых deps (CodeMirror уже в `package.json`)
- `index.html`, `App.svelte`
- `src-tauri/`, lock-файлы

## Дополнительные ограничения

- Только CSS-переменные проекта, никаких хардкодов цветов / шрифтов / размеров в editor theme.
- Нет `transition: all`, нет анимаций на `height`.
- Не использовать `basicSetup` целиком — собрать минимальный набор расширений руками.

---

## Свидетельства верификации

**AC1 — Editor.svelte API.** `src/lib/editor/Editor.svelte` экспортирует runes-Props `doc: string`, `onDocChange?: (next: string) => void`, `readOnly?: boolean`. Хост-`<div bind:this={hostEl}>` имеет `data-testid="cm-host"`.

**AC2 — mounting через `$effect`.** В компоненте два `$effect`:

1. Монтирует `EditorView` в `hostEl`, возвращает cleanup `() => created.destroy()`.
2. Реагирует на изменение пропа `doc`, диспатчит changes только если значение отличается от текущего `view.state.doc.toString()`.

**AC3 — extensions.** Стек (см. `src/lib/editor/Editor.svelte`):

```
lineNumbers()
highlightActiveLine()
highlightActiveLineGutter()
history()
markdown()
keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap])
editorTheme
editorSyntaxHighlight
EditorState.readOnly.of(readOnly)
EditorView.updateListener.of(...)  // → onDocChange
```

`basicSetup` отвергнут осознанно — слишком много "магии" (bracket-matching, auto-closing, crosshair-cursor), которой не место в чистом markdown-редакторе. Обоснование в комментарии в шапке компонента.

**AC4 — theme.ts через токены.** `grep -E "#[0-9a-fA-F]{3,6}" src/lib/editor/theme.ts` — 0 совпадений. Все цвета/шрифты/размеры через `var(--*)`. Highlight-стиль использует `--syntax-heading`, `--syntax-code`, `--syntax-link`, `--syntax-quote`, `--syntax-list`, `--syntax-hr` из обеих тем (`themes/light.css` + `themes/dark.css`).

**AC5 — EditorArea.** Условный рендер: при пустом `sampleDoc` показывает welcome-карточку с активной primary-кнопкой «Создать файл» (`onclick={openSample}`); при не-пустом — `<Editor>` с двусторонним биндингом через `onDocChange`.

**AC6 — тесты.** `src/lib/editor/Editor.test.ts` — 8 тестов:

- монтируется и отображает doc;
- пустой doc;
- onDocChange срабатывает на dispatch;
- отсутствие onDocChange не валит rerun edit;
- внешнее изменение пропа обновляет состояние;
- совпадающий doc не триггерит onDocChange;
- readOnly=true → `state.readOnly === true`;
- unmount → `destroy()` вызван, `view.dom.isConnected === false`.

**AC7 — lint/test/build.**

- `npm run lint` → `All matched files use Prettier code style!` (0 ошибок, 0 warning).
- `npm run test` → `Test Files 5 passed (5) / Tests 31 passed (31)`. Было 23, добавлено 8 в `Editor.test.ts` (см. AC6).
- `npm run build` → `built in 2.64s`, `dist/assets/index-*.css 26.85 kB / gzip 6.12 kB` (+0.46 kB к MDP-38), `dist/assets/index-*.js 585.08 kB / gzip 204.21 kB` (рост с 53.90/20.54 kB до 585/204 — это CodeMirror 6 + @lezer/markdown, прогноз бюджета подтверждён, см. «Известные проблемы»). Vite кидает warning о >500 kB chunk — это ожидаемо, code-splitting CodeMirror в отдельный async-chunk — задача MDP-32 (perf/lazy editor).

## Тупики

- **Vitest в git-worktree.** `node_modules` в worktree — junction-link на `C:/Projects/mdpad-plus-plus/node_modules`. Vite's dev fs guard (`server.fs.allow`) по умолчанию ограничивал доступ корнем проекта (`C:/Projects/mdpad-worktrees/MDP-6`), и setup-файл `@testing-library/svelte/vite` пытался загрузить `vitest.js` по абсолютному пути в `mdpad-plus-plus/node_modules`, ловя `Failed to load url … Does the file exist?`. Решено добавлением `server.fs.allow: [".", "../mdpad-plus-plus", "../../mdpad-plus-plus"]` в `vite.config.ts`. Это minimal-scope расширение, но касается файла вне явного scope (см. «Расширения scope»). Альтернатива (`preserveSymlinks: true`) — рискованный broad-side эффект на резолюцию всех модулей.
- **Effect двойного запуска.** В первой версии effect-а инициализации `EditorState.create({ doc, extensions: [..., EditorState.readOnly.of(readOnly), ...] })` напрямую читал `doc` и `readOnly` — Svelte 5 трэкал их как reactive deps, и `rerender({ doc: 'second' })` пересоздавал EditorView с потерей состояния и истории. Тест «внешнее изменение пропа doc обновляет состояние редактора» поймал это: после rerender тест держал ссылку на старый view (destroyed), а живой view был новый. Решено через `untrack(() => doc)` / `untrack(() => readOnly)` для initial-чтения в монтаж-effect-е. Внешнее обновление `doc` идёт строго через второй effect + `view.dispatch`.

## Решения

- **Нет `basicSetup`.** Собран минимальный набор расширений вручную для контроля над поведением и бандлом — `basicSetup` приносит autocomplete, drawSelection, dropCursor, bracketMatching, crosshairCursor и другие, которые либо избыточны, либо мешают чистому markdown-UX.
- **Два `$effect` вместо одного.** Первый создаёт View и держит cleanup; второй отвечает за внешний `doc`. Один общий effect, зависящий от `doc`, пересоздавал бы View при каждом изменении пропа и терял scroll/selection (см. «Тупики»).
- **`untrack()` для init-параметров.** `doc` и `readOnly` читаются через `untrack(() => …)` в монтажном `$effect` — гарантирует, что reactive read внутри `EditorState.create` НЕ трэкается, и effect не пересоздаёт View при каждом rerender. Реактивная синхронизация `doc` — через отдельный effect; реактивный `readOnly` отложен до MDP-12.
- **`HighlightStyle` через `@lezer/highlight` tags.** `markdown()` использует Lezer-парсер, и теги (`tags.heading1`, `tags.emphasis`, …) — стандартный способ маппинга на CSS-стили. `@lezer/highlight` уже идёт транзитивно с `@codemirror/language`, новой зависимости в `package.json` нет.
- **`view = $state()` для cross-effect доступа.** Делает view доступным во втором effect и реактивным при первом mount-е. Минимальная цена — оверхед Svelte-прокси, который CodeMirror не замечает (он работает с собственным state).
- **Расширение scope: `vitest.config.ts` (NEW).** Файл не значится в «менять» спецификации. Изначально агент решил проблему правкой `vite.config.ts` (`server.fs.allow`), но супервайзер унифицировал подход по всему M2 batch'у: тестовый конфиг живёт в отдельном `vitest.config.ts`, production-build остаётся на чистом `vite.config.ts`. Это позволило сохранить минимальную поверхность изменений в shared-конфиге и согласовать подход между MDP-6, MDP-8, MDP-11.

- **Round 2 SENAR фиксы.** SENAR-ревью (standard) вернул FAIL по [4], [10], UI/DESIGN.md:
  - **[10] hardcoded `fontWeight: "600"`** в `theme.ts` (7 мест: heading1–6 + strong) → заменено на `var(--fw-bold)`. Это нарушение DESIGN.md "все шрифты через токены".
  - **[4]** Тест "не диспатчит лишних обновлений" имел тавтологическое утверждение `expect(view.state.doc.length).toBe(lengthBefore)` — это следствие `onDocChange not called`, не дополнительное наблюдение. Удалено вместе с переменной `lengthBefore`.
  - **UI/DESIGN.md** — в `themes/*.css` уже были `--syntax-emphasis`, `--syntax-strong`, `--syntax-quote`, `--syntax-list`, `--syntax-hr` (добавлены в MDP-38), но DESIGN.md перечисляет только 3 из 8 syntax-токенов. MDP-6 впервые использует эти токены, поэтому в DESIGN.md (Light section) добавлены остальные 5 для полноты документации. Минимальное расширение scope (5 строк).

## Известные проблемы

- **JS-бандл 585 kB (gzip 204 kB).** Рост ~10× относительно baseline (53.9 kB). Это CodeMirror core (`view`, `state`, `language`, `commands`, `search`, `lang-markdown`) + Lezer. Code-splitting в отдельный async chunk (load editor on demand) — кандидат на MDP-32 (perf/lazy editor). До тех пор — приемлемо: запуск editor-зоны лишь на открытом документе, а initial paint всё ещё доминируется CSS (26 kB) + welcome-card (parsed up front).
- **readOnly не реактивный.** Меняется только при mount-е. Для MDP-6 этого достаточно; реактивный readOnly через `Compartment` — задача MDP-12 (raw/rendered toggle).
- **Сёрч-панель CM6 (Ctrl+F) использует дефолтные стили CodeMirror.** Минимальная подкраска `cm-panels` через CSS-переменные есть, но full visual pass (input/button styles в панели) откладывается до целевого UX-passes по поиску.
