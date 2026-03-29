import fs from "fs/promises";
import path from "path";
import type { Todo, TodoStore } from "@/types";

export const DATA_DIR = path.join(process.cwd(), "data");
export const TODO_PATH = path.join(DATA_DIR, "todos.json");
const TMP_PATH = path.join(DATA_DIR, "todos.tmp.json");

export async function readTodos(): Promise<Todo[]> {
  try {
    const raw = await fs.readFile(TODO_PATH, "utf-8");
    const parsed: TodoStore = JSON.parse(raw);
    return parsed.todos;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(TODO_PATH, JSON.stringify({ todos: [] }));
      return [];
    }
    console.error("Failed to parse todos.json, resetting:", err);
    await fs.writeFile(TODO_PATH, JSON.stringify({ todos: [] }));
    return [];
  }
}

export async function writeTodos(todos: Todo[]): Promise<void> {
  const data: TodoStore = { todos };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(data, null, 2));
  await fs.rename(TMP_PATH, TODO_PATH);
}
