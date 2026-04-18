import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import Icon from "./Icon.svelte";

describe("Icon.svelte", () => {
  it("рендерит корневой <svg> для известной иконки", () => {
    const { container } = render(Icon, { props: { name: "file-text" } });
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("рендерит <path>-элементы иконки file-text", () => {
    const { container } = render(Icon, { props: { name: "file-text" } });
    const paths = container.querySelectorAll("svg > path");
    expect(paths.length).toBeGreaterThan(0);
  });

  it("рендерит <circle> для иконки settings (смешанные теги)", () => {
    const { container } = render(Icon, { props: { name: "settings" } });
    const circle = container.querySelector("svg > circle");
    expect(circle).not.toBeNull();
  });

  it("применяет проп size к width/height", () => {
    const { container } = render(Icon, {
      props: { name: "file-text", size: 24 },
    });
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("24");
    expect(svg?.getAttribute("height")).toBe("24");
  });

  it("по умолчанию size=16", () => {
    const { container } = render(Icon, { props: { name: "file-text" } });
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("16");
    expect(svg?.getAttribute("height")).toBe("16");
  });

  it("прокидывает class на корневой <svg>", () => {
    const { container } = render(Icon, {
      props: { name: "file-text", class: "text-red-500 w-5" },
    });
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("text-red-500");
    expect(svg?.getAttribute("class")).toContain("w-5");
  });

  it("fallback: неизвестное имя не падает, рендерит пустой <svg> без детей-путей", () => {
    const { container } = render(Icon, {
      // @ts-expect-error — намеренно передаём несуществующее имя, проверяем fallback
      props: { name: "nonexistent-icon" },
    });
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(
      svg?.querySelectorAll(
        "path, circle, rect, line, polyline, polygon, ellipse",
      ).length,
    ).toBe(0);
  });
});
