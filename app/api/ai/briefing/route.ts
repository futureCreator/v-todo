import { NextResponse } from "next/server";
import { readTodos } from "@/lib/store";
import { readSchedules } from "@/lib/schedule-store";
import { generateText } from "@/lib/gemini";
import { buildBriefingPrompt } from "@/lib/prompts";
import type { AiBriefingResponse, ApiResponse } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<AiBriefingResponse>>> {
  try {
    const [todos, schedules] = await Promise.all([readTodos(), readSchedules()]);

    const incompleteTodos = todos.filter((t) => !t.completed);
    const upcomingSchedules = schedules.filter((s) => {
      const target = new Date(s.targetDate + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const d = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return d <= 14;
    });

    if (incompleteTodos.length === 0 && upcomingSchedules.length === 0) {
      return NextResponse.json({
        data: { briefing: "오늘은 등록된 할 일과 일정이 없습니다. 여유로운 하루 되세요!" },
      });
    }

    const prompt = buildBriefingPrompt(incompleteTodos, upcomingSchedules);
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
