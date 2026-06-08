<script lang="ts">
  import { tick } from "svelte";
  import Icon from "$lib/ui/Icon.svelte";
  import type { IconName } from "$lib/ui/icons";

  /**
   * Floating context menu (MDP-19).
   *
   * Positioned at viewport coordinates (the cursor), rendered into a portal
   * appended to <body> so the parent's `overflow: hidden` never clips it.
   * Closes fail-closed on: Escape, a click/contextmenu outside the menu, a
   * scroll/resize, or after an item is chosen.
   *
   * State is owned by the caller: it passes the items + position and an
   * `onClose` callback. Disabled items are skipped on click and visually
   * dimmed.
   */

  export interface MenuItem {
    /** Stable key for the `{#each}` block. */
    id: string;
    label: string;
    icon?: IconName;
    disabled?: boolean;
    /** Renders a 1px divider *above* this item. */
    separatorBefore?: boolean;
    onSelect: () => void;
  }

  interface Props {
    items: MenuItem[];
    x: number;
    y: number;
    onClose: () => void;
  }

  const { items, x, y, onClose }: Props = $props();

  let menuEl: HTMLDivElement | undefined = $state();
  // Clamp offsets applied after mount so the menu never overflows the
  // viewport. `null` ⇒ not measured yet, render at the raw cursor point.
  let clampedX = $state<number | null>(null);
  let clampedY = $state<number | null>(null);
  const posX = $derived(clampedX ?? x);
  const posY = $derived(clampedY ?? y);

  function selectItem(item: MenuItem): void {
    if (item.disabled) return;
    // Run the action first, then close. Closing first would unmount the menu
    // mid-handler; order keeps the callback's `this`-free closure intact.
    item.onSelect();
    onClose();
  }

  function onWindowPointerDown(e: PointerEvent): void {
    // A pointer down anywhere outside the menu dismisses it. Inside clicks are
    // handled by the item buttons themselves.
    if (menuEl && e.target instanceof Node && menuEl.contains(e.target)) {
      return;
    }
    onClose();
  }

  function onWindowKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  function onWindowScrollOrResize(): void {
    // Any layout shift invalidates the cursor-anchored position; fail-closed.
    onClose();
  }

  // Portal: move the menu node to <body> on mount so ancestor `overflow`
  // clipping and stacking contexts cannot hide it.
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }

  // After the menu has a measurable size, clamp it inside the viewport.
  $effect(() => {
    // Track the requested point + contents so the clamp re-runs if they change.
    const reqX = x;
    const reqY = y;
    void items;
    void tick().then(() => {
      if (!menuEl) return;
      const rect = menuEl.getBoundingClientRect();
      const margin = 4;
      let nx = reqX;
      let ny = reqY;
      if (nx + rect.width > window.innerWidth - margin) {
        nx = Math.max(margin, window.innerWidth - rect.width - margin);
      }
      if (ny + rect.height > window.innerHeight - margin) {
        ny = Math.max(margin, window.innerHeight - rect.height - margin);
      }
      clampedX = nx;
      clampedY = ny;
    });
  });
</script>

<svelte:window
  onpointerdown={onWindowPointerDown}
  onkeydown={onWindowKeydown}
  onscroll={onWindowScrollOrResize}
  onresize={onWindowScrollOrResize}
/>

<div
  bind:this={menuEl}
  use:portal
  class="context-menu"
  role="menu"
  tabindex="-1"
  style="left: {posX}px; top: {posY}px;"
>
  {#each items as item (item.id)}
    {#if item.separatorBefore}
      <div class="context-menu__sep" role="separator"></div>
    {/if}
    <button
      class="context-menu__item"
      type="button"
      role="menuitem"
      disabled={item.disabled}
      onclick={() => selectItem(item)}
    >
      {#if item.icon}
        <Icon name={item.icon} size={14} />
      {:else}
        <span class="context-menu__icon-spacer" aria-hidden="true"></span>
      {/if}
      <span class="context-menu__label">{item.label}</span>
    </button>
  {/each}
</div>

<style>
  .context-menu {
    position: fixed;
    z-index: 1000;
    min-width: 180px;
    max-width: 320px;
    padding: var(--space-1);
    background: var(--bg-overlay);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-overlay);
    font-family: var(--font-ui);
    font-size: var(--fs-sm);
    display: flex;
    flex-direction: column;
    gap: var(--space-half);
  }

  .context-menu__sep {
    height: 1px;
    margin: var(--space-1) 0;
    background: var(--border-subtle);
  }

  .context-menu__item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: 0 var(--space-2);
    height: var(--h-control-sm);
    background: transparent;
    color: var(--fg-primary);
    border: none;
    border-radius: var(--radius-sm);
    text-align: left;
    cursor: pointer;
    transition:
      background var(--motion-fast) var(--ease-out),
      color var(--motion-fast) var(--ease-out);
  }
  .context-menu__item:hover:not(:disabled),
  .context-menu__item:focus-visible {
    background: var(--bg-hover);
  }
  .context-menu__item:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: -2px;
  }
  .context-menu__item:disabled {
    color: var(--fg-tertiary);
    cursor: default;
  }

  .context-menu__icon-spacer {
    display: inline-block;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  .context-menu__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
