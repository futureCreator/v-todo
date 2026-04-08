import { NextRequest, NextResponse } from "next/server";
import { readMoods, readMoodByDate, writeMoodByDate } from "@/lib/mood-store";
import type { MoodValue, MoodMap, ApiResponse } from "@/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<MoodValue | null> | ApiResponse<MoodMap>>> {
  try {
    const date = request.nextUrl.searchParams.get("date");
    const year = request.nextUrl.searchParams.get("year");

    // Single date query
    if (date) {
      if (!DATE_RE.test(date)) {
        return NextResponse.json(
          { error: "유효한 날짜를 입력해주세요. (YYYY-MM-DD)" },
          { status: 400 }
        );
      }
      const value = await readMoodByDate(date);
      return NextResponse.json({ data: value });
    }

    // Year query — return all moods, optionally filtered by year
    const all = await readMoods();
    if (year && /^\d{4}$/.test(year)) {
      const filtered: MoodMap = {};
      for (const [k, v] of Object.entries(all)) {
        if (k.startsWith(year + "-")) filtered[k] = v as MoodValue;
      }
      return NextResponse.json({ data: filtered });
    }

    return NextResponse.json({ data: all });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  try {
    const body = await request.json();
    const date = body.date;
    const value = body.value;

    if (typeof date !== "string" || !DATE_RE.test(date)) {
      return NextResponse.json(
        { error: "유효한 날짜를 입력해주세요. (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    if (typeof value !== "number" || value < 1 || value > 5) {
      return NextResponse.json(
        { error: "value는 1~5 사이의 정수여야 합니다." },
        { status: 400 }
      );
    }

    await writeMoodByDate(date, value as MoodValue);
    return NextResponse.json({ data: { ok: true } });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
