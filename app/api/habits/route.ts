import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readHabits, writeHabits } from "@/lib/habit-store";
import type { CreateHabitRequest, Habit, ApiResponse, HabitRepeatMode } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<Habit[]>>> {
  try {
    const habits = await readHabits();
    return NextResponse.json({ data: habits });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<Habit>>> {
  try {
    const body: CreateHabitRequest = await request.json();

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
    }
    if (body.title.trim().length === 0 || body.title.length > 100) {
      return NextResponse.json({ error: "제목은 1~100자여야 합니다." }, { status: 400 });
    }

    const repeatMode: HabitRepeatMode = body.repeatMode ?? "daily";
    if (!["daily", "weekdays", "interval"].includes(repeatMode)) {
      return NextResponse.json({ error: "유효하지 않은 반복 모드입니다." }, { status: 400 });
    }

    let weekdays: number[] = [];
    let intervalDays = 2;

    if (repeatMode === "weekdays") {
      weekdays = Array.isArray(body.weekdays)
        ? body.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        : [];
      if (weekdays.length === 0) {
        return NextResponse.json({ error: "요일을 하나 이상 선택해주세요." }, { status: 400 });
      }
    } else if (repeatMode === "interval") {
      intervalDays = body.intervalDays ?? 2;
      if (!Number.isInteger(intervalDays) || intervalDays < 2 || intervalDays > 7) {
        return NextResponse.json({ error: "간격은 2~7일이어야 합니다." }, { status: 400 });
      }
    }

    const habit: Habit = {
      id: uuidv4(),
      title: body.title.trim(),
      repeatMode,
      weekdays,
      intervalDays,
      createdAt: new Date().toISOString(),
    };

    const habits = await readHabits();
    habits.push(habit);
    await writeHabits(habits);

    return NextResponse.json({ data: habit }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
