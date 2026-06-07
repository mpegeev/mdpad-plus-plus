// Runtime-scope: реестр разрешённых корней, выбранных пользователем через
// нативный диалог (MDP-44).
//
// Зачем: MDP-39 ограничивает file-ops корнями $APPDATA + $DOCUMENT. Чтобы
// пользователь мог открыть произвольную папку/файл через системный диалог
// (MDP-9), путь явно выбранного через диалог ресурса добавляется в этот
// набор. Набор персистится в JSON под $APPDATA, чтобы переживать рестарт
// (иначе восстановление «последнего каталога» из MDP-9 ломалось бы).
//
// Модель безопасности (наследует MDP-39): грант возможен ТОЛЬКО как следствие
// нативного dialog-pick (явное согласие). Нет команды, позволяющей frontend
// грантить произвольный путь — иначе серверная валидация была бы бессмысленна.
//
// Источник истины — файл на диске. `load_granted_roots` читает и канонизирует
// записи (отбрасывая исчезнувшие/битые), `grant_root` дописывает и сохраняет.
// Все функции чистые относительно переданного пути к файлу => тестируемы без
// AppHandle.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Версия формата persisted-файла. Несовпадение => считаем набор пустым.
const GRANTS_VERSION: u32 = 1;

/// Имя файла реестра под $APPDATA.
pub const GRANTS_FILE_NAME: &str = "granted_roots.json";

#[derive(Debug, Default, Serialize, Deserialize)]
struct PersistedGrants {
    v: u32,
    roots: Vec<String>,
}

/// Загружает granted-корни из JSON-файла.
///
/// Fail-closed: отсутствующий или битый файл, неподходящая версия => пустой
/// набор (без паники). Возвращаются только КАНОНИЗИРУЕМЫЕ (существующие) пути,
/// дедуплицированные — исчезнувшие к моменту загрузки записи отбрасываются,
/// чтобы они не ломали `validate_path_within` (который канонизирует каждый
/// корень и иначе вернул бы Err для всего набора).
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

/// Добавляет `path` в granted-набор файла и персистит.
///
/// `path` канонизируется (должен существовать — для save-диалога вызывающий
/// передаёт родительскую директорию, а не ещё не созданный файл). Дедуп по
/// каноническому виду. Возвращает Err при canonicalize/IO-ошибке; вызывающий
/// решает, фатально ли это (для pick_* — нет: сам выбор уже состоялся).
pub fn grant_root(file: &Path, path: &Path) -> Result<(), String> {
    let canon = path
        .canonicalize()
        .map_err(|e| format!("grant_root: canonicalize {}: {e}", path.display()))?;
    let mut roots = load_granted_roots(file);
    if roots.contains(&canon) {
        // Уже разрешён — персист не требуется.
        return Ok(());
    }
    roots.push(canon);
    save_granted_roots(file, &roots)
}

/// Сериализует набор в JSON и пишет в файл, создавая parent-директории.
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

        // Свежая загрузка (имитируем рестарт) возвращает канонический granted-путь.
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
        // Гранёный каталог исчезает (удалён/перемещён) — при загрузке отбрасывается.
        fs::remove_dir_all(&granted).expect("remove granted");

        assert!(
            load_granted_roots(&file).is_empty(),
            "vanished root must be dropped"
        );
        let _ = fs::remove_dir_all(&dir);
    }
}
