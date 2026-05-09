"use client";

import { useRef } from "react";

interface DateNavigatorProps {
  date: Date;
  onChange: (date: Date) => void;
}

const DAY_NAMES = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function formatDate(d: Date): string {
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayName = DAY_NAMES[d.getDay()];
  return `${month}월 ${day}일 ${dayName}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateToInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DateNavigator({ date, onChange }: DateNavigatorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const today = new Date();
  const isToday = isSameDay(date, today);

  const goToPrev = () => {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    onChange(prev);
  };

  const goToNext = () => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    onChange(next);
  };

  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [y, m, d] = val.split("-").map(Number);
    onChange(new Date(y, m - 1, d));
  };

  const openPicker = () => {
    inputRef.current?.showPicker();
  };

  return (
    <div className="flex items-center justify-between px-5 md:px-0 py-3">
      {/* Prev button */}
      <button
        className="size-11 flex items-center justify-center text-[var(--label-tertiary)] active:text-[var(--label-primary)] transition-colors"
        onClick={goToPrev}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="13 4 7 10 13 16" />
        </svg>
      </button>

      {/* Date label + hidden date picker */}
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg active:bg-[var(--fill-quaternary)] transition-colors"
        onClick={openPicker}
      >
        <span className="text-[20px] font-semibold text-[var(--label-primary)]">
          {formatDate(date)}
        </span>
        {isToday && (
          <span className="text-[13px] font-medium text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-2 py-0.5 rounded-full">
            오늘
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="date"
        className="absolute opacity-0 size-0 pointer-events-none"
        value={dateToInputValue(date)}
        onChange={handleDatePick}
      />

      {/* Next button */}
      <button
        className="size-11 flex items-center justify-center text-[var(--label-tertiary)] active:text-[var(--label-primary)] transition-colors"
        onClick={goToNext}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="7 4 13 10 7 16" />
        </svg>
      </button>
    </div>
  );
}
