/**
 * MDP-16 — тесты машины видимости `ToolbarVisibility`.
 *
 * Машина детерминирована и не зависит от реального layout (jsdom не считает
 * coordsAtPos), поэтому тесты пишутся по контракту с fake timers:
 *
 *   new ToolbarVisibility({ onChange, scheduler?, debounceMs? })
 *     .selectionChanged(empty: boolean)   // выделение изменилось
 *     .scrolled()                          // редактор проскроллен
 *     .blurred()                           // редактор потерял фокус
 *     .destroy()                           // очистка таймера
 *     .visible: boolean                    // текущее состояние
 *
 * Контракт (AC):
 *   AC#2: непустое выделение → показать только если оно не менялось debounceMs
 *         (по умолчанию 150мс); изменение перезапускает отсчёт.
 *   AC#5: scroll / blur / схлопывание → немедленно скрыть, отменить таймер.
 *   Fail-closed: стартовое состояние скрыто.
 *   onChange вызывается только при смене значения (show↔hide).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToolbarVisibility } from "./toolbarVisibility";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Хелпер: создаёт машину и записывает переходы onChange. */
function makeMachine(debounceMs = 150) {
  const changes: boolean[] = [];
  const m = new ToolbarVisibility({
    onChange: (v) => changes.push(v),
    debounceMs,
  });
  return { m, changes };
}

describe("ToolbarVisibility: стартовое состояние (fail-closed)", () => {
  it("при создании панель скрыта", () => {
    const { m, changes } = makeMachine();
    expect(m.visible).toBe(false);
    expect(changes).toEqual([]); // onChange не вызывается на старте
  });
});

describe("ToolbarVisibility: AC#2 — показ через debounce после стабилизации", () => {
  it("непустое выделение НЕ показывает панель сразу", () => {
    const { m } = makeMachine(150);
    m.selectionChanged(false);
    expect(m.visible).toBe(false);
  });

  it("показывает панель ровно через debounceMs без изменений", () => {
    const { m } = makeMachine(150);
    m.selectionChanged(false);
    vi.advanceTimersByTime(149);
    expect(m.visible).toBe(false); // ещё рано
    vi.advanceTimersByTime(1);
    expect(m.visible).toBe(true); // 150мс прошло → показ
  });

  it("изменение выделения внутри окна перезапускает отсчёт (debounce по последнему)", () => {
    const { m } = makeMachine(150);
    m.selectionChanged(false);
    vi.advanceTimersByTime(100);
    m.selectionChanged(false); // ещё движется → рестарт
    vi.advanceTimersByTime(100);
    expect(m.visible).toBe(false); // суммарно 200мс, но рестарт на 100-й
    vi.advanceTimersByTime(50);
    expect(m.visible).toBe(true); // 150мс с последнего изменения
  });

  it("несколько быстрых изменений показывают панель только один раз в конце", () => {
    const { m, changes } = makeMachine(150);
    for (let i = 0; i < 5; i++) {
      m.selectionChanged(false);
      vi.advanceTimersByTime(50); // < 150 каждый раз
    }
    expect(m.visible).toBe(false);
    vi.advanceTimersByTime(150);
    expect(m.visible).toBe(true);
    // Переходов в true — ровно один.
    expect(changes.filter((v) => v === true)).toHaveLength(1);
  });
});

describe("ToolbarVisibility: AC#5 — схлопывание выделения скрывает", () => {
  it("пустое выделение до debounce отменяет показ", () => {
    const { m } = makeMachine(150);
    m.selectionChanged(false);
    vi.advanceTimersByTime(100);
    m.selectionChanged(true); // схлопнулось
    vi.advanceTimersByTime(100);
    expect(m.visible).toBe(false); // показа не было
  });

  it("пустое выделение скрывает уже показанную панель", () => {
    const { m } = makeMachine(150);
    m.selectionChanged(false);
    vi.advanceTimersByTime(150);
    expect(m.visible).toBe(true);
    m.selectionChanged(true);
    expect(m.visible).toBe(false);
  });
});

describe("ToolbarVisibility: AC#5 — scroll скрывает", () => {
  it("scroll до показа отменяет ожидающий показ", () => {
    const { m } = makeMachine(150);
    m.selectionChanged(false);
    vi.advanceTimersByTime(100);
    m.scrolled();
    vi.advanceTimersByTime(100);
    expect(m.visible).toBe(false);
  });

  it("scroll скрывает уже показанную панель", () => {
    const { m } = makeMachine(150);
    m.selectionChanged(false);
    vi.advanceTimersByTime(150);
    expect(m.visible).toBe(true);
    m.scrolled();
    expect(m.visible).toBe(false);
  });
});

describe("ToolbarVisibility: AC#5 — blur скрывает", () => {
  it("blur до показа отменяет ожидающий показ", () => {
    const { m } = makeMachine(150);
    m.selectionChanged(false);
    vi.advanceTimersByTime(100);
    m.blurred();
    vi.advanceTimersByTime(100);
    expect(m.visible).toBe(false);
  });

  it("blur скрывает уже показанную панель", () => {
    const { m } = makeMachine(150);
    m.selectionChanged(false);
    vi.advanceTimersByTime(150);
    expect(m.visible).toBe(true);
    m.blurred();
    expect(m.visible).toBe(false);
  });
});

describe("ToolbarVisibility: onChange вызывается только при смене значения", () => {
  it("повторное пустое выделение в скрытом состоянии не дёргает onChange", () => {
    const { m, changes } = makeMachine(150);
    m.selectionChanged(true);
    m.selectionChanged(true);
    m.scrolled();
    m.blurred();
    expect(changes).toEqual([]); // всё время скрыто → ни одного перехода
  });

  it("полный цикл show→hide даёт ровно [true, false]", () => {
    const { m, changes } = makeMachine(150);
    m.selectionChanged(false);
    vi.advanceTimersByTime(150);
    m.blurred();
    expect(changes).toEqual([true, false]);
  });
});

describe("ToolbarVisibility: destroy отменяет ожидающий таймер", () => {
  it("после destroy панель не показывается", () => {
    const { m } = makeMachine(150);
    m.selectionChanged(false);
    vi.advanceTimersByTime(100);
    m.destroy();
    vi.advanceTimersByTime(100);
    expect(m.visible).toBe(false);
  });
});

describe("ToolbarVisibility: внедрённый scheduler используется вместо глобального", () => {
  it("использует переданный scheduler.setTimeout/clearTimeout", () => {
    const setTimeoutSpy = vi.fn((fn: () => void, _ms: number) => {
      // имитируем мгновенный вызов, чтобы проверить путь показа
      void _ms;
      void fn;
      return 42;
    });
    const clearTimeoutSpy = vi.fn();
    const changes: boolean[] = [];
    const m = new ToolbarVisibility({
      onChange: (v) => changes.push(v),
      scheduler: { setTimeout: setTimeoutSpy, clearTimeout: clearTimeoutSpy },
      debounceMs: 150,
    });
    m.selectionChanged(false);
    expect(setTimeoutSpy).toHaveBeenCalledOnce();
    expect(setTimeoutSpy.mock.calls[0][1]).toBe(150); // debounceMs прокинут
    m.scrolled();
    expect(clearTimeoutSpy).toHaveBeenCalledWith(42); // таймер отменён по id
  });
});
