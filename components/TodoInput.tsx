"use client";

import { useState, useRef } from "react";

interface TodoInputProps {
  onAdd: (title: string) => void;
}

export default function TodoInput({ onAdd }: TodoInputProps) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setTitle("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex-1 flex items-center min-h-[48px] gap-3 px-4 rounded-xl bg-[var(--fill-quaternary)]">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--label-quaternary)" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
          <line x1="9" y1="4" x2="9" y2="14" />
          <line x1="4" y1="9" x2="14" y2="9" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="새로운 할 일"
          maxLength={200}
          className="flex-1 bg-transparent text-[16px] leading-[21px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] outline-none py-2.5"
        />
      </div>
      {title.trim() && (
        <button
          onClick={handleSubmit}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--accent-primary)] text-white flex-shrink-0 active:scale-95 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="10" y1="4" x2="10" y2="16" />
            <line x1="4" y1="10" x2="16" y2="10" />
          </svg>
        </button>
      )}
    </div>
  );
}
