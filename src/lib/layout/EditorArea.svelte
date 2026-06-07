<script lang="ts">
  import Icon from "$lib/ui/Icon.svelte";
  import Button from "$lib/ui/Button.svelte";
  import Editor from "$lib/editor/Editor.svelte";
  import { getActive } from "$lib/stores/documents.svelte";

  // Until the document store from MDP-8 lands, we keep a local sample doc.
  // The "Создать файл" button simulates "open" by populating it. This page
  // exists to show the Editor component works end-to-end inside the layout.
  let sampleDoc = $state("");

  // Line-wrap (MDP-10) is per-document state. Until full content wiring lands
  // (MDP-9), we read only the wrap flag of the active document; falls back to
  // `false` when no document is active.
  const lineWrap = $derived(getActive()?.wrap ?? false);

  function openSample() {
    sampleDoc =
      "# Hello\n\n" +
      "Welcome to **mdpad++** — write markdown, see syntax highlighting, " +
      "use `Ctrl+Z` to undo.\n\n" +
      "## Subheading\n\n" +
      "- Item one\n" +
      "- Item two\n\n" +
      "> A quote in serif… for inspiration.\n";
  }
</script>

{#if sampleDoc.length > 0}
  <section class="editor" aria-label="Editor">
    <Editor
      doc={sampleDoc}
      onDocChange={(next) => (sampleDoc = next)}
      {lineWrap}
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
        <Button variant="primary" onclick={openSample}>
          <Icon name="plus" size={13} />
          Создать файл
        </Button>
        <Button variant="ghost" disabled>
          <Icon name="folder-open" size={13} />
          Открыть…
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
