// app/api/ai/weekly-review/route.ts
import { NextResponse } from "next/server";
import { readDailyNote } from "@/lib/note-store";
import { readFile, writeFile } from "@/lib/file-store";
import { generateText } from "@/lib/gemini";
import { buildWeeklyReviewPrompt } from "@/lib/prompts";
import type { DailyNoteEntry } from "@/lib/prompts";
import { getWeekDateRange, getWeekFilename, getPreviousWeekFilename, getISOWeek } from "@/lib/week";
import type { WeeklyReviewResponse, ApiResponse } from "@/types";
import { readMoods } from "@/lib/mood-store";

const DAY_LABELS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

export async function POST(): Promise<NextResponse<ApiResponse<WeeklyReviewResponse>>> {
  try {
    const now = new Date();
    const { monday, sunday } = getWeekDateRange(now);
    const { year, week } = getISOWeek(now);

    // 1. 해당 주 월~일 데일리 노트 수집
    const notes: DailyNoteEntry[] = [];
    const mondayDate = new Date(monday + "T00:00:00");

    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const content = await readDailyNote(dateStr);
      if (content.trim()) {
        notes.push({
          date: dateStr,
          day: DAY_LABELS[d.getDay()],
          content: content.trim(),
        });
      }
    }

    if (notes.length === 0) {
      return NextResponse.json(
        { error: "이번 주 작성된 데일리 노트가 없습니다." },
        { status: 400 },
      );
    }

    // 2. 직전 주 리뷰 읽기
    const prevFilename = getPreviousWeekFilename(now);
    const prevReviewPath = `weekly-review/${prevFilename}`;
    const prevReview = await readFile(prevReviewPath);
    const prevReviewContent = prevReview.trim() || null;

    // Collect week's mood data
    const allMoods = await readMoods();
    const weekMoods: { date: string; value: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (allMoods[dateStr]) weekMoods.push({ date: dateStr, value: allMoods[dateStr] });
    }

    // 3. Gemini 호출
    const prompt = buildWeeklyReviewPrompt(notes, prevReviewContent, weekMoods.length > 0 ? weekMoods : undefined);
    const insights = await generateText(prompt);

    // 4. 마크다운 파일 생성
    const header = `# ${year}년 ${week}주차 (${monday.slice(5).replace("-", "/")} ~ ${sunday.slice(5).replace("-", "/")})`;
    const content = `${header}\n\n${insights.trim()}\n`;

    // 5. 저장
    const filename = getWeekFilename(now);
    const savePath = `weekly-review/${filename}`;
    await writeFile(savePath, content);

    return NextResponse.json({
      data: { path: savePath, content },
    });
  } catch (err) {
    console.error("Weekly review error:", err);
    return NextResponse.json(
      { error: "주간 리뷰 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
