<script lang="ts">
  import Icon from "$lib/ui/Icon.svelte";
  import Button from "$lib/ui/Button.svelte";
  import { readFile } from "$lib/fs";
  import { openFile, getActive } from "$lib/stores/documents.svelte";
  import {
    getRootPath,
    getFlatNodes,
    isMarkdownOnly,
    isRootLoading,
    getRootError,
    pickAndOpenFolder,
    toggleMarkdownOnly,
    toggleDir,
    restoreLastFolder,
  } from "$lib/stores/fileTree.svelte";
  import { computeWindow } from "$lib/stores/fileTree";

  // --- Virtualization geometry ---
  // Fixed 24px rows (DESIGN.md: tree-row height 24px) let us window the
  // visible slice cheaply; folders > 1000 files never mount > viewport+overscan
  // DOM nodes. Indentation is 14px/level (DESIGN.md).
  const ROW_HEIGHT = 24;
  const INDENT = 14;
  const OVERSCAN = 8;

  // Reactive views over the store.
  const rootPath = $derived(getRootPath());
  const flat = $derived(getFlatNodes());
  const markdownOnly = $derived(isMarkdownOnly());
  const loading = $derived(isRootLoading());
  const error = $derived(getRootError());
  // Path of the active document — highlights the matching file row.
  const activePath = $derived(getActive()?.path ?? null);

  let scrollTop = $state(0);
  let viewportH = $state(0);
  let scrollEl: HTMLDivElement | undefined = $state();

  const win = $derived(
    computeWindow(flat.length, ROW_HEIGHT, scrollTop, viewportH, OVERSCAN),
  );
  const visibleRows = $derived(flat.slice(win.start, win.end));

  // Restore the persisted folder once on mount.
  $effect(() => {
    void restoreLastFolder();
  });

  function onScroll(e: Event) {
    scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
  }

  function measure() {
    if (scrollEl) viewportH = scrollEl.clientHeight;
  }

  $effect(() => {
    measure();
    if (typeof ResizeObserver === "undefined" || !scrollEl) return;
    const ro = new ResizeObserver(measure);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  });

  async function onRowActivate(path: string, isDir: boolean) {
    if (isDir) {
      await toggleDir(path);
      return;
    }
    // AC: double-click a file → read + open/activate tab. openFile already
    // activates an existing tab when the path is already open.
    try {
      const contents = await readFile(path);
      openFile(path, contents);
    } catch {
      // Read failure (deleted, perms): swallow here; a toast surface lands
      // with the broader error UX. Tree stays usable.
    }
  }

  function onRowKeydown(e: KeyboardEvent, path: string, isDir: boolean) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      void onRowActivate(path, isDir);
    }
  }

  async function onOpenFolder() {
    await pickAndOpenFolder();
  }
</script>

<aside class="sidebar" aria-label="File tree">
  <div class="sidebar__header">
    <span class="sidebar__heading">Files</span>
    <div class="sidebar__head-actions">
      <button
        class="ghost-btn"
        class:ghost-btn--on={markdownOnly}
        type="button"
        aria-label="Показывать только Markdown-файлы"
        aria-pressed={markdownOnly}
        title="Только .md / .markdown / .txt"
        onclick={toggleMarkdownOnly}
      >
        <Icon name="file-text" size={13} />
      </button>
      <button
        class="ghost-btn"
        type="button"
        aria-label="Открыть папку"
        title="Открыть папку"
        onclick={onOpenFolder}
      >
        <Icon name="folder-open" size={13} />
      </button>
    </div>
  </div>

  {#if rootPath === null}
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
      <Button variant="primary" onclick={onOpenFolder}>
        <Icon name="folder-open" size={13} />
        Открыть папку…
      </Button>
      {#if error !== null}
        <p class="sidebar__error" role="alert">Не удалось открыть: {error}</p>
      {/if}
    </div>
  {:else}
    <div
      class="sidebar__tree"
      bind:this={scrollEl}
      onscroll={onScroll}
      role="tree"
      aria-label="Дерево файлов"
      tabindex="-1"
    >
      {#if loading}
        <div class="sidebar__loading" aria-live="polite">Загрузка…</div>
      {:else if flat.length === 0}
        <div class="sidebar__loading">Пусто</div>
      {:else}
        <!-- Spacer holds the full scroll height; only the windowed slice is
             absolutely positioned at offsetY. -->
        <div class="sidebar__spacer" style="height: {win.totalHeight}px;">
          <div
            class="sidebar__rows"
            style="transform: translateY({win.offsetY}px);"
          >
            {#each visibleRows as node (node.path)}
              <div
                class="tree-row"
                class:tree-row--dir={node.isDir}
                class:tree-row--active={!node.isDir && node.path === activePath}
                role="treeitem"
                aria-expanded={node.isDir ? node.expanded : undefined}
                aria-selected={!node.isDir && node.path === activePath}
                aria-level={node.depth + 1}
                tabindex="0"
                style="height: {ROW_HEIGHT}px; padding-left: {node.depth *
                  INDENT +
                  8}px;"
                ondblclick={() => onRowActivate(node.path, node.isDir)}
                onclick={() => {
                  if (node.isDir) void toggleDir(node.path);
                }}
                onkeydown={(e) => onRowKeydown(e, node.path, node.isDir)}
              >
                {#if node.isDir}
                  <span
                    class="tree-row__chevron"
                    class:tree-row__chevron--open={node.expanded}
                    aria-hidden="true"
                  >
                    <Icon name="chevron-right" size={14} />
                  </span>
                  <Icon
                    name={node.expanded ? "folder-open" : "folder"}
                    size={14}
                  />
                {:else}
                  <span class="tree-row__chevron-spacer" aria-hidden="true"
                  ></span>
                  <Icon name="file-text" size={14} />
                {/if}
                <span class="tree-row__name">{node.name}</span>
                {#if node.isDir && node.loading}
                  <span class="tree-row__spinner" aria-hidden="true">·</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
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
  .ghost-btn--on {
    background: var(--bg-active);
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
  .sidebar__error {
    color: var(--danger);
  }

  .sidebar__tree {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    position: relative;
  }

  .sidebar__loading {
    padding: var(--space-3);
    color: var(--fg-tertiary);
    font-size: var(--fs-sm);
  }

  .sidebar__spacer {
    position: relative;
    width: 100%;
  }
  .sidebar__rows {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    will-change: transform;
  }

  .tree-row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding-right: var(--space-2);
    color: var(--fg-secondary);
    cursor: pointer;
    user-select: none;
    border-left: var(--accent-indicator) solid transparent;
    transition: background var(--motion-fast) var(--ease-out);
  }
  .tree-row:hover {
    background: var(--bg-hover);
    color: var(--fg-primary);
  }
  .tree-row:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: -2px;
  }
  .tree-row--dir {
    color: var(--fg-primary);
    font-weight: var(--fw-medium);
  }
  .tree-row--active {
    background: var(--bg-active);
    color: var(--fg-primary);
    border-left-color: var(--accent);
  }
  .tree-row--active:hover {
    background: var(--bg-active);
  }

  .tree-row__chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-tertiary);
    transition: transform var(--motion-fast) var(--ease-out);
    flex-shrink: 0;
  }
  .tree-row__chevron--open {
    transform: rotate(90deg);
  }
  .tree-row__chevron-spacer {
    display: inline-block;
    width: 14px;
    flex-shrink: 0;
  }

  .tree-row__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tree-row__spinner {
    margin-left: auto;
    color: var(--fg-tertiary);
  }
</style>
