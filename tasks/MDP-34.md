# MDP-34 Design system foundation: tokens, themes infra, shadcn-svelte, lucide

**Статус:** Завершена
**Linear:** MDP-34
**Уровень риска:** standard
**Создана:** 2026-04-07
**Завершена:** 2026-04-10

## Цель

Превратить `DESIGN.md` в рабочую инфраструктуру: CSS-переменные, Tailwind, shadcn-svelte, иконки.

## Критерии приёмки

1. `DESIGN.md` закоммичен в `main`
2. `CLAUDE.md` содержит ссылку на `DESIGN.md` и дизайн-чеклист в Definition of Done
3. Tailwind CSS установлен; тема задана через `@theme inline` в `global.css` (ни одного хардкод-цвета)
4. `cn()` helper доступен из `$lib/ui/utils.ts`
5. Файлы `src/styles/tokens.css`, `themes/dark.css`, `themes/light.css` созданы и импортированы в `global.css`
6. Все токены из раздела "Design tokens" в `DESIGN.md` перенесены в `dark.css` без изменений значений
7. `src/lib/ui/Icon.svelte` + `icons.ts` — иконки из Lucide работают (видимый пример в `App.svelte`)
8. `vite build` и `npm run dev` запускаются без ошибок; `App.svelte` показывает демо-страницу
9. `src/lib/ui/README.md` объясняет правила копирования shadcn-компонентов

## Негативные сценарии

- Компонент с хардкод-цветом `color: #ff0000` вместо CSS-переменной — `npm run lint` или ревью должны поймать это

## Область изменений

**Менять:**

- `CLAUDE.md` (ссылка + DoD)
- `DESIGN.md` (раздел Иконки — обновлён под Icon.svelte)
- `package.json` (deps)
- `package-lock.json` — **явно разрешено супервайзером** (2026-04-10): lock-файл создан заново при установке зависимостей задачи
- `index.html` (добавлен `data-theme="dark"` для активации CSS-селектора тем)
- `tailwind.config.js` (создание)
- `postcss.config.js` (создание)
- `eslint.config.js` (создание — lint-инфраструктура отсутствовала с MDP-1)
- `.prettierrc` (создание)
- `src/styles/` (tokens, themes, global.css)
- `src/lib/ui/` (utils, Icon.svelte, icons.ts, README)
- `src/App.svelte` (демо)

**НЕ трогать:**

- `src-tauri/`
- `Cargo.toml`, `Cargo.lock`
- `.github/workflows/`

## Дополнительные ограничения

- Следовать `DESIGN.md` (все цвета через CSS-переменные)
- Tailwind v4 — `@theme inline` в CSS вместо JS-конфига (`@config` deprecated)
- `lucide-svelte` не используется: несовместим с Svelte 5 `compilerOptions.runes: true`

---

## Свидетельства верификации

1. `git log | grep "MDP-34"` → коммит `c300ff1 (MDP-34) Add design specification` — DESIGN.md закоммичен
2. `grep 'DESIGN.md' CLAUDE.md` → строки 4, 121; UI-чеклист добавлен в DoD — критерий 2 ✓
3. `grep 'var(--' tailwind.config.js | wc -l` → 0 (конфиг содержит только `content`); `@theme inline` в global.css — 40 строк `var(--*)` — критерий 3 ✓
4. `cat src/lib/ui/utils.ts` → экспортирует `cn(clsx + twMerge)` — критерий 4 ✓
5. `ls src/styles/tokens.css src/styles/themes/dark.css src/styles/themes/light.css` → все три файла существуют; импортированы в global.css — критерий 5 ✓
6. `grep -oE '#[0-9a-fA-F]+' src/styles/themes/dark.css | sort -u` совпадает с `grep -oE '#[0-9a-fA-F]+' DESIGN.md | sort -u` побитово (19/19 цветов) — критерий 6 ✓
7. `grep 'Icon' src/App.svelte` → 5 использований Icon.svelte с size 14/16 — критерий 7 ✓
8. `vite build` → `✓ 113 modules transformed`, 0 ошибок; `npm run check` → `0 ERRORS 0 WARNINGS` — критерий 8 ✓
9. `cat src/lib/ui/README.md | head -10` → описывает правила копирования shadcn-компонентов — критерий 9 ✓
10. `npm run lint` → ESLint + Prettier clean (создан `eslint.config.js` + `.prettierrc`)

## Тупики

- `lucide-svelte@1.0.1` несовместим с `compilerOptions.runes: true` (использует `$$props` — Svelte 4 API). Решение: `Icon.svelte` + `icons.ts` с SVG-путями из Lucide.
- `tailwindcss@4` установился вместо v3 (npm без версии). v3-синтаксис (`@tailwind base`, `tailwind.config.js` с theme) не работает в v4. Решение: мигрировали на `@theme inline` в CSS.
- `@eslint/js`, `svelte-eslint-parser`, `globals` разрешались как транзитивные зависимости, но не были объявлены явно. `npm install` упал с `ERESOLVE` на `@eslint/js@10.0.1` из-за конфликта версий; решено через `--legacy-peer-deps`.

## Решения

- Tailwind v4 `@theme inline` вместо `tailwind.config.js + @config` — нативный v4 подход, убирает legacy-режим совместимости.
- `Icon.svelte` добавляет `?? []` fallback для `icons[name]` — защита от runtime crash при динамическом вызове с неизвестным именем.
- `IconNode` тип экспортирован из `icons.ts` — доступен для аннотаций за пределами модуля.
- `color-scheme` перенесён в `dark.css` / `light.css` — управляется через `data-theme`, а не хардкодом.

## Известные проблемы

- `npm run lint` не работал с MDP-1 (отсутствовал `eslint.config.js`). Исправлено в рамках MDP-34 с явного разрешения супервайзера (входило в критерий 3 DoD).
- Демо-страница в `App.svelte` будет заменена в MDP-2 (Layout skeleton).
- Тесты для `cn()` и `Icon.svelte` не написаны в MDP-34 (инфраструктурная задача, критерии приёмки тестов не предусматривали). Вынесено в **MDP-37**.
