import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readSchedules, writeSchedules } from "@/lib/schedule-store";
import { applyAdvance } from "@/lib/advance";
import type { CreateScheduleRequest, Schedule, ApiResponse } from "@/types";

const VALID_TYPES = ["general", "anniversary"];
const VALID_MODES = ["none", "every_100_days", "monthly", "yearly"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(): Promise<NextResponse<ApiResponse<Schedule[]>>> {
  try {
    const schedules = await readSchedules();
    const { schedules: advanced, changed } = applyAdvance(schedules);

    if (changed) {
      await writeSchedules(advanced);
    }

    return NextResponse.json({ data: advanced });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<Schedule>>> {
  try {
    const body: CreateScheduleRequest = await request.json();

    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0 || body.name.length > 100) {
      return NextResponse.json({ error: "이름은 1~100자여야 합니다." }, { status: 400 });
    }
    if (!body.targetDate || !DATE_RE.test(body.targetDate)) {
      return NextResponse.json({ error: "올바른 날짜를 입력해주세요." }, { status: 400 });
    }
    if (!body.originDate || !DATE_RE.test(body.originDate)) {
      return NextResponse.json({ error: "올바른 시작 날짜를 입력해주세요." }, { status: 400 });
    }
    if (!VALID_TYPES.includes(body.type)) {
      return NextResponse.json({ error: "올바른 일정 유형을 선택해주세요." }, { status: 400 });
    }
    if (!VALID_MODES.includes(body.repeatMode)) {
      return NextResponse.json({ error: "올바른 반복 모드를 선택해주세요." }, { status: 400 });
    }

    const schedule: Schedule = {
      id: uuidv4(),
      name: body.name.trim(),
      targetDate: body.targetDate,
      originDate: body.originDate,
      type: body.type,
      repeatMode: body.repeatMode,
      isLunar: body.isLunar === true,
      lunarMonth: body.lunarMonth ?? null,
      lunarDay: body.lunarDay ?? null,
      createdAt: new Date().toISOString(),
    };

    const schedules = await readSchedules();
    schedules.push(schedule);
    await writeSchedules(schedules);

    return NextResponse.json({ data: schedule }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
