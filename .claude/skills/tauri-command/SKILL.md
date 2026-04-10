---
name: tauri-command
description: Scaffold a new Tauri command (Rust handler + TS invoke wrapper + Vitest stub). Usage: /tauri-command <command-name> <return-type>
user-invocable: true
---

Scaffold a new Tauri command for the mdpad++ project.

Command name: {{args[0]}}
Return type: {{args[1] | default: "String"}}

Steps:

1. Add `#[tauri::command]` fn to src-tauri/src/lib.rs
2. Register in invoke_handler
3. Create src/lib/commands/{{args[0]}}.ts with typed invoke wrapper
4. Add Vitest test stub in src/lib/commands/{{args[0]}}.test.ts

Follow CLAUDE.md rules: Result<T, String>, no unwrap(), ? propagation.
