<script lang="ts">
  import Icon from "$lib/ui/Icon.svelte";
  import ContextMenu, { type MenuItem } from "$lib/ui/ContextMenu.svelte";
  import {
    getDocuments,
    getActiveId,
    isDirty,
    setActive,
    closeTab,
    closeOthers,
    closeAll,
    moveTab,
    createUntitled,
    type DocumentId,
  } from "$lib/stores/documents.svelte";

  interface Props {
    sidebarCollapsed: boolean;
    onToggleSidebar: () => void;
    /**
     * "Reveal in Sidebar" handler (MDP-19). The bar surfaces the request; the
     * parent owns the sidebar so it can uncollapse it and let the file-tree
     * highlight the active document's row. Optional so the bar renders
     * standalone in tests.
     */
    onRevealInSidebar?: (id: DocumentId) => void;
  }

  const { sidebarCollapsed, onToggleSidebar, onRevealInSidebar }: Props =
    $props();

  // Tabs are driven by the shared document store (MDP-8 + MDP-9 wiring).
  const documents = $derived(getDocuments());
  const activeId = $derived(getActiveId());

  // --- Context menu state (MDP-19) ---
  // `null` ⇒ no menu open. Otherwise holds the target tab + cursor point.
  let menu = $state<{ id: DocumentId; x: number; y: number } | null>(null);

  const menuItems = $derived.by((): MenuItem[] => {
    if (menu === null) return [];
    const id = menu.id;
    const doc = documents.find((d) => d.id === id);
    const path = doc?.path ?? null;
    return [
      {
        id: "close",
        label: "Закрыть",
        icon: "x",
        onSelect: () => closeTab(id),
      },
      {
        id: "close-others",
        label: "Закрыть другие",
        disabled: documents.length <= 1,
        onSelect: () => closeOthers(id),
      },
      {
        id: "close-all",
        label: "Закрыть все",
        onSelect: () => closeAll(),
      },
      {
        id: "copy-path",
        label: "Копировать путь",
        icon: "copy",
        separatorBefore: true,
        // Untitled documents have no filesystem path → nothing to copy.
        disabled: path === null,
        onSelect: () => copyPath(path),
      },
      {
        id: "reveal",
        label: "Показать в боковой панели",
        icon: "panel-left",
        // Without a path the file-tree has no row to reveal.
        disabled: path === null,
        onSelect: () => onRevealInSidebar?.(id),
      },
    ];
  });

  function copyPath(path: string | null): void {
    if (path === null) return;
    try {
      // `navigator.clipboard` may be undefined (insecure context, older
      // webview) or reject (permission denied). Swallow either failure: a
      // copy-path action that cannot copy must not crash the UI. The promise
      // rejection is caught so it never surfaces as an unhandled rejection.
      void navigator.clipboard?.writeText(path)?.catch(() => {});
    } catch {
      // Synchronous access error (no `clipboard` API at all) — fail-closed.
    }
  }

  function onCloseTab(e: MouseEvent, id: DocumentId) {
    // Stop the click from also activating the tab being closed.
    e.stopPropagation();
    closeTab(id);
  }

  function onTabAuxClick(e: MouseEvent, id: DocumentId) {
    // Middle-click (button === 1) closes the tab. `auxclick` fires for
    // non-primary buttons; guard so right-click never closes.
    if (e.button !== 1) return;
    e.preventDefault();
    closeTab(id);
  }

  function onTabContextMenu(e: MouseEvent, id: DocumentId) {
    e.preventDefault();
    // Open the menu anchored at the cursor. Activating the tab on right-click
    // matches editor conventions (the menu's actions target this tab anyway).
    setActive(id);
    menu = { id, x: e.clientX, y: e.clientY };
  }

  function closeMenu() {
    menu = null;
  }

  // --- Drag-and-drop reorder (MDP-19) ---
  // Best-effort: drag wiring is hard to exercise under jsdom, so the
  // deterministic reorder math lives in the store (`moveTab`, unit-tested).
  // Here we only translate drop targets into a `moveTab` call.
  let dragId = $state<DocumentId | null>(null);
  let dragOverId = $state<DocumentId | null>(null);

  function onDragStart(e: DragEvent, id: DocumentId) {
    dragId = id;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      // Some browsers require data to be set for the drag to initiate.
      e.dataTransfer.setData("text/plain", id);
    }
  }

  function onDragOver(e: DragEvent, id: DocumentId) {
    if (dragId === null) return;
    // Allow the drop and show the insertion affordance.
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    dragOverId = id;
  }

  function onTabsDragLeave(e: DragEvent) {
    if (dragId === null) return;
    // `dragleave` fires when crossing between child tabs too. Only clear the
    // hover affordance when the pointer truly leaves the tabs container:
    // relatedTarget is the node being entered (null when leaving the window).
    const next = e.relatedTarget;
    const container = e.currentTarget;
    if (
      next instanceof Node &&
      container instanceof Node &&
      container.contains(next)
    ) {
      return;
    }
    dragOverId = null;
  }

  function onDrop(e: DragEvent, targetId: DocumentId) {
    e.preventDefault();
    if (dragId === null || dragId === targetId) {
      resetDrag();
      return;
    }
    const targetIdx = documents.findIndex((d) => d.id === targetId);
    if (targetIdx !== -1) moveTab(dragId, targetIdx);
    resetDrag();
  }

  function resetDrag() {
    dragId = null;
    dragOverId = null;
  }
</script>

<div class="tabs-bar" role="toolbar" aria-label="Document tabs">
  <button
    class="tabs-bar__icon-btn"
    type="button"
    aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
    aria-pressed={!sidebarCollapsed}
    onclick={onToggleSidebar}
  >
    <Icon
      name={sidebarCollapsed ? "panel-left" : "panel-left-close"}
      size={14}
    />
  </button>

  <!-- Full WAI-ARIA tablist/tab/tabpanel pattern with aria-controls bindings
       lands once a real tabpanel exists. For now tabs activate, close,
       reorder (drag), middle-click-close and expose a context menu; roles
       stay minimal to avoid promising a tabpanel that does not yet exist. -->
  <div class="tabs-bar__tabs" ondragleave={onTabsDragLeave} role="presentation">
    {#each documents as doc (doc.id)}
      <div
        class="tab"
        class:tab--active={doc.id === activeId}
        class:tab--dirty={isDirty(doc.id)}
        class:tab--drag-over={dragOverId === doc.id && dragId !== doc.id}
        class:tab--dragging={dragId === doc.id}
        role="button"
        tabindex="0"
        title={doc.path ?? doc.name}
        draggable="true"
        onclick={() => setActive(doc.id)}
        onauxclick={(e) => onTabAuxClick(e, doc.id)}
        oncontextmenu={(e) => onTabContextMenu(e, doc.id)}
        ondragstart={(e) => onDragStart(e, doc.id)}
        ondragover={(e) => onDragOver(e, doc.id)}
        ondrop={(e) => onDrop(e, doc.id)}
        ondragend={resetDrag}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActive(doc.id);
          }
        }}
      >
        {#if isDirty(doc.id)}
          <span class="tab__dot" aria-label="Unsaved"></span>
        {:else}
          <Icon name="file-text" size={14} />
        {/if}
        <span class="tab__title">{doc.name}</span>
        <button
          class="tab__close"
          type="button"
          aria-label="Close tab"
          tabindex="-1"
          onclick={(e) => onCloseTab(e, doc.id)}
        >
          <Icon name="x" size={12} />
        </button>
      </div>
    {/each}
  </div>

  <div class="tabs-bar__right">
    <button
      class="tabs-bar__icon-btn"
      type="button"
      aria-label="New tab"
      onclick={() => createUntitled()}
    >
      <Icon name="plus" size={14} />
    </button>
  </div>
</div>

{#if menu !== null}
  <ContextMenu items={menuItems} x={menu.x} y={menu.y} onClose={closeMenu} />
{/if}

<style>
  .tabs-bar {
    display: flex;
    align-items: stretch;
    height: var(--tabs-height);
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-subtle);
    overflow: hidden;
    flex-shrink: 0;
  }

  .tabs-bar__icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--tabs-height);
    height: var(--tabs-height);
    padding: 0;
    background: transparent;
    color: var(--fg-secondary);
    border: none;
    border-right: 1px solid var(--border-subtle);
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background var(--motion-fast) var(--ease-out),
      color var(--motion-fast) var(--ease-out);
  }
  .tabs-bar__icon-btn:hover {
    background: var(--bg-hover);
    color: var(--fg-primary);
  }
  .tabs-bar__icon-btn:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: -2px;
  }

  .tabs-bar__tabs {
    display: flex;
    align-items: stretch;
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
  }

  .tabs-bar__right {
    display: flex;
    border-left: 1px solid var(--border-subtle);
    flex-shrink: 0;
  }
  .tabs-bar__right .tabs-bar__icon-btn {
    border-right: none;
    color: var(--fg-tertiary);
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-3);
    height: var(--tabs-height);
    min-width: 0;
    max-width: var(--tab-max-width);
    background: var(--bg-elevated);
    color: var(--fg-secondary);
    font-size: var(--fs-sm);
    border-right: 1px solid var(--border-subtle);
    position: relative;
    user-select: none;
    cursor: pointer;
    transition:
      background var(--motion-fast) var(--ease-out),
      color var(--motion-fast) var(--ease-out);
  }
  .tab:hover {
    background: var(--bg-hover);
    color: var(--fg-primary);
  }

  .tab--active {
    background: var(--bg-base);
    color: var(--fg-primary);
  }
  .tab--active::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: var(--accent-indicator);
    background: var(--accent);
  }
  /* Override the tabs-bar bottom border under the active tab,
     giving the visual "tab fused with editor" effect. */
  .tab--active::after {
    content: "";
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--bg-base);
  }

  /* Drag affordances (MDP-19). The dragged tab dims; the drop target gets a
     2px accent insertion bar on its leading edge. */
  .tab--dragging {
    opacity: 0.5;
  }
  .tab--drag-over::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--accent-indicator);
    background: var(--accent);
  }

  .tab--dirty .tab__title {
    font-style: italic;
  }

  .tab__dot {
    width: var(--dot-size);
    height: var(--dot-size);
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
  }

  .tab__title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: var(--fw-medium);
  }

  .tab__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--h-control-2xs);
    height: var(--h-control-2xs);
    margin-left: var(--space-1);
    padding: 0;
    background: transparent;
    color: var(--fg-tertiary);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    opacity: 0;
    transition:
      opacity var(--motion-fast) var(--ease-out),
      background var(--motion-fast) var(--ease-out),
      color var(--motion-fast) var(--ease-out);
  }
  .tab:hover .tab__close,
  .tab--active .tab__close {
    opacity: 1;
  }
  .tab__close:hover {
    background: var(--bg-active);
    color: var(--fg-primary);
  }
</style>
