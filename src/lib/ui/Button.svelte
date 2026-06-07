<script lang="ts">
  import type { Snippet } from "svelte";

  type Variant = "primary" | "ghost";

  interface Props {
    variant?: Variant;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    onclick?: (event: MouseEvent) => void;
    ariaLabel?: string;
    children: Snippet;
  }

  const {
    variant = "ghost",
    type = "button",
    disabled = false,
    onclick,
    ariaLabel,
    children,
  }: Props = $props();
</script>

<button
  class="btn btn--{variant}"
  {type}
  {disabled}
  {onclick}
  aria-label={ariaLabel}
>
  {@render children()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    height: var(--h-control-md);
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--fs-sm);
    font-weight: var(--fw-medium);
    font-family: var(--font-ui);
    border: 1px solid transparent;
    cursor: pointer;
    transition:
      background var(--motion-fast) var(--ease-out),
      border-color var(--motion-fast) var(--ease-out);
    white-space: nowrap;
  }
  .btn:disabled {
    cursor: default;
    opacity: 0.85;
  }
  .btn--primary {
    background: var(--accent);
    color: var(--accent-fg);
  }
  .btn--primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }
  .btn--ghost {
    background: transparent;
    color: var(--fg-primary);
    border-color: var(--border-default);
  }
  .btn--ghost:hover:not(:disabled) {
    background: var(--bg-hover);
  }
</style>
