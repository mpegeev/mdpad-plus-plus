<script lang="ts">
  import Icon from "$lib/ui/Icon.svelte";
  import Button from "$lib/ui/Button.svelte";
  import Editor from "$lib/editor/Editor.svelte";
  import FloatingToolbar from "$lib/editor/FloatingToolbar.svelte";
  import {
    getActive,
    updateBuffer,
    createUntitled,
    setMode,
  } from "$lib/stores/documents.svelte";
  import { cycleMode } from "$lib/editor/mode";
  import type { EditorView } from "@codemirror/view";
  import { ToolbarVisibility } from "$lib/editor/toolbarVisibility";
  import type { ToolbarAction } from "$lib/editor/toolbarVisibility";
  import {
    clampToolbarPosition,
    type ToolbarPosition,
  } from "$lib/editor/toolbarPosition";

  // The active document comes from the shared store (MDP-8). Editing the
  // buffer flows back via updateBuffer; if no document is open we show the
  // welcome empty-state.
  const active = $derived(getActive());

  // Line-wrap (MDP-10) is per-document state, read from the active document;
  // falls back to `false` when no document is active.
  const lineWrap = $derived(active?.wrap ?? false);

  // Render mode (MDP-15) is per-document; defaults to `rendered`. The Editor
  // honours all three modes (rendered / mixed / raw) at runtime.
  const mode = $derived(active?.mode ?? "rendered");

  function onCreate() {
    createUntitled();
  }

  // Ctrl+E inside the editor advances the active document's mode through the
  // cycle. Handled in the Editor keymap (focus-scoped) and routed back here.
  function onCycleMode() {
    if (!active) return;
    setMode(active.id, cycleMode(active.mode));
  }

  // ----- Floating toolbar overlay (MDP-16) -----
  // The toolbar lives above the editor and reacts to selection geometry from
  // the CodeMirror view. Visibility is driven by a debounced state machine;
  // the pixel position is computed from `coordsAtPos` and clamped to viewport.
  //
  // NOTE: onAction is intentionally a no-op stub here — wiring the actions to
  // the actual formatting commands is MDP-17 (developed in parallel). This
  // task delivers only the shell, visibility and positioning.

  let editorView: EditorView | null = $state(null);
  let toolbarVisible = $state(false);
  let toolbarPosition = $state<ToolbarPosition>({ x: 0, y: 0 });

  // Estimated toolbar size for clamping before the element is measured. Matches
  // the rendered plank (5 buttons × 24px + separator + paddings/gaps); the
  // exact pixels are best-effort — clamp only needs an approximate footprint.
  const TOOLBAR_SIZE = { width: 172, height: 32 };

  const visibility = new ToolbarVisibility({
    onChange: (v) => {
      if (v) recomputePosition();
      toolbarVisible = v;
    },
  });

  // Recompute the toolbar position from the current selection geometry.
  // jsdom has no layout → coordsAtPos returns null; we fail-closed (hide).
  function recomputePosition() {
    const view = editorView;
    if (!view) {
      toolbarVisible = false;
      return;
    }
    const sel = view.state.selection.main;
    if (sel.empty) {
      toolbarVisible = false;
      return;
    }
    const startCoords = view.coordsAtPos(sel.from);
    const endCoords = view.coordsAtPos(sel.to);
    if (!startCoords || !endCoords) {
      // No layout (tests) or off-screen selection → cannot position. Fail-closed.
      toolbarVisible = false;
      return;
    }
    const selRect = {
      left: Math.min(startCoords.left, endCoords.left),
      top: Math.min(startCoords.top, endCoords.top),
      right: Math.max(startCoords.right, endCoords.right),
      bottom: Math.max(startCoords.bottom, endCoords.bottom),
    };
    toolbarPosition = clampToolbarPosition(selRect, TOOLBAR_SIZE, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }

  function handleViewReady(view: EditorView | null) {
    editorView = view;
    if (!view) {
      visibility.blurred();
    }
  }

  function handleSelectionChange(empty: boolean) {
    visibility.selectionChanged(empty);
  }

  function handleToolbarAction(action: ToolbarAction) {
    // MDP-17 integration point — no formatting logic in this task. The action
    // is intentionally discarded until the format commands land.
    void action;
  }

  $effect(() => {
    // Teardown the visibility machine's pending timer on unmount.
    return () => visibility.destroy();
  });
</script>

{#if active}
  <section class="editor" aria-label="Editor">
    {#key active.id}
      <Editor
        doc={active.buffer}
        onDocChange={(next) => updateBuffer(active.id, next)}
        {lineWrap}
        {mode}
        {onCycleMode}
        onViewReady={handleViewReady}
        onSelectionChange={handleSelectionChange}
        onScroll={() => visibility.scrolled()}
        onBlur={() => visibility.blurred()}
      />
    {/key}
    <FloatingToolbar
      visible={toolbarVisible}
      position={toolbarPosition}
      onAction={handleToolbarAction}
    />
  </section>
{:else}
  <section class="editor editor--empty" aria-label="Editor">
    <div class="editor__empty-card">
      <div class="editor__empty-keys" aria-hidden="true">
        <kbd>Ctrl</kbd>
        <span>+</span>
        <kbd>N</kbd>
      </div>
      <h1>Новый файл</h1>
      <p>
        Начните писать или откройте файл из дерева слева. F2 переключает
        активный блок между рендером и raw-режимом.
      </p>
      <div class="editor__empty-actions">
        <Button variant="primary" onclick={onCreate}>
          <Icon name="plus" size={13} />
          Создать файл
        </Button>
      </div>
      <div class="editor__empty-shortcuts">
        <div><kbd>Ctrl</kbd> <kbd>P</kbd> — переход к файлу</div>
        <div><kbd>Ctrl</kbd> <kbd>S</kbd> — сохранить</div>
        <div><kbd>F2</kbd> — raw / rendered</div>
      </div>
    </div>
  </section>
{/if}

<style>
  .editor {
    height: 100%;
    background: var(--bg-base);
    position: relative;
    overflow: auto;
  }
  .editor--empty {
    display: flex;
    /* `safe` keeps the card visible when its content is taller than the
       viewport — without it, vertical centering clips the top inside
       overflow:auto. Crucial at 640x400. */
    align-items: safe center;
    justify-content: safe center;
  }

  .editor__empty-card {
    max-width: var(--welcome-card-max);
    text-align: center;
    padding: var(--space-8);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  .editor__empty-keys {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--fs-xs);
    color: var(--fg-tertiary);
    margin-bottom: var(--space-2);
  }

  .editor__empty-card h1 {
    font-family: var(--font-prose);
    font-size: var(--fs-3xl);
    font-weight: var(--fw-bold);
    line-height: var(--lh-tight);
    margin: 0;
    letter-spacing: -0.015em;
    color: var(--fg-primary);
  }

  .editor__empty-card p {
    font-family: var(--font-prose);
    font-size: var(--fs-md);
    line-height: var(--lh-prose);
    color: var(--fg-secondary);
    text-wrap: pretty;
    margin: 0 0 var(--space-3);
  }

  .editor__empty-actions {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-5);
  }

  .editor__empty-shortcuts {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    align-items: center;
    font-size: var(--fs-xs);
    color: var(--fg-tertiary);
  }
  .editor__empty-shortcuts > div {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: var(--kbd-size);
    height: var(--kbd-size);
    padding: 0 var(--space-1);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-bottom-width: 2px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--fg-secondary);
    font-weight: var(--fw-medium);
  }
</style>
