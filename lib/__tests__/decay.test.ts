import { describe, it, expect } from "vitest";
import { applyDecay } from "../decay";
import type { Todo } from "@/types";

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: "test-1",
    title: "Test",
    stage: "now",
    completed: false,
    aiGenerated: false,
    createdAt: "2026-03-20T00:00:00Z",
    stageMovedAt: "2026-03-20T00:00:00Z",
    completedAt: null,
    ...overrides,
  };
}

describe("applyDecay", () => {
  it("does not move items within 3 days", () => {
    const now = new Date("2026-03-22T00:00:00Z");
    const todo = makeTodo({ stage: "now", stageMovedAt: "2026-03-20T00:00:00Z" });
    const { todos, changed } = applyDecay([todo], now);
    expect(todos[0].stage).toBe("now");
    expect(changed).toBe(false);
  });

  it("moves now → soon after 3 days", () => {
    const now = new Date("2026-03-23T00:00:01Z");
    const todo = makeTodo({ stage: "now", stageMovedAt: "2026-03-20T00:00:00Z" });
    const { todos, changed } = applyDecay([todo], now);
    expect(todos[0].stage).toBe("soon");
    expect(changed).toBe(true);
  });

  it("moves soon → archive after 7 days", () => {
    const now = new Date("2026-03-27T00:00:01Z");
    const todo = makeTodo({ stage: "soon", stageMovedAt: "2026-03-20T00:00:00Z" });
    const { todos, changed } = applyDecay([todo], now);
    expect(todos[0].stage).toBe("archive");
    expect(changed).toBe(true);
  });

  it("deletes archive items after 30 days", () => {
    const now = new Date("2026-04-19T00:00:01Z");
    const todo = makeTodo({ stage: "archive", stageMovedAt: "2026-03-20T00:00:00Z" });
    const { todos, changed } = applyDecay([todo], now);
    expect(todos).toHaveLength(0);
    expect(changed).toBe(true);
  });

  it("does not decay completed items", () => {
    const now = new Date("2026-04-20T00:00:00Z");
    const todo = makeTodo({
      stage: "now",
      completed: true,
      stageMovedAt: "2026-03-20T00:00:00Z",
      completedAt: "2026-03-20T00:00:00Z",
    });
    const { todos, changed } = applyDecay([todo], now);
    expect(todos[0].stage).toBe("now");
    expect(changed).toBe(false);
  });

  it("sets stageMovedAt to now when moving stages", () => {
    const now = new Date("2026-03-23T12:00:00Z");
    const todo = makeTodo({ stage: "now", stageMovedAt: "2026-03-20T00:00:00Z" });
    const { todos } = applyDecay([todo], now);
    expect(todos[0].stageMovedAt).toBe(now.toISOString());
  });

  it("handles multiple items with different stages", () => {
    const now = new Date("2026-03-27T00:00:01Z");
    const items: Todo[] = [
      makeTodo({ id: "1", stage: "now", stageMovedAt: "2026-03-20T00:00:00Z" }),
      makeTodo({ id: "2", stage: "soon", stageMovedAt: "2026-03-20T00:00:00Z" }),
      makeTodo({ id: "3", stage: "now", stageMovedAt: "2026-03-26T00:00:00Z" }),
    ];
    const { todos } = applyDecay(items, now);
    expect(todos.find((t) => t.id === "1")!.stage).toBe("soon");
    expect(todos.find((t) => t.id === "2")!.stage).toBe("archive");
    expect(todos.find((t) => t.id === "3")!.stage).toBe("now");
  });
});
