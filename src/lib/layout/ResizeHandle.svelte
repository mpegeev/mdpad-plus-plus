<script lang="ts">
  import { clampSidebarWidth } from "./clampSidebarWidth";

  interface Props {
    currentWidth: number;
    min?: number;
    max?: number;
    onResize: (next: number) => void;
  }

  const { currentWidth, min = 160, max = 480, onResize }: Props = $props();

  let startX = 0;
  let startWidth = 0;
  let dragging = $state(false);

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    startX = event.clientX;
    startWidth = currentWidth;
    dragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging) return;
    const delta = event.clientX - startX;
    onResize(clampSidebarWidth(startWidth + delta, min, max));
  }

  function onPointerUp(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    const step = event.shiftKey ? 16 : 4;
    if (event.key === "ArrowLeft") {
      onResize(clampSidebarWidth(currentWidth - step, min, max));
      event.preventDefault();
    } else if (event.key === "ArrowRight") {
      onResize(clampSidebarWidth(currentWidth + step, min, max));
      event.preventDefault();
    }
  }
</script>

<!-- Focusable splitter per WAI-ARIA Authoring Practices (role="separator" with
     tabindex + arrow keys). The a11y lint rules don't recognize this pattern. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="resize-handle"
  class:resize-handle--dragging={dragging}
  role="separator"
  aria-label="Resize sidebar"
  aria-orientation="vertical"
  aria-valuemin={min}
  aria-valuemax={max}
  aria-valuenow={currentWidth}
  tabindex="0"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  onkeydown={onKeyDown}
></div>

<style>
  .resize-handle {
    width: var(--splitter-width);
    height: 100%;
    background: transparent;
    cursor: col-resize;
    flex-shrink: 0;
    touch-action: none;
    transition: background var(--motion-fast) var(--ease-out);
  }
  .resize-handle:hover,
  .resize-handle--dragging,
  .resize-handle:focus-visible {
    background: var(--accent);
    outline: none;
  }
</style>
