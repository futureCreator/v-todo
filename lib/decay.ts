import type { Todo } from "@/types";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function applyDecay(
  todos: Todo[],
  now: Date = new Date()
): { todos: Todo[]; changed: boolean } {
  let changed = false;
  const nowMs = now.getTime();
  const nowIso = now.toISOString();

  const result = todos.filter((todo) => {
    if (todo.completed) return true;

    const elapsed = nowMs - new Date(todo.stageMovedAt).getTime();

    if (todo.stage === "archive" && elapsed >= THIRTY_DAYS_MS) {
      changed = true;
      return false;
    }

    if (todo.stage === "soon" && elapsed >= SEVEN_DAYS_MS) {
      todo.stage = "archive";
      todo.stageMovedAt = nowIso;
      changed = true;
    } else if (todo.stage === "now" && elapsed >= THREE_DAYS_MS) {
      todo.stage = "soon";
      todo.stageMovedAt = nowIso;
      changed = true;
    }

    return true;
  });

  return { todos: result, changed };
}
