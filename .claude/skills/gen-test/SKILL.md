---
name: gen-test
description: Generate Vitest test skeletons from acceptance criteria. Follows SENAR rule 4 — tests describe behavior, mock only external boundaries (Tauri API, FS, time).
---

Generate Vitest tests from the acceptance criteria provided as arguments.

## Steps

1. **Parse input** — the argument is one or more acceptance criteria, either as free text or a Linear issue ID (e.g. MDP-42). If it's an issue ID, fetch the issue to get the acceptance criteria.

2. **Identify test type** for each criterion:
   - **unit** — pure logic (stores, parsers, utilities); no DOM, no Tauri
   - **component** — Svelte 5 component behavior; use `@testing-library/svelte` if available, otherwise plain mount
   - **integration** — involves Tauri commands (`invoke`, `readTextFile`, etc.)

3. **Generate test file** following these rules:
   - One `describe` block per feature/function under test
   - One `it` per criterion; name behaviorally: `should <outcome> when <condition>`
   - Place `// AC: <verbatim criterion text>` above each `it` block for traceability
   - Mock **only** external boundaries: `@tauri-apps/api`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog`, `Date`, `crypto`
   - Never mock internal stores or pure functions — test them directly
   - Use `vi.mock(...)` at module level, `vi.mocked(...).mockResolvedValue(...)` per test
   - TypeScript strict: no `any`, explicit types on mocked return values
   - Each test must have at least one `expect` with a concrete assertion — no empty stubs

4. **Suggest file path**: `src/lib/<feature>/<Feature>.test.ts` for unit/component, `src/lib/<feature>/<Feature>.integration.test.ts` for integration tests.

5. **Output**: the complete test file ready to copy, followed by a short note on what still needs to be filled in (e.g. actual store/function imports once implemented).

## Constraints (SENAR rule 4)

- Do not edit existing tests to make them pass — generate new files only
- Do not invent implementation details; leave `// TODO: import X` if the module doesn't exist yet
- If a criterion is ambiguous, output a comment `// UNCLEAR: <question>` instead of guessing

## Example

Input: `При открытии несуществующего файла редактор показывает ошибку, файл не добавляется во вкладки`

Output:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readTextFile } from "@tauri-apps/plugin-fs";
// TODO: import openFile from '$lib/editor/fileOps';
// TODO: import { errorStore, tabsStore } from '$lib/stores/editor';

vi.mock("@tauri-apps/plugin-fs");

describe("openFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // TODO: reset stores to initial state
  });

  // AC: При открытии несуществующего файла редактор показывает ошибку
  it("should display error message when file does not exist", async () => {
    vi.mocked(readTextFile).mockRejectedValue(new Error("No such file"));

    // TODO: await openFile('/nonexistent/path.md');

    // expect(get(errorStore)).toContain('No such file');
  });

  // AC: файл не добавляется во вкладки
  it("should not add a tab when file open fails", async () => {
    vi.mocked(readTextFile).mockRejectedValue(new Error("No such file"));

    // TODO: await openFile('/nonexistent/path.md');

    // expect(get(tabsStore)).toHaveLength(0);
  });
});
```
