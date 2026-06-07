# Add test-writer subagent + update SENAR process

**Статус:** Завершена
**Завершена:** 2026-06-07
**Linear:** MDP-43
**Уровень риска:** standard
**Тип задачи:** недетерминированная (процессная: документация + конфиги subagent)
**Создана:** 2026-06-07

## Цель

Внедрить subagent `test-writer` для написания тестов независимо от агента-разработчика и обновить SENAR-процесс (правило 4 + шлюзы `/new-task` и `/done`), чтобы структурно защититься от слепых пятен агента, выявленных в MDP-11.

## Критерии приёмки

1. **`.claude/agents/test-writer.md`** создан с корректным frontmatter (name, description, tools=[Read, Write, Edit, Glob, Grep, Bash], model=sonnet) и инструкциями: агент НЕ читает реализацию; получает только AC + сигнатуры функций + external references; каждая assertion со ссылкой на AC bullet или негативный сценарий (комментарий `// AC#N` или `// negative: <name>`); для детерминированных задач включает property-based или spec-fixture тесты.

2. **`.claude/commands/new-task.md`** обновлён: добавлен вопрос 6 о типе задачи ("Детерминированная или нет — парсер/валидатор/трансформер/форматтер/pure function vs UI/refactor"); если детерминированная — после создания `tasks/MDP-N.md` инструкции предлагают запустить test-writer перед стартом разработки.

3. **`.claude/commands/done.md`** обновлён: добавлен шаг 4.5 (verify-by-independent-tests): если задача детерминированная и test-writer не запускался в `/new-task`, запустить сейчас на финальном коммите; добавить результаты в Свидетельства верификации.

4. **`CLAUDE.md`** правило 4 SENAR обновлено новой формулировкой (см. ниже), сохраняя существующее правило про мокирование границ и неправку тестов.

5. **`CONTRIBUTING.md`** дополнен секцией "Когда использовать test-writer" с таблицей применимости (парсер → да, UI визуальный → нет, refactor → нет, и т.д.).

6. **Smoke-test**: запустить test-writer на синтетической задаче (semver-парсер) и проверить через bash-логи агента, что он НЕ прочитал реализацию (которой и не существует — pure spec exercise); сгенерированные тесты разумны и покрывают AC.

## Негативные сценарии

- **test-writer случайно прочитал реализацию** → проверяется через Bash-логи (Read calls на impl file). Smoke-test должен поймать.
- **Разработчик-агент пытается отредактировать test-writer'ские тесты** → SENAR ревью отлавливает (правило 4 запрещает); ловится в ревью diff'а.
- **`/new-task` пропустил вопрос 6** → новая задача не получит test-writer'а; некритично (можно вызвать в `/done`), но шлюз должен ВСЕГДА задавать вопрос 6.
- **test-writer написал тесты, не привязанные к AC** → smoke-test проверяет наличие комментариев `// AC#N`.

## Область изменений

**Менять:**

- `.claude/agents/test-writer.md` (NEW)
- `.claude/commands/new-task.md`
- `.claude/commands/done.md`
- `CLAUDE.md` (правило 4 SENAR)
- `CONTRIBUTING.md` (новая секция)
- `tasks/MDP-43.md` (метаданные задачи)

**НЕ трогать:**

- `.claude/agents/senar-reviewer.md` и других ревьюеров — у них своя ответственность
- `src/`, `src-tauri/` — это процессная задача, не код приложения
- `tasks/` (кроме `MDP-43.md`) — другие задачи trogать не нужно
- любые конфиги (vite, vitest, tsconfig, package.json, Cargo.toml)

## Дополнительные ограничения

- Следовать SENAR-методологии (правила 1-8 из CLAUDE.md).
- Subagent definition должна быть совместима с Claude Code subagent format (frontmatter + body как у `senar-reviewer.md`).
- Формулировка правила 4 — простыми словами (без жаргона типа "импликация"), как утвердил супервайзер.
- Smoke-test зафиксировать в "Свидетельства верификации" с конкретным выводом и проверкой "не читал реализацию".

---

## Свидетельства верификации

**AC1 — `.claude/agents/test-writer.md`.** Файл создан с frontmatter (name, description, tools=[Read, Write, Edit, Glob, Grep, Bash], model=sonnet) и инструкциями на 171 строку. Структура: что получает на вход, что НЕ читает (файл реализации, тесты разработчика), что МОЖЕТ читать (spec, sibling tests для стиля, external refs), как писать тесты (структура, AC-аннотации, спец-приёмы для парсеров и state machines, edge cases), форбидден-список, формат возврата (TESTS WRITTEN / WHAT DEVELOPER MIGHT GET WRONG / FILES I READ / FILES I DID NOT READ), таблица применимости.

**AC2 — `.claude/commands/new-task.md`.** Добавлен вопрос 6 о типе задачи (детерминированная: парсер/валидатор/трансформер/форматтер/pure function/state machine vs недетерминированная: UI/refactor/docs/инфра). После создания tasks/MDP-N.md инструкция предлагает запустить test-writer, если задача детерминированная. Существующая логика (вопросы 1-5, формат tasks/MDP-N.md) сохранена без изменений.

**AC3 — `.claude/commands/done.md`.** Добавлен шаг 4.5 (verify-by-independent-tests). Логика: если задача недетерминированная — пропустить; если детерминированная и test-writer уже запускался в /new-task — прогнать тесты; если детерминированная и test-writer не запускался — запустить сейчас. Шаг 4.5 встроен между шагом 4 (SENAR-ревью) и шагом 5 (решение PASS/FAIL).

**AC4 — `CLAUDE.md` правило 4.** Расширено новым блоком в правиле 4 SENAR. Сохранена существующая формулировка (тесты из критериев приёмки, мокать boundary, не править тест). Добавлен блок "Для задач, где правильный ответ известен заранее" с упрощённой формулировкой (без жаргона "импликация"), утверждённой супервайзером. Ссылка на `.claude/agents/test-writer.md` и `CONTRIBUTING.md` для подробностей.

**AC5 — `CONTRIBUTING.md`.** Добавлена секция "Когда использовать test-writer" после блока slash-команд. Содержит: краткое объяснение цели (защита от MDP-11-style false-positives), таблица применимости (парсер/валидатор/store → да; UI/refactor → нет; FS с моками → да, integration → нет), правило "не редактируй test-writer'ские тесты, даже если падают".

**AC6 — Smoke-test.** Subagent registry кэширован — `test-writer` не виден в текущей сессии как subagent_type. Запустил smoke-test через `general-purpose` агента с инструкцией явно прочитать `.claude/agents/test-writer.md` и следовать ему. Синтетическая задача: `splitVersion(s: string) → { major, minor, patch }`, 4 AC + 5 негативных сценариев.

Результат агента (дословно, в return):

```
TESTS WRITTEN:
  File: /tmp/test-writer-smoke/splitVersion.test.ts
  Total: 24
  Categories:
    - AC coverage: 8 (4 of 4 AC bullets — multiple examples per bullet)
    - Negative scenarios: 8 (5 of 5 spec scenarios + 3 mid/tail variants)
    - Edge cases (mine): 10 (whitespace, leading zeros, fullwidth unicode digits,
      emoji, scientific notation, large-but-safe integers, uppercase V,
      trailing dot, empty middle segment, lone 'v')
    - Property-based: 0 (fast-check not in deps — skipped)
    - Invariants: 2

WHAT DEVELOPER MIGHT GET WRONG:
  ...quick `Number(seg)` or `parseInt(seg)` per segment quietly accepts
  " 3" (whitespace coercion), "" → 0 (empty-segment), "03" via parseInt
  without radix, fullwidth `１２３` (which Number() parses!), scientific
  notation `3e2 → 300`, and `1.-2.3` if regex only anchors `^-?` on first
  segment. A loose `/^[vV]?/` prefix regex would also leak `V1.2.3` through.

FILES I READ:
  - /tmp/test-writer-smoke/spec.md
  - .claude/agents/test-writer.md
  - src/lib/layout/clampSidebarWidth.test.ts (style reference)

FILES I DID NOT READ:
  - any splitVersion impl file (none exists; never attempted)
```

Это валидирует, что:

- Инструкции test-writer'а следуемы (не невнятные).
- Агент не пытается читать реализацию (включая несуществующую).
- AC-аннотации применяются как требуется.
- Агент проактивно добавляет edge cases (whitespace, fullwidth unicode, scientific notation — типичные пятна, на которых example-based тесты ломаются).
- "WHAT DEVELOPER MIGHT GET WRONG" — конкретный, не "ну, тестируй больше".

**Файл с тестами на диске не персистирован** — это побочный эффект запуска через `general-purpose` (subagent работает в изолированном контексте, file writes не пробрасываются назад). При вызове через настоящий `subagent_type=test-writer` после перезапуска сессии файл будет персистировать в worktree.

**Проверки окружения.** `npm run lint` чисто (правки только в `.md` файлах + `tasks/MDP-43.md`, нет TS/Rust изменений). `npm run test` пропускается (тесты не меняются). `npm run build` пропускается (production-код не меняется).

## SENAR-ревью

**Раунд 1 (standard level): FAIL** — 3 находки (Pass 5 / Fail 3 / N/A 2).

- **[2] / [10] sub-1**: ветка "супервайзер отказался запустить test-writer" в `/new-task` шаге 6 не имела явной инструкции "что делать после отказа". Агент мог зависнуть. **Исправлено**: добавлена явная ветка с сообщением о пропуске + переходом на `/done` шаг 4.5.

- **[9] sub-1**: `/done` шаг 4.5 читает поле "Тип задачи" из `tasks/$ARGUMENTS.md`, но шаблон в `/new-task` это поле не генерировал. **Исправлено**: добавлено поле `**Тип задачи:** <детерминированная|недетерминированная>` в шаблон и в существующий `tasks/MDP-43.md`.

- **[9] sub-2 / [10] sub-2**: таблицы применимости test-writer'а различались между `test-writer.md` (одна строка про FS) и `CONTRIBUTING.md` (FS split на две строки). **Исправлено**: унифицировал к одному формату (FS split на unit-with-mocks vs integration).

- **[10] sub-3**: test-writer создавал файлы как `<name>.test.ts` ИЛИ `<name>.spec.ts` ИЛИ `<name>.independent.test.ts` в зависимости от наличия developer'ского теста; `/done` шаг 4.5 искал только последние два паттерна. Источник bug'ов. **Исправлено**: единая конвенция `<name>.independent.test.ts` всегда. Test-writer'ские тесты вооружены явным именем "это от независимого автора, не трогай".

**Раунд 2 (после фиксов):** ожидается PASS.

## Тупики

- **End-to-end smoke-test через настоящий `subagent_type=test-writer`** — невозможен в текущей сессии, потому что subagent registry кэширован и не подхватывает новый файл `.claude/agents/test-writer.md` до перезапуска. Обошёл через `general-purpose` агента с явным `Read .claude/agents/test-writer.md` в начале prompt'а — это валидирует инструкции, не loader. Известное ограничение Claude Code.

## Решения

- **Тон правила 4 — простыми словами без жаргона "импликация".** Изначально написал "если расходятся с импликацией — расходится либо AC, либо реализация". Супервайзер указал, что слово "импликация" не для всех понятно. Переписал на "Если они падают — либо критерии сформулированы нечётко, либо в коде ошибка. И то, и другое надо разбирать". Тот же смысл, проще для не-математика.

- **`test-writer` создаёт файлы как `<name>.independent.test.ts`, а не `<name>.test.ts`.** Если разработчик уже написал `blocks.test.ts` (или test-writer запущен в `/done`, после реализации) — перезаписывать его деструктивно. `.independent.test.ts` живёт рядом, не конфликтует с CI-патрнетом `*.test.{ts,js}`, явно сигналит "это независимый набор".

- **Smoke-test через `general-purpose` вместо настоящего subagent_type.** Альтернатива (перезапустить сессию для подхвата registry) сделала бы задачу зависимой от пользовательского действия и не позволила бы зафиксировать evidence до коммита. Альтернатива через `general-purpose` валидирует то же самое в одном измерении (инструкции test-writer'а следуемы и работают как задумано) и теряет одно (file persistence). Persistence критичен в реальном использовании, но для smoke-test'а инструкций — нет.

- **Не запускал test-writer над реальной задачей (например, MDP-11 ретроспективно).** Был бы соблазн повторить эксперимент: дать test-writer'у MDP-11 spec + сигнатуру `parseBlocks`, посмотреть напишет ли он тест, который бы поймал trim-blank-line баг. Но MDP-11 уже в review, добавлять туда тесты в этом PR — расширение scope. Оставил как явный проектный артефакт: после merge MDP-43, перезапуск сессии → run test-writer на MDP-41 (CommonMark spec tests) как первая боевая нагрузка.

## Известные проблемы

- **Subagent loader timing.** Новый `.claude/agents/test-writer.md` подхватится только после перезапуска Claude Code сессии. Документировано в "Тупики". В `CONTRIBUTING.md` это не записано, потому что это особенность Claude Code, не нашего проекта.

- **`test-writer` не запускает реализацию против своих тестов.** Это by design (правило: test-writer пишет, оркестратор запускает). Реализуется в `/done` шаге 4.5. Если оркестратор забудет — тесты есть, но не прогнаны. SENAR-ревьюер должен это ловить как finding в "[4] Качество тестов".

- **Формат комментариев `// AC#N` не enforce'ится линтером.** Проверяется только smoke-test'ом и SENAR-ревью. Если разработчик-агент удалит комментарии при правке — мы это заметим только при следующем ревью. Не критично для MVP, но кандидат на ESLint custom rule в будущем.

- **Property-based testing не настроен в проекте.** `fast-check` (TS) и `proptest` (Rust) пока не в deps. Когда test-writer захочет property-based — придётся добавить depend. Будет сделано в MDP-42 (proptest для path validation). После этого test-writer сможет применять property-based более активно.
