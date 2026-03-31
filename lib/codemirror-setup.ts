import { EditorView, placeholder, keymap } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import {
  syntaxHighlighting,
  HighlightStyle,
  defaultHighlightStyle,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

/** Markdown syntax highlighting — Catppuccin aware */
export const mdHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: "700", fontSize: "1.4em" },
  { tag: tags.heading2, fontWeight: "700", fontSize: "1.2em" },
  { tag: tags.heading3, fontWeight: "600", fontSize: "1.1em" },
  { tag: [tags.heading4, tags.heading5, tags.heading6], fontWeight: "600" },
  { tag: tags.strong, fontWeight: "600" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through", opacity: "0.6" },
  {
    tag: tags.monospace,
    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  },
  { tag: tags.url, textDecoration: "underline" },
  { tag: tags.link, textDecoration: "underline" },
  {
    tag: [tags.processingInstruction, tags.contentSeparator],
    opacity: "0.4",
  },
  { tag: tags.quote, fontStyle: "italic", opacity: "0.8" },
]);

/** CodeMirror theme using v-todo CSS custom properties */
export const cmTheme = EditorView.theme({
  "&": {
    flex: "1",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    fontFamily: '"Pretendard", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: "20px",
    backgroundColor: "transparent",
  },
  ".cm-scroller": {
    flex: "1",
    overflow: "auto",
    scrollbarWidth: "none",
  },
  ".cm-scroller::-webkit-scrollbar": { width: "0", background: "transparent" },
  ".cm-content": {
    padding: "12px 20px 40px",
    lineHeight: "1.7",
    caretColor: "var(--accent-primary)",
    color: "var(--label-primary)",
    minHeight: "100%",
    fontFamily: '"Pretendard", -apple-system, BlinkMacSystemFont, sans-serif',
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--accent-primary)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    background:
      "color-mix(in srgb, var(--accent-primary), transparent 75%) !important",
  },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-gutters": { display: "none" },
  ".cm-placeholder": {
    color: "var(--label-quaternary)",
    fontFamily: '"Pretendard", -apple-system, BlinkMacSystemFont, sans-serif',
    fontStyle: "normal",
  },
  "&.cm-focused": { outline: "none" },
});

/** Build the base set of extensions for a markdown editor */
export function baseMarkdownExtensions(
  placeholderText?: string
): Extension[] {
  return [
    cmTheme,
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    syntaxHighlighting(mdHighlight),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    placeholder(placeholderText ?? ""),
    keymap.of([...defaultKeymap, indentWithTab]),
    EditorView.lineWrapping,
  ];
}
