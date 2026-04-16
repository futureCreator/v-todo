import { NextRequest, NextResponse } from "next/server";
import { readGratitudeByDate, writeGratitudeByDate } from "@/lib/gratitude-store";
import type { GratitudeEntry, ApiResponse } from "@/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<GratitudeEntry | null>>> {
  try {
    const date = request.nextUrl.searchParams.get("date");
    if (!date || !DATE_RE.test(date)) {
      return NextResponse.json(
        { error: "유효한 날짜를 입력해주세요. (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    const entry = await readGratitudeByDate(date);
    return NextResponse.json({ data: entry });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest
): Promise<NextResponse<ApiResponse<GratitudeEntry>>> {
  try {
    const date = request.nextUrl.searchParams.get("date");
    if (!date || !DATE_RE.test(date)) {
      return NextResponse.json(
        { error: "유효한 날짜를 입력해주세요. (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];

    const sanitized: [string, string, string, string, string] = [
      typeof items[0] === "string" ? items[0].slice(0, 200) : "",
      typeof items[1] === "string" ? items[1].slice(0, 200) : "",
      typeof items[2] === "string" ? items[2].slice(0, 200) : "",
      typeof items[3] === "string" ? items[3].slice(0, 200) : "",
      typeof items[4] === "string" ? items[4].slice(0, 200) : "",
    ];

    const entry = await writeGratitudeByDate(date, sanitized);
    return NextResponse.json({ data: entry });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
