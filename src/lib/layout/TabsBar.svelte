<script lang="ts">
  import Icon from "$lib/ui/Icon.svelte";
  import {
    getDocuments,
    getActiveId,
    isDirty,
    setActive,
    closeTab,
    createUntitled,
  } from "$lib/stores/documents.svelte";

  interface Props {
    sidebarCollapsed: boolean;
    onToggleSidebar: () => void;
  }

  const { sidebarCollapsed, onToggleSidebar }: Props = $props();

  // Tabs are driven by the shared document store (MDP-8 + MDP-9 wiring).
  const documents = $derived(getDocuments());
  const activeId = $derived(getActiveId());

  function onCloseTab(e: MouseEvent, id: string) {
    // Stop the click from also activating the tab being closed.
    e.stopPropagation();
    closeTab(id);
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
       lands in MDP-19 (drag-reorder + context menu). For now tabs activate and
       close; roles stay minimal to avoid promising a tabpanel that does not
       yet exist. -->
  <div class="tabs-bar__tabs">
    {#each documents as doc (doc.id)}
      <div
        class="tab"
        class:tab--active={doc.id === activeId}
        class:tab--dirty={isDirty(doc.id)}
        role="button"
        tabindex="0"
        title={doc.path ?? doc.name}
        onclick={() => setActive(doc.id)}
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
