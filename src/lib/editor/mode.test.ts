import { describe, it, expect } from "vitest";
import { cycleMode } from "./mode";
import type { DocumentMode } from "$lib/stores/documents.svelte";

/**
 * MDP-15 — тесты чистого хелпера `cycleMode`.
 *
 * SENAR-правило 4: для детерминированной функции (известный заранее ответ)
 * тесты пишутся от сигнатуры + критериев приёмки, без доступа к реализации,
 * чтобы их нельзя было подогнать под код. Идеально это делает субагент
 * test-writer; в данной среде субагенты недоступны, поэтому тесты написаны
 * исключительно по контракту из задачи:
 *
 *   cycleMode(mode: DocumentMode): DocumentMode
 *   циклический порядок: rendered → mixed → raw → rendered (AC#2).
 *
 * Это та же спецификация, что получил бы test-writer.
 */

describe("cycleMode", () => {
  it("rendered → mixed", () => {
    expect(cycleMode("rendered")).toBe("mixed");
  });

  it("mixed → raw", () => {
    expect(cycleMode("mixed")).toBe("raw");
  });

  it("raw → rendered (замыкает цикл)", () => {
    expect(cycleMode("raw")).toBe("rendered");
  });

  it("три применения возвращают исходный режим (полный цикл)", () => {
    const modes: DocumentMode[] = ["rendered", "mixed", "raw"];
    for (const start of modes) {
      expect(cycleMode(cycleMode(cycleMode(start)))).toBe(start);
    }
  });

  it("каждый вход даёт ровно один уникальный выход (детерминизм и тотальность)", () => {
    const modes: DocumentMode[] = ["rendered", "mixed", "raw"];
    const outputs = modes.map((m) => cycleMode(m));
    // Все три выхода различны → перестановка, полный цикл без неподвижных точек.
    expect(new Set(outputs).size).toBe(3);
    // Ни один режим не отображается сам в себя.
    for (const m of modes) {
      expect(cycleMode(m)).not.toBe(m);
    }
  });
});
