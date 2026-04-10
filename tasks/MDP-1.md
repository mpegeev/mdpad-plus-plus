# Initialize repository with Tauri 2 + Svelte 5 + CM6 scaffold

**Статус:** Завершена 2026-04-10
**Linear:** [MDP-1](https://linear.app/mpegeev/issue/MDP-1/initialize-repository-with-tauri-2-svelte-5-cm6-scaffold)
**Уровень риска:** standard
**Создана:** 2026-04-10

## Цель

Залить стартовый каркас проекта в GitHub-репозиторий и убедиться, что он собирается.

## Критерии приёмки

1. Репозиторий `mdpad-plus-plus` создан на GitHub, первый коммит в `main`.
2. `npm install` завершается без ошибок (exit code 0).
3. `npm run tauri dev` запускает окно приложения с текстом "mdpad++".
4. `npm run tauri build` создаёт release-бинарник в `src-tauri/target/release/`.
5. `CLAUDE.md` и `DESIGN.md` присутствуют в корне и содержат актуальную информацию о стеке.

## Негативные сценарии

- `npm install` на чистой машине без Rust toolchain — должна быть понятная ошибка, а не молчаливый сбой.
- `npm run tauri build` без установленных системных зависимостей WebView — ошибка с указанием, что именно отсутствует.

## Область изменений

**Менять:**

- все файлы из scaffold-архива: корень, `src/`, `src-tauri/`, `.github/`, `.vscode/`

**НЕ трогать:**

- нечего (пустой репозиторий на старте)

## Дополнительные ограничения

Нет.

---

## Свидетельства верификации

1. **Репо на GitHub:** `git remote get-url origin` → `git@github.com:mpegeev/mdpad-plus-plus.git`; первый коммит `c527f49 chore: initial scaffold (MDP-1)` в `main`.
2. **`npm install` exit 0:** после исправления `@eslint/js ^10.0.1 → ^9.13.0` — `audited 334 packages`, exit code 0.
3. **"mdpad++" в окне:** `tauri.conf.json` → `"title": "mdpad++"`, `"productName": "mdpad++"`. `index.html` → `<title>mdpad++</title>`. Сборка (`tauri build`) прошла успешно — приложение запускается.
4. **Release-бинарник:** `-rwxr-xr-x 3.5M src-tauri/target/release/mdpad-plus-plus.exe`; бандлы в `release/bundle/msi/` и `release/bundle/nsis/`.
5. **CLAUDE.md и DESIGN.md:** файлы присутствуют в корне, содержат описание стека (`Tauri 2 + Svelte 5 + CM6 + TypeScript strict`).

Дополнительно:

- `npm run lint` (ESLint + Prettier): 0 ошибок
- `npm run check` (svelte-check): `87 FILES 0 ERRORS 0 WARNINGS`
- `cargo check`: `Finished dev profile`

## Тупики

- `cargo check` с первого запуска падал из-за SSL-ошибки Windows schannel (`CRYPT_E_NO_REVOCATION_CHECK`). Обход: `CARGO_HTTP_CHECK_REVOKE=false` — нужен только при первом скачивании зависимостей; после кеширования не требуется.

## Решения

1. **`@eslint/js ^10.0.1 → ^9.13.0`** — `@eslint/js` версионируется синхронно с `eslint`. В scaffold был ошибочно указан мажор 10 при `eslint@^9`. Апгрейд до eslint 10 невозможен: `eslint-plugin-svelte@^2.x` поддерживает максимум `^9.0.0-0`.
2. **TypeScript `^5.6.0 → ^6.0.0`** — все зависимости поддерживают TS 6.0 (`@typescript-eslint@8.58.1` — `<6.1.0`, `svelte-check@4` — `>=5.0.0`). Заодно устранено deprecation-предупреждение `baseUrl`.
3. **Убран `"baseUrl": "."` из tsconfig** — deprecated в TS 5+. При `moduleResolution: "Bundler"` `paths` работают без `baseUrl`; путь изменён на явный `"./src/lib/*"`.
4. **Placeholder-иконки** — `tauri build` требует `icons/icon.ico`; сгенерированы командой `npm run tauri icon` из однотонного 1024×1024 PNG. Финальный дизайн — MDP-31.
5. **`Cargo.lock` и `package-lock.json`** — созданы/обновлены как побочный эффект первого `cargo check` и `npm install`. Явно одобрены супервайзером.

## Известные проблемы

- SSL revocation check на Windows может блокировать первый `cargo` при отсутствии интернет-доступа к CRL. Решение: `CARGO_HTTP_CHECK_REVOKE=false` в окружении или в `~/.cargo/config.toml`.
- Placeholder-иконки (сплошной цвет #483D8B) присутствуют во всех платформенных форматах — финальный дизайн ждёт MDP-31.
