import { vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";

// Make @testing-library/dom's waitFor recognise vitest fake timers.
// jestFakeTimersAreEnabled() checks `typeof jest !== 'undefined'`
// and then calls jest.advanceTimersByTime(); aliasing vi → jest satisfies both.
(globalThis as unknown as Record<string, unknown>).jest = vi;

// Ensure cleanup runs AFTER real timers are restored so that
// @testing-library/react's act() can drain React's work queue.
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});
