# Native-Feel Polish — Design

**Date:** 2026-05-11
**Goal:** Make v-todo (a web app) feel as close to a native mobile app as possible without adding native runtimes (Capacitor, etc.).

## Scope

Four work streams, split across two PRs:

- **View Transitions** — page/route-like transitions using the browser View Transitions API.
- **Haptic feedback** — tactile feedback on key interactions (Android Chrome).
- **잡소음 제거 (Noise removal)** — remove default web behaviors absent from native apps.
- **Polishing** — A (press feedback), B (easing curve unification), C (empty states), F (detail pass).

PWA install support already exists; out of scope.

## Architecture

**Principles**
- No new dependencies. Browser standard APIs + CSS only.
- Layered on top of the existing design system (`globals.css`, `ios-*` classes, shadow tokens).
- Minimize React component changes. Prefer CSS and global handlers where possible.

**New files**
- `lib/haptic.ts` — named haptic helpers (`tap`, `success`, `warning`, `selection`, `light`, `medium`).
- `lib/view-transition.ts` — wrapper for `document.startViewTransition` with fallback.
- `components/EmptyState.tsx` — shared empty-state component.

**Modified files**
- `app/globals.css` — noise-removal CSS, easing tokens (`--ease-ios`), press-feedback utility class, view-transition pseudo-elements.
- `components/BottomNav.tsx`, `DateNavigator.tsx`, `MoodYearView.tsx` — wire view transitions.
- `components/TodoItem.tsx`, `WishItem.tsx`, `ScheduleItem.tsx`, sheets (`AddScheduleSheet`, `AddWishSheet`, `HealingAddSheet`, `WishCompletionSheet`) — haptic calls.
- Main views (`WishlistView`, `TimelineView`, `DailyNoteView`, `GeneralNoteView`, `TagView`, `CheckinView`/healing area, `FileListItem`) — use `<EmptyState>`.

**Browser compatibility assumptions**
- View Transitions API: Chrome/Edge 111+, Safari 18+ (Android Chrome supported).
- Vibration API: Android Chrome / Firefox supported, iOS Safari unsupported (silent fail).
- `overscroll-behavior`: all modern browsers supported.

---

## PR1 — Behavior Pack

### 2.1 Noise removal (`globals.css`)

```css
@layer base {
  * {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
  }
  body {
    -webkit-user-select: none;
    user-select: none;
    overscroll-behavior: none; /* already present */
  }
  /* allow text selection in input/content areas */
  input, textarea, [contenteditable], .prose, [data-selectable] {
    -webkit-user-select: text;
    user-select: text;
    -webkit-touch-callout: default;
  }
  input, textarea {
    font-size: 16px; /* prevent iOS focus auto-zoom for inputs smaller than 16px */
  }
  button, a, [role="button"], [role="tab"] {
    touch-action: manipulation; /* disable double-tap zoom */
  }
}
```

Inputs at 17px Subheadline (current Body baseline) stay as-is; only inputs smaller than 16px are bumped.

### 2.2 Easing token unification

```css
:root {
  --ease-ios: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-ios-spring: cubic-bezier(0.5, 1.4, 0.4, 1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
}
```

Sweep replace ad-hoc `ease`, `ease-out`, and inline cubic-beziers with `var(--ease-ios)` + an appropriate duration token. Sheet/Toast already use the same cubic-bezier; only the literal is replaced with the token.

### 2.3 Press feedback (Polishing A)

```css
@layer utilities {
  .press {
    transition: transform var(--duration-fast) var(--ease-ios);
  }
  .press:active {
    transform: scale(0.97);
  }
}
```

Apply `.press` to: `<button>`, `[role="button"]`, tab items, card-shaped clickable areas (TodoItem row, WishItem card, ScheduleItem row). Do not apply to text inputs or pure scroll containers.

### 2.4 Haptic (`lib/haptic.ts`)

```ts
type Pattern = number | number[];

const vibrate = (p: Pattern) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(p);
  }
};

export const haptic = {
  selection: () => vibrate(5),    // tab change, date change
  light: () => vibrate(8),        // sheet open
  tap: () => vibrate(10),         // todo check
  medium: () => vibrate(15),      // wish completion modal open
  success: () => vibrate([20, 30, 40]),  // wish completion
  warning: () => vibrate([40, 30, 40]),  // item delete confirm
};
```

**Call sites**
- `TodoItem` check toggle → `haptic.tap()`
- `WishCompletionSheet` confirm → `haptic.success()`
- All delete `onConfirm` handlers → `haptic.warning()`
- 4 sheets on mount → `haptic.light()`
- `BottomNav` tab click → `haptic.selection()`
- `DateNavigator` date change → `haptic.selection()`
- `WishItem` completion-modal trigger → `haptic.medium()`

### 2.5 Detail pass (Polishing F)

Fix obviously inconsistent items found while implementing the above (shadow tone mismatch, dark-mode contrast issues, awkward spacing). Don't pre-define a list. Record findings in the PR description.

---

## PR2 — Visual Pack

### 3.1 View Transitions

**Wrapper** (`lib/view-transition.ts`):
```ts
export function withViewTransition(updater: () => void) {
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    (document as any).startViewTransition(updater);
  } else {
    updater();
  }
}
```

**`globals.css` additions:**
```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 280ms;
  animation-timing-function: var(--ease-ios);
}

/* Tab change: slide + fade */
::view-transition-old(tab-content) {
  animation: slideOutLeft 280ms var(--ease-ios) both;
}
::view-transition-new(tab-content) {
  animation: slideInRight 280ms var(--ease-ios) both;
}

/* Year → Month → Day zoom */
::view-transition-old(year-cell-active) {
  animation: zoomOut 320ms var(--ease-ios) both;
}
::view-transition-new(month-content) {
  animation: zoomIn 320ms var(--ease-ios) both;
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*) { animation: none !important; }
}
```

(Keyframes `slideOutLeft`, `slideInRight`, `zoomOut`, `zoomIn` defined alongside existing keyframes.)

**Application points**
- `BottomNav` tab change: container has `view-transition-name: tab-content`; wrap `setActiveTab` in `withViewTransition`.
- `DateNavigator` ←/→: main content has `view-transition-name: date-content`; switch slide direction based on prev/next.
- `MoodYearView` year → month → day zoom: dynamically assign `view-transition-name` to the clicked cell, remove after transition.

### 3.2 Empty States

**Component** (`components/EmptyState.tsx`):
```tsx
type Props = {
  icon: ReactNode;        // 24~32px stroke SVG
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
};
```

Layout: vertically centered, icon (`var(--label-tertiary)`), title 17px medium, description 15px secondary, CTA as a light outlined button.

**Application — 7-8 sites with CTA branching**

Input UI present on the same screen → **copy only**:
1. Todo (incomplete list empty) — input visible. Copy only.
2. Schedule empty — entry via FAB. Copy only.
3. DailyNote empty — editor itself is the entry. Copy only.

Separate entry needed → **with CTA**:
4. Wishlist empty — "+ 위시 추가"
5. GeneralNote empty — "+ 노트 추가"
6. TagView empty result — "전체 보기" (clear filter)
7. Healing empty — "+ 추가"
8. FileList empty — copy only (usually auto-generated)

**Icons**: inline SVG, Lucide-style stroke 1.5, 24px. One per component; no library dependency.

**Copy tone**: short and warm. Examples: "아직 적어둔 위시가 없어요" / "작은 것부터 적어볼까요?"

---

## Risks & Edge Cases

1. **`user-select: none` blocking note text selection** — allow on `input, textarea, [contenteditable], .prose, [data-selectable]`.
2. **iOS input auto-zoom** — force input font-size 16px+. Avoid `maximum-scale=1` (accessibility).
3. **`view-transition-name` collision** — must be unique per active transition. For zoom, dynamically assign to the active cell only and clear after transition.
4. **Press feedback triggering on scroll start** — CSS `:active` only, no JS state. Some residual flicker possible but acceptable.
5. **Vibration API unsupported environment** — feature-detect, silent skip.
6. **View Transitions overlapping with sheets** — sheets stay mounted with `transform`; don't interact with view transition root.
7. **Easing sweep regression** — review per file rather than blanket grep replace. Sheet/Toast already use the same cubic-bezier value.

---

## Testing Strategy

**Automated (vitest)**
- `lib/haptic.test.ts` — mock `navigator.vibrate`; assert each helper calls with correct pattern; silent fail when navigator missing.
- `lib/view-transition.test.ts` — when `startViewTransition` unsupported, updater called immediately; when supported, wrapped.
- `components/EmptyState.test.tsx` — renders with/without action; CTA click handler fires.

CSS changes, integrated haptic calls, and view-transition wiring are not worth automating — manual.

**Manual checklist (Android device + desktop)**

PR1:
- [ ] Buttons no longer flash blue/grey highlight box
- [ ] Long-press shows no text selection menu (notes still allow selection)
- [ ] Pull-down does not trigger pull-to-refresh
- [ ] Sheet inner scroll does not affect page
- [ ] Input focus does not zoom
- [ ] Todo check vibrates (Android)
- [ ] Wish completion vibrates with success pattern
- [ ] Delete confirm vibrates with warning pattern
- [ ] All clickable elements scale slightly on press
- [ ] Dark-mode toggle visually consistent
- [ ] `prefers-reduced-motion` ends all animation immediately

PR2:
- [ ] Tab change shows slide transition
- [ ] Date ←/→ slides in correct direction
- [ ] MoodYearView cell click zooms in
- [ ] iOS Safari < 18 falls back (no error, instant change)
- [ ] All 8 empty states render correctly
- [ ] CTA branching follows the rule (3 copy-only, 5 with CTA)

**TDD** — apply to the 3 new files (`haptic.ts`, `view-transition.ts`, `EmptyState.tsx`). CSS and integration changes verified manually.
