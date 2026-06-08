// src/lib/stores/tabsOps.independent.test.ts
// Независимые тесты для moveTab / closeOthers / closeAll (MDP-19).
// Написаны test-writer'ом без чтения реализации documents.svelte.ts.
//
// Harness-адаптация (НЕ затрагивает ассерты/ожидаемые значения): проект собран
// со strict-конфигом (noUnusedLocals + @typescript-eslint/no-unused-vars).
// Test-writer присваивал результаты openFile в локальные `const a/b/c` ради
// читаемости, но часть из них не используется в expect. Чтобы сохранить тела
// тестов дословно и не уронить CI, неиспользуемые присваивания заменены на
// голые вызовы openFile (побочный эффект — создание вкладки — сохранён).
// Ни один assert и ни одно ожидаемое значение не изменены.

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

type StoreModule = typeof import("./documents.svelte");

function installLocalStoragePolyfill(): void {
  if (typeof window === "undefined") return;
  if (typeof window.localStorage !== "undefined") return;
  const store = new Map<string, string>();
  const polyfill: Storage = {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key: string) =>
      store.has(key) ? (store.get(key) as string) : null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, "localStorage", {
    value: polyfill,
    configurable: true,
    writable: false,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: polyfill,
    configurable: true,
    writable: false,
  });
}

installLocalStoragePolyfill();

async function loadStore(): Promise<StoreModule> {
  vi.resetModules();
  return await import("./documents.svelte");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// moveTab
// ---------------------------------------------------------------------------

describe("moveTab", () => {
  it("AC#1: перемещает вкладку вправо на новую позицию", async () => {
    // AC#1: порядок в getDocuments() отражает toIndex
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    const b = s.openFile("/b.md", "b");
    const c = s.openFile("/c.md", "c");
    // порядок: [a, b, c], переносим a на индекс 2
    s.moveTab(a, 2);
    const ids = s.getDocuments().map((d) => d.id);
    expect(ids).toEqual([b, c, a]); // AC#1
  });

  it("AC#1: перемещает вкладку влево", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    const b = s.openFile("/b.md", "b");
    const c = s.openFile("/c.md", "c");
    // порядок: [a, b, c], переносим c на индекс 0
    s.moveTab(c, 0);
    const ids = s.getDocuments().map((d) => d.id);
    expect(ids).toEqual([c, a, b]); // AC#1
  });

  it("AC#1: перемещает среднюю вкладку на последнюю позицию", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    const b = s.openFile("/b.md", "b");
    const c = s.openFile("/c.md", "c");
    s.moveTab(b, 2);
    const ids = s.getDocuments().map((d) => d.id);
    expect(ids).toEqual([a, c, b]); // AC#1
  });

  it("AC#2: активная вкладка не меняется после переноса активной вкладки", async () => {
    // AC#2: activeId привязан к id, не к индексу
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    s.openFile("/c.md", "c");
    s.setActive(a); // активная — a
    s.moveTab(a, 2);
    expect(s.getActiveId()).toBe(a); // AC#2
  });

  it("AC#2: активная вкладка не меняется при переносе неактивной вкладки", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    const b = s.openFile("/b.md", "b");
    s.openFile("/c.md", "c");
    s.setActive(b); // активная — b
    s.moveTab(a, 2); // переносим неактивную
    expect(s.getActiveId()).toBe(b); // AC#2
  });

  it("AC#3: toIndex === текущему — no-op", async () => {
    // AC#3: вкладка уже на этой позиции — порядок не меняется
    const s = await loadStore();
    s.openFile("/a.md", "a");
    const b = s.openFile("/b.md", "b");
    s.openFile("/c.md", "c");
    const before = s.getDocuments().map((d) => d.id);
    s.moveTab(b, 1); // b уже на позиции 1
    expect(s.getDocuments().map((d) => d.id)).toEqual(before); // AC#3
  });

  it("AC#4: несуществующий id — no-op", async () => {
    // AC#4: неизвестный id не меняет стор
    const s = await loadStore();
    s.openFile("/a.md", "a");
    const b = s.openFile("/b.md", "b");
    const before = s.getDocuments().map((d) => d.id);
    s.moveTab("does-not-exist", 0);
    expect(s.getDocuments().map((d) => d.id)).toEqual(before); // AC#4
    expect(s.getActiveId()).toBe(b); // AC#4: активная не изменилась
  });

  it("AC#5: toIndex < 0 клампится в 0 (первая позиция)", async () => {
    // AC#5: клампинг в [0, length-1]
    const s = await loadStore();
    s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    const c = s.openFile("/c.md", "c");
    s.moveTab(c, -5); // должен встать на позицию 0
    expect(s.getDocuments()[0].id).toBe(c); // AC#5
  });

  it("AC#5: toIndex > length-1 клампится в последнюю позицию", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    s.openFile("/c.md", "c");
    s.moveTab(a, 999); // должен встать на позицию 2 (последнюю)
    const ids = s.getDocuments().map((d) => d.id);
    expect(ids[2]).toBe(a); // AC#5
  });

  it("AC#6: NaN toIndex — no-op", async () => {
    // AC#6: нецелое/NaN → no-op
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    const before = s.getDocuments().map((d) => d.id);
    s.moveTab(a, NaN);
    expect(s.getDocuments().map((d) => d.id)).toEqual(before); // AC#6
  });

  it("AC#6: Infinity toIndex — no-op", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    const before = s.getDocuments().map((d) => d.id);
    s.moveTab(a, Infinity);
    expect(s.getDocuments().map((d) => d.id)).toEqual(before); // AC#6
  });

  it("AC#6: нецелое (дробное) toIndex — no-op", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    const before = s.getDocuments().map((d) => d.id);
    s.moveTab(a, 0.5);
    expect(s.getDocuments().map((d) => d.id)).toEqual(before); // AC#6
  });

  it("edge case: единственная вкладка — moveTab не падает и ничего не меняет", async () => {
    // edge case: список из одного элемента
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.moveTab(a, 0);
    expect(s.getDocuments().map((d) => d.id)).toEqual([a]);
    expect(s.getActiveId()).toBe(a);
  });

  it("edge case: -Infinity toIndex — no-op", async () => {
    // edge case: -Infinity тоже не является конечным целым
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    const before = s.getDocuments().map((d) => d.id);
    s.moveTab(a, -Infinity);
    expect(s.getDocuments().map((d) => d.id)).toEqual(before); // edge case: -Infinity
  });
});

// ---------------------------------------------------------------------------
// closeOthers
// ---------------------------------------------------------------------------

describe("closeOthers", () => {
  it("AC#1: закрывает все вкладки кроме указанной", async () => {
    // AC#1: остаётся ровно одна вкладка с нужным id
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    s.openFile("/c.md", "c");
    s.closeOthers(a);
    expect(s.getDocuments()).toHaveLength(1); // AC#1
    expect(s.getDocuments()[0].id).toBe(a); // AC#1: только a осталась
  });

  it("AC#1: содержимое оставшейся вкладки не изменилось", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "исходный контент");
    s.openFile("/b.md", "b");
    s.openFile("/c.md", "c");
    s.closeOthers(a);
    const doc = s.getDocuments().find((d) => d.id === a);
    expect(doc?.baseline).toBe("исходный контент"); // AC#1: данные целы
  });

  it("AC#1: работает при указании средней вкладки", async () => {
    const s = await loadStore();
    s.openFile("/a.md", "a");
    const b = s.openFile("/b.md", "b");
    s.openFile("/c.md", "c");
    s.closeOthers(b);
    expect(s.getDocuments()).toHaveLength(1);
    expect(s.getDocuments()[0].id).toBe(b); // AC#1
  });

  it("AC#2: id становится активной после closeOthers", async () => {
    // AC#2: id должен стать активным
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    s.openFile("/c.md", "c");
    // активная — c, вызываем closeOthers(a)
    s.closeOthers(a);
    expect(s.getActiveId()).toBe(a); // AC#2
  });

  it("AC#2: id уже активная — активность сохраняется", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    s.setActive(a);
    s.closeOthers(a);
    expect(s.getActiveId()).toBe(a); // AC#2: активная не изменилась
  });

  it("AC#3: несуществующий id — разумное поведение (no-op или без падения)", async () => {
    // AC#3: несуществующий id не вызывает исключения
    const s = await loadStore();
    s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    expect(() => s.closeOthers("ghost-id")).not.toThrow(); // AC#3: не падает
    // стор должен остаться в консистентном состоянии
    expect(s.getDocuments().length).toBeGreaterThan(0); // AC#3: документы не потеряны
    if (s.getActiveId() !== null) {
      const activeStillPresent = s
        .getDocuments()
        .some((d) => d.id === s.getActiveId());
      expect(activeStillPresent).toBe(true); // invariant: activeId ссылается на существующий документ
    }
  });

  it("AC#4: единственная вкладка — no-op", async () => {
    // AC#4: если вкладка одна — стор не меняется
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.closeOthers(a);
    expect(s.getDocuments()).toHaveLength(1); // AC#4
    expect(s.getDocuments()[0].id).toBe(a);
    expect(s.getActiveId()).toBe(a);
  });

  it("edge case: пустой стор — closeOthers не падает", async () => {
    // edge case: нет вкладок вообще
    const s = await loadStore();
    expect(() => s.closeOthers("any-id")).not.toThrow();
    expect(s.getDocuments()).toHaveLength(0);
  });

  it("invariant: после closeOthers activeId ссылается на существующий документ", async () => {
    // invariant: activeId всегда null или присутствует в getDocuments()
    const s = await loadStore();
    s.openFile("/a.md", "a");
    const b = s.openFile("/b.md", "b");
    s.openFile("/c.md", "c");
    s.closeOthers(b);
    const activeId = s.getActiveId();
    if (activeId !== null) {
      expect(s.getDocuments().some((d) => d.id === activeId)).toBe(true); // invariant
    }
  });
});

// ---------------------------------------------------------------------------
// closeAll
// ---------------------------------------------------------------------------

describe("closeAll", () => {
  it("AC#1: getDocuments() пуст после closeAll", async () => {
    // AC#1: список вкладок полностью очищен
    const s = await loadStore();
    s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    s.openFile("/c.md", "c");
    s.closeAll();
    expect(s.getDocuments()).toHaveLength(0); // AC#1
    expect(s.getDocuments()).toEqual([]); // AC#1: именно пустой массив
  });

  it("AC#2: getActiveId() === null после closeAll", async () => {
    // AC#2: нет активной вкладки
    const s = await loadStore();
    s.openFile("/a.md", "a");
    s.closeAll();
    expect(s.getActiveId()).toBeNull(); // AC#2
  });

  it("AC#2: getActive() === null после closeAll", async () => {
    const s = await loadStore();
    s.openFile("/a.md", "a");
    s.closeAll();
    expect(s.getActive()).toBeNull(); // AC#2
  });

  it("AC#1: closeAll работает при наличии единственной вкладки", async () => {
    const s = await loadStore();
    s.createUntitled();
    s.closeAll();
    expect(s.getDocuments()).toHaveLength(0); // AC#1
    expect(s.getActiveId()).toBeNull(); // AC#2
  });

  it("edge case: closeAll на пустом сторе — no-op без падения", async () => {
    // edge case: уже пусто — не должно падать
    const s = await loadStore();
    expect(() => s.closeAll()).not.toThrow();
    expect(s.getDocuments()).toHaveLength(0);
    expect(s.getActiveId()).toBeNull();
  });

  it("edge case: после closeAll можно снова открывать вкладки", async () => {
    // edge case: стор консистентен для дальнейшей работы после очистки
    const s = await loadStore();
    s.openFile("/a.md", "a");
    s.closeAll();
    const id = s.openFile("/b.md", "b");
    expect(s.getDocuments()).toHaveLength(1); // edge case: стор восстановился
    expect(s.getActiveId()).toBe(id);
  });

  it("edge case: closeAll удаляет грязные (несохранённые) вкладки", async () => {
    // edge case: грязные документы тоже должны закрываться
    const s = await loadStore();
    const id = s.openFile("/a.md", "a");
    s.updateBuffer(id, "изменённый контент");
    expect(s.isDirty(id)).toBe(true);
    s.closeAll();
    expect(s.getDocuments()).toHaveLength(0); // edge case: грязный документ закрыт
    expect(s.getActiveId()).toBeNull();
  });

  it("edge case: closeAll удаляет большое количество вкладок", async () => {
    // edge case: много вкладок (проверяем на масштаб)
    const s = await loadStore();
    for (let i = 0; i < 20; i++) {
      s.openFile(`/file-${i}.md`, `content ${i}`);
    }
    expect(s.getDocuments()).toHaveLength(20);
    s.closeAll();
    expect(s.getDocuments()).toHaveLength(0); // edge case: все 20 закрыты
    expect(s.getActiveId()).toBeNull();
  });

  it("invariant: после closeAll getDocuments().length === 0 и activeId === null одновременно", async () => {
    // invariant: оба условия выполняются вместе
    const s = await loadStore();
    s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    s.closeAll();
    const docsEmpty = s.getDocuments().length === 0;
    const activeNull = s.getActiveId() === null;
    expect(docsEmpty && activeNull).toBe(true); // invariant: атомарная согласованность
  });
});

// ---------------------------------------------------------------------------
// Кросс-функциональные инварианты
// ---------------------------------------------------------------------------

describe("инварианты состояния (кросс-операции)", () => {
  it("invariant: activeId всегда null или ссылается на существующий документ — после moveTab", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    s.openFile("/c.md", "c");
    s.setActive(a);
    s.moveTab(a, 2);
    const activeId = s.getActiveId();
    if (activeId !== null) {
      expect(s.getDocuments().some((d) => d.id === activeId)).toBe(true); // invariant
    }
  });

  it("invariant: после closeOthers длина всегда равна 1 (если id существовал)", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    s.openFile("/c.md", "c");
    s.openFile("/d.md", "d");
    s.closeOthers(a);
    expect(s.getDocuments()).toHaveLength(1); // invariant
  });

  it("invariant: moveTab не меняет количество документов", async () => {
    const s = await loadStore();
    s.openFile("/a.md", "a");
    s.openFile("/b.md", "b");
    s.openFile("/c.md", "c");
    const before = s.getDocuments().length;
    const a = s.getDocuments()[0].id;
    s.moveTab(a, 2);
    expect(s.getDocuments().length).toBe(before); // invariant: количество не меняется
  });

  it("invariant: moveTab не теряет и не дублирует id документов", async () => {
    const s = await loadStore();
    const a = s.openFile("/a.md", "a");
    const b = s.openFile("/b.md", "b");
    const c = s.openFile("/c.md", "c");
    const idsBefore = new Set([a, b, c]);
    s.moveTab(a, 2);
    const idsAfter = new Set(s.getDocuments().map((d) => d.id));
    expect(idsAfter).toEqual(idsBefore); // invariant: те же id, ни потерь, ни дублей
  });
});
