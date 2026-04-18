import { describe, it, expect } from "vitest";
import {
  clampSidebarWidth,
  SIDEBAR_MIN,
  SIDEBAR_MAX,
  SIDEBAR_DEFAULT,
} from "./clampSidebarWidth";

describe("clampSidebarWidth", () => {
  it("returns the value unchanged when inside [min,max]", () => {
    expect(clampSidebarWidth(SIDEBAR_DEFAULT)).toBe(SIDEBAR_DEFAULT);
    expect(clampSidebarWidth(300)).toBe(300);
  });

  it("clamps to min when below range", () => {
    expect(clampSidebarWidth(100)).toBe(SIDEBAR_MIN);
    expect(clampSidebarWidth(0)).toBe(SIDEBAR_MIN);
    expect(clampSidebarWidth(-50)).toBe(SIDEBAR_MIN);
  });

  it("clamps to max when above range", () => {
    expect(clampSidebarWidth(600)).toBe(SIDEBAR_MAX);
    expect(clampSidebarWidth(10_000)).toBe(SIDEBAR_MAX);
  });

  it("accepts exact boundaries", () => {
    expect(clampSidebarWidth(SIDEBAR_MIN)).toBe(SIDEBAR_MIN);
    expect(clampSidebarWidth(SIDEBAR_MAX)).toBe(SIDEBAR_MAX);
  });

  it("falls back to min on NaN", () => {
    expect(clampSidebarWidth(Number.NaN)).toBe(SIDEBAR_MIN);
  });

  it("respects custom bounds", () => {
    expect(clampSidebarWidth(50, 100, 200)).toBe(100);
    expect(clampSidebarWidth(250, 100, 200)).toBe(200);
    expect(clampSidebarWidth(150, 100, 200)).toBe(150);
  });
});
