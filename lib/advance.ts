import type { Schedule } from "@/types";
import { lunarToSolar } from "@/lib/lunar";

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  const targetMonth = r.getMonth() + n;
  r.setMonth(targetMonth);
  if (r.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    r.setDate(0);
  }
  return r;
}

function addYears(d: Date, n: number): Date {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  if (r.getMonth() !== d.getMonth()) {
    r.setDate(0);
  }
  return r;
}

function advanceSchedule(schedule: Schedule, today: Date): void {
  const target = parseDate(schedule.targetDate);

  while (target < today) {
    switch (schedule.repeatMode) {
      case "every_100_days": {
        const next = addDays(target, 100);
        target.setTime(next.getTime());
        break;
      }
      case "monthly": {
        const next = addMonths(target, 1);
        target.setTime(next.getTime());
        break;
      }
      case "yearly": {
        if (schedule.isLunar && schedule.lunarMonth && schedule.lunarDay) {
          const nextYear = target.getFullYear() + 1;
          const solar = lunarToSolar(nextYear, schedule.lunarMonth, schedule.lunarDay);
          if (solar) {
            target.setTime(new Date(solar.year, solar.month - 1, solar.day).getTime());
          } else {
            target.setTime(addYears(target, 1).getTime());
          }
        } else {
          const next = addYears(target, 1);
          target.setTime(next.getTime());
        }
        break;
      }
      default:
        return;
    }
  }

  schedule.targetDate = toDateStr(target);
}

export function applyAdvance(
  schedules: Schedule[],
  today: Date = new Date()
): { schedules: Schedule[]; changed: boolean } {
  let changed = false;

  const result = schedules.filter((sch) => {
    const target = parseDate(sch.targetDate);

    if (target >= today) return true;

    if (sch.type === "general") {
      changed = true;
      return false;
    }

    if (sch.type === "anniversary" && sch.repeatMode !== "none") {
      const before = sch.targetDate;
      advanceSchedule(sch, today);
      if (sch.targetDate !== before) changed = true;
      return true;
    }

    return true;
  });

  return { schedules: result, changed };
}
