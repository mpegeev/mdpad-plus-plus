import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn()", () => {
  it("объединяет простые классы через пробел", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("принимает массивы и условные объекты (clsx)", () => {
    expect(cn(["foo", "bar"], { baz: true, qux: false })).toBe("foo bar baz");
  });

  it("игнорирует falsy-значения (null, undefined, false, 0, '')", () => {
    expect(cn("foo", null, undefined, false, 0, "", "bar")).toBe("foo bar");
  });

  it("возвращает пустую строку для полностью falsy-входа", () => {
    expect(cn(null, undefined, false, "")).toBe("");
  });

  it("разрешает конфликт Tailwind-классов отступов: выигрывает последний (p-4 > p-2)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("разрешает конфликт цветов фона: выигрывает последний", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("сохраняет неконфликтующие классы при мерже", () => {
    expect(cn("p-2 text-sm", "p-4")).toBe("text-sm p-4");
  });

  it("работает с условным переопределением через объект", () => {
    expect(cn("p-2", { "p-4": true })).toBe("p-4");
  });

  it("дедуплицирует конфликтующие Tailwind-классы, оставляя последний", () => {
    expect(cn("text-sm", "text-sm", "text-lg")).toBe("text-lg");
  });
});
