import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { haptic } from "@/lib/haptic";

describe("haptic", () => {
  let vibrateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateSpy = vi.fn();
    vi.stubGlobal("navigator", { vibrate: vibrateSpy });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("selection() vibrates 5ms", () => {
    haptic.selection();
    expect(vibrateSpy).toHaveBeenCalledWith(5);
  });

  it("light() vibrates 8ms", () => {
    haptic.light();
    expect(vibrateSpy).toHaveBeenCalledWith(8);
  });

  it("tap() vibrates 10ms", () => {
    haptic.tap();
    expect(vibrateSpy).toHaveBeenCalledWith(10);
  });

  it("medium() vibrates 15ms", () => {
    haptic.medium();
    expect(vibrateSpy).toHaveBeenCalledWith(15);
  });

  it("success() vibrates with [20, 30, 40] pattern", () => {
    haptic.success();
    expect(vibrateSpy).toHaveBeenCalledWith([20, 30, 40]);
  });

  it("warning() vibrates with [40, 30, 40] pattern", () => {
    haptic.warning();
    expect(vibrateSpy).toHaveBeenCalledWith([40, 30, 40]);
  });

  it("silently no-ops when navigator.vibrate is unavailable", () => {
    vi.stubGlobal("navigator", {});
    expect(() => haptic.tap()).not.toThrow();
  });

  it("silently no-ops when navigator is undefined", () => {
    vi.stubGlobal("navigator", undefined);
    expect(() => haptic.tap()).not.toThrow();
  });
});
