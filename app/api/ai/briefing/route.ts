import { NextResponse } from "next/server";
import { readTodos } from "@/lib/store";
import { readSchedules } from "@/lib/schedule-store";
import { readDailyNote } from "@/lib/note-store";
import { readHabits } from "@/lib/habit-store";
import { readHabitLogs } from "@/lib/habit-log-store";
import { readGratitudeByDate } from "@/lib/gratitude-store";
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

    const [todos, schedules, todayNote, yesterdayNote, habits, allLogs, yesterdayGratitude] = await Promise.all([
      readTodos(),
      readSchedules(),
      readDailyNote(todayStr),
      readDailyNote(yesterdayStr),
      readHabits(),
      readHabitLogs(),
      readGratitudeByDate(yesterdayStr),
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

    function isScheduledDay(date: Date, habit: typeof habits[number]): boolean {
      const created = new Date(habit.createdAt);
      created.setHours(0, 0, 0, 0);
      if (date < created) return false;
      if (habit.repeatMode === "daily") return true;
      if (habit.repeatMode === "weekdays") return habit.weekdays.includes(date.getDay());
      if (habit.repeatMode === "interval") {
        const diffDays = Math.floor((date.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays % habit.intervalDays === 0;
      }
      return false;
    }

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const todayHabits = habits.filter((h) => isScheduledDay(todayDate, h));

    const habitData = todayHabits.map((h) => {
      const habitLogs = new Set(
        allLogs.filter((l) => l.habitId === h.id && l.completed).map((l) => l.date)
      );
      const created = new Date(h.createdAt);
      created.setHours(0, 0, 0, 0);
      let streak = 0;
      const d = new Date(todayDate);
      d.setDate(d.getDate() - 1);
      while (d >= created) {
        if (!isScheduledDay(d, h)) { d.setDate(d.getDate() - 1); continue; }
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (habitLogs.has(ds)) { streak++; d.setDate(d.getDate() - 1); } else break;
      }
      if (isScheduledDay(todayDate, h) && habitLogs.has(todayStr)) streak++;
      return { title: h.title, streak };
    });

    const gratitudeItems = yesterdayGratitude?.items ?? [];

    const hasHabits = todayHabits.length > 0;
    const hasGratitude = gratitudeItems.some((s: string) => s.trim());
    if (incompleteTodos.length === 0 && upcomingSchedules.length === 0 && !hasNotes && !hasHabits && !hasGratitude) {
      return NextResponse.json({
        data: { briefing: "오늘은 등록된 할 일과 일정이 없습니다. 여유로운 하루 되세요!" },
      });
    }

    const prompt = buildBriefingPrompt(
      incompleteTodos,
      upcomingSchedules,
      todayNote,
      yesterdayNote,
      yesterdayStr,
      habitData.length > 0 ? habitData : undefined,
      gratitudeItems.length > 0 ? gratitudeItems : undefined,
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
