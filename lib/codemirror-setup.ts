import { EditorView, placeholder, keymap, type KeyBinding } from "@codemirror/view";
import {
  defaultKeymap,
  indentWithTab,
  history,
  historyKeymap,
  undo,
  redo,
} from "@codemirror/commands";
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
    fontSize: "0.75em",
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
    minHeight: "0",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    fontFamily: '"Pretendard", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: "16px",
    backgroundColor: "transparent",
    backgroundImage:
      "linear-gradient(var(--note-grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--note-grid-color) 1px, transparent 1px)",
    backgroundSize: "24px 24px",
  },
  ".cm-scroller": {
    flex: "1",
    overflow: "auto",
    scrollbarWidth: "none",
  },
  ".cm-scroller::-webkit-scrollbar": { width: "0", background: "transparent" },
  ".cm-content": {
    padding: "12px 20px 40px",
    lineHeight: "1.6",
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

/* ── Markdown shortcut helpers ─────────────────────────── */

/** Wrap selection with before/after markers (e.g. **bold**) */
function wrapSelection(
  view: EditorView,
  before: string,
  after: string = before
): boolean {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  // Toggle off: if already wrapped, unwrap
  const docBefore = view.state.sliceDoc(
    Math.max(0, from - before.length),
    from
  );
  const docAfter = view.state.sliceDoc(to, to + after.length);
  if (docBefore === before && docAfter === after) {
    view.dispatch({
      changes: [
        { from: from - before.length, to: from, insert: "" },
        { from: to, to: to + after.length, insert: "" },
      ],
      selection: {
        anchor: from - before.length,
        head: to - before.length,
      },
    });
    return true;
  }

  view.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: {
      anchor: from + before.length,
      head: from + before.length + selected.length,
    },
  });
  return true;
}

/** Toggle a line prefix (e.g. "# ", "- ") */
function toggleLinePrefix(view: EditorView, prefix: string): boolean {
  const { from, to } = view.state.selection.main;
  const lineStart = view.state.doc.lineAt(from);
  const lineEnd = view.state.doc.lineAt(to);
  const changes: { from: number; to: number; insert: string }[] = [];

  for (let i = lineStart.number; i <= lineEnd.number; i++) {
    const line = view.state.doc.line(i);
    if (line.text.startsWith(prefix)) {
      changes.push({ from: line.from, to: line.from + prefix.length, insert: "" });
    } else {
      changes.push({ from: line.from, to: line.from, insert: prefix });
    }
  }

  view.dispatch({ changes });
  return true;
}

/** Cycle heading level: none → # → ## → ### → none */
function cycleHeading(view: EditorView): boolean {
  const line = view.state.doc.lineAt(view.state.selection.main.from);
  const match = line.text.match(/^(#{1,3})\s/);

  if (!match) {
    view.dispatch({
      changes: { from: line.from, to: line.from, insert: "# " },
    });
  } else if (match[1].length < 3) {
    view.dispatch({
      changes: { from: line.from, to: line.from + match[1].length, insert: match[1] + "#" },
    });
  } else {
    // ### → remove heading
    view.dispatch({
      changes: { from: line.from, to: line.from + 4, insert: "" },
    });
  }
  return true;
}

/** Insert link template */
function insertLink(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  if (/^https?:\/\//.test(selected)) {
    // URL selected → wrap as [](url)
    view.dispatch({
      changes: { from, to, insert: `[](${selected})` },
      selection: { anchor: from + 1 },
    });
  } else {
    // Text selected → wrap as [text](url)
    view.dispatch({
      changes: { from, to, insert: `[${selected}]()` },
      selection: { anchor: from + selected.length + 3 },
    });
  }
  return true;
}

const markdownKeymap: KeyBinding[] = [
  { key: "Mod-b", run: (v) => wrapSelection(v, "**"), preventDefault: true },
  { key: "Mod-i", run: (v) => wrapSelection(v, "*"), preventDefault: true },
  { key: "Mod-Shift-s", run: (v) => wrapSelection(v, "~~"), preventDefault: true },
  { key: "Mod-e", run: (v) => wrapSelection(v, "`"), preventDefault: true },
  { key: "Mod-Shift-e", run: (v) => wrapSelection(v, "```\n", "\n```"), preventDefault: true },
  { key: "Mod-k", run: insertLink, preventDefault: true },
  { key: "Mod-Shift-h", run: cycleHeading, preventDefault: true },
  { key: "Mod-Shift-7", run: (v) => toggleLinePrefix(v, "1. "), preventDefault: true },
  { key: "Mod-Shift-8", run: (v) => toggleLinePrefix(v, "- "), preventDefault: true },
  { key: "Mod-Shift-9", run: (v) => toggleLinePrefix(v, "- [ ] "), preventDefault: true },
  { key: "Mod-Shift-.", run: (v) => toggleLinePrefix(v, "> "), preventDefault: true },
];

/** Build the base set of extensions for a markdown editor */
export function baseMarkdownExtensions(
  placeholderText?: string
): Extension[] {
  return [
    cmTheme,
    history(),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    syntaxHighlighting(mdHighlight),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    placeholder(placeholderText ?? ""),
    keymap.of([...markdownKeymap, ...historyKeymap, ...defaultKeymap, indentWithTab]),
    EditorView.lineWrapping,
  ];
}
