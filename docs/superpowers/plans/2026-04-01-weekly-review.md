# AI 주간 리뷰 (Weekly Review) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매주 일요일 밤 자동으로 데일리 노트를 분석하여 인사이트를 추출하고, 범용 노트에서 열람 가능한 주간 리뷰 파일을 생성한다.

**Architecture:** 기존 `generateText` (Gemini) + `readDailyNote` + `writeFile` (file-store)를 재사용한다. 주차 계산 유틸(`lib/week.ts`), 프롬프트 빌더(`lib/prompts.ts`에 추가), API 라우트(`POST /api/ai/weekly-review`) 세 층으로 나눈다.

**Tech Stack:** Next.js 16 App Router, Gemini 3.1 Flash Lite, Vitest, file-based storage

---

## File Structure

- Create: `lib/week.ts` — ISO 주차 계산, 날짜 범위, 파일명 유틸
- Create: `lib/__tests__/week.test.ts` — 주차 유틸 테스트
- Modify: `lib/prompts.ts` — `buildWeeklyReviewPrompt` 함수 추가
- Modify: `lib/__tests__/prompts.test.ts` — 주간 리뷰 프롬프트 테스트 추가
- Create: `app/api/ai/weekly-review/route.ts` — POST API 라우트
- Modify: `types/index.ts` — `WeeklyReviewResponse` 타입 추가

---

### Task 1: 주차 계산 유틸 (`lib/week.ts`)

**Files:**
- Create: `lib/week.ts`
- Create: `lib/__tests__/week.test.ts`

- [ ] **Step 1: 테스트 작성**

```ts
// lib/__tests__/week.test.ts
import { describe, it, expect } from "vitest";
import { getISOWeek, getWeekDateRange, getWeekFilename, getPreviousWeekFilename } from "../week";

describe("getISOWeek", () => {
  it("returns correct ISO week for 2026-04-05 (Sunday)", () => {
    const result = getISOWeek(new Date(2026, 3, 5)); // April 5, 2026 = Sunday
    expect(result).toEqual({ year: 2026, week: 14 });
  });

  it("returns correct ISO week for 2026-03-30 (Monday)", () => {
    const result = getISOWeek(new Date(2026, 2, 30)); // March 30, 2026 = Monday
    expect(result).toEqual({ year: 2026, week: 14 });
  });

  it("handles year boundary (2025-12-31 = W01 of 2026)", () => {
    const result = getISOWeek(new Date(2025, 11, 31)); // Dec 31, 2025 = Wednesday
    expect(result).toEqual({ year: 2026, week: 1 });
  });

  it("handles week 1 padding", () => {
    const result = getISOWeek(new Date(2026, 0, 5)); // Jan 5, 2026 = Monday
    expect(result).toEqual({ year: 2026, week: 2 });
  });
});

describe("getWeekDateRange", () => {
  it("returns Monday to Sunday for a mid-week date", () => {
    const result = getWeekDateRange(new Date(2026, 3, 1)); // April 1, 2026 = Wednesday
    expect(result).toEqual({ monday: "2026-03-30", sunday: "2026-04-05" });
  });

  it("returns correct range when given a Monday", () => {
    const result = getWeekDateRange(new Date(2026, 2, 30)); // March 30 = Monday
    expect(result).toEqual({ monday: "2026-03-30", sunday: "2026-04-05" });
  });

  it("returns correct range when given a Sunday", () => {
    const result = getWeekDateRange(new Date(2026, 3, 5)); // April 5 = Sunday
    expect(result).toEqual({ monday: "2026-03-30", sunday: "2026-04-05" });
  });
});

describe("getWeekFilename", () => {
  it("returns formatted filename with zero-padded week", () => {
    expect(getWeekFilename(new Date(2026, 3, 5))).toBe("2026-W14.md");
  });

  it("pads single digit week numbers", () => {
    expect(getWeekFilename(new Date(2026, 0, 5))).toBe("2026-W02.md");
  });
});

describe("getPreviousWeekFilename", () => {
  it("returns previous week filename", () => {
    expect(getPreviousWeekFilename(new Date(2026, 3, 5))).toBe("2026-W13.md");
  });

  it("handles year boundary", () => {
    expect(getPreviousWeekFilename(new Date(2026, 0, 5))).toBe("2026-W01.md");
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run lib/__tests__/week.test.ts`
Expected: FAIL — `../week` 모듈이 존재하지 않음

- [ ] **Step 3: 구현 작성**

```ts
// lib/week.ts

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** ISO 8601 주차 계산 (월요일 시작) */
export function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const week = Math.round(((d.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7) + 1;
  return { year: d.getFullYear(), week };
}

/** 해당 날짜가 속한 주의 월요일~일요일 날짜 범위 */
export function getWeekDateRange(date: Date): { monday: string; sunday: string } {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday: formatDate(monday), sunday: formatDate(sunday) };
}

/** 주간 리뷰 파일명 (예: 2026-W14.md) */
export function getWeekFilename(date: Date): string {
  const { year, week } = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}.md`;
}

/** 직전 주 리뷰 파일명 */
export function getPreviousWeekFilename(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - 7);
  return getWeekFilename(d);
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `npx vitest run lib/__tests__/week.test.ts`
Expected: ALL PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/week.ts lib/__tests__/week.test.ts
git commit -m "feat(weekly-review): add ISO week calculation utilities"
```

---

### Task 2: 주간 리뷰 프롬프트 빌더

**Files:**
- Modify: `lib/prompts.ts` — `buildWeeklyReviewPrompt` 추가
- Modify: `lib/__tests__/prompts.test.ts` — 테스트 추가

- [ ] **Step 1: 테스트 작성**

`lib/__tests__/prompts.test.ts` 하단에 추가:

```ts
import { buildWeeklyReviewPrompt } from "../prompts";

describe("buildWeeklyReviewPrompt", () => {
  it("includes all provided daily notes with day labels", () => {
    const notes = [
      { date: "2026-03-30", day: "월요일", content: "프로젝트 킥오프" },
      { date: "2026-04-01", day: "수요일", content: "디자인 리뷰 완료" },
    ];
    const prompt = buildWeeklyReviewPrompt(notes, null);
    expect(prompt).toContain("월요일 (2026-03-30)");
    expect(prompt).toContain("프로젝트 킥오프");
    expect(prompt).toContain("수요일 (2026-04-01)");
    expect(prompt).toContain("디자인 리뷰 완료");
  });

  it("includes previous review when provided", () => {
    const notes = [{ date: "2026-03-30", day: "월요일", content: "작업 내용" }];
    const prevReview = "- 지난주 핵심: 집중력 저하 패턴";
    const prompt = buildWeeklyReviewPrompt(notes, prevReview);
    expect(prompt).toContain("이전 주 리뷰");
    expect(prompt).toContain("집중력 저하 패턴");
  });

  it("omits previous review section when null", () => {
    const notes = [{ date: "2026-03-30", day: "월요일", content: "작업" }];
    const prompt = buildWeeklyReviewPrompt(notes, null);
    expect(prompt).not.toContain("이전 주 리뷰");
  });

  it("contains instruction keywords", () => {
    const notes = [{ date: "2026-03-30", day: "월요일", content: "내용" }];
    const prompt = buildWeeklyReviewPrompt(notes, null);
    expect(prompt).toContain("인사이트");
    expect(prompt).toContain("불릿 포인트");
    expect(prompt).toContain("한국어");
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run lib/__tests__/prompts.test.ts`
Expected: FAIL — `buildWeeklyReviewPrompt` is not exported

- [ ] **Step 3: 구현 — `lib/prompts.ts` 하단에 추가**

```ts
export interface DailyNoteEntry {
  date: string;
  day: string;
  content: string;
}

export function buildWeeklyReviewPrompt(
  notes: DailyNoteEntry[],
  previousReview: string | null,
): string {
  const prevSection = previousReview
    ? `\n## 이전 주 리뷰\n${previousReview}\n`
    : "";

  const noteEntries = notes
    .map((n) => `--- ${n.day} (${n.date}) ---\n${n.content}`)
    .join("\n\n");

  return `당신은 개인 생산성 코치입니다. 아래 데일리 노트에서 인사이트를 추출하세요.

규칙:
- 불릿 포인트만 출력 (서론, 결론, 인삿말 없이)
- 반복되는 주제, 감정 변화, 숨은 패턴, 주목할 만한 점 중심
- 이전 주 리뷰가 있다면 참고하여 연속성 있는 관찰을 포함
- 한국어로 작성
${prevSection}
## 이번 주 데일리 노트

${noteEntries}`;
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `npx vitest run lib/__tests__/prompts.test.ts`
Expected: ALL PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/prompts.ts lib/__tests__/prompts.test.ts
git commit -m "feat(weekly-review): add weekly review prompt builder"
```

---

### Task 3: 타입 추가

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: `types/index.ts` 하단에 추가**

```ts
export interface WeeklyReviewResponse {
  path: string;
  content: string;
}
```

- [ ] **Step 2: 커밋**

```bash
git add types/index.ts
git commit -m "feat(weekly-review): add WeeklyReviewResponse type"
```

---

### Task 4: API 라우트 (`POST /api/ai/weekly-review`)

**Files:**
- Create: `app/api/ai/weekly-review/route.ts`

- [ ] **Step 1: API 라우트 작성**

```ts
// app/api/ai/weekly-review/route.ts
import { NextResponse } from "next/server";
import { readDailyNote } from "@/lib/note-store";
import { readFile, writeFile } from "@/lib/file-store";
import { generateText } from "@/lib/gemini";
import { buildWeeklyReviewPrompt } from "@/lib/prompts";
import type { DailyNoteEntry } from "@/lib/prompts";
import { getWeekDateRange, getWeekFilename, getPreviousWeekFilename, getISOWeek } from "@/lib/week";
import type { WeeklyReviewResponse, ApiResponse } from "@/types";

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

    // 3. Gemini 호출
    const prompt = buildWeeklyReviewPrompt(notes, prevReviewContent);
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
```

- [ ] **Step 2: 커밋**

```bash
git add app/api/ai/weekly-review/route.ts
git commit -m "feat(weekly-review): add POST /api/ai/weekly-review endpoint"
```

---

### Task 5: Cron 스케줄 등록

- [ ] **Step 1: cokacdir 명령으로 매주 일요일 밤 자동 실행 등록**

```bash
"/usr/local/bin/cokacdir" --cron "v-todo 앱의 주간 리뷰 API를 호출하라. curl -X POST http://localhost:3000/api/ai/weekly-review 를 실행하고, 결과를 사용자에게 알려줘라." --at "0 22 * * 0" --chat 5788362055 --key f94204e4af8ad10b
```

매주 일요일 22:00에 실행되는 cron 등록.

- [ ] **Step 2: 등록 확인**

```bash
"/usr/local/bin/cokacdir" --cron-list --chat 5788362055 --key f94204e4af8ad10b
```

Expected: 새로 등록된 weekly-review 스케줄이 목록에 표시

---

### Task 6: 빌드 & 배포

- [ ] **Step 1: 빌드**

```bash
pm2 stop v-todo
rm -rf .next
npx next build
```

Expected: 빌드 성공, `.next/BUILD_ID` 파일 존재

- [ ] **Step 2: PM2 재시작**

```bash
pm2 start v-todo
pm2 save
```

- [ ] **Step 3: 빌드 검증**

```bash
ls .next/BUILD_ID && ls .next/prerender-manifest.json
```

Expected: 두 파일 모두 존재

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "feat(weekly-review): complete weekly review feature implementation"
```
