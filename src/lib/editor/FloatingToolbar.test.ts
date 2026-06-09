/**
 * MDP-16 — тесты компонента `FloatingToolbar.svelte`.
 *
 * Проверяем поведение оболочки (AC#1, AC#3, частично AC#4/AC#5 через пропсы):
 *   - рендерится как role="toolbar";
 *   - кнопки icon-only с обязательным aria-label (AC#3);
 *   - visible управляет видимостью/доступностью (aria-hidden, tabindex);
 *   - position прокидывается в inline-стиль (пиксели — best-effort, проверяем
 *     лишь, что значения доходят до DOM);
 *   - onAction вызывается с корректным намерением; без onAction не падает
 *     (fail-safe). Логика форматирования — MDP-17.
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import FloatingToolbar from "./FloatingToolbar.svelte";

const ACTIONS = ["bold", "italic", "underline", "code", "code-fence"] as const;

describe("FloatingToolbar.svelte: структура (AC#1, AC#3)", () => {
  it("AC#1: рендерит панель с role=toolbar и aria-label", () => {
    const { getByRole } = render(FloatingToolbar, { props: { visible: true } });
    const toolbar = getByRole("toolbar");
    expect(toolbar).not.toBeNull();
    expect(toolbar.getAttribute("aria-label")).toBeTruthy();
  });

  it("AC#3: каждая кнопка — только иконка с непустым aria-label (без текста)", () => {
    const { getByRole } = render(FloatingToolbar, { props: { visible: true } });
    const toolbar = getByRole("toolbar");
    const buttons = toolbar.querySelectorAll("button");
    expect(buttons.length).toBe(ACTIONS.length);
    for (const btn of Array.from(buttons)) {
      const label = btn.getAttribute("aria-label");
      expect(label).toBeTruthy();
      // Только иконка: внутри svg, без видимого текстового узла.
      expect(btn.querySelector("svg")).not.toBeNull();
      expect((btn.textContent ?? "").trim()).toBe("");
    }
  });

  it("AC#3: содержит кнопки для всех пяти намерений форматирования", async () => {
    const onAction = vi.fn();
    const { getByRole } = render(FloatingToolbar, {
      props: { visible: true, onAction },
    });
    const buttons = Array.from(getByRole("toolbar").querySelectorAll("button"));
    for (const btn of buttons) {
      (btn as HTMLButtonElement).click();
    }
    await tick();
    const fired = onAction.mock.calls.map((c) => c[0]);
    for (const a of ACTIONS) {
      expect(fired).toContain(a);
    }
  });
});

describe("FloatingToolbar.svelte: видимость (AC#5 через проп)", () => {
  it("по умолчанию (visible не задан) панель скрыта: aria-hidden=true", () => {
    const { getByRole } = render(FloatingToolbar, {});
    const toolbar = getByRole("toolbar", { hidden: true });
    expect(toolbar.getAttribute("aria-hidden")).toBe("true");
  });

  it("visible=true → aria-hidden=false и кнопки в табуляции", () => {
    const { getByRole } = render(FloatingToolbar, { props: { visible: true } });
    const toolbar = getByRole("toolbar");
    expect(toolbar.getAttribute("aria-hidden")).toBe("false");
    const buttons = toolbar.querySelectorAll("button");
    for (const btn of Array.from(buttons)) {
      expect(btn.getAttribute("tabindex")).toBe("0");
    }
  });

  it("visible=false → кнопки убраны из табуляции (tabindex=-1)", () => {
    const { getByRole } = render(FloatingToolbar, {
      props: { visible: false },
    });
    const toolbar = getByRole("toolbar", { hidden: true });
    const buttons = toolbar.querySelectorAll("button");
    for (const btn of Array.from(buttons)) {
      expect(btn.getAttribute("tabindex")).toBe("-1");
    }
  });
});

describe("FloatingToolbar.svelte: позиция (AC#4, best-effort)", () => {
  it("прокидывает position в inline-стиль панели", () => {
    const { getByRole } = render(FloatingToolbar, {
      props: { visible: true, position: { x: 123, y: 45 } },
    });
    const style = getByRole("toolbar").getAttribute("style") ?? "";
    expect(style).toContain("123px");
    expect(style).toContain("45px");
  });
});

describe("FloatingToolbar.svelte: onAction", () => {
  it("клик по кнопке вызывает onAction с её намерением", async () => {
    const onAction = vi.fn();
    const { getByLabelText } = render(FloatingToolbar, {
      props: { visible: true, onAction },
    });
    // aria-label «Полужирный» = bold (см. компонент).
    (getByLabelText("Полужирный") as HTMLButtonElement).click();
    await tick();
    expect(onAction).toHaveBeenCalledWith("bold");
  });

  it("без onAction клик не вызывает ошибку (fail-safe)", async () => {
    const { getByRole } = render(FloatingToolbar, { props: { visible: true } });
    const btn = getByRole("toolbar").querySelector(
      "button",
    ) as HTMLButtonElement;
    expect(() => btn.click()).not.toThrow();
  });
});

describe("FloatingToolbar.svelte: onMeasure (MDP-48)", () => {
  it("вызывает onMeasure на монтаже с числовыми width/height", async () => {
    const onMeasure = vi.fn();
    render(FloatingToolbar, { props: { visible: false, onMeasure } });
    await tick();
    expect(onMeasure).toHaveBeenCalled();
    const size = onMeasure.mock.calls.at(-1)?.[0];
    // jsdom не делает layout (offset* === 0), поэтому проверяем КОНТРАКТ
    // вызова, а не конкретные пиксели: оба поля — числа.
    expect(typeof size.width).toBe("number");
    expect(typeof size.height).toBe("number");
  });

  it("без onMeasure монтаж не вызывает ошибку (fail-safe)", () => {
    expect(() =>
      render(FloatingToolbar, { props: { visible: false } }),
    ).not.toThrow();
  });
});
