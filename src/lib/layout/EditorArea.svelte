<script lang="ts">
  import Icon from "$lib/ui/Icon.svelte";
  import Button from "$lib/ui/Button.svelte";
  import Editor from "$lib/editor/Editor.svelte";
  import {
    getActive,
    updateBuffer,
    createUntitled,
  } from "$lib/stores/documents.svelte";

  // The active document comes from the shared store (MDP-8). Editing the
  // buffer flows back via updateBuffer; if no document is open we show the
  // welcome empty-state.
  const active = $derived(getActive());

  function onCreate() {
    createUntitled();
  }
</script>

{#if active}
  <section class="editor" aria-label="Editor">
    {#key active.id}
      <Editor
        doc={active.buffer}
        onDocChange={(next) => updateBuffer(active.id, next)}
      />
    {/key}
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
