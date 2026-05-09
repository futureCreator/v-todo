import { NextResponse } from "next/server";
import { readTodos } from "@/lib/store";
import { readSchedules } from "@/lib/schedule-store";
import { readDailyNote } from "@/lib/note-store";
import { readGratitudeByDate } from "@/lib/gratitude-store";
import { readMoods } from "@/lib/mood-store";
import { generateText } from "@/lib/gemini";
import { buildBriefingPrompt } from "@/lib/prompts";
import type { AiBriefingResponse, ApiResponse } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<AiBriefingResponse>>> {
  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    const [todos, schedules, todayNote, yesterdayNote, yesterdayGratitude, allMoods] = await Promise.all([
      readTodos(),
      readSchedules(),
      readDailyNote(todayStr),
      readDailyNote(yesterdayStr),
      readGratitudeByDate(yesterdayStr),
      readMoods(),
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
    const gratitudeItems = yesterdayGratitude?.items ?? [];
    const hasGratitude = gratitudeItems.some((s: string) => s.trim());

    if (incompleteTodos.length === 0 && upcomingSchedules.length === 0 && !hasNotes && !hasGratitude) {
      return NextResponse.json({
        data: { briefing: "오늘은 등록된 할 일과 일정이 없습니다. 여유로운 하루 되세요!" },
      });
    }

    const recentMoods: { date: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (allMoods[ds]) recentMoods.push({ date: ds, value: allMoods[ds] });
    }

    const prompt = buildBriefingPrompt(
      incompleteTodos,
      upcomingSchedules,
      todayNote,
      yesterdayNote,
      yesterdayStr,
      gratitudeItems.length > 0 ? gratitudeItems : undefined,
      recentMoods.length > 0 ? recentMoods : undefined,
    );
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
