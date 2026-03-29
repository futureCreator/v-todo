import { describe, it, expect } from "vitest";
import { lunarToSolar, solarToLunar } from "../lunar";

describe("lunarToSolar", () => {
  it("converts lunar 2026-01-01 to solar date", () => {
    const result = lunarToSolar(2026, 1, 1);
    expect(result).toBeDefined();
    expect(result!.year).toBe(2026);
    expect(result!.month).toBe(2);
    expect(result!.day).toBe(17);
  });

  it("converts lunar 2026-08-15 (추석) to solar date", () => {
    const result = lunarToSolar(2026, 8, 15);
    expect(result).toBeDefined();
    expect(result!.year).toBe(2026);
    expect(result!.month).toBe(9);
  });

  it("returns null for invalid lunar date", () => {
    const result = lunarToSolar(2026, 13, 40);
    expect(result).toBeNull();
  });
});

describe("solarToLunar", () => {
  it("converts solar 2026-02-17 to lunar date", () => {
    const result = solarToLunar(2026, 2, 17);
    expect(result).toBeDefined();
    expect(result!.month).toBe(1);
    expect(result!.day).toBe(1);
  });

  it("returns null for out-of-range date", () => {
    const result = solarToLunar(2051, 1, 1);
    expect(result).toBeNull();
  });
});
