<script lang="ts">
  import Icon from "$lib/ui/Icon.svelte";
  import Button from "$lib/ui/Button.svelte";

  // Static empty-state placeholder. Real open-folder flow and tree
  // rendering land in MDP-7 + MDP-9. Buttons are non-interactive on purpose.
</script>

<aside class="sidebar" aria-label="File tree">
  <div class="sidebar__header">
    <span class="sidebar__heading">Files</span>
    <div class="sidebar__head-actions">
      <button
        class="ghost-btn"
        type="button"
        aria-label="New file (disabled in placeholder)"
        disabled
      >
        <Icon name="plus" size={13} />
      </button>
      <button
        class="ghost-btn"
        type="button"
        aria-label="Open folder (disabled in placeholder)"
        disabled
      >
        <Icon name="folder-open" size={13} />
      </button>
    </div>
  </div>

  <div class="sidebar__empty">
    <div class="sidebar__empty-illo" aria-hidden="true">
      <svg
        viewBox="0 0 64 64"
        width="40"
        height="40"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M8 18a3 3 0 0 1 3-3h12l4 5h26a3 3 0 0 1 3 3v25a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z"
        />
        <path d="M16 28h32" opacity=".4" />
        <path d="M16 36h22" opacity=".4" />
      </svg>
    </div>
    <h3>Папка не открыта</h3>
    <p>Откройте папку с заметками, чтобы видеть файлы здесь.</p>
    <Button variant="primary" disabled>
      <Icon name="folder-open" size={13} />
      Открыть папку…
    </Button>
    <Button variant="ghost" disabled>Создать файл</Button>

    <div class="sidebar__recent">
      <div class="sidebar__recent-label">Недавние</div>
      <button class="recent-item" type="button" disabled>
        <Icon name="folder" size={12} />
        <span>~/Documents/notes</span>
      </button>
      <button class="recent-item" type="button" disabled>
        <Icon name="folder" size={12} />
        <span>~/work/mdpad-plus-plus</span>
      </button>
    </div>
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
    justify-content: space-between;
    height: var(--tabs-height);
    padding: 0 var(--space-2) 0 var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
  }

  .sidebar__heading {
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--fg-secondary);
    font-weight: var(--fw-medium);
  }

  .sidebar__head-actions {
    display: flex;
    gap: var(--space-half);
  }

  .ghost-btn {
    width: var(--h-control-xs);
    height: var(--h-control-xs);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--fg-tertiary);
    cursor: pointer;
    transition:
      background var(--motion-fast) var(--ease-out),
      color var(--motion-fast) var(--ease-out);
  }
  .ghost-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--fg-primary);
  }
  .ghost-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .sidebar__empty {
    flex: 1 1 auto;
    padding: var(--space-6) var(--space-4);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    text-align: center;
    gap: var(--space-3);
    overflow: auto;
  }

  .sidebar__empty-illo {
    margin: var(--space-2) auto var(--space-1);
    color: var(--fg-tertiary);
    background: var(--bg-base);
    border: 1px solid var(--border-subtle);
    border-radius: 50%;
    width: var(--illustration-size);
    height: var(--illustration-size);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sidebar__empty h3 {
    margin: 0;
    font-size: var(--fs-base);
    font-weight: var(--fw-medium);
    color: var(--fg-primary);
  }
  .sidebar__empty p {
    margin: 0 0 var(--space-2);
    font-size: var(--fs-sm);
    color: var(--fg-secondary);
    line-height: var(--lh-normal);
    text-wrap: pretty;
  }

  .sidebar__recent {
    margin-top: var(--space-4);
    text-align: left;
    border-top: 1px solid var(--border-subtle);
    padding-top: var(--space-3);
  }
  .sidebar__recent-label {
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--fg-tertiary);
    margin-bottom: var(--space-2);
    padding: 0 var(--space-1);
  }
  .recent-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    height: var(--h-control-sm);
    padding: 0 var(--space-2);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--fg-secondary);
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    text-align: left;
    cursor: pointer;
    transition:
      background var(--motion-fast) var(--ease-out),
      color var(--motion-fast) var(--ease-out);
  }
  .recent-item:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--fg-primary);
  }
  .recent-item:disabled {
    cursor: default;
    opacity: 0.85;
  }
  .recent-item span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
