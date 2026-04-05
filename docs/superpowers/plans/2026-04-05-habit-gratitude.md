# 습관 트래커 & 감사 일기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add habit tracker (sub-tab in todo section) and gratitude journal (collapsible section in daily notes) to v-todo, with AI briefing integration.

**Architecture:** Two independent data stores (`habits.json`, `habit-logs.json`, `gratitude.json`) following the existing atomic-write store pattern. Habit tracker renders as a third tab ("습관") in the todo section. Gratitude journal embeds in DailyNoteView as a collapsible top section. Both feed into the AI briefing prompt.

**Tech Stack:** Next.js (App Router), React, TypeScript, file-based JSON storage, Gemini AI

---

## File Structure

**New files to create:**

- `lib/habit-store.ts` — Read/write `data/habits.json`
- `lib/habit-log-store.ts` — Read/write `data/habit-logs.json`
- `lib/gratitude-store.ts` — Read/write `data/gratitude.json`
- `app/api/habits/route.ts` — GET (list) / POST (create) habits
- `app/api/habits/[id]/route.ts` — PUT (update) / DELETE habits
- `app/api/habits/logs/route.ts` — GET (by date) / PUT (toggle) habit logs
- `app/api/gratitude/route.ts` — GET (by date) / PUT (save) gratitude entries
- `components/HabitView.tsx` — Habit tab full view (list + progress bar + input)
- `components/HabitItem.tsx` — Single habit row (checkbox + title + streak + heatmap accordion)
- `components/HabitHeatmap.tsx` — 12-week GitHub-style heatmap
- `components/AddHabitSheet.tsx` — Habit create/edit modal sheet
- `components/GratitudeSection.tsx` — Collapsible gratitude section for daily notes

**Files to modify:**

- `types/index.ts` — Add Habit, HabitLog, GratitudeEntry types
- `app/page.tsx` — Add habit tab, habit state, habit actions, integrate HabitView
- `components/DailyNoteView.tsx` — Embed GratitudeSection above editor
- `components/SectionTabs.tsx` — No changes needed (already generic)
- `lib/prompts.ts` — Add habit + gratitude sections to briefing prompt
- `app/api/ai/briefing/route.ts` — Fetch habits/logs/gratitude and pass to prompt

---

### Task 1: Type Definitions

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add habit and gratitude types to types/index.ts**

Add these types after the existing `WishStore` and related types (after line 152):

```typescript
// Habits
export type HabitRepeatMode = "daily" | "weekdays" | "interval";

export interface Habit {
  id: string;
  title: string;
  repeatMode: HabitRepeatMode;
  weekdays: number[];      // 0(일)~6(토), used when repeatMode === "weekdays"
  intervalDays: number;    // 2~7, used when repeatMode === "interval"
  createdAt: string;       // ISO 8601
}

export interface HabitStore {
  habits: Habit[];
}

export interface HabitLog {
  habitId: string;
  date: string;            // YYYY-MM-DD
  completed: boolean;
}

export interface HabitLogStore {
  logs: HabitLog[];
}

export interface CreateHabitRequest {
  title: string;
  repeatMode?: HabitRepeatMode;
  weekdays?: number[];
  intervalDays?: number;
}

export interface UpdateHabitRequest {
  title?: string;
  repeatMode?: HabitRepeatMode;
  weekdays?: number[];
  intervalDays?: number;
}

export const VALID_HABIT_REPEAT_MODES: HabitRepeatMode[] = ["daily", "weekdays", "interval"];

// Gratitude
export interface GratitudeEntry {
  date: string;            // YYYY-MM-DD
  items: [string, string, string];
}

export interface GratitudeStore {
  entries: GratitudeEntry[];
}
```

- [ ] **Step 2: Add "habit" to TodoTab type**

Currently `todoTab` is typed inline as `"now" | "soon"`. Add a `TodoTab` type:

```typescript
export type TodoTab = "now" | "soon" | "habit";
```

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat(types): add Habit, HabitLog, GratitudeEntry types"
```

---

### Task 2: Habit Store

**Files:**
- Create: `lib/habit-store.ts`

- [ ] **Step 1: Create habit-store.ts**

```typescript
import fs from "fs/promises";
import path from "path";
import type { Habit, HabitStore } from "@/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const HABIT_PATH = path.join(DATA_DIR, "habits.json");
const TMP_PATH = path.join(DATA_DIR, "habits.tmp.json");

export async function readHabits(): Promise<Habit[]> {
  try {
    const raw = await fs.readFile(HABIT_PATH, "utf-8");
    const parsed: HabitStore = JSON.parse(raw);
    return parsed.habits;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(HABIT_PATH, JSON.stringify({ habits: [] }));
      return [];
    }
    console.error("Failed to parse habits.json, resetting:", err);
    await fs.writeFile(HABIT_PATH, JSON.stringify({ habits: [] }));
    return [];
  }
}

export async function writeHabits(habits: Habit[]): Promise<void> {
  const data: HabitStore = { habits };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(data, null, 2));
  await fs.rename(TMP_PATH, HABIT_PATH);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/habit-store.ts
git commit -m "feat(store): add habit store with atomic writes"
```

---

### Task 3: Habit Log Store

**Files:**
- Create: `lib/habit-log-store.ts`

- [ ] **Step 1: Create habit-log-store.ts**

```typescript
import fs from "fs/promises";
import path from "path";
import type { HabitLog, HabitLogStore } from "@/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const LOG_PATH = path.join(DATA_DIR, "habit-logs.json");
const TMP_PATH = path.join(DATA_DIR, "habit-logs.tmp.json");

export async function readHabitLogs(): Promise<HabitLog[]> {
  try {
    const raw = await fs.readFile(LOG_PATH, "utf-8");
    const parsed: HabitLogStore = JSON.parse(raw);
    return parsed.logs;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(LOG_PATH, JSON.stringify({ logs: [] }));
      return [];
    }
    console.error("Failed to parse habit-logs.json, resetting:", err);
    await fs.writeFile(LOG_PATH, JSON.stringify({ logs: [] }));
    return [];
  }
}

export async function writeHabitLogs(logs: HabitLog[]): Promise<void> {
  const data: HabitLogStore = { logs };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(data, null, 2));
  await fs.rename(TMP_PATH, LOG_PATH);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/habit-log-store.ts
git commit -m "feat(store): add habit log store"
```

---

### Task 4: Gratitude Store

**Files:**
- Create: `lib/gratitude-store.ts`

- [ ] **Step 1: Create gratitude-store.ts**

```typescript
import fs from "fs/promises";
import path from "path";
import type { GratitudeEntry, GratitudeStore } from "@/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const GRATITUDE_PATH = path.join(DATA_DIR, "gratitude.json");
const TMP_PATH = path.join(DATA_DIR, "gratitude.tmp.json");

export async function readGratitudeEntries(): Promise<GratitudeEntry[]> {
  try {
    const raw = await fs.readFile(GRATITUDE_PATH, "utf-8");
    const parsed: GratitudeStore = JSON.parse(raw);
    return parsed.entries;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(GRATITUDE_PATH, JSON.stringify({ entries: [] }));
      return [];
    }
    console.error("Failed to parse gratitude.json, resetting:", err);
    await fs.writeFile(GRATITUDE_PATH, JSON.stringify({ entries: [] }));
    return [];
  }
}

export async function writeGratitudeEntries(entries: GratitudeEntry[]): Promise<void> {
  const data: GratitudeStore = { entries };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(data, null, 2));
  await fs.rename(TMP_PATH, GRATITUDE_PATH);
}

export async function readGratitudeByDate(date: string): Promise<GratitudeEntry | null> {
  const entries = await readGratitudeEntries();
  return entries.find((e) => e.date === date) ?? null;
}

export async function writeGratitudeByDate(date: string, items: [string, string, string]): Promise<GratitudeEntry> {
  const entries = await readGratitudeEntries();
  const hasContent = items.some((item) => item.trim().length > 0);

  if (!hasContent) {
    // Remove entry if all empty
    const filtered = entries.filter((e) => e.date !== date);
    if (filtered.length !== entries.length) {
      await writeGratitudeEntries(filtered);
    }
    return { date, items };
  }

  const index = entries.findIndex((e) => e.date === date);
  const entry: GratitudeEntry = { date, items };
  if (index >= 0) {
    entries[index] = entry;
  } else {
    entries.push(entry);
  }
  await writeGratitudeEntries(entries);
  return entry;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/gratitude-store.ts
git commit -m "feat(store): add gratitude store with date-based read/write"
```

---

### Task 5: Habits API (GET/POST)

**Files:**
- Create: `app/api/habits/route.ts`

- [ ] **Step 1: Create habits route.ts**

```typescript
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readHabits, writeHabits } from "@/lib/habit-store";
import type { CreateHabitRequest, Habit, ApiResponse, HabitRepeatMode, VALID_HABIT_REPEAT_MODES } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<Habit[]>>> {
  try {
    const habits = await readHabits();
    return NextResponse.json({ data: habits });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<Habit>>> {
  try {
    const body: CreateHabitRequest = await request.json();

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
    }
    if (body.title.trim().length === 0 || body.title.length > 100) {
      return NextResponse.json({ error: "제목은 1~100자여야 합니다." }, { status: 400 });
    }

    const repeatMode: HabitRepeatMode = body.repeatMode ?? "daily";
    if (!["daily", "weekdays", "interval"].includes(repeatMode)) {
      return NextResponse.json({ error: "유효하지 않은 반복 모드입니다." }, { status: 400 });
    }

    let weekdays: number[] = [];
    let intervalDays = 2;

    if (repeatMode === "weekdays") {
      weekdays = Array.isArray(body.weekdays)
        ? body.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        : [];
      if (weekdays.length === 0) {
        return NextResponse.json({ error: "요일을 하나 이상 선택해주세요." }, { status: 400 });
      }
    } else if (repeatMode === "interval") {
      intervalDays = body.intervalDays ?? 2;
      if (!Number.isInteger(intervalDays) || intervalDays < 2 || intervalDays > 7) {
        return NextResponse.json({ error: "간격은 2~7일이어야 합니다." }, { status: 400 });
      }
    }

    const habit: Habit = {
      id: uuidv4(),
      title: body.title.trim(),
      repeatMode,
      weekdays,
      intervalDays,
      createdAt: new Date().toISOString(),
    };

    const habits = await readHabits();
    habits.push(habit);
    await writeHabits(habits);

    return NextResponse.json({ data: habit }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/habits/route.ts
git commit -m "feat(api): add GET/POST /api/habits"
```

---

### Task 6: Habits API (PUT/DELETE)

**Files:**
- Create: `app/api/habits/[id]/route.ts`

- [ ] **Step 1: Create habits [id] route.ts**

```typescript
import { NextResponse } from "next/server";
import { readHabits, writeHabits } from "@/lib/habit-store";
import { readHabitLogs, writeHabitLogs } from "@/lib/habit-log-store";
import type { UpdateHabitRequest, Habit, ApiResponse } from "@/types";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Habit>>> {
  try {
    const { id } = await params;
    const body: UpdateHabitRequest = await request.json();
    const habits = await readHabits();
    const index = habits.findIndex((h) => h.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "습관을 찾을 수 없습니다." }, { status: 404 });
    }

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim().length === 0 || body.title.length > 100) {
        return NextResponse.json({ error: "제목은 1~100자여야 합니다." }, { status: 400 });
      }
      habits[index].title = body.title.trim();
    }

    if (body.repeatMode !== undefined) {
      if (!["daily", "weekdays", "interval"].includes(body.repeatMode)) {
        return NextResponse.json({ error: "유효하지 않은 반복 모드입니다." }, { status: 400 });
      }
      habits[index].repeatMode = body.repeatMode;
    }

    if (body.weekdays !== undefined) {
      habits[index].weekdays = Array.isArray(body.weekdays)
        ? body.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        : [];
    }

    if (body.intervalDays !== undefined) {
      if (Number.isInteger(body.intervalDays) && body.intervalDays >= 2 && body.intervalDays <= 7) {
        habits[index].intervalDays = body.intervalDays;
      }
    }

    await writeHabits(habits);
    return NextResponse.json({ data: habits[index] });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params;
    const habits = await readHabits();
    const index = habits.findIndex((h) => h.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "습관을 찾을 수 없습니다." }, { status: 404 });
    }

    habits.splice(index, 1);
    await writeHabits(habits);

    // Also clean up logs for this habit
    const logs = await readHabitLogs();
    const filtered = logs.filter((l) => l.habitId !== id);
    if (filtered.length !== logs.length) {
      await writeHabitLogs(filtered);
    }

    return NextResponse.json({ data: null });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/habits/[id]/route.ts
git commit -m "feat(api): add PUT/DELETE /api/habits/[id]"
```

---

### Task 7: Habit Logs API

**Files:**
- Create: `app/api/habits/logs/route.ts`

- [ ] **Step 1: Create habit logs route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { readHabitLogs, writeHabitLogs } from "@/lib/habit-log-store";
import type { HabitLog, ApiResponse } from "@/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<HabitLog[]>>> {
  try {
    const date = request.nextUrl.searchParams.get("date");
    if (!date || !DATE_RE.test(date)) {
      return NextResponse.json(
        { error: "유효한 날짜를 입력해주세요. (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    const logs = await readHabitLogs();
    const dayLogs = logs.filter((l) => l.date === date);
    return NextResponse.json({ data: dayLogs });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest
): Promise<NextResponse<ApiResponse<HabitLog>>> {
  try {
    const body = await request.json();
    const { habitId, date, completed } = body;

    if (!habitId || typeof habitId !== "string") {
      return NextResponse.json({ error: "습관 ID가 필요합니다." }, { status: 400 });
    }
    if (!date || !DATE_RE.test(date)) {
      return NextResponse.json({ error: "유효한 날짜를 입력해주세요." }, { status: 400 });
    }

    const logs = await readHabitLogs();
    const index = logs.findIndex((l) => l.habitId === habitId && l.date === date);

    if (completed) {
      if (index >= 0) {
        logs[index].completed = true;
      } else {
        logs.push({ habitId, date, completed: true });
      }
    } else {
      if (index >= 0) {
        logs.splice(index, 1);
      }
    }

    await writeHabitLogs(logs);
    const result: HabitLog = { habitId, date, completed: !!completed };
    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/habits/logs/route.ts
git commit -m "feat(api): add GET/PUT /api/habits/logs"
```

---

### Task 8: Gratitude API

**Files:**
- Create: `app/api/gratitude/route.ts`

- [ ] **Step 1: Create gratitude route.ts**

```typescript
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
    const items = Array.isArray(body.items) ? body.items : ["", "", ""];

    // Ensure exactly 3 items, each a string
    const sanitized: [string, string, string] = [
      typeof items[0] === "string" ? items[0].slice(0, 200) : "",
      typeof items[1] === "string" ? items[1].slice(0, 200) : "",
      typeof items[2] === "string" ? items[2].slice(0, 200) : "",
    ];

    const entry = await writeGratitudeByDate(date, sanitized);
    return NextResponse.json({ data: entry });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/gratitude/route.ts
git commit -m "feat(api): add GET/PUT /api/gratitude"
```

---

### Task 9: HabitHeatmap Component

**Files:**
- Create: `components/HabitHeatmap.tsx`

- [ ] **Step 1: Create HabitHeatmap.tsx**

This component renders a 12-week (84 day) GitHub-style contribution heatmap for a single habit.

```typescript
"use client";

import type { Habit, HabitLog } from "@/types";

interface HabitHeatmapProps {
  habit: Habit;
  logs: HabitLog[];
  bestStreak: number;
}

function isScheduledDay(date: Date, habit: Habit, createdDate: Date): boolean {
  if (date < createdDate) return false;
  if (habit.repeatMode === "daily") return true;
  if (habit.repeatMode === "weekdays") return habit.weekdays.includes(date.getDay());
  if (habit.repeatMode === "interval") {
    const diffMs = date.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays % habit.intervalDays === 0;
  }
  return false;
}

export default function HabitHeatmap({ habit, logs, bestStreak }: HabitHeatmapProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const createdDate = new Date(habit.createdAt);
  createdDate.setHours(0, 0, 0, 0);

  // Build 12 weeks of data (84 days ending today)
  const days: { date: Date; dateStr: string; scheduled: boolean; completed: boolean }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const scheduled = isScheduledDay(d, habit, createdDate);
    const completed = logs.some((l) => l.habitId === habit.id && l.date === dateStr && l.completed);
    days.push({ date: d, dateStr, scheduled, completed });
  }

  // Group by week (columns), each column has 7 rows (Sun=0 to Sat=6)
  const weeks: (typeof days[number] | null)[][] = [];
  let currentWeek: (typeof days[number] | null)[] = Array(7).fill(null);

  for (const day of days) {
    const dow = day.date.getDay();
    if (dow === 0 && currentWeek.some((d) => d !== null)) {
      weeks.push(currentWeek);
      currentWeek = Array(7).fill(null);
    }
    currentWeek[dow] = day;
  }
  weeks.push(currentWeek);

  const cellSize = 12;
  const gap = 3;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] text-[var(--label-tertiary)]">최근 12주</span>
        <span className="text-[13px] text-[var(--label-tertiary)]">
          최장 연속 <span className="font-semibold text-[var(--sys-orange)]">{bestStreak}일</span>
        </span>
      </div>
      <div className="flex gap-[3px] overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <div
                key={di}
                className="rounded-[2px]"
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: day === null
                    ? "transparent"
                    : !day.scheduled
                      ? "var(--fill-quaternary)"
                      : day.completed
                        ? "var(--accent-primary)"
                        : "var(--fill-tertiary)",
                  opacity: day === null ? 0 : day.scheduled && day.completed ? 1 : day.scheduled ? 0.4 : 0.2,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/HabitHeatmap.tsx
git commit -m "feat(ui): add HabitHeatmap component (12-week grid)"
```

---

### Task 10: HabitItem Component

**Files:**
- Create: `components/HabitItem.tsx`

- [ ] **Step 1: Create HabitItem.tsx**

```typescript
"use client";

import { useState, useRef, useCallback } from "react";
import type { Habit, HabitLog } from "@/types";
import HabitHeatmap from "@/components/HabitHeatmap";

interface HabitItemProps {
  habit: Habit;
  logs: HabitLog[];
  todayCompleted: boolean;
  streak: number;
  bestStreak: number;
  onToggle: (habitId: string, completed: boolean) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
}

export default function HabitItem({
  habit,
  logs,
  todayCompleted,
  streak,
  bestStreak,
  onToggle,
  onEdit,
  onDelete,
}: HabitItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [checking, setChecking] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const didLongPress = useRef(false);

  const handleToggle = () => {
    setChecking(true);
    setTimeout(() => {
      onToggle(habit.id, !todayCompleted);
      setChecking(false);
    }, 300);
  };

  const handleTap = () => {
    if (didLongPress.current) return;
    setExpanded((prev) => !prev);
  };

  const onTouchStart = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onEdit(habit);
    }, 500);
  };

  const onTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div className="bg-[var(--sys-bg-elevated)] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 md:px-5 group">
        {/* Checkbox — 44pt tap target */}
        <button
          className="w-11 h-11 flex items-center justify-center flex-shrink-0"
          onClick={handleToggle}
        >
          <span
            className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
              todayCompleted || checking
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] scale-95"
                : "border-[var(--sys-gray)] hover:border-[var(--accent-primary)]"
            }`}
          >
            {(todayCompleted || checking) && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <polyline
                  points="2 6 5 9 10 3"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </button>

        {/* Content — tap to expand, long-press to edit */}
        <div
          className="flex-1 flex items-center min-h-[56px] py-3.5 cursor-pointer"
          onClick={handleTap}
          onDoubleClick={() => onEdit(habit)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchMove}
        >
          <span className={`flex-1 text-[20px] leading-[26px] ${
            todayCompleted
              ? "text-[var(--label-tertiary)]"
              : "text-[var(--label-primary)]"
          }`}>
            {habit.title}
          </span>

          {/* Streak badge */}
          {streak > 0 && (
            <span className="flex items-center gap-1 text-[15px] text-[var(--sys-orange)] ml-3 flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="var(--sys-orange)">
                <path d="M7 0C7 0 3 5 3 8.5C3 10.7 4.8 12.5 7 12.5S11 10.7 11 8.5C11 5 7 0 7 0Z" />
              </svg>
              {streak}
            </span>
          )}

          {/* Chevron */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="var(--label-quaternary)"
            strokeWidth="2"
            strokeLinecap="round"
            className={`ml-2 flex-shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="4 6 8 10 12 6" />
          </svg>
        </div>

        {/* Delete — 44pt tap target */}
        <button
          className="w-11 h-11 flex items-center justify-center flex-shrink-0 text-[var(--label-quaternary)] md:opacity-0 md:group-hover:opacity-100 active:text-[var(--system-red)] transition-all"
          onClick={() => onDelete(habit.id)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="4" y1="4" x2="12" y2="12" />
            <line x1="12" y1="4" x2="4" y2="12" />
          </svg>
        </button>
      </div>

      {/* Heatmap accordion */}
      <div
        className={`transition-all duration-200 overflow-hidden ${expanded ? "max-h-[300px]" : "max-h-0"}`}
      >
        <div className="border-t border-[var(--separator)]">
          <HabitHeatmap habit={habit} logs={logs} bestStreak={bestStreak} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/HabitItem.tsx
git commit -m "feat(ui): add HabitItem component with streak and heatmap accordion"
```

---

### Task 11: AddHabitSheet Component

**Files:**
- Create: `components/AddHabitSheet.tsx`

- [ ] **Step 1: Create AddHabitSheet.tsx**

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import type { Habit, HabitRepeatMode } from "@/types";

interface AddHabitSheetProps {
  habit: Habit | null;
  onSave: (data: { title: string; repeatMode: HabitRepeatMode; weekdays: number[]; intervalDays: number }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export default function AddHabitSheet({ habit, onSave, onDelete, onClose }: AddHabitSheetProps) {
  const [title, setTitle] = useState(habit?.title ?? "");
  const [repeatMode, setRepeatMode] = useState<HabitRepeatMode>(habit?.repeatMode ?? "daily");
  const [weekdays, setWeekdays] = useState<number[]>(habit?.weekdays ?? []);
  const [intervalDays, setIntervalDays] = useState(habit?.intervalDays ?? 2);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), repeatMode, weekdays, intervalDays });
  };

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full md:max-w-[420px] bg-[var(--bg-elevated)] rounded-t-2xl md:rounded-2xl p-6 pb-8 safe-area-pb animate-sheetUp">
        <h2 className="text-[20px] font-bold text-[var(--label-primary)] mb-6">
          {habit ? "습관 편집" : "새 습관"}
        </h2>

        {/* Title */}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="습관 이름"
          maxLength={100}
          className="w-full px-4 py-3 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] outline-none mb-5"
        />

        {/* Repeat Mode */}
        <div className="mb-4">
          <span className="text-[15px] font-medium text-[var(--label-secondary)] mb-2 block">반복 주기</span>
          <div className="flex gap-2">
            {(["daily", "weekdays", "interval"] as const).map((mode) => (
              <button
                key={mode}
                className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
                  repeatMode === mode
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--fill-quaternary)] text-[var(--label-secondary)]"
                }`}
                onClick={() => setRepeatMode(mode)}
              >
                {mode === "daily" ? "매일" : mode === "weekdays" ? "요일" : "간격"}
              </button>
            ))}
          </div>
        </div>

        {/* Weekday selector */}
        {repeatMode === "weekdays" && (
          <div className="flex gap-2 mb-5">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
                  weekdays.includes(i)
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--fill-quaternary)] text-[var(--label-secondary)]"
                }`}
                onClick={() => toggleWeekday(i)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Interval selector */}
        {repeatMode === "interval" && (
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[17px] text-[var(--label-primary)]">매</span>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  className={`w-11 h-11 rounded-xl text-[17px] font-medium transition-colors ${
                    intervalDays === n
                      ? "bg-[var(--accent-primary)] text-white"
                      : "bg-[var(--fill-quaternary)] text-[var(--label-secondary)]"
                  }`}
                  onClick={() => setIntervalDays(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className="text-[17px] text-[var(--label-primary)]">일마다</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {habit && onDelete && (
            <button
              className="flex-1 py-3.5 rounded-xl bg-[var(--system-red)]/10 text-[var(--system-red)] text-[17px] font-semibold"
              onClick={() => onDelete(habit.id)}
            >
              삭제
            </button>
          )}
          <button
            className={`flex-1 py-3.5 rounded-xl text-[17px] font-semibold transition-opacity ${
              title.trim()
                ? "bg-[var(--accent-primary)] text-white"
                : "bg-[var(--fill-tertiary)] text-[var(--label-quaternary)]"
            }`}
            onClick={handleSave}
            disabled={!title.trim()}
          >
            {habit ? "저장" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/AddHabitSheet.tsx
git commit -m "feat(ui): add AddHabitSheet component with repeat mode selection"
```

---

### Task 12: HabitView Component

**Files:**
- Create: `components/HabitView.tsx`

- [ ] **Step 1: Create HabitView.tsx**

This is the main view for the habit tab. It manages fetching, rendering, and local state for habits.

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Habit, HabitLog, HabitRepeatMode } from "@/types";
import HabitItem from "@/components/HabitItem";
import AddHabitSheet from "@/components/AddHabitSheet";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isScheduledDay(date: Date, habit: Habit): boolean {
  const created = new Date(habit.createdAt);
  created.setHours(0, 0, 0, 0);
  if (date < created) return false;
  if (habit.repeatMode === "daily") return true;
  if (habit.repeatMode === "weekdays") return habit.weekdays.includes(date.getDay());
  if (habit.repeatMode === "interval") {
    const diffMs = date.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays % habit.intervalDays === 0;
  }
  return false;
}

function calcStreak(habit: Habit, logs: HabitLog[]): number {
  const habitLogs = new Set(
    logs.filter((l) => l.habitId === habit.id && l.completed).map((l) => l.date)
  );
  const created = new Date(habit.createdAt);
  created.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let streak = 0;

  // Start from yesterday (today can still be completed)
  const d = new Date(now);
  d.setDate(d.getDate() - 1);

  while (d >= created) {
    if (!isScheduledDay(d, habit)) {
      d.setDate(d.getDate() - 1);
      continue;
    }
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (habitLogs.has(ds)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  // Check if today is scheduled and completed → add to streak
  if (isScheduledDay(now, habit)) {
    const todayS = todayStr();
    if (habitLogs.has(todayS)) {
      streak++;
    }
  }

  return streak;
}

function calcBestStreak(habit: Habit, logs: HabitLog[]): number {
  const habitLogs = new Set(
    logs.filter((l) => l.habitId === habit.id && l.completed).map((l) => l.date)
  );
  const created = new Date(habit.createdAt);
  created.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let best = 0;
  let current = 0;
  const d = new Date(created);

  while (d <= now) {
    if (!isScheduledDay(d, habit)) {
      d.setDate(d.getDate() + 1);
      continue;
    }
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (habitLogs.has(ds)) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
    d.setDate(d.getDate() + 1);
  }

  return best;
}

export default function HabitView() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [allLogs, setAllLogs] = useState<HabitLog[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);

  const fetchHabits = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/habits`);
      const body = await res.json();
      if (body.data) setHabits(body.data);
    } catch (err) {
      console.error("Failed to fetch habits:", err);
    }
  }, []);

  const fetchAllLogs = useCallback(async () => {
    try {
      // Fetch all logs (no date filter) for streak/heatmap calculation
      // We'll add a special endpoint or fetch without date param
      const res = await fetch(`${BASE}/api/habits/logs?date=all`);
      const body = await res.json();
      if (body.data) setAllLogs(body.data);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
    fetchAllLogs();
  }, [fetchHabits, fetchAllLogs]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDate = todayStr();

  const todayHabits = habits.filter((h) => isScheduledDay(today, h));
  const completedCount = todayHabits.filter((h) =>
    allLogs.some((l) => l.habitId === h.id && l.date === todayDate && l.completed)
  ).length;
  const progress = todayHabits.length > 0 ? completedCount / todayHabits.length : 0;

  const toggleHabit = async (habitId: string, completed: boolean) => {
    // Optimistic update
    if (completed) {
      setAllLogs((prev) => [...prev, { habitId, date: todayDate, completed: true }]);
    } else {
      setAllLogs((prev) => prev.filter((l) => !(l.habitId === habitId && l.date === todayDate)));
    }

    try {
      await fetch(`${BASE}/api/habits/logs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, date: todayDate, completed }),
      });
    } catch (err) {
      console.error("Failed to toggle habit:", err);
      fetchAllLogs();
    }
  };

  const saveHabit = async (data: {
    title: string;
    repeatMode: HabitRepeatMode;
    weekdays: number[];
    intervalDays: number;
  }) => {
    try {
      if (editHabit) {
        const res = await fetch(`${BASE}/api/habits/${editHabit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = await res.json();
        if (body.data) {
          setHabits((prev) => prev.map((h) => (h.id === editHabit.id ? body.data : h)));
        }
      } else {
        const res = await fetch(`${BASE}/api/habits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = await res.json();
        if (body.data) setHabits((prev) => [...prev, body.data]);
      }
    } catch (err) {
      console.error("Failed to save habit:", err);
    }
    setShowSheet(false);
    setEditHabit(null);
  };

  const deleteHabit = async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setAllLogs((prev) => prev.filter((l) => l.habitId !== id));
    await fetch(`${BASE}/api/habits/${id}`, { method: "DELETE" });
    setShowSheet(false);
    setEditHabit(null);
  };

  return (
    <>
      {/* Progress bar */}
      <div className="mx-5 md:mx-0 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[15px] text-[var(--label-secondary)]">
            오늘 {completedCount}/{todayHabits.length}
          </span>
          <span className="text-[15px] font-semibold text-[var(--accent-primary)]">
            {todayHabits.length > 0 ? Math.round(progress * 100) : 0}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--fill-tertiary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Habit list */}
      {todayHabits.length === 0 && habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--label-tertiary)]">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-5 opacity-30">
            <path d="M28 8C28 8 16 22 16 32C16 38.6 21.4 44 28 44S40 38.6 40 32C40 22 28 8 28 8Z" />
          </svg>
          <p className="text-[20px]">반복하는 습관을 등록해 보세요</p>
          <p className="text-[15px] text-[var(--label-quaternary)] mt-1.5">
            매일, 특정 요일, 또는 N일마다 반복할 수 있습니다
          </p>
        </div>
      ) : (
        <div className="mx-5 md:mx-0 flex flex-col gap-2.5">
          {todayHabits.map((habit) => {
            const todayCompleted = allLogs.some(
              (l) => l.habitId === habit.id && l.date === todayDate && l.completed
            );
            return (
              <HabitItem
                key={habit.id}
                habit={habit}
                logs={allLogs}
                todayCompleted={todayCompleted}
                streak={calcStreak(habit, allLogs)}
                bestStreak={calcBestStreak(habit, allLogs)}
                onToggle={toggleHabit}
                onEdit={(h) => { setEditHabit(h); setShowSheet(true); }}
                onDelete={deleteHabit}
              />
            );
          })}

          {/* Show non-today habits in a dimmed section */}
          {habits.filter((h) => !isScheduledDay(today, h)).length > 0 && (
            <>
              <div className="mt-4 mb-1 px-1">
                <span className="text-[13px] text-[var(--label-tertiary)]">오늘 아닌 습관</span>
              </div>
              {habits
                .filter((h) => !isScheduledDay(today, h))
                .map((habit) => (
                  <div key={habit.id} className="opacity-50">
                    <HabitItem
                      habit={habit}
                      logs={allLogs}
                      todayCompleted={false}
                      streak={calcStreak(habit, allLogs)}
                      bestStreak={calcBestStreak(habit, allLogs)}
                      onToggle={() => {}}
                      onEdit={(h) => { setEditHabit(h); setShowSheet(true); }}
                      onDelete={deleteHabit}
                    />
                  </div>
                ))}
            </>
          )}
        </div>
      )}

      {/* Add button */}
      <div className="mx-5 md:mx-0 mt-4">
        <button
          className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold active:opacity-80 transition-opacity"
          onClick={() => {
            setEditHabit(null);
            setShowSheet(true);
          }}
        >
          새 습관 추가
        </button>
      </div>

      {showSheet && (
        <AddHabitSheet
          habit={editHabit}
          onSave={saveHabit}
          onDelete={editHabit ? deleteHabit : undefined}
          onClose={() => { setShowSheet(false); setEditHabit(null); }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Update habit logs API to support "all" date query**

In `app/api/habits/logs/route.ts`, update the GET handler to return all logs when `date=all`:

Replace the GET function body with:

```typescript
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<HabitLog[]>>> {
  try {
    const date = request.nextUrl.searchParams.get("date");
    if (!date) {
      return NextResponse.json(
        { error: "유효한 날짜를 입력해주세요. (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const logs = await readHabitLogs();

    if (date === "all") {
      return NextResponse.json({ data: logs });
    }

    if (!DATE_RE.test(date)) {
      return NextResponse.json(
        { error: "유효한 날짜를 입력해주세요. (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const dayLogs = logs.filter((l) => l.date === date);
    return NextResponse.json({ data: dayLogs });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/HabitView.tsx app/api/habits/logs/route.ts
git commit -m "feat(ui): add HabitView with progress bar, streak calc, and log fetching"
```

---

### Task 13: GratitudeSection Component

**Files:**
- Create: `components/GratitudeSection.tsx`

- [ ] **Step 1: Create GratitudeSection.tsx**

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface GratitudeSectionProps {
  date: string; // YYYY-MM-DD
}

export default function GratitudeSection({ date }: GratitudeSectionProps) {
  const [items, setItems] = useState<[string, string, string]>(["", "", ""]);
  const [expanded, setExpanded] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const itemsRef = useRef<[string, string, string]>(["", "", ""]);
  const dirtyRef = useRef(false);
  const dateRef = useRef(date);

  const fetchGratitude = useCallback(async (d: string) => {
    dateRef.current = d;
    try {
      const res = await fetch(`${BASE}/api/gratitude?date=${d}`);
      const body = await res.json();
      const entry = body.data;
      const loaded: [string, string, string] = entry?.items ?? ["", "", ""];
      setItems(loaded);
      itemsRef.current = loaded;
      dirtyRef.current = false;
      const hasContent = loaded.some((s: string) => s.trim().length > 0);
      setSaveStatus(hasContent ? "saved" : "idle");
      setExpanded(!hasContent);
    } catch {
      setItems(["", "", ""]);
      itemsRef.current = ["", "", ""];
    }
  }, []);

  const saveGratitude = useCallback(async () => {
    if (!dirtyRef.current) return;
    setSaveStatus("saving");
    try {
      await fetch(`${BASE}/api/gratitude?date=${dateRef.current}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsRef.current }),
      });
      dirtyRef.current = false;
      setSaveStatus("saved");
    } catch {
      setSaveStatus("saved");
    }
  }, []);

  useEffect(() => {
    fetchGratitude(date);
  }, [date, fetchGratitude]);

  // Save on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) saveGratitude();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      saveGratitude();
    };
  }, [saveGratitude]);

  const handleChange = (index: number, value: string) => {
    const updated: [string, string, string] = [...items] as [string, string, string];
    updated[index] = value;
    setItems(updated);
    itemsRef.current = updated;
    dirtyRef.current = true;
    setSaveStatus("saving");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveGratitude();
    }, 1000);
  };

  const filledCount = items.filter((s) => s.trim().length > 0).length;

  return (
    <div className="mx-5 md:mx-0 mb-3">
      <div className="bg-[var(--sys-bg-elevated)] rounded-xl overflow-hidden">
        {/* Header — tap to toggle */}
        <button
          className="w-full flex items-center justify-between px-4 py-3"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="var(--sys-orange)">
              <path d="M9 1.5l2 4.1 4.5.7-3.3 3.2.8 4.5L9 11.8 5 14l.8-4.5L2.5 6.3l4.5-.7L9 1.5z" />
            </svg>
            <span className="text-[17px] font-semibold text-[var(--label-primary)]">오늘의 감사</span>
          </div>
          <div className="flex items-center gap-2">
            {!expanded && (
              <span className="text-[13px] text-[var(--label-tertiary)]">
                {filledCount > 0 ? `${filledCount}/3 작성됨` : "아직 작성하지 않았어요"}
              </span>
            )}
            {saveStatus === "saving" && (
              <span className="text-[13px] text-[var(--label-tertiary)]">저장 중...</span>
            )}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="var(--label-quaternary)"
              strokeWidth="2"
              strokeLinecap="round"
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            >
              <polyline points="4 6 8 10 12 6" />
            </svg>
          </div>
        </button>

        {/* Content */}
        <div className={`transition-all duration-200 overflow-hidden ${expanded ? "max-h-[240px]" : "max-h-0"}`}>
          <div className="px-4 pb-4 flex flex-col gap-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--fill-quaternary)] text-[13px] font-semibold text-[var(--label-tertiary)] flex-shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={items[i]}
                  onChange={(e) => handleChange(i, e.target.value)}
                  placeholder="감사한 것을 적어보세요"
                  maxLength={200}
                  className="flex-1 bg-[var(--fill-quaternary)] rounded-lg px-3 py-2.5 text-[17px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/GratitudeSection.tsx
git commit -m "feat(ui): add GratitudeSection with collapsible 3-field input"
```

---

### Task 14: Integrate GratitudeSection into DailyNoteView

**Files:**
- Modify: `components/DailyNoteView.tsx`

- [ ] **Step 1: Add GratitudeSection import and render above editor**

Add import at top of file (after existing imports, line 4):

```typescript
import GratitudeSection from "@/components/GratitudeSection";
```

In the `dateToString` function already exists. We need to pass the date string to GratitudeSection. In the return JSX, add the GratitudeSection between the save status indicator and the NoteEditor.

Replace the return block (lines 100-117) with:

```typescript
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DateNavigator date={date} onChange={handleDateChange} />
      {saveStatus !== "idle" && (
        <div className="px-5 md:px-0 -mt-1 mb-1 text-right">
          <span className="text-[13px] text-[var(--label-tertiary)]">
            {saveStatus === "saving" ? "저장 중..." : "저장됨"}
          </span>
        </div>
      )}
      <GratitudeSection date={dateToString(date)} />
      <NoteEditor
        content={content}
        onChange={handleChange}
        placeholder="오늘의 노트를 작성하세요..."
      />
    </div>
  );
```

- [ ] **Step 2: Commit**

```bash
git add components/DailyNoteView.tsx
git commit -m "feat(ui): integrate GratitudeSection into DailyNoteView"
```

---

### Task 15: Integrate HabitView into page.tsx

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add imports**

Add at top of file (after existing imports):

```typescript
import HabitView from "@/components/HabitView";
import type { TodoTab } from "@/types";
```

- [ ] **Step 2: Update todoTab state type**

Replace line 25:
```typescript
const [todoTab, setTodoTab] = useState<"now" | "soon">("now");
```
with:
```typescript
const [todoTab, setTodoTab] = useState<TodoTab>("now");
```

- [ ] **Step 3: Add habit tab count**

After `soonCount` definition (line 342), add:

```typescript
const habitCount = 0; // HabitView manages its own data, count shown in tab label is optional
```

- [ ] **Step 4: Update SectionTabs for todo section**

Replace the todo SectionTabs block (lines 574-581) with:

```typescript
          <SectionTabs
            tabs={[
              { key: "now", label: `지금${nowCount > 0 ? ` ${nowCount}` : ""}` },
              { key: "soon", label: `곧${soonCount > 0 ? ` ${soonCount}` : ""}` },
              { key: "habit", label: "습관" },
            ]}
            active={todoTab}
            onChange={(key) => setTodoTab(key as TodoTab)}
          />
```

- [ ] **Step 5: Add HabitView to content area**

In the Content section, find the todo section rendering (around line 624). After the closing `</>` of the todo conditional block and before the dday section `(`, add the habit tab condition.

Replace the todo section block (lines 624-659) with:

```typescript
          ) : section === "todo" && todoTab === "habit" ? (
            <HabitView />
          ) : section === "todo" ? (
            <>
              {filteredTodos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-[var(--label-tertiary)]">
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-5 opacity-30">
                    <rect x="10" y="10" width="36" height="36" rx="8" />
                    <path d="M20 28l6 6 10-10" />
                  </svg>
                  <p className="text-[20px]">
                    {todoTab === "now" ? "할 일을 추가해보세요" : "곧 처리할 일이 없습니다"}
                  </p>
                  <p className="text-[15px] text-[var(--label-quaternary)] mt-1.5">
                    {todoTab === "now"
                      ? "3일 이내에 완료하지 않으면 '곧'으로 이동합니다"
                      : "3일 동안 미처리된 할 일이 여기에 표시됩니다"}
                  </p>
                </div>
              ) : (
                <div className="mx-5 md:mx-0 flex flex-col gap-2.5">
                  {filteredTodos.map((todo) => (
                    <div key={todo.id} className="bg-[var(--sys-bg-elevated)] rounded-xl overflow-hidden">
                      <TodoItem
                        todo={todo}
                        onToggle={toggleTodo}
                        onDelete={deleteTodo}
                        onEdit={editTodo}
                      />
                    </div>
                  ))}
                </div>
              )}
              {todoTab === "now" && (
                <div className="mx-5 md:mx-0 mt-2.5">
                  <TodoInput onAdd={addTodo} />
                </div>
              )}
            </>
```

- [ ] **Step 6: Update swipe handler**

Replace the todo section of handleSwipe (lines 491-493) with:

```typescript
    if (section === "todo") {
      const tabs: TodoTab[] = ["now", "soon", "habit"];
      const idx = tabs.indexOf(todoTab);
      if (dir === "left" && idx < tabs.length - 1) setTodoTab(tabs[idx + 1]);
      if (dir === "right" && idx > 0) setTodoTab(tabs[idx - 1]);
    }
```

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx
git commit -m "feat(ui): integrate HabitView as third tab in todo section"
```

---

### Task 16: AI Briefing Integration

**Files:**
- Modify: `lib/prompts.ts`
- Modify: `app/api/ai/briefing/route.ts`

- [ ] **Step 1: Update buildBriefingPrompt signature and content**

In `lib/prompts.ts`, add imports at top (after existing imports):

```typescript
import type { Todo, Schedule, Habit } from "@/types";
```

Update `buildBriefingPrompt` to accept new params. Replace the function signature (line 11) and add new sections to the prompt:

```typescript
export function buildBriefingPrompt(
  todos: Todo[],
  schedules: Schedule[],
  todayNote?: string,
  yesterdayNote?: string,
  yesterdayDate?: string,
  habits?: { title: string; streak: number }[],
  yesterdayGratitude?: string[],
): string {
```

Before the final prompt return string (before `위 내용을 종합하여`), add:

```typescript
  const habitSection = habits && habits.length > 0
    ? `\n## 오늘의 습관\n${habits.map((h) => `- ${h.title} (${h.streak > 0 ? `${h.streak}일 연속` : "오늘 시작"})`).join("\n")}\n`
    : "";

  const gratitudeSection = yesterdayGratitude && yesterdayGratitude.some((s) => s.trim())
    ? `\n## 어제의 감사\n${yesterdayGratitude.filter((s) => s.trim()).map((s, i) => `${i + 1}. ${s}`).join("\n")}\n`
    : "";
```

Insert `${habitSection}${gratitudeSection}` into the prompt string, after `${dailyNoteBlock}` and before `위 내용을 종합하여`.

Also update the numbered list in the prompt to include:

```
${habitSection ? `${nextNum}. 오늘의 습관 현황과 스트릭 격려\n` : ""}${gratitudeSection ? `${nextNum}. 어제 감사했던 것을 리마인드\n` : ""}
```

The full updated return statement:

```typescript
  let reqNum = 5;
  const reqItems: string[] = [
    "1. 오늘 집중해야 할 항목 (\"지금\" 단계의 할 일 우선)",
    "2. 곧 단계로 넘어갈 위험이 있는 항목 (3일 임박)",
    "3. 다가오는 D-day (14일 이내)",
    "4. 오늘/이번 주 기념일",
  ];
  if (dailyNoteBlock) {
    reqItems.push(`${reqNum}. 데일리 노트에 적힌 내용 중 오늘 브리핑에 참고할 만한 사항`);
    reqNum++;
  }
  if (habitSection) {
    reqItems.push(`${reqNum}. 오늘의 습관 현황과 스트릭 격려`);
    reqNum++;
  }
  if (gratitudeSection) {
    reqItems.push(`${reqNum}. 어제 감사했던 것을 리마인드하여 긍정적으로 하루 시작`);
    reqNum++;
  }

  return `당신은 일일 업무 브리핑 도우미입니다.
오늘 날짜: ${today}

## 할 일 목록
${todoList || "(할 일이 없습니다)"}

## D-day / 일정
${scheduleList || "(등록된 일정이 없습니다)"}
${dailyNoteBlock}${habitSection}${gratitudeSection}
위 내용을 종합하여 오늘의 브리핑을 작성해주세요:
${reqItems.join("\n")}

간결하고 실행 가능한 마크다운 형식으로 응답하세요.`;
```

- [ ] **Step 2: Update briefing route to fetch habits and gratitude**

In `app/api/ai/briefing/route.ts`, add imports:

```typescript
import { readHabits } from "@/lib/habit-store";
import { readHabitLogs } from "@/lib/habit-log-store";
import { readGratitudeByDate } from "@/lib/gratitude-store";
```

Update the data fetching Promise.all (replace lines 17-22):

```typescript
    const [todos, schedules, todayNote, yesterdayNote, habits, allLogs, yesterdayGratitude] = await Promise.all([
      readTodos(),
      readSchedules(),
      readDailyNote(todayStr),
      readDailyNote(yesterdayStr),
      readHabits(),
      readHabitLogs(),
      readGratitudeByDate(yesterdayStr),
    ]);
```

Add streak calculation helper and habit data preparation before the prompt call:

```typescript
    // Calculate streaks for today's habits
    function isScheduledDay(date: Date, habit: typeof habits[number]): boolean {
      const created = new Date(habit.createdAt);
      created.setHours(0, 0, 0, 0);
      if (date < created) return false;
      if (habit.repeatMode === "daily") return true;
      if (habit.repeatMode === "weekdays") return habit.weekdays.includes(date.getDay());
      if (habit.repeatMode === "interval") {
        const diffDays = Math.floor((date.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays % habit.intervalDays === 0;
      }
      return false;
    }

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const todayHabits = habits.filter((h) => isScheduledDay(todayDate, h));

    const habitData = todayHabits.map((h) => {
      const habitLogs = new Set(
        allLogs.filter((l) => l.habitId === h.id && l.completed).map((l) => l.date)
      );
      const created = new Date(h.createdAt);
      created.setHours(0, 0, 0, 0);
      let streak = 0;
      const d = new Date(todayDate);
      d.setDate(d.getDate() - 1);
      while (d >= created) {
        if (!isScheduledDay(d, h)) { d.setDate(d.getDate() - 1); continue; }
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (habitLogs.has(ds)) { streak++; d.setDate(d.getDate() - 1); } else break;
      }
      if (isScheduledDay(todayDate, h) && habitLogs.has(todayStr)) streak++;
      return { title: h.title, streak };
    });

    const gratitudeItems = yesterdayGratitude?.items ?? [];
```

Update the prompt call:

```typescript
    const prompt = buildBriefingPrompt(
      incompleteTodos,
      upcomingSchedules,
      todayNote,
      yesterdayNote,
      yesterdayStr,
      habitData.length > 0 ? habitData : undefined,
      gratitudeItems.length > 0 ? gratitudeItems : undefined,
    );
```

Also update the "no data" check to include habits and gratitude:

```typescript
    const hasHabits = todayHabits.length > 0;
    const hasGratitude = gratitudeItems.some((s) => s.trim());
    if (incompleteTodos.length === 0 && upcomingSchedules.length === 0 && !hasNotes && !hasHabits && !hasGratitude) {
```

- [ ] **Step 3: Commit**

```bash
git add lib/prompts.ts app/api/ai/briefing/route.ts
git commit -m "feat(ai): add habit streaks and gratitude to briefing prompt"
```

---

### Task 17: Build & Verify

**Files:** None (verification only)

- [ ] **Step 1: Run the build**

```bash
npx next build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Verify data files initialize correctly**

```bash
curl -s http://localhost:3000/api/habits | head -1
curl -s http://localhost:3000/api/habits/logs?date=all | head -1
curl -s "http://localhost:3000/api/gratitude?date=2026-04-05" | head -1
```

Expected: Each returns `{"data":...}` (empty arrays or null).

- [ ] **Step 3: Verify build output**

```bash
ls .next/BUILD_ID && echo "BUILD_ID exists" || echo "BUILD_ID missing"
ls .next/prerender-manifest.json && echo "prerender-manifest exists" || echo "prerender-manifest missing"
```

- [ ] **Step 4: Deploy**

Follow CLAUDE.md deploy instructions:

```bash
pm2 stop v-todo
rm -rf .next
npx next build
pm2 start v-todo
pm2 save
```

- [ ] **Step 5: Commit final state**

```bash
git add -A
git status
git commit -m "chore: build verification for habit tracker & gratitude journal"
```
