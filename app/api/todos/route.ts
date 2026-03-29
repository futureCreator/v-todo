import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readTodos, writeTodos } from "@/lib/store";
import { applyDecay } from "@/lib/decay";
import type { CreateTodoRequest, Todo, ApiResponse } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<Todo[]>>> {
  try {
    const todos = await readTodos();
    const { todos: decayed, changed } = applyDecay(todos);

    if (changed) {
      await writeTodos(decayed);
    }

    const visible = decayed.filter((t) => !t.completed);
    return NextResponse.json({ data: visible });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<Todo>>> {
  try {
    const body: CreateTodoRequest = await request.json();

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
    }
    if (body.title.trim().length === 0 || body.title.length > 200) {
      return NextResponse.json({ error: "제목은 1~200자여야 합니다." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const todo: Todo = {
      id: uuidv4(),
      title: body.title.trim(),
      stage: "now",
      completed: false,
      aiGenerated: body.aiGenerated === true,
      createdAt: now,
      stageMovedAt: now,
      completedAt: null,
    };

    const todos = await readTodos();
    todos.push(todo);
    await writeTodos(todos);

    return NextResponse.json({ data: todo }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
