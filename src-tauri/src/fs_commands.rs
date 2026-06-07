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
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Runtime};
use tauri_plugin_dialog::{DialogExt, FilePath};

/// Запись о файле или директории внутри `list_dir`.
#[derive(Debug, Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

/// Прочитать UTF-8 текстовый файл.
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("read_file: {path}: {e}"))?;
    String::from_utf8(bytes).map_err(|e| format!("read_file: {path}: invalid UTF-8: {e}"))
}

/// Записать UTF-8 содержимое в файл, создавая parent-директории при необходимости.
#[tauri::command]
pub fn write_file(path: String, contents: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    if let Some(parent) = path_buf.parent() {
        // Пропускаем пустой parent (например, относительный путь без директории).
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("write_file: create parent {}: {e}", parent.display()))?;
        }
    }
    fs::write(&path_buf, contents.as_bytes()).map_err(|e| format!("write_file: {path}: {e}"))
}

/// Получить содержимое директории.
#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let dir = Path::new(&path);
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

    /// Генерирует уникальный путь во временной директории. `tempfile` не используем
    /// (правило 4: не добавляем зависимости без согласования).
    fn tmp_path(prefix: &str) -> PathBuf {
        static COUNTER: AtomicU64 = AtomicU64::new(0);
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let mut p = std::env::temp_dir();
        p.push(format!("mdpad_mdp7_{prefix}_{nanos}_{n}"));
        p
    }

    #[test]
    fn read_write_roundtrip() {
        let p = tmp_path("rw");
        let path = p.to_string_lossy().into_owned();
        let content = "Привет, мир!\nLine 2\n";

        write_file(path.clone(), content.to_string()).expect("write");
        let got = read_file(path.clone()).expect("read");
        assert_eq!(got, content);

        let _ = fs::remove_file(&p);
    }

    #[test]
    fn write_creates_parent_dirs() {
        let root = tmp_path("nested");
        let mut nested = root.clone();
        nested.push("a");
        nested.push("b");
        nested.push("c.txt");
        let path = nested.to_string_lossy().into_owned();

        write_file(path.clone(), "hi".to_string()).expect("write nested");
        let got = read_file(path).expect("read nested");
        assert_eq!(got, "hi");

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn read_missing_file_errors() {
        let p = tmp_path("missing");
        let path = p.to_string_lossy().into_owned();
        let err = read_file(path).expect_err("missing file must error");
        assert!(err.starts_with("read_file:"), "got: {err}");
    }

    #[test]
    fn read_non_utf8_errors() {
        let p = tmp_path("non_utf8");
        // 0xFF — невалидный UTF-8 байт.
        fs::write(&p, [0xFFu8, 0xFE, 0xFD]).expect("seed bytes");
        let path = p.to_string_lossy().into_owned();
        let err = read_file(path).expect_err("non-utf8 must error");
        assert!(err.contains("invalid UTF-8"), "got: {err}");
        let _ = fs::remove_file(&p);
    }

    #[test]
    fn list_dir_empty_returns_ok() {
        let p = tmp_path("empty_dir");
        fs::create_dir_all(&p).expect("mkdir");
        let path = p.to_string_lossy().into_owned();
        let entries = list_dir(path).expect("list empty");
        assert!(entries.is_empty(), "expected empty Vec, got {entries:?}");
        let _ = fs::remove_dir_all(&p);
    }

    #[test]
    fn list_dir_with_entries() {
        let root = tmp_path("with_entries");
        fs::create_dir_all(&root).expect("mkdir root");
        let mut file = root.clone();
        file.push("note.md");
        fs::write(&file, "hello").expect("seed file");
        let mut sub = root.clone();
        sub.push("sub");
        fs::create_dir_all(&sub).expect("mkdir sub");

        let path = root.to_string_lossy().into_owned();
        let entries = list_dir(path).expect("list");
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
        let p = tmp_path("missing_dir");
        let path = p.to_string_lossy().into_owned();
        let err = list_dir(path).expect_err("missing dir must error");
        assert!(err.starts_with("list_dir:"), "got: {err}");
    }

    #[test]
    fn write_to_existing_directory_errors() {
        // AC negative scenario: write_file targeting a path that is an existing
        // directory must error (cross-platform: std::fs::write fails because
        // it tries to open the dir as a regular file). This stands in for
        // "write to a protected location" — actual permission-denied paths
        // (e.g. C:\Windows\System32) are unreliable across CI environments.
        let p = tmp_path("write_to_dir");
        fs::create_dir_all(&p).expect("mkdir dir");
        let path = p.to_string_lossy().into_owned();
        let err = write_file(path, "should fail".to_string())
            .expect_err("writing over a directory must error");
        assert!(err.starts_with("write_file:"), "got: {err}");
        let _ = fs::remove_dir_all(&p);
    }

    #[test]
    fn list_dir_on_file_errors() {
        let p = tmp_path("file_not_dir");
        fs::write(&p, "not a dir").expect("seed file");
        let path = p.to_string_lossy().into_owned();
        let err = list_dir(path).expect_err("file must not list as dir");
        assert!(err.contains("not a directory"), "got: {err}");
        let _ = fs::remove_file(&p);
    }
}
