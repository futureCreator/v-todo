import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { readTodos, writeTodos, DATA_PATH } from "../store";
import type { Todo } from "@/types";

const TEST_DATA_DIR = path.join(process.cwd(), "data");
const TEST_DATA_PATH = path.join(TEST_DATA_DIR, "todos.json");

describe("store", () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
    await fs.writeFile(TEST_DATA_PATH, JSON.stringify({ todos: [] }));
  });

  afterEach(async () => {
    try {
      await fs.unlink(TEST_DATA_PATH);
    } catch {}
    try {
      await fs.unlink(path.join(TEST_DATA_DIR, "todos.tmp.json"));
    } catch {}
  });

  it("reads empty todos from file", async () => {
    const todos = await readTodos();
    expect(todos).toEqual([]);
  });

  it("writes and reads todos", async () => {
    const todo: Todo = {
      id: "test-1",
      title: "Test todo",
      quadrant: "urgent-important",
      completed: false,
      aiGenerated: false,
      dueDate: null,
      createdAt: "2026-03-21T09:00:00Z",
      completedAt: null,
    };
    await writeTodos([todo]);
    const todos = await readTodos();
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe("Test todo");
  });

  it("creates file if not exists", async () => {
    await fs.unlink(TEST_DATA_PATH);
    const todos = await readTodos();
    expect(todos).toEqual([]);
  });

  it("recovers from corrupted JSON", async () => {
    await fs.writeFile(TEST_DATA_PATH, "not valid json{{{");
    const todos = await readTodos();
    expect(todos).toEqual([]);
  });
});
