# mdpad++ — Roadmap задач

> Дорожная карта Linear-задач с учётом зависимостей и возможностей параллельной работы в worktree.
> Каждая задача = отдельный PR. Звёздочка ★ = можно параллелить в worktree.
> Зафиксировано: 2026-06-06 (после создания MDP-38).
> Обновлено: 2026-06-07 (MDP-6/7/8/11 в review; добавлены MDP-39..43 — follow-ups после SENAR-ревью M2-batch).

## Принципы

- Один PR — один Linear issue.
- В worktree можно гнать задачи, которые трогают непересекающиеся файлы.
- Если две задачи правят один `.svelte` или `tokens.css` — мержить мучительно → последовательно.
- После закрытия каждой фазы — пересмотр scope последующих задач, если контекст изменился.
- **Для детерминированных задач (парсер, валидатор, трансформер, pure function) тесты пишет отдельный субагент `test-writer`** — будет внедрено в MDP-43, обязательно до MDP-9/10/12+.

---

## Фаза 0 · Фундамент (последовательно)

| #   | Задача                              | Статус    | Что блокирует |
| --- | ----------------------------------- | --------- | ------------- |
| 1   | **MDP-38** Apply Anthropic redesign | ✅ merged | Всё ниже      |

---

## Фаза 1 · M2 Editor Foundation (4 параллельных worktree) — в review

Все 4 задачи реализованы параллельно через background-агентов в отдельных worktree, PR открыты, ожидают мержа.

| #   | Задача                                               | Статус       | PR                                                        | Worktree | Зависит от | Файлы                                                                |
| --- | ---------------------------------------------------- | ------------ | --------------------------------------------------------- | -------- | ---------- | -------------------------------------------------------------------- |
| 2   | ★ **MDP-7** Tauri fs commands (read/write/dialog)    | 🟡 in review | [#9](https://github.com/mpegeev/mdpad-plus-plus/pull/9)   | A        | MDP-38     | `src-tauri/src/fs_commands.rs`, `src/lib/fs.ts`                      |
| 3   | ★ **MDP-8** Document store (open files, dirty, tabs) | 🟡 in review | [#10](https://github.com/mpegeev/mdpad-plus-plus/pull/10) | B        | MDP-38     | `src/lib/stores/documents.svelte.ts`                                 |
| 4   | ★ **MDP-6** CodeMirror 6 + Markdown lang             | 🟡 in review | [#11](https://github.com/mpegeev/mdpad-plus-plus/pull/11) | C        | MDP-38     | `src/lib/editor/Editor.svelte`, замена welcome в `EditorArea.svelte` |
| 5   | ★ **MDP-11** Markdown block parser (pure fn, M3)     | 🟡 in review | [#12](https://github.com/mpegeev/mdpad-plus-plus/pull/12) | D        | —          | `src/lib/markdown/blocks.ts`                                         |

### Сразу после мержа M2-batch — process улучшение (urgent, последовательно)

| #   | Задача                                                           | Worktree | Зависит от     | Блокирует              |
| --- | ---------------------------------------------------------------- | -------- | -------------- | ---------------------- |
| 6   | 🚨 **MDP-43** test-writer subagent + SENAR process (3pt, urgent) | —        | M2-batch merge | MDP-9, MDP-10, MDP-12+ |

После MDP-43 → быстрые follow-ups (параллельно):

| #   | Задача                                                         | Worktree | Зависит от             |
| --- | -------------------------------------------------------------- | -------- | ---------------------- |
| 7   | ★ **MDP-10** Line numbers + wrap (1pt)                         | A        | MDP-6 + MDP-43         |
| 8   | ★ **MDP-9** Sidebar file tree                                  | B        | MDP-7 + MDP-8 + MDP-43 |
| 9   | ★ **MDP-39** Tighten Tauri fs ACL + Rust path validation (3pt) | C        | MDP-7                  |
| 10  | ★ **MDP-42** Property-based tests for fs paths (3pt)           | C        | MDP-39 (следом за #9)  |

---

## Фаза 2 · M3 Inline Render (последовательно — tight coupling)

| #   | Задача                                                        | Зависит от                                 |
| --- | ------------------------------------------------------------- | ------------------------------------------ |
| 11  | **MDP-12** Decoration.replace + WidgetType ⭐ ключевая        | MDP-6 + MDP-11 + MDP-43                    |
| 12  | ★ **MDP-41** CommonMark spec test suite для parseBlocks (2pt) | MDP-11 + MDP-43 (можно параллельно с #11)  |
| 13  | **MDP-13** F2 / click → raw mode                              | MDP-12                                     |
| 14  | **MDP-14** Auto re-render on focus loss / Esc                 | MDP-13                                     |
| 15  | ★ **MDP-15** Render mode toggle (rendered/mixed/raw)          | MDP-12 + MDP-8 (можно параллельно с 13–14) |

---

## Фаза 3 · M4 Formatting & UX (3 параллельных worktree)

| #   | Задача                                                     | Worktree | Зависит от                                            |
| --- | ---------------------------------------------------------- | -------- | ----------------------------------------------------- |
| 16  | ★ **MDP-17** Format bold/italic/code                       | A        | MDP-6                                                 |
| 17  | ★ **MDP-16** Floating selection toolbar                    | B        | MDP-6                                                 |
| 18  | ★ **MDP-19** Tabs drag-reorder, middle-click, context menu | C        | MDP-8                                                 |
| 19  | **MDP-18** Format heading levels + indent                  | A        | MDP-17 (следом за #16)                                |
| 20  | **MDP-20** Window/sidebar position persistence             | —        | лучше после MDP-26 (или собственная мини-persistence) |

---

## Фаза 4 · M5 Persistence & Search (4 параллельных worktree)

| #   | Задача                                        | Worktree | Зависит от             |
| --- | --------------------------------------------- | -------- | ---------------------- |
| 21  | ★ **MDP-21** Autosave + recovery snapshots    | A        | MDP-7 + MDP-8          |
| 22  | ★ **MDP-22** Dirty document indicator (1pt)   | B        | MDP-8                  |
| 23  | ★ **MDP-23** Gutter modified-line diff stripe | C        | MDP-6                  |
| 24  | ★ **MDP-24** Search in current document       | D        | MDP-6                  |
| 25  | **MDP-25** Search across open documents       | D        | MDP-24 (следом за #24) |

---

## Фаза 5 · M6 Settings & Theming

| #   | Задача                                                                     | Worktree      | Зависит от |
| --- | -------------------------------------------------------------------------- | ------------- | ---------- |
| 26  | **MDP-26** Settings store with persistence                                 | — (фундамент) | MDP-7      |
| 27  | ★ **MDP-27** Light/Dark themes refinement (scope ужать — базовое в MDP-38) | A             | MDP-26     |
| 28  | ★ **MDP-28** Font family / size / zoom controls                            | B             | MDP-26     |
| 29  | ★ **MDP-29** Customizable hotkeys with conflict detection                  | C             | MDP-26     |

---

## Фаза 6 · M7 Polish & Release

| #   | Задача                                                                       | Worktree | Зависит от              |
| --- | ---------------------------------------------------------------------------- | -------- | ----------------------- |
| 30  | ★ **MDP-31** App icons (independent в любое время)                           | A        | —                       |
| 31  | ★ **MDP-40** Replace `.expect()` in `src-tauri/src/lib.rs` (1pt, SENAR f-up) | B        | —                       |
| 32  | ★ **MDP-30** Performance benchmarks                                          | C        | большая часть редактора |
| 33  | **MDP-32** Cross-platform smoke testing                                      | —        | всё выше                |
| 34  | **MDP-33** Release 0.1.0                                                     | —        | MDP-32                  |

---

## Заметки и открытые вопросы

- **MDP-43 — критически перед M2 продолжением.** Внедряет процесс «test-writer субагент пишет тесты независимо от разработчика». Урок MDP-11: агент написал и парсер, и проверочный скрипт с одинаковыми ошибочными ожиданиями — оба прошли, баг проявился только при реальном vitest. Структурная защита от слепых пятен дешевле, чем повторять SENAR в 3 раунда. Должна быть готова до MDP-9/10/12+.

- **MDP-27 нужно сократить.** Базовый Light/Dark уже даёт MDP-38. В MDP-27 останется только синхронизация CodeMirror темы (через `EditorView.theme()` + те же переменные). Обновить описание в Linear после мержа MDP-6.

- **MDP-20** в M4 завязан на MDP-26 (settings store) — логичнее перенести в M6 после MDP-26.

- **MDP-22** (dirty indicator, 1pt) — самая дешёвая задача, отличный «разогрев» после MDP-38, может быть первой в Фазе 4.

- **Конфликты при параллельной работе.** В Фазах 3+ TabsBar/Sidebar/EditorArea/StatusBar могут править один файл из нескольких задач. В таблицах выше задачи разведены по непересекающимся файлам, но при изменении scope — перепроверять.

- **Уровень риска по умолчанию `standard`.** Повышать до `high` для задач с файловыми операциями (MDP-7, MDP-21, MDP-26), пользовательскими данными (MDP-9), внешними API, ACL/capabilities.

- **SENAR follow-ups из M2-batch:**
  - [MDP-39](https://linear.app/mpegeev/issue/MDP-39) (Tauri ACL `$HOME/**` сужение + Rust-side path validation — поднято в MDP-7 и MDP-38, объединено в одну задачу).
  - [MDP-40](https://linear.app/mpegeev/issue/MDP-40) (`.expect()` в `src-tauri/src/lib.rs:17` — поднято в MDP-38). Pre-existing нарушение, можно делать в любой момент M2..M7, обязательно до MDP-33 release.
  - [MDP-41](https://linear.app/mpegeev/issue/MDP-41) (CommonMark spec test suite для parseBlocks — поднято в MDP-11). Внешние фикстуры независимы от агентских ожиданий.
  - [MDP-42](https://linear.app/mpegeev/issue/MDP-42) (property-based тесты для path validation — поднято в MDP-7). proptest сгенерирует 1000+ случайных входов, поймает edge cases, которые агент не придумает.
  - [MDP-43](https://linear.app/mpegeev/issue/MDP-43) (test-writer субагент + SENAR-процесс — поднято в MDP-11). Структурное улучшение, действует на ВСЕ последующие задачи.

- **Worktree gotchas из M2-batch:**
  - `node_modules` нельзя junction-link'ить в worktree — Vite-резолвер блокирует `@testing-library/svelte`. Делать реальный `npm install` в каждом worktree (npm cache main-репо делает это дёшево).
  - Или использовать `vitest.config.ts` с `server.fs.allow: ["..", "../.."]` — подход применён в MDP-6/8/11.
