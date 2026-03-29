"use client";

import type { Todo } from "@/types";
import TodoItem from "./TodoItem";

interface ArchiveViewProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function ArchiveView({ todos, onToggle, onDelete, onClose }: ArchiveViewProps) {
  const archived = todos.filter((t) => t.stage === "archive" && !t.completed);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center ios-sheet-overlay" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div
        className="w-full md:max-w-lg md:max-h-[70vh] max-h-[85vh] bg-[var(--sys-bg-elevated)] md:rounded-2xl rounded-t-[16px] flex flex-col ios-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drag-handle md:hidden" />

        <div className="flex items-center justify-between px-5 md:px-6 py-3.5 border-b border-[var(--separator)]">
          <div className="w-[60px]" />
          <h2 className="text-[20px] font-semibold text-[var(--label-primary)]">보관함</h2>
          <button
            className="w-[60px] text-right text-[20px] text-[var(--accent-primary)] active:opacity-60"
            onClick={onClose}
          >
            완료
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {archived.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--label-tertiary)]">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-40">
                <path d="M6 12h36l-3 24H9L6 12z" />
                <path d="M4 12h40" />
                <path d="M18 20h12" />
              </svg>
              <p className="text-[20px]">보관함이 비어 있습니다</p>
              <p className="text-[15px] mt-1.5 text-[var(--label-quaternary)]">30일 후 자동 삭제됩니다</p>
            </div>
          ) : (
            <div className="py-1">
              {archived.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
