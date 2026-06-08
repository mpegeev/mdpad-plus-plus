<script lang="ts">
  import Icon from "$lib/ui/Icon.svelte";
  import type { IconName } from "$lib/ui/icons";
  import {
    getActive,
    setWrap,
    setMode,
    type DocumentMode,
  } from "$lib/stores/documents.svelte";
  import { cycleMode } from "$lib/editor/mode";

  // Other segments (cursor position, encoding, EOL) remain static placeholders
  // wired in later tasks. The wrap toggle (MDP-10) reads/writes the active
  // document's per-document `wrap` flag in the documents store.
  const active = $derived(getActive());
  const wrap = $derived(active?.wrap ?? false);

  function toggleWrap() {
    if (!active) return;
    setWrap(active.id, !active.wrap);
  }

  // Render-mode toggle (MDP-15). A single button cycles the active document's
  // mode rendered → mixed → raw → rendered (same order as the Ctrl+E shortcut);
  // the three icons make the available modes visible, with the active one
  // highlighted. The active mode is also announced via the button aria-label.
  const MODES: { mode: DocumentMode; icon: IconName; label: string }[] = [
    { mode: "rendered", icon: "eye", label: "Рендер" },
    { mode: "mixed", icon: "panel-top", label: "Смешанный" },
    { mode: "raw", icon: "code", label: "Raw" },
  ];

  const mode = $derived<DocumentMode>(active?.mode ?? "rendered");

  function toggleMode() {
    if (!active) return;
    setMode(active.id, cycleMode(active.mode));
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
      class="status-seg status-seg--btn status-seg--mode"
      type="button"
      aria-label={`Режим отображения: ${
        MODES.find((m) => m.mode === mode)?.label
      } (переключить, Ctrl+E)`}
      disabled={!active}
      onclick={toggleMode}
    >
      {#each MODES as m (m.mode)}
        <span
          class="mode-ind"
          class:mode-ind--active={m.mode === mode}
          data-mode={m.mode}
          aria-current={m.mode === mode ? "true" : undefined}
        >
          <Icon name={m.icon} size={11} />
        </span>
      {/each}
    </button>
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

  /* Render-mode toggle: three icon indicators in one button (MDP-15). */
  .status-seg--mode {
    gap: var(--space-half);
  }
  .mode-ind {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 var(--space-half);
    border-radius: var(--radius-sm);
    color: var(--fg-tertiary);
    transition: color var(--motion-fast) var(--ease-out);
  }
  .mode-ind--active {
    color: var(--fg-primary);
    background: var(--accent-muted);
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
