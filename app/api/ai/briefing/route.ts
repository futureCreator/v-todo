import { NextResponse } from "next/server";
import { readTodos } from "@/lib/store";
import { readSchedules } from "@/lib/schedule-store";
import { readDailyNote } from "@/lib/note-store";
import { generateText } from "@/lib/gemini";
import { buildBriefingPrompt } from "@/lib/prompts";
import type { AiBriefingResponse, ApiResponse } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<AiBriefingResponse>>> {
  try {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    const [todos, schedules, todayNote, yesterdayNote] = await Promise.all([
      readTodos(),
      readSchedules(),
      readDailyNote(todayStr),
      readDailyNote(yesterdayStr),
    ]);

    const incompleteTodos = todos.filter((t) => !t.completed);
    const upcomingSchedules = schedules.filter((s) => {
      const target = new Date(s.targetDate + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const d = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return d <= 14;
    });

    const hasNotes = todayNote.trim() || yesterdayNote.trim();
    if (incompleteTodos.length === 0 && upcomingSchedules.length === 0 && !hasNotes) {
      return NextResponse.json({
        data: { briefing: "오늘은 등록된 할 일과 일정이 없습니다. 여유로운 하루 되세요!" },
      });
    }

    const prompt = buildBriefingPrompt(incompleteTodos, upcomingSchedules, todayNote, yesterdayNote, yesterdayStr);
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
