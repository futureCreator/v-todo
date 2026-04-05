"use client";

import { useState, useEffect, useRef } from "react";
import type { Habit, HabitRepeatMode } from "@/types";

interface AddHabitSheetProps {
  habit: Habit | null;
  onSave: (data: { title: string; repeatMode: HabitRepeatMode; weekdays: number[]; intervalDays: number }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export default function AddHabitSheet({ habit, onSave, onDelete, onClose }: AddHabitSheetProps) {
  const [title, setTitle] = useState(habit?.title ?? "");
  const [repeatMode, setRepeatMode] = useState<HabitRepeatMode>(habit?.repeatMode ?? "daily");
  const [weekdays, setWeekdays] = useState<number[]>(habit?.weekdays ?? []);
  const [intervalDays, setIntervalDays] = useState(habit?.intervalDays ?? 2);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), repeatMode, weekdays, intervalDays });
  };

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full md:max-w-[420px] bg-[var(--bg-elevated)] rounded-t-2xl md:rounded-2xl p-6 pb-8 safe-area-pb animate-sheetUp">
        <h2 className="text-[20px] font-bold text-[var(--label-primary)] mb-6">
          {habit ? "습관 편집" : "새 습관"}
        </h2>

        {/* Title */}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="습관 이름"
          maxLength={100}
          className="w-full px-4 py-3 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] outline-none mb-5"
        />

        {/* Repeat Mode */}
        <div className="mb-4">
          <span className="text-[15px] font-medium text-[var(--label-secondary)] mb-2 block">반복 주기</span>
          <div className="flex gap-2">
            {(["daily", "weekdays", "interval"] as const).map((mode) => (
              <button
                key={mode}
                className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
                  repeatMode === mode
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--fill-quaternary)] text-[var(--label-secondary)]"
                }`}
                onClick={() => setRepeatMode(mode)}
              >
                {mode === "daily" ? "매일" : mode === "weekdays" ? "요일" : "간격"}
              </button>
            ))}
          </div>
        </div>

        {/* Weekday selector */}
        {repeatMode === "weekdays" && (
          <div className="flex gap-2 mb-5">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
                  weekdays.includes(i)
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--fill-quaternary)] text-[var(--label-secondary)]"
                }`}
                onClick={() => toggleWeekday(i)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Interval selector */}
        {repeatMode === "interval" && (
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[17px] text-[var(--label-primary)]">매</span>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  className={`w-11 h-11 rounded-xl text-[17px] font-medium transition-colors ${
                    intervalDays === n
                      ? "bg-[var(--accent-primary)] text-white"
                      : "bg-[var(--fill-quaternary)] text-[var(--label-secondary)]"
                  }`}
                  onClick={() => setIntervalDays(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className="text-[17px] text-[var(--label-primary)]">일마다</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {habit && onDelete && (
            <button
              className="flex-1 py-3.5 rounded-xl bg-[var(--system-red)]/10 text-[var(--system-red)] text-[17px] font-semibold"
              onClick={() => onDelete(habit.id)}
            >
              삭제
            </button>
          )}
          <button
            className={`flex-1 py-3.5 rounded-xl text-[17px] font-semibold transition-opacity ${
              title.trim()
                ? "bg-[var(--accent-primary)] text-white"
                : "bg-[var(--fill-tertiary)] text-[var(--label-quaternary)]"
            }`}
            onClick={handleSave}
            disabled={!title.trim()}
          >
            {habit ? "저장" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
