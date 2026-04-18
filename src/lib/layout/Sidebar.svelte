<script lang="ts">
  import Icon from "$lib/ui/Icon.svelte";
</script>

<aside class="sidebar" aria-label="File tree">
  <div class="sidebar__header">
    <Icon name="folder-open" size={14} />
    <span>Files</span>
  </div>
  <div class="sidebar__body">
    <p class="sidebar__placeholder">
      File tree will land in M2. For now this panel is a placeholder.
    </p>
  </div>
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    min-width: 0;
    background: var(--bg-elevated);
    color: var(--fg-primary);
    font-size: var(--fs-sm);
    overflow: hidden;
  }

  .sidebar__header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: var(--tabs-height);
    padding: 0 var(--space-3);
    color: var(--fg-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: var(--fs-xs);
    font-weight: var(--fw-medium);
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
  }

  .sidebar__body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding: var(--space-2) var(--space-3);
  }

  .sidebar__placeholder {
    margin: 0;
    color: var(--fg-tertiary);
    font-size: var(--fs-sm);
    line-height: var(--lh-normal);
  }
</style>
