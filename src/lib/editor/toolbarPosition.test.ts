/**
 * Независимые тесты для MDP-16: clampToolbarPosition.
 *
 * Написаны агентом test-writer ТОЛЬКО по контракту и критериям приёмки.
 * Реализация (toolbarPosition.ts) не читалась — структурная защита SENAR-правила 4.
 *
 * Сигнатуры:
 *   interface SelectionRect { left:number; top:number; right:number; bottom:number }
 *   interface ToolbarSize   { width:number; height:number }
 *   interface Viewport      { width:number; height:number }
 *   interface ToolbarPosition { x:number; y:number }
 *   interface ClampOptions  { gap?:number; margin?:number }
 *   clampToolbarPosition(selRect, toolbarSize, viewport, options?): ToolbarPosition
 *
 * Семантика:
 *   x = clamp((left+right)/2 - width/2,  margin,  viewport.width - margin - width)
 *   y = top - gap - height  (если >= margin); иначе flip: y = bottom + gap
 *   Дефолты: gap=8, margin=8.
 *   Если max < min (viewport уже панели) — вернуть min.
 */

import { describe, it, expect } from "vitest";
import { clampToolbarPosition } from "./toolbarPosition";

// ---------------------------------------------------------------------------
// Вспомогательные константы
// ---------------------------------------------------------------------------

/** Типичный тулбар 120×32 */
const TB = { width: 120, height: 32 };

/** Стандартный экран */
const VP = { width: 1024, height: 768 };

/** Выделение в центре экрана (400..600 по x, 300..320 по y) */
const SEL_CENTER = { left: 400, top: 300, right: 600, bottom: 320 };

// ===========================================================================
// 1. Горизонтальное центрирование
// ===========================================================================

describe("clampToolbarPosition: горизонтальное центрирование", () => {
  it("AC: x равен (left+right)/2 - width/2 при достаточном viewport", () => {
    // (400+600)/2 - 120/2 = 500 - 60 = 440
    // AC: горизонтальный центр не обрезается margin
    const pos = clampToolbarPosition(SEL_CENTER, TB, VP);
    expect(pos.x).toBe(440);
  });

  it("AC: x меняется симметрично при симметричном выделении", () => {
    // Выделение 200..800 → центр 500, x = 500 - 60 = 440
    // AC: центрирование детерминировано
    const sel = { left: 200, top: 300, right: 800, bottom: 320 };
    const pos = clampToolbarPosition(sel, TB, VP);
    const expected = (200 + 800) / 2 - TB.width / 2;
    expect(pos.x).toBe(expected);
  });

  it("AC: выделение шириной 0 (курсор) — центр совпадает с точкой", () => {
    // left === right === 500 → x = 500 - 60 = 440
    // AC: вырожденное выделение (курсор) не ломает центрирование
    const sel = { left: 500, top: 300, right: 500, bottom: 320 };
    const pos = clampToolbarPosition(sel, TB, VP);
    expect(pos.x).toBe(500 - TB.width / 2);
  });
});

// ===========================================================================
// 2. Clamp у левого края
// ===========================================================================

describe("clampToolbarPosition: clamp у левого края", () => {
  it("AC: выделение у левого края — x не уходит меньше margin=8", () => {
    // Центр выделения 10..30 = 20, x_raw = 20 - 60 = -40 → clamp → 8
    // AC: x >= margin всегда
    const sel = { left: 10, top: 300, right: 30, bottom: 320 };
    const pos = clampToolbarPosition(sel, TB, VP);
    expect(pos.x).toBe(8);
  });

  it("AC: выделение начиная с 0 — x == margin", () => {
    // left=right=0 → x_raw = 0 - 60 = -60 → clamp → 8
    // AC: левая граница
    const sel = { left: 0, top: 300, right: 0, bottom: 320 };
    const pos = clampToolbarPosition(sel, TB, VP);
    expect(pos.x).toBe(8);
  });

  it("AC: кастомный margin=20 — x не уходит меньше 20", () => {
    // Выделение у левого края, margin задан явно
    // AC: кастомный margin учитывается
    const sel = { left: 5, top: 300, right: 5, bottom: 320 };
    const pos = clampToolbarPosition(sel, TB, VP, { margin: 20 });
    expect(pos.x).toBe(20);
  });
});

// ===========================================================================
// 3. Clamp у правого края
// ===========================================================================

describe("clampToolbarPosition: clamp у правого края", () => {
  it("AC: выделение у правого края — x не выходит за viewport.width - margin - width", () => {
    // Выделение 990..1010 (за правым краем), VP=1024
    // x_raw = 1000 - 60 = 940; max = 1024 - 8 - 120 = 896 → clamp → 896
    // AC: x <= viewport.width - margin - width
    const sel = { left: 990, top: 300, right: 1010, bottom: 320 };
    const pos = clampToolbarPosition(sel, TB, VP);
    expect(pos.x).toBe(1024 - 8 - 120);
  });

  it("AC: выделение точно у правого края viewport — x обрезается до max", () => {
    // left=right=1024 → x_raw=1024-60=964; max=896 → clamp
    // AC: правый clamp
    const sel = { left: 1024, top: 300, right: 1024, bottom: 320 };
    const pos = clampToolbarPosition(sel, TB, VP);
    expect(pos.x).toBe(1024 - 8 - 120);
  });

  it("AC: кастомный margin=16 — максимум учитывает новый margin", () => {
    // max = 1024 - 16 - 120 = 888
    // AC: кастомный margin в правой границе
    const sel = { left: 990, top: 300, right: 1010, bottom: 320 };
    const pos = clampToolbarPosition(sel, TB, VP, { margin: 16 });
    expect(pos.x).toBe(1024 - 16 - 120);
  });
});

// ===========================================================================
// 4. Вертикаль: позиция НАД выделением
// ===========================================================================

describe("clampToolbarPosition: панель над выделением", () => {
  it("AC: y = top - gap - height при достаточном месте сверху", () => {
    // top=300, gap=8, height=32 → y = 300-8-32 = 260; 260 >= 8 → нет flip
    // AC: вертикаль над выделением без flip
    const pos = clampToolbarPosition(SEL_CENTER, TB, VP);
    expect(pos.y).toBe(300 - 8 - 32);
  });

  it("AC: y = top - gap - height для кастомного gap=16", () => {
    // y = 300 - 16 - 32 = 252
    // AC: кастомный gap применяется
    const pos = clampToolbarPosition(SEL_CENTER, TB, VP, { gap: 16 });
    expect(pos.y).toBe(300 - 16 - 32);
  });

  it("AC: top=200, height=32, gap=8 — y ровно 160", () => {
    // 200 - 8 - 32 = 160 >= 8 → нет flip
    // AC: корректное вычисление без flip
    const sel = { left: 400, top: 200, right: 600, bottom: 220 };
    const pos = clampToolbarPosition(sel, TB, VP);
    expect(pos.y).toBe(160);
  });

  it("AC: margin=8 и top достаточный — y строго >= margin", () => {
    // Инвариант: если нет flip, y должен быть не менее margin
    // AC: y >= margin при позиции над выделением
    const sel = { left: 400, top: 100, right: 600, bottom: 120 };
    const pos = clampToolbarPosition(sel, TB, VP);
    expect(pos.y).toBeGreaterThanOrEqual(8);
  });
});

// ===========================================================================
// 5. Flip вниз когда сверху не влезает
// ===========================================================================

describe("clampToolbarPosition: flip вниз при нехватке места сверху", () => {
  it("AC: top - gap - height < margin → y = bottom + gap", () => {
    // top=20, gap=8, height=32 → y_top = 20-8-32 = -20 < 8 → flip
    // y_flip = bottom + gap = 40 + 8 = 48
    // AC: flip при нехватке сверху
    const sel = { left: 400, top: 20, right: 600, bottom: 40 };
    const pos = clampToolbarPosition(sel, TB, VP);
    expect(pos.y).toBe(40 + 8);
  });

  it("AC: top=0 → flip → y = bottom + gap", () => {
    // top=0, y_top = 0-8-32 = -40 < 8 → flip
    // y = bottom + gap = 20 + 8 = 28
    // AC: top=0 вызывает flip
    const sel = { left: 400, top: 0, right: 600, bottom: 20 };
    const pos = clampToolbarPosition(sel, TB, VP);
    expect(pos.y).toBe(20 + 8);
  });

  it("AC: top ровно на границе flip (top - gap - height === margin) → нет flip", () => {
    // top - 8 - 32 === 8 → top = 48 → y = 8, нет flip
    // AC: граница условия flip включительно (>= margin)
    const sel = { left: 400, top: 48, right: 600, bottom: 68 };
    const pos = clampToolbarPosition(sel, TB, VP);
    expect(pos.y).toBe(8);
  });

  it("AC: top на 1 меньше границы flip → flip срабатывает", () => {
    // top=47: y_top = 47-8-32 = 7 < 8 → flip → y = bottom + gap = 67+8 = 75
    // AC: граница условия flip (top-gap-height < margin)
    const sel = { left: 400, top: 47, right: 600, bottom: 67 };
    const pos = clampToolbarPosition(sel, TB, VP);
    expect(pos.y).toBe(67 + 8);
  });

  it("AC: кастомный gap=16 и top=20 → flip использует кастомный gap", () => {
    // y_top = 20-16-32 = -28 < 8 → flip → y = bottom + 16 = 40 + 16 = 56
    // AC: кастомный gap учитывается при flip
    const sel = { left: 400, top: 20, right: 600, bottom: 40 };
    const pos = clampToolbarPosition(sel, TB, VP, { gap: 16 });
    expect(pos.y).toBe(40 + 16);
  });

  it("AC: кастомный margin=20 и top=50 → flip срабатывает при другой границе", () => {
    // y_top = 50-8-32 = 10 < 20 → flip → y = bottom + 8 = 70 + 8 = 78
    // AC: кастомный margin влияет на решение о flip
    const sel = { left: 400, top: 50, right: 600, bottom: 70 };
    const pos = clampToolbarPosition(sel, TB, VP, { margin: 20 });
    expect(pos.y).toBe(70 + 8);
  });
});

// ===========================================================================
// 6. Вырожденный случай — viewport уже тулбара
// ===========================================================================

describe("clampToolbarPosition: вырожденный viewport (уже панели)", () => {
  it("AC: viewport.width < width + 2*margin → x = margin (min)", () => {
    // VP 100, width=120, margin=8: max = 100-8-120 = -28 < min=8 → вернуть min=8
    // AC: вырожденный viewport по горизонтали → прижать к min
    const vp = { width: 100, height: 768 };
    const pos = clampToolbarPosition(SEL_CENTER, TB, vp);
    expect(pos.x).toBe(8);
  });

  it("AC: viewport.width === width → x = margin", () => {
    // max = 120-8-120 = -8 < 8 → вернуть 8
    // AC: viewport равен ширине панели
    const vp = { width: 120, height: 768 };
    const pos = clampToolbarPosition(SEL_CENTER, TB, vp);
    expect(pos.x).toBe(8);
  });

  it("edge case: margin=0 и viewport равен width — x = 0", () => {
    // max = 120-0-120 = 0; min = 0; max === min → вернуть 0
    // edge case: нулевой margin
    const vp = { width: 120, height: 768 };
    const pos = clampToolbarPosition(SEL_CENTER, TB, vp, { margin: 0 });
    expect(pos.x).toBe(0);
  });
});

// ===========================================================================
// 7. Кастомные gap и margin — комбинации
// ===========================================================================

describe("clampToolbarPosition: кастомные gap и margin", () => {
  it("AC: gap=0 → y вплотную к top блока (y = top - height)", () => {
    // y_top = 300 - 0 - 32 = 268 >= 8 → нет flip
    // AC: gap=0 (вплотную)
    const pos = clampToolbarPosition(SEL_CENTER, TB, VP, { gap: 0 });
    expect(pos.y).toBe(300 - 0 - 32);
  });

  it("AC: margin=0 — x может быть 0", () => {
    // Выделение у левого края: x_raw << 0 → clamp к 0
    // AC: margin=0 позволяет x=0
    const sel = { left: 0, top: 300, right: 0, bottom: 320 };
    const pos = clampToolbarPosition(sel, TB, VP, { margin: 0 });
    expect(pos.x).toBe(0);
  });

  it("AC: gap=4 margin=4 — дефолты переопределяются независимо", () => {
    // y_top = 300-4-32 = 264 >= 4 → нет flip; x = clamp(440, 4, 1024-4-120) = 440
    // AC: оба параметра переопределяются
    const pos = clampToolbarPosition(SEL_CENTER, TB, VP, { gap: 4, margin: 4 });
    expect(pos.x).toBe(440);
    expect(pos.y).toBe(300 - 4 - 32);
  });

  it("AC: только gap переопределён — margin остаётся 8", () => {
    // AC: частичное переопределение опций
    const sel = { left: 0, top: 300, right: 0, bottom: 320 };
    const pos = clampToolbarPosition(sel, TB, VP, { gap: 4 });
    // margin=8 применяется по умолчанию
    expect(pos.x).toBe(8); // левый clamp с дефолтным margin
  });

  it("AC: только margin переопределён — gap остаётся 8", () => {
    // AC: частичное переопределение, gap дефолтный
    const pos = clampToolbarPosition(SEL_CENTER, TB, VP, { margin: 0 });
    expect(pos.y).toBe(300 - 8 - 32); // gap=8 по умолчанию
  });
});

// ===========================================================================
// 8. Окно 640×400 (маленький экран)
// ===========================================================================

describe("clampToolbarPosition: окно 640×400", () => {
  const VP_SMALL = { width: 640, height: 400 };

  it("AC: центрированное выделение в маленьком окне — x корректен", () => {
    // Выделение 260..380, центр 320; x_raw = 320-60=260; max=640-8-120=512 → 260
    // AC: правильное позиционирование в маленьком окне
    const sel = { left: 260, top: 200, right: 380, bottom: 220 };
    const pos = clampToolbarPosition(sel, TB, VP_SMALL);
    expect(pos.x).toBe((260 + 380) / 2 - TB.width / 2);
  });

  it("AC: выделение у правого края 640 → x обрезается", () => {
    // x_raw = 640-60 = 580; max = 640-8-120 = 512 → x=512
    // AC: правый clamp в маленьком окне
    const sel = { left: 600, top: 200, right: 640, bottom: 220 };
    const pos = clampToolbarPosition(sel, TB, VP_SMALL);
    expect(pos.x).toBe(640 - 8 - 120);
  });

  it("AC: выделение у нижнего края 400 — flip не нужен если верх достаточен", () => {
    // top=380 >= margin+gap+height=48 → нет flip; y = 380-8-32 = 340
    // AC: нижнее выделение в маленьком окне без flip
    const sel = { left: 200, top: 380, right: 400, bottom: 395 };
    const pos = clampToolbarPosition(sel, TB, VP_SMALL);
    expect(pos.y).toBe(380 - 8 - 32);
  });

  it("AC: выделение у верхнего края → flip в маленьком окне", () => {
    // top=10, y_top=10-8-32=-30 < 8 → flip → y = bottom+8 = 30+8 = 38
    // AC: flip в маленьком окне
    const sel = { left: 200, top: 10, right: 400, bottom: 30 };
    const pos = clampToolbarPosition(sel, TB, VP_SMALL);
    expect(pos.y).toBe(30 + 8);
  });

  it("edge case: viewport 640×400 с панелью шире половины экрана — x не отрицателен", () => {
    // Широкая панель: width=400, margin=8; max=640-8-400=232; min=8
    // edge case: широкая панель в маленьком окне
    const bigTb = { width: 400, height: 32 };
    const sel = { left: 100, top: 200, right: 200, bottom: 220 };
    const pos = clampToolbarPosition(sel, bigTb, VP_SMALL);
    expect(pos.x).toBeGreaterThanOrEqual(8); // invariant: x >= margin
    expect(pos.x).toBeLessThanOrEqual(640 - 8 - 400); // invariant: x <= max
  });
});

// ===========================================================================
// 9. Инварианты (должны выполняться при любых входных данных)
// ===========================================================================

describe("clampToolbarPosition: инварианты", () => {
  it("invariant: x всегда >= margin", () => {
    // Несколько разных положений выделения — x никогда < margin
    // invariant: левая граница не нарушается
    const cases = [
      { left: 0, top: 200, right: 0, bottom: 220 },
      { left: -100, top: 200, right: -50, bottom: 220 },
      { left: 5, top: 200, right: 10, bottom: 220 },
    ];
    for (const sel of cases) {
      const pos = clampToolbarPosition(sel, TB, VP);
      expect(pos.x).toBeGreaterThanOrEqual(8); // invariant: x >= margin=8
    }
  });

  it("invariant: x + width <= viewport.width - margin + width (не за правым краем)", () => {
    // x <= viewport.width - margin - width
    // invariant: правая граница не нарушается
    const cases = [
      { left: 900, top: 200, right: 1000, bottom: 220 },
      { left: 1020, top: 200, right: 1024, bottom: 220 },
      { left: 2000, top: 200, right: 3000, bottom: 220 },
    ];
    for (const sel of cases) {
      const pos = clampToolbarPosition(sel, TB, VP);
      expect(pos.x).toBeLessThanOrEqual(VP.width - 8 - TB.width); // invariant: x <= max
    }
  });

  it("invariant: при нормальном viewport min <= max → x в диапазоне [margin, viewport.width-margin-width]", () => {
    // Центральное выделение — результат строго в диапазоне
    // invariant: x в допустимом диапазоне
    const pos = clampToolbarPosition(SEL_CENTER, TB, VP);
    expect(pos.x).toBeGreaterThanOrEqual(8);
    expect(pos.x).toBeLessThanOrEqual(VP.width - 8 - TB.width);
  });

  it("invariant: возвращается объект с полями x и y (оба числа)", () => {
    // invariant: структура возвращаемого значения
    const pos = clampToolbarPosition(SEL_CENTER, TB, VP);
    expect(typeof pos.x).toBe("number");
    expect(typeof pos.y).toBe("number");
    expect(Number.isFinite(pos.x)).toBe(true);
    expect(Number.isFinite(pos.y)).toBe(true);
  });
});

// ===========================================================================
// 10. Edge cases — из типов данных
// ===========================================================================

describe("clampToolbarPosition: edge cases", () => {
  it("edge case: нулевое выделение (left=right=0, top=bottom=0) — flip + левый clamp", () => {
    // top=0: y_top = 0-8-32 < 8 → flip → y = 0+8 = 8
    // x_raw = 0-60 = -60 → clamp → 8
    // edge case: полностью нулевые координаты
    const sel = { left: 0, top: 0, right: 0, bottom: 0 };
    const pos = clampToolbarPosition(sel, TB, VP);
    expect(pos.x).toBe(8);
    expect(pos.y).toBe(0 + 8); // flip, bottom=0
  });

  it("edge case: очень большие координаты выделения → clamp к правому/нижнему", () => {
    // edge case: координаты за пределами viewport
    const sel = { left: 9999, top: 9999, right: 10000, bottom: 10010 };
    const pos = clampToolbarPosition(sel, TB, VP);
    expect(pos.x).toBeLessThanOrEqual(VP.width - 8 - TB.width); // правый clamp
    // y: top=9999 >> margin → нет flip; y = 9999-8-32 = 9959 (не ограничивается снизу по спеке)
    expect(typeof pos.y).toBe("number");
  });

  it("edge case: панель высотой 0 — gap применяется корректно", () => {
    // height=0: y_top = top - gap - 0 = top - 8
    // edge case: нулевая высота панели
    const zeroH = { width: 120, height: 0 };
    const sel = { left: 400, top: 100, right: 600, bottom: 120 };
    const pos = clampToolbarPosition(sel, zeroH, VP);
    expect(pos.y).toBe(100 - 8 - 0); // нет flip: 92 >= 8
  });

  it("edge case: панель шириной 0 — x равен центру выделения (нет смещения width/2)", () => {
    // width=0: x_raw = 500 - 0 = 500; clamp: [8, 1024-8-0]==[8, 1016] → 500
    // edge case: нулевая ширина панели
    const zeroW = { width: 0, height: 32 };
    const sel = { left: 400, top: 300, right: 600, bottom: 320 };
    const pos = clampToolbarPosition(sel, zeroW, VP);
    expect(pos.x).toBe(500);
  });

  it("edge case: viewport.width === 0 → x = margin (min при вырождении)", () => {
    // max = 0-8-120 = -128 < min=8 → x=8
    // edge case: нулевой viewport
    const vp = { width: 0, height: 768 };
    const pos = clampToolbarPosition(SEL_CENTER, TB, vp);
    expect(pos.x).toBe(8);
  });
});
