/**
 * Expand-to-path для сайдбара (MDP-47).
 *
 * Чистое ядро `ancestorDirsToReveal` отделено от стора: по `filePath` и корню
 * дерева возвращает упорядоченный (внешний→внутренний) список родительских
 * каталогов, которые нужно раскрыть, чтобы дойти до файла. `rootPath` и сам
 * `filePath` в список НЕ входят.
 *
 * Свойства (см. контрактные тесты revealPath.test.ts):
 *   - кроссплатформенно: разделители `/` и `\`;
 *   - сравнение ПОСЕГМЕНТНОЕ и регистрозависимое (`/ro` не предок `/root/...`);
 *   - возвращаемые пути — строковые ПРЕФИКСЫ `filePath` (его собственные
 *     разделители сохранены), без дубликатов, строго растущей длины;
 *   - fail-closed: файл вне корня / пустые строки / `rootPath` длиннее → `[]`.
 *
 * Нормализация хвостовых разделителей `rootPath` идёт по ПЕРВИЧНОМУ разделителю
 * (первый `/` или `\` в строке). Поэтому `"/root/"` нормализуется к `"/root"`,
 * а `"/root\"` — нет: его хвостовой `\` не совпадает с первичным `/`, путь
 * распадается на сегменты `["", "root", ""]` и перестаёт быть предком
 * `/root/...` по сегментам (так и задумано контрактом).
 */

const SEP = /[/\\]/;

/** Разбить путь на сегменты, запомнив для каждого индекс конца в исходной строке. */
function splitWithEnds(path: string): { segs: string[]; ends: number[] } {
  const segs: string[] = [];
  const ends: number[] = [];
  let start = 0;
  for (let i = 0; i <= path.length; i++) {
    if (i === path.length || path[i] === "/" || path[i] === "\\") {
      segs.push(path.slice(start, i));
      ends.push(i);
      start = i + 1;
    }
  }
  return { segs, ends };
}

/** Убрать хвостовые разделители, совпадающие с первичным (первым) разделителем пути. */
function stripTrailingPrimarySep(path: string): string {
  const m = path.match(SEP);
  if (!m) return path;
  const primary = m[0];
  let end = path.length;
  while (end > 0 && path[end - 1] === primary) end--;
  return path.slice(0, end);
}

/**
 * Упорядоченный список родительских каталогов между `rootPath` (исключая) и
 * `filePath` (исключая), которые нужно раскрыть в дереве. Внешний→внутренний.
 */
export function ancestorDirsToReveal(
  filePath: string,
  rootPath: string,
): string[] {
  if (!filePath || !rootPath) return [];

  const rootNorm = stripTrailingPrimarySep(rootPath);
  const rootSegs = splitWithEnds(rootNorm).segs;
  const rootDepth = rootSegs.length;

  const { segs: fileSegs, ends: fileEnds } = splitWithEnds(filePath);

  // Корень должен посегментно совпадать с началом filePath (регистрозависимо).
  for (let i = 0; i < rootDepth; i++) {
    if (fileSegs[i] !== rootSegs[i]) return [];
  }

  // Индекс сегмента-файла (последний) и его родителя.
  const fileIdx = fileSegs.length - 1;

  const result: string[] = [];
  // k — индекс каталога (сегменты [0..k]); от первого внутри корня до родителя файла.
  for (let k = rootDepth; k <= fileIdx - 1; k++) {
    result.push(filePath.slice(0, fileEnds[k]));
  }
  return result;
}
