/**
 * MDP-16 — машина состояний видимости всплывающей панели форматирования.
 *
 * Логика видимости отделена от Svelte-компонента и от реального layout, чтобы
 * её можно было тестировать детерминированно (fake timers, без coordsAtPos):
 *
 *   - Непустое выделение → запускается debounce-таймер на `debounceMs`.
 *   - Если за это время выделение НЕ менялось → панель показывается (AC#2:
 *     «появляется через 150мс после стабилизации выделения»). Любое изменение
 *     выделения перезапускает таймер (debounce «по последнему»).
 *   - Схлопывание выделения (стало пустым) → панель скрывается, таймер сброшен.
 *   - scroll / blur → панель скрывается немедленно, таймер сброшен (AC#5).
 *
 * Fail-closed: стартовое состояние — скрыто; любое сомнительное событие
 * (пустое выделение, scroll, blur) ведёт к hide, а не show.
 *
 * Внешние границы (таймер, источник прямоугольника выделения) внедряются, так
 * что в тестах используются fake timers и заглушка-прямоугольник.
 */

import type { SelectionRect } from "./toolbarPosition";

/** Контракт планировщика — обёртка над setTimeout/clearTimeout для DI в тестах. */
export interface Scheduler {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

/** Внешние зависимости машины. */
export interface VisibilityDeps {
  /**
   * Колбэк перехода видимости. Вызывается только при смене значения
   * (show↔hide), не на каждое событие.
   */
  onChange: (visible: boolean) => void;
  /** Планировщик debounce. По умолчанию — глобальный setTimeout/clearTimeout. */
  scheduler?: Scheduler;
  /** Задержка стабилизации выделения, мс. По умолчанию 150 (AC#2). */
  debounceMs?: number;
}

const defaultScheduler: Scheduler = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms) as unknown as number,
  clearTimeout: (id) => globalThis.clearTimeout(id),
};

/**
 * Машина видимости панели. Состояние инкапсулировано; наружу торчат методы-
 * события и геттер `visible`.
 */
export class ToolbarVisibility {
  private readonly onChange: (visible: boolean) => void;
  private readonly scheduler: Scheduler;
  private readonly debounceMs: number;

  private timer: number | null = null;
  private _visible = false;

  constructor(deps: VisibilityDeps) {
    this.onChange = deps.onChange;
    this.scheduler = deps.scheduler ?? defaultScheduler;
    this.debounceMs = deps.debounceMs ?? 150;
  }

  /** Текущее состояние видимости. */
  get visible(): boolean {
    return this._visible;
  }

  /**
   * Сообщить машине о текущем выделении.
   *
   * @param empty `true`, если выделение пустое (схлопнуто) или отсутствует.
   *
   * Непустое выделение (пере)запускает debounce. Пустое — немедленно скрывает.
   */
  selectionChanged(empty: boolean): void {
    if (empty) {
      // Схлопнулось → скрыть и отменить ожидающий показ. Fail-closed.
      this.cancelTimer();
      this.setVisible(false);
      return;
    }
    // Непустое: панель пока скрываем (выделение ещё не стабилизировалось) и
    // перезапускаем таймер. Так движение выделения не оставляет «висящую»
    // панель над старой позицией и переотсчитывает 150мс заново.
    this.setVisible(false);
    this.cancelTimer();
    this.timer = this.scheduler.setTimeout(() => {
      this.timer = null;
      this.setVisible(true);
    }, this.debounceMs);
  }

  /** Скрыть панель при скролле редактора (AC#5). */
  scrolled(): void {
    this.cancelTimer();
    this.setVisible(false);
  }

  /** Скрыть панель при потере фокуса (AC#5). */
  blurred(): void {
    this.cancelTimer();
    this.setVisible(false);
  }

  /** Освободить ресурсы (таймер) при размонтировании. */
  destroy(): void {
    this.cancelTimer();
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      this.scheduler.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private setVisible(next: boolean): void {
    if (next === this._visible) return;
    this._visible = next;
    this.onChange(next);
  }
}

/** Действие панели форматирования (намерение, без логики — логика в MDP-17). */
export type ToolbarAction =
  | "bold"
  | "italic"
  | "underline"
  | "code"
  | "code-fence";

/** Пустой прямоугольник — используется как fail-closed заглушка. */
export const EMPTY_RECT: SelectionRect = {
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
};
