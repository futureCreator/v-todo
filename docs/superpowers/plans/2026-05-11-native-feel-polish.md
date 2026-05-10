# Native-Feel Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make v-todo feel as close to a native mobile app as possible via View Transitions, haptic feedback, default-web-noise removal, and targeted UI polish.

**Architecture:** Browser-standard APIs + CSS only. No new dependencies. Layered on top of the existing design tokens. Two PRs: Behavior Pack (Tasks 1-11) and Visual Pack (Tasks 12-22).

**Tech Stack:** Next.js 16.2.1, React 19.2.4, Tailwind v4, vitest, browser View Transitions API, Vibration API.

**Spec:** `docs/superpowers/specs/2026-05-11-native-feel-polish-design.md`

**Spec deviations** (discovered during plan-writing, both informed by reading the actual code):
- View transitions: spec section 3.1 mentions a `MoodYearView` year→month→day zoom, but the component is a single-level heatmap with no drill-down. That application point is dropped.
- Empty states: spec section 3.2 lists `DailyNote` as one of the application sites, but `DailyNoteView` is purely a text editor — there is no list/grid that goes empty. Skipped. The `FileList` site is not a separate component; it lives inside `GeneralNoteView`'s `files.length === 0` branch and is covered by the GeneralNote empty state (Task 20).

---

## File Structure

**New files:**
- `lib/haptic.ts` — Pure utility. Wraps `navigator.vibrate` with named helpers.
- `lib/__tests__/haptic.test.ts` — vitest unit test (node env, stub navigator).
- `lib/view-transition.ts` — Pure utility. Wraps `document.startViewTransition` with fallback.
- `lib/__tests__/view-transition.test.ts` — vitest unit test (node env, stub document).
- `components/EmptyState.tsx` — Shared empty-state component. No automated test (project has no jsdom/RTL setup; manual verification).

**Modified files:**
- `app/globals.css` — easing tokens, noise-removal CSS, `.press` utility, view-transition pseudo-elements + keyframes.
- `components/BottomNav.tsx` — `.press`, haptic on tab change, view transition on tab change.
- `components/DateNavigator.tsx` — `.press`, haptic on prev/next, view transition with direction.
- `components/DailyNoteView.tsx` — view-transition-name on NoteEditor wrapper.
- `components/CheckinView.tsx` — view-transition-name on content wrapper.
- `components/TodoItem.tsx` — `.press` on checkbox/delete, haptic on toggle and delete.
- `components/WishItem.tsx` — `.press`, haptic on completion-modal trigger.
- `components/WishCompletionSheet.tsx` — haptic on success confirm.
- `components/AddWishSheet.tsx` — haptic on mount and on delete confirm.
- `components/AddScheduleSheet.tsx` — haptic on mount and on delete (delete lives here, not in ScheduleItem).
- `components/HealingAddSheet.tsx` — haptic on mount.
- `components/HealingCard.tsx` — haptic on delete.
- `components/ScheduleItem.tsx` — `.press` only (no delete in this component).
- `components/TimelineView.tsx` — replace existing emoji empty state with `<EmptyState>`.
- `components/WishlistView.tsx` — replace 2 existing emoji empty states.
- `components/GeneralNoteView.tsx` — replace existing emoji empty state.
- `components/TagView.tsx` — add `<EmptyState>` for no-match case.
- `app/page.tsx` — replace 2 existing emoji empty states (todos active + archive).

---

# Phase 1 — PR1: Behavior Pack

## Task 1: Add easing & duration tokens

**Files:**
- Modify: `app/globals.css` (insert in `:root` block, after the existing custom properties block ending around line 83)

- [ ] **Step 1: Add tokens**

In `app/globals.css`, inside the `:root { … }` block, add before the closing `color-scheme: light dark;` line:

```css
  /* ── Motion tokens ── */
  --ease-ios: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-ios-spring: cubic-bezier(0.5, 1.4, 0.4, 1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -20`
Expected: build succeeds, no CSS syntax errors.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(motion): add easing and duration tokens"
```

---

## Task 2: Noise removal CSS

**Files:**
- Modify: `app/globals.css` (extend `@layer base` block around lines 136-160)

- [ ] **Step 1: Replace the `@layer base` block**

Find the existing `@layer base { … }` block (lines 136-160 in current state) and replace it with:

```css
@layer base {
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
  }
  html {
    height: 100%;
    overflow: hidden;
  }
  body {
    font-family: var(--font-sans);
    background: var(--sys-bg);
    color: var(--sys-label);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    height: 100%;
    overflow: hidden;
    overscroll-behavior: none;
    -webkit-user-select: none;
    user-select: none;
  }
  /* Allow text selection in input/content areas */
  input, textarea, [contenteditable], .prose, [data-selectable] {
    -webkit-user-select: text;
    user-select: text;
    -webkit-touch-callout: default;
  }
  /* Prevent iOS focus auto-zoom on inputs smaller than 16px */
  input, textarea, select {
    font-size: max(16px, 1em);
  }
  /* Disable double-tap zoom on interactive elements */
  button, a, [role="button"], [role="tab"] {
    touch-action: manipulation;
  }
  ::-webkit-scrollbar {
    width: 0;
    background: transparent;
  }
}
```

- [ ] **Step 2: Verify build & visual smoke test**

Run: `npx next build 2>&1 | tail -20`
Expected: build succeeds.

Manually open the dev server (`npm run dev`) and verify in a browser that:
- Pages render without obvious regression
- Inputs still receive focus and accept text

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(ui): remove default web noise (tap highlight, callout, overscroll, zoom)"
```

---

## Task 3: Add `.press` utility class

**Files:**
- Modify: `app/globals.css` (extend `@layer utilities` block around lines 361-398)

- [ ] **Step 1: Add `.press` utility**

Find the `@layer utilities { … }` block (around lines 361-398). Add the following at the end of the block, right before the closing `}`:

```css
  .press {
    transition: transform var(--duration-fast) var(--ease-ios);
  }
  .press:active {
    transform: scale(0.97);
  }
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -20`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(ui): add .press utility for tactile button feedback"
```

---

## Task 4: Apply `.press` to interactive components

**Files:**
- Modify: `components/BottomNav.tsx`
- Modify: `components/DateNavigator.tsx`
- Modify: `components/TodoItem.tsx`
- Modify: `components/WishItem.tsx`
- Modify: `components/ScheduleItem.tsx`
- Modify: `components/WishlistView.tsx`

- [ ] **Step 1: BottomNav — add `.press` to each tab `<button>`**

In `components/BottomNav.tsx`, for each of the 5 `<button>` elements (할 일, 노트, 체크인, 위시, D-day), append ` press` to the className. Example for the first button:

```tsx
<button
  className={`press flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
    active === "todo"
      ? "text-[var(--accent-primary)]"
      : "text-[var(--label-tertiary)]"
  }`}
  onClick={() => onChange("todo")}
>
```

Apply identically to the other 4 buttons.

- [ ] **Step 2: DateNavigator — add `.press` to prev/next/date buttons**

In `components/DateNavigator.tsx`, the 3 `<button>` elements (prev arrow line 65, date label line 75, next arrow line 97). Prepend `press ` to each className:

```tsx
className="press size-11 flex items-center justify-center text-[var(--label-tertiary)] active:text-[var(--label-primary)] transition-colors"
```

```tsx
className="press flex items-center gap-2 px-3 py-1.5 rounded-lg active:bg-[var(--fill-quaternary)] transition-colors"
```

(Repeat for next-arrow button.)

- [ ] **Step 3: TodoItem — add `.press` to checkbox & delete buttons**

In `components/TodoItem.tsx`:

Line ~94 checkbox button — change to:
```tsx
<button
  className="press size-11 flex items-center justify-center flex-shrink-0"
  onClick={handleToggle}
>
```

Line ~164 delete button — change to:
```tsx
<button
  className="press size-11 flex items-center justify-center flex-shrink-0 text-[var(--label-quaternary)] md:opacity-0 md:group-hover:opacity-100 active:text-[var(--system-red)] transition-all"
  onClick={() => onDelete(todo.id)}
>
```

- [ ] **Step 4: WishItem & ScheduleItem — add `.press` to clickable elements**

In `components/WishItem.tsx`, the inner `<button>` elements (lines 82-108 image area, 113-135 content) are the clickable surfaces. Prepend `press ` to each of those button classNames:

```tsx
<button
  className="press w-full relative"
  onClick={() => onEdit(wish)}
  aria-label="위시 편집"
>
```

```tsx
<button
  className="press w-full text-left"
  onClick={() => onEdit(wish)}
>
```

Also prepend `press ` to the bottom toggle button (line ~140) and delete button (line ~159) classNames — both `size-[36px] flex items-center justify-center rounded-full` → `press size-[36px] flex items-center justify-center rounded-full`.

In `components/ScheduleItem.tsx`, the root element is `<button>` at line ~137 with `onClick={() => onEdit(schedule)}`. Prepend `press ` to its className.

- [ ] **Step 5: WishlistView — add `.press` to bottom add buttons**

In `components/WishlistView.tsx`, the two "힐링 추가" / "새 위시 추가" buttons (lines ~67 and ~136). Prepend `press ` to className:

```tsx
className="press w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold active:opacity-80 transition-opacity"
```

- [ ] **Step 6: Verify build & smoke test**

Run: `npx next build 2>&1 | tail -20`
Expected: build succeeds.

Open dev server, tap any button on mobile (or click on desktop) — should see slight scale-down on press.

- [ ] **Step 7: Commit**

```bash
git add components/
git commit -m "feat(ui): apply .press feedback to interactive elements"
```

---

## Task 5: Haptic utility (TDD)

**Files:**
- Create: `lib/haptic.ts`
- Create: `lib/__tests__/haptic.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/__tests__/haptic.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { haptic } from "@/lib/haptic";

describe("haptic", () => {
  let vibrateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateSpy = vi.fn();
    vi.stubGlobal("navigator", { vibrate: vibrateSpy });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("selection() vibrates 5ms", () => {
    haptic.selection();
    expect(vibrateSpy).toHaveBeenCalledWith(5);
  });

  it("light() vibrates 8ms", () => {
    haptic.light();
    expect(vibrateSpy).toHaveBeenCalledWith(8);
  });

  it("tap() vibrates 10ms", () => {
    haptic.tap();
    expect(vibrateSpy).toHaveBeenCalledWith(10);
  });

  it("medium() vibrates 15ms", () => {
    haptic.medium();
    expect(vibrateSpy).toHaveBeenCalledWith(15);
  });

  it("success() vibrates with [20, 30, 40] pattern", () => {
    haptic.success();
    expect(vibrateSpy).toHaveBeenCalledWith([20, 30, 40]);
  });

  it("warning() vibrates with [40, 30, 40] pattern", () => {
    haptic.warning();
    expect(vibrateSpy).toHaveBeenCalledWith([40, 30, 40]);
  });

  it("silently no-ops when navigator.vibrate is unavailable", () => {
    vi.stubGlobal("navigator", {});
    expect(() => haptic.tap()).not.toThrow();
  });

  it("silently no-ops when navigator is undefined", () => {
    vi.stubGlobal("navigator", undefined);
    expect(() => haptic.tap()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/haptic.test.ts`
Expected: FAIL — "Cannot find module '@/lib/haptic'" or similar.

- [ ] **Step 3: Implement `lib/haptic.ts`**

Create `lib/haptic.ts`:

```ts
type Pattern = number | number[];

function vibrate(pattern: Pattern): void {
  if (typeof navigator === "undefined" || !navigator) return;
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate(pattern);
}

export const haptic = {
  selection: () => vibrate(5),
  light: () => vibrate(8),
  tap: () => vibrate(10),
  medium: () => vibrate(15),
  success: () => vibrate([20, 30, 40]),
  warning: () => vibrate([40, 30, 40]),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/haptic.test.ts`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/haptic.ts lib/__tests__/haptic.test.ts
git commit -m "feat(haptic): add named haptic helpers with feature detection"
```

---

## Task 6: Wire haptic — TodoItem

**Files:**
- Modify: `components/TodoItem.tsx`

- [ ] **Step 1: Add import**

At the top of `components/TodoItem.tsx`, after existing imports:

```ts
import { haptic } from "@/lib/haptic";
```

- [ ] **Step 2: Trigger `haptic.tap()` on toggle**

Modify `handleToggle` (line ~34):

```tsx
const handleToggle = () => {
  haptic.tap();
  setCompleting(true);
  setTimeout(() => onToggle(todo.id), 350);
};
```

- [ ] **Step 3: Trigger `haptic.warning()` on delete click**

Find the delete button `onClick` (line ~166). Change to:

```tsx
onClick={() => {
  haptic.warning();
  onDelete(todo.id);
}}
```

- [ ] **Step 4: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/TodoItem.tsx
git commit -m "feat(haptic): vibrate on todo toggle and delete"
```

---

## Task 7: Wire haptic — WishItem & wish sheets

**Files:**
- Modify: `components/WishItem.tsx`
- Modify: `components/WishCompletionSheet.tsx`
- Modify: `components/AddWishSheet.tsx`

- [ ] **Step 1: WishItem — haptic on toggle (completion-modal trigger) and delete**

In `components/WishItem.tsx`, add import after the existing imports (line 4):

```ts
import { haptic } from "@/lib/haptic";
```

Modify the round toggle button (line ~141). For an incomplete wish, this opens the completion sheet via the parent's `onToggle`; for a completed one it un-completes:

```tsx
<button
  className="size-[36px] flex items-center justify-center rounded-full"
  onClick={() => {
    if (!wish.completed) haptic.medium();
    else haptic.tap();
    onToggle(wish.id);
  }}
  aria-label={wish.completed ? "완료 취소" : "완료 표시"}
>
```

Modify the delete button (line ~159):

```tsx
<button
  className="size-[36px] flex items-center justify-center rounded-full"
  onClick={() => {
    haptic.warning();
    onDelete(wish.id);
  }}
  aria-label="위시 삭제"
>
```

- [ ] **Step 2: WishCompletionSheet — vibrate on confirm**

In `components/WishCompletionSheet.tsx`, add import:

```ts
import { haptic } from "@/lib/haptic";
```

Find the save/confirm handler — the function that calls `onSave` with the completion payload (look for "완료" or "확정" button `onClick`, and the function it invokes). Prepend `haptic.success();` to the body of that handler before any state update or `onSave` call.

If multiple confirm-like actions exist (e.g., a separate "기록 저장" mid-flow), only fire `haptic.success()` on the final completion confirm — not on intermediate saves.

- [ ] **Step 3: AddWishSheet — vibrate on delete confirm**

In `components/AddWishSheet.tsx`, add import:

```ts
import { haptic } from "@/lib/haptic";
```

Find the delete button's `onClick` handler — it calls `onDelete?.(wish.id)`. Prepend `haptic.warning();`:

```tsx
onClick={() => {
  haptic.warning();
  onDelete?.(wish!.id);
}}
```

Match the exact existing call expression for `onDelete`; do not change the optional-chaining or the argument shape.

- [ ] **Step 4: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/WishItem.tsx components/WishCompletionSheet.tsx components/AddWishSheet.tsx
git commit -m "feat(haptic): vibrate on wish completion and delete"
```

---

## Task 8: Wire haptic — schedule & healing delete

**Files:**
- Modify: `components/AddScheduleSheet.tsx` (delete button at line ~219)
- Modify: `components/HealingCard.tsx` (delete handler at line ~13)

ScheduleItem.tsx has no `onDelete` prop — schedule delete lives in `AddScheduleSheet`. Healing delete lives in `HealingCard`.

- [ ] **Step 1: AddScheduleSheet — vibrate on delete**

In `components/AddScheduleSheet.tsx`, add import at top:

```ts
import { haptic } from "@/lib/haptic";
```

Modify the delete button at line ~219:

```tsx
<button
  ... existing className ...
  onClick={() => {
    haptic.warning();
    onDelete(schedule.id);
  }}
>
  일정 삭제
</button>
```

(Preserve the existing className and surrounding markup; only change the `onClick`.)

- [ ] **Step 2: HealingCard — vibrate on delete**

In `components/HealingCard.tsx`, add import at top:

```ts
import { haptic } from "@/lib/haptic";
```

Find the function around line 13 that calls `onDelete(item.id)` and prepend `haptic.warning();` before the call.

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/AddScheduleSheet.tsx components/HealingCard.tsx
git commit -m "feat(haptic): vibrate on schedule and healing delete"
```

---

## Task 9: Wire haptic — BottomNav & DateNavigator

**Files:**
- Modify: `components/BottomNav.tsx`
- Modify: `components/DateNavigator.tsx`

- [ ] **Step 1: BottomNav — selection on tab change**

In `components/BottomNav.tsx`, add import:

```ts
import { haptic } from "@/lib/haptic";
```

For each of the 5 tab `<button>` elements, change `onClick={() => onChange("todo")}` to:

```tsx
onClick={() => { haptic.selection(); onChange("todo"); }}
```

(Repeat for `"note"`, `"checkin"`, `"wish"`, `"dday"`.)

- [ ] **Step 2: DateNavigator — selection on prev/next/date pick**

In `components/DateNavigator.tsx`, add import:

```ts
import { haptic } from "@/lib/haptic";
```

Modify `goToPrev` (line ~39):
```tsx
const goToPrev = () => {
  haptic.selection();
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  onChange(prev);
};
```

Modify `goToNext` (line ~45) identically.

Modify `handleDatePick` (line ~51) — prepend `haptic.selection();` after the `if (!val) return;` line.

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/BottomNav.tsx components/DateNavigator.tsx
git commit -m "feat(haptic): selection feedback on tab change and date navigation"
```

---

## Task 10: Wire haptic — sheet mounts

**Files:**
- Modify: `components/AddWishSheet.tsx`
- Modify: `components/AddScheduleSheet.tsx`
- Modify: `components/HealingAddSheet.tsx`
- Modify: `components/WishCompletionSheet.tsx`

- [ ] **Step 1: AddWishSheet — vibrate on mount**

`components/AddWishSheet.tsx` already has the haptic import from Task 7. Add a mount effect inside the component body (right after the `useState` declarations):

```tsx
useEffect(() => {
  haptic.light();
}, []);
```

Add `useEffect` to the React import list at the top of the file if not already present.

- [ ] **Step 2: AddScheduleSheet — same pattern**

In `components/AddScheduleSheet.tsx`, add imports:

```ts
import { useEffect } from "react";  // merge into existing react import
import { haptic } from "@/lib/haptic";
```

Add inside the component body, after state declarations:

```tsx
useEffect(() => {
  haptic.light();
}, []);
```

- [ ] **Step 3: HealingAddSheet — same pattern**

Apply the same change to `components/HealingAddSheet.tsx`.

- [ ] **Step 4: WishCompletionSheet — same pattern**

`components/WishCompletionSheet.tsx` already has the haptic import. Add the mount effect:

```tsx
useEffect(() => {
  haptic.light();
}, []);
```

Make sure `useEffect` is in the React import list.

- [ ] **Step 5: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add components/AddWishSheet.tsx components/AddScheduleSheet.tsx components/HealingAddSheet.tsx components/WishCompletionSheet.tsx
git commit -m "feat(haptic): light vibration when sheets mount"
```

---

## Task 11: PR1 — Detail pass, manual verification, push

- [ ] **Step 1: Detail pass — scan diff for obvious inconsistencies**

Run: `git log main..HEAD --oneline`
Review the diff visually. Look for:
- Inconsistent shadow tones (mixing `shadow-sm`/`shadow-md` arbitrarily)
- Spacing irregularities (off-grid values like `gap-1.5` next to `gap-2`)
- Dark-mode contrast issues you happened to notice

Fix only what is clearly off. Record findings in PR description; do not invent new requirements.

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: all tests pass (existing + new haptic tests).

- [ ] **Step 3: Manual checklist (Android + desktop)**

Open `npm run dev` and verify:
- [ ] Buttons no longer flash blue/grey highlight box
- [ ] Long-press shows no text selection menu (notes still allow selection)
- [ ] Pull-down does not trigger pull-to-refresh on Android
- [ ] Sheet inner scroll does not affect page
- [ ] Input focus does not zoom on iOS/Android
- [ ] Todo check vibrates on Android (10ms tap)
- [ ] Wish completion vibrates with success pattern
- [ ] Delete confirms vibrate with warning pattern
- [ ] Sheet open vibrates lightly
- [ ] Tab change vibrates (5ms)
- [ ] Date prev/next vibrates (5ms)
- [ ] All clickable elements scale slightly on press
- [ ] Reduced-motion (system setting) ends animations immediately

- [ ] **Step 4: Push branch & open PR**

If working on a feature branch:
```bash
git push -u origin <branch>
gh pr create --title "feat: native-feel behavior pack (haptic, press feedback, noise removal)" --body "$(cat <<'EOF'
## Summary
- Adds `lib/haptic.ts` with named helpers and feature detection
- Wires haptic to: todo toggle/delete, wish completion/delete, schedule delete, sheet mount, tab change, date change
- Adds `.press` utility class for tactile button feedback (scale 0.97)
- Adds noise-removal CSS: tap highlight, touch callout, overscroll, double-tap zoom, iOS focus zoom
- Adds motion tokens: `--ease-ios`, `--duration-fast/base/slow`

Implements PR1 from `docs/superpowers/specs/2026-05-11-native-feel-polish-design.md`.

## Test plan
- [x] `npm test` passes
- [x] Build succeeds
- [ ] Manual checklist on Android device
- [ ] Manual checklist on desktop browser

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

If working directly on main (per CLAUDE.md project conventions), just push.

---

# Phase 2 — PR2: Visual Pack

## Task 12: View transition utility (TDD)

**Files:**
- Create: `lib/view-transition.ts`
- Create: `lib/__tests__/view-transition.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/__tests__/view-transition.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withViewTransition } from "@/lib/view-transition";

describe("withViewTransition", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls updater immediately when document is undefined", () => {
    vi.stubGlobal("document", undefined);
    const updater = vi.fn();
    withViewTransition(updater);
    expect(updater).toHaveBeenCalledOnce();
  });

  it("calls updater immediately when startViewTransition is unavailable", () => {
    vi.stubGlobal("document", {});
    const updater = vi.fn();
    withViewTransition(updater);
    expect(updater).toHaveBeenCalledOnce();
  });

  it("wraps updater in startViewTransition when supported", () => {
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return { finished: Promise.resolve() };
    });
    vi.stubGlobal("document", { startViewTransition });
    const updater = vi.fn();
    withViewTransition(updater);
    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(updater).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/view-transition.test.ts`
Expected: FAIL — "Cannot find module '@/lib/view-transition'".

- [ ] **Step 3: Implement `lib/view-transition.ts`**

Create `lib/view-transition.ts`:

```ts
type Updater = () => void;

interface DocumentWithViewTransition extends Document {
  startViewTransition?: (updater: Updater) => { finished: Promise<void> };
}

export function withViewTransition(updater: Updater): void {
  if (typeof document === "undefined" || !document) {
    updater();
    return;
  }
  const doc = document as DocumentWithViewTransition;
  if (typeof doc.startViewTransition !== "function") {
    updater();
    return;
  }
  doc.startViewTransition(updater);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/view-transition.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/view-transition.ts lib/__tests__/view-transition.test.ts
git commit -m "feat(motion): add startViewTransition wrapper with fallback"
```

---

## Task 13: View transition CSS

**Files:**
- Modify: `app/globals.css` (add new keyframes + view-transition pseudo-elements)

- [ ] **Step 1: Add direction-aware keyframes**

In `app/globals.css`, add to the keyframes section (after `@keyframes celebrationCheck`):

```css
@keyframes vtSlideOutLeft {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(-24px); }
}
@keyframes vtSlideInRight {
  from { opacity: 0; transform: translateX(24px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes vtSlideOutRight {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(24px); }
}
@keyframes vtSlideInLeft {
  from { opacity: 0; transform: translateX(-24px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes vtFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
@keyframes vtFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

- [ ] **Step 2: Add view-transition pseudo-element rules**

After the keyframes section in `app/globals.css`, add:

```css
/* ═══════════════════════════════════════
   View Transitions
   ═══════════════════════════════════════ */

::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 280ms;
  animation-timing-function: var(--ease-ios);
}

/* Tab change: cross-fade */
::view-transition-old(tab-content) {
  animation: vtFadeOut 200ms var(--ease-ios) both;
}
::view-transition-new(tab-content) {
  animation: vtFadeIn 240ms var(--ease-ios) both;
}

/* Date forward (next day) */
html[data-date-direction="forward"] ::view-transition-old(date-content) {
  animation: vtSlideOutLeft 240ms var(--ease-ios) both;
}
html[data-date-direction="forward"] ::view-transition-new(date-content) {
  animation: vtSlideInRight 280ms var(--ease-ios) both;
}

/* Date backward (prev day) */
html[data-date-direction="backward"] ::view-transition-old(date-content) {
  animation: vtSlideOutRight 240ms var(--ease-ios) both;
}
html[data-date-direction="backward"] ::view-transition-new(date-content) {
  animation: vtSlideInLeft 280ms var(--ease-ios) both;
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(motion): view-transition keyframes and pseudo-element rules"
```

---

## Task 14: Apply view transition — BottomNav

**Files:**
- Modify: `app/page.tsx` (the section element wrapping tab content)
- Modify: `components/BottomNav.tsx`

- [ ] **Step 1: Add `view-transition-name` to the tab content container**

In `app/page.tsx`, find the main content area that swaps based on `section`. Wrap the content (or set on the existing wrapper) so that the changing region has:

```tsx
<div style={{ viewTransitionName: "tab-content" }} className="…existing classes…">
  {/* existing tab content */}
</div>
```

If there is already a wrapping element for the tab content area, add the `style` prop to it; do not introduce a new wrapper.

- [ ] **Step 2: Wrap `onChange` calls in `withViewTransition`**

In `components/BottomNav.tsx`, add import:

```ts
import { withViewTransition } from "@/lib/view-transition";
```

Change each tab `onClick` (which already has `haptic.selection()` from Task 9) to:

```tsx
onClick={() => {
  haptic.selection();
  withViewTransition(() => onChange("todo"));
}}
```

(Repeat for the other 4 tabs with their respective section keys.)

- [ ] **Step 3: Verify build & manual smoke test**

Run: `npx next build 2>&1 | tail -10`
Expected: build succeeds.

In `npm run dev`, switch tabs in a browser that supports View Transitions (Chrome/Edge 111+ or Safari 18+). Expected: cross-fade between tab content.

In Safari < 18, switching tabs should still work instantly with no error.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/BottomNav.tsx
git commit -m "feat(motion): cross-fade view transition on tab change"
```

---

## Task 15: Apply view transition — DateNavigator

**Files:**
- Modify: `components/DateNavigator.tsx`
- Modify: `components/DailyNoteView.tsx` (NoteEditor wrapper at line ~111)
- Modify: `components/CheckinView.tsx` (content wrapper at line ~41)

DateNavigator is used inside `DailyNoteView` and `CheckinView` (not in `app/page.tsx`). The date-driven content lives next to it in each of those parents.

- [ ] **Step 1: Mark date-driven content with view-transition-name**

In `components/DailyNoteView.tsx`, modify the wrapper at line 111:

```tsx
<div className="flex-1 min-h-0 flex flex-col" style={{ viewTransitionName: "date-content" }}>
  <NoteEditor
    content={content}
    onChange={handleChange}
    placeholder="오늘의 노트를 작성하세요..."
  />
</div>
```

In `components/CheckinView.tsx`, modify the wrapper at line 41:

```tsx
<div className="flex-1 min-h-0 overflow-y-auto flex flex-col" style={{ viewTransitionName: "date-content" }}>
  {/* existing children */}
</div>
```

- [ ] **Step 2: Update DateNavigator to set direction & wrap update**

In `components/DateNavigator.tsx`, add import:

```ts
import { withViewTransition } from "@/lib/view-transition";
```

Replace `goToPrev` and `goToNext`:

```tsx
const goToPrev = () => {
  haptic.selection();
  if (typeof document !== "undefined") {
    document.documentElement.dataset.dateDirection = "backward";
  }
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  withViewTransition(() => onChange(prev));
};

const goToNext = () => {
  haptic.selection();
  if (typeof document !== "undefined") {
    document.documentElement.dataset.dateDirection = "forward";
  }
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  withViewTransition(() => onChange(next));
};
```

For the date picker (`handleDatePick`), use forward direction if the new date is later than current, backward otherwise:

```tsx
const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
  const val = e.target.value;
  if (!val) return;
  haptic.selection();
  const [y, m, d] = val.split("-").map(Number);
  const next = new Date(y, m - 1, d);
  if (typeof document !== "undefined") {
    document.documentElement.dataset.dateDirection =
      next.getTime() >= date.getTime() ? "forward" : "backward";
  }
  withViewTransition(() => onChange(next));
};
```

- [ ] **Step 3: Verify build & manual test**

Run: `npx next build 2>&1 | tail -10`
Expected: build succeeds.

In `npm run dev`, navigate prev/next dates. Expected: content slides left when going forward (new content enters from right), slides right when going backward.

- [ ] **Step 4: Commit**

```bash
git add components/DateNavigator.tsx app/page.tsx
git commit -m "feat(motion): direction-aware view transition on date change"
```

---

## Task 16: EmptyState component

**Files:**
- Create: `components/EmptyState.tsx`

- [ ] **Step 1: Implement EmptyState**

Create `components/EmptyState.tsx`:

```tsx
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 gap-4">
      <div className="text-[var(--label-tertiary)] opacity-70">
        {icon}
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-[20px] font-medium text-[var(--label-secondary)]">{title}</p>
        {description && (
          <p className="text-[15px] text-[var(--label-tertiary)] max-w-[280px]">{description}</p>
        )}
      </div>
      {action && (
        <button
          className="press mt-2 px-5 py-2.5 rounded-full bg-[var(--fill-tertiary)] text-[var(--label-primary)] text-[15px] font-medium"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: build succeeds (component is unused but valid).

- [ ] **Step 3: Commit**

```bash
git add components/EmptyState.tsx
git commit -m "feat(ui): add EmptyState component"
```

---

## Task 17: Integrate EmptyState — Todo views

**Files:**
- Modify: `app/page.tsx` (lines ~597 archive empty, ~621 active empty)

- [ ] **Step 1: Add import**

At the top of `app/page.tsx` add (alongside other component imports):

```ts
import EmptyState from "@/components/EmptyState";
```

- [ ] **Step 2: Replace todo "now/soon" empty state (~line 621)**

Replace the block:

```tsx
<div className="flex-1 flex flex-col items-center justify-center text-[var(--label-tertiary)]">
  <span className="text-[56px] mb-5 opacity-30">✅</span>
  <p className="text-[20px]">
    {todoTab === "now" ? "할 일을 추가해보세요" : "곧 처리할 일이 없습니다"}
  </p>
  <p className="text-[15px] text-[var(--label-quaternary)] mt-1.5">
    {todoTab === "now"
      ? "3일 이내에 완료하지 않으면 '곧'으로 이동합니다"
      : "3일 동안 미처리된 할 일이 여기에 표시됩니다"}
  </p>
</div>
```

with:

```tsx
<EmptyState
  icon={
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  }
  title={todoTab === "now" ? "할 일을 추가해보세요" : "곧 처리할 일이 없습니다"}
  description={
    todoTab === "now"
      ? "3일 이내에 완료하지 않으면 '곧'으로 이동합니다"
      : "3일 동안 미처리된 할 일이 여기에 표시됩니다"
  }
/>
```

(No `action` — TodoInput is visible at the bottom of the same screen.)

- [ ] **Step 3: Replace todo archive empty state (~line 597)**

Replace:

```tsx
<div className="flex-1 flex flex-col items-center justify-center text-[var(--label-tertiary)]">
  <span className="text-[56px] mb-5 opacity-30">📦</span>
  <p className="text-[20px]">보관함이 비어 있습니다</p>
  <p className="text-[15px] text-[var(--label-quaternary)] mt-1.5">30일 후 자동 삭제됩니다</p>
</div>
```

with:

```tsx
<EmptyState
  icon={
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8v13H3V8" />
      <rect x="1" y="3" width="22" height="5" rx="1" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  }
  title="보관함이 비어 있습니다"
  description="완료되지 않은 할 일이 자동 보관되며, 30일 후 삭제됩니다"
/>
```

- [ ] **Step 4: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat(ui): replace todo empty states with EmptyState component"
```

---

## Task 18: Integrate EmptyState — TimelineView (schedule)

**Files:**
- Modify: `components/TimelineView.tsx` (line ~74 empty state)

- [ ] **Step 1: Add import & replace empty state**

In `components/TimelineView.tsx`, add import:

```ts
import EmptyState from "@/components/EmptyState";
```

Find and replace the empty state block (around line 74):

```tsx
if (enriched.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-[var(--label-tertiary)]">
      <span className="text-[56px] mb-5 opacity-30">📅</span>
      {/* …existing markup… */}
    </div>
  );
}
```

with:

```tsx
if (enriched.length === 0) {
  return (
    <EmptyState
      icon={
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      }
      title="기념할 일정이 없어요"
      description="기억하고 싶은 날짜를 추가해보세요"
    />
  );
}
```

(No CTA — `app/page.tsx` already renders an "일정 추가" button below TimelineView at line ~664.)

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/TimelineView.tsx
git commit -m "feat(ui): replace TimelineView empty state with EmptyState component"
```

---

## Task 19: Integrate EmptyState — WishlistView

**Files:**
- Modify: `components/WishlistView.tsx` (lines ~60 healing, ~108 item/experience)

- [ ] **Step 1: Add import**

In `components/WishlistView.tsx`:

```ts
import EmptyState from "@/components/EmptyState";
```

- [ ] **Step 2: Replace healing empty state (~line 60)**

Replace:

```tsx
) : (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <span className="text-[56px] opacity-30">💚</span>
    <span className="text-[20px] text-[var(--label-tertiary)]">기분이 좋아지는 것들을 모아보세요</span>
  </div>
)}
```

with:

```tsx
) : (
  <EmptyState
    icon={
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    }
    title="힐링 아이템이 없어요"
    description="기분이 좋아지는 것들을 모아보세요"
  />
)}
```

- [ ] **Step 3: Replace item/experience empty state (~line 108)**

Replace:

```tsx
{active.length === 0 && completed.length === 0 && (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <span className="text-[56px] opacity-30">{categoryEmoji}</span>
    <span className="text-[20px] text-[var(--label-tertiary)]">{emptyMessage}</span>
  </div>
)}
```

with:

```tsx
{active.length === 0 && completed.length === 0 && (
  <EmptyState
    icon={
      wishTab === "item" ? (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ) : (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
    }
    title={emptyMessage}
    description={wishTab === "item" ? "갖고 싶은 것을 적어두면 잊지 않아요" : "해보고 싶은 경험을 모아보세요"}
  />
)}
```

(No CTA — "새 위시 추가" button already at the bottom of the same view.)

- [ ] **Step 4: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/WishlistView.tsx
git commit -m "feat(ui): replace WishlistView empty states with EmptyState component"
```

---

## Task 20: Integrate EmptyState — GeneralNoteView

**Files:**
- Modify: `components/GeneralNoteView.tsx` (line ~278 empty state)

- [ ] **Step 1: Determine CTA presence**

Open `components/GeneralNoteView.tsx` and read the surrounding context (lines 270-310). Identify whether there is a visible "+ 노트 추가" button on the same screen when `files.length === 0` (the `!showNameInput` case suggests there's an inline add UI elsewhere).

- [ ] **Step 2: Add import & replace empty state**

Add import:

```ts
import EmptyState from "@/components/EmptyState";
```

Replace the existing empty state block (around line 279):

```tsx
{files.length === 0 && !showNameInput ? (
  <div className="flex flex-col items-center justify-center py-24 text-[var(--label-tertiary)]">
    <span className="text-[56px] mb-5 opacity-30">📝</span>
    <p className="text-[20px]">노트가 없습니다</p>
    {/* possibly more lines */}
  </div>
) : (
```

with (use the appropriate `setShowNameInput(true)` or equivalent that opens the new-note flow — check the existing add-note handler in this component):

```tsx
{files.length === 0 && !showNameInput ? (
  <EmptyState
    icon={
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    }
    title="노트가 없습니다"
    description="자유로운 형식으로 메모를 작성해보세요"
    action={{ label: "+ 노트 추가", onClick: () => setShowNameInput(true) }}
  />
) : (
```

If the existing handler name differs from `setShowNameInput`, adapt accordingly.

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/GeneralNoteView.tsx
git commit -m "feat(ui): replace GeneralNoteView empty state with EmptyState component"
```

---

## Task 21: Integrate EmptyState — TagView

**Files:**
- Modify: `components/TagView.tsx` (add empty state when no matches)

- [ ] **Step 1: Add import & empty state branch**

In `components/TagView.tsx`, add import:

```ts
import EmptyState from "@/components/EmptyState";
```

After the `matchedTodos` / `matchedSchedules` / `matchedWishes` derivations, add:

```tsx
const totalMatches = matchedTodos.length + matchedSchedules.length + matchedWishes.length;
```

Locate the main return JSX. As the first child of the existing list-rendering area (after the header that shows the tag name & close button), add a conditional:

```tsx
{totalMatches === 0 ? (
  <EmptyState
    icon={
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    }
    title={`#${tag} 태그의 항목이 없어요`}
    description="태그가 붙은 할 일·일정·위시가 여기에 모입니다"
    action={{ label: "전체 보기", onClick: onClose }}
  />
) : (
  <>
    {/* existing rendering of matchedTodos / matchedSchedules / matchedWishes */}
  </>
)}
```

Wrap the existing matched-list rendering in the `else` branch.

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/TagView.tsx
git commit -m "feat(ui): show EmptyState when tag filter has no matches"
```

---

## Task 22: PR2 — Verification, manual checklist, push

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: all tests pass (existing + new haptic + view-transition tests).

- [ ] **Step 2: Build deployment-ready bundle**

Per project CLAUDE.md, the safe build sequence is:

```bash
pm2 stop v-todo
rm -rf .next
npx next build
pm2 start v-todo
pm2 save
```

If you are not deploying yet (still developing), just run `npx next build` to confirm production build succeeds.

- [ ] **Step 3: Manual checklist (desktop + Android)**

Open `npm run dev` and verify:
- [ ] Tab change shows cross-fade in supporting browsers
- [ ] Date prev/next slides in correct direction
- [ ] Date picker (jump to date) slides in correct direction based on whether new date is past/future
- [ ] iOS Safari < 18: tab/date change still works instantly with no error
- [ ] All 7 empty states render with new EmptyState design (todo active, todo archive, schedule timeline, wishlist healing, wishlist item/experience, general note, tag view no-match)
- [ ] EmptyState CTA branching: TagView and GeneralNote show CTA; others do not
- [ ] Reduced-motion preference disables view transitions

- [ ] **Step 4: Push branch & open PR**

```bash
git push origin <branch>
gh pr create --title "feat: native-feel visual pack (view transitions, empty states)" --body "$(cat <<'EOF'
## Summary
- Adds `lib/view-transition.ts` wrapper for `document.startViewTransition` with fallback
- Cross-fade view transition on bottom-nav tab change
- Direction-aware slide on date prev/next/pick
- Adds `<EmptyState>` shared component with optional CTA
- Replaces 7 emoji empty states across todos, schedule, wishlist, general note, tag view

Implements PR2 from `docs/superpowers/specs/2026-05-11-native-feel-polish-design.md`.

Note: spec mentioned MoodYearView year→month→day zoom transitions, but the component is a single-level heatmap with no drill-down — that application point was dropped during planning.

## Test plan
- [x] `npm test` passes
- [x] Build succeeds
- [ ] Manual checklist on desktop (Chrome/Safari) + Android device
- [ ] Verify reduced-motion behavior

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
