import { NextResponse } from "next/server";
import { readTodos } from "@/lib/store";
import { generateJson } from "@/lib/gemini";
import { buildSuggestPrompt } from "@/lib/prompts";
import type { AiSuggestRequest, AiSuggestResponse, ApiResponse, Quadrant } from "@/types";

const VALID_QUADRANTS: Quadrant[] = [
  "urgent-important", "urgent-not-important",
  "not-urgent-important", "not-urgent-not-important",
];

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<AiSuggestResponse>>> {
  try {
    const body: AiSuggestRequest = await request.json();

    if (!VALID_QUADRANTS.includes(body.quadrant)) {
      return NextResponse.json({ error: "올바른 분면을 선택해주세요." }, { status: 400 });
    }

    const todos = await readTodos();
    const quadrantTodos = todos.filter(
      (t) => t.quadrant === body.quadrant && !t.completed
    );
    const prompt = buildSuggestPrompt(body.quadrant, quadrantTodos);
    const suggestions = await generateJson<AiSuggestResponse["suggestions"]>(prompt);

    return NextResponse.json({ data: { suggestions } });
  } catch (err) {
    console.error("AI suggest error:", err);
    return NextResponse.json(
      { error: "AI 서비스를 사용할 수 없습니다." },
      { status: 500 }
    );
  }
}
