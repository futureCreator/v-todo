import { describe, it, expect } from "vitest";
import { applyAdvance } from "../advance";
import type { Schedule } from "@/types";

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: "sch-1",
    name: "Test",
    targetDate: "2026-03-20",
    originDate: "2026-03-20",
    type: "general",
    repeatMode: "none",
    isLunar: false,
    lunarMonth: null,
    lunarDay: null,
    createdAt: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

describe("applyAdvance", () => {
  const today = new Date("2026-03-29");

  it("deletes expired general schedules", () => {
    const sch = makeSchedule({ type: "general", targetDate: "2026-03-20" });
    const { schedules, changed } = applyAdvance([sch], today);
    expect(schedules).toHaveLength(0);
    expect(changed).toBe(true);
  });

  it("keeps future general schedules", () => {
    const sch = makeSchedule({ type: "general", targetDate: "2026-04-01" });
    const { schedules, changed } = applyAdvance([sch], today);
    expect(schedules).toHaveLength(1);
    expect(changed).toBe(false);
  });

  it("advances anniversary with every_100_days", () => {
    const sch = makeSchedule({
      type: "anniversary",
      repeatMode: "every_100_days",
      targetDate: "2026-03-20",
      originDate: "2025-12-11",
    });
    const { schedules, changed } = applyAdvance([sch], today);
    expect(schedules[0].targetDate).toBe("2026-06-28");
    expect(changed).toBe(true);
  });

  it("advances anniversary with monthly repeat", () => {
    const sch = makeSchedule({
      type: "anniversary",
      repeatMode: "monthly",
      targetDate: "2026-03-15",
      originDate: "2026-01-15",
    });
    const { schedules } = applyAdvance([sch], today);
    expect(schedules[0].targetDate).toBe("2026-04-15");
  });

  it("advances anniversary with yearly repeat", () => {
    const sch = makeSchedule({
      type: "anniversary",
      repeatMode: "yearly",
      targetDate: "2026-03-01",
      originDate: "2024-03-01",
    });
    const { schedules } = applyAdvance([sch], today);
    expect(schedules[0].targetDate).toBe("2027-03-01");
  });

  it("clamps monthly to end of month (Jan 31 → Feb 28)", () => {
    const sch = makeSchedule({
      type: "anniversary",
      repeatMode: "monthly",
      targetDate: "2026-01-31",
      originDate: "2026-01-31",
    });
    const jan31Today = new Date("2026-02-01");
    const { schedules } = applyAdvance([sch], jan31Today);
    expect(schedules[0].targetDate).toBe("2026-02-28");
  });

  it("does not advance future anniversaries", () => {
    const sch = makeSchedule({
      type: "anniversary",
      repeatMode: "yearly",
      targetDate: "2026-04-01",
      originDate: "2025-04-01",
    });
    const { schedules, changed } = applyAdvance([sch], today);
    expect(schedules[0].targetDate).toBe("2026-04-01");
    expect(changed).toBe(false);
  });
});
