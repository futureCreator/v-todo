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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg h-[80vh] bg-[var(--bg-primary)] rounded-t-3xl flex flex-col animate-[sheetUp_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[var(--fill-tertiary)] rounded-full mx-auto mt-3" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--separator)]">
          <h2 className="text-[17px] font-bold text-[var(--label-primary)]">보관함</h2>
          <button
            className="text-[15px] text-[var(--accent-primary)] font-medium"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {archived.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--label-quaternary)]">
              <p className="text-[15px]">보관함이 비어 있습니다</p>
              <p className="text-[12px] mt-1">30일 후 자동 삭제됩니다</p>
            </div>
          ) : (
            archived.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
