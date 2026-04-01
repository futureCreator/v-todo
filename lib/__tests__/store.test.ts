import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { readTodos, writeTodos, TODO_PATH, DATA_DIR } from "../store";
import type { Todo } from "@/types";

describe("store", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(TODO_PATH, JSON.stringify({ todos: [] }));
  });

  afterEach(async () => {
    try { await fs.unlink(TODO_PATH); } catch {}
    try { await fs.unlink(path.join(DATA_DIR, "todos.tmp.json")); } catch {}
  });

  it("reads empty todos from file", async () => {
    const todos = await readTodos();
    expect(todos).toEqual([]);
  });

  it("writes and reads todos", async () => {
    const todo: Todo = {
      id: "test-1",
      title: "Test todo",
      stage: "now",
      completed: false,
      aiGenerated: false,
      createdAt: "2026-03-21T09:00:00Z",
      stageMovedAt: "2026-03-21T09:00:00Z",
      completedAt: null,
    };
    await writeTodos([todo]);
    const todos = await readTodos();
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe("Test todo");
    expect(todos[0].stage).toBe("now");
  });

  it("creates file if not exists", async () => {
    await fs.unlink(TODO_PATH);
    const todos = await readTodos();
    expect(todos).toEqual([]);
  });

  it("recovers from corrupted JSON", async () => {
    await fs.writeFile(TODO_PATH, "not valid json{{{");
    const todos = await readTodos();
    expect(todos).toEqual([]);
  });
});
