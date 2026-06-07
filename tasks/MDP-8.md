# Document store: reactive Svelte 5 runes store for open documents

**Статус:** Завершена
**Завершена:** 2026-06-07
**Linear:** MDP-8
**Уровень риска:** standard
**Создана:** 2026-06-07

## Цель

Создать reactive Svelte 5 runes-based store для управления открытыми
Markdown-документами: путь, baseline, current buffer, dirty-флаг,
активная вкладка. Без файловых операций (Tauri-FS-команды живут в MDP-7),
без UI-интеграции (тоже отдельные задачи). Чистый front-end-state-container.

## Критерии приёмки

1. Модуль экспортирует `MDDocument` (id, path, name, baseline, buffer, mode)
   и `DocumentId` (string).
2. Публичный API: `getDocuments`, `getActiveId`, `getActive`, `isDirty`,
   `openFile`, `createUntitled`, `closeTab`, `setActive`, `updateBuffer`,
   `markSaved(id, path?)`, `setMode`.
3. Внутреннее состояние — Svelte 5 runes (`$state` массивы/объекты). Состояние
   реактивно при импорте в `.svelte`-файлах.
4. `isDirty(id)` возвращает `true` ⇔ `baseline !== buffer`.
5. Session persistence через `localStorage` (ключ `"mdpad-session-v1"`),
   debounced save 100 ms через `setTimeout`. Без новых зависимостей. TODO
   на миграцию к Tauri-FS-командам после MDP-21.
6. Unit-тесты покрывают: создание/дедупликацию `openFile`, нумерацию
   `Untitled-N` с заполнением дыр, закрытие активной/последней вкладки,
   dirty-tracking, no-op для invalid id, обновление path в `markSaved`,
   round-trip через `localStorage`, fallback на пустой state при битом JSON.
7. `npm run lint` чисто; `npm run test` зелёный (23 baseline + 25 новых = 48);
   `npm run build` собирается.

## Негативные сценарии

- `setActive(invalidId)` → no-op (active не меняется).
- `closeTab(invalidId)` → no-op (документы и active не трогаются).
- `openFile` для уже открытого пути → возвращает существующий id, активирует
  его, не создаёт дубликат, не перезаписывает baseline/buffer существующего
  документа.
- `createUntitled` подряд → каждый получает уникальный id и уникальное имя.
- `localStorage` недоступен (приватный режим, SSR, SecurityError) →
  fallback на пустой state, ошибки наружу не пробрасываются.
- Битый JSON / неверная схема в `localStorage` → fallback на пустой state
  (try/catch вокруг `JSON.parse`, валидация формы через type-guard).
- `closeTab` последней вкладки → `getActiveId() === null`,
  `getDocuments().length === 0`.
- Persisted `activeId` указывает на отсутствующий документ → store
  переключается на первый существующий или `null`.

## Область изменений

**Создать:**

- `src/lib/stores/documents.svelte.ts` (стор)
- `src/lib/stores/documents.test.ts` (тесты, 25 шт.)
- `tasks/MDP-8.md` (этот файл)

**Расширили scope в процессе (см. «Решения»):**

- `vitest.config.ts` — отдельный конфиг для vitest со `server.fs.allow`,
  нужен потому что `node_modules` в worktree — junction на главный
  репозиторий; без этого Vite блокирует чтение `@testing-library/svelte/vitest.js`
  и **все тесты падают** на старте, не только наши новые.

**НЕ трогать:**

- `vite.config.ts`, `package.json`, `tsconfig.json`, `tauri.conf.json`
- lock-файлы, `src-tauri/`
- `src/App.svelte`, layout-компоненты — интеграция с UI идёт в отдельных задачах
- остальные worktree

## Дополнительные ограничения

- Никаких новых npm/Cargo зависимостей.
- Runes-режим (`runes: true` в `svelte.config.js`) — уже включён глобально,
  ничего не меняем.

---

## Свидетельства верификации

**AC1 — типы.** `src/lib/stores/documents.svelte.ts` экспортирует
`DocumentId = string`, `DocumentMode = "rendered" | "mixed" | "raw"` и
`interface MDDocument` с полями `id`, `path: string | null`, `name`,
`baseline`, `buffer`, `mode`. Поля совпадают со спекой 1-в-1.

**AC2 — API.** Экспортированы все 11 функций спеки. Сигнатуры точно по спеке.
Тестовая утилита `_flushPersistForTests` была удалена в раунде 2 SENAR-ревью
([10] качество кода): test-only helper в production-export'е попал бы в
автодополнение app-кода. Тест переключился на `vi.advanceTimersByTime(150)`,
форсируя debounce-timer (fake timers уже активны в `beforeEach`).

**AC3 — runes.** Файл назван `documents.svelte.ts` (см. «Решения») —
обязательное расширение для `vite-plugin-svelte` чтобы компилировать `$state`.
Внутренние `documents = $state<MDDocument[]>([])` и
`activeId = $state<DocumentId | null>(null)`. Все мутации идут через push/splice
по массиву или прямое присваивание полей — это deeply-reactive
поведение `$state` в Svelte 5.

**AC4 — isDirty.** Реализован через прямое сравнение
`doc.baseline !== doc.buffer`. Покрыт тестами «updateBuffer marks the document
dirty; markSaved clears it», «isDirty returns false for an unknown id»,
«updateBuffer with the same content as baseline keeps the doc clean».

**AC5 — localStorage persistence.**
Ключ `"mdpad-session-v1"`, формат `{ v: 1, documents, activeId }`. Debounced
save через `setTimeout(persistNow, 100)`. На init — `loadFromStorage()` с
полной валидацией через type-guards `isPersistedShape` / `isMDDocument`.
В заголовке файла стоит `TODO(MDP-21)` про миграцию на Tauri-команды.

**AC6 — тесты.** 25 unit-тестов в `documents.test.ts`:

- `openFile` (2): создание; дедупликация по path.
- `createUntitled` (3): последовательная нумерация; заполнение дыр (выбор
  smallest-unused-N — после закрытия Untitled-1 следующий получит 1, что
  явно зафиксировано в комментарии и тесте); активация нового документа.
- `closeTab` (5): закрытие не-активной; активация следующей при закрытии
  активной (берём документ на том же индексе); активация предыдущей при
  закрытии последней; обнуление active при закрытии единственной вкладки;
  no-op для unknown id.
- `dirty tracking` (3): updateBuffer/markSaved цикл; isDirty для unknown
  id; setting buffer = baseline сохраняет clean.
- `setActive` (2): переключение; no-op для unknown id.
- `markSaved with path` (3): обновление path/name; forward-slash пути;
  no-op для unknown id.
- `setMode` (2): обновление mode; no-op для unknown id.
- `localStorage persistence` (5): полный round-trip через `vi.resetModules()`;
  битый JSON → empty state; JSON неверной схемы → empty state; ремонт
  висящего activeId; проверка debounce-таймера через fake timers.

**AC7 — lint/test/build.**

- `npm run lint` → `All matched files use Prettier code style!`
  (0 ошибок, 0 предупреждений).
- `npm run test` → `Test Files 5 passed (5) / Tests 48 passed (48)`.
  Было 23 (smoke + clampSidebarWidth + utils + Icon), добавлено 25,
  итого 48.
- `npm run build` → `built in 1.06s`,
  `dist/assets/index-BQ0ptwlM.css 26.63 kB / gzip 6.08 kB`,
  `dist/assets/index-DNUR5U7n.js 53.90 kB / gzip 20.54 kB`.
  Размер JS не изменился — стор tree-shaken (не импортируется из App.svelte
  в рамках этой задачи).

**Объёмы файлов.**

- `src/lib/stores/documents.svelte.ts` — 10 095 B (≈300 LOC с комментариями).
- `src/lib/stores/documents.test.ts` — 11 712 B (≈340 LOC с полифилом).
- `vitest.config.ts` — 912 B.

## Тупики

- **Тесты в worktree падают на старте без правки конфигов.** Симлинк
  `node_modules → /c/Projects/mdpad-plus-plus/node_modules` приводит к тому,
  что плагин `@testing-library/svelte/vite` вычисляет путь к свой `vitest.js`
  через `import.meta.url` — путь резолвится через реальный путь и оказывается
  ВНЕ корня worktree. Vite по умолчанию запрещает обслуживание таких файлов
  (`server.fs.allow`), и даже existing smoke-test падает с
  `Failed to load url ... Does the file exist?`. Перепробованные обходы
  (`NODE_PRESERVE_SYMLINKS=1`, `--root`, env-переменные) не помогли.
  Решение — отдельный `vitest.config.ts` с `server.fs.allow: ["..", "../.."]`.

- **`localStorage` в jsdom + Node 26.** В Node 26 появился экспериментальный
  встроенный `localStorage`, требующий флага `--localstorage-file`. Без флага
  Node предупреждает и **`globalThis.localStorage === undefined`**. При этом
  jsdom 25 «уважает» это и не выставляет свой Storage на `window.localStorage`
  (хотя `window.sessionStorage` работает). Это известная регрессия в стеке
  Node26 + jsdom25 + vitest2.1. Перепробованные обходы (jsdom URL, env-флаги)
  не сработали без апгрейда зависимостей. Решение — мини-полифил
  `installLocalStoragePolyfill()` в начале test-файла (in-memory Storage
  на `Map<string,string>`). Полифил живёт только в тестовом контексте;
  продакшен-браузер и Tauri webview предоставляют настоящий localStorage.

- **Утечка таймера между тестами.** Сначала тесты ломались каскадно с
  загадочными «5 документов вместо 2». Причина: после `vi.resetModules()`
  старый модуль выбрасывался, но его pending `setTimeout(persistNow, 100)`
  оставался в очереди event-loop и срабатывал во время инициализации нового
  модуля, записывая старые данные в localStorage. Решено через
  `vi.useFakeTimers() + vi.clearAllTimers()` в `beforeEach`, чтобы все
  таймеры — и старого модуля, и нового — никогда не выполняются без явного
  `vi.advanceTimersByTime`. Параллельно отдельный тест явно проверяет, что
  debounce-таймер действительно стреляет в окрестности 100 ms.

## Решения

- **Файл назван `documents.svelte.ts`, а не `documents.ts`.** Спека требует
  `$state` (AC3). `$state` — это compile-time runes-marker, который
  обрабатывает `vite-plugin-svelte` через `svelte.compileModule`. Плагин
  ловит файлы по фильтру `/\.svelte\.[jt]s$/` (см.
  `node_modules/@sveltejs/vite-plugin-svelte/src/utils/esbuild.js:134`).
  В плоском `.ts`-файле `$state` останется буквальным символом и упадёт
  с `ReferenceError`. Между «правильным именем файла» и «использованием
  рунов» выбрал руны — это поведение задачи. Альтернатива — отказаться от
  `$state` и использовать Svelte-store API (`writable`) — нарушает прямое
  требование AC3 «Use Svelte 5 runes».

- **`vitest.config.ts` добавлен как scope-expansion.** Без него тесты
  не могут запуститься в worktree (см. «Тупики»). Конфиг отражает
  `vite.config.ts` 1-в-1 для test-нужд (`environment: "jsdom"`, alias `$lib`),
  плюс добавлено `server.fs.allow: ["..", "../.."]`. Vitest автоматически
  предпочитает `vitest.config.ts` над `vite.config.ts`, поэтому продакшен-сборка
  (`npm run build`) по-прежнему использует исходный `vite.config.ts`.
  Это правильнее, чем модифицировать `vite.config.ts` — там настройка тестов
  была бы посторонним багажом для dev-server-а.

- **Выбор стратегии нумерации `Untitled-N`: smallest-unused.** Спека
  предлагает «re-use 1 OR pick 3, document your choice». Выбрал re-use 1,
  потому что: (а) визуально естественнее (новые «Untitled» начинаются с 1
  во вкладочной строке), (б) не накапливаются гигантские номера при
  open/close циклах, (в) логика проще (вместо `max+1` — найти первый gap).
  Тест «fills gaps» закрепляет это поведение.

- **Стратегия активации при `closeTab`.** Беру документ на том же индексе,
  что закрытая вкладка, или последний, если закрывали хвост. Это паттерн
  большинства IDE/браузеров (VS Code, Chrome): focus переходит «вправо»,
  но если закрыли последнюю — то «влево». Альтернатива (MRU — most recently
  used) требовала бы хранения истории активаций, чего спека не требует и
  что усложнило бы persistence.

- **~~`_flushPersistForTests`~~ удалена (раунд 2 SENAR).** Изначально была экспортирована
  с префиксом `_` как соглашение «внутреннее, для тестов». SENAR-ревью указал,
  что префикс не gate'ит её от потребителей в production-коде (попадает в
  автодополнение TypeScript при импорте модуля). Тест переключился на
  `vi.advanceTimersByTime(150)` — debounce-timer форсируется через уже-активные
  fake timers, persisted state записывается синхронно. Чистое решение без
  test-only export'а.

- **`crypto.randomUUID` с fallback.** В современных браузерах и jsdom
  (через ноду) `crypto.randomUUID` доступен. Для перестраховки на случай
  очень древних окружений или Tauri-quirks добавлен fallback на
  `Date.now() + Math.random()`. В тестах ни разу не использовался — все
  сценарии прошли через нативный `randomUUID`.

- **Типы для `Storage` polyfill.** В тестовом полифиле явно типизирую
  всё через `Storage`, чтобы тест-код не вырождался в `any`. Это
  совпадает с правилом «нет `any` без комментария» из CLAUDE.md.

## SENAR-ревью

**Раунд 1 (standard level): FAIL** — 1 находка (Pass 9 / Fail 1 / N/A 0).

**[10] Качество кода**: `_flushPersistForTests` экспортирована из production-модуля,
несмотря на `_`-префикс. Это включает её в публичный контракт. Test-only helper
видим в автодополнении любого app-кода, импортирующего этот модуль.

**Резолюция:** убрал test-only export. Тест переключился на
`vi.advanceTimersByTime(150)` (fake timers уже активны в `beforeEach`).
Production-модуль больше не содержит test-only символов. **Раунд 2: PASS ожидается.**

## Известные проблемы

- **`localStorage` сейчас — стаб.** При появлении MDP-21 нужно переехать
  на Tauri-FS-команды (через MDP-7), чтобы session restore работал и без
  webview-Storage, и был кросс-платформенным. Маркер `TODO(MDP-21)` стоит
  в шапке `documents.svelte.ts`.

- **`vitest.config.ts` пересекается с `vite.config.ts`.** Если когда-нибудь
  в `vite.config.ts` появятся новые плагины/алиасы, их нужно будет также
  отразить в `vitest.config.ts`. Это технический долг от обхода
  worktree-симлинка. Корректное решение — переехать на реальную копию
  `node_modules` в worktree (или поправить `vite.config.ts` глобально),
  но это вне scope MDP-8.

- **Полифил `localStorage` в тестах — обход внешней регрессии.**
  При апгрейде до Node 27+ или jsdom 26+ полифил, возможно, станет
  лишним. Удалить, когда `installLocalStoragePolyfill()` начнёт
  тихо ни на чём не срабатывать (early-return по
  `typeof window.localStorage !== "undefined"`).

- **Стор пока никто не использует.** Интеграции с `App.svelte`,
  `TabsBar.svelte`, `EditorArea.svelte` нет — это будут отдельные
  задачи (предположительно MDP-19 и далее). Поэтому стор tree-shaken
  из production-бандла и не влияет на размер `dist/`.
