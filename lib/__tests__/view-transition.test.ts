import { describe, it, expect, vi, afterEach } from "vitest";
import { withViewTransition } from "@/lib/view-transition";

describe("withViewTransition", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls updater immediately when document is undefined", () => {
    vi.stubGlobal("document", undefined);
    const updater = vi.fn();
    withViewTransition(updater);
    expect(updater).toHaveBeenCalledOnce();
  });

  it("calls updater immediately when startViewTransition is unavailable", () => {
    vi.stubGlobal("document", {});
    const updater = vi.fn();
    withViewTransition(updater);
    expect(updater).toHaveBeenCalledOnce();
  });

  it("wraps updater in startViewTransition when supported", () => {
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return { finished: Promise.resolve() };
    });
    vi.stubGlobal("document", { startViewTransition });
    const updater = vi.fn();
    withViewTransition(updater);
    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(updater).toHaveBeenCalledOnce();
  });
});
