# Contributing to mdpad++

## Workflow

1. Берёшь issue из Linear (проект **mdpad++**, префикс `MDP`).
2. Создаёшь ветку: `feat/MDP-123-short-slug` (или `fix/`, `chore/`, `docs/`).
3. Реализуешь фичу, пишешь тесты.
4. Прогоняешь линтеры локально.
5. Коммитишь по Conventional Commits: `feat(editor): add F2 toggle for raw mode`.
6. Пушишь, открываешь PR с упоминанием `Closes MDP-123` в описании.
7. После мержа Linear автоматически переведёт issue в Done.

Один PR = один issue. Не смешиваем фичи в одной ветке.

## Локальная разработка

```bash
npm install
npm run tauri dev
```

Подробнее про стек и архитектуру — см. [`CLAUDE.md`](./CLAUDE.md).

## Перед коммитом

```bash
npm run lint
npm run test
cd src-tauri && cargo fmt && cargo clippy -- -D warnings && cargo test
```

## Conventional Commits

- `feat(scope): ...` — новая фича
- `fix(scope): ...` — баг-фикс
- `chore(scope): ...` — рутина (зависимости, конфиги)
- `docs(scope): ...` — документация
- `refactor(scope): ...` — рефакторинг без изменения поведения
- `perf(scope): ...` — оптимизация
- `test(scope): ...` — тесты

Scopes: `editor`, `tabs`, `sidebar`, `search`, `settings`, `tauri`, `ci`, `deps`.

## Работа с Claude Code

В этом проекте Claude Code — основной разработчик. Правила для него:

1. Всегда читать `CLAUDE.md` перед началом работы.
2. Брать ровно одну задачу из Linear за раз.
3. Внимательно следовать acceptance criteria.
4. Обновлять `CLAUDE.md`, если задача меняет архитектуру или вводит конвенции.
5. После завершения — переводить issue в `In Review`, открывать PR.
