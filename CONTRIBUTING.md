# Contributing to mdpad++

## Workflow

1. Берёшь issue из Linear (проект **mdpad++**, префикс `MDP`).
2. Создаёшь ветку: `feat/MDP-123-short-slug` (или `fix/`, `chore/`, `docs/`).
3. Реализуешь фичу, пишешь тесты.
4. Прогоняешь линтеры локально.
5. Коммитишь по Conventional Commits: `feat(editor): add F2 toggle for raw mode`.
6. Пушишь, открываешь PR с упоминанием `Closes MDP-123` в описании.
7. Дожидаешься зелёного CI (jobs `frontend`, `backend`, `build-info` —
   все три должны быть зелёными, иначе merge button заблокирован
   branch protection rules на `main`).
8. Получаешь approve в code review.
9. Сквош-мержишь PR в `main` (squash-merge — один коммит на issue).
10. После мержа Linear автоматически переводит issue в Done и
    прикрепляет ссылку на смерженный PR.

Один PR = один issue. Не смешиваем фичи в одной ветке.

### Где упоминать `Closes MDP-XXX`

Linear ловит ключевые слова `Closes`, `Fixes`, `Resolves` (case-insensitive)
как в **описании PR**, так и в **сообщении коммита**. Достаточно одного
из мест. Префикс `MDP-` обязателен — без него Linear не свяжет.

Если случайно сослался на несуществующий ID (`MDP-9999`), Linear молча
проигнорирует — PR не сломается. PR без MDP-номера тоже валиден,
просто не будет автоматической связи с issue.

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

В этом проекте Claude Code — основной разработчик. Полные правила работы
(методология SENAR, шлюзы, политика безопасности, конвенции стека) живут
в [`CLAUDE.md`](./CLAUDE.md) и [`docs/senar.md`](./docs/senar.md) — это
единственные источники истины, не дублируем их здесь. Главное правило
для PR: **один PR = один issue**.

Ключевые slash-команды:

- `/new-task <имя>` — шлюз "Старт": формулировка задачи перед кодом.
- `/done <имя>` — шлюз "Готово": сбор свидетельств и SENAR-ревью.
- `/rca <описание>` — root cause analysis для дефекта.
