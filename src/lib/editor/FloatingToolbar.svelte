<script lang="ts">
  /**
   * MDP-16 — всплывающая панель форматирования (floating selection toolbar).
   *
   * Лаконичная панель с icon-кнопками (bold / italic / underline / inline-code /
   * code-fence), появляется над выделением в raw-режиме. Только оболочка:
   * видимость и позицию задаёт родитель (EditorArea) через машину состояний
   * `ToolbarVisibility` и хелпер `clampToolbarPosition`; кнопки сообщают намерение
   * через `onAction`. Сама логика форматирования — MDP-17 (интеграция отдельно).
   *
   * Позиционирование: `position: fixed` с координатами viewport (x/y из
   * clampToolbarPosition). Появление — через `opacity`/`transform` (DESIGN.md:
   * никаких анимаций на `all`/`height`). `pointer-events` снимаются в скрытом
   * состоянии, чтобы панель не перехватывала клики.
   */

  import Icon from "$lib/ui/Icon.svelte";
  import type { IconName } from "$lib/ui/icons";
  import type { ToolbarAction } from "./toolbarVisibility";
  import type { ToolbarPosition } from "./toolbarPosition";

  interface Props {
    /** Показана ли панель. Управляется машиной видимости в родителе. */
    visible?: boolean;
    /** Левый верхний угол панели в координатах viewport. */
    position?: ToolbarPosition;
    /** Намерение форматирования. Проводка к командам — MDP-17. */
    onAction?: (action: ToolbarAction) => void;
  }

  const {
    visible = false,
    position = { x: 0, y: 0 },
    onAction,
  }: Props = $props();

  // Группы кнопок. Разделитель рисуется между группами (DESIGN.md).
  interface ToolbarButton {
    action: ToolbarAction;
    icon: IconName;
    label: string;
  }
  const groups: ToolbarButton[][] = [
    [
      { action: "bold", icon: "bold", label: "Полужирный" },
      { action: "italic", icon: "italic", label: "Курсив" },
      { action: "underline", icon: "underline", label: "Подчёркнутый" },
    ],
    [
      { action: "code", icon: "code-xml", label: "Моноширинный код" },
      { action: "code-fence", icon: "square-code", label: "Блок кода" },
    ],
  ];

  function handle(action: ToolbarAction) {
    onAction?.(action);
  }
</script>

<!--
  Панель всегда в DOM (для плавного opacity-перехода), но aria-hidden и без
  pointer-events когда скрыта. `role="toolbar"` + aria-label делают её
  доступной; каждая кнопка icon-only с обязательным aria-label.
-->
<div
  class="floating-toolbar"
  class:floating-toolbar--visible={visible}
  role="toolbar"
  aria-label="Форматирование выделения"
  aria-hidden={!visible}
  data-testid="floating-toolbar"
  style="--toolbar-x: {position.x}px; --toolbar-y: {position.y}px;"
>
  {#each groups as group, gi (gi)}
    {#if gi > 0}
      <span class="floating-toolbar__sep" aria-hidden="true"></span>
    {/if}
    {#each group as btn (btn.action)}
      <button
        type="button"
        class="floating-toolbar__btn"
        aria-label={btn.label}
        title={btn.label}
        tabindex={visible ? 0 : -1}
        onclick={() => handle(btn.action)}
      >
        <Icon name={btn.icon} size={14} />
      </button>
    {/each}
  {/each}
</div>

<style>
  .floating-toolbar {
    position: fixed;
    top: var(--toolbar-y, 0);
    left: var(--toolbar-x, 0);
    z-index: 50;

    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1);

    background: var(--bg-overlay);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-overlay);

    /* Появление через opacity + transform (никаких all/height). Скрытая
       панель не перехватывает указатель. */
    opacity: 0;
    transform: translateY(var(--space-1));
    pointer-events: none;
    transition:
      opacity var(--motion-fast) var(--ease-out),
      transform var(--motion-fast) var(--ease-out);
  }

  .floating-toolbar--visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .floating-toolbar__sep {
    width: 1px;
    align-self: stretch;
    margin: var(--space-half) var(--space-half);
    background: var(--border-subtle);
  }

  .floating-toolbar__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--h-control-sm);
    height: var(--h-control-sm);
    padding: 0;

    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--fg-secondary);
    cursor: pointer;

    transition:
      background var(--motion-instant) var(--ease-out),
      color var(--motion-instant) var(--ease-out);
  }

  .floating-toolbar__btn:hover {
    background: var(--bg-hover);
    color: var(--fg-primary);
  }

  .floating-toolbar__btn:focus-visible {
    outline: none;
    color: var(--fg-primary);
    box-shadow: 0 0 0 2px var(--accent-muted);
  }
</style>
