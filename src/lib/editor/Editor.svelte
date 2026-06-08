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
  import { EditorState, Compartment } from "@codemirror/state";
  import type { Extension } from "@codemirror/state";
  import {
    EditorView,
    keymap,
    lineNumbers,
    highlightActiveLine,
    highlightActiveLineGutter,
  } from "@codemirror/view";
  import type { Command } from "@codemirror/view";
  import { markdown } from "@codemirror/lang-markdown";
  import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
  import { searchKeymap } from "@codemirror/search";
  import { editorTheme, editorSyntaxHighlight } from "./theme";
  import {
    inlineRender as inlineRenderExt,
    mixedModeExtension,
    setRawBlock,
    rawBlockField,
    findBlockAt,
  } from "./inlineRender";
  import { formatKeymap } from "./format";
  import type { DocumentMode } from "$lib/stores/documents.svelte";

  interface Props {
    doc: string;
    onDocChange?: (next: string) => void;
    readOnly?: boolean;
    /** Soft line wrap. Per-document (MDP-10); toggled from the status bar. */
    lineWrap?: boolean;
    /**
     * Render mode (MDP-15). Per-document, switched at runtime through a
     * Compartment (no EditorView re-creation):
     *   - `rendered` — inline-render active; a block becomes raw only on
     *     explicit F2 / double-click (MDP-12/13 behaviour).
     *   - `mixed`    — inline-render plus auto-follow: the block under the
     *     caret is shown raw, the others rendered.
     *   - `raw`      — no decorations; the whole document is plain Markdown.
     */
    mode?: DocumentMode;
    /**
     * Invoked when the user presses Ctrl+E inside the editor. The parent maps
     * it to `setMode(active.id, cycleMode(active.mode))`. Handled here (in the
     * editor keymap) rather than via a global listener so the shortcut only
     * fires when the editor is focused and composes with CM6 key handling.
     */
    onCycleMode?: () => void;
    /**
     * Invoked once the EditorView is created (and again with `null` on
     * teardown). Lets a parent overlay (e.g. the MDP-16 floating toolbar) read
     * selection geometry via `view.coordsAtPos` without making the view a
     * public field. Kept as a callback rather than `bindable` so the parent
     * gets an explicit teardown signal.
     */
    onViewReady?: (view: EditorView | null) => void;
    /**
     * Invoked whenever the selection changes (MDP-16). `empty` is true when the
     * selection is collapsed (a bare caret) — the floating toolbar uses this to
     * drive its show/hide state machine. Fired from the same updateListener as
     * `onDocChange` so it composes with CM6 transactions.
     */
    onSelectionChange?: (empty: boolean) => void;
    /**
     * Invoked when the editor's scroller scrolls or the editor loses focus
     * (MDP-16). The floating toolbar hides on either (AC#5).
     */
    onScroll?: () => void;
    /** Invoked when the editor content loses focus (MDP-16, AC#5). */
    onBlur?: () => void;
  }

  const {
    doc,
    onDocChange,
    readOnly = false,
    lineWrap = false,
    mode = "rendered",
    onCycleMode,
    onViewReady,
    onSelectionChange,
    onScroll,
    onBlur,
  }: Props = $props();

  let hostEl: HTMLDivElement | undefined = $state();
  let view: EditorView | undefined = $state();

  // Compartment lets us reconfigure line-wrapping without recreating the
  // EditorView (which would lose scroll, selection and history). The wrap
  // extension is empty when off, `EditorView.lineWrapping` when on.
  const wrapCompartment = new Compartment();

  function wrapExtension(on: boolean) {
    return on ? EditorView.lineWrapping : [];
  }

  // Last wrap value actually applied to the live view. Lets the reconfigure
  // effect below skip a redundant dispatch right after mount (the compartment
  // is already initialised with the current `lineWrap`).
  let appliedWrap: boolean | undefined;

  // ----- Render mode (MDP-15) -----
  // A Compartment lets us swap the inline-render extension at runtime without
  // re-creating the EditorView (scroll/selection/history preserved).
  const modeCompartment = new Compartment();

  function modeExtension(m: DocumentMode): Extension {
    switch (m) {
      case "rendered":
        return inlineRenderExt();
      case "mixed":
        // inlineRender provides rawBlockField + decorations; mixedMode adds the
        // caret-follow transactionExtender on top.
        return [inlineRenderExt(), mixedModeExtension()];
      case "raw":
        // No decorations → the whole document stays plain Markdown.
        return [];
    }
  }

  // Last mode actually applied to the live view — lets the reconfigure effect
  // skip the redundant dispatch right after mount.
  let appliedMode: DocumentMode | undefined;

  const cycleModeCommand: Command = () => {
    // Always swallow Ctrl+E so the default CM binding never fires while the
    // editor owns the shortcut. Reads `onCycleMode` at call-time (a reactive
    // `$props` getter), so the keymap captured once at mount always calls the
    // current prop. No-op when no handler is wired (e.g. tests).
    onCycleMode?.();
    return true;
  };

  // When switching to `mixed`, the transactionExtender only fires on the next
  // transaction — so make the block under the current caret raw immediately.
  // When leaving `mixed`/`raw` for `rendered`, clear any active raw block so a
  // stale block does not stay un-rendered. `rawBlockField` only exists while an
  // inline-render extension is configured, so guard reads with a field check.
  function syncRawBlockForMode(v: EditorView, m: DocumentMode): void {
    const hasField = v.state.field(rawBlockField, false) !== undefined;
    if (!hasField) return;
    if (m === "mixed") {
      const head = v.state.selection.main.head;
      const block = findBlockAt(v.state.doc.toString(), head);
      const next = block ? block.from : null;
      if (v.state.field(rawBlockField) !== next) {
        v.dispatch({ effects: setRawBlock.of(next) });
      }
    } else if (m === "rendered") {
      if (v.state.field(rawBlockField) !== null) {
        v.dispatch({ effects: setRawBlock.of(null) });
      }
    }
  }

  // ----- Mount / unmount the EditorView -----
  // We intentionally read `doc` / `readOnly` via `untrack` so this effect runs
  // exactly once per host element. Re-creating the view on every prop change
  // would lose scroll position, selection and history. External `doc` updates
  // are reflected by the second effect below. `readOnly` is read once at mount;
  // `lineWrap` and `mode` live in Compartments so they reconfigure at runtime.
  $effect(() => {
    if (!hostEl) return;

    const initialDoc = untrack(() => doc);
    const initialReadOnly = untrack(() => readOnly);
    const initialWrap = untrack(() => lineWrap);
    const initialMode = untrack(() => mode);

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        lineNumbers(),
        wrapCompartment.of(wrapExtension(initialWrap)),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        markdown(),
        modeCompartment.of(modeExtension(initialMode)),
        // Ctrl+E (mode cycle) goes first so it has priority over the default
        // binding (cursorLineEnd) — `cycleModeCommand` always returns true.
        keymap.of([{ key: "Ctrl-e", run: cycleModeCommand }]),
        // Хоткеи форматирования (MDP-17): Ctrl+B/I/U/Ctrl+`. Идут перед
        // defaultKeymap, чтобы перехватывать сочетания до дефолтных привязок.
        formatKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        editorTheme,
        editorSyntaxHighlight,
        EditorState.readOnly.of(initialReadOnly),
        EditorView.updateListener.of((update) => {
          // Don't crash if parent didn't wire a handler — common in tests.
          if (update.docChanged) {
            onDocChange?.(update.state.doc.toString());
          }
          // MDP-16: report selection changes (incl. those caused by edits) so
          // the floating toolbar can debounce show/hide. `selectionSet` covers
          // explicit selection moves; doc edits also shift the selection.
          if (update.selectionSet || update.docChanged) {
            onSelectionChange?.(update.state.selection.main.empty);
          }
        }),
        // MDP-16: scroll/blur hide the floating toolbar (AC#5). Handlers return
        // false so they never swallow the native event.
        EditorView.domEventHandlers({
          scroll() {
            onScroll?.();
            return false;
          },
          blur() {
            onBlur?.();
            return false;
          },
        }),
      ],
    });

    const created = new EditorView({ state, parent: hostEl });
    view = created;
    appliedWrap = initialWrap;
    appliedMode = initialMode;
    // If we open straight into `mixed`, the block under the caret must be raw
    // from the first frame (the extender only fires on later transactions).
    syncRawBlockForMode(created, initialMode);
    // Hand the view to a parent overlay (MDP-16) after it exists. Read the prop
    // via `untrack` so this synchronous call does not make the mount effect
    // reactive to `onViewReady` (the effect must run exactly once per mount).
    untrack(() => onViewReady)?.(created);

    return () => {
      untrack(() => onViewReady)?.(null);
      created.destroy();
      appliedWrap = undefined;
      appliedMode = undefined;
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

  // ----- Reflect `lineWrap` prop into the view via Compartment reconfigure -----
  // Reconfiguring keeps the same EditorView instance (scroll/selection/history
  // preserved), unlike re-running the mount effect.
  $effect(() => {
    const on = lineWrap;
    if (!view) return;
    // Skip the redundant reconfigure right after mount, and any no-op toggles.
    if (on === appliedWrap) return;
    view.dispatch({
      effects: wrapCompartment.reconfigure(wrapExtension(on)),
    });
    appliedWrap = on;
  });

  // ----- Reflect `mode` prop into the view via Compartment reconfigure -----
  // Swaps the inline-render extension without re-creating the EditorView, then
  // syncs the active raw block so `mixed`/`rendered` look right immediately.
  $effect(() => {
    const m = mode;
    if (!view) return;
    if (m === appliedMode) return;
    view.dispatch({
      effects: modeCompartment.reconfigure(modeExtension(m)),
    });
    appliedMode = m;
    syncRawBlockForMode(view, m);
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
