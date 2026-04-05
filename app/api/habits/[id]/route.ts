import { NextResponse } from "next/server";
import { readHabits, writeHabits } from "@/lib/habit-store";
import { readHabitLogs, writeHabitLogs } from "@/lib/habit-log-store";
import type { UpdateHabitRequest, Habit, ApiResponse } from "@/types";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Habit>>> {
  try {
    const { id } = await params;
    const body: UpdateHabitRequest = await request.json();
    const habits = await readHabits();
    const index = habits.findIndex((h) => h.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "습관을 찾을 수 없습니다." }, { status: 404 });
    }

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim().length === 0 || body.title.length > 100) {
        return NextResponse.json({ error: "제목은 1~100자여야 합니다." }, { status: 400 });
      }
      habits[index].title = body.title.trim();
    }

    if (body.repeatMode !== undefined) {
      if (!["daily", "weekdays", "interval"].includes(body.repeatMode)) {
        return NextResponse.json({ error: "유효하지 않은 반복 모드입니다." }, { status: 400 });
      }
      habits[index].repeatMode = body.repeatMode;
    }

    if (body.weekdays !== undefined) {
      habits[index].weekdays = Array.isArray(body.weekdays)
        ? body.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        : [];
    }

    if (body.intervalDays !== undefined) {
      if (Number.isInteger(body.intervalDays) && body.intervalDays >= 2 && body.intervalDays <= 7) {
        habits[index].intervalDays = body.intervalDays;
      }
    }

    await writeHabits(habits);
    return NextResponse.json({ data: habits[index] });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params;
    const habits = await readHabits();
    const index = habits.findIndex((h) => h.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "습관을 찾을 수 없습니다." }, { status: 404 });
    }

    habits.splice(index, 1);
    await writeHabits(habits);

    // Also clean up logs for this habit
    const logs = await readHabitLogs();
    const filtered = logs.filter((l) => l.habitId !== id);
    if (filtered.length !== logs.length) {
      await writeHabitLogs(filtered);
    }

    return NextResponse.json({ data: null });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
