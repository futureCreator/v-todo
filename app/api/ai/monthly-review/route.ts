import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { DATA_DIR, readTodos } from "@/lib/store";
import { readMoods } from "@/lib/mood-store";
import { generateText } from "@/lib/gemini";
import {
  buildMonthlyReviewPrompt,
  type MonthlyReviewInput,
  type MonthlyReviewDay,
  type MonthlyReviewCompletedTodo,
  type MonthlyReviewCompletedWish,
} from "@/lib/prompts";
import {
  readMonthlyReviewCache,
  writeMonthlyReviewCache,
} from "@/lib/monthly-review-store";
import type { ApiResponse } from "@/types";
import { STAGE_LABELS } from "@/types";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const CATEGORY_LABELS: Record<string, string> = {
  healing: "힐링",
  item: "물건",
  experience: "경험",
};
const DAILY_NOTES_DIR = path.join(DATA_DIR, "daily-notes");
const GRATITUDE_PATH = path.join(DATA_DIR, "gratitude.json");

interface MonthlyReviewResponseBody {
  date: string;
  content: string;
  generatedAt: string;
}

function todayKST(): string {
  const now = new Date();
  return formatDate(now);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

async function readNoteSafe(date: string): Promise<string | null> {
  try {
    const content = await fs.readFile(
      path.join(DAILY_NOTES_DIR, `${date}.md`),
      "utf-8",
    );
    return content.trim() ? content : null;
  } catch {
    return null;
  }
}

interface GratitudeEntryRaw {
  date: string;
  items: string[];
}

async function readGratitudeMap(): Promise<Record<string, string[]>> {
  try {
    const raw = await fs.readFile(GRATITUDE_PATH, "utf-8");
    const parsed: { entries?: GratitudeEntryRaw[] } = JSON.parse(raw);
    const map: Record<string, string[]> = {};
    for (const e of parsed.entries ?? []) {
      map[e.date] = (e.items ?? []).filter((s) => typeof s === "string");
    }
    return map;
  } catch {
    return {};
  }
}

interface WishRaw {
  category?: string;
  title: string;
  completedAt: string | null;
  satisfaction: number | null;
  review: string | null;
}

async function readCompletedWishes(
  rangeStart: string,
  today: string,
): Promise<MonthlyReviewCompletedWish[]> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, "wishes.json"), "utf-8");
    const parsed: { wishes?: WishRaw[] } = JSON.parse(raw);
    return (parsed.wishes ?? [])
      .filter((w) => w.completedAt)
      .map((w) => ({
        date: w.completedAt!.slice(0, 10),
        title: w.title,
        category: CATEGORY_LABELS[w.category ?? ""] ?? w.category ?? "",
        satisfaction: w.satisfaction,
        review: w.review,
      }))
      .filter((w) => w.date >= rangeStart && w.date <= today)
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export async function GET(req: Request): Promise<NextResponse<ApiResponse<MonthlyReviewResponseBody>>> {
  try {
    const url = new URL(req.url);
    const refresh = url.searchParams.get("refresh") === "1";
    const today = todayKST();

    if (!refresh) {
      const cache = await readMonthlyReviewCache();
      if (cache && cache.date === today) {
        return NextResponse.json({ data: cache });
      }
    }

    const rangeStart = formatDate(addDays(new Date(), -29));

    const [moods, gratitudeMap, todos, completedWishes] = await Promise.all([
      readMoods(),
      readGratitudeMap(),
      readTodos(),
      readCompletedWishes(rangeStart, today),
    ]);

    const days: MonthlyReviewDay[] = [];
    for (let i = 0; i < 30; i++) {
      const d = addDays(new Date(), -i);
      const date = formatDate(d);
      const note = await readNoteSafe(date);
      const gratitude = (gratitudeMap[date] ?? []).filter((g) => g.trim());
      const mood = (moods[date] as number | undefined) ?? null;
      days.push({
        date,
        weekday: WEEKDAY_LABELS[d.getDay()],
        mood,
        gratitude,
        note,
      });
    }

    const completedTodos: MonthlyReviewCompletedTodo[] = todos
      .filter((t) => t.completedAt)
      .map((t) => ({
        date: t.completedAt!.slice(0, 10),
        title: t.title,
        stage: STAGE_LABELS[t.stage],
      }))
      .filter((t) => t.date >= rangeStart && t.date <= today)
      .sort((a, b) => b.date.localeCompare(a.date));

    const input: MonthlyReviewInput = {
      today,
      rangeStart,
      days,
      completedTodos,
      completedWishes,
    };

    const hasAnyData =
      days.some((d) => d.mood !== null || d.gratitude.length > 0 || d.note) ||
      completedTodos.length > 0 ||
      completedWishes.length > 0;

    if (!hasAnyData) {
      const empty: MonthlyReviewResponseBody = {
        date: today,
        content: "아직 회고할 만한 기록이 충분히 쌓이지 않았어요. 며칠 더 사용한 뒤 다시 눌러주세요.",
        generatedAt: new Date().toISOString(),
      };
      await writeMonthlyReviewCache(empty);
      return NextResponse.json({ data: empty });
    }

    const prompt = buildMonthlyReviewPrompt(input);
    const content = await generateText(prompt);

    const result: MonthlyReviewResponseBody = {
      date: today,
      content: content.trim(),
      generatedAt: new Date().toISOString(),
    };
    await writeMonthlyReviewCache(result);
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("Monthly review error:", err);
    return NextResponse.json(
      { error: "AI 서비스를 사용할 수 없습니다." },
      { status: 500 }
    );
  }
}
