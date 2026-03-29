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

function urgencyColor(days: number): { bg: string; text: string } {
  if (days <= 0) return { bg: "bg-[var(--system-red)]", text: "text-white" };
  if (days <= 14) return { bg: "bg-[var(--system-red)]/15", text: "text-[var(--system-red)]" };
  if (days <= 60) return { bg: "bg-[var(--system-orange)]/15", text: "text-[var(--system-orange)]" };
  return { bg: "bg-[var(--accent-primary)]/10", text: "text-[var(--accent-primary)]" };
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

function repeatLabel(mode: string): string | null {
  if (mode === "every_100_days") return "100일";
  if (mode === "monthly") return "매월";
  if (mode === "yearly") return "매년";
  return null;
}

export default function ScheduleItem({ schedule, onEdit }: ScheduleItemProps) {
  const days = daysUntil(schedule.targetDate);
  const milestone = milestoneLabel(schedule);
  const { bg, text } = urgencyColor(days);
  const repeat = schedule.type === "anniversary" ? repeatLabel(schedule.repeatMode) : null;

  return (
    <button
      className="w-full flex items-center gap-4 px-5 md:px-6 min-h-[60px] text-left group"
      onClick={() => onEdit(schedule)}
    >
      {/* D-day badge */}
      <span
        className={`text-[15px] font-bold min-w-[64px] text-center py-2 px-2.5 rounded-xl ${bg} ${text} flex-shrink-0`}
      >
        {ddayLabel(days)}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0 py-3 border-b border-[var(--separator)]">
        <div className="text-[17px] leading-[22px] font-medium text-[var(--label-primary)] truncate">
          {schedule.name}
        </div>
        <div className="text-[13px] leading-[18px] text-[var(--label-secondary)] mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span>{schedule.targetDate}</span>
          {schedule.isLunar && schedule.lunarMonth && schedule.lunarDay && (
            <span className="text-[var(--label-tertiary)]">
              음력 {schedule.lunarMonth}.{schedule.lunarDay}
            </span>
          )}
          {repeat && (
            <>
              <span className="text-[var(--label-quaternary)]">&middot;</span>
              <span className="text-[var(--label-tertiary)]">{repeat}</span>
            </>
          )}
        </div>
      </div>

      {/* Milestone */}
      {milestone && (
        <span className="text-[13px] font-semibold text-[var(--system-purple)] flex-shrink-0">
          {milestone}
        </span>
      )}

      {/* Chevron */}
      <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="var(--label-quaternary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <polyline points="1 1 7 7 1 13" />
      </svg>
    </button>
  );
}
