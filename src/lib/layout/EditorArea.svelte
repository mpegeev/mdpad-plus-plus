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
  import { commandForAction, commandForHeading } from "$lib/editor/format";
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

  // ----- Floating toolbar overlay (MDP-16 + MDP-46 + MDP-48) -----
  // The toolbar lives above the editor and reacts to selection geometry from
  // the CodeMirror view. Visibility is driven by a debounced state machine;
  // the pixel position is computed from `coordsAtPos`, clamped to viewport
  // using the toolbar's MEASURED size (MDP-48), not a hardcoded estimate.
  //
  // onAction is wired (MDP-46) to the shared formatForAction seam via
  // commandForAction — the same path the MDP-17 hotkeys use.

  let editorView: EditorView | null = $state(null);
  let toolbarVisible = $state(false);
  let toolbarPosition = $state<ToolbarPosition>({ x: 0, y: 0 });

  // Фактический размер панели (MDP-48): измеряется самой FloatingToolbar
  // (offsetWidth/Height + ResizeObserver) и подаётся в clampToolbarPosition
  // вместо прежнего хардкода 172×32. `null` ⇒ ещё не измерен → панель скрыта
  // (fail-closed, без скачка не на месте). При изменении набора кнопок размер
  // обновляется автоматически — ручная синхронизация больше не нужна.
  let toolbarSize = $state<{ width: number; height: number } | null>(null);

  function handleToolbarMeasure(size: { width: number; height: number }): void {
    toolbarSize = size;
  }

  const visibility = new ToolbarVisibility({
    onChange: (v) => {
      // Видимость = смогли ли реально вычислить позицию. recomputePosition
      // возвращает false во всех fail-closed ветках (нет view / пустое
      // выделение / нет координат / размер ещё не измерен), и тогда панель
      // скрыта. Раньше onChange безусловно писал toolbarVisible = v ПОСЛЕ
      // recomputePosition, затирая fail-closed (баг найден SENAR MDP-48).
      toolbarVisible = v ? recomputePosition() : false;
    },
  });

  // Пересчитать позицию панели по геометрии выделения. Возвращает true, если
  // позиция успешно вычислена; false — если позиционировать нельзя. Сама
  // toolbarVisible НЕ трогает: видимостью управляет вызывающий по результату,
  // иначе порядок присваиваний в onChange затирал бы fail-closed.
  // jsdom не делает layout → coordsAtPos === null → false (панель скрыта).
  function recomputePosition(): boolean {
    const view = editorView;
    if (!view) return false;
    const sel = view.state.selection.main;
    if (sel.empty) return false;
    const startCoords = view.coordsAtPos(sel.from);
    const endCoords = view.coordsAtPos(sel.to);
    if (!startCoords || !endCoords) return false; // нет layout / off-screen
    // Размер панели ещё не измерен (или нулевой) → точная позиция невозможна.
    // Fail-closed: не показываем, чтобы не мигнуть не на месте (MDP-48).
    if (!toolbarSize || toolbarSize.width <= 0 || toolbarSize.height <= 0) {
      return false;
    }
    const selRect = {
      left: Math.min(startCoords.left, endCoords.left),
      top: Math.min(startCoords.top, endCoords.top),
      right: Math.max(startCoords.right, endCoords.right),
      bottom: Math.max(startCoords.bottom, endCoords.bottom),
    };
    toolbarPosition = clampToolbarPosition(selRect, toolbarSize, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    return true;
  }

  function handleViewReady(view: EditorView | null) {
    editorView = view;
    if (!view) {
      // Смена/закрытие документа: гасим панель синхронно и атомарно. blurred()
      // обновит машину и вызовет onChange только если она считала панель
      // видимой; дополнительно сбрасываем реактивный флаг напрямую, чтобы
      // панель не «зависла» видимой между перемонтированиями редактора (LOW [D]).
      toolbarVisible = false;
      visibility.blurred();
    }
  }

  function handleSelectionChange(empty: boolean) {
    visibility.selectionChanged(empty);
  }

  function handleToolbarAction(action: ToolbarAction) {
    // MDP-46: применяем разметку к выделению активного редактора через общий
    // seam formatForAction (тот же путь, что и хоткеи MDP-17). Нет активного
    // view → no-op (fail-closed, негативный сценарий). commandForAction сам
    // вернёт фокус редактору после диспатча.
    const view = editorView;
    if (!view) return;
    commandForAction(action)(view);
  }

  function handleToolbarHeading(level: number) {
    // MDP-18: установка уровня заголовка из dropdown через тот же путь, что и
    // хоткеи Ctrl+0..6 (commandForHeading → чистый setHeadingLevel). Нет
    // активного view → no-op (fail-closed).
    const view = editorView;
    if (!view) return;
    commandForHeading(level)(view);
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
      onHeading={handleToolbarHeading}
      onMeasure={handleToolbarMeasure}
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
