// Файловые команды Tauri для MDP-7.
//
// Команды (вызываются из frontend через `invoke`):
// - `read_file` / `write_file` / `list_dir` — синхронный std::fs, обёрнутый в
//   Result<_, String> для сериализации ошибок в JS.
// - `pick_open_file` / `pick_save_file` / `pick_folder` — диалоги Tauri.
//   Используем неблокирующий callback-вариант плагина dialog с пересылкой
//   результата через `std::sync::mpsc::sync_channel(1)`, recv обёрнут в
//   `tauri::async_runtime::spawn_blocking`, чтобы не блокировать рантайм.
//
// Naming convention: Rust struct поля в snake_case, в TS-обёртке (`src/lib/fs.ts`)
// поле `is_dir` приводится к `isDir` вручную (см. AC#5). Это выбрано вместо
// `#[serde(rename = "isDir")]` чтобы Rust-сторона оставалась идиоматичной и
// тесты сериализации в Rust не зависели от camelCase.

use std::fs;
use std::path::{Component, Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_dialog::{DialogExt, FilePath};

/// Запись о файле или директории внутри `list_dir`.
#[derive(Debug, Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

// --- Валидация путей (MDP-39: defense-in-depth) ---------------------------
//
// Стратегия (ACL + Rust-side, см. docs/architecture.md):
//  1. ACL Tauri (`fs:scope`) ограничивает корни на уровне плагина fs.
//  2. Rust-side `validate_path_within` — вторая линия обороны для наших
//     собственных std::fs команд (read_file/write_file/list_dir), которые
//     ACL плагина fs не покрывает.
//
// Все ошибки — строкой, fail-closed: при любой неоднозначности возвращаем Err
// без выполнения syscall чтения/записи.

/// Проверяет путь относительно списка разрешённых корней и возвращает его
/// канонический вид.
///
/// Сигнатура стабильна и используется в property-based тестах (MDP-42).
///
/// Контракт:
/// - `path` — сырой путь от клиента; `allowed_roots` — список разрешённых
///   корней (НЕ обязаны быть канонизированными — функция канонизирует их сама).
/// - Reject (Err, без syscall чтения/записи целевого файла), если `path`
///   содержит компонент `..` (`Component::ParentDir`).
/// - Для существующего пути: канонизируется сам путь.
/// - Для несуществующего пути (кейс write_file): канонизируется ближайший
///   существующий предок, оставшиеся компоненты присоединяются к нему.
/// - Возвращает Ok(canonical) только если канонический путь лежит внутри
///   одного из (канонизированных) разрешённых корней; иначе Err.
/// - Пустой `allowed_roots` => всегда Err (пустая конфигурация падает).
pub fn validate_path_within(path: &str, allowed_roots: &[PathBuf]) -> Result<PathBuf, String> {
    if path.is_empty() {
        return Err("validate_path: empty path".to_string());
    }
    if allowed_roots.is_empty() {
        return Err("validate_path: no allowed roots configured".to_string());
    }

    let raw = Path::new(path);

    // 1. Паранойя/defense-in-depth: reject `..` ДО любого syscall.
    if raw.components().any(|c| matches!(c, Component::ParentDir)) {
        return Err(format!(
            "validate_path: {path}: parent-dir '..' not allowed"
        ));
    }

    // Канонизируем разрешённые корни (резолвим symlink, нормализуем регистр/разделители).
    let mut roots: Vec<PathBuf> = Vec::with_capacity(allowed_roots.len());
    for root in allowed_roots {
        let canon = root
            .canonicalize()
            .map_err(|e| format!("validate_path: allowed root {}: {e}", root.display()))?;
        roots.push(canon);
    }

    // 2. Канонизируем целевой путь.
    //    - Существующий путь: канонизируем целиком.
    //    - Несуществующий (write_file): канонизируем ближайшего существующего
    //      предка и присоединяем хвост из оставшихся компонентов.
    let canonical = canonicalize_existing_or_ancestor(raw)?;

    // 3. Проверяем, что итог внутри одного из разрешённых корней.
    if roots.iter().any(|root| canonical.starts_with(root)) {
        Ok(canonical)
    } else {
        Err(format!("validate_path: {path}: outside of allowed scope"))
    }
}

/// Канонизирует путь, если он существует; иначе — канонизирует ближайшего
/// существующего предка и присоединяет к нему хвост (имена несуществующих
/// компонентов). Гарантирует отсутствие `..` у вызывающего (проверено выше).
fn canonicalize_existing_or_ancestor(raw: &Path) -> Result<PathBuf, String> {
    match raw.canonicalize() {
        Ok(c) => Ok(c),
        // Только "не найдено" => это кейс write_file (создаём новый файл): строим
        // путь от существующего предка. Любая другая IO-ошибка (permission denied,
        // path too long, symlink-loop и т.п.) — fail-closed, не маскируем под
        // "не существует".
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(format!(
            "validate_path: {}: canonicalize: {e}",
            raw.display()
        )),
        Err(_) => {
            // Поднимаемся вверх до первого существующего предка.
            let mut ancestor = raw.parent();
            let mut tail: Vec<&std::ffi::OsStr> = Vec::new();
            if let Some(name) = raw.file_name() {
                tail.push(name);
            }
            loop {
                match ancestor {
                    None => {
                        return Err(format!(
                            "validate_path: {}: no existing ancestor",
                            raw.display()
                        ));
                    }
                    Some(a) => {
                        if let Ok(canon_ancestor) = a.canonicalize() {
                            let mut result = canon_ancestor;
                            for part in tail.iter().rev() {
                                result.push(part);
                            }
                            return Ok(result);
                        }
                        if let Some(name) = a.file_name() {
                            tail.push(name);
                        }
                        ancestor = a.parent();
                    }
                }
            }
        }
    }
}

/// Резолвит разрешённые корни ($APPDATA и $DOCUMENT) через Tauri path API.
/// Несуществующий $APPDATA создаётся (app_data_dir — наш собственный каталог).
fn allowed_roots<R: Runtime>(app: &AppHandle<R>) -> Result<Vec<PathBuf>, String> {
    let mut roots: Vec<PathBuf> = Vec::new();
    let resolver = app.path();

    match resolver.app_data_dir() {
        Ok(dir) => {
            // app_data_dir может ещё не существовать при первом запуске —
            // создаём, чтобы canonicalize корня прошёл (fail-closed иначе).
            if !dir.exists() {
                fs::create_dir_all(&dir).map_err(|e| {
                    format!("allowed_roots: create app_data_dir {}: {e}", dir.display())
                })?;
            }
            roots.push(dir);
        }
        Err(e) => return Err(format!("allowed_roots: app_data_dir: {e}")),
    }

    // $DOCUMENT может отсутствовать в headless/CI-окружении — это не фатально,
    // просто Documents не будет среди разрешённых корней.
    if let Ok(dir) = resolver.document_dir() {
        if dir.exists() {
            roots.push(dir);
        }
    }

    if roots.is_empty() {
        return Err("allowed_roots: no resolvable allowed roots".to_string());
    }
    Ok(roots)
}

/// Прочитать UTF-8 текстовый файл.
#[tauri::command]
pub fn read_file<R: Runtime>(app: AppHandle<R>, path: String) -> Result<String, String> {
    let roots = allowed_roots(&app)?;
    read_file_in(&path, &roots)
}

/// Записать UTF-8 содержимое в файл, создавая parent-директории при необходимости.
#[tauri::command]
pub fn write_file<R: Runtime>(
    app: AppHandle<R>,
    path: String,
    contents: String,
) -> Result<(), String> {
    let roots = allowed_roots(&app)?;
    write_file_in(&path, &contents, &roots)
}

/// Получить содержимое директории.
#[tauri::command]
pub fn list_dir<R: Runtime>(app: AppHandle<R>, path: String) -> Result<Vec<DirEntry>, String> {
    let roots = allowed_roots(&app)?;
    list_dir_in(&path, &roots)
}

/// Реализация read_file с явным списком разрешённых корней (тестируемая без AppHandle).
fn read_file_in(path: &str, allowed_roots: &[PathBuf]) -> Result<String, String> {
    let validated = validate_path_within(path, allowed_roots)?;
    let bytes = fs::read(&validated).map_err(|e| format!("read_file: {path}: {e}"))?;
    String::from_utf8(bytes).map_err(|e| format!("read_file: {path}: invalid UTF-8: {e}"))
}

/// Реализация write_file с явным списком разрешённых корней (тестируемая без AppHandle).
fn write_file_in(path: &str, contents: &str, allowed_roots: &[PathBuf]) -> Result<(), String> {
    let validated = validate_path_within(path, allowed_roots)?;
    if let Some(parent) = validated.parent() {
        // Пропускаем пустой parent (например, относительный путь без директории).
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("write_file: create parent {}: {e}", parent.display()))?;
        }
    }
    fs::write(&validated, contents.as_bytes()).map_err(|e| format!("write_file: {path}: {e}"))
}

/// Реализация list_dir с явным списком разрешённых корней (тестируемая без AppHandle).
fn list_dir_in(path: &str, allowed_roots: &[PathBuf]) -> Result<Vec<DirEntry>, String> {
    let validated = validate_path_within(path, allowed_roots)?;
    let dir = validated.as_path();
    if !dir.is_dir() {
        return Err(format!("list_dir: {path}: not a directory"));
    }
    let read = fs::read_dir(dir).map_err(|e| format!("list_dir: {path}: {e}"))?;
    let mut entries: Vec<DirEntry> = Vec::new();
    for entry in read {
        let entry = entry.map_err(|e| format!("list_dir: {path}: entry error: {e}"))?;
        let entry_path = entry.path();
        let metadata = entry
            .metadata()
            .map_err(|e| format!("list_dir: {}: metadata: {e}", entry_path.display()))?;
        let name = entry.file_name().to_string_lossy().into_owned();
        let path_str = entry_path.to_string_lossy().into_owned();
        entries.push(DirEntry {
            name,
            path: path_str,
            is_dir: metadata.is_dir(),
            size: if metadata.is_file() {
                metadata.len()
            } else {
                0
            },
        });
    }
    Ok(entries)
}

/// Превращает результат диалога Tauri в `Option<String>`-путь.
/// Отмена пользователем -> Ok(None); проблемы конвертации -> Err.
fn file_path_to_string(file_path: Option<FilePath>) -> Result<Option<String>, String> {
    match file_path {
        None => Ok(None),
        Some(fp) => {
            let pb = fp
                .into_path()
                .map_err(|e| format!("dialog: invalid path: {e}"))?;
            Ok(Some(pb.to_string_lossy().into_owned()))
        }
    }
}

/// Универсальный мост между callback-вариантом плагина dialog и async-командой:
/// канал на 1 элемент, recv в `spawn_blocking`, чтобы не блокировать tauri-runtime.
async fn await_dialog<F>(start: F) -> Result<Option<FilePath>, String>
where
    F: FnOnce(Box<dyn FnOnce(Option<FilePath>) + Send + 'static>) + Send + 'static,
{
    let (tx, rx) = std::sync::mpsc::sync_channel::<Option<FilePath>>(1);
    start(Box::new(move |fp| {
        // Receiver всегда жив (мы его дождёмся), но если канал закрыт — игнорим.
        let _ = tx.send(fp);
    }));
    tauri::async_runtime::spawn_blocking(move || rx.recv())
        .await
        .map_err(|e| format!("dialog: join error: {e}"))?
        .map_err(|e| format!("dialog: recv error: {e}"))
}

/// Открыть диалог выбора файла (single).
#[tauri::command]
pub async fn pick_open_file<R: Runtime>(
    app: AppHandle<R>,
    default_dir: Option<String>,
) -> Result<Option<String>, String> {
    let mut builder = app.dialog().file();
    if let Some(dir) = default_dir.as_deref() {
        builder = builder.set_directory(dir);
    }
    let fp = await_dialog(move |cb| builder.pick_file(cb)).await?;
    file_path_to_string(fp)
}

/// Открыть диалог сохранения файла (Save As).
#[tauri::command]
pub async fn pick_save_file<R: Runtime>(
    app: AppHandle<R>,
    default_name: String,
) -> Result<Option<String>, String> {
    let builder = app.dialog().file().set_file_name(default_name);
    let fp = await_dialog(move |cb| builder.save_file(cb)).await?;
    file_path_to_string(fp)
}

/// Открыть диалог выбора папки.
#[tauri::command]
pub async fn pick_folder<R: Runtime>(
    app: AppHandle<R>,
    default_dir: Option<String>,
) -> Result<Option<String>, String> {
    let mut builder = app.dialog().file();
    if let Some(dir) = default_dir.as_deref() {
        builder = builder.set_directory(dir);
    }
    let fp = await_dialog(move |cb| builder.pick_folder(cb)).await?;
    file_path_to_string(fp)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    /// Создаёт уникальную временную директорию-«разрешённый корень» и возвращает
    /// её. Внутри неё конструируем тестовые файлы. `tempfile` не используем
    /// (правило 4: не добавляем зависимости без согласования).
    ///
    /// Корень канонизируется заранее не нужно — `validate_path_within` сам
    /// канонизирует переданные allowed_roots.
    fn tmp_root(prefix: &str) -> PathBuf {
        static COUNTER: AtomicU64 = AtomicU64::new(0);
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let mut p = std::env::temp_dir();
        p.push(format!("mdpad_mdp39_{prefix}_{nanos}_{n}"));
        fs::create_dir_all(&p).expect("mkdir tmp root");
        p
    }

    // --- file-ops внутри разрешённого корня (адаптация под новую сигнатуру) ---

    #[test]
    fn read_write_roundtrip() {
        let root = tmp_root("rw");
        let roots = [root.clone()];
        let mut p = root.clone();
        p.push("note.md");
        let path = p.to_string_lossy().into_owned();
        let content = "Привет, мир!\nLine 2\n";

        write_file_in(&path, content, &roots).expect("write");
        let got = read_file_in(&path, &roots).expect("read");
        assert_eq!(got, content);

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn write_creates_parent_dirs() {
        let root = tmp_root("nested");
        let roots = [root.clone()];
        let mut nested = root.clone();
        nested.push("a");
        nested.push("b");
        nested.push("c.txt");
        let path = nested.to_string_lossy().into_owned();

        write_file_in(&path, "hi", &roots).expect("write nested");
        let got = read_file_in(&path, &roots).expect("read nested");
        assert_eq!(got, "hi");

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn read_missing_file_errors() {
        let root = tmp_root("missing");
        let roots = [root.clone()];
        let mut p = root.clone();
        p.push("nope.md");
        let path = p.to_string_lossy().into_owned();
        // Несуществующий файл внутри разрешённого корня -> validate Err
        // (canonicalize не находит файл, но предок существует -> путь валиден,
        // затем read_file даёт read_file: ошибку). Принимаем любой Err.
        let err = read_file_in(&path, &roots).expect_err("missing file must error");
        assert!(
            err.contains("read_file:") || err.contains("validate_path:"),
            "got: {err}"
        );
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn read_non_utf8_errors() {
        let root = tmp_root("non_utf8");
        let roots = [root.clone()];
        let mut p = root.clone();
        p.push("bin.dat");
        // 0xFF — невалидный UTF-8 байт.
        fs::write(&p, [0xFFu8, 0xFE, 0xFD]).expect("seed bytes");
        let path = p.to_string_lossy().into_owned();
        let err = read_file_in(&path, &roots).expect_err("non-utf8 must error");
        assert!(err.contains("invalid UTF-8"), "got: {err}");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn list_dir_empty_returns_ok() {
        let root = tmp_root("empty_dir");
        let roots = [root.clone()];
        let mut p = root.clone();
        p.push("empty");
        fs::create_dir_all(&p).expect("mkdir");
        let path = p.to_string_lossy().into_owned();
        let entries = list_dir_in(&path, &roots).expect("list empty");
        assert!(entries.is_empty(), "expected empty Vec, got {entries:?}");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn list_dir_with_entries() {
        let root = tmp_root("with_entries");
        let roots = [root.clone()];
        let mut file = root.clone();
        file.push("note.md");
        fs::write(&file, "hello").expect("seed file");
        let mut sub = root.clone();
        sub.push("sub");
        fs::create_dir_all(&sub).expect("mkdir sub");

        let path = root.to_string_lossy().into_owned();
        let entries = list_dir_in(&path, &roots).expect("list");
        assert_eq!(entries.len(), 2);
        let file_entry = entries
            .iter()
            .find(|e| e.name == "note.md")
            .expect("file entry");
        assert!(!file_entry.is_dir);
        assert_eq!(file_entry.size, 5);
        let dir_entry = entries.iter().find(|e| e.name == "sub").expect("dir entry");
        assert!(dir_entry.is_dir);

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn list_dir_missing_errors() {
        let root = tmp_root("missing_dir");
        let roots = [root.clone()];
        let mut p = root.clone();
        p.push("nope");
        let path = p.to_string_lossy().into_owned();
        let err = list_dir_in(&path, &roots).expect_err("missing dir must error");
        assert!(
            err.contains("list_dir:") || err.contains("validate_path:"),
            "got: {err}"
        );
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn write_to_existing_directory_errors() {
        // AC negative scenario: write_file targeting a path that is an existing
        // directory must error (cross-platform: std::fs::write fails because
        // it tries to open the dir as a regular file).
        let root = tmp_root("write_to_dir");
        let roots = [root.clone()];
        let mut p = root.clone();
        p.push("adir");
        fs::create_dir_all(&p).expect("mkdir dir");
        let path = p.to_string_lossy().into_owned();
        let err = write_file_in(&path, "should fail", &roots)
            .expect_err("writing over a directory must error");
        assert!(err.starts_with("write_file:"), "got: {err}");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn list_dir_on_file_errors() {
        let root = tmp_root("file_not_dir");
        let roots = [root.clone()];
        let mut p = root.clone();
        p.push("afile");
        fs::write(&p, "not a dir").expect("seed file");
        let path = p.to_string_lossy().into_owned();
        let err = list_dir_in(&path, &roots).expect_err("file must not list as dir");
        assert!(err.contains("not a directory"), "got: {err}");
        let _ = fs::remove_dir_all(&root);
    }

    // --- AC MDP-39: валидация путей ---

    /// AC: путь с `..` -> Err ДО syscall (файл не читается, даже если существует).
    #[test]
    fn parent_dir_component_rejected_before_syscall() {
        let root = tmp_root("dotdot");
        let roots = [root.clone()];

        // Создаём реально существующий файл, к которому пытаемся пробиться через `..`.
        let mut secret = root.clone();
        secret.push("secret.txt");
        fs::write(&secret, "TOP SECRET").expect("seed secret");

        // Путь: <root>/sub/../secret.txt — указывает на тот же secret.txt,
        // но содержит компонент `..`, поэтому должен быть отклонён.
        let mut sub = root.clone();
        sub.push("sub");
        fs::create_dir_all(&sub).expect("mkdir sub");
        let mut traversal = sub.clone();
        traversal.push("..");
        traversal.push("secret.txt");
        let path = traversal.to_string_lossy().into_owned();

        // validate_path_within: Err с сообщением про `..`.
        let v_err = validate_path_within(&path, &roots).expect_err("dotdot must be rejected");
        assert!(v_err.contains("'..'"), "got: {v_err}");

        // read_file_in тоже отказывает и НЕ возвращает содержимое файла.
        let r = read_file_in(&path, &roots);
        assert!(r.is_err(), "read via .. must fail, got Ok");
        if let Err(e) = r {
            assert!(!e.contains("TOP SECRET"), "secret content leaked: {e}");
            assert!(e.contains("'..'"), "expected dotdot rejection, got: {e}");
        }

        let _ = fs::remove_dir_all(&root);
    }

    /// AC: путь за пределами разрешённого scope -> Err.
    #[test]
    fn path_outside_scope_rejected() {
        let allowed = tmp_root("scope_allowed");
        let outside = tmp_root("scope_outside");
        let roots = [allowed.clone()];

        // Реальный файл вне разрешённого корня.
        let mut target = outside.clone();
        target.push("other.txt");
        fs::write(&target, "outside data").expect("seed outside");
        let path = target.to_string_lossy().into_owned();

        let v_err = validate_path_within(&path, &roots).expect_err("outside scope must error");
        assert!(v_err.contains("outside of allowed scope"), "got: {v_err}");

        let r = read_file_in(&path, &roots);
        assert!(r.is_err(), "read outside scope must fail");

        let _ = fs::remove_dir_all(&allowed);
        let _ = fs::remove_dir_all(&outside);
    }

    /// AC (traversal): `..`, выводящий НАРУЖУ из разрешённого корня, отклоняется
    /// компонентной проверкой ДО syscall — даже если файл-цель реально существует.
    #[test]
    fn parent_dir_escaping_root_rejected_before_syscall() {
        let allowed = tmp_root("escape_allowed");
        fs::create_dir_all(&allowed).expect("mkdir allowed");
        let roots = [allowed.clone()];

        // Реальный секрет вне корня, рядом с allowed (общий родитель = temp_dir).
        let outside = tmp_root("escape_outside");
        fs::create_dir_all(&outside).expect("mkdir outside");
        let mut secret = outside.clone();
        secret.push("passwd");
        fs::write(&secret, "ROOT SECRET").expect("seed secret");

        // Путь вида <allowed>/../escape_outside_*/passwd — выходит за корень.
        let outside_name = outside
            .file_name()
            .expect("outside file_name")
            .to_string_lossy()
            .into_owned();
        let mut traversal = allowed.clone();
        traversal.push("..");
        traversal.push(&outside_name);
        traversal.push("passwd");
        let path = traversal.to_string_lossy().into_owned();

        let v_err = validate_path_within(&path, &roots).expect_err("escaping .. must be rejected");
        assert!(v_err.contains("'..'"), "got: {v_err}");

        let r = read_file_in(&path, &roots);
        assert!(r.is_err(), "read via escaping .. must fail, got Ok");
        if let Err(e) = r {
            assert!(!e.contains("ROOT SECRET"), "secret content leaked: {e}");
        }

        let _ = fs::remove_dir_all(&allowed);
        let _ = fs::remove_dir_all(&outside);
    }

    /// AC: валидный путь внутри scope -> Ok.
    #[test]
    fn valid_path_within_scope_ok() {
        let root = tmp_root("scope_ok");
        let roots = [root.clone()];

        let mut target = root.clone();
        target.push("note.md");
        fs::write(&target, "ok").expect("seed");
        let path = target.to_string_lossy().into_owned();

        let canonical = validate_path_within(&path, &roots).expect("valid path must be Ok");
        // Канонический путь должен лежать внутри (канонизированного) корня.
        let canon_root = root.canonicalize().expect("canon root");
        assert!(
            canonical.starts_with(&canon_root),
            "canonical {canonical:?} not under {canon_root:?}"
        );

        let _ = fs::remove_dir_all(&root);
    }

    /// Несуществующий файл под разрешённым корнем валиден (кейс write_file:
    /// канонизируем существующего предка, имя присоединяем).
    #[test]
    fn nonexistent_file_under_root_is_valid() {
        let root = tmp_root("new_file");
        let roots = [root.clone()];
        let mut target = root.clone();
        target.push("subdir");
        target.push("brand_new.md");
        let path = target.to_string_lossy().into_owned();

        // validate проходит (предок-корень существует), write создаёт subdir.
        write_file_in(&path, "hello", &roots).expect("write new file under root");
        let got = read_file_in(&path, &roots).expect("read it back");
        assert_eq!(got, "hello");

        let _ = fs::remove_dir_all(&root);
    }

    /// Пустой список разрешённых корней -> Err (пустая конфигурация падает).
    #[test]
    fn empty_allowed_roots_rejected() {
        let err = validate_path_within("anything", &[]).expect_err("empty roots must error");
        assert!(err.contains("no allowed roots"), "got: {err}");
    }
}

// Property-based тесты (MDP-42). Дочерний модуль `fs_commands`, поэтому имеет
// доступ к приватным хелперам (read_file_in/list_dir_in/write_file_in).
// `#[path]` нужен, т.к. файл лежит рядом (src/fs_commands_proptest.rs), а не в
// подкаталоге src/fs_commands/ (правило путей модулей Rust).
#[cfg(test)]
#[path = "fs_commands_proptest.rs"]
mod proptest_tests;
