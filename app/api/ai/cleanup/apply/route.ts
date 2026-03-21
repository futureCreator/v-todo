import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readTodos, writeTodos } from "@/lib/store";
import type { AiCleanupApplyRequest, Todo, ApiResponse } from "@/types";

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<Todo[]>>> {
  try {
    const body: AiCleanupApplyRequest = await request.json();
    const todos = await readTodos();

    for (const change of body.changes) {
      if (change.type === "edit") {
        const todo = todos.find((t) => t.id === change.originalIds[0]);
        if (todo && change.newTitle) {
          todo.title = change.newTitle;
        }
      } else if (change.type === "merge") {
        const idsToRemove = new Set(change.originalIds);
        const originals = todos.filter((t) => idsToRemove.has(t.id));
        const dueDates = originals
          .map((t) => t.dueDate)
          .filter((d): d is string => d !== null)
          .sort();

        for (let i = todos.length - 1; i >= 0; i--) {
          if (idsToRemove.has(todos[i].id)) {
            todos.splice(i, 1);
          }
        }

        if (change.newTitle) {
          const merged: Todo = {
            id: uuidv4(),
            title: change.newTitle,
            quadrant: body.quadrant,
            completed: false,
            aiGenerated: true,
            dueDate: change.dueDate ?? dueDates[0] ?? null,
            createdAt: new Date().toISOString(),
            completedAt: null,
          };
          todos.push(merged);
        }
      } else if (change.type === "delete") {
        const idsToRemove = new Set(change.originalIds);
        for (let i = todos.length - 1; i >= 0; i--) {
          if (idsToRemove.has(todos[i].id)) {
            todos.splice(i, 1);
          }
        }
      }
    }

    await writeTodos(todos);
    return NextResponse.json({ data: todos });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
