"use client";

import { useState } from "react";
import type { Todo } from "@/types";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function ageLabel(stageMovedAt: string): string {
  const moved = new Date(stageMovedAt);
  const now = new Date();
  // Compare dates only (ignore time), using local dates
  const movedDate = new Date(moved.getFullYear(), moved.getMonth(), moved.getDate());
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((todayDate.getTime() - movedDate.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
}

export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const [completing, setCompleting] = useState(false);

  const handleToggle = () => {
    setCompleting(true);
    setTimeout(() => onToggle(todo.id), 350);
  };

  return (
    <div
      className={`group flex items-center gap-4 px-5 md:px-6 min-h-[52px] transition-all duration-300 ${
        completing ? "opacity-0 -translate-x-4" : "opacity-100"
      }`}
    >
      {/* Checkbox — 44pt tap target */}
      <button
        className="w-11 h-11 flex items-center justify-center flex-shrink-0 -ml-1.5"
        onClick={handleToggle}
      >
        <span
          className={`w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
            completing
              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] scale-95"
              : "border-[var(--sys-gray)] hover:border-[var(--accent-primary)]"
          }`}
        >
          {completing && (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <polyline
                points="2.5 6.5 5.5 9.5 10.5 3.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </button>

      {/* Content */}
      <div className="flex-1 flex items-center min-h-[44px] py-2.5 border-b border-[var(--separator)]">
        <span className="flex-1 text-[17px] leading-[22px] text-[var(--label-primary)]">
          {todo.title}
        </span>
        <span className="text-[15px] text-[var(--label-tertiary)] ml-3 flex-shrink-0">
          {ageLabel(todo.stageMovedAt)}
        </span>
      </div>

      {/* Delete — 44pt tap target, visible on hover (desktop) / always on mobile */}
      <button
        className="w-11 h-11 flex items-center justify-center flex-shrink-0 -mr-1.5 text-[var(--label-quaternary)] md:opacity-0 md:group-hover:opacity-100 active:text-[var(--system-red)] transition-all"
        onClick={() => onDelete(todo.id)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="5" y1="5" x2="13" y2="13" />
          <line x1="13" y1="5" x2="5" y2="13" />
        </svg>
      </button>
    </div>
  );
}
