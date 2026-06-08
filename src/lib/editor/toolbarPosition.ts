/**
 * MDP-16 — чистый хелпер позиционирования всплывающей панели форматирования.
 *
 * `clampToolbarPosition` детерминированно вычисляет верхний левый угол панели
 * по прямоугольнику выделения, размеру панели и размеру viewport. Панель:
 *   - центрируется по горизонтали над выделением;
 *   - ставится над выделением (с зазором `gap`); если сверху не помещается —
 *     уходит под выделение (flip);
 *   - clamp'ится к границам viewport со внутренним отступом `margin`, чтобы не
 *     уезжать за края окна.
 *
 * Функция чистая (никакого DOM/layout) → тестируется по контракту.
 */

/** Прямоугольник в координатах viewport (как DOMRect от coordsAtPos). */
export interface SelectionRect {
  /** Левая граница выделения. */
  left: number;
  /** Верхняя граница выделения. */
  top: number;
  /** Правая граница выделения. */
  right: number;
  /** Нижняя граница выделения. */
  bottom: number;
}

/** Размер панели в пикселях. */
export interface ToolbarSize {
  width: number;
  height: number;
}

/** Размер видимой области (окна). */
export interface Viewport {
  width: number;
  height: number;
}

/** Результат: левый верхний угол панели в координатах viewport. */
export interface ToolbarPosition {
  x: number;
  y: number;
}

/** Настройки зазоров. Значения по умолчанию кратны сетке 4px. */
export interface ClampOptions {
  /** Вертикальный зазор между панелью и выделением. */
  gap?: number;
  /** Минимальный отступ панели от краёв viewport. */
  margin?: number;
}

/**
 * Зажимает значение в отрезок [min, max]. Если отрезок вырожден (min > max,
 * панель шире доступного места), возвращает min — панель прижимается к левому
 * (верхнему) краю, что предсказуемее, чем уезжать вправо.
 */
function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Вычисляет позицию панели над выделением с clamp к границам viewport.
 *
 * @param selRect    прямоугольник выделения в координатах viewport
 * @param toolbarSize размер панели
 * @param viewport   размер окна
 * @param options    зазоры (gap над выделением, margin от краёв)
 * @returns          левый верхний угол панели {x, y}
 */
export function clampToolbarPosition(
  selRect: SelectionRect,
  toolbarSize: ToolbarSize,
  viewport: Viewport,
  options: ClampOptions = {},
): ToolbarPosition {
  const gap = options.gap ?? 8;
  const margin = options.margin ?? 8;

  // --- По горизонтали: центр панели = центр выделения, затем clamp. ---
  const selCenterX = (selRect.left + selRect.right) / 2;
  const rawX = selCenterX - toolbarSize.width / 2;
  const minX = margin;
  const maxX = viewport.width - margin - toolbarSize.width;
  const x = clamp(rawX, minX, maxX);

  // --- По вертикали: над выделением; flip вниз, если сверху не влезает. ---
  const above = selRect.top - gap - toolbarSize.height;
  const below = selRect.bottom + gap;
  // Предпочитаем разместить сверху. Уходим вниз только если сверху панель
  // вылезла бы за верхний край viewport (с учётом margin).
  const preferred = above >= margin ? above : below;
  const minY = margin;
  const maxY = viewport.height - margin - toolbarSize.height;
  const y = clamp(preferred, minY, maxY);

  return { x, y };
}
