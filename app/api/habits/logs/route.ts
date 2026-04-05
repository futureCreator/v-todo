import { NextRequest, NextResponse } from "next/server";
import { readHabitLogs, writeHabitLogs } from "@/lib/habit-log-store";
import type { HabitLog, ApiResponse } from "@/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<HabitLog[]>>> {
  try {
    const date = request.nextUrl.searchParams.get("date");
    if (!date) {
      return NextResponse.json(
        { error: "유효한 날짜를 입력해주세요. (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const logs = await readHabitLogs();

    if (date === "all") {
      return NextResponse.json({ data: logs });
    }

    if (!DATE_RE.test(date)) {
      return NextResponse.json(
        { error: "유효한 날짜를 입력해주세요. (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const dayLogs = logs.filter((l) => l.date === date);
    return NextResponse.json({ data: dayLogs });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest
): Promise<NextResponse<ApiResponse<HabitLog>>> {
  try {
    const body = await request.json();
    const { habitId, date, completed } = body;

    if (!habitId || typeof habitId !== "string") {
      return NextResponse.json({ error: "습관 ID가 필요합니다." }, { status: 400 });
    }
    if (!date || !DATE_RE.test(date)) {
      return NextResponse.json({ error: "유효한 날짜를 입력해주세요." }, { status: 400 });
    }

    const logs = await readHabitLogs();
    const index = logs.findIndex((l) => l.habitId === habitId && l.date === date);

    if (completed) {
      if (index >= 0) {
        logs[index].completed = true;
      } else {
        logs.push({ habitId, date, completed: true });
      }
    } else {
      if (index >= 0) {
        logs.splice(index, 1);
      }
    }

    await writeHabitLogs(logs);
    const result: HabitLog = { habitId, date, completed: !!completed };
    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
