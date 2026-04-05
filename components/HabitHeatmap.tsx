"use client";

import type { Habit, HabitLog } from "@/types";

interface HabitHeatmapProps {
  habit: Habit;
  logs: HabitLog[];
  bestStreak: number;
}

function isScheduledDay(date: Date, habit: Habit, createdDate: Date): boolean {
  if (date < createdDate) return false;
  if (habit.repeatMode === "daily") return true;
  if (habit.repeatMode === "weekdays") return habit.weekdays.includes(date.getDay());
  if (habit.repeatMode === "interval") {
    const diffMs = date.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays % habit.intervalDays === 0;
  }
  return false;
}

export default function HabitHeatmap({ habit, logs, bestStreak }: HabitHeatmapProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const createdDate = new Date(habit.createdAt);
  createdDate.setHours(0, 0, 0, 0);

  // Build 12 weeks of data (84 days ending today)
  const days: { date: Date; dateStr: string; scheduled: boolean; completed: boolean }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const scheduled = isScheduledDay(d, habit, createdDate);
    const completed = logs.some((l) => l.habitId === habit.id && l.date === dateStr && l.completed);
    days.push({ date: d, dateStr, scheduled, completed });
  }

  // Group by week (columns), each column has 7 rows (Sun=0 to Sat=6)
  const weeks: (typeof days[number] | null)[][] = [];
  let currentWeek: (typeof days[number] | null)[] = Array(7).fill(null);

  for (const day of days) {
    const dow = day.date.getDay();
    if (dow === 0 && currentWeek.some((d) => d !== null)) {
      weeks.push(currentWeek);
      currentWeek = Array(7).fill(null);
    }
    currentWeek[dow] = day;
  }
  weeks.push(currentWeek);

  const cellSize = 12;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] text-[var(--label-tertiary)]">최근 12주</span>
        <span className="text-[13px] text-[var(--label-tertiary)]">
          최장 연속 <span className="font-semibold text-[var(--sys-orange)]">{bestStreak}일</span>
        </span>
      </div>
      <div className="flex gap-[3px] justify-end">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => {
              let bg: string;
              if (day === null) {
                bg = "transparent";
              } else if (day.completed) {
                bg = "var(--accent-primary)";
              } else if (day.scheduled) {
                bg = "var(--sys-separator-opaque)";
              } else {
                bg = "var(--sys-bg-secondary)";
              }
              return (
                <div
                  key={di}
                  className="rounded-[2px]"
                  style={{ width: cellSize, height: cellSize, backgroundColor: bg }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
