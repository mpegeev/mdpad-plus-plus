# mdpad++

Лёгкий кроссплатформенный редактор Markdown-заметок.
Гибрид Notepad++ и Typora: вкладки, дерево файлов, inline-рендер MD,
переключение в raw-режим по F2, мгновенный запуск даже на больших документах.

## Стек

Tauri 2 · Svelte 5 · TypeScript · CodeMirror 6 · Vite · Rust

## Быстрый старт

```bash
# Требования: Node.js 20+, Rust stable, системные зависимости Tauri
# https://tauri.app/start/prerequisites/

npm install
npm run tauri dev
```

## Сборка релиза

```bash
npm run tauri build
```

Готовый бинарник появится в `src-tauri/target/release/`.

## Документация для разработчиков

См. [`CLAUDE.md`](./CLAUDE.md) — архитектура, конвенции, workflow.

## Лицензия

MIT
