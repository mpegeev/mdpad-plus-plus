// Тонкая TS-обёртка над Tauri-командами файловой системы (MDP-7).
//
// Все функции — async и вызывают соответствующие Rust-команды через `invoke`.
// Ошибки Rust-стороны приходят как строка и пробрасываются исключением.
//
// Конвенция именования (см. AC#5):
// - Rust возвращает `{ name, path, is_dir, size }` (snake_case).
// - TS-сторона публикует `{ name, path, isDir, size }` (camelCase).
// - Маппинг руками в `listDir`, чтобы Rust оставался идиоматичным и тесты
//   сериализации в Rust не зависели от camelCase.

import { invoke } from "@tauri-apps/api/core";

/** Запись о файле или директории, возвращаемая `listDir`. */
export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
}

/** То, что отдаёт Rust (snake_case). Внутреннее. */
interface RustDirEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

/** Прочитать UTF-8 текстовый файл. Бросает Error при отсутствии или non-UTF-8. */
export async function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

/** Записать UTF-8 содержимое в файл. Создаёт parent-директории при необходимости. */
export async function writeFile(path: string, contents: string): Promise<void> {
  await invoke<void>("write_file", { path, contents });
}

/** Получить содержимое директории. */
export async function listDir(path: string): Promise<DirEntry[]> {
  const raw = await invoke<RustDirEntry[]>("list_dir", { path });
  return raw.map((e) => ({
    name: e.name,
    path: e.path,
    isDir: e.is_dir,
    size: e.size,
  }));
}

/** Открыть диалог выбора файла. `null` если пользователь отменил. */
export async function pickOpenFile(
  defaultDir?: string,
): Promise<string | null> {
  const result = await invoke<string | null>("pick_open_file", {
    defaultDir: defaultDir ?? null,
  });
  return result;
}

/** Открыть диалог сохранения файла (Save As). `null` если отменено. */
export async function pickSaveFile(
  defaultName: string,
): Promise<string | null> {
  const result = await invoke<string | null>("pick_save_file", {
    defaultName,
  });
  return result;
}

/** Открыть диалог выбора папки. `null` если отменено. */
export async function pickFolder(defaultDir?: string): Promise<string | null> {
  const result = await invoke<string | null>("pick_folder", {
    defaultDir: defaultDir ?? null,
  });
  return result;
}
