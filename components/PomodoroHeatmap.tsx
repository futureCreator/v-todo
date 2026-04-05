"use client";

import type { PomodoroLog } from "@/types";

interface PomodoroHeatmapProps {
  logs: PomodoroLog[];
}

export default function PomodoroHeatmap({ logs }: PomodoroHeatmapProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const countMap = new Map<string, number>();
  for (const log of logs) {
    countMap.set(log.date, (countMap.get(log.date) ?? 0) + 1);
  }

  const days: { date: Date; dateStr: string; count: number }[] = [];
  for (let i = 209; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ date: d, dateStr, count: countMap.get(dateStr) ?? 0 });
  }

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

  function cellColor(count: number): string {
    if (count === 0) return "var(--sys-separator-opaque)";
    if (count <= 2) return "rgba(255, 107, 53, 0.35)";
    if (count <= 4) return "rgba(255, 107, 53, 0.65)";
    return "#FF6B35";
  }

  const totalSessions = logs.length;

  return (
    <div className="mx-5 md:mx-0 mt-3">
      <div className="bg-[var(--sys-bg-elevated)] rounded-xl px-4 py-3.5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] text-[var(--label-tertiary)]">히트맵</span>
          <span className="text-[13px] text-[var(--label-tertiary)]">
            총 <span className="font-semibold text-[var(--sys-orange)]">{totalSessions}회</span>
          </span>
        </div>
        <div className="overflow-hidden">
          <div className="flex gap-[3px] justify-end">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px] flex-shrink-0">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className="rounded-[2px]"
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: day === null ? "transparent" : cellColor(day.count),
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
