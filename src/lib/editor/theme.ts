/**
 * CodeMirror 6 theme for mdpad++.
 *
 * All colors / fonts / sizes are sourced from project CSS custom properties
 * (see `src/styles/tokens.css` + `themes/light.css` / `themes/dark.css`).
 * The theme therefore reacts to `data-theme` / `data-accent` switches on
 * `<html>` without any JS — exactly what DESIGN.md mandates.
 *
 * No hardcoded hex values. No `transition: all`. No animations on `height`.
 */

import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

/**
 * Visual chrome around the EditorView itself: background, gutters, caret,
 * selection. All values come from project tokens.
 */
export const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--bg-base)",
    color: "var(--fg-primary)",
    fontFamily: "var(--font-mono)",
    fontSize: "var(--fs-md)",
    height: "100%",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "var(--lh-normal)",
    overflow: "auto",
  },
  ".cm-content": {
    caretColor: "var(--fg-primary)",
    padding: "var(--editor-pad-y) 0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--fg-primary)",
  },
  // Active line + active gutter use a subtle hover-tier surface.
  ".cm-activeLine": {
    backgroundColor: "var(--bg-hover)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--bg-hover)",
    color: "var(--fg-secondary)",
  },
  // Gutters share visual language with sidebar / tabs / status bar.
  ".cm-gutters": {
    backgroundColor: "var(--bg-elevated)",
    color: "var(--fg-tertiary)",
    border: "none",
    borderRight: "1px solid var(--border-subtle)",
    fontFamily: "var(--font-mono)",
    fontSize: "var(--fs-sm)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 var(--space-2) 0 var(--space-3)",
  },
  // Selection background. We target both the CM6 layer and the host
  // ::selection so non-editor selections (e.g. widget text) match too.
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    {
      backgroundColor: "var(--bg-selection)",
    },
  ".cm-selectionMatch": {
    backgroundColor: "var(--accent-muted)",
  },
  // Search panel — minimal styling so it inherits ambient surfaces.
  ".cm-panels": {
    backgroundColor: "var(--bg-elevated)",
    color: "var(--fg-primary)",
  },
  ".cm-panels.cm-panels-bottom": {
    borderTop: "1px solid var(--border-subtle)",
  },
  ".cm-searchMatch": {
    backgroundColor: "var(--accent-muted)",
    outline: "1px solid var(--border-strong)",
  },
});

/**
 * Markdown syntax highlight using semantic tags + project syntax tokens.
 * Heading sizes are deliberately NOT bumped here — raw mode must remain a
 * monospaced view; rendered headings are an MDP-12 (widget) concern.
 */
const markdownHighlight = HighlightStyle.define([
  {
    tag: t.heading1,
    color: "var(--syntax-heading)",
    fontWeight: "var(--fw-bold)",
  },
  {
    tag: t.heading2,
    color: "var(--syntax-heading)",
    fontWeight: "var(--fw-bold)",
  },
  {
    tag: t.heading3,
    color: "var(--syntax-heading)",
    fontWeight: "var(--fw-bold)",
  },
  {
    tag: t.heading4,
    color: "var(--syntax-heading)",
    fontWeight: "var(--fw-bold)",
  },
  {
    tag: t.heading5,
    color: "var(--syntax-heading)",
    fontWeight: "var(--fw-bold)",
  },
  {
    tag: t.heading6,
    color: "var(--syntax-heading)",
    fontWeight: "var(--fw-bold)",
  },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "var(--fw-bold)" },
  { tag: t.monospace, color: "var(--syntax-code)" },
  { tag: t.link, color: "var(--syntax-link)", textDecoration: "underline" },
  { tag: t.url, color: "var(--syntax-link)" },
  { tag: t.quote, color: "var(--syntax-quote)", fontStyle: "italic" },
  { tag: t.list, color: "var(--syntax-list)" },
  { tag: t.contentSeparator, color: "var(--syntax-hr)" },
]);

/**
 * Composite syntax extension — drop into EditorState extensions array.
 */
export const editorSyntaxHighlight: Extension =
  syntaxHighlighting(markdownHighlight);
