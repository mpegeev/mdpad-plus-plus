<script lang="ts">
  // Design system demo. Will be replaced in MDP-2 (Layout skeleton).
  import Icon from "$lib/ui/Icon.svelte";
  import { cn } from "$lib/ui/utils";

  let activeButton = $state<"primary" | "secondary" | "ghost" | null>(null);
</script>

<main class="demo">
  <header class="demo__header">
    <Icon name="file-text" size={16} />
    <span>mdpad++ · Design system demo (MDP-34)</span>
  </header>

  <div class="demo__body">
    <!-- bg levels -->
    <section class="demo__section">
      <h2 class="demo__title">Surfaces</h2>
      <div class="demo__row">
        <div class="swatch swatch--base">bg-base</div>
        <div class="swatch swatch--elevated">bg-elevated</div>
        <div class="swatch swatch--overlay">bg-overlay</div>
        <div class="swatch swatch--hover">bg-hover</div>
        <div class="swatch swatch--active">bg-active</div>
      </div>
    </section>

    <!-- fg levels -->
    <section class="demo__section">
      <h2 class="demo__title">Text</h2>
      <div class="demo__row">
        <span class="fg-primary">fg-primary</span>
        <span class="fg-secondary">fg-secondary</span>
        <span class="fg-tertiary">fg-tertiary</span>
        <span class="fg-accent">fg-accent</span>
      </div>
    </section>

    <!-- buttons -->
    <section class="demo__section">
      <h2 class="demo__title">Buttons</h2>
      <div class="demo__row">
        <button
          class={cn(
            "btn btn--primary",
            activeButton === "primary" && "btn--pressed",
          )}
          onclick={() => (activeButton = "primary")}
        >
          <Icon name="save" size={14} /> Save
        </button>
        <button
          class={cn(
            "btn btn--secondary",
            activeButton === "secondary" && "btn--pressed",
          )}
          onclick={() => (activeButton = "secondary")}
        >
          <Icon name="folder-open" size={14} /> Open
        </button>
        <button
          class={cn(
            "btn btn--ghost",
            activeButton === "ghost" && "btn--pressed",
          )}
          onclick={() => (activeButton = "ghost")}
        >
          <Icon name="settings" size={14} />
        </button>
      </div>
    </section>

    <!-- semantic -->
    <section class="demo__section">
      <h2 class="demo__title">Semantic</h2>
      <div class="demo__row">
        <span class="badge badge--danger">danger</span>
        <span class="badge badge--warning">warning</span>
        <span class="badge badge--success">success</span>
        <span class="badge badge--accent">accent</span>
      </div>
    </section>
  </div>
</main>

<style>
  .demo {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-base);
    color: var(--fg-primary);
    font-family: var(--font-ui);
    font-size: var(--fs-base);
  }

  .demo__header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: var(--tabs-height);
    padding: 0 var(--space-4);
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-subtle);
    color: var(--fg-secondary);
    font-size: var(--fs-sm);
  }

  .demo__body {
    padding: var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .demo__section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .demo__title {
    margin: 0;
    font-size: var(--fs-sm);
    font-weight: var(--fw-medium);
    color: var(--fg-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .demo__row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  /* Swatches */
  .swatch {
    width: 100px;
    height: 56px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: var(--fs-xs);
    line-height: var(--lh-tight);
    color: var(--fg-secondary);
  }
  .swatch--base {
    background: var(--bg-base);
  }
  .swatch--elevated {
    background: var(--bg-elevated);
  }
  .swatch--overlay {
    background: var(--bg-overlay);
  }
  .swatch--hover {
    background: var(--bg-hover);
  }
  .swatch--active {
    background: var(--bg-active);
  }

  /* Text */
  .fg-primary {
    color: var(--fg-primary);
    font-size: var(--fs-md);
  }
  .fg-secondary {
    color: var(--fg-secondary);
    font-size: var(--fs-md);
  }
  .fg-tertiary {
    color: var(--fg-tertiary);
    font-size: var(--fs-md);
  }
  .fg-accent {
    color: var(--accent);
    font-size: var(--fs-md);
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    height: var(--h-control-md);
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: var(--fs-base);
    font-weight: var(--fw-medium);
    cursor: pointer;
    border: none;
    transition:
      background var(--motion-fast) var(--ease-out),
      border-color var(--motion-fast) var(--ease-out);
  }

  .btn--primary {
    background: var(--accent);
    color: var(--fg-inverted);
  }
  .btn--primary:hover {
    background: var(--accent-hover);
  }

  .btn--secondary {
    background: transparent;
    color: var(--fg-primary);
    border: 1px solid var(--border-default);
  }
  .btn--secondary:hover {
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }

  .btn--ghost {
    background: transparent;
    color: var(--fg-secondary);
    height: var(--h-control-sm);
    padding: 0 var(--space-2);
  }
  .btn--ghost:hover {
    background: var(--bg-hover);
    color: var(--fg-primary);
  }

  .btn--pressed {
    background: var(--bg-active);
  }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    height: var(--h-control-sm);
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    font-size: var(--fs-xs);
    font-weight: var(--fw-medium);
  }
  .badge--danger {
    background: var(--danger);
    color: var(--fg-inverted);
  }
  .badge--warning {
    background: var(--warning);
    color: var(--fg-inverted);
  }
  .badge--success {
    background: var(--success);
    color: var(--fg-inverted);
  }
  .badge--accent {
    background: var(--accent-muted);
    color: var(--accent);
  }
</style>
