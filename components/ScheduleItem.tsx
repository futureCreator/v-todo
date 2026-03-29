"use client";

import type { Schedule } from "@/types";

interface ScheduleItemProps {
  schedule: Schedule;
  onEdit: (schedule: Schedule) => void;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function ddayLabel(days: number): string {
  if (days === 0) return "D-day";
  if (days > 0) return `D-${days}`;
  return `D+${Math.abs(days)}`;
}

function urgencyClass(days: number): string {
  if (days <= 14) return "bg-[var(--system-red)] text-white";
  if (days <= 60) return "bg-[var(--system-orange)] text-white";
  return "bg-[var(--accent-primary)] text-white";
}

function milestoneLabel(schedule: Schedule): string | null {
  if (schedule.type !== "anniversary") return null;
  const origin = new Date(schedule.originDate + "T00:00:00");
  const target = new Date(schedule.targetDate + "T00:00:00");
  const diffMs = target.getTime() - origin.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  switch (schedule.repeatMode) {
    case "every_100_days":
      return `${diffDays}일째`;
    case "monthly": {
      const months =
        (target.getFullYear() - origin.getFullYear()) * 12 +
        (target.getMonth() - origin.getMonth());
      return `${months}개월째`;
    }
    case "yearly": {
      const years = target.getFullYear() - origin.getFullYear();
      return `${years}주년`;
    }
    default:
      return null;
  }
}

export default function ScheduleItem({ schedule, onEdit }: ScheduleItemProps) {
  const days = daysUntil(schedule.targetDate);
  const milestone = milestoneLabel(schedule);

  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-4 border-b border-[var(--separator)] text-left"
      onClick={() => onEdit(schedule)}
    >
      <span
        className={`text-[13px] font-bold min-w-[56px] text-center py-1.5 px-2 rounded-lg ${urgencyClass(days)}`}
      >
        {ddayLabel(days)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-[var(--label-primary)] truncate">
          {schedule.name}
        </div>
        <div className="text-[12px] text-[var(--label-tertiary)] mt-0.5">
          {schedule.targetDate}
          {schedule.isLunar && schedule.lunarMonth && schedule.lunarDay && (
            <span className="ml-1">
              (음력 {schedule.lunarMonth}.{schedule.lunarDay})
            </span>
          )}
          {schedule.type === "anniversary" && schedule.repeatMode !== "none" && (
            <span className="ml-1">
              · {schedule.repeatMode === "every_100_days" ? "100일" : schedule.repeatMode === "monthly" ? "매월" : "매년"}
            </span>
          )}
        </div>
      </div>
      {milestone && (
        <span className="text-[11px] font-semibold text-[var(--system-purple)] flex-shrink-0">
          {milestone}
        </span>
      )}
    </button>
  );
}
