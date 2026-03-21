"use client";

import type { Todo } from "@/types";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
}

export default function TodoItem({ todo, onToggle, onDelete, onEdit }: TodoItemProps) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isOverdue = !todo.completed && todo.dueDate && todo.dueDate < todayStr;

  return (
    <div
      className="group flex items-center gap-[14px] min-h-[56px] px-[24px] py-[12px] transition-colors"
      style={{
        background: todo.aiGenerated ? "var(--ai-bg)" : undefined,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo.id, !todo.completed)}
        className="w-[24px] h-[24px] rounded-full flex-shrink-0 flex items-center justify-center transition-all active:scale-90"
        style={{
          borderWidth: "2px",
          borderStyle: "solid",
          borderColor: todo.completed ? "var(--sys-blue)" : "var(--sys-separator-opaque)",
          backgroundColor: todo.completed ? "var(--sys-blue)" : "transparent",
        }}
        aria-label={todo.completed ? "미완료로 변경" : "완료로 변경"}
      >
        {todo.completed && (
          <svg width="11" height="9" viewBox="0 0 12 10" fill="none" className="check-pop">
            <path
              d="M1 5L4.5 8.5L11 1"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Content — tappable to edit */}
      <button
        type="button"
        onClick={() => onEdit(todo)}
        className="flex-1 min-w-0 flex items-center gap-2 text-left"
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-[16px] leading-[21px] transition-colors"
            style={{
              color: todo.completed ? "var(--sys-label-tertiary)" : "var(--sys-label)",
              textDecoration: todo.completed ? "line-through" : "none",
              textDecorationColor: "var(--sys-label-quaternary)",
            }}
          >
            {todo.title}
          </p>
          {todo.dueDate && (
            <div className="flex items-center gap-[4px] mt-[2px]">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <rect
                  x="2"
                  y="2.5"
                  width="12"
                  height="11.5"
                  rx="2"
                  stroke={isOverdue ? "var(--sys-red)" : "var(--sys-label-quaternary)"}
                  strokeWidth="1.2"
                />
                <path
                  d="M2 6h12"
                  stroke={isOverdue ? "var(--sys-red)" : "var(--sys-label-quaternary)"}
                  strokeWidth="1.2"
                />
                <path
                  d="M5.5 1v2.5M10.5 1v2.5"
                  stroke={isOverdue ? "var(--sys-red)" : "var(--sys-label-quaternary)"}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <span
                className="text-[13px] leading-[16px] tabular-nums"
                style={{
                  color: isOverdue ? "var(--sys-red)" : "var(--sys-label-tertiary)",
                  fontWeight: isOverdue ? 600 : 400,
                }}
              >
                {todo.dueDate}
              </span>
            </div>
          )}
        </div>

        {/* AI sparkle badge */}
        {todo.aiGenerated && !todo.completed && (
          <div
            className="flex-shrink-0 flex items-center gap-[3px] px-[6px] py-[2px] rounded-full"
            style={{ background: "var(--ai-border)" }}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z"
                fill="var(--ai-from)"
              />
            </svg>
            <span className="text-[10px] font-semibold" style={{ color: "var(--ai-from)" }}>AI</span>
          </div>
        )}
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(todo.id)}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-[6px] -mr-[6px] flex-shrink-0 rounded-full active:bg-[var(--sys-fill-tertiary)]"
        style={{ color: "var(--sys-label-tertiary)" }}
        aria-label="삭제"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
