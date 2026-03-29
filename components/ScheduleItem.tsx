"use client";

import type { Schedule } from "@/types";

interface ScheduleItemProps {
  schedule: Schedule;
  onEdit: (schedule: Schedule) => void;
}

/** Compute next occurrence date, days left, and milestone for any schedule */
export function getDisplayInfo(schedule: Schedule): {
  displayDate: Date;
  daysLeft: number;
  milestone: string | null;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (schedule.type === "anniversary" && schedule.repeatMode !== "none") {
    const origin = new Date(schedule.originDate + "T00:00:00");

    switch (schedule.repeatMode) {
      case "yearly": {
        let year = today.getFullYear();
        let next = new Date(year, origin.getMonth(), origin.getDate());
        if (next.getTime() < today.getTime()) {
          year++;
          next = new Date(year, origin.getMonth(), origin.getDate());
        }
        const years = year - origin.getFullYear();
        const daysLeft = Math.ceil(
          (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          displayDate: next,
          daysLeft,
          milestone: years > 0 ? `${years}주년` : null,
        };
      }
      case "monthly": {
        const next = new Date(
          today.getFullYear(),
          today.getMonth(),
          origin.getDate()
        );
        if (next.getTime() < today.getTime()) {
          next.setMonth(next.getMonth() + 1);
        }
        const months =
          (next.getFullYear() - origin.getFullYear()) * 12 +
          (next.getMonth() - origin.getMonth());
        const daysLeft = Math.ceil(
          (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          displayDate: next,
          daysLeft,
          milestone: months > 0 ? `${months}개월째` : null,
        };
      }
      case "every_100_days": {
        const diffMs = today.getTime() - origin.getTime();
        const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (totalDays < 0) {
          return {
            displayDate: origin,
            daysLeft: -totalDays,
            milestone: null,
          };
        }

        const dayCount = totalDays + 1;
        const nextMilestone = Math.ceil(dayCount / 100) * 100;
        const daysUntilMilestone = nextMilestone - dayCount;
        const nextDate = new Date(
          origin.getTime() + (nextMilestone - 1) * 86400000
        );

        return {
          displayDate: nextDate,
          daysLeft: daysUntilMilestone,
          milestone: `${dayCount}일째`,
        };
      }
    }
  }

  // General schedule
  const target = new Date(schedule.targetDate + "T00:00:00");
  const daysLeft = Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  return { displayDate: target, daysLeft, milestone: null };
}

function ddayLabel(days: number): string {
  if (days === 0) return "D-Day";
  if (days > 0) return `D-${days}`;
  return `D+${Math.abs(days)}`;
}

function ddayColor(days: number): string {
  if (days <= 0) return "text-[var(--system-red)]";
  if (days <= 14) return "text-[var(--system-red)]";
  if (days <= 60) return "text-[var(--system-orange)]";
  return "text-[var(--accent-primary)]";
}

export default function ScheduleItem({ schedule, onEdit }: ScheduleItemProps) {
  const { displayDate, daysLeft, milestone } = getDisplayInfo(schedule);
  const month = displayDate.getMonth() + 1;
  const day = displayDate.getDate();

  const subtitleParts: string[] = [];
  if (milestone) subtitleParts.push(milestone);
  if (schedule.isLunar && schedule.lunarMonth && schedule.lunarDay) {
    subtitleParts.push(`음력 ${schedule.lunarMonth}.${schedule.lunarDay}`);
  }
  if (schedule.type === "general") {
    subtitleParts.push(schedule.targetDate);
  }

  return (
    <button
      className="w-full flex items-center gap-3.5 px-4 md:px-6 min-h-[72px] text-left group"
      onClick={() => onEdit(schedule)}
    >
      {/* Calendar block */}
      <div className="w-14 h-14 rounded-[10px] bg-[var(--fill-quaternary)] flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-[11px] font-medium text-[var(--label-tertiary)] leading-tight">
          {month}월
        </span>
        <span className="text-[22px] font-bold text-[var(--label-primary)] leading-tight">
          {day}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-3 border-b border-[var(--separator)]">
        <div className="text-[16px] leading-[21px] font-semibold text-[var(--label-primary)] truncate">
          {schedule.name}
        </div>
        {subtitleParts.length > 0 && (
          <div className="text-[12px] leading-[16px] text-[var(--label-tertiary)] mt-0.5">
            {subtitleParts.map((part, i) => (
              <span key={i}>
                {i > 0 && (
                  <span className="text-[var(--label-quaternary)]"> &middot; </span>
                )}
                {part === milestone ? (
                  <span className="text-[var(--system-purple)] font-medium">
                    {part}
                  </span>
                ) : (
                  part
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* D-day */}
      <span
        className={`text-[20px] font-bold flex-shrink-0 ${ddayColor(daysLeft)}`}
      >
        {ddayLabel(daysLeft)}
      </span>
    </button>
  );
}
