/**
 * Тесты ретро-ревью по смерженным MDP-14 и MDP-15 (follow-up).
 *
 * Закрывают находки SENAR-ревью:
 *  - MDP-15 / MEDIUM: `mixedModeExtension` читал `rawBlockField` требовательно —
 *    при reconfigure-транзакции без поля в startState CM6 бросал «Field is not
 *    present». Здесь — поведение: extender корректно работает, когда поле
 *    отсутствует в startState (безопасное чтение с фолбэком на null).
 *  - MDP-14 / RISK-1 (LOW): `rawBlockBlurHandler` не должен диспатчить в
 *    отсоединённый от DOM view (fail-closed по `view.dom.isConnected`).
 *  - MDP-14 / RISK-2 (AC#3): дешёвая инспекция темы — `.cm-md-block` анимирует
 *    только opacity, без all/height.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  inlineRender,
  mixedModeExtension,
  rawBlockField,
  setRawBlock,
  inlineRenderThemeSpec,
  __clearRenderCache,
} from "./inlineRender";
import { parseBlocks } from "$lib/markdown/blocks";

beforeEach(() => {
  __clearRenderCache();
});

const TWO_BLOCKS = ["# Заголовок", "", "Абзац текста."].join("\n");

// ---------------------------------------------------------------------------
// MDP-15: безопасное чтение rawBlockField в mixedModeExtension
// ---------------------------------------------------------------------------

describe("mixedModeExtension: чтение поля при reconfigure (MDP-15)", () => {
  it("не бросает «Field is not present», когда rawBlockField отсутствует в startState", () => {
    // startState БЕЗ полей inline-рендера: только mixed-extender. Это и есть
    // ситуация reconfigure, когда startState ещё не содержит rawBlockField.
    const startState = EditorState.create({
      doc: TWO_BLOCKS,
      extensions: [mixedModeExtension()],
    });

    // Транзакция со сменой селекции (docChanged тоже триггерил бы extender).
    // Без фикса требовательное чтение startState.field(rawBlockField) бросило бы.
    expect(() => startState.update({ selection: { anchor: 1 } })).not.toThrow();
  });

  it("при отсутствии поля в startState вычисляет nextRaw от каретки и добавляет setRawBlock", () => {
    const startState = EditorState.create({
      doc: TWO_BLOCKS,
      extensions: [mixedModeExtension()],
    });
    const blocks = parseBlocks(TWO_BLOCKS);

    // Каретка во втором блоке → extender должен предложить setRawBlock(block.from),
    // т.к. currentRaw (фолбэк null) !== nextRaw.
    const tr = startState.update({
      selection: { anchor: blocks[1].from + 1 },
    });

    const effects = tr.effects.filter((e) => e.is(setRawBlock));
    expect(effects.length).toBe(1);
    expect(effects[0].value).toBe(blocks[1].from);
  });

  it("совместно с полным inline-рендером: смена селекции переносит raw на блок под кареткой", () => {
    const state = EditorState.create({
      doc: TWO_BLOCKS,
      extensions: [inlineRender(), mixedModeExtension()],
    });
    const blocks = parseBlocks(TWO_BLOCKS);

    const next = state.update({
      selection: { anchor: blocks[1].from + 1 },
    }).state;

    expect(next.field(rawBlockField)).toBe(blocks[1].from);
  });
});

// ---------------------------------------------------------------------------
// MDP-14 RISK-1: blur не диспатчит в отсоединённый view
// ---------------------------------------------------------------------------

describe("rawBlockBlurHandler: fail-closed для отсоединённого view (MDP-14)", () => {
  function mountView(): { view: EditorView; parent: HTMLElement } {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: TWO_BLOCKS,
        extensions: [inlineRender()],
      }),
    });
    return { view, parent };
  }

  function blur(view: EditorView, related: EventTarget | null = null): void {
    view.contentDOM.dispatchEvent(
      new FocusEvent("blur", { bubbles: true, relatedTarget: related }),
    );
  }

  it("в подключённом view blur с активным raw-блоком возвращает рендер (контроль)", () => {
    const { view, parent } = mountView();
    const blocks = parseBlocks(TWO_BLOCKS);
    view.dispatch({ effects: setRawBlock.of(blocks[1].from) });
    expect(view.state.field(rawBlockField)).toBe(blocks[1].from);

    blur(view, null);

    expect(view.state.field(rawBlockField)).toBeNull();
    view.destroy();
    parent.remove();
  });

  it("в отсоединённом от DOM view blur НЕ диспатчит (поле не меняется, без throw)", () => {
    const { view, parent } = mountView();
    const blocks = parseBlocks(TWO_BLOCKS);
    view.dispatch({ effects: setRawBlock.of(blocks[1].from) });
    expect(view.state.field(rawBlockField)).toBe(blocks[1].from);

    // Отсоединяем view от документа, сохраняя обработчики (имитация быстрого
    // закрытия/смены вкладки до фактического destroy).
    parent.remove();
    expect(view.dom.isConnected).toBe(false);

    // Без фикса dispatch бы выполнился (или бросил на гонке). С фиксом —
    // fail-closed: поле остаётся прежним и исключения нет.
    expect(() => blur(view, null)).not.toThrow();
    expect(view.state.field(rawBlockField)).toBe(blocks[1].from);

    view.destroy();
  });
});

// ---------------------------------------------------------------------------
// MDP-14 RISK-2 (AC#3): инспекция темы — анимация только opacity
// ---------------------------------------------------------------------------

describe("inlineRenderThemeSpec: анимация перехода (MDP-14 AC#3)", () => {
  it(".cm-md-block задаёт transition по opacity", () => {
    const rule = inlineRenderThemeSpec[".cm-md-block"];
    expect(rule).toBeDefined();
    expect(rule.transition).toBeDefined();
    expect(rule.transition).toContain("opacity");
  });

  it(".cm-md-block НЕ анимирует all и НЕ анимирует height", () => {
    const transition = inlineRenderThemeSpec[".cm-md-block"].transition;
    // Запрет DESIGN.md: никаких transition на all/height (прыжки высоты).
    expect(transition).not.toMatch(/\ball\b/);
    expect(transition).not.toMatch(/\bheight\b/);
  });

  it("ни одно правило темы не анимирует all или height", () => {
    for (const [selector, rule] of Object.entries(inlineRenderThemeSpec)) {
      if (typeof rule.transition === "string") {
        expect(rule.transition, selector).not.toMatch(/\ball\b/);
        expect(rule.transition, selector).not.toMatch(/\bheight\b/);
      }
    }
  });
});
