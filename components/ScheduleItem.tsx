"use client";

import type { Schedule } from "@/types";
import { splitParts } from "@/lib/tags";

interface ScheduleItemProps {
  schedule: Schedule;
  onEdit: (schedule: Schedule) => void;
  onTagClick?: (tag: string) => void;
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
        let next: Date;
        let years: number;

        if (schedule.isLunar) {
          // 음력: targetDate가 이미 올해/내년 양력 변환값
          next = new Date(schedule.targetDate + "T00:00:00");
          years = next.getFullYear() - origin.getFullYear();
        } else {
          let year = today.getFullYear();
          next = new Date(year, origin.getMonth(), origin.getDate());
          if (next.getTime() < today.getTime()) {
            year++;
            next = new Date(year, origin.getMonth(), origin.getDate());
          }
          years = year - origin.getFullYear();
        }

        const daysLeft = Math.ceil(
          (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          displayDate: next,
          daysLeft,
          milestone: `${years}주년`,
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

export default function ScheduleItem({ schedule, onEdit, onTagClick }: ScheduleItemProps) {
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
      className="press w-full flex items-center gap-3.5 px-4 md:px-6 min-h-[72px] py-2 text-left group"
      onClick={() => onEdit(schedule)}
    >
      {/* Calendar block */}
      <div className="size-[60px] rounded-[12px] bg-[var(--fill-quaternary)] flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-[14px] font-medium text-[var(--label-tertiary)] leading-tight">
          {month}월
        </span>
        <span className="text-[26px] font-semibold text-[var(--label-primary)] leading-tight">
          {day}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-[20px] leading-[26px] font-semibold text-[var(--label-primary)] truncate flex items-center flex-wrap gap-1">
          {splitParts(schedule.name).map((part) =>
            part.type === "tag" ? (
              <button
                key={part.key}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/12 text-[var(--accent-primary)] text-[13px] font-medium leading-tight"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onTagClick?.(part.value); }}
              >
                #{part.value}
              </button>
            ) : (
              <span key={part.key}>{part.value}</span>
            )
          )}
        </div>
        {subtitleParts.length > 0 && (
          <div className="text-[15px] leading-[20px] text-[var(--label-tertiary)] mt-0.5">
            {subtitleParts.map((part, idx) => (
              <span key={part}>
                {idx > 0 && (
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
        className={`text-[24px] font-semibold flex-shrink-0 ${ddayColor(daysLeft)}`}
      >
        {ddayLabel(daysLeft)}
      </span>
    </button>
  );
}
