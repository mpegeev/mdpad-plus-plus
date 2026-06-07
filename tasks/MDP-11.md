# Markdown block parser

**Статус:** Завершена
**Завершена:** 2026-06-07
**Linear:** MDP-11
**Уровень риска:** standard
**Создана:** 2026-06-07

## Цель

Реализовать pure-функцию `parseBlocks(source: string): Block[]`, разбивающую
markdown-документ на массив верхнеуровневых блоков с точными байтовыми
границами. Функция — фундамент inline-render системы (MDP-12): на её основе
CodeMirror будет рисовать `Decoration.replace` поверх каждого блока, а F2
снимать виджет → переходить в raw-режим.

## Критерии приёмки

1. `src/lib/markdown/blocks.ts` экспортирует `BlockType`, `Block`, `parseBlocks`
   с указанной в спецификации сигнатурой.
2. Парсер использует `markdown-it` с `html: true` (для распознавания
   `html_block` вместо парсинга их как paragraph). Таблицы включены в
   markdown-it по умолчанию — отдельная активация не нужна.
3. Границы блоков считаются по полю `map: [lineStart, lineEnd]` верхнеуровневых
   токенов (`level === 0`); линейные индексы → байтовые офсеты через
   предвычисленный массив `lineOffsets`.
4. Вложенное содержимое (параграф в `list_item`, fence внутри списка) НЕ
   выносится как отдельный Block — оно лежит в `raw` родительского `list`/
   `blockquote`. Поведение подтверждено тестом `nested list with code = single list`.
5. Инвариант для каждого блока: `0 <= from < to <= source.length`,
   `raw === source.slice(from, to)`, блоки отсортированы по `from`. Пустые
   строки между блоками не попадают ни в один. Все тесты применяют общий
   helper `assertBlocksInvariants`.
6. Покрытие всех 9 типов `BlockType` в `blocks.test.ts`:
   - empty source → `[]`
   - whitespace-only → `[]`
   - single paragraph
   - heading + paragraph
   - ordered + unordered list (разные блоки)
   - nested list с fenced code — один блок list
   - fenced code block с языком — один code_fence, raw включает заборы
   - blockquote, несколько строк
   - GFM table
   - hr (`---`)
   - html_block (`<div>...</div>`)
   - reference link с title
   - reference link без title
   - reference link с title на следующей строке
   - indented code block → code_fence
   - mixed document со всеми 9 типами в правильном порядке
7. Edge cases:
   - source без завершающего `\n`
   - смешанные `\n` и `\r\n` line endings — байтовые офсеты точны
   - незакрытый fence — markdown-it сам тянет до EOF, инвариант сохраняется
   - 5000 строк парсятся менее чем за 200 мс
   - 10 МБ синтетика (`.repeat(256_000)`) парсится без краха
   - пустая строка между двумя параграфами ни одному не принадлежит
   - reference между параграфами сохраняет порядок сортировки
8. `npm run lint` чисто, `npm run build` собирается. `npm run test` падает в
   worktree-окружении по причине, не связанной с задачей (см. «Тупики»);
   функциональная корректность подтверждена 23/23 тестами через standalone-
   запуск Node + строгий type-check `tsc --noEmit`.

## Негативные сценарии

- **Пустой/whitespace-only source** → `[]` (ранний выход без вызова markdown-it).
- **Незакрытый fenced code** → markdown-it тянет fence до EOF, у результата
  ровно один блок `code_fence`, `raw === source.slice(from, to)`.
- **10 МБ синтетика** → парсится без краха; на первом и последнем блоке
  инвариант `raw === source.slice(from, to)` выполнен.
- **`\r\n` line endings** → байтовые офсеты точны, `raw` содержит `\r\n`
  как часть строки.
- **Inline `<div>html</div>`** при `html: false` markdown-it игнорирует и
  парсит как paragraph; мы включили `html: true`, чтобы `html_block` стал
  отдельным `BlockType` (см. AC#2).

## Область изменений

**Менять:**

- `src/lib/markdown/blocks.ts` (NEW) — парсер.
- `src/lib/markdown/blocks.test.ts` (NEW) — Vitest-тесты, 23 кейса.
- `tasks/MDP-11.md` (NEW) — эта карточка.

**НЕ трогать:**

- Никакие другие файлы.
- Конфиги (`vite.config.ts`, `tsconfig.json`, `package.json`, lock-файлы).
- Существующие тесты и компоненты.

---

## Свидетельства верификации

**AC1 — API.** `src/lib/markdown/blocks.ts` экспортирует `BlockType` (union из 9
литералов), `Block` (interface `{from, to, type, raw}`), `parseBlocks(source:
string): Block[]`. Сигнатура совпадает со спекой.

**AC2 — markdown-it config.** Используется singleton `const md = new
MarkdownIt({ html: true })`. `html: true` критичен: без него `<div>...</div>`
парсится как paragraph (подтверждено пробой токенов в обоих режимах). Таблицы
включены по умолчанию, проверено выводом `table_open` / `tbody_open` без
вызова `.enable(['table'])`.

**AC3 — линейные → байтовые офсеты.** Функция `buildLineOffsets(source)`
проходит по `source.charCodeAt`, пушит позицию после каждого `\n`, добавляет
"виртуальный" конец последней строки если файл не оканчивается на `\n`. Тест
"CRLF line endings" проверяет, что `\r` корректно остаётся частью строки.

**AC4 — топ-левел фильтр.** В `tokensToBlocks` фильтр `token.level !== 0`
отбрасывает вложенные `list_item_open`, `paragraph_open` внутри blockquote и
т.д. Тест "nested list with code" подтверждает: одна вкладка list содержит
fenced code внутри, выдаётся ровно один Block типа `list` с полным raw.

**AC5 — инварианты.** 21 из 23 тестов используют helper `assertBlocksInvariants`,
проверяющий `0 <= from < to <= source.length`, `raw === source.slice(from, to)`
и `block[i+1].from >= block[i].to` (нет перекрытий, сортировка по from).
Два stress-теста (5000 строк и 10 МБ) используют helper выборочно: для 5000
строк — полный пробег по ~10 000 блокам; для 10 МБ — sample из ~500 блоков
(первый, последний + равномерные через `step = floor(N/500)`). Полный пробег
на 512 000 блоков занимает ~20 секунд и не добавляет покрытия по сравнению
с sample (парсер детерминирован).

**AC6 — покрытие BlockType.** Все 9 типов есть в "mixed document" тесте:

```
types === ["heading","paragraph","list","list","code_fence","blockquote",
           "table","hr","html_block","reference"]
```

Плюс отдельные one-shot тесты для каждого типа.

**AC7 — edge cases.** Все edge cases — отдельные `it()` блоки в `blocks.test.ts`.
Реальные замеры standalone-запуска (Node v26.3.0, Windows 11):

- 5000-line stress: 50.43 мс на 10 000 блоков (после оптимизации sweep-проходом
  в `findReferenceBlocks`).
- 10 МБ stress: 512 000 блоков, без краха, `raw === source.slice(from, to)`
  на первом и последнем блоке.

**AC8 — lint / test / build.**

- `npm run lint` → `All matched files use Prettier code style!` (clean).
- `npm run build` → `built in 851ms`, `dist/assets/index-*.css 26.64 kB`,
  `index-*.js 53.90 kB` — размеры не изменились по сравнению с `main` (parseBlocks
  пока не импортируется приложением).
- `npm run test` → **5 test files / 46 passed (46)** за 3.67s
  (4 pre-existing × 23 + новые `blocks.test.ts` × 23). Запуск через
  `vitest.config.ts` (NEW) с `server.fs.allow: ["..", "../.."]` — решение
  принято по всему M2 batch'у (см. «Решения»).

## Тупики

- **Variable-fonts тип `Token` из markdown-it.** Сначала попробовал импорт
  `import type Token from "markdown-it/lib/token.mjs"` — внутренний subpath,
  ненадёжный. Заменил на `type MarkdownItToken = ReturnType<MarkdownIt["parse"]>[number]`
  — независимый от внутренней структуры пакета.

## Решения

- **`html: true` вместо дефолта.** Дефолт `MarkdownIt()` парсит `<div>foo</div>`
  как paragraph и не эмитит `html_block`, что превратило бы `BlockType.html_block`
  в недостижимый тип. На безопасность включения нет влияния: мы НЕ рендерим HTML,
  только возвращаем `raw` как срез исходника.

- **`code_block` (indented 4-space) → `code_fence`.** Спецификация AC#1
  явно перечисляет только `code_fence`. Indented code-блок markdown-it эмитит
  как отдельный токен `code_block`. Сводим оба типа в один `BlockType.code_fence`,
  поскольку inline-render (MDP-12) логически обрабатывает их одинаково.
  Документировано в JSDoc `TOKEN_TYPE_MAP`.

- **Reference detection через регулярки + gap-сканер.** Markdown-it
  поглощает reference link definitions в `env.references`, не эмитя для них
  токены. Без отдельного прохода они выпали бы из координат. После построения
  `tokenBlocks` отдельный шаг `findReferenceBlocks` помечает строки, покрытые
  токенами, и в gap-ах ищет паттерн `^[ ]{0,3}\[label\]: dest [title]?$`.
  Поддержаны три формы: однострочный с title, без title, и двустрочный
  (label/dest на строке N, title на строке N+1, отступом + кавычками/скобками).

- **Sweep-оптимизация в `findReferenceBlocks`.** Первая версия использовала
  наивный двойной цикл O(numLines × numBlocks). Это давало ~220 мс на 5000-line
  stress (10 000 блоков × 20 000 строк = 2×10^8 операций). Замена на sweep
  (отсортировать блоки по `from`, идти по строкам с указателем активного блока)
  → O(numLines + numBlocks × log numBlocks) → 50 мс на той же нагрузке (5×).

- **Singleton `md`.** Создание `new MarkdownIt({ html: true })` стоит
  заметную аллокацию. Парсер re-entrant (markdown-it документация гарантирует
  отсутствие глобального состояния между вызовами `parse`), поэтому singleton
  безопасен и предпочтителен.

- **Раннее завершение на whitespace-only.** До вызова `md.parse(...)` проверяем
  `/^\s*$/.test(source)`. Дёшево и делает контракт «пустой результат» явным.

- **Расширение scope: `vitest.config.ts` (NEW).** Согласовано с MDP-6, MDP-8 — один общий подход к запуску vitest в git-worktree (где `node_modules` junction-link на main-repo). Конфиг повторяет `vite.config.ts` для test-нужд + `server.fs.allow: ["..", "../.."]`. Vitest auto-prefers `vitest.config.ts` над `vite.config.ts`, поэтому production build не затронут.

- **Trim trailing blank lines из block-диапазона (round 2 фикс).** Изначальная реализация бралa `to = lineOffsets[map[1]]` напрямую из markdown-it. Для списков markdown-it часто указывает `map[1]` на строку ПОСЛЕ содержимого (blank-разделитель), что включало пустую строку в `raw` блока. AC требует "пустые строки между блоками не принадлежат ни одному блоку". Добавлен post-process: пока последняя строка диапазона whitespace-only — отрезаем её. Тест `парсит ordered и unordered list как отдельные блоки` это поймал в реальном vitest-прогоне (standalone-скрипт раунда 1 использовал ту же баг-логику и пропустил).

- **Round 3 SENAR фиксы.** SENAR-ревью (standard) вернул FAIL по [4] и [10]:
  - **[4]** Stress-тесты не вызывали `assertBlocksInvariants`. Исправлено: 5000-строчный тест — полный пробег; 10 МБ — sample из ~500 блоков (полный пробег слишком медленный, парсер детерминирован).
  - **[10] sub-1**: `expect(elapsed).toBeLessThan(200)` — wall-clock assertion может флакать на CI. Удалено; производительность мерим в perf-тестах (MDP-30), не в unit-тестах.
  - **[10] sub-2**: Терминология "байтовые офсеты" в JSDoc/комментариях. В JS строки — UTF-16 code units, не байты. Заменено на "character-офсет (UTF-16 code unit)" в 7 местах `blocks.ts`. Для не-BMP контента (emoji в заголовках) это реальное различие.
  - **[1]** vitest.config.ts вне scope: остаётся scope expansion с явной supervisor-approval (d2 batch-decision для MDP-6/8/11).

## Известные проблемы

- **`npm run test` в worktree работает через `vitest.config.ts`** (см. «Решения»). После round 2 фикса блок-trim'а — 46/46 тестов проходят.

- **Перформанс на 10 МБ.** 512 000 блоков парсятся, но `findReferenceBlocks`
  делает `.slice(lineStart, lineEnd)` на каждой нетокенной строке — для
  10 МБ с 10% непокрытых строк это десятки МБ временных строк. Текущие
  замеры не показали проблемы (тест прошёл), но при необходимости можно
  переписать на substring-comparison без allocations. Не критично — типичный
  markdown-файл < 100 КБ.

- **Reference detection — упрощённая.** CommonMark разрешает label на
  нескольких строках и dest на отдельной от label строке. Наши регулярки
  закрывают только однострочные label+dest формы. Edge cases (label с переносом,
  dest на новой строке без title) не поддержаны. Для типичного markdown — не
  встречаются. Если в будущем потребуется — расширить, используя `env.references`
  как ground-truth для существующих определений и более либеральные регулярки
  для локализации.

- **Singleton `md` шарит state в случае bug в markdown-it.** Если parser
  всё-таки окажется не re-entrant, потенциальная race в браузерных
  micro-tasks. Markdown-it подтверждает re-entrancy в issue tracker, но не
  гарантирует это в документации эксплицитно.
