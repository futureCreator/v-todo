import { NextResponse } from "next/server";
import { readBuildCards, writeBuildCards } from "@/lib/build-store";
import type { UpdateKanbanCardRequest, KanbanCard, KanbanColumn, ApiResponse } from "@/types";
import { KANBAN_COLUMNS } from "@/types";

function nextOrder(cards: KanbanCard[], column: KanbanColumn, excludeId?: string): number {
  const inColumn = cards.filter((c) => c.column === column && c.id !== excludeId);
  if (inColumn.length === 0) return 0;
  return Math.max(...inColumn.map((c) => c.order)) + 1;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<KanbanCard>>> {
  try {
    const [{ id }, body, cards] = await Promise.all([
      params,
      request.json() as Promise<UpdateKanbanCardRequest>,
      readBuildCards(),
    ]);
    const index = cards.findIndex((c) => c.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "카드를 찾을 수 없습니다." }, { status: 404 });
    }

    if (body.title !== undefined) {
      if (
        typeof body.title !== "string" ||
        body.title.trim().length === 0 ||
        body.title.length > 200
      ) {
        return NextResponse.json({ error: "제목은 1~200자여야 합니다." }, { status: 400 });
      }
      cards[index].title = body.title.trim();
    }

    if (body.column !== undefined) {
      if (!KANBAN_COLUMNS.includes(body.column)) {
        return NextResponse.json({ error: "유효하지 않은 컬럼입니다." }, { status: 400 });
      }
      if (cards[index].column !== body.column) {
        cards[index].column = body.column;
        cards[index].order =
          body.order !== undefined ? body.order : nextOrder(cards, body.column, id);
      }
    }

    if (body.order !== undefined && body.column === undefined) {
      cards[index].order = body.order;
    }

    await writeBuildCards(cards);
    return NextResponse.json({ data: cards[index] });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const [{ id }, cards] = await Promise.all([params, readBuildCards()]);
    const index = cards.findIndex((c) => c.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "카드를 찾을 수 없습니다." }, { status: 404 });
    }

    cards.splice(index, 1);
    await writeBuildCards(cards);
    return NextResponse.json({ data: null });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
