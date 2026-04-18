---
name: MDP-37
description: Unit tests for design system utilities (cn, Icon.svelte)
---

# MDP-37 — Unit tests for design system utilities (cn, Icon.svelte)

**Статус:** Завершена
**Завершена:** 2026-04-19
**Linear:** [MDP-37](https://linear.app/mpegeev/issue/MDP-37/unit-tests-for-design-system-utilities-cn-iconsvelte)
**Уровень риска:** standard
**Создана:** 2026-04-18

## Цель

Покрыть Vitest-тестами поведение утилит дизайн-системы, созданных в MDP-34 (`cn()` и `Icon.svelte`).

## Критерии приёмки

1. `src/lib/ui/utils.test.ts` — тесты `cn()`: слияние классов, разрешение конфликтов tailwind-merge, falsy-значения игнорируются.
2. `src/lib/ui/Icon.test.ts` — тесты `Icon.svelte`: рендер известной иконки (SVG-элемент присутствует), fallback при неизвестном имени (`?? []` — пустой SVG без краша), пропсы `size` и `class` применяются.
3. `npm run test` проходит чисто (0 failed).

## Негативные сценарии

- `cn()` с конфликтующими Tailwind-классами (`p-2` + `p-4`) — должен выиграть последний.
- `<Icon name="nonexistent" />` — не должен падать в runtime, рендерит пустой SVG.

## Область изменений

**Менять:**

- `src/lib/ui/utils.test.ts` (создать)
- `src/lib/ui/Icon.test.ts` (создать)

**НЕ трогать:**

- `src/lib/ui/utils.ts`, `src/lib/ui/Icon.svelte`, `src/lib/ui/icons.ts` — только тесты, не реализация.
- Конфиги CI, lock-файлы, `tauri.conf.json`.

## Дополнительные ограничения

- Мокать только внешние границы (Tauri API, FS) — здесь их нет, моков не нужно.
- Использовать Vitest + `@testing-library/svelte` для компонентного теста `Icon.svelte`.
- Тесты описывают поведение, а не реализацию (правило 4 SENAR).

---

## Свидетельства верификации

- **Критерий 1** — `src/lib/ui/utils.test.ts`: 9 тестов `cn()` (слияние, конфликты `p-2`/`p-4`, `bg-*`, `text-*`, falsy-значения). Vitest: `✓ 9 tests`.
- **Критерий 2** — `src/lib/ui/Icon.test.ts`: 7 тестов `Icon.svelte` (рендер `<svg>`, `<path>`, `<circle>`, пропсы `size` и `class`, fallback на неизвестное имя без краша). Vitest: `✓ 7 tests`.
- **Критерий 3** — `npm run test`: `Test Files 4 passed (4) | Tests 23 passed (23)`, 0 failed.
- Доп: `npm run lint` чисто, `npm run build` — 122 modules transformed без ошибок.
- SENAR-ревью standard: `VERDICT: PASS` (9 PASS / 0 FAIL / 1 N/A).

## Тупики

Нет.

## Решения

- **Расширение области (согласовано с супервайзером, вариант A):** добавлены devDependencies `@testing-library/svelte@^5.2.4` и `jsdom@^25.0.1`; vitest-конфигурация слита в единый `vite.config.ts` (секция `test` + плагин `svelteTesting()`), отдельный `vitest.config.ts` не создаётся. **Почему:** критерий 2 требует рендерить компонент Svelte — нужна DOM-среда и testing-library; единый конфиг исключает молчаливое расхождение алиасов/conditions между prod-сборкой и тестами.
- **В тесте "рендерит `<circle>` для settings"** — проверяется только наличие элемента, не конкретные атрибуты (`cx`/`cy`). **Почему:** детали SVG-путей в `icons.ts` — данные реализации; правило 4 SENAR требует тестировать поведение компонента, а не фиксировать значения из источника данных.
- **Тест дедупликации `cn()`** сформулирован как "конфликтующие Tailwind-классы" (`text-sm`/`text-lg`), а не "одинаковые классы". **Почему:** `tailwind-merge` дедуплицирует только конфликты Tailwind-утилит; произвольные `"foo foo"` он не трогает (`clsx` — тоже). Тест отражает фактическое поведение, а не ошибочные допущения.

## Известные проблемы

Нет.
