# mdpad++ — Claude Code Project Context

> Этот файл — основной источник правды для Claude Code при работе над проектом.
> Обновляй его после каждого значимого архитектурного изменения.

## Что это

**mdpad++** — лёгкий кроссплатформенный редактор Markdown-заметок,
сочетающий идеи Notepad++ (быстрый редактор кода с вкладками) и
Typora (inline-рендер Markdown). Цель — мгновенный запуск и отсутствие
тормозов даже на больших документах.

## Tech stack

| Слой | Технология | Зачем |
|---|---|---|
| Shell | **Tauri 2** | Лёгкий нативный wrapper (~5–15 МБ), системный WebView |
| Backend | **Rust** | Файловый I/O, watcher, индексация для поиска |
| Frontend framework | **Svelte 5** (runes) | Минимум boilerplate, быстрый реактивный UI |
| Build | **Vite** | Dev-server и bundling |
| Язык | **TypeScript** (strict) | Типобезопасность во фронте |
| Редактор | **CodeMirror 6** | Виртуализация, декорации, виджеты, gutters |
| Markdown parser | **markdown-it** | Расширяемый, быстрый, подходит для inline-рендера |
| Тесты | **Vitest** (unit) + **Playwright** (e2e) | Стандарт экосистемы Vite |
| Линтеры | **ESLint** + **Prettier** + **rustfmt** + **clippy** | Единый стиль |

**Почему именно эти технологии — см. раздел "Architectural decisions" ниже.**

## Структура репозитория

```
mdpad-plus-plus/
├── CLAUDE.md                  # этот файл
├── README.md
├── package.json               # JS-зависимости
├── tsconfig.json
├── vite.config.ts
├── svelte.config.js
├── index.html
├── src/                       # frontend (Svelte + TS)
│   ├── main.ts                # точка входа
│   ├── App.svelte             # корневой компонент
│   ├── lib/
│   │   ├── editor/            # обёртка над CodeMirror 6
│   │   ├── markdown/          # парсер и inline-рендер
│   │   ├── tabs/              # система вкладок
│   │   ├── sidebar/           # дерево файлов
│   │   ├── search/            # поиск по документам
│   │   ├── settings/          # темы, шрифт, хоткеи
│   │   └── stores/            # Svelte stores (состояние приложения)
│   └── styles/
├── src-tauri/                 # backend (Rust)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/          # ACL (Tauri 2 permissions)
│   └── src/
│       ├── main.rs
│       ├── lib.rs
│       ├── fs_commands.rs     # tauri::command для файлов
│       ├── search.rs          # индекс и поиск
│       └── watcher.rs         # отслеживание изменений на диске
└── tests/                     # e2e (Playwright)
```

## Архитектурные решения

### Почему Tauri 2, а не Electron
- Бинарник в 10–20 раз меньше (~10 МБ против ~150 МБ).
- Меньшее потребление RAM — критично для "лёгкого" редактора.
- Системный WebView (WebView2 на Windows, WKWebView на macOS, WebKitGTK на Linux).
- Минус: разные WebView на разных ОС → больше тестирования. Принимаем.

### Почему CodeMirror 6, а не Monaco / Lexical / своё решение
- CM6 единственный, у кого декорации, replace-widgets, gutters и виртуализация
  собраны в нужной комбинации для гибрида "raw ↔ rendered по блокам".
- Размер бандла ~400 КБ против ~5 МБ у Monaco.
- Своё решение — это 6–12 человеко-месяцев на rope, IME, виртуализацию и т.д.
  Не оправдано для этого проекта.

### Inline render: ключевая идея
Документ хранится как обычный Markdown-текст в `EditorState` CodeMirror.
Markdown парсится на блоки (заголовки, параграфы, списки, code-fences и т.д.).
Каждый блок **по умолчанию** отображается через `Decoration.replace` с
кастомным `WidgetType`, который рендерит HTML-представление блока.
По нажатию **F2** на текущем блоке (или клику) виджет временно снимается —
открывается raw-Markdown с полной поддержкой редактирования. После потери
фокуса/Esc — снова рендер. Это позволяет:
- сохранить производительность виртуализации (только видимые блоки рендерятся),
- избежать сложностей rich-text engine (исходник всегда плоский MD),
- получить эффект "Typora" без переписывания модели документа.

### Хранение состояния
- **Открытые документы**, **вкладки**, **настройки**, **последние файлы** —
  в Svelte stores, персистятся в JSON в каталоге Tauri `app_data_dir`.
- **Содержимое файлов** не дублируется в state, источник правды — диск.
  В памяти держим только dirty buffers (несохранённые изменения).
- **Автосохранение** — debounce 2 секунды после последнего ввода, либо при
  потере фокуса окна. Несохранённые изменения дополнительно сбрасываются
  во временный snapshot для recovery после сбоя.

### Diff-полоса (gutter изменённых строк)
- При открытии файла снимаем "baseline" — содержимое с диска.
- На каждый редактирующий transaction CodeMirror диффим текущий буфер с baseline
  построчно (быстрый алгоритм Майерса из библиотеки `diff` или вручную для
  построчного diff — он O(n+m) при равных длинах).
- Декорируем gutter цветом: жёлтый — изменено, зелёный — добавлено, красный —
  удалено (как в VS Code).
- При сохранении baseline обновляется, индикация сбрасывается.

## Команды разработки

```bash
# Установка зависимостей
npm install

# Dev-режим (Vite + Tauri вместе)
npm run tauri dev

# Production build
npm run tauri build

# Только frontend (без Tauri)
npm run dev

# Линтинг
npm run lint
npm run format

# Тесты
npm run test           # unit (Vitest)
npm run test:e2e       # e2e (Playwright)

# Rust-сторона
cd src-tauri
cargo fmt
cargo clippy
cargo test
```

## Конвенции кода

### TypeScript / Svelte
- `strict: true` всегда.
- Имена компонентов — `PascalCase.svelte`.
- Stores — `camelCase` в `src/lib/stores/`, экспорт через barrel `index.ts`.
- Никаких `any` без комментария-обоснования.
- Svelte 5: используем runes (`$state`, `$derived`, `$effect`), не legacy reactive `$:`.
- Предпочитаем чистые функции в `lib/`, побочные эффекты только в компонентах и stores.

### Rust
- `cargo fmt` + `cargo clippy -- -D warnings` обязательны перед коммитом.
- Tauri-команды — в отдельных модулях по доменам (`fs_commands.rs`, `search.rs`).
- Все команды возвращают `Result<T, String>` — ошибки сериализуются в JS.
- Никаких `unwrap()` в production-коде, только `?` или явная обработка.

### Git
- Ветки: `feat/MDP-123-short-description`, `fix/MDP-123-...`, `chore/...`.
- Коммиты по Conventional Commits: `feat(editor): add F2 toggle for raw mode`.
- В теле коммита и/или PR — ссылка на Linear-issue: `MDP-123`.
- Один PR ≈ один Linear issue. Не смешиваем фичи.

## Workflow с Linear

Все задачи живут в Linear (проект **mdpad++**, префикс ID — `MDP`).
Каждая задача содержит:
- **Title** — короткое описание фичи.
- **Description** — контекст, acceptance criteria, ссылки на технические заметки.
- **Labels** — `frontend`, `backend`, `editor`, `ux`, `performance`, `infra`.
- **Milestone** — этап (Skeleton, Editor, Inline render, ...).
- **Estimate** — story points (1, 2, 3, 5, 8).

### Цикл работы Claude Code
1. Прочитать `CLAUDE.md` (этот файл).
2. Получить следующий issue из Linear (`In Progress` или верх `Todo`).
3. Внимательно прочитать description и acceptance criteria.
4. Создать ветку `feat/MDP-XXX-slug`.
5. Реализовать, написать тесты, прогнать линтер.
6. Закоммитить с правильным префиксом.
7. Открыть PR с описанием и пометкой `Closes MDP-XXX`.
8. Перевести issue в `In Review`.
9. После мержа — `Done`.
10. **Обновить CLAUDE.md**, если изменилась архитектура или появились новые
    конвенции.

## Definition of Done (общий)

Issue считается выполненным, только если:
- [ ] Код реализует все acceptance criteria.
- [ ] Юнит-тесты на новый код добавлены и проходят.
- [ ] `npm run lint`, `cargo clippy` — без ошибок.
- [ ] Приложение собирается в dev и release-режиме.
- [ ] Ручная проверка фичи в `npm run tauri dev`.
- [ ] CLAUDE.md обновлён, если задача затронула архитектуру.
- [ ] PR создан, описан, прилинкован к Linear.

## Текущее состояние

> Обновляй этот раздел по мере прогресса.

- **Этап:** 0 — Bootstrap
- **Версия:** 0.0.0
- **Платформы:** Windows (primary), Linux/macOS (best-effort)
- **Известные TODO:**
  - Иконки приложения (`src-tauri/icons/`) — placeholder, заменить.
  - Не настроен CI (см. issue MDP-XXX).
