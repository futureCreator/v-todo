"use client";

import { useRef, useEffect, useCallback } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { baseMarkdownExtensions } from "@/lib/codemirror-setup";

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function NoteEditor({
  content,
  onChange,
  placeholder,
}: NoteEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const suppressRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleUpdate = useCallback((update: { state: EditorState; docChanged: boolean }) => {
    if (update.docChanged && !suppressRef.current) {
      onChangeRef.current(update.state.doc.toString());
    }
  }, []);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        ...baseMarkdownExtensions(placeholder),
        EditorView.updateListener.of(handleUpdate),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external content changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== content) {
      suppressRef.current = true;
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: content,
        },
      });
      suppressRef.current = false;
    }
  }, [content]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-hidden flex flex-col"
    />
  );
}
