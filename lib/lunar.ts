import KoreanLunarCalendar from "korean-lunar-calendar";

interface DateParts {
  year: number;
  month: number;
  day: number;
}

export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  isLeapMonth: boolean = false
): DateParts | null {
  try {
    const cal = new KoreanLunarCalendar();
    const valid = cal.setLunarDate(year, month, day, isLeapMonth);
    if (!valid) return null;
    const solar = cal.getSolarCalendar();
    return { year: solar.year, month: solar.month, day: solar.day };
  } catch {
    return null;
  }
}

export function solarToLunar(
  year: number,
  month: number,
  day: number
): (DateParts & { isLeapMonth: boolean }) | null {
  try {
    const cal = new KoreanLunarCalendar();
    const valid = cal.setSolarDate(year, month, day);
    if (!valid) return null;
    const lunar = cal.getLunarCalendar();
    return {
      year: lunar.year,
      month: lunar.month,
      day: lunar.day,
      isLeapMonth: lunar.intercalation ?? false,
    };
  } catch {
    return null;
  }
}
