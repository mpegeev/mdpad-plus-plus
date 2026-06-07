// Набор каталогов и файлов, которые пользователь явно выбрал через системный
// диалог, и которым поэтому разрешён доступ сверх базовых корней (MDP-44).
//
// Зачем: MDP-39 ограничивает файловые операции корнями $APPDATA + $DOCUMENT.
// Чтобы пользователь мог открыть произвольную папку или файл через системный
// диалог (MDP-9), выбранный путь добавляется в этот набор. Набор сохраняется
// в JSON-файле под $APPDATA и переживает перезапуск — иначе восстановление
// последнего открытого каталога (MDP-9) перестало бы работать.
//
// Безопасность (как в MDP-39): путь попадает в набор ТОЛЬКО при выборе через
// системный диалог (явное согласие пользователя). Команды, позволяющей
// странице задать произвольный путь, нет — иначе проверка на стороне Rust
// была бы бессмысленной.
//
// Источник истины — файл на диске. `load_granted_roots` читает его и приводит
// записи к каноническому виду (отбрасывая удалённые и нечитаемые),
// `grant_root` добавляет запись и сохраняет файл. Функции не зависят от
// AppHandle (принимают путь к файлу), поэтому тестируются напрямую.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Версия формата файла. При несовпадении набор считается пустым — это
/// сознательный сброс: после смены формата пользователь заново разрешит доступ
/// через диалог (это лишь кэш разрешений, не важные данные).
const GRANTS_VERSION: u32 = 1;

/// Имя файла с набором под $APPDATA.
pub const GRANTS_FILE_NAME: &str = "granted_roots.json";

#[derive(Debug, Default, Serialize, Deserialize)]
struct PersistedGrants {
    v: u32,
    roots: Vec<String>,
}

/// Читает набор разрешённых путей из JSON-файла.
///
/// При недоступности или повреждении файла, либо неподходящей версии формата
/// возвращает пустой набор (без паники) — доступ закрыт по умолчанию.
/// Возвращаются только пути, которые сейчас существуют и приводятся к
/// каноническому виду, без повторов: записи об удалённых каталогах
/// отбрасываются, чтобы не ломать `validate_path_within` (она приводит к
/// каноническому виду каждый корень и иначе вернула бы ошибку для всего набора).
pub fn load_granted_roots(file: &Path) -> Vec<PathBuf> {
    let raw = match fs::read_to_string(file) {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };
    let parsed: PersistedGrants = match serde_json::from_str(&raw) {
        Ok(p) => p,
        Err(_) => return Vec::new(),
    };
    if parsed.v != GRANTS_VERSION {
        return Vec::new();
    }
    let mut out: Vec<PathBuf> = Vec::new();
    for s in parsed.roots {
        if let Ok(canon) = Path::new(&s).canonicalize() {
            if !out.contains(&canon) {
                out.push(canon);
            }
        }
    }
    out
}

/// Добавляет `path` в набор и сохраняет файл.
///
/// `path` приводится к каноническому виду (должен существовать — для диалога
/// сохранения вызывающий передаёт родительский каталог, а не ещё не созданный
/// файл). Повторы отбрасываются. Возвращает ошибку при сбое приведения пути или
/// записи; вызывающий решает, насколько это критично (для диалогов — нет: выбор
/// уже сделан).
///
/// Чтение, изменение и запись файла не синхронизированы между процессами:
/// предполагается, что разрешения приходят из системных диалогов, которые
/// модальны и не выполняются одновременно. Для текущего сценария этого хватает.
pub fn grant_root(file: &Path, path: &Path) -> Result<(), String> {
    let canon = path
        .canonicalize()
        .map_err(|e| format!("grant_root: canonicalize {}: {e}", path.display()))?;
    let mut roots = load_granted_roots(file);
    if roots.contains(&canon) {
        // Уже в наборе — перезапись не нужна.
        return Ok(());
    }
    roots.push(canon);
    save_granted_roots(file, &roots)
}

/// Записывает набор в JSON-файл, создавая родительские каталоги при необходимости.
fn save_granted_roots(file: &Path, roots: &[PathBuf]) -> Result<(), String> {
    if let Some(parent) = file.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("save_granted_roots: create {}: {e}", parent.display()))?;
        }
    }
    let payload = PersistedGrants {
        v: GRANTS_VERSION,
        roots: roots
            .iter()
            .map(|p| p.to_string_lossy().into_owned())
            .collect(),
    };
    let json = serde_json::to_string_pretty(&payload)
        .map_err(|e| format!("save_granted_roots: serialize: {e}"))?;
    fs::write(file, json).map_err(|e| format!("save_granted_roots: write {}: {e}", file.display()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    /// Уникальная временная директория для теста.
    fn tmp_dir(prefix: &str) -> PathBuf {
        static COUNTER: AtomicU64 = AtomicU64::new(0);
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let mut p = std::env::temp_dir();
        p.push(format!("mdpad_mdp44_{prefix}_{nanos}_{n}"));
        fs::create_dir_all(&p).expect("mkdir tmp dir");
        p
    }

    #[test]
    fn load_missing_file_is_empty() {
        let dir = tmp_dir("missing");
        let file = dir.join(GRANTS_FILE_NAME);
        assert!(load_granted_roots(&file).is_empty());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn grant_then_load_round_trip() {
        let dir = tmp_dir("roundtrip");
        let file = dir.join(GRANTS_FILE_NAME);
        let granted = tmp_dir("granted_target");

        grant_root(&file, &granted).expect("grant");

        // Повторная загрузка (как после перезапуска) возвращает канонический путь.
        let loaded = load_granted_roots(&file);
        let canon = granted.canonicalize().expect("canon granted");
        assert!(
            loaded.contains(&canon),
            "loaded {loaded:?} missing {canon:?}"
        );

        let _ = fs::remove_dir_all(&dir);
        let _ = fs::remove_dir_all(&granted);
    }

    #[test]
    fn grant_is_deduplicated() {
        let dir = tmp_dir("dedup");
        let file = dir.join(GRANTS_FILE_NAME);
        let granted = tmp_dir("dedup_target");

        grant_root(&file, &granted).expect("grant 1");
        grant_root(&file, &granted).expect("grant 2 (same)");

        let canon = granted.canonicalize().expect("canon");
        let count = load_granted_roots(&file)
            .iter()
            .filter(|p| **p == canon)
            .count();
        assert_eq!(count, 1, "expected single dedup entry");

        let _ = fs::remove_dir_all(&dir);
        let _ = fs::remove_dir_all(&granted);
    }

    #[test]
    fn corrupt_json_is_empty_no_panic() {
        let dir = tmp_dir("corrupt");
        let file = dir.join(GRANTS_FILE_NAME);
        fs::write(&file, "{ this is not valid json ][").expect("seed corrupt");
        assert!(load_granted_roots(&file).is_empty());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn wrong_version_is_empty() {
        let dir = tmp_dir("version");
        let file = dir.join(GRANTS_FILE_NAME);
        let granted = tmp_dir("version_target");
        let canon = granted.canonicalize().expect("canon");
        // Корректный JSON, но другая версия формата.
        let body = format!(
            "{{\"v\":999,\"roots\":[{:?}]}}",
            canon.to_string_lossy().into_owned()
        );
        fs::write(&file, body).expect("seed");
        assert!(load_granted_roots(&file).is_empty());
        let _ = fs::remove_dir_all(&dir);
        let _ = fs::remove_dir_all(&granted);
    }

    #[test]
    fn vanished_root_is_dropped_on_load() {
        let dir = tmp_dir("vanish");
        let file = dir.join(GRANTS_FILE_NAME);
        let granted = tmp_dir("vanish_target");

        grant_root(&file, &granted).expect("grant");
        // Разрешённый каталог удалён/перемещён — при загрузке отбрасывается.
        fs::remove_dir_all(&granted).expect("remove granted");

        assert!(
            load_granted_roots(&file).is_empty(),
            "vanished root must be dropped"
        );
        let _ = fs::remove_dir_all(&dir);
    }
}
