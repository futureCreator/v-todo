# v-todo v2.0 — Time-Decay Todo + D-day Redesign

**Date:** 2026-03-29
**Approach:** Incremental rebuild on existing codebase
**Stack:** Next.js 16 + React 19 + Tailwind CSS 4 + Google Gemini

## 1. Core Concept

Eisenhower 4-quadrant matrix is replaced by a **time-decay system**. Instead of manually classifying urgency/importance, inaction over time automatically determines a todo's fate.

```
지금(Now) ──(3일)──> 곧(Soon) ──(7일)──> 보관함(Archive) ──(30일)──> 삭제(Delete)
```

- All new items enter "지금"
- Items untouched for 3 days auto-move to "곧"
- Items untouched for 7 days in "곧" auto-move to "보관함"
- Items untouched for 30 days in "보관함" are permanently deleted
- Completing a todo triggers a check animation, then the item fades out. An undo toast appears for ~3 seconds
- No manual reordering or moving between lists. No "rescue" — if it matters, re-create it
- No due dates on todos — deadline tracking belongs to the D-day section

## 2. D-day Section (v-timeout Web Port)

A web port of the Android v-timeout app, integrated as a second main section.

### 2.1 Features Ported

- **Urgency color system:** Comfortable (blue, >60 days) / Caution (orange, 15-60 days) / Urgent (red, <=14 days)
- **Repeat modes:** Every 100 days / Monthly / Yearly with auto-advance of expired dates
- **Lunar calendar support:** Lunar date input with solar conversion, yearly lunar anniversary recalculation
- **Two sub-tabs:** D-day (general one-time deadlines) / Anniversary (repeating milestones)
- **Milestone display:** "200일째", "5개월째", "3주년" calculated from origin date

### 2.2 Features NOT Ported

- Pixel character mascot
- Swipe-to-delete gesture (web uses different delete UX)

## 3. Navigation Structure

Two-level navigation:

```
┌──────────────────────────────────┐
│ v-todo                    [AI]   │  ← App header + briefing button
├──────────────────────────────────┤
│  Tab: 지금 / 곧                  │  ← When "할 일" selected
│  or                              │
│  Tab: D-day / 기념일             │  ← When "D-day" selected
├──────────────────────────────────┤
│                                  │
│         Content area             │
│                                  │
├──────────────────────────────────┤
│    할 일     |      D-day        │  ← Bottom navigation bar
└──────────────────────────────────┘
```

- **Bottom bar:** Switches between the two main sections (할 일, D-day)
- **Top tabs:** Context-dependent sub-navigation
  - 할 일 section: "지금" / "곧" tabs
  - D-day section: "D-day" / "기념일" tabs
- **보관함 (Archive):** Accessed via an archive icon button in the top-right of the header bar (not a tab). Only visible when in the "할 일" section

### 3.1 Desktop Behavior

On wider viewports (md+), both top tabs and bottom bar remain. The content area is wider but the navigation pattern stays the same. No 2x2 grid layout — single list view at all breakpoints for consistency.

## 4. Data Model

### 4.1 Todo (replaces current quadrant-based model)

```typescript
interface Todo {
  id: string;                    // UUID
  title: string;                 // 1-200 chars
  stage: "now" | "soon" | "archive";
  completed: boolean;
  aiGenerated: boolean;
  createdAt: string;             // ISO 8601
  stageMovedAt: string;          // ISO 8601 — when item entered current stage
  completedAt: string | null;
}
```

Key changes from v1:
- `quadrant` replaced by `stage` ("now" | "soon" | "archive")
- `dueDate` removed (deadlines belong to D-day)
- `stageMovedAt` added — tracks when the item entered its current stage, used for auto-decay calculation

### 4.2 Schedule (new — for D-day section)

```typescript
type ScheduleType = "general" | "anniversary";
type RepeatMode = "none" | "every_100_days" | "monthly" | "yearly";

interface Schedule {
  id: string;                    // UUID
  name: string;                  // 1-100 chars
  targetDate: string;            // YYYY-MM-DD — next occurrence
  originDate: string;            // YYYY-MM-DD — original user input date
  type: ScheduleType;
  repeatMode: RepeatMode;
  isLunar: boolean;
  lunarMonth: number | null;     // 1-12
  lunarDay: number | null;       // 1-30
  createdAt: string;             // ISO 8601
}
```

### 4.3 Storage

- File-based JSON at `/data/todos.json` and `/data/schedules.json`
- Same atomic write pattern (temp file + rename)
- Auto-decay runs on every GET request for todos
- Auto-advance runs on every GET request for schedules (expired anniversaries roll forward)

## 5. API Routes

### 5.1 Todo Routes

- `GET /api/todos` — Returns all todos. Runs auto-decay before responding (moves items based on stageMovedAt + elapsed time)
- `POST /api/todos` — Create todo. Sets stage="now", stageMovedAt=now
- `PUT /api/todos/[id]` — Update todo (toggle complete, edit title)
- `DELETE /api/todos/[id]` — Delete todo

### 5.2 Schedule Routes

- `GET /api/schedules` — Returns all schedules. Runs auto-advance for expired anniversaries
- `POST /api/schedules` — Create schedule
- `PUT /api/schedules/[id]` — Update schedule
- `DELETE /api/schedules/[id]` — Delete schedule

### 5.3 AI Routes

- `POST /api/ai/briefing` — Unified briefing: combines todos (지금 + 곧) and schedules (upcoming D-days) into a single "오늘의 요약" markdown response

Removed from v1:
- `/api/ai/suggest` — removed (no quadrant context to suggest into)
- `/api/ai/cleanup` — removed (time-decay handles cleanup automatically)

## 6. Auto-Decay Logic

Runs server-side on every `GET /api/todos`:

```
for each todo where completed === false:
  elapsed = now - stageMovedAt

  if stage === "now" && elapsed >= 3 days:
    stage = "soon", stageMovedAt = now

  if stage === "soon" && elapsed >= 7 days:
    stage = "archive", stageMovedAt = now

  if stage === "archive" && elapsed >= 30 days:
    delete todo
```

Completed todos are never auto-decayed. They are removed from the UI immediately on completion (with undo window).

## 7. Auto-Advance Logic (Schedules)

Runs server-side on every `GET /api/schedules`:

```
for each schedule where type === "anniversary" && targetDate < today:
  advance targetDate based on repeatMode:
    - every_100_days: targetDate += 100 days
    - monthly: targetDate += 1 month (clamp to month end)
    - yearly:
      if isLunar: recalculate solar from lunar for next year
      else: targetDate += 1 year
```

General (non-anniversary) schedules with passed targetDate are auto-deleted (same behavior as Android app's `deleteExpired`).

## 8. Lunar Calendar

Use a JavaScript lunar-solar conversion library (e.g., `korean-lunar-calendar` npm package) to replicate the Android app's functionality:
- Lunar date input in the add/edit schedule form
- Solar date preview shown in real-time as user selects lunar date
- Yearly anniversary recalculation: convert stored lunar month/day to solar for the target year

## 9. AI Briefing

Single unified briefing combining both sections:

**Prompt inputs:**
- All incomplete todos in "지금" and "곧" stages (with stage and stageMovedAt info)
- All upcoming schedules within the next 14 days
- Overdue schedules (D+N)

**Prompt output (markdown):**
- Today's priority focus (from "지금" todos)
- Items at risk of decaying soon (approaching stage boundary)
- Upcoming deadlines (D-day items)
- Anniversary milestones today/this week

**Model:** Gemini 3.1 Flash Lite Preview (text mode, temperature 0.7)

## 10. Completion UX

When user taps the checkbox on a todo:
1. Checkbox fills with a check animation
2. `PUT /api/todos/[id]` is called immediately to set `completed: true, completedAt: now`
3. The entire row fades out with a slide-up animation (~400ms)
4. Item is removed from the visible list
5. An undo toast appears at the bottom for 3 seconds
6. If undo is tapped: `PUT /api/todos/[id]` is called to set `completed: false, completedAt: null`, item reappears with a slide-down animation
7. If undo expires: no further action needed (already persisted in step 2)

Completed items are not shown anywhere in the UI. They exist in the JSON file only for potential data recovery.

### 10.1 Schedule Deletion

D-day/Anniversary items are deleted via a delete button visible in the edit modal, or via a long-press context menu. No swipe gestures.

## 11. UI Components (Changed/New)

### Changed
- `page.tsx` — Complete rewrite: bottom nav state, section/tab routing
- `TodoInput.tsx` — Simplified: title only, no date picker
- `TodoItem.tsx` — Simplified: no due date badge, add "N일 전" age indicator, completion animation

### Removed
- `QuadrantGrid.tsx` — No more 4-quadrant layout
- `QuadrantPanel.tsx` — No more quadrant panels
- `TabBar.tsx` — Replaced by new bottom navigation
- `AiActions.tsx` — AI suggest/cleanup buttons removed
- `AiSuggestPreview.tsx` — AI suggest modal removed
- `AiCleanupDiff.tsx` — AI cleanup diff modal removed
- `TodoEditSheet.tsx` — No quadrant picker needed, simplified to inline edit or simple modal

### New
- `BottomNav.tsx` — Bottom navigation bar (할 일 / D-day)
- `SectionTabs.tsx` — Context-dependent top tabs
- `ScheduleList.tsx` — D-day/Anniversary list view
- `ScheduleItem.tsx` — Individual schedule item with urgency color badge
- `AddScheduleSheet.tsx` — Add/edit schedule modal with date picker, repeat mode, lunar toggle
- `UndoToast.tsx` — Undo toast for completed items (replaces generic Toast)
- `ArchiveView.tsx` — Archive list (accessed from header menu)

## 12. Styling

- Catppuccin Latte (light) / Mocha (dark) theme preserved
- Urgency colors for D-day:
  - Comfortable (>60d): `--blue` (#1e66f5 / #89b4fa)
  - Caution (15-60d): `--peach` (#fe640b / #fab387)
  - Urgent (<=14d): `--red` (#d20f39 / #f38ba8)
- Todo age indicator: subtle text showing "오늘", "1일 전", "2일 전" etc.
- Items approaching stage boundary get a subtle visual hint (e.g., slightly faded or orange-tinted age text)
- Animations: staggered list entry (existing), completion fade-out (new), stage transition (new)

## 13. Data Migration

Existing todos in `/data/todos.json` need migration:
- All `quadrant` values mapped to `stage`:
  - "urgent-important" → "now"
  - "not-urgent-important" → "now"
  - "urgent-not-important" → "soon"
  - "not-urgent-not-important" → "archive"
- `stageMovedAt` set to current timestamp for all existing items
- `dueDate` field dropped
- `quadrant` field dropped
- `/data/schedules.json` created as empty `{ "schedules": [] }`

## 14. Scope Exclusions

- No drag-and-drop reordering
- No manual stage movement (no rescue from archive)
- No due dates on todos
- No AI suggest or AI cleanup (removed)
- No pixel character mascot
- No swipe gestures
- No cloud sync or multi-device support
- No push notifications
