/**
 * MDP-16 — тесты чистого хелпера `clampToolbarPosition`.
 *
 * SENAR-правило 4: детерминированная функция (известный заранее ответ), поэтому
 * тесты написаны строго по контракту из задачи, без доступа к реализации:
 *
 *   clampToolbarPosition(
 *     selRect: { left, top, right, bottom },
 *     toolbarSize: { width, height },
 *     viewport: { width, height },
 *     options?: { gap?, margin? }
 *   ): { x, y }
 *
 * Контракт (AC#4 — «не перекрывает выделение, корректно у краёв окна»):
 *   - по X: панель центрируется над выделением, затем clamp к
 *     [margin, viewport.width - margin - toolbarWidth];
 *   - по Y: панель над выделением (selTop - gap - height); если сверху не
 *     помещается (вышло бы выше margin) — уходит под выделение
 *     (selBottom + gap); затем clamp к
 *     [margin, viewport.height - margin - toolbarHeight].
 *
 * В среде нет субагента test-writer — отмечено в отчёте; тесты от контракта.
 */

import { describe, it, expect } from "vitest";
import { clampToolbarPosition, type SelectionRect } from "./toolbarPosition";

const TOOLBAR = { width: 120, height: 32 };
const VIEWPORT = { width: 1000, height: 800 };
const GAP = 8;
const MARGIN = 8;
const OPTS = { gap: GAP, margin: MARGIN };

/** Выделение по центру большого viewport, с запасом сверху и по бокам. */
const centeredRect: SelectionRect = {
  left: 400,
  top: 400,
  right: 600,
  bottom: 420,
};

describe("clampToolbarPosition: горизонтальное центрирование", () => {
  it("AC#4: центрирует панель над центром выделения вдали от краёв", () => {
    const { x } = clampToolbarPosition(centeredRect, TOOLBAR, VIEWPORT, OPTS);
    const selCenter = (centeredRect.left + centeredRect.right) / 2; // 500
    expect(x).toBe(selCenter - TOOLBAR.width / 2); // 500 - 60 = 440
  });

  it("AC#4: точечное (схлопнутое по X) выделение — центрируется по нему", () => {
    const rect: SelectionRect = {
      left: 500,
      top: 400,
      right: 500,
      bottom: 420,
    };
    const { x } = clampToolbarPosition(rect, TOOLBAR, VIEWPORT, OPTS);
    expect(x).toBe(500 - TOOLBAR.width / 2);
  });
});

describe("clampToolbarPosition: clamp по горизонтали к краям viewport", () => {
  it("AC#4: у левого края не уходит левее margin", () => {
    const rect: SelectionRect = { left: 0, top: 400, right: 20, bottom: 420 };
    const { x } = clampToolbarPosition(rect, TOOLBAR, VIEWPORT, OPTS);
    expect(x).toBe(MARGIN);
    expect(x).toBeGreaterThanOrEqual(MARGIN);
  });

  it("AC#4: у правого края правый край панели не выходит за viewport - margin", () => {
    const rect: SelectionRect = {
      left: 980,
      top: 400,
      right: 1000,
      bottom: 420,
    };
    const { x } = clampToolbarPosition(rect, TOOLBAR, VIEWPORT, OPTS);
    expect(x).toBe(VIEWPORT.width - MARGIN - TOOLBAR.width); // 1000-8-120=872
    expect(x + TOOLBAR.width).toBeLessThanOrEqual(VIEWPORT.width - MARGIN);
  });

  it("AC#4: при любом X результат всегда в пределах [margin, viewport-margin-width]", () => {
    const minX = MARGIN;
    const maxX = VIEWPORT.width - MARGIN - TOOLBAR.width;
    for (let center = -200; center <= 1200; center += 37) {
      const rect: SelectionRect = {
        left: center,
        top: 400,
        right: center,
        bottom: 420,
      };
      const { x } = clampToolbarPosition(rect, TOOLBAR, VIEWPORT, OPTS);
      expect(x).toBeGreaterThanOrEqual(minX);
      expect(x).toBeLessThanOrEqual(maxX);
    }
  });
});

describe("clampToolbarPosition: вертикальное размещение над выделением", () => {
  it("AC#4: при наличии места панель стоит над выделением (selTop - gap - height)", () => {
    const { y } = clampToolbarPosition(centeredRect, TOOLBAR, VIEWPORT, OPTS);
    expect(y).toBe(centeredRect.top - GAP - TOOLBAR.height); // 400-8-32=360
  });

  it("AC#4: панель не перекрывает выделение — её низ выше верха выделения", () => {
    const { y } = clampToolbarPosition(centeredRect, TOOLBAR, VIEWPORT, OPTS);
    const toolbarBottom = y + TOOLBAR.height;
    expect(toolbarBottom).toBeLessThanOrEqual(centeredRect.top);
  });
});

describe("clampToolbarPosition: flip вниз у верхнего края", () => {
  it("AC#4: у самого верха панель уходит под выделение (selBottom + gap)", () => {
    // Выделение прижато к верху — сверху панель не помещается.
    const rect: SelectionRect = { left: 400, top: 4, right: 600, bottom: 24 };
    const { y } = clampToolbarPosition(rect, TOOLBAR, VIEWPORT, OPTS);
    expect(y).toBe(rect.bottom + GAP); // 24 + 8 = 32
  });

  it("AC#4: после flip панель не перекрывает выделение — её верх ниже низа выделения", () => {
    const rect: SelectionRect = { left: 400, top: 4, right: 600, bottom: 24 };
    const { y } = clampToolbarPosition(rect, TOOLBAR, VIEWPORT, OPTS);
    expect(y).toBeGreaterThanOrEqual(rect.bottom);
  });
});

describe("clampToolbarPosition: clamp по вертикали к краям viewport", () => {
  it("AC#4: y никогда не меньше margin", () => {
    const rect: SelectionRect = { left: 400, top: 0, right: 600, bottom: 0 };
    const { y } = clampToolbarPosition(rect, TOOLBAR, VIEWPORT, OPTS);
    expect(y).toBeGreaterThanOrEqual(MARGIN);
  });

  it("AC#4: y + height никогда не больше viewport.height - margin", () => {
    // Выделение у самого низа: flip вниз упёрся бы в нижний край → clamp.
    const rect: SelectionRect = {
      left: 400,
      top: 790,
      right: 600,
      bottom: 800,
    };
    const { y } = clampToolbarPosition(rect, TOOLBAR, VIEWPORT, OPTS);
    expect(y + TOOLBAR.height).toBeLessThanOrEqual(VIEWPORT.height - MARGIN);
  });

  it("AC#4: при любом вертикальном положении y в пределах допустимого отрезка", () => {
    const minY = MARGIN;
    const maxY = VIEWPORT.height - MARGIN - TOOLBAR.height;
    for (let top = -100; top <= 900; top += 41) {
      const rect: SelectionRect = {
        left: 400,
        top,
        right: 600,
        bottom: top + 20,
      };
      const { y } = clampToolbarPosition(rect, TOOLBAR, VIEWPORT, OPTS);
      expect(y).toBeGreaterThanOrEqual(minY);
      expect(y).toBeLessThanOrEqual(maxY);
    }
  });
});

describe("clampToolbarPosition: значения по умолчанию (gap/margin = 8)", () => {
  it("без options использует gap=8 и margin=8", () => {
    const withDefaults = clampToolbarPosition(centeredRect, TOOLBAR, VIEWPORT);
    const withExplicit = clampToolbarPosition(centeredRect, TOOLBAR, VIEWPORT, {
      gap: 8,
      margin: 8,
    });
    expect(withDefaults).toEqual(withExplicit);
  });
});

describe("clampToolbarPosition: вырожденные случаи (panель шире окна)", () => {
  it("когда панель шире доступного места — прижимается к левому краю (x = margin)", () => {
    const narrow = { width: 300, height: 600 };
    const bigToolbar = { width: 400, height: 32 };
    const rect: SelectionRect = {
      left: 100,
      top: 300,
      right: 200,
      bottom: 320,
    };
    const { x } = clampToolbarPosition(rect, bigToolbar, narrow, OPTS);
    expect(x).toBe(MARGIN);
  });

  it("когда панель выше доступного места — прижимается к верхнему краю (y = margin)", () => {
    const shortViewport = { width: 1000, height: 40 };
    const tallToolbar = { width: 120, height: 100 };
    const rect: SelectionRect = { left: 400, top: 10, right: 600, bottom: 30 };
    const { y } = clampToolbarPosition(rect, tallToolbar, shortViewport, OPTS);
    expect(y).toBe(MARGIN);
  });
});

describe("clampToolbarPosition: маленькое окно 640×400 (DESIGN.md)", () => {
  const small = { width: 640, height: 400 };

  it("AC#4: в окне 640×400 панель полностью внутри границ", () => {
    const rect: SelectionRect = {
      left: 600,
      top: 380,
      right: 638,
      bottom: 398,
    };
    const { x, y } = clampToolbarPosition(rect, TOOLBAR, small, OPTS);
    expect(x).toBeGreaterThanOrEqual(MARGIN);
    expect(x + TOOLBAR.width).toBeLessThanOrEqual(small.width - MARGIN);
    expect(y).toBeGreaterThanOrEqual(MARGIN);
    expect(y + TOOLBAR.height).toBeLessThanOrEqual(small.height - MARGIN);
  });
});
