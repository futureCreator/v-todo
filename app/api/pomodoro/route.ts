import { NextRequest, NextResponse } from "next/server";
import { readPomodoroLogs, addPomodoroLog } from "@/lib/pomodoro-store";
import type { PomodoroLog, ApiResponse } from "@/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PomodoroLog[]>>> {
  try {
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const logs = await readPomodoroLogs();

    if (from && to) {
      if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
        return NextResponse.json(
          { error: "유효한 날짜를 입력해주세요. (YYYY-MM-DD)" },
          { status: 400 }
        );
      }
      const filtered = logs.filter((l) => l.date >= from && l.date <= to);
      return NextResponse.json({ data: filtered });
    }

    // Default: last 210 days (30 weeks)
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 210);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
    const filtered = logs.filter((l) => l.date >= cutoffStr);
    return NextResponse.json({ data: filtered });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PomodoroLog>>> {
  try {
    const body = await request.json();
    const { date, completedAt, duration } = body;

    if (!date || !DATE_RE.test(date)) {
      return NextResponse.json({ error: "유효한 날짜를 입력해주세요." }, { status: 400 });
    }
    if (!completedAt || typeof completedAt !== "string") {
      return NextResponse.json({ error: "완료 시각이 필요합니다." }, { status: 400 });
    }
    if (!duration || typeof duration !== "number") {
      return NextResponse.json({ error: "집중 시간이 필요합니다." }, { status: 400 });
    }

    const log: PomodoroLog = {
      id: crypto.randomUUID(),
      date,
      completedAt,
      type: "focus",
      duration,
    };

    await addPomodoroLog(log);
    return NextResponse.json({ data: log });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
