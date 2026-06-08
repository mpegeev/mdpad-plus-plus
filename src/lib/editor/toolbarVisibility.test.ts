/**
 * Независимые тесты для MDP-16: ToolbarVisibility.
 *
 * Написаны агентом test-writer ТОЛЬКО по контракту и критериям приёмки.
 * Реализация (toolbarVisibility.ts) не читалась — структурная защита SENAR-правила 4.
 *
 * Сигнатуры:
 *   interface Scheduler { setTimeout(fn:()=>void, ms:number):number; clearTimeout(id:number):void }
 *   interface VisibilityDeps { onChange:(visible:boolean)=>void; scheduler?:Scheduler; debounceMs?:number }
 *   class ToolbarVisibility {
 *     constructor(deps: VisibilityDeps)
 *     get visible(): boolean
 *     selectionChanged(empty: boolean): void
 *     scrolled(): void
 *     blurred(): void
 *     destroy(): void
 *   }
 *
 * Семантика:
 *   - selectionChanged(false) → перезапускает debounce; по истечении: onChange(true), visible=true
 *   - selectionChanged(true), scrolled(), blurred() → НЕМЕДЛЕННО скрывают (отменяют таймер,
 *     onChange(false), visible=false) — только если было видно
 *   - onChange вызывается только при смене значения
 *   - debounceMs по умолчанию 150
 *   - destroy() отменяет таймер
 *
 * Фейковый scheduler позволяет детерминированно управлять временем.
 */

import { describe, it, expect } from "vitest";
import { ToolbarVisibility } from "./toolbarVisibility";
import type { Scheduler, VisibilityDeps } from "./toolbarVisibility";

// ---------------------------------------------------------------------------
// Фейковый scheduler с ручным продвижением времени
// ---------------------------------------------------------------------------

interface FakeTimer {
  id: number;
  fn: () => void;
  ms: number;
  cancelled: boolean;
}

function makeFakeScheduler(): Scheduler & {
  /** Выполнить все таймеры, чьё время <= now. */
  tick(ms: number): void;
  /** Сбросить внутренние часы и очередь. */
  reset(): void;
  pendingCount(): number;
} {
  let now = 0;
  let nextId = 1;
  const timers: FakeTimer[] = [];

  return {
    setTimeout(fn, ms) {
      const id = nextId++;
      timers.push({ id, fn, ms: now + ms, cancelled: false });
      return id;
    },
    clearTimeout(id) {
      const t = timers.find((x) => x.id === id);
      if (t) t.cancelled = true;
    },
    tick(ms) {
      now += ms;
      // Запускаем только не-отменённые с дедлайном <= now (копия, чтобы избежать мутации при итерации)
      const toRun = timers.filter((t) => !t.cancelled && t.ms <= now);
      for (const t of toRun) {
        t.cancelled = true; // помечаем выполненным
        t.fn();
      }
    },
    reset() {
      now = 0;
      nextId = 1;
      timers.length = 0;
    },
    pendingCount() {
      return timers.filter((t) => !t.cancelled).length;
    },
  };
}

// ---------------------------------------------------------------------------
// Вспомогательная фабрика
// ---------------------------------------------------------------------------

function makeVisibility(
  overrides: Partial<VisibilityDeps> = {},
  scheduler = makeFakeScheduler(),
) {
  const calls: boolean[] = [];
  const onChange = (v: boolean) => calls.push(v);
  const deps: VisibilityDeps = {
    onChange,
    scheduler,
    debounceMs: 150,
    ...overrides,
  };
  const tv = new ToolbarVisibility(deps);
  return { tv, calls, scheduler };
}

// ===========================================================================
// 1. Показ ровно после debounce
// ===========================================================================

describe("ToolbarVisibility: показ после debounce", () => {
  it("AC: visible=false до истечения debounce", () => {
    // AC: сразу после selectionChanged(false) тулбар ещё не виден
    const { tv, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    expect(tv.visible).toBe(false); // AC: debounce не истёк
    scheduler.tick(149);
    expect(tv.visible).toBe(false); // AC: 149ms недостаточно
  });

  it("AC: visible=true ровно после debounceMs", () => {
    // AC: после истечения 150ms тулбар становится видимым
    const { tv, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(150);
    expect(tv.visible).toBe(true); // AC: debounce истёк → visible=true
  });

  it("AC: onChange(true) вызван ровно один раз после debounce", () => {
    // AC: onChange вызывается при смене значения false→true
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(150);
    expect(calls).toEqual([true]); // AC: ровно один вызов onChange(true)
  });

  it("AC: кастомный debounceMs=50 работает с правильным таймингом", () => {
    // AC: кастомный debounceMs применяется
    const { tv, calls, scheduler } = makeVisibility({ debounceMs: 50 });
    tv.selectionChanged(false);
    scheduler.tick(49);
    expect(tv.visible).toBe(false); // AC: 49ms недостаточно
    scheduler.tick(1); // итого 50ms
    expect(tv.visible).toBe(true); // AC: ровно 50ms → видим
    expect(calls).toEqual([true]);
  });

  it("AC: дефолтный debounceMs=150 используется без явного указания", () => {
    // AC: дефолт debounceMs=150
    const sched = makeFakeScheduler();
    const calls: boolean[] = [];
    const tv = new ToolbarVisibility({
      onChange: (v) => calls.push(v),
      scheduler: sched,
    });
    tv.selectionChanged(false);
    sched.tick(149);
    expect(calls).toEqual([]); // AC: 149ms — ещё не вызван
    sched.tick(1);
    expect(calls).toEqual([true]); // AC: дефолт 150ms
  });
});

// ===========================================================================
// 2. Быстрые повторные selectionChanged(false) → один показ
// ===========================================================================

describe("ToolbarVisibility: перезапуск debounce при быстрых событиях", () => {
  it("AC: повторный selectionChanged(false) сбрасывает таймер, tick 150 от последнего → показ", () => {
    // AC: debounce перезапускается при каждом селекшне
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(100); // 100ms: таймер ещё не истёк
    tv.selectionChanged(false); // перезапуск
    scheduler.tick(100); // ещё 100ms от первого, но только 100ms от второго
    expect(tv.visible).toBe(false); // AC: второй таймер ещё идёт
    expect(calls).toEqual([]); // AC: onChange не вызван
    scheduler.tick(50); // итого 150ms от второго
    expect(tv.visible).toBe(true); // AC: только теперь показ
    expect(calls).toEqual([true]); // AC: ровно один onChange(true)
  });

  it("AC: три быстрых selectionChanged(false) → один onChange(true)", () => {
    // AC: несколько быстрых событий суммируются в один debounce
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    tv.selectionChanged(false);
    tv.selectionChanged(false);
    scheduler.tick(150);
    expect(calls).toEqual([true]); // AC: ровно один вызов
  });

  it("AC: pending таймеров ровно 1 после серии selectionChanged(false)", () => {
    // AC: нет накопления таймеров
    const { tv, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    tv.selectionChanged(false);
    tv.selectionChanged(false);
    expect(scheduler.pendingCount()).toBe(1); // AC: один активный таймер
  });
});

// ===========================================================================
// 3. scroll / blur / схлопывание — немедленное скрытие
// ===========================================================================

describe("ToolbarVisibility: немедленное скрытие", () => {
  it("AC: scrolled() при видимом тулбаре → visible=false сразу", () => {
    // AC: scroll скрывает видимый тулбар немедленно
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(150); // сделали видимым
    expect(tv.visible).toBe(true);
    tv.scrolled();
    expect(tv.visible).toBe(false); // AC: немедленное скрытие
    expect(calls).toEqual([true, false]); // AC: onChange(false)
  });

  it("AC: blurred() при видимом тулбаре → visible=false сразу", () => {
    // AC: blur скрывает видимый тулбар немедленно
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(150);
    tv.blurred();
    expect(tv.visible).toBe(false); // AC: немедленное скрытие
    expect(calls).toEqual([true, false]);
  });

  it("AC: selectionChanged(true) при видимом тулбаре → visible=false сразу", () => {
    // AC: пустое выделение скрывает тулбар немедленно
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(150);
    tv.selectionChanged(true);
    expect(tv.visible).toBe(false); // AC: немедленное скрытие
    expect(calls).toEqual([true, false]);
  });

  it("AC: scrolled() отменяет ожидающий таймер debounce", () => {
    // AC: scroll прерывает запущенный debounce-таймер
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(100); // таймер идёт
    tv.scrolled();
    scheduler.tick(100); // ещё 100ms — таймер должен быть отменён
    expect(tv.visible).toBe(false); // AC: таймер отменён, не показался
    expect(calls).toEqual([]); // AC: onChange не вызван (никогда не был виден)
  });

  it("AC: selectionChanged(true) отменяет ожидающий таймер", () => {
    // AC: пустое выделение прерывает debounce
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(100);
    tv.selectionChanged(true);
    scheduler.tick(100);
    expect(tv.visible).toBe(false); // AC: таймер отменён
    expect(calls).toEqual([]); // AC: onChange не вызван
  });

  it("AC: blurred() отменяет ожидающий таймер debounce", () => {
    // AC: blur прерывает debounce
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(100);
    tv.blurred();
    scheduler.tick(100);
    expect(tv.visible).toBe(false); // AC: таймер отменён
    expect(calls).toEqual([]); // AC: onChange не вызван
  });
});

// ===========================================================================
// 4. onChange не дёргается повторно одинаковым значением
// ===========================================================================

describe("ToolbarVisibility: onChange только при смене значения", () => {
  it("AC: повторный scroll при уже скрытом — onChange не вызван", () => {
    // AC: нет дублирующих onChange(false) когда уже false
    const { tv, calls } = makeVisibility();
    // visible изначально false
    tv.scrolled();
    expect(calls).toEqual([]); // AC: нет лишнего onChange
  });

  it("AC: повторный blurred при уже скрытом — onChange не вызван", () => {
    // AC: нет дублирующих onChange(false)
    const { tv, calls } = makeVisibility();
    tv.blurred();
    expect(calls).toEqual([]); // AC: нет вызова
  });

  it("AC: selectionChanged(true) при уже скрытом — onChange не вызван", () => {
    // AC: пустое выделение при скрытом тулбаре не генерирует onChange
    const { tv, calls } = makeVisibility();
    tv.selectionChanged(true);
    expect(calls).toEqual([]); // AC: нет вызова
  });

  it("AC: показался, скрылся, снова скрылся (scroll) — onChange(false) ровно один раз", () => {
    // AC: двойное скрытие не дублирует onChange
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(150); // visible=true
    tv.scrolled(); // onChange(false)
    tv.scrolled(); // повторный scroll — не должен вызвать onChange снова
    expect(calls).toEqual([true, false]); // AC: ровно два вызова, не три
  });

  it("AC: показался, потом снова selectionChanged(false) + debounce → onChange(true) один раз", () => {
    // AC: после скрытия и повторного селекшна onChange(true) вызван ровно раз
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(150); // visible=true, onChange(true)
    tv.selectionChanged(false);
    scheduler.tick(150); // visible=true снова, но onChange не должен дублироваться
    // visible уже true → onChange не вызывается повторно
    expect(calls).toEqual([true]); // AC: onChange(true) ровно один раз за весь сеанс видимости
  });

  it("AC: показался, скрылся, показался снова → onChange вызван [true, false, true]", () => {
    // AC: корректная последовательность после полного цикла show/hide/show
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(150);
    tv.scrolled();
    tv.selectionChanged(false);
    scheduler.tick(150);
    expect(calls).toEqual([true, false, true]); // AC: полный цикл
  });
});

// ===========================================================================
// 5. destroy() отменяет таймер
// ===========================================================================

describe("ToolbarVisibility: destroy()", () => {
  it("AC: destroy() при ожидающем таймере — таймер отменяется", () => {
    // AC: destroy прекращает ожидающий debounce
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    tv.destroy();
    scheduler.tick(200); // таймер уже отменён
    expect(tv.visible).toBe(false); // AC: не стал видимым
    expect(calls).toEqual([]); // AC: onChange не вызван
  });

  it("AC: destroy() при видимом тулбаре — не вызывает onChange(false)", () => {
    // AC: destroy не генерирует лишних onChange (только очистка)
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(150); // visible=true
    tv.destroy();
    expect(calls).toEqual([true]); // AC: только исходный onChange(true), без onChange(false)
  });

  it("AC: destroy() без активного таймера — не бросает ошибку", () => {
    // AC: destroy безопасен при отсутствии таймера
    const { tv } = makeVisibility();
    expect(() => tv.destroy()).not.toThrow(); // AC: нет ошибки
  });

  it("AC: destroy() после отмены таймера через scroll — двойная отмена безопасна", () => {
    // AC: destroy идемпотентен
    const { tv, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(100);
    tv.scrolled(); // уже отменил таймер
    expect(() => tv.destroy()).not.toThrow(); // AC: нет ошибки при двойной отмене
  });

  it("AC: количество ожидающих таймеров = 0 после destroy()", () => {
    // AC: destroy очищает таймер
    const { tv, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    tv.destroy();
    expect(scheduler.pendingCount()).toBe(0); // AC: нет активных таймеров
  });
});

// ===========================================================================
// 6. Начальное состояние
// ===========================================================================

describe("ToolbarVisibility: начальное состояние", () => {
  it("AC: visible=false сразу после конструктора", () => {
    // AC: тулбар изначально скрыт
    const { tv } = makeVisibility();
    expect(tv.visible).toBe(false); // AC: начальный false
  });

  it("AC: onChange не вызван сразу после конструктора", () => {
    // AC: конструктор не инициирует onChange
    const { calls } = makeVisibility();
    expect(calls).toEqual([]); // AC: нет начальных вызовов
  });
});

// ===========================================================================
// 7. Edge cases
// ===========================================================================

describe("ToolbarVisibility: edge cases", () => {
  it("edge case: selectionChanged(false) сразу после destroy — не вызывает ошибку", () => {
    // edge case: использование после destroy
    const { tv } = makeVisibility();
    tv.destroy();
    expect(() => tv.selectionChanged(false)).not.toThrow();
  });

  it("edge case: debounceMs=0 — показ происходит синхронно при tick(0)", () => {
    // edge case: нулевой debounce (мгновенный показ)
    const { tv, calls, scheduler } = makeVisibility({ debounceMs: 0 });
    tv.selectionChanged(false);
    scheduler.tick(0);
    expect(tv.visible).toBe(true); // edge case: debounceMs=0 → мгновенно
    expect(calls).toEqual([true]);
  });

  it("edge case: scroll до первого selectionChanged — тулбар остаётся скрытым, нет ошибки", () => {
    // edge case: scroll без предшествующего выделения
    const { tv, calls } = makeVisibility();
    expect(() => tv.scrolled()).not.toThrow();
    expect(tv.visible).toBe(false); // edge case: не было показа
    expect(calls).toEqual([]); // edge case: нет onChange
  });

  it("edge case: многократный selectionChanged(false/true) в чередовании — корректное состояние", () => {
    // edge case: частое переключение выделения
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(50);
    tv.selectionChanged(true); // отменяем
    tv.selectionChanged(false); // снова начинаем
    scheduler.tick(50);
    tv.selectionChanged(false); // перезапускаем
    scheduler.tick(150);
    expect(tv.visible).toBe(true); // edge case: после debounce показался
    expect(calls).toEqual([true]); // edge case: ровно один onChange(true)
  });

  it("edge case: blurred и scroll в цепочке при видимом тулбаре — одно onChange(false)", () => {
    // edge case: несколько событий скрытия подряд
    const { tv, calls, scheduler } = makeVisibility();
    tv.selectionChanged(false);
    scheduler.tick(150);
    tv.blurred();
    tv.scrolled(); // тулбар уже скрыт
    expect(calls).toEqual([true, false]); // edge case: только одно onChange(false)
  });

  it("edge case: только onChange предоставлен (без scheduler и debounceMs) — нет ошибки при операциях", () => {
    // edge case: минимальная конфигурация без scheduler — если реализация использует globalThis.setTimeout
    // Проверяем только что объект создаётся и методы вызываются без ошибки
    const calls: boolean[] = [];
    let tv: ToolbarVisibility | undefined;
    expect(() => {
      tv = new ToolbarVisibility({ onChange: (v) => calls.push(v) });
    }).not.toThrow(); // edge case: минимальная конструкция
    expect(() => tv!.selectionChanged(true)).not.toThrow();
    expect(() => tv!.scrolled()).not.toThrow();
    expect(() => tv!.blurred()).not.toThrow();
    expect(() => tv!.destroy()).not.toThrow();
  });
});
