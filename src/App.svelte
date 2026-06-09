<script lang="ts">
  import TabsBar from "$lib/layout/TabsBar.svelte";
  import Sidebar from "$lib/layout/Sidebar.svelte";
  import ResizeHandle from "$lib/layout/ResizeHandle.svelte";
  import EditorArea from "$lib/layout/EditorArea.svelte";
  import StatusBar from "$lib/layout/StatusBar.svelte";
  import {
    SIDEBAR_DEFAULT,
    SIDEBAR_MIN,
    SIDEBAR_MAX,
  } from "$lib/layout/clampSidebarWidth";
  import {
    setActive,
    getActive,
    type DocumentId,
  } from "$lib/stores/documents.svelte";
  import { revealPath } from "$lib/stores/fileTree.svelte";

  let sidebarWidth = $state(SIDEBAR_DEFAULT);
  let sidebarCollapsed = $state(false);

  // Apply default data-theme on <html> at startup. data-density and
  // data-accent are intentionally left unset (= defaults from tokens.css /
  // themes/*.css). UI to change these lands in MDP-26..28. Override from
  // devtools: document.documentElement.dataset.theme = "dark".
  $effect(() => {
    const root = document.documentElement;
    if (!root.dataset.theme) {
      root.dataset.theme = "light";
    }
  });

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
  }

  function onSidebarResize(next: number) {
    sidebarWidth = next;
  }

  // "Reveal in Sidebar" (MDP-19 + MDP-47). Make the document active so the
  // file-tree highlights its row, ensure the sidebar is visible, then expand
  // every collapsed ancestor folder down to the file (expand-to-path, MDP-47).
  // Sidebar scrolls the active row into view once it becomes reachable.
  function onRevealInSidebar(id: DocumentId) {
    setActive(id);
    if (sidebarCollapsed) sidebarCollapsed = false;
    const doc = getActive();
    // No path (unsaved untitled) → nothing to reveal in the tree (fail-closed).
    if (doc?.path) void revealPath(doc.path);
  }
</script>

<div
  class="app"
  style="--sidebar-current-width: {sidebarCollapsed ? 0 : sidebarWidth}px;"
>
  <TabsBar
    {sidebarCollapsed}
    onToggleSidebar={toggleSidebar}
    {onRevealInSidebar}
  />

  <div class="app__middle">
    {#if !sidebarCollapsed}
      <div class="app__sidebar">
        <Sidebar />
      </div>
      <ResizeHandle
        currentWidth={sidebarWidth}
        min={SIDEBAR_MIN}
        max={SIDEBAR_MAX}
        onResize={onSidebarResize}
      />
    {/if}
    <div class="app__editor">
      <EditorArea />
    </div>
  </div>

  <StatusBar />
</div>

<style>
  .app {
    display: grid;
    grid-template-rows: var(--tabs-height) 1fr var(--statusbar-height);
    height: 100vh;
    width: 100vw;
    background: var(--bg-base);
    color: var(--fg-primary);
    font-family: var(--font-ui);
    font-size: var(--fs-base);
    overflow: hidden;
  }

  .app__middle {
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  .app__sidebar {
    width: var(--sidebar-current-width);
    min-width: 0;
    height: 100%;
    border-right: 1px solid var(--border-subtle);
    flex-shrink: 0;
    overflow: hidden;
  }

  .app__editor {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    overflow: hidden;
  }
</style>
