# mdpad++ — Claude Code Project Context

> Читай при старте каждой сессии. Детали архитектуры — `docs/architecture.md`.
> Дизайн-система — `DESIGN.md`. Методология — `docs/senar.md`.

Если сомневаешься — **остановись и спроси**, не угадывай. Язык общения - русский.

---

## Правила работы (SENAR)

### 1. Задача до кода

Не пиши код без сформулированной задачи (Linear issue с целью, критериями
приёмки, негативным сценарием, областью изменений и уровнем риска).
Нет задачи — предложи `/new-task`. Исследование без коммита — можно.

### 2. Границы изменений

Меняй **только** файлы из области задачи. Нужно больше — спроси.
Без разрешения не трогай: конфиги CI, lock-файлы, `Cargo.lock`,
`package-lock.json`, `tauri.conf.json`.

### 3. Верификация фактами

Каждый критерий = конкретное свидетельство (вывод теста, diff, ответ).
"Работает" и "должно работать" — не верификация.

### 4. Тесты — поведение, не реализация

Тесты из критериев приёмки. Мокай только внешние границы (Tauri API,
FS, время). Не правь тест, чтобы прошёл — разбирайся в причине.

### 5. Безопасность по умолчанию

- Fail-closed при недоступности ресурса.
- Пустая конфигурация падает, а не обходится.
- Никаких секретов в коде.
- Валидируй ввод до файловых операций.
- Rust: никаких `unwrap()` в production, только `?`.

### 6. Завершение задачи

1. Свидетельство по каждому критерию.
2. Список изменённых файлов vs область задачи.
3. SENAR-ревью: `Use the senar-reviewer subagent`.
4. Не готово — скажи прямо.
   Используй `/done <имя>`.

### 7. Баг = корневая причина

Воспроизведи → гипотеза → подтверждение супервайзера → патч.
Не знаешь причину — скажи "не знаю". Используй `/rca`.

### 8. Фиксация знаний

В конце задачи: тупики, решения, известные проблемы. "Нет" — валидный ответ.

---

## Что НИКОГДА не делаешь

- Не объявляешь готовым без свидетельств.
- Не меняешь файлы за пределами области "по ходу дела".
- Не правишь тесты вместо кода.
- Не добавляешь зависимости без согласования.
- Не пишешь `catch {}` без объяснения.

---

## О проекте

**mdpad++** — лёгкий кроссплатформенный Markdown-редактор заметок.
Гибрид Notepad++ и Typora: вкладки, дерево файлов, inline-рендер MD,
F2 для raw-режима, мгновенный запуск на больших документах.

### Стек

- **Tauri 2** + **Rust** — нативная оболочка, файловый I/O
- **Svelte 5** (runes) + **TypeScript** strict + **Vite** — frontend
- **CodeMirror 6** — редактор (декорации, виджеты, виртуализация)
- **markdown-it** — парсер MD
- **shadcn-svelte** + **Tailwind** — UI-компоненты (копируются в `src/lib/ui/`)
- **`src/lib/ui/Icon.svelte`** + **`icons.ts`** — иконки 14/16px (SVG-пути из Lucide, ISC)
- **Vitest** + **Playwright** — тесты
- **ESLint** + **Prettier** + **rustfmt** + **clippy** — линтеры

### Ключевая архитектурная идея

Документ — плоский Markdown в EditorState. Блоки рендерятся через
`Decoration.replace` + `WidgetType`. F2 снимает виджет → raw-режим.
Подробности — `docs/architecture.md`.

### Структура

```
src/              Svelte + TS frontend
src/lib/ui/       shadcn-svelte компоненты
src/lib/editor/   обёртка CodeMirror 6
src/lib/stores/   Svelte stores
src/styles/       tokens.css, themes/
src-tauri/src/    Rust: Tauri commands
.claude/          SENAR: subagent + slash-commands
docs/             architecture.md, senar.md
tasks/            фиксация знаний (зеркало Linear)
```

---

## Конвенции

**TS/Svelte:** strict, PascalCase компоненты, camelCase stores, runes,
нет `any` без комментария. Все цвета — CSS-переменные, отступы кратны 4px.

**Rust:** `cargo fmt` + `clippy -D warnings`, `Result<T, String>`,
нет `unwrap()`.

**Git:** ветки `feat/MDP-123-slug`, Conventional Commits, один PR = один issue.
Основная ветка `main`, защищённая.

**UI:** читай `DESIGN.md` перед любой UI-задачей.

---

## Команды

```bash
npm run tauri dev     # dev с Tauri
npm run dev           # только frontend
npm run lint          # ESLint + Prettier
npm run format        # Prettier (запись)
npm run test          # Vitest (unit)
npm run test:e2e      # Playwright (e2e)
cd src-tauri && cargo fmt
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo test
```

## Slash-команды Claude Code

- `/new-task <имя>` — шлюз "Старт"
- `/done <имя>` — шлюз "Готово"
- `/rca <описание>` — root cause analysis
- `Use the senar-reviewer subagent` — ревью по чеклисту

## Definition of Done

- [ ] Все acceptance criteria с фактическими свидетельствами
- [ ] Тесты добавлены и проходят
- [ ] `npm run lint` + `cargo clippy` чисто
- [ ] Собирается в dev и release
- [ ] SENAR-ревью на уровне задачи
- [ ] CLAUDE.md / DESIGN.md / docs/architecture.md обновлены если нужно
- [ ] Тупики, решения, проблемы зафиксированы
- [ ] PR с `Closes MDP-XXX`

### Дополнительно для UI-задач (чеклист соответствия DESIGN.md)

- [ ] Все цвета — через CSS-переменные, нет хардкода `#xxx` в компонентах
- [ ] Все отступы — кратны 4px, через `--space-N`
- [ ] Radius — только из `--radius-*`
- [ ] Шрифт — `--font-ui` или `--font-mono`, не пользовательский
- [ ] Иконки из `src/lib/ui/Icon.svelte`, размер 14/16
- [ ] Нет анимаций на `all` или `height`
- [ ] Компонент проверен на маленьком окне 640×400
- [ ] Тёмная тема работает (светлая — после MDP-27)

## Текущее состояние

- **Этап:** 0 — Bootstrap
- **Версия:** 0.0.0
- **Платформы:** Windows (primary), Linux/macOS (best-effort)
- **Известные TODO:**
  - Иконки приложения (`src-tauri/icons/`) — placeholder, заменить.
  - CI не настроен.
