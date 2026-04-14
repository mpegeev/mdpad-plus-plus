# Set up GitHub Actions CI (lint, test, build)

**Статус:** Завершена
**Linear:** MDP-3
**Уровень риска:** standard
**Создана:** 2026-04-13
**Завершена:** 2026-04-14

## Цель

Настроить CI, чтобы каждый PR автоматически проверялся на lint, тесты и сборку.

## Критерии приёмки

1. PR в `main` запускает GitHub Actions workflow с тремя jobs: frontend (lint + check + test), backend (fmt + clippy + test), build info
2. Кэш npm и cargo настроен — повторный прогон быстрее первого (проверить по логам)
3. PR с ошибкой линтера блокируется (merge button неактивен при красных checks)
4. PR с проходящими проверками показывает зелёные checks
5. В README добавлен бейдж CI-статуса

## Негативные сценарии

- PR с намеренной ошибкой `cargo clippy` — workflow должен завершиться красным, merge заблокирован
- Workflow на пустом PR (только README edit) — не должен падать из-за отсутствия изменений в Rust/TS

## Область изменений

**Менять:**

- `.github/workflows/ci.yml`
- `README.md` (бейдж)
- `src/lib/smoke.test.ts` (новый — заглушка-тест, чтобы `npm run test` возвращал 0)

**Расширение области (внесено при закрытии):**
Первоначально `src/` был в запрете. Ревьюер обнаружил, что в CI шаг
`npm run test` был заменён на `npx vitest run --passWithNoTests` —
это обход сигнала ошибки (правило 4 SENAR). Правильный путь —
вернуть `npm run test` и добавить smoke-тест. Супервайзер расширил
область, разрешив добавить один тест-файл под `src/lib/`.

**НЕ трогать:**

- `src/App.svelte`, `src/main.ts`, `src/lib/ui/`, `src/styles/`
- `src-tauri/src/`
- `package.json`
- `Cargo.toml`
- `CLAUDE.md`

## Дополнительные ограничения

Нет.

---

## Свидетельства верификации

**Критерий 1 — три jobs (frontend, backend, build-info):**
`git diff main...HEAD .github/workflows/ci.yml` показывает добавление
`build-info` job после `frontend` и `backend`. Зависимость
`needs: [frontend, backend]` гарантирует последовательность.

**Критерий 2 — кэш npm и cargo:**

- npm кэш: `actions/setup-node@v4` с `cache: npm` (ci.yml:16, 53)
- cargo кэш: `Swatinem/rust-cache@v2` с `workspaces: src-tauri` (ci.yml:36–38)
  Проверка cache hit на повторных прогонах — делается супервайзером
  в GitHub Actions UI (локально недоступно).

**Критерий 3 — блокировка PR с красным линтером:**
Требует включения Branch Protection Rules на main в GitHub Settings
(указано в теле PR как manual step). Локально не проверяемо.

**Критерий 4 — зелёные checks на проходящем PR:**
Проверяется в GitHub Actions UI после пуша PR. Локальные эквиваленты:

- `npm run lint` → clean
- `npm run test` → 1 passed (smoke)
- `npm run build` → vite build OK (113 modules, 1.91s)

**Критерий 5 — бейдж в README:**
`git diff main...HEAD README.md` показывает добавление строки с
`[![CI](...actions/workflows/ci.yml/badge.svg)](...)` после заголовка.

## Тупики

Нет.

## Решения

**1. Пин `ubuntu-22.04` вместо `ubuntu-latest`.**
GitHub периодически обновляет latest-образ, что ломает Tauri system deps.
Явный пин делает CI детерминированным до явного апгрейда.

**2. `libjavascriptcoregtk-4.1-dev` добавлен в apt-install.**
Требуется для Tauri 2 на Ubuntu 22.04+, иначе `cargo build` падает
при линковке webkit2gtk-4.1.

**3. `build-info` как отдельный job, а не шаг.**
Запускается после `frontend` и `backend` — отражает, что релиз-артефакт
зависит от двух проверок. Сейчас делает только `vite build` + echo
версий; в будущем (MDP-4+) сюда можно добавить полную Tauri-матрицу.

**4. Smoke-тест `src/lib/smoke.test.ts` вместо `--passWithNoTests`.**
Первая реализация использовала `npx vitest run --passWithNoTests` —
это обход сигнала. Ревьюер справедливо указал (правила 2, 4, 9 SENAR),
что это подмена поведения скрипта `npm run test`. Правильный путь —
добавить настоящий (пусть и тривиальный) тест, чтобы скрипт возвращал
0 на основании реального прохождения. Область задачи расширена
супервайзером для добавления одного файла под `src/lib/`.

## Известные проблемы

**1. Smoke-тест не из критериев приёмки задачи (SENAR review FAIL[4]).**
`src/lib/smoke.test.ts` проверяет `1 + 1 === 2` — это не поведенческий
тест из критериев MDP-3 (критерии касаются CI-workflow, не юнит-кода).
Это инфраструктурная заглушка этапа Bootstrap: продуктового кода для
тестирования пока нет. Принято как компромисс. Удалить после того,
как первый поведенческий тест продукта появится в MDP-4+.

**2. Критерии 2, 3, 4 не верифицируются локально.**
Требуют GitHub Actions UI и Branch Protection Rules. Свидетельства
по ним супервайзер собирает в UI после пуша PR.
