# Linear ↔ GitHub integration + contribution docs

**Статус:** В работе
**Linear:** MDP-5
**Уровень риска:** standard
**Создана:** 2026-04-16

## Цель

Подключить Linear к GitHub и задокументировать workflow для людей и для Claude Code.

## Критерии приёмки

1. В Linear (Settings → Integrations → GitHub) подключён репозиторий `mdpad-plus-plus`. Свидетельство — подтверждение супервайзера в Linear UI.
2. PR этой задачи с текстом `Closes MDP-5` в описании автоматически связывается с issue MDP-5 в Linear. Свидетельство — связанный PR виден в Linear UI на странице MDP-5.
3. `.github/PULL_REQUEST_TEMPLATE.md` содержит чеклист с полем для Linear-ссылки (`Closes MDP-XXX`).
4. `CONTRIBUTING.md` явно описывает шаги: (a) выбор issue в Linear → (b) ветка `feat/MDP-XXX-slug` → (c) Conventional Commits → (d) PR с `Closes MDP-XXX` → (e) прохождение CI → (f) ревью → (g) merge.
5. Раздел "Работа с Claude Code" в `CONTRIBUTING.md` содержит: ссылки на `CLAUDE.md`, `docs/senar.md`, перечень slash-команд (`/new-task`, `/done`, `/rca`), и правило "один PR = один issue".

## Негативные сценарии

- PR без упоминания MDP-номера — не ломается, просто не линкуется (никаких ошибок CI/integration).
- Упоминание несуществующего MDP-9999 — Linear молча игнорирует, PR не блокируется.
- Ссылка `Closes MDP-XXX` в коммит-сообщении (а не только в PR description) — тоже должна линковаться; проверяется и документируется в `CONTRIBUTING.md`.

## Область изменений

**Менять:**

- `.github/PULL_REQUEST_TEMPLATE.md` (новый)
- `CONTRIBUTING.md` (новый)

**НЕ трогать:**

- `src/`
- `src-tauri/`
- `CLAUDE.md`
- `DESIGN.md`
- конфиги сборки (`package.json`, `Cargo.toml`, `tauri.conf.json`, lock-файлы)
- `README.md` (область как в Linear; ссылку на CONTRIBUTING — отдельной задачей при необходимости)
- `.github/workflows/` (CI — не предмет задачи)

## Дополнительные ограничения

- Не добавлять зависимостей.
- Не создавать GitHub Issue templates (issues живут в Linear).
- Конфигурация интеграции выполняется супервайзером в Linear UI; задача в коде ограничена docs + PR-шаблоном.
- PR этой задачи сам служит "тестовым PR" для критерия 2 (один PR закрывает задачу и одновременно валидирует интеграцию).

---

## Свидетельства верификации

<заполняется при закрытии задачи через /done>

## Тупики

<заполняется при закрытии задачи>

## Решения

<заполняется при закрытии задачи>

## Известные проблемы

<заполняется при закрытии задачи>
