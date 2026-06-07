# Tauri fs commands

**Статус:** Завершена
**Завершена:** 2026-06-07
**Linear:** MDP-7
**Уровень риска:** high
**Создана:** 2026-06-07

## Цель

Реализовать Tauri-команды для файловых операций с тонкой TypeScript-обёрткой,
чтобы frontend мог открывать/читать/сохранять файлы и список папок через
user-driven диалоги.

## Критерии приёмки

1. `src-tauri/src/fs_commands.rs` экспортирует команды:
   - `read_file(path: String) -> Result<String, String>` — UTF-8 текст
   - `write_file(path: String, contents: String) -> Result<(), String>` — UTF-8, создаёт parent dirs
   - `list_dir(path: String) -> Result<Vec<DirEntry>, String>`
   - `pick_open_file(app, default_dir) -> Result<Option<String>, String>` — диалог Open
   - `pick_save_file(app, default_name) -> Result<Option<String>, String>` — диалог Save As
   - `pick_folder(app, default_dir) -> Result<Option<String>, String>` — диалог Open Folder
2. `DirEntry { name: String, path: String, is_dir: bool, size: u64 }` с `#[derive(serde::Serialize)]`.
3. Все команды зарегистрированы в `src-tauri/src/lib.rs` через `invoke_handler!`.
4. Никаких `unwrap()` / `expect()` / `panic!()` в production-пути. (Исключение: `lib.rs:run()` уже использует `.expect()` — pre-existing, scope MDP-40, не трогаем.)
5. `src/lib/fs.ts` экспортирует TS-обёртку: `DirEntry`, `readFile`, `writeFile`, `listDir`, `pickOpenFile`, `pickSaveFile`, `pickFolder`. JS naming: `isDir` (Rust snake_case → camelCase маппинг в `listDir` руками).
6. Юнит-тесты в `src-tauri/src/fs_commands.rs`:
   - read/write round-trip с tmp-файлом (`std::env::temp_dir()`, без `tempfile` crate)
   - read несуществующего файла → Err
   - list_dir пустой папки → Ok с пустым Vec
   - list_dir несуществующей папки → Err

## Негативные сценарии

- read несуществующего файла → Err.
- write в защищённую директорию → Err.
- pick\_\*\_file/folder отмена пользователем → Ok(None), не Err.
- read non-UTF-8 файла → Err с понятным сообщением, без panic.
- list_dir на file (не папке) → Err.

## Область изменений

**Менять:**

- `src-tauri/src/fs_commands.rs` (NEW)
- `src-tauri/src/lib.rs` (mod fs_commands + invoke_handler)
- `src/lib/fs.ts` (NEW)
- `tasks/MDP-7.md` (NEW)

**НЕ трогать:**

- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json` (сужение ACL = MDP-39)
- `src-tauri/Cargo.toml`
- `package.json` / lock-файлы
- frontend компоненты (Svelte)

---

## Свидетельства верификации

**AC1 — команды.** `src-tauri/src/fs_commands.rs` содержит все 6 команд с указанными
сигнатурами. Sync команды (`read_file`, `write_file`, `list_dir`) используют `std::fs`;
async команды диалогов (`pick_open_file`, `pick_save_file`, `pick_folder`) принимают
`AppHandle<R>` и `default_dir`/`default_name`, возвращают `Result<Option<String>, String>`.

**AC2 — DirEntry struct.** `pub struct DirEntry { pub name: String, pub path: String, pub is_dir: bool, pub size: u64 }` с `#[derive(Debug, Serialize)]`. Сериализация в snake_case (mapping в camelCase делается в TS-обёртке).

**AC3 — регистрация в lib.rs.** `src-tauri/src/lib.rs` содержит `mod fs_commands;` и обновлённый `invoke_handler!`:

```
ping, fs_commands::read_file, fs_commands::write_file, fs_commands::list_dir,
fs_commands::pick_open_file, fs_commands::pick_save_file, fs_commands::pick_folder
```

**AC4 — без unwrap/expect/panic.** Внутри `fs_commands.rs` все ошибки пробрасываются через `?` + `.map_err(|e| format!(...))`. Production-код использует только `.into_owned()`, `String::from_utf8`, `fs::*` — ни одного `unwrap`/`expect`/`panic!`. Внутри `#[cfg(test)]` модуля используется `.expect("…")` для assertion-семантики — это допустимо в тестах. `lib.rs:run()` сохранил pre-existing `.expect()` (MDP-40, явно вне scope).

**AC5 — TS wrapper.** `src/lib/fs.ts` экспортирует `DirEntry` (с `isDir`), `readFile`, `writeFile`, `listDir`, `pickOpenFile`, `pickSaveFile`, `pickFolder`. `listDir` руками маппит `is_dir → isDir` через приватный `RustDirEntry`. Все диалоговые функции передают `null` вместо `undefined` (Tauri ожидает явный `null` для `Option::None`).

**AC6 — тесты.**

`cd src-tauri && cargo test --lib` → **9 passed, 0 failed**:

```
test fs_commands::tests::list_dir_missing_errors ... ok
test fs_commands::tests::read_missing_file_errors ... ok
test fs_commands::tests::list_dir_on_file_errors ... ok
test fs_commands::tests::list_dir_empty_returns_ok ... ok
test fs_commands::tests::read_non_utf8_errors ... ok
test fs_commands::tests::write_to_existing_directory_errors ... ok
test fs_commands::tests::list_dir_with_entries ... ok
test fs_commands::tests::read_write_roundtrip ... ok
test fs_commands::tests::write_creates_parent_dirs ... ok
```

Покрытие из AC6 + дополнительно: запись с созданием parent dirs, list_dir с реальными файлами, read non-UTF-8, list_dir на файле (не папке), **write на путь существующей директории → Err** (добавлен в раунде 2 SENAR по находке [4]).

**Clippy.** `cd src-tauri && cargo clippy -- -D warnings` → **clean, 0 warnings**.

**Lint.** `npm run lint` → `All matched files use Prettier code style!` (ESLint + Prettier clean).

**Build.** `npm run build` → `built in 912ms`, `dist/assets/index-DCV9TgxF.css 26.67 kB / gzip 6.09 kB`, `dist/assets/index-C7D9dTLc.js 53.90 kB / gzip 20.54 kB`. Размер JS-бандла не вырос (TS-обёртка занимает <1 КБ; tree-shaking возможно выкинул неиспользуемые функции, т.к. `fs.ts` пока ни в одном компоненте не импортируется).

**Frontend tests (Vitest).** Первоначально `npm run test` в worktree падал с
`Failed to load url .../node_modules/@testing-library/svelte/src/vitest.js` —
junction-mode для `node_modules/` ломает Vite-резолвер `svelteTesting` плагина на Windows.
**Решено супервайзером**: удалили junction, запустили реальный `npm install` в worktree
(деление с npm cache main-репо делает это дёшево). После этого `npm run test` →
**4 test files / 23 passed (23)** за 2.14s. Этот воркэраунд зафиксирован для всех M2-worktree.

## Тупики

- **Async-команды и dialog plugin.** Плагин `tauri-plugin-dialog` предоставляет два API: callback-вариант (`pick_file(|fp| { ... })`) и блокирующий (`blocking_pick_file()`). Блокирующий API явно запрещён на главном потоке (panic'ит). В async tauri-команде нужно мостить callback в `Future`. Решено через `std::sync::mpsc::sync_channel(1)` + `tauri::async_runtime::spawn_blocking` для ожидания `rx.recv()` (см. `await_dialog` helper). Без добавления `tokio::sync::oneshot` (правило 4: не добавляем зависимости без согласования) и без `unwrap` на send/recv.
- **`npm run test` в worktree.** Изначально не запускался из-за junction-резолюции `@testing-library/svelte` плагина в Vite. Воркэраунд — реальный `npm install` в worktree (см. "Решения"); после этого 23/23 проходят.

## Решения

- **`DirEntry` поля в snake_case, маппинг в camelCase делается в TS.** Альтернатива (`#[serde(rename = "isDir")]`) была бы короче в TS, но навязывала бы camelCase в Rust-сериализации (например, для будущих Rust-тестов сериализации). Идиоматичный Rust + явный mapping в одном месте TS — чище.
- **Без `tempfile` crate.** Промпт MDP-7 явно запретил добавлять зависимость; использую `std::env::temp_dir()` + nanos+counter для уникальности имени. На Windows это `%TEMP%`, директория существует с момента старта ОС.
- **Generic `Runtime` параметр в async-командах.** `pick_open_file<R: Runtime>(app: AppHandle<R>, ...)` принимает любой `Runtime` (включая mock-runtime для будущих интеграционных тестов). Tauri-макрос `#[tauri::command]` корректно обрабатывает generic-параметр.
- **`Path::new(&path).is_dir()` для проверки в `list_dir`.** Альтернатива (`fs::read_dir` сразу + ловить error) различает "не существует" и "не директория" хуже. Явная проверка `is_dir()` даёт нужный текст ошибки для негативного сценария (list_dir на файле).
- **Дополнительные тесты сверх AC6.** Добавил `write_creates_parent_dirs`, `list_dir_with_entries`, `read_non_utf8_errors`, `list_dir_on_file_errors` — покрывают негативные сценарии из промпта, не указанные явно в AC6.

- **Junction для `node_modules` в worktree → реальный `npm install`.** Изначально супервайзер прелинковал `node_modules` worktree'ев junction'ами на main-репо для экономии диска. На MDP-7 vitest ломался при попытке зарезолвить `@testing-library/svelte/src/vitest.js` через junction. Воркэраунд: `rm -rf node_modules && npm install` в worktree (npm-cache main-репо делает install почти бесплатным). После этого 23/23 теста проходят. Junction в дальнейшем не используется — будем делать реальный `npm install` на каждый worktree при следующих M2-задачах.

## SENAR-ревью

**Раунд 1 (high level): FAIL** — 5 находок (Pass 10 / Fail 5 / N/A 3).
Резолюция (вариант "гибрид" одобрен супервайзером):

- **[4] Нет теста на write в защищённую директорию** → **исправлено**. Добавлен `write_to_existing_directory_errors`: write_file на путь, где существует директория, возвращает Err. Cross-platform (Windows + Unix). Это стандарт для "write в недоступный таргет" — реальные permission-denied пути (`C:\Windows\System32\…`) нестабильны в CI.

- **[16] `pick_folder` зарегистрирован, но в capabilities нет явного `dialog:allow-open-folder`** → **разъяснено, без изменений в ACL**. Tauri 2 dialog plugin реализует folder-picker через ту же команду `open` (с флагом `directory: true`), что и file-picker. Существующее разрешение `dialog:allow-open` де-факто покрывает оба сценария. В plugin manifest нет отдельного `allow-open-folder`. Документировано здесь, чтобы будущие ревьюеры не повторяли finding.

- **[6][13][14] Path validation на Rust-стороне** → **delegated to [MDP-39](https://linear.app/mpegeev/issue/MDP-39)** (расширена scope MDP-39). Команды `read_file`/`write_file`/`list_dir` принимают `path: String` от frontend без normalize/canonicalize. Defense сейчас — единственный слой ACL `fs:scope`. MDP-39 (изначально сужение `$HOME/**`) расширена, чтобы покрыть и Rust-side валидацию:
  - canonicalize пути перед file-op
  - явная проверка на абсолютность
  - reject путей с `..` после нормализации

  Решение обосновано: (а) Tauri 2 dialog plugin сам канонизирует пути; (б) MDP-7 не используется ни одним фронтендом до MDP-9, поэтому attack surface ограничен; (в) defense-in-depth логично делать одновременно с ACL-сужением (одна задача = один слой защиты + контекст). MDP-7 без этих фиксов — высокий риск только при XSS в WebView, что отдельная задача безопасности (CSP уже включён в `tauri.conf.json`).

**Раунд 2 (после фиксов):** ожидается, что [4] и [16] закрыты; [6][13][14] остаются как осознанные deferrals с follow-up на MDP-39.

## Известные проблемы

- **Path validation на Rust-стороне отсутствует.** Перенесено в [MDP-39](https://linear.app/mpegeev/issue/MDP-39) (см. SENAR-резолюцию).
- **Dialog-команды без интеграционных тестов.** Запуск GUI-диалога в unit-тестах невозможен (требует webview + main-thread). Реальная проверка — мануальная (через `npm run tauri dev`) или e2e в MDP-32.
- **ACL `$HOME/**` не сужен.\*\* Поведение по умолчанию, явный follow-up [MDP-39](https://linear.app/mpegeev/issue/MDP-39).
- **TS-обёртка не покрыта тестами.** Mock'ать `invoke` имеет смысл только при подключении к компоненту-потребителю. Сейчас `fs.ts` ни в одном компоненте не используется — тесты на mock-вызовы были бы тестами реализации (правило 4 SENAR).
