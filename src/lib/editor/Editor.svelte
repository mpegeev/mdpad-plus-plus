<script lang="ts">
  /**
   * CodeMirror 6 markdown editor.
   *
   * Mounts an EditorView into a host div via `$effect`. The view is created
   * once per mount and destroyed on cleanup. External `doc` prop changes are
   * reflected back into the view through a separate `$effect` that diffs
   * against the current document.
   *
   * Extension stack — hand-picked (no `basicSetup`) so we can guarantee every
   * extension is exercised by tests and visible in DESIGN.md:
   *   - markdown() with codeLanguages: [] (no inline code-block langs yet)
   *   - lineNumbers()
   *   - highlightActiveLine() + highlightActiveLineGutter()
   *   - history()
   *   - keymap of(default + history + search)
   *   - editorTheme + editorSyntaxHighlight
   *   - EditorView.updateListener.of(...) → onDocChange
   *
   * `basicSetup` was rejected: it bundles bracket-matching, auto-closing,
   * crosshair-cursor, etc. — features we do NOT want surfacing in a plain
   * markdown editor and which inflate bundle size unnecessarily.
   */

  import { untrack } from "svelte";
  import { EditorState } from "@codemirror/state";
  import {
    EditorView,
    keymap,
    lineNumbers,
    highlightActiveLine,
    highlightActiveLineGutter,
  } from "@codemirror/view";
  import { markdown } from "@codemirror/lang-markdown";
  import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
  import { searchKeymap } from "@codemirror/search";
  import { editorTheme, editorSyntaxHighlight } from "./theme";

  interface Props {
    doc: string;
    onDocChange?: (next: string) => void;
    readOnly?: boolean;
  }

  const { doc, onDocChange, readOnly = false }: Props = $props();

  let hostEl: HTMLDivElement | undefined = $state();
  let view: EditorView | undefined = $state();

  // ----- Mount / unmount the EditorView -----
  // We intentionally read `doc` / `readOnly` via `untrack` so this effect runs
  // exactly once per host element. Re-creating the view on every prop change
  // would lose scroll position, selection and history. External `doc` updates
  // are reflected by the second effect below; reactive `readOnly` will arrive
  // with the raw/rendered toggle in MDP-12 (likely via a Compartment).
  $effect(() => {
    if (!hostEl) return;

    const initialDoc = untrack(() => doc);
    const initialReadOnly = untrack(() => readOnly);

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        markdown(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        editorTheme,
        editorSyntaxHighlight,
        EditorState.readOnly.of(initialReadOnly),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          // Don't crash if parent didn't wire a handler — common in tests.
          onDocChange?.(update.state.doc.toString());
        }),
      ],
    });

    const created = new EditorView({ state, parent: hostEl });
    view = created;

    return () => {
      created.destroy();
    };
  });

  // ----- Reflect external `doc` prop changes into the view -----
  $effect(() => {
    // Track `doc` reactively.
    const next = doc;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === next) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: next },
    });
  });
</script>

<div bind:this={hostEl} class="editor-host" data-testid="cm-host"></div>

<style>
  .editor-host {
    height: 100%;
    width: 100%;
    /* CodeMirror itself sets background via editorTheme. The host stays
       transparent so it inherits the EditorArea surface when CM has not
       mounted yet (avoids flash of wrong color). */
    background: var(--bg-base);
    overflow: hidden;
  }
  /* CM6 outputs an outline on focus by default — we already get focus
     affordance via active-line + accent caret; suppress the OS outline. */
  .editor-host :global(.cm-editor) {
    height: 100%;
  }
  .editor-host :global(.cm-editor.cm-focused) {
    outline: none;
  }
</style>
