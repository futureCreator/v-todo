"use client";

import { useState } from "react";
import type { Todo } from "@/types";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function ageLabel(stageMovedAt: string): string {
  const days = Math.floor(
    (Date.now() - new Date(stageMovedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 0) return "오늘";
  return `${days}일 전`;
}

export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const [completing, setCompleting] = useState(false);

  const handleToggle = () => {
    setCompleting(true);
    setTimeout(() => onToggle(todo.id), 400);
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--separator)] transition-all duration-400 ${
        completing ? "opacity-0 -translate-y-2" : "opacity-100"
      }`}
    >
      <button
        className="w-[22px] h-[22px] rounded-full border-2 border-[var(--separator)] flex-shrink-0 flex items-center justify-center transition-colors hover:border-[var(--accent-primary)]"
        onClick={handleToggle}
      >
        {completing && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2 6 5 9 10 3" />
          </svg>
        )}
      </button>
      <span className="flex-1 text-[15px] text-[var(--label-primary)]">
        {todo.title}
      </span>
      {todo.aiGenerated && (
        <span className="text-[11px] text-[var(--accent-primary)] opacity-60">AI</span>
      )}
      <span className="text-[11px] text-[var(--label-tertiary)]">
        {ageLabel(todo.stageMovedAt)}
      </span>
      <button
        className="text-[var(--label-quaternary)] hover:text-[var(--system-red)] transition-colors p-1"
        onClick={() => onDelete(todo.id)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="4" y1="4" x2="12" y2="12" />
          <line x1="12" y1="4" x2="4" y2="12" />
        </svg>
      </button>
    </div>
  );
}
