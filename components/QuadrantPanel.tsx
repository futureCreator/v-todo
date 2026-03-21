"use client";

import { useState } from "react";
import type { Todo, Quadrant } from "@/types";
import { QUADRANT_LABELS } from "@/types";
import TodoItem from "./TodoItem";
import TodoInput from "./TodoInput";

const QUADRANT_COLORS: Record<Quadrant, string> = {
  "urgent-important": "var(--q-urgent-important)",
  "urgent-not-important": "var(--q-urgent-not-important)",
  "not-urgent-important": "var(--q-not-urgent-important)",
  "not-urgent-not-important": "var(--q-not-urgent-not-important)",
};

const QUADRANT_TINTS: Record<Quadrant, string> = {
  "urgent-important": "var(--q-urgent-important-tint)",
  "urgent-not-important": "var(--q-urgent-not-important-tint)",
  "not-urgent-important": "var(--q-not-urgent-important-tint)",
  "not-urgent-not-important": "var(--q-not-urgent-not-important-tint)",
};

interface QuadrantPanelProps {
  quadrant: Quadrant;
  todos: Todo[];
  isActive: boolean;
  onSelect: () => void;
  onAdd: (title: string, quadrant: Quadrant, dueDate: string | null) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
}

export default function QuadrantPanel({
  quadrant,
  todos,
  isActive,
  onSelect,
  onAdd,
  onToggle,
  onDelete,
  onEdit,
}: QuadrantPanelProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const color = QUADRANT_COLORS[quadrant];
  const tint = QUADRANT_TINTS[quadrant];

  const incomplete = todos
    .filter((t) => !t.completed)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const completed = todos
    .filter((t) => t.completed)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const total = incomplete.length + completed.length;
  const progress = total > 0 ? completed.length / total : 0;

  return (
    <div
      onClick={onSelect}
      className={`flex flex-col h-full transition-shadow duration-200 ${isActive ? "ios-card-active" : "ios-card"}`}
    >
      {/* Header — tinted background with accent */}
      <div
        className="flex items-center gap-[10px] px-[24px] h-[52px] flex-shrink-0"
        style={{
          background: isActive ? tint : undefined,
          borderBottom: "0.5px solid var(--sys-separator)",
        }}
      >
        {/* Color accent bar */}
        <div
          className="w-[3.5px] h-[22px] rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />

        {/* Title */}
        <h2
          className="text-[16px] font-semibold flex-1"
          style={{ color: "var(--sys-label)" }}
        >
          {QUADRANT_LABELS[quadrant]}
        </h2>

        {/* Count badge + progress */}
        <div className="flex items-center gap-[8px]">
          {total > 0 && (
            <div className="flex items-center gap-[5px]">
              <span
                className="text-[13px] tabular-nums font-medium"
                style={{ color: "var(--sys-label-tertiary)" }}
              >
                {completed.length}/{total}
              </span>
              {/* Mini progress bar */}
              <div
                className="w-[24px] h-[3px] rounded-full overflow-hidden"
                style={{ background: "var(--sys-fill-tertiary)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress * 100}%`,
                    background: color,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {incomplete.length === 0 && completed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-[8px]">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ opacity: 0.3 }}>
              <rect x="4" y="4" width="24" height="24" rx="6" stroke="var(--sys-label)" strokeWidth="1.5" />
              <path d="M10 16l4 4 8-8" stroke="var(--sys-label)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p
              className="text-[15px]"
              style={{ color: "var(--sys-label-quaternary)" }}
            >
              할 일을 추가해보세요
            </p>
          </div>
        )}

        {incomplete.map((todo, i) => (
          <div key={todo.id} className={`item-enter stagger-${Math.min(i + 1, 10)}`}>
            {i > 0 && (
              <div
                className="ml-[62px] mr-[24px]"
                style={{ borderBottom: "0.5px solid var(--sys-separator)" }}
              />
            )}
            <TodoItem todo={todo} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
          </div>
        ))}

        {/* Completed section */}
        {completed.length > 0 && (
          <>
            {incomplete.length > 0 && (
              <div
                className="mx-[24px] mt-1"
                style={{ borderBottom: "0.5px solid var(--sys-separator)" }}
              />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCompleted(!showCompleted);
              }}
              className="w-full text-left text-[14px] font-medium px-[24px] min-h-[44px] flex items-center gap-[6px] transition-colors active:bg-[var(--sys-fill-quaternary)]"
              style={{ color: "var(--sys-label-tertiary)" }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="transition-transform duration-200"
                style={{ transform: showCompleted ? "rotate(90deg)" : "rotate(0)" }}
              >
                <path
                  d="M4 2l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              완료됨 {completed.length}개
            </button>
          </>
        )}

        {showCompleted &&
          completed.map((todo, i) => (
            <div key={todo.id} className={`item-enter stagger-${Math.min(i + 1, 10)}`}>
              {i > 0 && (
                <div
                  className="ml-[62px] mr-[24px]"
                  style={{ borderBottom: "0.5px solid var(--sys-separator)" }}
                />
              )}
              <TodoItem todo={todo} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
            </div>
          ))}
      </div>

      {/* Input */}
      <div style={{ borderTop: "0.5px solid var(--sys-separator)" }}>
        <TodoInput quadrant={quadrant} onAdd={onAdd} />
      </div>
    </div>
  );
}
