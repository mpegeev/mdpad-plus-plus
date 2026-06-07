import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { EditorView } from "@codemirror/view";
import Editor from "./Editor.svelte";

/** Resolve the EditorView instance for a rendered Editor by grabbing the
 *  .cm-editor DOM node and reading the CM6 view from it. */
function getView(container: HTMLElement): EditorView {
  const dom = container.querySelector(".cm-editor") as HTMLElement | null;
  expect(dom).not.toBeNull();
  const view = EditorView.findFromDOM(dom!);
  expect(view).not.toBeNull();
  return view!;
}

describe("Editor.svelte", () => {
  it("монтируется и отображает содержимое doc-пропа", async () => {
    const doc = "# Hello\n\nWelcome to mdpad++";
    const { container } = render(Editor, { props: { doc } });
    await tick();
    const view = getView(container);
    expect(view.state.doc.toString()).toBe(doc);
  });

  it("пустой doc не приводит к ошибкам, EditorView пустой", async () => {
    const { container } = render(Editor, { props: { doc: "" } });
    await tick();
    const view = getView(container);
    expect(view.state.doc.toString()).toBe("");
    expect(view.state.doc.length).toBe(0);
  });

  it("вызывает onDocChange при изменении документа", async () => {
    const onDocChange = vi.fn();
    const { container } = render(Editor, {
      props: { doc: "abc", onDocChange },
    });
    await tick();
    const view = getView(container);
    view.dispatch({
      changes: { from: 3, insert: "d" },
    });
    expect(onDocChange).toHaveBeenCalledTimes(1);
    expect(onDocChange).toHaveBeenCalledWith("abcd");
  });

  it("не падает, когда onDocChange не передан", async () => {
    const { container } = render(Editor, { props: { doc: "x" } });
    await tick();
    const view = getView(container);
    expect(() =>
      view.dispatch({ changes: { from: 1, insert: "y" } }),
    ).not.toThrow();
    expect(view.state.doc.toString()).toBe("xy");
  });

  it("внешнее изменение пропа doc обновляет состояние редактора", async () => {
    const { container, rerender } = render(Editor, {
      props: { doc: "first" },
    });
    await tick();
    const view = getView(container);
    expect(view.state.doc.toString()).toBe("first");

    await rerender({ doc: "second" });
    await tick();
    expect(view.state.doc.toString()).toBe("second");
  });

  it("не диспатчит лишних обновлений, если входящий doc совпадает с текущим", async () => {
    const onDocChange = vi.fn();
    const { container, rerender } = render(Editor, {
      props: { doc: "same", onDocChange },
    });
    await tick();
    getView(container); // sanity: view exists

    await rerender({ doc: "same", onDocChange });
    await tick();

    // Observable behaviour per AC: no callback fired when prop didn't change.
    // The "view state didn't change" was previously asserted alongside but
    // is tautological — if no dispatch fired, the state is the same by
    // construction (caught by SENAR review).
    expect(onDocChange).not.toHaveBeenCalled();
  });

  it("readOnly=true делает редактор read-only на уровне состояния", async () => {
    const { container } = render(Editor, {
      props: { doc: "ro", readOnly: true },
    });
    await tick();
    const view = getView(container);
    expect(view.state.readOnly).toBe(true);
  });

  it("unmount вызывает EditorView.destroy() — DOM отсоединяется", async () => {
    const destroySpy = vi.spyOn(EditorView.prototype, "destroy");
    const { container, unmount } = render(Editor, {
      props: { doc: "bye" },
    });
    await tick();
    const view = getView(container);
    const cmDom = view.dom;
    expect(cmDom.isConnected).toBe(true);

    unmount();
    await tick();

    expect(destroySpy).toHaveBeenCalled();
    expect(cmDom.isConnected).toBe(false);
    destroySpy.mockRestore();
  });
});
