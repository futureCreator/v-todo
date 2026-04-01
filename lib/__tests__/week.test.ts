import { describe, it, expect } from "vitest";
import { getISOWeek, getWeekDateRange, getWeekFilename, getPreviousWeekFilename } from "../week";

describe("getISOWeek", () => {
  it("returns correct ISO week for 2026-04-05 (Sunday)", () => {
    const result = getISOWeek(new Date(2026, 3, 5)); // April 5, 2026 = Sunday
    expect(result).toEqual({ year: 2026, week: 14 });
  });

  it("returns correct ISO week for 2026-03-30 (Monday)", () => {
    const result = getISOWeek(new Date(2026, 2, 30)); // March 30, 2026 = Monday
    expect(result).toEqual({ year: 2026, week: 14 });
  });

  it("handles year boundary (2025-12-31 = W01 of 2026)", () => {
    const result = getISOWeek(new Date(2025, 11, 31)); // Dec 31, 2025 = Wednesday
    expect(result).toEqual({ year: 2026, week: 1 });
  });

  it("handles week 1 padding", () => {
    const result = getISOWeek(new Date(2026, 0, 5)); // Jan 5, 2026 = Monday
    expect(result).toEqual({ year: 2026, week: 2 });
  });
});

describe("getWeekDateRange", () => {
  it("returns Monday to Sunday for a mid-week date", () => {
    const result = getWeekDateRange(new Date(2026, 3, 1)); // April 1, 2026 = Wednesday
    expect(result).toEqual({ monday: "2026-03-30", sunday: "2026-04-05" });
  });

  it("returns correct range when given a Monday", () => {
    const result = getWeekDateRange(new Date(2026, 2, 30)); // March 30 = Monday
    expect(result).toEqual({ monday: "2026-03-30", sunday: "2026-04-05" });
  });

  it("returns correct range when given a Sunday", () => {
    const result = getWeekDateRange(new Date(2026, 3, 5)); // April 5 = Sunday
    expect(result).toEqual({ monday: "2026-03-30", sunday: "2026-04-05" });
  });
});

describe("getWeekFilename", () => {
  it("returns formatted filename with zero-padded week", () => {
    expect(getWeekFilename(new Date(2026, 3, 5))).toBe("2026-W14.md");
  });

  it("pads single digit week numbers", () => {
    expect(getWeekFilename(new Date(2026, 0, 5))).toBe("2026-W02.md");
  });
});

describe("getPreviousWeekFilename", () => {
  it("returns previous week filename", () => {
    expect(getPreviousWeekFilename(new Date(2026, 3, 5))).toBe("2026-W13.md");
  });

  it("handles year boundary", () => {
    expect(getPreviousWeekFilename(new Date(2026, 0, 5))).toBe("2026-W01.md");
  });
});
