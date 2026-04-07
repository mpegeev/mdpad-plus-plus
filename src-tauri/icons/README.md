# Icons

Перед первой сборкой нужно сгенерировать иконки приложения.
Самый простой способ:

```bash
# Возьми любой PNG 1024x1024 (например, экспорт из Figma)
npm run tauri icon path/to/source.png
```

Команда создаст:
- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

Финальный дизайн иконки — задача **MDP-31** в Linear.
