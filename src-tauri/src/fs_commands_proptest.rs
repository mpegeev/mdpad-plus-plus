// Property-based тесты для валидации путей (MDP-42).
//
// Это дочерний модуль `fs_commands` (подключён `#[cfg(test)] mod proptest_tests;`
// из fs_commands.rs), поэтому через `super::*` доступны приватные хелперы
// команд (read_file_in / list_dir_in / write_file_in) и публичная
// `validate_path_within`.
//
// Инварианты, которые проверяем (см. AC MDP-42):
//   Свойство 1 — soundness: для ЛЮБОГО пути результат validate_path_within →
//     либо Err, либо канонический путь начинается с (канонизированного) корня.
//     Ничего «снаружи» scope не может вернуться как Ok.
//   Свойство 2 — `..` всегда Err: путь с компонентом ParentDir reject'ится
//     ДО syscall, независимо от остального содержимого.
//   Свойство 3 — symlink наружу: ссылка из scope, указывающая ВНЕ scope,
//     отклоняется через canonicalize (резолв реальной цели). На Windows
//     создание symlink требует привилегий — при неудаче тест SKIP'ается
//     (return Ok рано), а не падает.
//   Свойство 4 — команды read/list вне scope → Err ДО syscall чтения.
//
// Все свойства закрепляют cases = 1000 прямо в коде
// (`ProptestConfig::with_cases(1000)`), чтобы CI всегда прогонял ровно столько,
// не полагаясь на env PROPTEST_CASES.

use super::*;
use proptest::prelude::*;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

/// Создаёт уникальную временную директорию и возвращает её путь.
/// Зеркалит `tmp_root` из unit-тестов; держим отдельно, чтобы модуль был
/// самодостаточным. `tempfile` не добавляем (правило 4 SENAR).
fn tmp_root(prefix: &str) -> PathBuf {
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    let mut p = std::env::temp_dir();
    p.push(format!("mdpad_mdp42_{prefix}_{nanos}_{n}"));
    fs::create_dir_all(&p).expect("mkdir tmp root");
    p
}

/// Стратегия «относительный хвост из безопасных сегментов» (без `..`).
/// Символы намеренно ограничены, чтобы не наткнуться на запрещённые на
/// Windows символы пути (`:` `*` `?` `<` `>` `|` `"`), которые сделали бы
/// тест шумным по платформозависимым причинам, а не по сути инварианта.
fn safe_tail() -> impl Strategy<Value = String> {
    "[a-zA-Z0-9._/-]{1,200}"
}

/// Стратегия пути, который ГАРАНТИРОВАННО содержит компонент `..`.
/// Собираем как `<pre>/../<post>`, где pre/post — безопасные сегменты,
/// чтобы `..` был отдельным компонентом пути, а не подстрокой имени.
fn path_with_dotdot() -> impl Strategy<Value = String> {
    ("[a-zA-Z0-9._-]{1,40}", "[a-zA-Z0-9._/-]{1,80}")
        .prop_map(|(pre, post)| format!("{pre}/../{post}"))
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]

    /// Свойство 1 (soundness): для любого случайного пути результат
    /// validate_path_within — либо Err, либо канонический путь лежит внутри
    /// канонизированного разрешённого корня. Сравниваем с КАНОНИЗИРОВАННЫМ
    /// корнем (canonicalize может менять префикс: \\?\ на Windows, /var→
    /// /private/var на macOS).
    #[test]
    fn prop_ok_implies_within_canonical_root(tail in safe_tail()) {
        let root = tmp_root("p1_root");
        let canon_root = root.canonicalize().expect("canon root");
        let roots = [root.clone()];

        // Кандидат — присоединяем случайный хвост к корню.
        let candidate = format!("{}/{}", root.display(), tail);

        let result = validate_path_within(&candidate, &roots);

        let outcome: Result<(), TestCaseError> = match result {
            Err(_) => Ok(()),
            Ok(canonical) => {
                prop_assert!(
                    canonical.starts_with(&canon_root),
                    "Ok canonical {canonical:?} is OUTSIDE canonical root {canon_root:?} \
                     (input tail: {tail:?})"
                );
                Ok(())
            }
        };

        let _ = fs::remove_dir_all(&root);
        outcome?;
    }

    /// Свойство 1b: путь под ДРУГИМ (не разрешённым) корнем никогда не Ok.
    /// Усиливает soundness для случая, когда хвост уводит наружу.
    #[test]
    fn prop_outside_root_never_ok(tail in safe_tail()) {
        let allowed = tmp_root("p1b_allowed");
        let outside = tmp_root("p1b_outside");
        let roots = [allowed.clone()];

        let candidate = format!("{}/{}", outside.display(), tail);
        let result = validate_path_within(&candidate, &roots);

        let outcome: Result<(), TestCaseError> = if let Ok(canonical) = result {
            // Единственно допустимый Ok — если хвост сам по себе пуст/совпал
            // с корнем; но safe_tail непустой, так что под `outside` Ok быть
            // не должно. Жёстко требуем: Ok недопустим.
            Err(TestCaseError::fail(format!(
                "path under non-allowed root returned Ok: {canonical:?} (tail {tail:?})"
            )))
        } else {
            Ok(())
        };

        let _ = fs::remove_dir_all(&allowed);
        let _ = fs::remove_dir_all(&outside);
        outcome?;
    }

    /// Свойство 2: путь с компонентом `..` ВСЕГДА Err — независимо от того,
    /// существует ли цель и куда она указывает. Reject до любого syscall цели.
    #[test]
    fn prop_dotdot_always_err(dotdot in path_with_dotdot(), absolute in any::<bool>()) {
        let root = tmp_root("p2_root");
        let roots = [root.clone()];

        // Проверяем и относительный, и абсолютный (под корнем) варианты.
        let candidate = if absolute {
            format!("{}/{}", root.display(), dotdot)
        } else {
            dotdot.clone()
        };

        let result = validate_path_within(&candidate, &roots);
        let outcome: Result<(), TestCaseError> = match result {
            Err(e) => {
                prop_assert!(
                    e.contains("'..'"),
                    "dotdot path rejected but for wrong reason: {e:?}"
                );
                Ok(())
            }
            Ok(c) => Err(TestCaseError::fail(format!(
                "path with '..' was accepted: {candidate:?} -> {c:?}"
            ))),
        };

        let _ = fs::remove_dir_all(&root);
        outcome?;
    }

    /// Свойство 4: команды чтения/листинга на путях ВНЕ scope всегда Err и
    /// НЕ доходят до syscall чтения (валидация отсекает раньше).
    ///
    /// Берём два класса заведомо-невалидных путей:
    ///  - под другим (не разрешённым) корнем — реально существующий файл;
    ///  - путь с `..` (reject до syscall по построению validate_path_within).
    /// В обоих случаях read_file_in/list_dir_in обязаны вернуть Err, и для
    /// `..`-варианта — Err именно из validate_path (содержит "validate_path"
    /// либо "'..'"), т.е. до std::fs::read.
    #[test]
    fn prop_commands_outside_scope_err(tail in safe_tail()) {
        let allowed = tmp_root("p4_allowed");
        let outside = tmp_root("p4_outside");
        let roots = [allowed.clone()];

        // Реально существующий файл вне scope.
        let mut outside_file = outside.clone();
        outside_file.push("secret.txt");
        fs::write(&outside_file, "OUT-OF-SCOPE-SECRET").expect("seed outside file");
        let outside_path = outside_file.to_string_lossy().into_owned();

        // 1) Файл под чужим корнем: read/list должны быть Err и НЕ протечь содержимым.
        let r_read = read_file_in(&outside_path, &roots);
        let r_list = list_dir_in(&outside_path, &roots);

        // 2) Путь с `..` под разрешённым корнем: Err ДО syscall чтения.
        let dotdot_path = format!("{}/sub/../{}", allowed.display(), tail);
        let r_read_dd = read_file_in(&dotdot_path, &roots);

        let outcome: Result<(), TestCaseError> = (|| {
            prop_assert!(r_read.is_err(), "read outside scope must be Err");
            prop_assert!(r_list.is_err(), "list outside scope must be Err");
            if let Err(e) = &r_read {
                prop_assert!(
                    !e.contains("OUT-OF-SCOPE-SECRET"),
                    "secret content leaked into error: {e:?}"
                );
                prop_assert!(
                    e.contains("outside of allowed scope"),
                    "expected scope rejection, got: {e:?}"
                );
            }
            // `..`-путь: отклонён валидацией (до std::fs::read).
            prop_assert!(r_read_dd.is_err(), "read via '..' must be Err");
            if let Err(e) = &r_read_dd {
                prop_assert!(
                    e.contains("'..'"),
                    "expected pre-syscall '..' rejection, got: {e:?}"
                );
            }
            Ok(())
        })();

        let _ = fs::remove_dir_all(&allowed);
        let _ = fs::remove_dir_all(&outside);
        outcome?;
    }
}

/// Свойство 3 (symlink наружу): отдельный `#[test]` (а не внутри `proptest!`),
/// потому что создание symlink — побочный эффект с платформенной спецификой;
/// нам не нужен fuzzing входа, нужна детерминированная проверка инварианта
/// «canonicalize резолвит ссылку и отсекает выход за scope».
///
/// Windows: создание symlink обычно требует прав администратора или
/// Developer Mode. Если создать ссылку не удалось — тест SKIP'ается
/// (ранний return), а НЕ падает. Это задокументированный осознанный skip:
/// инвариант проверяется на платформах/конфигурациях, где symlink доступен
/// (Linux/macOS в CI, Windows с Developer Mode).
#[test]
fn prop_symlink_escaping_scope_rejected() {
    // Кросс-платформенное создание симлинка на каталог.
    #[cfg(unix)]
    fn make_dir_symlink(target: &Path, link: &Path) -> std::io::Result<()> {
        std::os::unix::fs::symlink(target, link)
    }
    #[cfg(windows)]
    fn make_dir_symlink(target: &Path, link: &Path) -> std::io::Result<()> {
        std::os::windows::fs::symlink_dir(target, link)
    }
    #[cfg(not(any(unix, windows)))]
    fn make_dir_symlink(_target: &Path, _link: &Path) -> std::io::Result<()> {
        Err(std::io::Error::new(
            std::io::ErrorKind::Unsupported,
            "symlink unsupported on this platform",
        ))
    }

    let allowed = tmp_root("p3_allowed");
    let outside = tmp_root("p3_outside");
    let roots = [allowed.clone()];

    // Цель ссылки — каталог ВНЕ scope, с реальным секретным файлом.
    let mut secret = outside.clone();
    secret.push("secret.txt");
    fs::write(&secret, "SYMLINK-LEAK-SECRET").expect("seed secret outside");

    // Ссылка ВНУТРИ scope, указывающая на каталог снаружи.
    let mut link = allowed.clone();
    link.push("escape_link");

    if let Err(e) = make_dir_symlink(&outside, &link) {
        // SKIP: нет прав на создание symlink (типично для Windows без
        // Developer Mode / admin). Не считаем это провалом теста.
        eprintln!(
            "prop_symlink_escaping_scope_rejected: SKIP — не удалось создать symlink \
             (нужны привилегии?): {e}"
        );
        let _ = fs::remove_dir_all(&allowed);
        let _ = fs::remove_dir_all(&outside);
        return;
    }

    // Доступ через ссылку: <allowed>/escape_link/secret.txt.
    // canonicalize резолвит escape_link → outside, итог лежит ВНЕ scope → Err.
    let mut via_link = link.clone();
    via_link.push("secret.txt");
    let path = via_link.to_string_lossy().into_owned();

    let v = validate_path_within(&path, &roots);
    assert!(
        v.is_err(),
        "symlink escaping scope must be rejected, got Ok: {v:?}"
    );
    if let Err(e) = &v {
        assert!(
            e.contains("outside of allowed scope"),
            "expected scope rejection for escaping symlink, got: {e}"
        );
    }

    // И сама команда чтения тоже отказывает, не протекая содержимым.
    let r = read_file_in(&path, &roots);
    assert!(r.is_err(), "read via escaping symlink must be Err");
    if let Err(e) = r {
        assert!(
            !e.contains("SYMLINK-LEAK-SECRET"),
            "secret leaked via symlink: {e}"
        );
    }

    let _ = fs::remove_dir_all(&allowed);
    let _ = fs::remove_dir_all(&outside);
}
