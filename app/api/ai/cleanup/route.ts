import { NextResponse } from "next/server";
import { readTodos } from "@/lib/store";
import { generateJson } from "@/lib/gemini";
import { buildCleanupPrompt } from "@/lib/prompts";
import type { AiCleanupRequest, AiCleanupResponse, ApiResponse, Quadrant } from "@/types";

const VALID_QUADRANTS: Quadrant[] = [
  "urgent-important", "urgent-not-important",
  "not-urgent-important", "not-urgent-not-important",
];

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<AiCleanupResponse>>> {
  try {
    const body: AiCleanupRequest = await request.json();

    if (!VALID_QUADRANTS.includes(body.quadrant)) {
      return NextResponse.json({ error: "올바른 분면을 선택해주세요." }, { status: 400 });
    }

    const todos = await readTodos();
    const quadrantTodos = todos.filter(
      (t) => t.quadrant === body.quadrant && !t.completed
    );

    if (quadrantTodos.length === 0) {
      return NextResponse.json({ data: { changes: [] } });
    }

    const prompt = buildCleanupPrompt(quadrantTodos);
    const changes = await generateJson<AiCleanupResponse["changes"]>(prompt);

    return NextResponse.json({ data: { changes } });
  } catch (err) {
    console.error("AI cleanup error:", err);
    return NextResponse.json(
      { error: "AI 서비스를 사용할 수 없습니다." },
      { status: 500 }
    );
  }
}
