"use client";

import { useState } from "react";
import type { Quadrant } from "@/types";

interface TodoInputProps {
  quadrant: Quadrant;
  onAdd: (title: string, quadrant: Quadrant, dueDate: string | null) => void;
}

export default function TodoInput({ quadrant, onAdd }: TodoInputProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showDate, setShowDate] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || trimmed.length > 200) return;
    onAdd(trimmed, quadrant, dueDate || null);
    setTitle("");
    setDueDate("");
    setShowDate(false);
  };

  const hasText = title.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="px-[24px] py-[12px]">
      <div className="flex items-center gap-[12px]">
        {/* Add button */}
        <button
          type="submit"
          disabled={!hasText}
          className="w-[24px] h-[24px] rounded-full flex-shrink-0 flex items-center justify-center transition-all active:scale-90"
          style={{
            backgroundColor: hasText ? "var(--sys-blue)" : "var(--sys-fill-tertiary)",
            opacity: hasText ? 1 : 0.5,
          }}
          aria-label="추가"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1v10M1 6h10"
              stroke={hasText ? "white" : "var(--sys-label-tertiary)"}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Text input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="새로운 할 일"
          maxLength={200}
          className="flex-1 bg-transparent text-[16px] leading-[21px] outline-none"
          style={{
            color: "var(--sys-label)",
            caretColor: "var(--sys-blue)",
          }}
        />

        {/* Calendar toggle */}
        <button
          type="button"
          onClick={() => setShowDate(!showDate)}
          className="p-[6px] -mr-[6px] rounded-full transition-all active:scale-90 active:bg-[var(--sys-fill-tertiary)]"
          style={{
            color: showDate ? "var(--sys-blue)" : "var(--sys-label-quaternary)",
          }}
          aria-label="마감일 설정"
        >
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <rect x="2.5" y="3.5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M2.5 8.5H19.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M7 1.5V4.5M15 1.5V4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {showDate && (
        <div className="mt-[10px] ml-[38px] item-enter">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-[14px] px-3 py-[7px] rounded-xl outline-none transition-colors"
            style={{
              background: "var(--sys-fill-quaternary)",
              color: "var(--sys-blue)",
              border: "0.5px solid var(--sys-separator)",
            }}
          />
        </div>
      )}
    </form>
  );
}
