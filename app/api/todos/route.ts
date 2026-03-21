import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readTodos, writeTodos } from "@/lib/store";
import type { CreateTodoRequest, Quadrant, Todo, ApiResponse } from "@/types";

const VALID_QUADRANTS: Quadrant[] = [
  "urgent-important",
  "urgent-not-important",
  "not-urgent-important",
  "not-urgent-not-important",
];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(): Promise<NextResponse<ApiResponse<Todo[]>>> {
  try {
    const todos = await readTodos();
    const now = Date.now();

    const filtered = todos.filter((t) => {
      if (t.quadrant !== "not-urgent-not-important") return true;
      const age = now - new Date(t.createdAt).getTime();
      return age < SEVEN_DAYS_MS;
    });

    if (filtered.length < todos.length) {
      await writeTodos(filtered);
    }

    return NextResponse.json({ data: filtered });
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
    if (!VALID_QUADRANTS.includes(body.quadrant)) {
      return NextResponse.json({ error: "올바른 분면을 선택해주세요." }, { status: 400 });
    }

    const todo: Todo = {
      id: uuidv4(),
      title: body.title.trim(),
      quadrant: body.quadrant,
      completed: false,
      aiGenerated: body.aiGenerated === true,
      dueDate: body.dueDate ?? null,
      createdAt: new Date().toISOString(),
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
