"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Todo } from "@/types";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string) => void;
}

function ageLabel(stageMovedAt: string): string {
  const moved = new Date(stageMovedAt);
  const now = new Date();
  const movedDate = new Date(moved.getFullYear(), moved.getMonth(), moved.getDate());
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((todayDate.getTime() - movedDate.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
}

export default function TodoItem({ todo, onToggle, onDelete, onEdit }: TodoItemProps) {
  const [completing, setCompleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const didLongPress = useRef(false);

  const handleToggle = () => {
    setCompleting(true);
    setTimeout(() => onToggle(todo.id), 350);
  };

  const startEditing = useCallback(() => {
    setEditText(todo.title);
    setIsEditing(true);
  }, [todo.title]);

  const commitEdit = useCallback(() => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== todo.title) {
      onEdit(todo.id, trimmed);
    }
    setIsEditing(false);
  }, [editText, todo.id, todo.title, onEdit]);

  const cancelEdit = useCallback(() => {
    setEditText(todo.title);
    setIsEditing(false);
  }, [todo.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Long press for mobile
  const onTouchStart = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      startEditing();
    }, 500);
  };

  const onTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div
      className={`group flex items-center gap-3 px-4 md:px-5 transition-all duration-300 ${
        completing ? "opacity-0 -translate-x-4" : "opacity-100"
      }`}
    >
      {/* Checkbox — 44pt tap target */}
      <button
        className="w-11 h-11 flex items-center justify-center flex-shrink-0"
        onClick={handleToggle}
      >
        <span
          className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
            completing
              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] scale-95"
              : "border-[var(--sys-gray)] hover:border-[var(--accent-primary)]"
          }`}
        >
          {completing && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <polyline
                points="2 6 5 9 10 3"
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
      <div
        className="flex-1 flex items-center min-h-[56px] py-3.5"
        onDoubleClick={startEditing}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            className="flex-1 text-[20px] leading-[26px] text-[var(--label-primary)] bg-transparent outline-none border-b-2 border-[var(--accent-primary)] caret-[var(--accent-primary)]"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            onBlur={commitEdit}
          />
        ) : (
          <>
            <span className="flex-1 text-[20px] leading-[26px] text-[var(--label-primary)]">
              {todo.title}
            </span>
            <span className="text-[15px] text-[var(--label-tertiary)] ml-3 flex-shrink-0">
              {ageLabel(todo.stageMovedAt)}
            </span>
          </>
        )}
      </div>

      {/* Delete — 44pt tap target */}
      <button
        className="w-11 h-11 flex items-center justify-center flex-shrink-0 text-[var(--label-quaternary)] md:opacity-0 md:group-hover:opacity-100 active:text-[var(--system-red)] transition-all"
        onClick={() => onDelete(todo.id)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="4" y1="4" x2="12" y2="12" />
          <line x1="12" y1="4" x2="4" y2="12" />
        </svg>
      </button>
    </div>
  );
}
