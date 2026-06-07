<script lang="ts">
  import Icon from "$lib/ui/Icon.svelte";
  import { getActive, setWrap } from "$lib/stores/documents.svelte";

  // Other segments (cursor position, encoding, EOL) remain static placeholders
  // wired in later tasks. The wrap toggle (MDP-10) reads/writes the active
  // document's per-document `wrap` flag in the documents store.
  const active = $derived(getActive());
  const wrap = $derived(active?.wrap ?? false);

  function toggleWrap() {
    if (!active) return;
    setWrap(active.id, !active.wrap);
  }
</script>

<footer class="statusbar" aria-label="Status bar">
  <div class="statusbar__left">
    <span class="status-seg status-seg--state">
      <span class="status-dot status-dot--saved" aria-hidden="true"></span>
      Сохранено
    </span>
    <span class="status-seg">Стр 1, Кол 1</span>
    <span class="status-seg">Sel: 0</span>
  </div>

  <div class="statusbar__right">
    <button
      class="status-seg status-seg--btn"
      type="button"
      aria-label="Toggle line wrap"
      aria-pressed={wrap}
      disabled={!active}
      onclick={toggleWrap}
    >
      <Icon name="wrap-text" size={11} />
      Перенос: {wrap ? "вкл" : "выкл"}
    </button>
    <span class="status-seg">UTF-8</span>
    <span class="status-seg">LF</span>
    <span class="status-seg status-seg--lang">Markdown</span>
  </div>
</footer>

<style>
  .statusbar {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    height: var(--statusbar-height);
    background: var(--bg-elevated);
    border-top: 1px solid var(--border-subtle);
    font-size: var(--fs-xs);
    color: var(--fg-secondary);
    flex-shrink: 0;
    overflow: hidden;
  }

  .statusbar__left,
  .statusbar__right {
    display: flex;
    min-width: 0;
  }

  .status-seg {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0 var(--space-3);
    border-right: 1px solid var(--border-subtle);
    background: transparent;
    color: inherit;
    font-family: var(--font-ui);
    font-size: inherit;
    white-space: nowrap;
  }
  .statusbar__right .status-seg {
    border-right: none;
    border-left: 1px solid var(--border-subtle);
  }

  .status-seg--btn {
    border: none;
    border-left: 1px solid var(--border-subtle);
    cursor: pointer;
    transition:
      background var(--motion-fast) var(--ease-out),
      color var(--motion-fast) var(--ease-out);
  }
  .status-seg--btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--fg-primary);
  }
  .status-seg--btn:disabled {
    cursor: default;
  }

  .status-seg--state {
    padding-left: var(--space-4);
  }
  .status-seg--lang {
    color: var(--fg-primary);
    font-weight: var(--fw-medium);
  }

  .status-dot {
    width: var(--dot-size);
    height: var(--dot-size);
    border-radius: 50%;
    flex-shrink: 0;
  }
  .status-dot--saved {
    background: var(--success);
  }
</style>
