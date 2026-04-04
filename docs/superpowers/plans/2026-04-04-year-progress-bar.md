# Year Progress Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 연도의 진행률을 프로그레스 바로 표시하는 컴포넌트를 만들어 데스크탑 사이드바 상단과 모바일 헤더 아래에 배치한다.

**Architecture:** 단일 `YearProgress` 컴포넌트가 로컬 KST 기준으로 연간 경과 퍼센트를 계산하여, full-width 바 위에 "2026  25.5%" 텍스트를 overlay로 표시한다. Sidebar와 Content 두 곳에 렌더링하되, CSS로 반응형 분기한다.

**Tech Stack:** React, Tailwind CSS v4, CSS custom properties (Catppuccin theme)

---

## File Structure

- **Create:** `components/YearProgress.tsx` — 연간 진행률 프로그레스 바 컴포넌트
- **Modify:** `app/page.tsx:292-297` — Sidebar에 YearProgress 삽입 (타이틀과 nav 사이)
- **Modify:** `app/page.tsx:498-499` — Content에 YearProgress 삽입 (모바일 전용, 탭 위)

---

### Task 1: YearProgress 컴포넌트 생성

**Files:**
- Create: `components/YearProgress.tsx`

- [ ] **Step 1: 컴포넌트 파일 생성**

`components/YearProgress.tsx`:

```tsx
export default function YearProgress() {
  const now = new Date();
  const year = now.getFullYear();

  const startOfYear = new Date(year, 0, 1);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const totalDays = isLeapYear ? 366 : 365;

  const percent = (dayOfYear / totalDays) * 100;
  const display = percent.toFixed(1);

  return (
    <div className="relative w-full h-5 rounded-full overflow-hidden bg-[var(--sys-fill-secondary)]">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-[var(--sys-blue)]"
        style={{ width: `${display}%` }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-[13px] text-[var(--sys-label-secondary)] font-medium">
        {year}&nbsp;&nbsp;{display}%
      </span>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add components/YearProgress.tsx
git commit -m "feat: add YearProgress component"
```

---

### Task 2: Sidebar에 YearProgress 배치 (데스크탑)

**Files:**
- Modify: `app/page.tsx:292-300`

- [ ] **Step 1: import 추가**

`app/page.tsx` 상단 import 목록에 추가:

```tsx
import YearProgress from "@/components/YearProgress";
```

- [ ] **Step 2: Sidebar의 타이틀과 nav 사이에 삽입**

`app/page.tsx`의 Sidebar 내부, `</div>` (타이틀 닫힘, 라인 ~297) 바로 뒤, `<nav>` (라인 ~300) 바로 앞에 삽입:

```tsx
      {/* Year Progress */}
      <div className="px-5 pb-4">
        <YearProgress />
      </div>
```

- [ ] **Step 3: 커밋**

```bash
git add app/page.tsx
git commit -m "feat: add YearProgress to desktop sidebar"
```

---

### Task 3: Content에 YearProgress 배치 (모바일)

**Files:**
- Modify: `app/page.tsx:498-499`

- [ ] **Step 1: 탭 영역 바로 위에 모바일 전용 YearProgress 삽입**

`app/page.tsx`의 Content 내부, `{/* Tabs */}` 주석이 있는 `<div className="md:px-8 pt-1 pb-2">` 바로 앞에 삽입:

```tsx
      {/* Year Progress (mobile) */}
      <div className="md:hidden px-5 pb-2">
        <YearProgress />
      </div>
```

- [ ] **Step 2: 커밋**

```bash
git add app/page.tsx
git commit -m "feat: add YearProgress to mobile header area"
```

---

### Task 4: 빌드 검증 및 배포

**Files:**
- None (검증만)

- [ ] **Step 1: 빌드 확인**

```bash
pm2 stop v-todo
rm -rf .next
npx next build
```

Expected: 빌드 성공, 에러 없음

- [ ] **Step 2: 빌드 아티팩트 확인**

```bash
ls .next/BUILD_ID
ls .next/prerender-manifest.json
```

Expected: 두 파일 모두 존재

- [ ] **Step 3: PM2 재시작**

```bash
pm2 start v-todo
pm2 save
```

- [ ] **Step 4: 커밋 (변경사항 있을 경우에만)**

빌드 과정에서 코드 수정이 필요했다면 커밋. 아니면 스킵.
