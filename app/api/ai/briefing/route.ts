import { NextResponse } from "next/server";
import { readTodos } from "@/lib/store";
import { generateText } from "@/lib/gemini";
import { buildBriefingPrompt } from "@/lib/prompts";
import type { AiBriefingResponse, ApiResponse } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<AiBriefingResponse>>> {
  try {
    const todos = await readTodos();
    const incompleteTodos = todos.filter((t) => !t.completed);

    if (incompleteTodos.length === 0) {
      return NextResponse.json({
        data: { briefing: "오늘은 등록된 할 일이 없습니다. 여유로운 하루 되세요!" },
      });
    }

    const prompt = buildBriefingPrompt(incompleteTodos);
    const briefing = await generateText(prompt);

    return NextResponse.json({ data: { briefing } });
  } catch (err) {
    console.error("AI briefing error:", err);
    return NextResponse.json(
      { error: "AI 서비스를 사용할 수 없습니다." },
      { status: 500 }
    );
  }
}
