import { NextResponse } from "next/server";
import { readTodos, writeTodos } from "@/lib/store";
import type { UpdateTodoRequest, Todo, ApiResponse } from "@/types";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Todo>>> {
  try {
    const [{ id }, body, todos] = await Promise.all([
      params,
      request.json() as Promise<UpdateTodoRequest>,
      readTodos(),
    ]);
    const index = todos.findIndex((t) => t.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "할 일을 찾을 수 없습니다." }, { status: 404 });
    }

    if (body.title !== undefined) {
      if (
        typeof body.title !== "string" ||
        body.title.trim().length === 0 ||
        body.title.length > 200
      ) {
        return NextResponse.json({ error: "제목은 1~200자여야 합니다." }, { status: 400 });
      }
      todos[index].title = body.title.trim();
    }

    if (body.completed !== undefined) {
      todos[index].completed = body.completed;
      todos[index].completedAt = body.completed ? new Date().toISOString() : null;
    }

    await writeTodos(todos);
    return NextResponse.json({ data: todos[index] });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const [{ id }, todos] = await Promise.all([params, readTodos()]);
    const index = todos.findIndex((t) => t.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "할 일을 찾을 수 없습니다." }, { status: 404 });
    }

    todos.splice(index, 1);
    await writeTodos(todos);
    return NextResponse.json({ data: null });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
