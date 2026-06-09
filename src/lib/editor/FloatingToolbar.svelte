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
    /**
     * Выбор уровня заголовка из dropdown (MDP-18): 0 — параграф, 1..6 — H1..H6.
     * Проводка к `commandForHeading` — в родителе (EditorArea).
     */
    onHeading?: (level: number) => void;
    /**
     * Фактический размер смонтированной панели (MDP-48). Вызывается при монтаже
     * и при изменении размеров (ResizeObserver), чтобы родитель позиционировал
     * по реальному footprint, а не по хардкод-оценке. Передавай СТАБИЛЬНУЮ
     * ссылку, иначе эффект-измеритель будет пересоздаваться.
     */
    onMeasure?: (size: { width: number; height: number }) => void;
  }

  const {
    visible = false,
    position = { x: 0, y: 0 },
    onAction,
    onHeading,
    onMeasure,
  }: Props = $props();

  // Панель всегда в DOM (скрыта через opacity), поэтому её размер измерим в
  // любой момент. Сообщаем родителю фактические offsetWidth/Height на монтаже и
  // при изменении набора кнопок (ResizeObserver). До первого замера родитель
  // держит панель скрытой (fail-closed, без скачка).
  let el: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (!el) return;
    const node = el;
    const report = () =>
      onMeasure?.({ width: node.offsetWidth, height: node.offsetHeight });
    report();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(report);
    ro.observe(node);
    return () => ro.disconnect();
  });

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

  /**
   * Сохранить фокус/выделение редактора при взаимодействии с тулбаром: гасим
   * default у mousedown, чтобы фокус не уходил из редактора (иначе CM-blur
   * скрыл бы саму панель и сбросил геометрию выделения). Клик при этом
   * срабатывает штатно. Применяется ко ВСЕМ контролам панели (MDP-18).
   */
  function keepEditorFocus(e: MouseEvent) {
    e.preventDefault();
  }

  // ----- Dropdown уровней заголовка (MDP-18) -----
  interface HeadingItem {
    level: number;
    label: string;
  }
  const headingItems: HeadingItem[] = [
    { level: 0, label: "Параграф" },
    { level: 1, label: "Заголовок 1" },
    { level: 2, label: "Заголовок 2" },
    { level: 3, label: "Заголовок 3" },
    { level: 4, label: "Заголовок 4" },
    { level: 5, label: "Заголовок 5" },
    { level: 6, label: "Заголовок 6" },
  ];

  let menuOpen = $state(false);
  let dropdownEl: HTMLDivElement | undefined = $state();

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function chooseHeading(level: number) {
    onHeading?.(level);
    menuOpen = false;
  }

  // Закрытие меню fail-closed: клик вне dropdown, Escape, либо скрытие панели.
  function onWindowPointerDown(e: PointerEvent) {
    if (
      dropdownEl &&
      e.target instanceof Node &&
      dropdownEl.contains(e.target)
    ) {
      return;
    }
    menuOpen = false;
  }

  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && menuOpen) {
      e.preventDefault();
      menuOpen = false;
    }
  }

  $effect(() => {
    // Когда панель скрывается, меню не должно «зависнуть» открытым.
    if (!visible) menuOpen = false;
  });
</script>

<svelte:window
  onpointerdown={onWindowPointerDown}
  onkeydown={onWindowKeydown}
/>

<!--
  Панель всегда в DOM (для плавного opacity-перехода), но aria-hidden и без
  pointer-events когда скрыта. `role="toolbar"` + aria-label делают её
  доступной; каждая кнопка icon-only с обязательным aria-label. Все контролы
  гасят default mousedown (keepEditorFocus), чтобы не уводить фокус из редактора.
-->
<div
  bind:this={el}
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
        onmousedown={keepEditorFocus}
        onclick={() => handle(btn.action)}
      >
        <Icon name={btn.icon} size={14} />
      </button>
    {/each}
  {/each}

  <span class="floating-toolbar__sep" aria-hidden="true"></span>

  <!-- Dropdown уровней заголовка (MDP-18). Меню — абсолютный потомок панели. -->
  <div class="floating-toolbar__dropdown" bind:this={dropdownEl}>
    <button
      type="button"
      class="floating-toolbar__btn floating-toolbar__trigger"
      aria-label="Уровень заголовка"
      title="Уровень заголовка"
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      tabindex={visible ? 0 : -1}
      onmousedown={keepEditorFocus}
      onclick={toggleMenu}
    >
      <Icon name="heading" size={14} />
      <Icon name="chevron-down" size={14} />
    </button>
    {#if menuOpen}
      <div
        class="floating-toolbar__menu"
        role="menu"
        aria-label="Уровень заголовка"
      >
        {#each headingItems as item (item.level)}
          <button
            type="button"
            class="floating-toolbar__menu-item"
            role="menuitem"
            onmousedown={keepEditorFocus}
            onclick={() => chooseHeading(item.level)}
          >
            {item.label}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .floating-toolbar {
    position: fixed;
    top: var(--toolbar-y, 0);
    left: var(--toolbar-x, 0);
    z-index: var(--z-floating-toolbar);

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
    /* Кольцо фокуса: геометрия из токена --focus-ring-width, цвет — accent-muted. */
    box-shadow: 0 0 0 var(--focus-ring-width) var(--accent-muted);
  }

  /* Триггер dropdown шире обычной кнопки: иконка заголовка + шеврон. */
  .floating-toolbar__dropdown {
    position: relative;
    display: inline-flex;
  }
  .floating-toolbar__trigger {
    width: auto;
    gap: var(--space-half);
    padding: 0 var(--space-1);
  }

  /* Меню уровней — абсолютный потомок панели, раскрывается вниз под триггером. */
  .floating-toolbar__menu {
    position: absolute;
    top: calc(100% + var(--space-1));
    left: 0;
    z-index: var(--z-floating-toolbar);

    display: flex;
    flex-direction: column;
    gap: var(--space-half);
    min-width: var(--context-menu-min-width);
    padding: var(--space-1);

    background: var(--bg-overlay);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-overlay);
  }

  .floating-toolbar__menu-item {
    display: flex;
    align-items: center;
    width: 100%;
    height: var(--h-control-sm);
    padding: 0 var(--space-2);

    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--fg-primary);
    font-family: var(--font-ui);
    font-size: var(--fs-sm);
    text-align: left;
    cursor: pointer;

    transition: background var(--motion-fast) var(--ease-out);
  }
  .floating-toolbar__menu-item:hover,
  .floating-toolbar__menu-item:focus-visible {
    outline: none;
    background: var(--bg-hover);
  }
</style>
