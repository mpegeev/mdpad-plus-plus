# mdpad++ — Roadmap задач

> Дорожная карта Linear-задач с учётом зависимостей и возможностей параллельной работы в worktree.
> Каждая задача = отдельный PR. Звёздочка ★ = можно параллелить в worktree.
> Зафиксировано: 2026-06-06 (после создания MDP-38).

## Принципы

- Один PR — один Linear issue.
- В worktree можно гнать задачи, которые трогают непересекающиеся файлы.
- Если две задачи правят один `.svelte` или `tokens.css` — мержить мучительно → последовательно.
- После закрытия каждой фазы — пересмотр scope последующих задач, если контекст изменился.

---

## Фаза 0 · Фундамент (последовательно)

| #   | Задача                              | Что блокирует |
| --- | ----------------------------------- | ------------- |
| 1   | **MDP-38** Apply Anthropic redesign | Всё ниже      |

---

## Фаза 1 · M2 Editor Foundation (4 параллельных worktree)

Все 4 задачи независимы между собой — `src-tauri/` ↔ `src/lib/stores/` ↔ `src/lib/editor/` ↔ pure-функция:

| #   | Задача                                               | Worktree | Зависит от | Файлы                                                                |
| --- | ---------------------------------------------------- | -------- | ---------- | -------------------------------------------------------------------- |
| 2   | ★ **MDP-7** Tauri fs commands (read/write/dialog)    | A        | MDP-38     | `src-tauri/src/fs_commands.rs`, `src/lib/fs.ts`                      |
| 3   | ★ **MDP-8** Document store (open files, dirty, tabs) | B        | MDP-38     | `src/lib/stores/documents.ts`                                        |
| 4   | ★ **MDP-6** CodeMirror 6 + Markdown lang             | C        | MDP-38     | `src/lib/editor/Editor.svelte`, замена welcome в `EditorArea.svelte` |
| 5   | ★ **MDP-11** Markdown block parser (pure fn, M3)     | D        | —          | `src/lib/markdown/blocks.ts`                                         |

После Фазы 1 → быстрые follow-ups (тоже параллельно):

| #   | Задача                                 | Worktree | Зависит от    |
| --- | -------------------------------------- | -------- | ------------- |
| 6   | ★ **MDP-10** Line numbers + wrap (1pt) | A        | MDP-6         |
| 7   | ★ **MDP-9** Sidebar file tree          | B        | MDP-7 + MDP-8 |

---

## Фаза 2 · M3 Inline Render (последовательно — tight coupling)

| #   | Задача                                                 | Зависит от                                 |
| --- | ------------------------------------------------------ | ------------------------------------------ |
| 8   | **MDP-12** Decoration.replace + WidgetType ⭐ ключевая | MDP-6 + MDP-11                             |
| 9   | **MDP-13** F2 / click → raw mode                       | MDP-12                                     |
| 10  | **MDP-14** Auto re-render on focus loss / Esc          | MDP-13                                     |
| 11  | ★ **MDP-15** Render mode toggle (rendered/mixed/raw)   | MDP-12 + MDP-8 (можно параллельно с 13–14) |

---

## Фаза 3 · M4 Formatting & UX (3 параллельных worktree)

| #   | Задача                                                     | Worktree | Зависит от                                            |
| --- | ---------------------------------------------------------- | -------- | ----------------------------------------------------- |
| 12  | ★ **MDP-17** Format bold/italic/code                       | A        | MDP-6                                                 |
| 13  | ★ **MDP-16** Floating selection toolbar                    | B        | MDP-6                                                 |
| 14  | ★ **MDP-19** Tabs drag-reorder, middle-click, context menu | C        | MDP-8                                                 |
| 15  | **MDP-18** Format heading levels + indent                  | A        | MDP-17 (следом за #12)                                |
| 16  | **MDP-20** Window/sidebar position persistence             | —        | лучше после MDP-26 (или собственная мини-persistence) |

---

## Фаза 4 · M5 Persistence & Search (4 параллельных worktree)

| #   | Задача                                        | Worktree | Зависит от             |
| --- | --------------------------------------------- | -------- | ---------------------- |
| 17  | ★ **MDP-21** Autosave + recovery snapshots    | A        | MDP-7 + MDP-8          |
| 18  | ★ **MDP-22** Dirty document indicator (1pt)   | B        | MDP-8                  |
| 19  | ★ **MDP-23** Gutter modified-line diff stripe | C        | MDP-6                  |
| 20  | ★ **MDP-24** Search in current document       | D        | MDP-6                  |
| 21  | **MDP-25** Search across open documents       | D        | MDP-24 (следом за #20) |

---

## Фаза 5 · M6 Settings & Theming

| #   | Задача                                                                     | Worktree      | Зависит от |
| --- | -------------------------------------------------------------------------- | ------------- | ---------- |
| 22  | **MDP-26** Settings store with persistence                                 | — (фундамент) | MDP-7      |
| 23  | ★ **MDP-27** Light/Dark themes refinement (scope ужать — базовое в MDP-38) | A             | MDP-26     |
| 24  | ★ **MDP-28** Font family / size / zoom controls                            | B             | MDP-26     |
| 25  | ★ **MDP-29** Customizable hotkeys with conflict detection                  | C             | MDP-26     |

---

## Фаза 6 · M7 Polish & Release

| #   | Задача                                             | Worktree | Зависит от              |
| --- | -------------------------------------------------- | -------- | ----------------------- |
| 26  | ★ **MDP-31** App icons (independent в любое время) | A        | —                       |
| 27  | ★ **MDP-30** Performance benchmarks                | B        | большая часть редактора |
| 28  | **MDP-32** Cross-platform smoke testing            | —        | всё выше                |
| 29  | **MDP-33** Release 0.1.0                           | —        | MDP-32                  |

---

## Заметки и открытые вопросы

- **MDP-27 нужно сократить.** Базовый Light/Dark уже даст MDP-38. В MDP-27 останется только синхронизация CodeMirror темы (через `EditorView.theme()` + те же переменные). Обновить описание в Linear после закрытия MDP-38.
- **MDP-20** в M4 завязан на MDP-26 (settings store) — логичнее перенести в M6 после MDP-26.
- **MDP-22** (dirty indicator, 1pt) — самая дешёвая задача, отличный «разогрев» после MDP-38, может быть первой в Фазе 4.
- **Конфликты при параллельной работе.** В Фазах 3+ TabsBar/Sidebar/EditorArea/StatusBar могут править один файл из нескольких задач. В таблицах выше задачи разведены по непересекающимся файлам, но при изменении scope — перепроверять.
- **Уровень риска по умолчанию `standard`.** Повышать до `high` для задач с файловыми операциями (MDP-7, MDP-21, MDP-26), пользовательскими данными (MDP-9), внешними API, ACL/capabilities.
