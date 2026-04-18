<script lang="ts">
  import Icon from "$lib/ui/Icon.svelte";

  interface Props {
    sidebarCollapsed: boolean;
    onToggleSidebar: () => void;
  }

  const { sidebarCollapsed, onToggleSidebar }: Props = $props();
</script>

<div class="tabs-bar" role="toolbar" aria-label="Document tabs">
  <button
    class="tabs-bar__toggle"
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

  <div class="tabs-bar__tabs" role="tablist">
    <div class="tab tab--active" role="tab" aria-selected="true">
      <Icon name="file-text" size={14} />
      <span class="tab__title">untitled.md</span>
    </div>
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

  .tabs-bar__toggle {
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
    transition: background var(--motion-fast) var(--ease-out);
  }
  .tabs-bar__toggle:hover {
    background: var(--bg-hover);
    color: var(--fg-primary);
  }
  .tabs-bar__toggle:focus-visible {
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

  .tab__title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
