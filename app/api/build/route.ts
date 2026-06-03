import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readBuildCards, writeBuildCards } from "@/lib/build-store";
import type { CreateKanbanCardRequest, KanbanCard, KanbanColumn, ApiResponse } from "@/types";
import { KANBAN_COLUMNS } from "@/types";

function nextOrder(cards: KanbanCard[], column: KanbanColumn): number {
  const inColumn = cards.filter((c) => c.column === column);
  if (inColumn.length === 0) return 0;
  return Math.max(...inColumn.map((c) => c.order)) + 1;
}

export async function GET(): Promise<NextResponse<ApiResponse<KanbanCard[]>>> {
  try {
    const cards = await readBuildCards();
    cards.sort((a, b) => {
      const colDiff = KANBAN_COLUMNS.indexOf(a.column) - KANBAN_COLUMNS.indexOf(b.column);
      if (colDiff !== 0) return colDiff;
      return a.order - b.order;
    });
    return NextResponse.json({ data: cards });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<KanbanCard>>> {
  try {
    const body: CreateKanbanCardRequest = await request.json();

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
    }
    if (body.title.trim().length === 0 || body.title.length > 200) {
      return NextResponse.json({ error: "제목은 1~200자여야 합니다." }, { status: 400 });
    }

    const column: KanbanColumn =
      body.column && KANBAN_COLUMNS.includes(body.column) ? body.column : "idea";

    const cards = await readBuildCards();
    const now = new Date().toISOString();
    const card: KanbanCard = {
      id: uuidv4(),
      title: body.title.trim(),
      column,
      order: nextOrder(cards, column),
      createdAt: now,
    };

    cards.push(card);
    await writeBuildCards(cards);

    return NextResponse.json({ data: card }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
