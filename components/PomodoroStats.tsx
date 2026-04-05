"use client";

import type { PomodoroLog } from "@/types";

interface PomodoroStatsProps {
  logs: PomodoroLog[];
}

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calcStreak(logs: PomodoroLog[]): number {
  const dateSet = new Set(logs.map((l) => l.date));
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  while (true) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (dateSet.has(dateStr)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function PomodoroStats({ logs }: PomodoroStatsProps) {
  const today = getToday();
  const todayLogs = logs.filter((l) => l.date === today);
  const todayCount = todayLogs.length;
  const todayMinutes = todayLogs.reduce((sum, l) => sum + l.duration, 0);
  const hours = Math.floor(todayMinutes / 60);
  const mins = todayMinutes % 60;
  const focusTimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  const streak = calcStreak(logs);

  return (
    <div className="mx-5 md:mx-0">
      <div className="bg-[var(--sys-bg-elevated)] rounded-xl px-4 py-3.5 flex items-center justify-around">
        <div className="text-center">
          <div className="text-[26px] font-bold text-[var(--sys-orange)] tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
            {todayCount}
          </div>
          <div className="text-[13px] text-[var(--label-tertiary)]">오늘 완료</div>
        </div>
        <div className="w-px h-8 bg-[var(--separator)]" />
        <div className="text-center">
          <div className="text-[26px] font-bold text-[var(--label-primary)] tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
            {focusTimeStr}
          </div>
          <div className="text-[13px] text-[var(--label-tertiary)]">집중 시간</div>
        </div>
        <div className="w-px h-8 bg-[var(--separator)]" />
        <div className="text-center">
          <div className="text-[26px] font-bold text-[var(--label-primary)] tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
            {streak}
          </div>
          <div className="text-[13px] text-[var(--label-tertiary)]">연속일</div>
        </div>
      </div>
    </div>
  );
}
