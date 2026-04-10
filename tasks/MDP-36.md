# MDP-36: Integrate SENAR methodology into mdpad++

**Статус:** Завершена
**Завершена:** 2026-04-10
**Linear:** MDP-36
**Уровень риска:** standard
**Создана:** 2026-04-10

## Цель

Интегрировать методологию SENAR в проект: обновлённый CLAUDE.md, subagent-ревьюер, slash-команды.

## Критерии приёмки

1. `CLAUDE.md` заменён на компактную версию (< 200 строк), содержит правила SENAR + проектный контекст.
2. `.claude/` создана с полной структурой: subagent-ревьюер (`senar-reviewer`), slash-команды (`/new-task`, `/done`, `/rca`).
3. `docs/senar.md` и `docs/architecture.md` существуют.
4. `tasks/README.md` описывает соглашение по зеркалу задач.

## Негативные сценарии

- Claude Code не видит slash-команды после коммита — проверить, что `.claude/` в корне репозитория и frontmatter валиден (пробел после `---`).
- `senar-reviewer` не находится как subagent — проверить, что поле `name:` в frontmatter совпадает с вызовом.

## Область изменений

**Менять:**

- `CLAUDE.md`
- `.claude/` (вся структура)
- `docs/senar.md`
- `docs/architecture.md`
- `tasks/README.md`

**НЕ трогать:**

- `DESIGN.md`
- `src/`, `src-tauri/`
- `package.json`, `Cargo.toml`
- `.github/`

## Дополнительные ограничения

Не добавлять зависимости. Документация только на русском языке (кроме имён файлов и кода).

---

## Свидетельства верификации

1. **CLAUDE.md < 200 строк, содержит SENAR + контекст** — 175 строк (`wc -l CLAUDE.md`), 13 SENAR-заголовков (`grep -c`).
2. **.claude/ с senar-reviewer, /new-task, /done, /rca** — все файлы присутствуют (`find .claude -type f`); `name: senar-reviewer` подтверждён в frontmatter.
3. **docs/senar.md и docs/architecture.md существуют** — по 107 строк каждый.
4. **tasks/README.md описывает соглашение** — 35 строк, 7 ссылок на Linear/зеркало/команды.

## Тупики

нет

## Решения

- `lucide-svelte` был ошибочно указан в senar-reviewer.md как источник иконок. Пакет несовместим с Svelte 5 `runes: true`. В проекте используется `Icon.svelte` + `icons.ts` (inline SVG). Исправлено при прохождении шлюза "Готово".
- Команды `npm run format`, `npm run test:e2e`, `cargo fmt`, `cargo test` и раздел "Известные TODO" были утеряны при замене CLAUDE.md. Восстановлены из git-истории (коммит c300ff1) при прохождении шлюза "Готово".

## Известные проблемы

нет
