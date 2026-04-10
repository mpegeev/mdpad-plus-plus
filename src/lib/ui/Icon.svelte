<script lang="ts">
  import { icons, type IconName } from "./icons";

  interface Props {
    name: IconName;
    size?: number;
    class?: string;
  }

  const { name, size = 16, class: cls = "" }: Props = $props();

  const nodes = $derived(icons[name] ?? []);
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cls}
  aria-hidden="true"
>
  {#each nodes as [tag, attrs]}
    {#if tag === "path"}
      <path {...attrs} />
    {:else if tag === "circle"}
      <circle {...attrs} />
    {:else if tag === "ellipse"}
      <ellipse {...attrs} />
    {:else if tag === "rect"}
      <rect {...attrs} />
    {:else if tag === "line"}
      <line {...attrs} />
    {:else if tag === "polyline"}
      <polyline {...attrs} />
    {:else if tag === "polygon"}
      <polygon {...attrs} />
    {/if}
  {/each}
</svg>
