"use client";

import { useState } from "react";
import type { Todo, Quadrant, UpdateTodoRequest } from "@/types";
import { QUADRANT_LABELS, QUADRANT_ORDER } from "@/types";

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

interface TodoEditSheetProps {
  todo: Todo;
  onSave: (id: string, updates: UpdateTodoRequest) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function TodoEditSheet({ todo, onSave, onDelete, onClose }: TodoEditSheetProps) {
  const [title, setTitle] = useState(todo.title);
  const [quadrant, setQuadrant] = useState<Quadrant>(todo.quadrant);
  const [dueDate, setDueDate] = useState<string>(todo.dueDate || "");
  const [saving, setSaving] = useState(false);

  const hasChanges =
    title.trim() !== todo.title ||
    quadrant !== todo.quadrant ||
    (dueDate || null) !== (todo.dueDate || null);

  const handleSave = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      const updates: UpdateTodoRequest = {};
      if (title.trim() !== todo.title) updates.title = title.trim();
      if (quadrant !== todo.quadrant) updates.quadrant = quadrant;
      if ((dueDate || null) !== (todo.dueDate || null)) updates.dueDate = dueDate || null;
      await onSave(todo.id, updates);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await onDelete(todo.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center ios-sheet-overlay"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="ios-sheet w-full max-w-lg max-h-[85dvh] flex flex-col rounded-t-[16px] md:rounded-[16px]"
        style={{
          background: "var(--sys-bg-elevated)",
          boxShadow: "var(--shadow-xl)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)",
        }}
      >
        <div className="drag-handle md:hidden" />

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-[14px]"
          style={{ borderBottom: "0.5px solid var(--sys-separator)" }}
        >
          <button
            onClick={onClose}
            className="text-[16px] font-normal w-[50px] text-left active:opacity-60 transition-opacity"
            style={{ color: "var(--sys-blue)" }}
          >
            취소
          </button>
          <h3 className="text-[16px] font-semibold" style={{ color: "var(--sys-label)" }}>
            편집
          </h3>
          <div className="w-[50px]" />
        </div>

        {/* Content */}
        <div className="px-5 py-5 flex flex-col gap-5 overflow-y-auto">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full text-[20px] font-semibold bg-transparent outline-none"
              style={{
                color: "var(--sys-label)",
                caretColor: "var(--sys-blue)",
              }}
              placeholder="할 일을 입력하세요"
            />
            <div className="mt-3" style={{ borderBottom: "0.5px solid var(--sys-separator)" }} />
          </div>

          {/* Quadrant Picker — 2x2 grid */}
          <div className="grid grid-cols-2 gap-[10px]">
            {QUADRANT_ORDER.map((q) => {
              const isSelected = quadrant === q;
              return (
                <button
                  key={q}
                  onClick={() => setQuadrant(q)}
                  className="flex items-center gap-[10px] px-[14px] py-[12px] rounded-[12px] transition-all active:scale-[0.97]"
                  style={{
                    background: isSelected ? QUADRANT_TINTS[q] : "var(--sys-fill-quaternary)",
                    border: isSelected
                      ? `1.5px solid ${QUADRANT_COLORS[q]}`
                      : "1.5px solid transparent",
                  }}
                >
                  <div
                    className="w-[3.5px] h-[18px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: QUADRANT_COLORS[q] }}
                  />
                  <span
                    className="text-[14px]"
                    style={{
                      color: "var(--sys-label)",
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {QUADRANT_LABELS[q]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Due Date */}
          <div
            className="flex items-center gap-[10px] min-h-[44px]"
            style={{ borderTop: "0.5px solid var(--sys-separator)", paddingTop: "16px" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
              <rect
                x="2.5" y="3" width="15" height="14.5" rx="2.5"
                stroke="var(--sys-label-tertiary)" strokeWidth="1.3"
              />
              <path d="M2.5 7.5h15" stroke="var(--sys-label-tertiary)" strokeWidth="1.3" />
              <path
                d="M6.5 1.5v3M13.5 1.5v3"
                stroke="var(--sys-label-tertiary)" strokeWidth="1.3" strokeLinecap="round"
              />
            </svg>
            <div className="flex-1 relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-[16px] bg-transparent outline-none appearance-none"
                style={{
                  color: dueDate ? "var(--sys-label)" : "var(--sys-label-tertiary)",
                  colorScheme: "light dark",
                }}
                placeholder="마감일 없음"
              />
            </div>
            {dueDate && (
              <button
                onClick={() => setDueDate("")}
                className="p-[6px] rounded-full active:bg-[var(--sys-fill-tertiary)] transition-colors"
                style={{ color: "var(--sys-label-tertiary)" }}
                aria-label="마감일 제거"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-3">
          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving || !title.trim()}
            className="w-full h-[50px] rounded-[14px] text-[16px] font-semibold transition-opacity disabled:opacity-40 active:opacity-80"
            style={{
              background: "var(--sys-blue)",
              color: "#FFFFFF",
            }}
          >
            {saving ? "저장 중..." : "저장"}
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={saving}
            className="w-full h-[44px] text-[16px] font-medium transition-opacity active:opacity-60 disabled:opacity-40"
            style={{ color: "var(--sys-red)" }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
