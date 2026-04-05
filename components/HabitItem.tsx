"use client";

import { useState, useRef } from "react";
import type { Habit, HabitLog } from "@/types";
import HabitHeatmap from "@/components/HabitHeatmap";

interface HabitItemProps {
  habit: Habit;
  logs: HabitLog[];
  todayCompleted: boolean;
  streak: number;
  bestStreak: number;
  onToggle: (habitId: string, completed: boolean) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
}

export default function HabitItem({
  habit,
  logs,
  todayCompleted,
  streak,
  bestStreak,
  onToggle,
  onEdit,
  onDelete,
}: HabitItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [checking, setChecking] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const didLongPress = useRef(false);

  const handleToggle = () => {
    setChecking(true);
    setTimeout(() => {
      onToggle(habit.id, !todayCompleted);
      setChecking(false);
    }, 300);
  };

  const handleTap = () => {
    if (didLongPress.current) return;
    setExpanded((prev) => !prev);
  };

  const onTouchStart = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onEdit(habit);
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
    <div className="bg-[var(--sys-bg-elevated)] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 md:px-5 group">
        {/* Checkbox — 44pt tap target */}
        <button
          className="w-11 h-11 flex items-center justify-center flex-shrink-0"
          onClick={handleToggle}
        >
          <span
            className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
              todayCompleted || checking
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] scale-95"
                : "border-[var(--sys-gray)] hover:border-[var(--accent-primary)]"
            }`}
          >
            {(todayCompleted || checking) && (
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

        {/* Content — tap to expand, long-press to edit */}
        <div
          className="flex-1 flex items-center min-h-[56px] py-3.5 cursor-pointer"
          onClick={handleTap}
          onDoubleClick={() => onEdit(habit)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchMove}
        >
          <span className={`flex-1 text-[20px] leading-[26px] ${
            todayCompleted
              ? "text-[var(--label-tertiary)]"
              : "text-[var(--label-primary)]"
          }`}>
            {habit.title}
          </span>

          {/* Streak badge */}
          {streak > 0 && (
            <span className="flex items-center gap-1 text-[15px] text-[var(--sys-orange)] ml-3 flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--sys-orange)">
                <path d="M8 1C8 1 4 5.5 4 9c0 1.5.7 2.8 1.8 3.5C5.3 11.8 5 10.9 5 10c0-2 2-4.5 3-5.5c1 1 3 3.5 3 5.5c0 .9-.3 1.8-.8 2.5C11.3 11.8 12 10.5 12 9c0-3.5-4-8-4-8z" />
              </svg>
              {streak}
            </span>
          )}

          {/* Chevron */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="var(--label-quaternary)"
            strokeWidth="2"
            strokeLinecap="round"
            className={`ml-2 flex-shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="4 6 8 10 12 6" />
          </svg>
        </div>

        {/* Delete — 44pt tap target */}
        <button
          className="w-11 h-11 flex items-center justify-center flex-shrink-0 text-[var(--label-quaternary)] md:opacity-0 md:group-hover:opacity-100 active:text-[var(--system-red)] transition-all"
          onClick={() => onDelete(habit.id)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="4" y1="4" x2="12" y2="12" />
            <line x1="12" y1="4" x2="4" y2="12" />
          </svg>
        </button>
      </div>

      {/* Heatmap accordion */}
      <div
        className={`transition-all duration-200 overflow-hidden ${expanded ? "max-h-[300px]" : "max-h-0"}`}
      >
        <div className="border-t border-[var(--separator)]">
          <HabitHeatmap habit={habit} logs={logs} bestStreak={bestStreak} />
        </div>
      </div>
    </div>
  );
}
