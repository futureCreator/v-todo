# Mood Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mood tracker that lets users record one emoji-based mood per day and view the full year as a "Year in Pixels" grid.

**Architecture:** Mood data stored as a flat `{ "YYYY-MM-DD": number }` map in `data/moods.json`. A `MoodInput` component is placed above the gratitude section in DailyNoteView. A `MoodYearView` component renders a 12-column (months) x 31-row (days) vertical strip grid accessible via a new "무드" sub-tab in the note section. AI briefing and weekly review include mood data.

**Tech Stack:** Next.js API routes, React client components, file-based JSON storage with atomic writes, Catppuccin color theme.

---

### Task 1: Add Types

**Files:**
- Modify: `types/index.ts:98` (NoteTab type)
- Modify: `types/index.ts:205` (after GratitudeStore)

- [ ] **Step 1: Add MoodValue type and update NoteTab**

In `types/index.ts`, change the NoteTab type to include "mood":

```typescript
// Line 98 — change:
export type NoteTab = "daily" | "general";
// to:
export type NoteTab = "daily" | "general" | "mood";
```

Then add after line 205 (after `GratitudeStore`):

```typescript
// Mood
export type MoodValue = 1 | 2 | 3 | 4 | 5;
export type MoodMap = Record<string, MoodValue>;
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No errors (or only pre-existing ones)

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat(mood): add MoodValue, MoodMap types and extend NoteTab"
```

---

### Task 2: Create Mood Store + Tests

**Files:**
- Create: `lib/mood-store.ts`
- Create: `lib/__tests__/mood-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/mood-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { readMoods, writeMoods, readMoodByDate, writeMoodByDate, MOODS_PATH, DATA_DIR } from "../mood-store";
import type { MoodValue } from "@/types";

describe("mood-store", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(MOODS_PATH, JSON.stringify({}));
  });

  afterEach(async () => {
    try { await fs.unlink(MOODS_PATH); } catch {}
    try { await fs.unlink(path.join(DATA_DIR, "moods.tmp.json")); } catch {}
  });

  it("reads empty moods from file", async () => {
    const moods = await readMoods();
    expect(moods).toEqual({});
  });

  it("writes and reads moods", async () => {
    await writeMoods({ "2026-04-08": 5 });
    const moods = await readMoods();
    expect(moods["2026-04-08"]).toBe(5);
  });

  it("reads mood by date", async () => {
    await writeMoods({ "2026-04-08": 4, "2026-04-07": 2 });
    const mood = await readMoodByDate("2026-04-08");
    expect(mood).toBe(4);
  });

  it("returns null for missing date", async () => {
    const mood = await readMoodByDate("2026-01-01");
    expect(mood).toBeNull();
  });

  it("writes mood by date (insert)", async () => {
    await writeMoodByDate("2026-04-08", 5);
    const moods = await readMoods();
    expect(moods["2026-04-08"]).toBe(5);
  });

  it("writes mood by date (overwrite)", async () => {
    await writeMoods({ "2026-04-08": 3 });
    await writeMoodByDate("2026-04-08", 5);
    const moods = await readMoods();
    expect(moods["2026-04-08"]).toBe(5);
  });

  it("creates file if not exists", async () => {
    await fs.unlink(MOODS_PATH);
    const moods = await readMoods();
    expect(moods).toEqual({});
  });

  it("recovers from corrupted JSON", async () => {
    await fs.writeFile(MOODS_PATH, "not valid json{{{");
    const moods = await readMoods();
    expect(moods).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/mood-store.test.ts 2>&1 | tail -15`
Expected: FAIL — cannot find module `../mood-store`

- [ ] **Step 3: Write the mood store**

Create `lib/mood-store.ts`:

```typescript
import fs from "fs/promises";
import path from "path";
import type { MoodMap, MoodValue } from "@/types";

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const MOODS_PATH = path.join(DATA_DIR, "moods.json");
const TMP_PATH = path.join(DATA_DIR, "moods.tmp.json");

export async function readMoods(): Promise<MoodMap> {
  try {
    const raw = await fs.readFile(MOODS_PATH, "utf-8");
    return JSON.parse(raw) as MoodMap;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(MOODS_PATH, JSON.stringify({}));
      return {};
    }
    console.error("Failed to parse moods.json, resetting:", err);
    await fs.writeFile(MOODS_PATH, JSON.stringify({}));
    return {};
  }
}

export async function writeMoods(moods: MoodMap): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(moods, null, 2));
  await fs.rename(TMP_PATH, MOODS_PATH);
}

export async function readMoodByDate(date: string): Promise<MoodValue | null> {
  const moods = await readMoods();
  return (moods[date] as MoodValue) ?? null;
}

export async function writeMoodByDate(date: string, value: MoodValue): Promise<void> {
  const moods = await readMoods();
  moods[date] = value;
  await writeMoods(moods);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/mood-store.test.ts 2>&1 | tail -15`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/mood-store.ts lib/__tests__/mood-store.test.ts
git commit -m "feat(mood): add mood store with atomic writes and tests"
```

---

### Task 3: Create API Route

**Files:**
- Create: `app/api/moods/route.ts`

- [ ] **Step 1: Create the API route**

Create `app/api/moods/route.ts`:

```typescript
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
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/moods/route.ts
git commit -m "feat(mood): add GET/POST /api/moods route"
```

---

### Task 4: Create MoodInput Component

**Files:**
- Create: `components/MoodInput.tsx`

- [ ] **Step 1: Create the MoodInput component**

This component renders a horizontal bar of 5 emoji buttons. It fetches the current day's mood on mount, and saves immediately on tap with 1s debounce.

Create `components/MoodInput.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface MoodInputProps {
  date: string;
}

const MOODS: { value: number; emoji: string }[] = [
  { value: 1, emoji: "😢" },
  { value: 2, emoji: "😔" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "😊" },
  { value: 5, emoji: "😄" },
];

export default function MoodInput({ date }: MoodInputProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const dateRef = useRef(date);

  const fetchMood = useCallback(async (d: string) => {
    dateRef.current = d;
    try {
      const res = await fetch(`${BASE}/api/moods?date=${d}`);
      const body = await res.json();
      setSelected(body.data ?? null);
    } catch {
      setSelected(null);
    }
  }, []);

  const saveMood = useCallback(async (value: number) => {
    try {
      await fetch(`${BASE}/api/moods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateRef.current, value }),
      });
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchMood(date);
  }, [date, fetchMood]);

  const handleTap = (value: number) => {
    setSelected(value);
    saveMood(value);
  };

  return (
    <div className="mx-5 md:mx-0 mb-3">
      <div className="bg-[var(--sys-bg-elevated)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[18px]">🫧</span>
            <span className="text-[17px] font-semibold text-[var(--label-primary)]">오늘의 기분</span>
          </div>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => handleTap(m.value)}
              className="flex-1 flex items-center justify-center py-2.5 rounded-lg transition-all"
              style={{
                backgroundColor:
                  selected === m.value
                    ? "var(--fill-secondary)"
                    : "var(--fill-quaternary)",
                transform: selected === m.value ? "scale(1.1)" : "scale(1)",
                boxShadow:
                  selected === m.value
                    ? "0 0 0 2px var(--sys-teal)"
                    : "none",
              }}
            >
              <span className="text-[28px]">{m.emoji}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/MoodInput.tsx
git commit -m "feat(mood): add MoodInput emoji bar component"
```

---

### Task 5: Integrate MoodInput into DailyNoteView

**Files:**
- Modify: `components/DailyNoteView.tsx:6` (add import)
- Modify: `components/DailyNoteView.tsx:104` (add component above GratitudeSection)

- [ ] **Step 1: Add import**

In `components/DailyNoteView.tsx`, add after line 6 (`import GratitudeSection`):

```typescript
import MoodInput from "@/components/MoodInput";
```

- [ ] **Step 2: Add MoodInput above GratitudeSection**

In the return JSX (line 104), change:

```typescript
      <GratitudeSection date={dateToString(date)} />
```

to:

```typescript
      <MoodInput date={dateToString(date)} />
      <GratitudeSection date={dateToString(date)} />
```

The order from top to bottom will be: DateNavigator → MoodInput → GratitudeSection → NoteEditor.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add components/DailyNoteView.tsx
git commit -m "feat(mood): integrate MoodInput above gratitude in daily note"
```

---

### Task 6: Create MoodYearView Component

**Files:**
- Modify: `app/globals.css:51` (add `--sys-yellow` to Latte theme)
- Modify: `app/globals.css:116` (add `--sys-yellow` to Mocha theme)
- Create: `components/MoodYearView.tsx`

- [ ] **Step 1: Add --sys-yellow CSS variable**

In `app/globals.css`, add `--sys-yellow` in the Latte (light) section after `--sys-gray` (line 51):

```css
  --sys-yellow: #df8e1d;   /* Yellow */
```

In the Mocha (dark) section after `--sys-gray` (line 116):

```css
  --sys-yellow: #f9e2af;   /* Yellow */
```

- [ ] **Step 2: Create the Year in Pixels component**

This renders a 12-column (months) x 31-row (days) vertical strip grid. Each cell is colored by mood value using CSS variables.

Create `components/MoodYearView.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import type { MoodMap } from "@/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const MOOD_COLORS: Record<number, string> = {
  5: "var(--sys-green)",
  4: "var(--sys-teal)",
  3: "var(--sys-yellow)",
  2: "var(--sys-orange)",
  1: "var(--sys-red)",
};

const MOOD_EMOJI: Record<number, string> = {
  1: "😢",
  2: "😔",
  3: "😐",
  4: "😊",
  5: "😄",
};

const MONTH_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function MoodYearView() {
  const [moods, setMoods] = useState<MoodMap>({});
  const [toast, setToast] = useState<string | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const todayStr = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const fetchMoods = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/moods?year=${year}`);
      const body = await res.json();
      setMoods(body.data ?? {});
    } catch {
      setMoods({});
    }
  }, [year]);

  useEffect(() => {
    fetchMoods();
  }, [fetchMoods]);

  const handleCellTap = (dateStr: string, value: number | undefined) => {
    if (!value) return;
    const month = parseInt(dateStr.slice(5, 7));
    const day = parseInt(dateStr.slice(8, 10));
    setToast(`${month}/${day} ${MOOD_EMOJI[value]}`);
    setTimeout(() => setToast(null), 1500);
  };

  const CELL_SIZE = 20;
  const GAP = 3;

  return (
    <div className="px-5 md:px-0 py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[18px]">🫧</span>
        <span className="text-[20px] font-bold text-[var(--label-primary)]">{year}년 무드</span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-0">
          {/* Day labels column */}
          <div className="flex flex-col flex-shrink-0 mr-1" style={{ gap: GAP }}>
            {/* Empty cell for month label row */}
            <div style={{ height: CELL_SIZE }} />
            {Array.from({ length: 31 }, (_, i) => (
              <div
                key={i}
                className="flex items-center justify-end pr-1 text-[10px] text-[var(--label-tertiary)]"
                style={{ height: CELL_SIZE }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Month columns */}
          {Array.from({ length: 12 }, (_, mi) => {
            const maxDay = daysInMonth(year, mi);
            return (
              <div key={mi} className="flex flex-col flex-shrink-0" style={{ gap: GAP }}>
                {/* Month label */}
                <div
                  className="flex items-center justify-center text-[11px] font-semibold text-[var(--label-secondary)]"
                  style={{ height: CELL_SIZE }}
                >
                  {MONTH_LABELS[mi]}
                </div>
                {/* Day cells */}
                {Array.from({ length: 31 }, (_, di) => {
                  const day = di + 1;
                  if (day > maxDay) {
                    return (
                      <div
                        key={di}
                        style={{ width: CELL_SIZE, height: CELL_SIZE }}
                      />
                    );
                  }
                  const dateStr = `${year}-${String(mi + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const value = moods[dateStr];
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={di}
                      className="rounded-[3px] cursor-pointer transition-transform active:scale-110"
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        backgroundColor: value
                          ? MOOD_COLORS[value]
                          : "var(--fill-quaternary)",
                        border: isToday
                          ? "2px solid var(--label-primary)"
                          : "none",
                      }}
                      onClick={() => handleCellTap(dateStr, value)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-4">
        {[1, 2, 3, 4, 5].map((v) => (
          <div key={v} className="flex items-center gap-1">
            <div
              className="rounded-[2px]"
              style={{
                width: 12,
                height: 12,
                backgroundColor: MOOD_COLORS[v],
              }}
            />
            <span className="text-[12px]">{MOOD_EMOJI[v]}</span>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[var(--sys-bg-elevated)] text-[var(--label-primary)] text-[17px] font-semibold px-5 py-2.5 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/MoodYearView.tsx
git commit -m "feat(mood): add MoodYearView Year-in-Pixels component"
```

---

### Task 7: Add "무드" Tab to Note Section in page.tsx

**Files:**
- Modify: `app/page.tsx:4` (add MoodYearView import)
- Modify: `app/page.tsx:31` (noteTab initial value stays "daily")
- Modify: `app/page.tsx:565-567` (swipe handling for 3 note tabs)
- Modify: `app/page.tsx:658-665` (SectionTabs for notes — add "무드" tab)
- Modify: `app/page.tsx:687` (render MoodYearView when noteTab === "mood")

- [ ] **Step 1: Add import**

In `app/page.tsx`, find the import block and add:

```typescript
import MoodYearView from "@/components/MoodYearView";
```

(Add near the other component imports at the top of the file.)

- [ ] **Step 2: Update swipe handling for 3 note tabs**

Find the note section swipe logic (around lines 565-567):

```typescript
      if (dir === "left" && noteTab === "daily") setNoteTab("general");
      if (dir === "right" && noteTab === "general") setNoteTab("daily");
```

Replace with:

```typescript
      const noteTabs: NoteTab[] = ["daily", "general", "mood"];
      const ni = noteTabs.indexOf(noteTab);
      if (dir === "left" && ni < noteTabs.length - 1) setNoteTab(noteTabs[ni + 1]);
      if (dir === "right" && ni > 0) setNoteTab(noteTabs[ni - 1]);
```

- [ ] **Step 3: Add "무드" tab to SectionTabs**

Find the note SectionTabs (around lines 658-665):

```typescript
          <SectionTabs
            tabs={[
              { key: "daily", label: "데일리" },
              { key: "general", label: "노트" },
            ]}
            active={noteTab}
            onChange={(key) => setNoteTab(key as NoteTab)}
          />
```

Replace with:

```typescript
          <SectionTabs
            tabs={[
              { key: "daily", label: "데일리" },
              { key: "general", label: "노트" },
              { key: "mood", label: "무드" },
            ]}
            active={noteTab}
            onChange={(key) => setNoteTab(key as NoteTab)}
          />
```

- [ ] **Step 4: Render MoodYearView in content area**

Find the note content render (around line 687):

```typescript
              {noteTab === "daily" ? <DailyNoteView /> : <GeneralNoteView />}
```

Replace with:

```typescript
              {noteTab === "daily" ? (
                <DailyNoteView />
              ) : noteTab === "general" ? (
                <GeneralNoteView />
              ) : (
                <MoodYearView />
              )}
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat(mood): add mood tab to note section with year view"
```

---

### Task 8: AI Integration — Briefing

**Files:**
- Modify: `lib/prompts.ts:11-17` (add mood params to buildBriefingPrompt)
- Modify: `app/api/ai/briefing/route.ts:20-28` (fetch mood data)

- [ ] **Step 1: Update buildBriefingPrompt signature and add mood section**

In `lib/prompts.ts`, update the `buildBriefingPrompt` function signature (line 11) to add a `recentMoods` parameter:

```typescript
export function buildBriefingPrompt(
  todos: Todo[],
  schedules: Schedule[],
  todayNote?: string,
  yesterdayNote?: string,
  yesterdayDate?: string,
  habits?: { title: string; streak: number }[],
  yesterdayGratitude?: string[],
  recentMoods?: { date: string; value: number }[],
): string {
```

After the `gratitudeSection` variable (after line 57), add:

```typescript
  const moodEmojis: Record<number, string> = { 1: "😢", 2: "😔", 3: "😐", 4: "😊", 5: "😄" };
  const moodSection = recentMoods && recentMoods.length > 0
    ? `\n## 최근 기분 추이\n${recentMoods.map((m) => `- ${m.date}: ${moodEmojis[m.value] ?? "?"}`).join("\n")}\n`
    : "";
```

In the `reqItems` section, after the gratitude `reqItems.push` block (after line 77), add:

```typescript
  if (moodSection) {
    reqItems.push(`${reqNum}. 최근 기분 추이를 분석하고, 3일 이상 하락세면 격려 메시지 포함`);
    reqNum++;
  }
```

In the return template string (line 87), add `${moodSection}`:

```typescript
  return `당신은 일일 업무 브리핑 도우미입니다.
오늘 날짜: ${today}

## 할 일 목록
${todoList || "(할 일이 없습니다)"}

## D-day / 일정
${scheduleList || "(등록된 일정이 없습니다)"}
${dailyNoteBlock}${habitSection}${gratitudeSection}${moodSection}
위 내용을 종합하여 오늘의 브리핑을 작성해주세요:
${reqItems.join("\n")}

간결하고 실행 가능한 마크다운 형식으로 응답하세요.`;
```

- [ ] **Step 2: Update briefing route to fetch mood data**

In `app/api/ai/briefing/route.ts`, add the mood store import (after line 7):

```typescript
import { readMoods } from "@/lib/mood-store";
```

In the `Promise.all` call (line 20), add `readMoods()`:

```typescript
    const [todos, schedules, todayNote, yesterdayNote, habits, allLogs, yesterdayGratitude, allMoods] = await Promise.all([
      readTodos(),
      readSchedules(),
      readDailyNote(todayStr),
      readDailyNote(yesterdayStr),
      readHabits(),
      readHabitLogs(),
      readGratitudeByDate(yesterdayStr),
      readMoods(),
    ]);
```

Before the `buildBriefingPrompt` call (before line 86), add:

```typescript
    // Collect last 7 days of moods
    const recentMoods: { date: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (allMoods[ds]) recentMoods.push({ date: ds, value: allMoods[ds] });
    }
```

Update the `buildBriefingPrompt` call to pass `recentMoods`:

```typescript
    const prompt = buildBriefingPrompt(
      incompleteTodos,
      upcomingSchedules,
      todayNote,
      yesterdayNote,
      yesterdayStr,
      habitData.length > 0 ? habitData : undefined,
      gratitudeItems.length > 0 ? gratitudeItems : undefined,
      recentMoods.length > 0 ? recentMoods : undefined,
    );
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No errors

- [ ] **Step 4: Run existing tests to confirm nothing broke**

Run: `npx vitest run 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/prompts.ts app/api/ai/briefing/route.ts
git commit -m "feat(mood): integrate mood data into AI daily briefing"
```

---

### Task 9: AI Integration — Weekly Review

**Files:**
- Modify: `lib/prompts.ts:100-123` (add mood data to weekly review prompt)
- Modify: `app/api/ai/weekly-review/route.ts` (fetch and pass mood data)

- [ ] **Step 1: Update buildWeeklyReviewPrompt**

In `lib/prompts.ts`, update the signature (line 100):

```typescript
export function buildWeeklyReviewPrompt(
  notes: DailyNoteEntry[],
  previousReview: string | null,
  weekMoods?: { date: string; value: number }[],
): string {
```

After the `prevSection` variable (after line 105), add:

```typescript
  const moodEmojis: Record<number, string> = { 1: "😢", 2: "😔", 3: "😐", 4: "😊", 5: "😄" };
  const moodSection = weekMoods && weekMoods.length > 0
    ? `\n## 이번 주 기분 기록\n${weekMoods.map((m) => `- ${m.date}: ${moodEmojis[m.value] ?? "?"}`).join("\n")}\n`
    : "";
```

In the return template string, add `${moodSection}` before the note entries and update the rules:

```typescript
  return `당신은 개인 생산성 코치입니다. 아래 데일리 노트에서 인사이트를 추출하세요.

규칙:
- 불릿 포인트만 출력 (서론, 결론, 인삿말 없이)
- 반복되는 주제, 감정 변화, 숨은 패턴, 주목할 만한 점 중심
- 기분 기록이 제공된 경우 노트 내용과 기분 사이의 상관관계를 분석
- 직전 주 리뷰가 제공된 경우 참고하여 연속성 있는 관찰을 포함
- 한국어로 작성
${prevSection}${moodSection}
## 이번 주 데일리 노트

${noteEntries}`;
```

- [ ] **Step 2: Update weekly review route to fetch mood data**

In `app/api/ai/weekly-review/route.ts`, add the import (after line 4):

```typescript
import { readMoods } from "@/lib/mood-store";
```

After collecting notes (after line 35), add mood data collection:

```typescript
    // Collect week's mood data
    const allMoods = await readMoods();
    const weekMoods: { date: string; value: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (allMoods[dateStr]) weekMoods.push({ date: dateStr, value: allMoods[dateStr] });
    }
```

Update the `buildWeeklyReviewPrompt` call (line 51):

```typescript
    const prompt = buildWeeklyReviewPrompt(notes, prevReviewContent, weekMoods.length > 0 ? weekMoods : undefined);
```

- [ ] **Step 3: Verify types compile and run all tests**

Run: `npx tsc --noEmit 2>&1 | head -5 && npx vitest run 2>&1 | tail -10`
Expected: No type errors, all tests pass

- [ ] **Step 4: Commit**

```bash
git add lib/prompts.ts app/api/ai/weekly-review/route.ts
git commit -m "feat(mood): integrate mood data into AI weekly review"
```

---

### Task 10: Build & Verify

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run 2>&1 | tail -20`
Expected: All tests pass including new mood-store tests

- [ ] **Step 2: Build for production**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds with no errors

- [ ] **Step 3: Verify build artifacts**

Run: `ls .next/BUILD_ID && ls .next/prerender-manifest.json`
Expected: Both files exist

- [ ] **Step 4: Final commit (if any linting fixes needed)**

Only if linting/build revealed issues to fix.
