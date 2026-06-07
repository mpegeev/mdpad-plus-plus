# Apply — готовые к вставке файлы

Эти файлы — **точные замены** под вашу структуру (`:root[data-theme="..."]`, ваши имена переменных, ваш Tailwind v4 `@theme inline`). Скопируйте поверх существующих.

## Куда что

| Файл здесь         | Заменяет в репозитории        |
| ------------------ | ----------------------------- |
| `tokens.css`       | `src/styles/tokens.css`       |
| `themes/light.css` | `src/styles/themes/light.css` |
| `themes/dark.css`  | `src/styles/themes/dark.css`  |

После замены — `global.css` трогать почти не нужно (имена переменных совпадают). Нужны только **2 добавления** в `@theme inline` (см. ниже), чтобы Tailwind знал про новые токены.

## Патч для `src/styles/global.css`

В блок `@theme inline { … }` добавьте:

```css
/* Typography — new */
--font-size-3xl: var(--fs-3xl);
```

`--font-family-prose` у вас уже замаплен — отлично, ничего не трогаем. `--titlebar-height`, `--tabs-height`, `--statusbar-height` — это не цвета/шрифты Tailwind, используются напрямую как CSS-переменные в layout-компонентах, маппинг в `@theme` им не нужен.

## Что изменилось по сравнению с вашими файлами

**tokens.css**

- `--font-prose`: был `var(--font-ui)` → теперь серифный стек (Source Serif 4 → Charter → Georgia). UI и mono-стеки не трогали (Styrene B — проприетарный, не добавлял).
- `--fs-2xl` 24→28, добавлен `--fs-3xl` 36 (H1).
- `--lh-prose` 1.65→1.7.
- `--tabs-height` 32→36, `--statusbar-height` 22→24, `--tab-max-width` 200→220, добавлен `--titlebar-height` 32.
- Добавлены `--space-10`, `--editor-pad-y/x`, density-пресеты `[data-density]`.
- `--shadow-overlay`: тёмная тень → мягкая светлая многослойная.

**themes/light.css** — полностью новая палитра (кремовая, ink-акцент). Сохранены все ваши `--gutter-*` и `--syntax-*` имена. Добавлены опциональные пресеты `[data-accent="coral|slate|sage"]`.

**themes/dark.css** — была холодная VS Code-палитра → стала тёплая charcoal (не инверсия). Те же имена переменных.

## Решения, которые за вами

1. **Веб-шрифты vs системные.** По умолчанию `--font-prose` падает на системный сериф (Charter/Georgia) — работает мгновенно, без сети. Для точного Anthropic-вида забандлите `Source Serif 4` и `JetBrains Mono` локально в `src-tauri` (раскомментируйте `@font-face` в шапке `tokens.css`). **Сетевой `@import` не добавлял** — он против правила «мгновенный старт».
2. **Акцент по умолчанию = ink (#191919).** Пресеты coral/slate/sage — опционально, через `data-accent` на `<html>`. Если мультиакцент не нужен — просто не выставляйте атрибут.
3. **`data-density` / `data-accent`** ставятся на корневой `<html>` рядом с вашим существующим `data-theme`.
