# 체크인 회상 & 월간 회고 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 체크인 화면에 (1) 매일 떠있는 "이 날" 타임캡슐 카드, (2) 지난 30일을 AI가 서술하는 "이 달 회고" 모달을 추가한다. 망가진 weekly review는 정리한다.

**Architecture:** 두 신규 컴포넌트(`TimeCapsuleCard`, `MonthlyReviewModal`)를 `CheckinView` 하단 영역에 삽입한다. TimeCapsuleCard는 기존 API들(`/api/moods`, `/api/gratitude`, `/api/notes/files`)을 클라이언트에서 조합한다. MonthlyReviewModal은 신규 `GET /api/ai/monthly-review`를 호출하고, 결과는 `data/monthly-review.json`에 오늘 날짜 키로 캐싱한다 — 같은 날 재호출은 캐시, `?refresh=1`로 강제 재생성.

**Tech Stack:** Next.js (App Router) · TypeScript · React 19 · Tailwind v4 · Gemini (`gemini-3.1-flash-lite`) · vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-05-14-checkin-recall-and-monthly-review-design.md`

---

## 파일 구조

```
신규
  app/api/ai/monthly-review/route.ts
  lib/monthly-review-store.ts
  lib/__tests__/monthly-review-store.test.ts
  components/TimeCapsuleCard.tsx
  components/MonthlyReviewModal.tsx
  components/__tests__/TimeCapsuleCard.test.tsx

수정
  components/CheckinView.tsx        TimeCapsuleCard + MonthlyReviewModal 삽입, 버튼 split
  lib/prompts.ts                    buildMonthlyReviewPrompt 추가
  lib/__tests__/prompts.test.ts     buildMonthlyReviewPrompt 케이스 추가
  types/index.ts                    WeeklyReviewResponse 제거

삭제
  app/api/ai/weekly-review/route.ts
  app/api/ai/weekly-review/        (빈 디렉토리)

자동 생성 (런타임)
  data/monthly-review.json
```

---

## Task 1: weekly review 제거 + 회귀 테스트

**Files:**
- Delete: `app/api/ai/weekly-review/route.ts`
- Modify: `lib/prompts.ts` (`buildWeeklyReviewPrompt`, `DailyNoteEntry` 제거)
- Modify: `types/index.ts` (`WeeklyReviewResponse` 제거)
- Modify: `lib/__tests__/prompts.test.ts` (weekly review describe 블록 제거)

- [ ] **Step 1: 추가 진입점이 없는지 확인**

Run:
```bash
grep -rl "weekly-review\|weeklyReview\|WeeklyReview\|buildWeeklyReviewPrompt\|DailyNoteEntry" --include="*.ts" --include="*.tsx" app components lib types
```

Expected: 출력 4줄
```
app/api/ai/weekly-review/route.ts
lib/prompts.ts
lib/__tests__/prompts.test.ts
types/index.ts
```

(다른 파일이 더 나오면, 그 파일에서 weekly review 참조를 제거하는 단계를 본 Task 안에서 같이 처리한다. UI 진입점이라면 해당 버튼/모달도 같이 삭제.)

- [ ] **Step 2: weekly-review API 라우트 삭제**

Run:
```bash
rm -rf app/api/ai/weekly-review
```

- [ ] **Step 3: `types/index.ts`에서 `WeeklyReviewResponse` 제거**

`types/index.ts`에서 다음 블록 삭제:

```ts
export interface WeeklyReviewResponse {
  path: string;
  content: string;
}
```

- [ ] **Step 4: `lib/prompts.ts`에서 weekly review 부분 제거**

`lib/prompts.ts` 하단의 `DailyNoteEntry` 인터페이스와 `buildWeeklyReviewPrompt` 함수 전체(line 95~131)를 삭제. `buildBriefingPrompt`만 남긴다.

- [ ] **Step 5: `lib/__tests__/prompts.test.ts`에서 weekly review describe 제거**

다음 두 부분 삭제:
- 상단 import: `import { buildWeeklyReviewPrompt } from "../prompts";`
- 하단 `describe("buildWeeklyReviewPrompt", ...)` 블록 전체

- [ ] **Step 6: 타입 체크 & 테스트**

Run:
```bash
npx tsc --noEmit && npx vitest run lib/__tests__/prompts.test.ts
```

Expected: tsc 통과, 3개 테스트 통과 (buildBriefingPrompt만).

- [ ] **Step 7: 커밋**

```bash
git add app/api/ai types/index.ts lib/prompts.ts lib/__tests__/prompts.test.ts
git commit -m "chore: remove broken weekly review

기능이 망가져 있어 정리. 월간 회고로 대체 예정."
```

---

## Task 2: `monthly-review-store.ts` (TDD)

캐시 파일 read/write 헬퍼.

**Files:**
- Create: `lib/__tests__/monthly-review-store.test.ts`
- Create: `lib/monthly-review-store.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/__tests__/monthly-review-store.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "fs/promises";
import path from "path";

const TEST_DIR = path.join(process.cwd(), ".test-data", "monthly-review-store");
process.env.DATA_DIR = TEST_DIR;

// dynamic import after env var set
const { readMonthlyReviewCache, writeMonthlyReviewCache } = await import("../monthly-review-store");

const CACHE_PATH = path.join(TEST_DIR, "monthly-review.json");

async function reset() {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_DIR, { recursive: true });
}

describe("monthly-review-store", () => {
  beforeEach(reset);
  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  it("returns null when cache file does not exist", async () => {
    expect(await readMonthlyReviewCache()).toBeNull();
  });

  it("round-trips written cache", async () => {
    await writeMonthlyReviewCache({
      date: "2026-05-14",
      content: "### 관찰\n\n내용",
      generatedAt: "2026-05-14T09:12:00+09:00",
    });
    const cache = await readMonthlyReviewCache();
    expect(cache).toEqual({
      date: "2026-05-14",
      content: "### 관찰\n\n내용",
      generatedAt: "2026-05-14T09:12:00+09:00",
    });
  });

  it("returns null when cache JSON is corrupted", async () => {
    await fs.writeFile(CACHE_PATH, "{ this is not json");
    expect(await readMonthlyReviewCache()).toBeNull();
  });

  it("returns null when cache is missing required fields", async () => {
    await fs.writeFile(CACHE_PATH, JSON.stringify({ foo: "bar" }));
    expect(await readMonthlyReviewCache()).toBeNull();
  });

  it("overwrites existing cache atomically", async () => {
    await writeMonthlyReviewCache({
      date: "2026-05-13",
      content: "old",
      generatedAt: "2026-05-13T00:00:00+09:00",
    });
    await writeMonthlyReviewCache({
      date: "2026-05-14",
      content: "new",
      generatedAt: "2026-05-14T00:00:00+09:00",
    });
    const cache = await readMonthlyReviewCache();
    expect(cache?.date).toBe("2026-05-14");
    expect(cache?.content).toBe("new");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
npx vitest run lib/__tests__/monthly-review-store.test.ts
```

Expected: FAIL — `Cannot find module '../monthly-review-store'`

- [ ] **Step 3: 구현 작성**

`lib/monthly-review-store.ts`:

```ts
import fs from "fs/promises";
import path from "path";
import { DATA_DIR } from "@/lib/store";

const CACHE_PATH = path.join(DATA_DIR, "monthly-review.json");
const TMP_PATH = path.join(DATA_DIR, "monthly-review.tmp.json");

export interface MonthlyReviewCache {
  date: string;
  content: string;
  generatedAt: string;
}

function isCache(value: unknown): value is MonthlyReviewCache {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.date === "string" &&
    typeof v.content === "string" &&
    typeof v.generatedAt === "string"
  );
}

export async function readMonthlyReviewCache(): Promise<MonthlyReviewCache | null> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return isCache(parsed) ? parsed : null;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    return null;
  }
}

export async function writeMonthlyReviewCache(
  cache: MonthlyReviewCache
): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(cache, null, 2));
  await fs.rename(TMP_PATH, CACHE_PATH);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
npx vitest run lib/__tests__/monthly-review-store.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: 커밋**

```bash
git add lib/monthly-review-store.ts lib/__tests__/monthly-review-store.test.ts
git commit -m "feat: add monthly-review-store with safe cache read/write"
```

---

## Task 3: `buildMonthlyReviewPrompt` (TDD)

30일 데이터 → 구조화된 프롬프트.

**Files:**
- Modify: `lib/__tests__/prompts.test.ts`
- Modify: `lib/prompts.ts`

- [ ] **Step 1: 입력 타입과 테스트 먼저**

`lib/__tests__/prompts.test.ts` 하단에 추가:

```ts
import { buildMonthlyReviewPrompt } from "../prompts";
import type { MonthlyReviewInput } from "../prompts";

describe("buildMonthlyReviewPrompt", () => {
  const fullInput: MonthlyReviewInput = {
    today: "2026-05-14",
    rangeStart: "2026-04-15",
    days: [
      {
        date: "2026-05-14",
        weekday: "목",
        mood: 4,
        gratitude: ["아침 산책", "점심 맛있었음"],
        note: "오늘은 집중 잘 됨",
      },
      {
        date: "2026-05-13",
        weekday: "수",
        mood: 2,
        gratitude: [],
        note: null,
      },
    ],
    completedTodos: [
      { date: "2026-05-12", title: "프로젝트 마감", stage: "지금" },
    ],
    completedWishes: [
      {
        date: "2026-05-10",
        title: "등산",
        category: "경험",
        satisfaction: 5,
        review: "좋았음",
      },
    ],
  };

  it("includes header with today and range", () => {
    const prompt = buildMonthlyReviewPrompt(fullInput);
    expect(prompt).toContain("오늘 날짜: 2026-05-14");
    expect(prompt).toContain("2026-04-15 ~ 2026-05-14");
  });

  it("renders day sections with mood emoji and gratitude list", () => {
    const prompt = buildMonthlyReviewPrompt(fullInput);
    expect(prompt).toContain("### 2026-05-14 (목)");
    expect(prompt).toContain("mood: 4 😊");
    expect(prompt).toContain("1. 아침 산책");
    expect(prompt).toContain("2. 점심 맛있었음");
    expect(prompt).toContain("note: 오늘은 집중 잘 됨");
  });

  it("omits dimensions that are empty for a given day", () => {
    const prompt = buildMonthlyReviewPrompt(fullInput);
    const day13 = prompt.split("### 2026-05-13")[1]?.split("### ")[0] ?? "";
    expect(day13).toContain("mood: 2 😔");
    expect(day13).not.toContain("gratitude:");
    expect(day13).not.toContain("note:");
  });

  it("truncates notes longer than 3000 chars and marks cut", () => {
    const long = "가".repeat(3500);
    const input: MonthlyReviewInput = {
      ...fullInput,
      days: [{ date: "2026-05-14", weekday: "목", mood: null, gratitude: [], note: long }],
    };
    const prompt = buildMonthlyReviewPrompt(input);
    expect(prompt).toContain("... (잘림)");
    const noteLine = prompt.split("note: ")[1] ?? "";
    expect(noteLine.length).toBeLessThan(3100);
  });

  it("lists completed todos and wishes when present", () => {
    const prompt = buildMonthlyReviewPrompt(fullInput);
    expect(prompt).toContain("## 30일 내 todo 완료");
    expect(prompt).toContain("2026-05-12 · [지금] 프로젝트 마감");
    expect(prompt).toContain("## 30일 내 wish 완료");
    expect(prompt).toContain("2026-05-10 · [경험] 등산 · 만족도 5/5");
    expect(prompt).toContain("리뷰: 좋았음");
  });

  it("omits todo/wish sections when those lists are empty", () => {
    const prompt = buildMonthlyReviewPrompt({
      ...fullInput,
      completedTodos: [],
      completedWishes: [],
    });
    expect(prompt).not.toContain("## 30일 내 todo 완료");
    expect(prompt).not.toContain("## 30일 내 wish 완료");
  });

  it("omits a day section entirely when all dimensions are empty", () => {
    const prompt = buildMonthlyReviewPrompt({
      ...fullInput,
      days: [
        ...fullInput.days,
        { date: "2026-05-12", weekday: "월", mood: null, gratitude: [], note: null },
      ],
    });
    expect(prompt).not.toContain("### 2026-05-12");
  });

  it("includes the system rules and data day count", () => {
    const prompt = buildMonthlyReviewPrompt({
      ...fullInput,
      days: fullInput.days.slice(0, 1),
    });
    expect(prompt).toContain("데이터 일수: 1일");
    expect(prompt).toContain("거울처럼");
    expect(prompt).toContain("존댓말");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
npx vitest run lib/__tests__/prompts.test.ts
```

Expected: FAIL — `buildMonthlyReviewPrompt` not exported.

- [ ] **Step 3: 구현 작성**

`lib/prompts.ts` 하단에 추가 (기존 `buildBriefingPrompt`는 그대로 두고):

```ts
export interface MonthlyReviewDay {
  date: string;        // YYYY-MM-DD
  weekday: string;     // 월/화/수/...
  mood: number | null; // 1~5
  gratitude: string[]; // 빈 문자열은 호출자가 미리 제거
  note: string | null; // null이면 미작성
}

export interface MonthlyReviewCompletedTodo {
  date: string;
  title: string;
  stage: string; // "지금" | "곧" | "보관함"
}

export interface MonthlyReviewCompletedWish {
  date: string;
  title: string;
  category: string;          // "힐링" | "물건" | "경험"
  satisfaction: number | null;
  review: string | null;
}

export interface MonthlyReviewInput {
  today: string;     // YYYY-MM-DD
  rangeStart: string; // YYYY-MM-DD (today - 29일)
  days: MonthlyReviewDay[]; // 최근 → 과거 정렬된 상태로 호출자가 전달
  completedTodos: MonthlyReviewCompletedTodo[];
  completedWishes: MonthlyReviewCompletedWish[];
}

const MOOD_EMOJI: Record<number, string> = {
  1: "😢", 2: "😔", 3: "😐", 4: "😊", 5: "😄",
};

const NOTE_MAX_CHARS = 3000;

function renderDay(day: MonthlyReviewDay): string | null {
  const lines: string[] = [];
  if (day.mood !== null) {
    lines.push(`- mood: ${day.mood} ${MOOD_EMOJI[day.mood] ?? ""}`.trim());
  }
  const gratitude = day.gratitude.filter((g) => g.trim());
  if (gratitude.length > 0) {
    lines.push("- gratitude:");
    gratitude.forEach((g, i) => lines.push(`  ${i + 1}. ${g}`));
  }
  if (day.note && day.note.trim()) {
    const note = day.note.length > NOTE_MAX_CHARS
      ? day.note.slice(0, NOTE_MAX_CHARS) + "\n... (잘림)"
      : day.note;
    lines.push(`- note: ${note}`);
  }
  if (lines.length === 0) return null;
  return `### ${day.date} (${day.weekday})\n${lines.join("\n")}`;
}

const SYSTEM_RULES = `당신은 사용자의 데이터를 30일 단위로 돌아보는 회고 파트너입니다.
아래 30일치 기록에서 사용자가 스스로 보지 못하는 패턴을 짚어주세요.

규칙:
- 짧은 문단 3~5개로 구성. 각 문단은 ### 헤딩으로 시작.
- 인사, 결론, 총평 금지.
- 각 문단은 "관찰 → 근거 1~2개(날짜 인용) → 짧은 시사" 흐름.
- 다음 차원에서 골고루: mood 추이/주기, 감사 일기에서 반복되는 사람·주제, 노트의 반복 키워드나 감정 변화, 행동(todo/wish 완료)과 mood의 관계.
- 사람 이름이 등장하면 익명화하지 말고 그대로 인용하세요.
- 평가·훈수·격려 금지. 본인이 쓴 내용을 거울처럼 비추기.
- "당신은 ~한 사람" 같은 단정 라벨링 금지.
- 데이터가 너무 적은 차원은 다루지 않고, 억지로 채우지 않음.
- 한국어 존댓말.`;

export function buildMonthlyReviewPrompt(input: MonthlyReviewInput): string {
  const dayCount = input.days.filter(
    (d) => d.mood !== null || d.gratitude.some((g) => g.trim()) || (d.note && d.note.trim())
  ).length;

  const dayBlocks = input.days
    .map(renderDay)
    .filter((s): s is string => s !== null);

  const sections: string[] = [
    `오늘 날짜: ${input.today}`,
    `데이터 일수: ${dayCount}일 (${input.rangeStart} ~ ${input.today})`,
  ];

  if (dayBlocks.length > 0) {
    sections.push(`## 일자별 (최근 → 과거)\n\n${dayBlocks.join("\n\n")}`);
  }

  if (input.completedTodos.length > 0) {
    const todoLines = input.completedTodos
      .map((t) => `- ${t.date} · [${t.stage}] ${t.title}`)
      .join("\n");
    sections.push(`## 30일 내 todo 완료\n${todoLines}`);
  }

  if (input.completedWishes.length > 0) {
    const wishLines = input.completedWishes
      .map((w) => {
        const sat = w.satisfaction !== null ? ` · 만족도 ${w.satisfaction}/5` : "";
        const review = w.review && w.review.trim() ? `\n  리뷰: ${w.review.trim()}` : "";
        return `- ${w.date} · [${w.category}] ${w.title}${sat}${review}`;
      })
      .join("\n");
    sections.push(`## 30일 내 wish 완료\n${wishLines}`);
  }

  return `${SYSTEM_RULES}\n\n${sections.join("\n\n")}\n`;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
npx vitest run lib/__tests__/prompts.test.ts
```

Expected: 모든 케이스 PASS (기존 3 + 신규 8).

- [ ] **Step 5: 커밋**

```bash
git add lib/prompts.ts lib/__tests__/prompts.test.ts
git commit -m "feat: add buildMonthlyReviewPrompt for 30-day reflection"
```

---

## Task 4: `GET /api/ai/monthly-review`

캐시 hit/miss와 강제 재생성.

**Files:**
- Create: `app/api/ai/monthly-review/route.ts`

- [ ] **Step 1: 라우트 작성**

`app/api/ai/monthly-review/route.ts`:

```ts
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

    // collect 30 day rows
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
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: 타입 체크**

Run:
```bash
npx tsc --noEmit
```

Expected: 통과.

- [ ] **Step 3: 빌드 사전 점검 (정적 분석만)**

Run:
```bash
npx eslint app/api/ai/monthly-review/route.ts
```

Expected: 통과 (또는 경고만, 에러 없음). 에러가 있으면 그 라인을 수정.

- [ ] **Step 4: 라우트 수동 동작 점검 (선택)**

PM2가 동작 중인지 확인하고, 만약 dev 서버를 띄울 수 있는 환경이라면:

```bash
# 다른 터미널에서 dev 서버가 떠 있다는 가정 — 없으면 이 단계 skip
curl -s http://localhost:3000/api/ai/monthly-review | head -c 400
```

Expected: `{"data":{"date":"YYYY-MM-DD","content":"...","generatedAt":"..."}}` 형태. 없으면 Task 8의 통합 점검에서 확인.

- [ ] **Step 5: 커밋**

```bash
git add app/api/ai/monthly-review/route.ts
git commit -m "feat: add monthly review API with today-keyed cache"
```

---

## Task 5: `TimeCapsuleCard` 컴포넌트 (TDD)

같은 MM-DD 과거 5년치를 클라이언트에서 합성.

**Files:**
- Create: `components/__tests__/TimeCapsuleCard.test.tsx`
- Create: `components/TimeCapsuleCard.tsx`

- [ ] **Step 1: 컴포넌트 테스트 작성**

`components/__tests__/TimeCapsuleCard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TimeCapsuleCard from "../TimeCapsuleCard";

type FetchResp = { ok: boolean; json: () => Promise<unknown>; text: () => Promise<string> };

function mockJson(payload: unknown): FetchResp {
  return {
    ok: true,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

function mockNote(text: string): FetchResp {
  return {
    ok: true,
    json: async () => ({ data: text }),
    text: async () => text,
  };
}

function mockFailure(): FetchResp {
  return {
    ok: false,
    json: async () => ({ error: "x" }),
    text: async () => "",
  };
}

const ORIGINAL_FETCH = global.fetch;

function installFetch(routes: Record<string, FetchResp>) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    for (const key of Object.keys(routes)) {
      if (url.includes(key)) return routes[key] as unknown as Response;
    }
    return mockFailure() as unknown as Response;
  }) as unknown as typeof fetch;
}

describe("TimeCapsuleCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T09:00:00+09:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
    global.fetch = ORIGINAL_FETCH;
  });

  it("renders nothing when no past entries match today's MM-DD", async () => {
    installFetch({
      "/api/moods": mockJson({ data: { "2024-01-01": 4 } }),
      "/api/gratitude": mockJson({ data: null }),
      "/api/notes/daily": mockJson({ data: "" }),
    });
    const { container } = render(<TimeCapsuleCard onSelectDate={() => {}} />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("lists past years for same MM-DD in recent→old order with mood emoji", async () => {
    installFetch({
      "/api/moods": mockJson({
        data: {
          "2025-05-14": 4,
          "2024-05-14": 2,
          "2024-01-01": 3,
        },
      }),
      "/api/gratitude?date=2025-05-14": mockJson({
        data: { date: "2025-05-14", items: ["아침 산책", "", "", "", ""] },
      }),
      "/api/gratitude?date=2024-05-14": mockJson({ data: null }),
      "/api/notes/daily?date=2025-05-14": mockNote("산책했다"),
      "/api/notes/daily?date=2024-05-14": mockNote("힘들었다"),
    });

    render(<TimeCapsuleCard onSelectDate={() => {}} />);

    const items = await screen.findAllByRole("button");
    expect(items[0]).toHaveTextContent("2025-05-14");
    expect(items[0]).toHaveTextContent("😊");
    expect(items[0]).toHaveTextContent("아침 산책");
    expect(items[1]).toHaveTextContent("2024-05-14");
    expect(items[1]).toHaveTextContent("😔");
    expect(items[1]).toHaveTextContent("힘들었다");
  });

  it("falls back to note first line when gratitude is empty", async () => {
    installFetch({
      "/api/moods": mockJson({ data: { "2025-05-14": 3 } }),
      "/api/gratitude?date=2025-05-14": mockJson({ data: null }),
      "/api/notes/daily?date=2025-05-14": mockNote("# 헤딩\n\n첫 번째 의미있는 줄"),
    });
    render(<TimeCapsuleCard onSelectDate={() => {}} />);
    const row = await screen.findByRole("button");
    expect(row).toHaveTextContent("첫 번째 의미있는 줄");
  });

  it("calls onSelectDate with the row's date when clicked", async () => {
    const onSelect = vi.fn();
    installFetch({
      "/api/moods": mockJson({ data: { "2025-05-14": 4 } }),
      "/api/gratitude?date=2025-05-14": mockJson({
        data: { date: "2025-05-14", items: ["a", "", "", "", ""] },
      }),
      "/api/notes/daily?date=2025-05-14": mockNote(""),
    });
    render(<TimeCapsuleCard onSelectDate={onSelect} />);
    const row = await screen.findByRole("button");
    vi.useRealTimers();
    await userEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith("2025-05-14");
  });

  it("renders a mood-only row when both gratitude and note are missing", async () => {
    installFetch({
      "/api/moods": mockJson({ data: { "2025-05-14": 5 } }),
      "/api/gratitude?date=2025-05-14": mockJson({ data: null }),
      "/api/notes/daily?date=2025-05-14": mockNote(""),
    });
    render(<TimeCapsuleCard onSelectDate={() => {}} />);
    const row = await screen.findByRole("button");
    expect(row).toHaveTextContent("😄");
  });

  it("renders nothing when /api/moods fails", async () => {
    global.fetch = vi.fn(async () => mockFailure() as unknown as Response) as unknown as typeof fetch;
    const { container } = render(<TimeCapsuleCard onSelectDate={() => {}} />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run:
```bash
npx vitest run components/__tests__/TimeCapsuleCard.test.tsx
```

Expected: FAIL — `Cannot find module '../TimeCapsuleCard'`

- [ ] **Step 3: 컴포넌트 구현**

`components/TimeCapsuleCard.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { haptic } from "@/lib/haptic";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const MOOD_EMOJI: Record<number, string> = {
  1: "😢", 2: "😔", 3: "😐", 4: "😊", 5: "😄",
};

const MAX_YEARS = 5;

interface Row {
  date: string; // YYYY-MM-DD
  year: number;
  mood: number | null;
  preview: string | null; // gratitude 1st item → note first line → null
}

interface TimeCapsuleCardProps {
  onSelectDate: (date: string) => void;
}

function todayMMDD(): { mm: string; dd: string; today: string } {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const today = `${now.getFullYear()}-${mm}-${dd}`;
  return { mm, dd, today };
}

function firstMeaningfulLine(md: string): string | null {
  for (const raw of md.split("\n")) {
    const line = raw
      .replace(/^#+\s+/, "")          // heading
      .replace(/^[-*]\s+\[.\]\s+/, "") // checklist
      .replace(/^[-*]\s+/, "")        // bullet
      .replace(/^>\s+/, "")           // quote
      .trim();
    if (line.length > 0) return line.length > 80 ? line.slice(0, 80) + "…" : line;
  }
  return null;
}

export default function TimeCapsuleCard({ onSelectDate }: TimeCapsuleCardProps) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const { mm, dd, today } = todayMMDD();
      const moodRes = await fetch(`${BASE}/api/moods`);
      if (!moodRes.ok) throw new Error("moods");
      const moodBody: { data?: Record<string, number> } = await moodRes.json();
      const moods = moodBody.data ?? {};

      const matchingDates = Object.keys(moods)
        .filter((d) => d.length === 10 && d.endsWith(`-${mm}-${dd}`) && d !== today)
        .sort()
        .reverse()
        .slice(0, MAX_YEARS);

      const built: Row[] = await Promise.all(
        matchingDates.map(async (date): Promise<Row> => {
          let preview: string | null = null;
          try {
            const gRes = await fetch(`${BASE}/api/gratitude?date=${date}`);
            if (gRes.ok) {
              const gBody: { data?: { items?: string[] } | null } = await gRes.json();
              const first = (gBody.data?.items ?? []).find((s) => s && s.trim());
              if (first) preview = first.trim();
            }
          } catch {
            // ignore
          }
          if (!preview) {
            try {
              const nRes = await fetch(`${BASE}/api/notes/daily?date=${date}`);
              if (nRes.ok) {
                const nBody: { data?: string } = await nRes.json();
                const content = nBody.data ?? "";
                preview = firstMeaningfulLine(content);
              }
            } catch {
              // ignore
            }
          }
          return {
            date,
            year: Number(date.slice(0, 4)),
            mood: moods[date] ?? null,
            preview,
          };
        }),
      );

      setRows(built);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (failed) return null;
  if (rows === null) return null; // loading -> render nothing (no flash)
  if (rows.length === 0) return null;

  return (
    <section
      aria-label="이 날의 발자취"
      className="mx-5 md:mx-0 mb-3 bg-[var(--sys-bg-elevated)] rounded-xl overflow-hidden"
    >
      <div className="px-4 pt-3 pb-1">
        <span className="text-[15px] font-semibold text-[var(--label-secondary)]">이 날의 발자취</span>
      </div>
      <ul className="px-2 pb-2">
        {rows.map((r) => (
          <li key={r.date}>
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                onSelectDate(r.date);
              }}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg active:bg-[var(--fill-tertiary)] transition-colors"
              aria-label={`${r.date}로 이동`}
            >
              <span className="text-[15px] tabular-nums text-[var(--label-tertiary)] w-[88px] text-left">
                {r.date}
              </span>
              <span className="text-[20px] w-[24px] text-center" aria-hidden="true">
                {r.mood !== null ? MOOD_EMOJI[r.mood] : ""}
              </span>
              <span className="text-[15px] text-[var(--label-primary)] flex-1 text-left truncate">
                {r.preview ?? ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
npx vitest run components/__tests__/TimeCapsuleCard.test.tsx
```

Expected: 6 tests PASS.

- [ ] **Step 5: 커밋**

```bash
git add components/TimeCapsuleCard.tsx components/__tests__/TimeCapsuleCard.test.tsx
git commit -m "feat(checkin): add TimeCapsuleCard for same-day past entries"
```

---

## Task 6: `MonthlyReviewModal` 컴포넌트

BriefingModal 패턴 + ↻ 재생성.

**Files:**
- Create: `components/MonthlyReviewModal.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`components/MonthlyReviewModal.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { haptic } from "@/lib/haptic";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface MonthlyReviewModalProps {
  onClose: () => void;
}

interface ReviewData {
  date: string;
  content: string;
  generatedAt: string;
}

function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi} 생성`;
  } catch {
    return "";
  }
}

export default function MonthlyReviewModal({ onClose }: MonthlyReviewModalProps) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const qs = refresh ? "?refresh=1" : "";
      const res = await fetch(`${BASE}/api/ai/monthly-review${qs}`);
      const body: { data?: ReviewData; error?: string } = await res.json();
      if (!res.ok || !body.data) {
        setError(body.error ?? "AI 응답을 가져올 수 없어요. 잠시 후 다시 시도해주세요.");
      } else {
        setData(body.data);
      }
    } catch {
      setError("AI 응답을 가져올 수 없어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const handleRefresh = () => {
    haptic.selection();
    load(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center ios-sheet-overlay"
      style={{ background: "rgba(0,0,0,0.4)" }}
      role="dialog"
      aria-modal="true"
      aria-label="이 달 회고"
    >
      <div
        className="ios-sheet w-full max-w-lg max-h-[80vh] flex flex-col rounded-t-[16px] md:rounded-[16px]"
        style={{
          background: "var(--sys-bg-elevated)",
          boxShadow: "var(--shadow-xl)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)",
        }}
      >
        <div className="drag-handle md:hidden" />

        <div
          className="flex items-center justify-between px-5 py-[14px]"
          style={{ borderBottom: "0.5px solid var(--sys-separator)" }}
        >
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="w-[50px] text-left text-[20px] active:opacity-60 transition-opacity disabled:opacity-40"
            style={{ color: "var(--sys-blue)" }}
            aria-label="다시 생성"
          >
            ↻
          </button>
          <h3 className="text-[20px] font-semibold" style={{ color: "var(--sys-label)" }}>
            이 달 회고
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[20px] font-semibold w-[50px] text-right active:opacity-60 transition-opacity"
            style={{ color: "var(--sys-blue)" }}
          >
            완료
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 py-5 prose dark:prose-invert max-w-none"
          style={{ color: "var(--sys-label)" }}
        >
          {loading && <p>회고를 정리하고 있어요...</p>}
          {!loading && error && <p>{error}</p>}
          {!loading && !error && data && <ReactMarkdown>{data.content}</ReactMarkdown>}
        </div>

        {!loading && !error && data && (
          <div
            className="px-5 py-3 text-[13px]"
            style={{
              borderTop: "0.5px solid var(--sys-separator)",
              color: "var(--label-tertiary)",
            }}
          >
            {formatGeneratedAt(data.generatedAt)}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run:
```bash
npx tsc --noEmit
```

Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add components/MonthlyReviewModal.tsx
git commit -m "feat(checkin): add MonthlyReviewModal with refresh button"
```

---

## Task 7: `CheckinView` 통합

**Files:**
- Modify: `components/CheckinView.tsx`

- [ ] **Step 1: 새 wrapper 구조로 교체**

`components/CheckinView.tsx`를 다음 내용으로 통째 교체:

```tsx
"use client";

import { useState } from "react";
import DateNavigator from "@/components/DateNavigator";
import MoodInput from "@/components/MoodInput";
import GratitudeSection from "@/components/GratitudeSection";
import BriefingModal from "@/components/BriefingModal";
import TimeCapsuleCard from "@/components/TimeCapsuleCard";
import MonthlyReviewModal from "@/components/MonthlyReviewModal";
import { haptic } from "@/lib/haptic";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function dateToString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date {
  return new Date(s + "T00:00:00");
}

export default function CheckinView() {
  const [date, setDate] = useState(() => new Date());
  const [showBriefing, setShowBriefing] = useState(false);
  const [briefingText, setBriefingText] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const loadBriefing = async () => {
    haptic.selection();
    setShowBriefing(true);
    setBriefingLoading(true);
    try {
      const res = await fetch(`${BASE}/api/ai/briefing`);
      const body = await res.json();
      setBriefingText(body.data?.briefing ?? "브리핑을 불러올 수 없습니다.");
    } catch {
      setBriefingText("AI 서비스를 사용할 수 없습니다.");
    } finally {
      setBriefingLoading(false);
    }
  };

  const openReview = () => {
    haptic.selection();
    setShowReview(true);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DateNavigator date={date} onChange={setDate} />
      <div
        className="flex-1 min-h-0 overflow-y-auto flex flex-col"
        style={{ viewTransitionName: "date-content" }}
      >
        <div className="pt-3">
          <MoodInput date={dateToString(date)} />
          <GratitudeSection date={dateToString(date)} />
        </div>
        <div className="mx-5 md:mx-0 mt-auto pt-4 pb-4 flex flex-col gap-3">
          <TimeCapsuleCard onSelectDate={(d) => setDate(parseDate(d))} />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="py-3.5 rounded-xl bg-[var(--fill-secondary)] text-[var(--label-primary)] text-[17px] font-semibold active:opacity-70 transition-opacity"
              onClick={openReview}
            >
              이 달 회고
            </button>
            <button
              type="button"
              className="py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[17px] font-semibold active:opacity-80 transition-opacity"
              onClick={loadBriefing}
            >
              오늘의 브리핑
            </button>
          </div>
        </div>
      </div>
      {showBriefing && (
        <BriefingModal
          briefing={briefingLoading ? "로딩 중..." : briefingText}
          onClose={() => setShowBriefing(false)}
        />
      )}
      {showReview && (
        <MonthlyReviewModal onClose={() => setShowReview(false)} />
      )}
    </div>
  );
}
```

주요 변경:
- `mt-auto` 영역을 `flex flex-col gap-3` 컨테이너로 바꿔 TimeCapsuleCard를 버튼 위에 배치
- TimeCapsuleCard 자체에 이미 `mx-5 md:mx-0`가 있으니, 바깥 wrapper의 `mx-5 md:mx-0`는 버튼 grid 정렬용으로 그대로 둠. 카드는 wrapper 안에서 그 좌우 마진이 한 번 더 적용되지 않도록 카드 내부의 `mx-5 md:mx-0`를 제거 — 다음 step에서 처리

- [ ] **Step 2: TimeCapsuleCard 좌우 마진 wrapper 위임으로 정리**

`components/TimeCapsuleCard.tsx`의 `<section>` className에서 `mx-5 md:mx-0`를 제거 (wrapper에서 처리):

변경 전:
```tsx
<section
  aria-label="이 날의 발자취"
  className="mx-5 md:mx-0 mb-3 bg-[var(--sys-bg-elevated)] rounded-xl overflow-hidden"
>
```

변경 후:
```tsx
<section
  aria-label="이 날의 발자취"
  className="bg-[var(--sys-bg-elevated)] rounded-xl overflow-hidden"
>
```

또한 CheckinView에서 카드와 버튼 grid를 같은 wrapper 안에 두므로 `mb-3`도 불필요 — 위에서 이미 제거함.

- [ ] **Step 3: TimeCapsuleCard 테스트 재확인**

마진 변경이 테스트에 영향 없음. Run:
```bash
npx vitest run components/__tests__/TimeCapsuleCard.test.tsx
```

Expected: 6 tests PASS.

- [ ] **Step 4: 전체 테스트 & 타입 체크**

Run:
```bash
npx tsc --noEmit && npx vitest run
```

Expected: tsc 통과, 모든 테스트 PASS (이전 94개 + 신규 5+8+6 = 113개 안팎).

- [ ] **Step 5: 커밋**

```bash
git add components/CheckinView.tsx components/TimeCapsuleCard.tsx
git commit -m "feat(checkin): integrate time capsule and monthly review into CheckinView

mt-auto 영역을 flex column으로 바꿔 카드 위·split 버튼 아래 배치."
```

---

## Task 8: 빌드 & PM2 재시작 & 수동 검증

CLAUDE.md 배포 순서 그대로.

- [ ] **Step 1: 빌드**

Run:
```bash
pm2 stop v-todo && rm -rf .next && npx next build
```

Expected: 빌드 성공. 로그에 `app/api/ai/monthly-review` 라우트와 `app/api/ai/weekly-review` 부재 확인.

- [ ] **Step 2: 빌드 산출물 확인**

Run:
```bash
ls .next/BUILD_ID .next/prerender-manifest.json
```

Expected: 두 파일 존재.

- [ ] **Step 3: PM2 시작 & 저장**

Run:
```bash
pm2 start v-todo && pm2 save
```

Expected: `online` 상태.

- [ ] **Step 4: 라우트 응답 확인**

Run:
```bash
curl -s http://localhost:3000/api/ai/monthly-review | head -c 600 && echo && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/ai/weekly-review
```

Expected:
- 첫 번째: `{"data":{"date":"YYYY-MM-DD","content":"...","generatedAt":"..."}}`
- 두 번째: `404`

- [ ] **Step 5: 캐시 동작 점검**

Run:
```bash
cat data/monthly-review.json
```

Expected: 오늘 날짜의 캐시 객체가 존재. `date` 필드가 KST 기준 오늘인지 확인.

같은 호출 재실행:
```bash
time curl -s http://localhost:3000/api/ai/monthly-review > /dev/null
```

Expected: 첫 호출보다 훨씬 빠른 응답 (캐시 hit).

강제 재생성:
```bash
time curl -s "http://localhost:3000/api/ai/monthly-review?refresh=1" > /dev/null
```

Expected: 다시 AI 호출 소요시간(수 초). `data/monthly-review.json`의 `generatedAt`이 갱신됨.

- [ ] **Step 6: 브라우저 수동 점검**

브라우저에서 앱의 체크인 탭 진입 (`http://localhost:3000` → 체크인). 다음 항목을 확인:

1. mood/gratitude 입력 영역 정상.
2. 화면 하단에 `이 날의 발자취` 카드가 있다 (과거 데이터가 있다면). 없으면 카드가 안 보여야 한다 — 빈 박스 X.
3. 카드 행을 누르면 DateNavigator가 그 날짜로 이동한다.
4. 하단 버튼 두 개 (`이 달 회고` / `오늘의 브리핑`)가 1:1 grid로 나란히 있다.
5. `이 달 회고` 클릭 → 모달 오픈, 회고 본문이 마크다운으로 렌더된다. 우상단 ↻ 클릭 → 본문 재로딩.
6. `오늘의 브리핑` 동작이 이전과 같다.
7. 다크/라이트 테마 모두 자연스럽다.

- [ ] **Step 7: 릴리스 노트 / 커밋**

(현 시점에서는 코드 변경 없음. 필요시 README.md changelog 추가는 본 플랜 범위 밖 — 사용자가 별도 요청하면 처리.)

Run:
```bash
git status
```

Expected: working tree clean (혹은 다른 무관 변경만).

---

## 완료 정의

- [x] weekly review 코드/라우트/타입/테스트 제거
- [x] `data/monthly-review.json` 캐시 read/write 헬퍼 (테스트 5개)
- [x] `buildMonthlyReviewPrompt` 구현 (테스트 8개)
- [x] `GET /api/ai/monthly-review` 라우트 (캐시 hit, 강제 refresh, 빈 데이터 폴백)
- [x] `TimeCapsuleCard` 컴포넌트 (테스트 6개)
- [x] `MonthlyReviewModal` 컴포넌트
- [x] `CheckinView` 통합 (카드 위 + 1:1 split 버튼)
- [x] 빌드 + PM2 재시작 + 수동 점검 OK
