"use client";

import { useState } from "react";

interface TodoInputProps {
  onAdd: (title: string) => void;
}

export default function TodoInput({ onAdd }: TodoInputProps) {
  const [title, setTitle] = useState("");

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setTitle("");
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--separator)]">
      <span className="text-[var(--label-quaternary)]">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="9" y1="4" x2="9" y2="14" />
          <line x1="4" y1="9" x2="14" y2="9" />
        </svg>
      </span>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="새로운 할 일"
        maxLength={200}
        className="flex-1 bg-transparent text-[15px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none"
      />
    </div>
  );
}
