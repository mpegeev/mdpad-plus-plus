/**
 * Независимые тесты для MDP-15: cycleMode.
 * Написаны агентом test-writer по контракту, критериям приёмки и сигнатурам.
 * Реализация (mode.ts) не читалась намеренно — структурная защита SENAR.
 *
 * Покрывает:
 *   - каждый из трёх переходов: rendered→mixed, mixed→raw, raw→rendered
 *   - полный цикл из трёх применений возвращает исходное значение
 *   - тотальность функции (определена на всех трёх значениях типа)
 */

import { describe, it, expect } from "vitest";
import { cycleMode } from "./mode";
import type { DocumentMode } from "$lib/stores/documents.svelte";

describe("cycleMode", () => {
  it("AC: rendered переходит в mixed", () => {
    expect(cycleMode("rendered")).toBe("mixed"); // AC#1
  });

  it("AC: mixed переходит в raw", () => {
    expect(cycleMode("mixed")).toBe("raw"); // AC#2
  });

  it("AC: raw переходит в rendered", () => {
    expect(cycleMode("raw")).toBe("rendered"); // AC#3
  });

  it("AC: три применения возвращают исходное — старт rendered", () => {
    const start: DocumentMode = "rendered";
    expect(cycleMode(cycleMode(cycleMode(start)))).toBe(start);
  });

  it("AC: три применения возвращают исходное — старт mixed", () => {
    const start: DocumentMode = "mixed";
    expect(cycleMode(cycleMode(cycleMode(start)))).toBe(start);
  });

  it("AC: три применения возвращают исходное — старт raw", () => {
    const start: DocumentMode = "raw";
    expect(cycleMode(cycleMode(cycleMode(start)))).toBe(start);
  });

  it("AC: тотальность — cycleMode возвращает DocumentMode для rendered", () => {
    const result = cycleMode("rendered");
    expect(["rendered", "mixed", "raw"]).toContain(result);
  });

  it("AC: тотальность — cycleMode возвращает DocumentMode для mixed", () => {
    const result = cycleMode("mixed");
    expect(["rendered", "mixed", "raw"]).toContain(result);
  });

  it("AC: тотальность — cycleMode возвращает DocumentMode для raw", () => {
    const result = cycleMode("raw");
    expect(["rendered", "mixed", "raw"]).toContain(result);
  });

  it("edge case: rendered не переходит сразу в raw (минуя mixed)", () => {
    expect(cycleMode("rendered")).not.toBe("raw");
  });

  it("edge case: mixed не переходит обратно в rendered (регресс)", () => {
    expect(cycleMode("mixed")).not.toBe("rendered");
  });

  it("edge case: raw не переходит в mixed (минуя rendered)", () => {
    expect(cycleMode("raw")).not.toBe("mixed");
  });

  it("invariant: rendered → mixed → raw (два шага)", () => {
    expect(cycleMode(cycleMode("rendered"))).toBe("raw");
  });

  it("invariant: mixed → raw → rendered (два шага)", () => {
    expect(cycleMode(cycleMode("mixed"))).toBe("rendered");
  });

  it("invariant: raw → rendered → mixed (два шага)", () => {
    expect(cycleMode(cycleMode("raw"))).toBe("mixed");
  });
});
