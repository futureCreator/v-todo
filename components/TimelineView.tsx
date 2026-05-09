"use client";

import type { Schedule } from "@/types";
import { getDisplayInfo } from "@/components/ScheduleItem";
import { splitParts } from "@/lib/tags";

interface TimelineViewProps {
  schedules: Schedule[];
  onEdit: (schedule: Schedule) => void;
  onTagClick?: (tag: string) => void;
}

interface MonthGroup {
  key: string;
  label: string;
  items: (Schedule & { displayDate: Date; daysLeft: number; milestone: string | null })[];
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

function typeLabel(schedule: Schedule): string {
  if (schedule.type === "anniversary") return "기념일";
  return "D-day";
}

function typeBadgeColor(schedule: Schedule): string {
  if (schedule.type === "anniversary") return "bg-[var(--system-purple)]/15 text-[var(--system-purple)]";
  return "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]";
}

export default function TimelineView({ schedules, onEdit, onTagClick }: TimelineViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build enriched items with display info
  const enriched = schedules.map((s) => {
    const info = getDisplayInfo(s);
    return { ...s, ...info };
  });

  // Sort by date (closest first)
  enriched.sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime());

  // Group by month
  const groups: MonthGroup[] = [];
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

  for (const item of enriched) {
    const y = item.displayDate.getFullYear();
    const m = item.displayDate.getMonth();
    const key = `${y}-${m}`;
    const isThisYear = y === today.getFullYear();
    const label = isThisYear ? monthNames[m] : `${y}년 ${monthNames[m]}`;

    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }

  if (enriched.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[var(--label-tertiary)]">
        <span className="text-[56px] mb-5 opacity-30">📅</span>
        <p className="text-[20px]">등록된 일정이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="mx-5 md:mx-0 flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.key}>
          {/* Month header */}
          <div className="flex items-center gap-3 mb-3 px-1">
            <h3 className="text-[17px] font-semibold text-[var(--label-primary)]">
              {group.label}
            </h3>
            <span className="text-[13px] text-[var(--label-tertiary)]">
              {group.items.length}개
            </span>
            <div className="flex-1 h-px bg-[var(--separator)]" />
          </div>

          {/* Timeline items */}
          <div className="flex flex-col gap-1.5">
            {group.items.map((item) => {
              const day = item.displayDate.getDate();
              const weekday = ["일", "월", "화", "수", "목", "금", "토"][item.displayDate.getDay()];
              const isToday = item.daysLeft === 0;
              const isPast = item.daysLeft < 0;

              return (
                <button
                  key={item.id}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all active:scale-[0.98] ${
                    isToday
                      ? "bg-[var(--accent-primary)]/10 ring-1 ring-[var(--accent-primary)]/30"
                      : "bg-[var(--sys-bg-elevated)]"
                  } ${isPast ? "opacity-60" : ""}`}
                  onClick={() => onEdit(item)}
                >
                  {/* Date circle */}
                  <div className={`w-[44px] h-[44px] rounded-full flex flex-col items-center justify-center flex-shrink-0 ${
                    isToday
                      ? "bg-[var(--accent-primary)] text-white"
                      : "bg-[var(--fill-quaternary)]"
                  }`}>
                    <span className={`text-[18px] font-semibold leading-tight ${
                      isToday ? "" : "text-[var(--label-primary)]"
                    }`}>
                      {day}
                    </span>
                    <span className={`text-[10px] font-medium leading-tight ${
                      isToday ? "opacity-80" : "text-[var(--label-tertiary)]"
                    }`}>
                      {weekday}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${typeBadgeColor(item)}`}>
                        {typeLabel(item)}
                      </span>
                      {item.milestone && (
                        <span className="text-[11px] font-medium text-[var(--system-purple)]">
                          {item.milestone}
                        </span>
                      )}
                    </div>
                    <div className="text-[17px] leading-[22px] font-semibold text-[var(--label-primary)] truncate flex items-center flex-wrap gap-1">
                      {splitParts(item.name).map((part, i) =>
                        part.type === "tag" ? (
                          <button
                            key={i}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/12 text-[var(--accent-primary)] text-[12px] font-medium leading-tight"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onTagClick?.(part.value); }}
                          >
                            #{part.value}
                          </button>
                        ) : (
                          <span key={i}>{part.value}</span>
                        )
                      )}
                    </div>
                  </div>

                  {/* D-day */}
                  <span className={`text-[20px] font-semibold flex-shrink-0 ${ddayColor(item.daysLeft)}`}>
                    {ddayLabel(item.daysLeft)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
