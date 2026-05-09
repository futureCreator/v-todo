import { NextResponse } from "next/server";
import { readSchedules, writeSchedules } from "@/lib/schedule-store";
import type { UpdateScheduleRequest, Schedule, ApiResponse } from "@/types";

const VALID_TYPES = ["general", "anniversary"];
const VALID_MODES = ["none", "every_100_days", "monthly", "yearly"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Schedule>>> {
  try {
    const [{ id }, body, schedules] = await Promise.all([
      params,
      request.json() as Promise<UpdateScheduleRequest>,
      readSchedules(),
    ]);
    const index = schedules.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
    }

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0 || body.name.length > 100) {
        return NextResponse.json({ error: "이름은 1~100자여야 합니다." }, { status: 400 });
      }
      schedules[index].name = body.name.trim();
    }
    if (body.targetDate !== undefined) {
      if (!DATE_RE.test(body.targetDate)) {
        return NextResponse.json({ error: "올바른 날짜를 입력해주세요." }, { status: 400 });
      }
      schedules[index].targetDate = body.targetDate;
    }
    if (body.originDate !== undefined) {
      if (!DATE_RE.test(body.originDate)) {
        return NextResponse.json({ error: "올바른 시작 날짜를 입력해주세요." }, { status: 400 });
      }
      schedules[index].originDate = body.originDate;
    }
    if (body.type !== undefined) {
      if (!VALID_TYPES.includes(body.type)) {
        return NextResponse.json({ error: "올바른 일정 유형을 선택해주세요." }, { status: 400 });
      }
      schedules[index].type = body.type;
    }
    if (body.repeatMode !== undefined) {
      if (!VALID_MODES.includes(body.repeatMode)) {
        return NextResponse.json({ error: "올바른 반복 모드를 선택해주세요." }, { status: 400 });
      }
      schedules[index].repeatMode = body.repeatMode;
    }
    if (body.isLunar !== undefined) schedules[index].isLunar = body.isLunar;
    if (body.lunarMonth !== undefined) schedules[index].lunarMonth = body.lunarMonth;
    if (body.lunarDay !== undefined) schedules[index].lunarDay = body.lunarDay;

    await writeSchedules(schedules);
    return NextResponse.json({ data: schedules[index] });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const [{ id }, schedules] = await Promise.all([params, readSchedules()]);
    const index = schedules.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
    }

    schedules.splice(index, 1);
    await writeSchedules(schedules);
    return NextResponse.json({ data: null });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
