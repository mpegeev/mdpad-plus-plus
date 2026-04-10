# Configure ESLint, Prettier, EditorConfig, .gitignore

**Статус:** Завершена
**Linear:** MDP-2
**Уровень риска:** standard
**Создана:** 2026-04-10
**Завершена:** 2026-04-11

## Цель

Настроить линтеры и форматтеры, чтобы стиль кода был единым с первого коммита.

## Критерии приёмки

1. `npm run lint` проверяет TS и Svelte файлы и завершается без ошибок на текущем коде
2. `npm run format` форматирует все файлы и не вносит изменений при повторном вызове (идемпотентность)
3. `cargo fmt --check` в `src-tauri/` завершается без ошибок
4. `cargo clippy -- -D warnings` в `src-tauri/` завершается без ошибок
5. `.editorconfig` задаёт LF, UTF-8, 2 spaces для JS/TS/Svelte, 4 spaces для Rust
6. `.gitignore` исключает `node_modules/`, `dist/`, `src-tauri/target/`, IDE-файлы

## Негативные сценарии

- Файл с намеренной ошибкой стиля (например, missing semicolon, wrong indent) — `npm run lint` должен завершиться с ненулевым exit code и указать файл/строку
- `cargo clippy` на коде с `unwrap()` — должен выдать warning (на текущем уровне) или ошибку

## Область изменений

**Менять:**

- `package.json` (scripts, devDependencies)
- `eslint.config.js`
- `.prettierrc`
- `.editorconfig`
- `.gitignore`

**НЕ трогать:**

- `src/`
- `src-tauri/src/`
- `CLAUDE.md`
- `DESIGN.md`
- `tauri.conf.json`

## Дополнительные ограничения

Не добавлять зависимости без согласования.

---

## Свидетельства верификации

1. `npm run lint` → exit 0, `All matched files use Prettier code style!`
2. `npm run format` (2 запуска) → все файлы `unchanged`, exit 0
3. `cargo fmt --check` → exit 0, нет вывода
4. `cargo clippy -- -D warnings` → `Finished dev profile`, exit 0
5. `.editorconfig` — содержит `charset=utf-8`, `end_of_line=lf`, `indent_size=2` по умолчанию, `indent_size=4` для `*.{rs,toml}`
6. `.gitignore` — исключает `node_modules`, `dist`, `src-tauri/target`, `.vscode/*`, `.idea`, `.DS_Store`

- Негативный сценарий: `_lint_test.ts` без точки с запятой → exit 1, `warn _lint_test.ts: Code style issues found`

## Тупики

нет

## Решения

- Не добавляли `parserOptions.project` в `eslint.config.js` — включение без type-aware правил несёт только замедление lint без пользы; добавить при первом реальном использовании.

## Известные проблемы

нет
