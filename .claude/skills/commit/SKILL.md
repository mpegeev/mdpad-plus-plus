---
name: commit
description: Create a SENAR-compliant git commit with Conventional Commits format and Linear issue reference. Usage: /commit
disable-model-invocation: false
---

Create a git commit following project conventions:

1. Run git diff --staged to review changes
2. Derive commit type (feat/fix/chore/docs/test/refactor) from changes
3. Extract MDP issue number from current branch name (feat/MDP-NNN-slug)
4. Format: `type(scope): message (MDP-NNN)`
5. Commit with Co-Authored-By trailer

Do NOT commit if: no staged changes, .env files staged, or files outside task scope.
