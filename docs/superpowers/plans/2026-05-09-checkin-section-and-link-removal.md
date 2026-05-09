# 체크인 섹션 분리 & 링크 피처 제거 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 데일리 노트 뷰에서 기분/감사를 새 최상위 섹션 "체크인"으로 분리하고, 링크 피처(텔레그램 봇 폴러 포함)를 코드/데이터/설정에서 완전히 제거한다.

**Architecture:** 새 섹션 `checkin`이 BottomNav에서 링크 자리를 차지한다. `CheckinView`는 `DateNavigator + MoodInput + GratitudeSection`을 감싸는 단순 래퍼다. 링크 관련 모든 파일(컴포넌트, API 라우트, 스토어, 텔레그램 폴러, instrumentation, 테스트, 데이터, 설정 문서)을 삭제한다.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Vitest 4

**Spec:** `docs/superpowers/specs/2026-05-09-checkin-section-and-link-removal-design.md`

---

## File Map

**신규**
- `components/CheckinView.tsx` — 체크인 섹션 본문

**수정**
- `types/index.ts` — `Section` 타입에서 `link` 제거, `checkin` 추가; `Link`/`LinkStore` 타입 삭제
- `components/BottomNav.tsx` — 링크 버튼 → 체크인 버튼 (미소 얼굴 아이콘)
- `components/DailyNoteView.tsx` — `MoodInput`/`GratitudeSection` 제거, 에디터 높이 단순화
- `app/page.tsx` — 링크 import/state/fetch/handlers/swipe/sidebar/header/content rendering 모두 제거; checkin 라우팅 추가
- `.env.local.example` — 텔레그램 환경변수 블록 삭제
- `CLAUDE.md` — "텔레그램 링크 봇 설정" 섹션 삭제

**삭제**
- `components/LinkSection.tsx`, `components/LinkCard.tsx`, `components/AddLinkSheet.tsx`
- `app/api/links/route.ts`, `app/api/links/[id]/route.ts`
- `lib/link-store.ts`, `lib/telegram-poller.ts`, `lib/url-extract.ts`
- `lib/__tests__/link-store.test.ts`, `lib/__tests__/api-links.test.ts`, `lib/__tests__/telegram-poller.test.ts`, `lib/__tests__/url-extract.test.ts`
- `instrumentation.ts` (전체가 폴러 등록 전용)
- `data/links.json` (gitignored 디스크 파일)

---

## Task 1: CheckinView 컴포넌트 생성

체크인 섹션 본문이 될 단순 래퍼. `DailyNoteView`에서 검증된 날짜 상태/유틸 패턴을 그대로 따른다.

**Files:**
- Create: `components/CheckinView.tsx`

- [ ] **Step 1: 새 컴포넌트 작성**

`components/CheckinView.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import DateNavigator from "@/components/DateNavigator";
import MoodInput from "@/components/MoodInput";
import GratitudeSection from "@/components/GratitudeSection";

function dateToString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CheckinView() {
  const [date, setDate] = useState(() => new Date());

  const handleDateChange = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DateNavigator date={date} onChange={handleDateChange} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <MoodInput date={dateToString(date)} />
        <GratitudeSection date={dateToString(date)} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (`Link` 타입은 아직 존재하므로 page.tsx도 영향 없음).

- [ ] **Step 3: 커밋**

```bash
git add components/CheckinView.tsx
git commit -m "feat(checkin): add CheckinView wrapper component"
```

---

## Task 2: 섹션 전환 (link → checkin)

`Section` 타입, BottomNav 버튼, Sidebar nav, 헤더 타이틀 매핑, 스와이프 네비게이션, 콘텐츠 라우팅, 링크 관련 state/handler/import — 한 번에 원자적으로 교체한다. 이 커밋 직후엔 링크 파일들이 디스크엔 남아있지만 어디서도 import되지 않는다.

**Files:**
- Modify: `types/index.ts`
- Modify: `components/BottomNav.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: `types/index.ts` 수정**

`Section` 타입 변경:

```ts
// before
export type Section = "todo" | "note" | "link" | "wish" | "dday";

// after
export type Section = "todo" | "note" | "checkin" | "wish" | "dday";
```

`Link`와 `LinkStore` 인터페이스 블록 전체 삭제 (파일 219번 줄 근처 `// Links` 주석 포함). 다른 타입은 건드리지 않는다.

- [ ] **Step 2: `components/BottomNav.tsx` 수정**

링크 버튼 블록 (현재 60~77번 줄 근처) 전체를 체크인 버튼으로 교체. 키는 `checkin`, 라벨은 `체크인`, 아이콘은 미소 얼굴.

```tsx
{/* 체크인 */}
<button
  className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
    active === "checkin"
      ? "text-[var(--accent-primary)]"
      : "text-[var(--label-tertiary)]"
  }`}
  onClick={() => onChange("checkin")}
>
  <svg width="25" height="25" viewBox="0 0 25 25" fill={active === "checkin" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active === "checkin" ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
    {active === "checkin" ? (
      <path fillRule="evenodd" clipRule="evenodd" d="M12.5 2.5C7 2.5 2.5 7 2.5 12.5S7 22.5 12.5 22.5 22.5 18 22.5 12.5 18 2.5 12.5 2.5zM9.2 10.8a1.3 1.3 0 110-2.6 1.3 1.3 0 010 2.6zm6.6 0a1.3 1.3 0 110-2.6 1.3 1.3 0 010 2.6zM7.7 14.5h9.6c-.9 2.6-3.1 4.3-4.8 4.3s-3.9-1.7-4.8-4.3z" />
    ) : (
      <>
        <circle cx="12.5" cy="12.5" r="9.5" />
        <circle cx="9.2" cy="10" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="15.8" cy="10" r="1.1" fill="currentColor" stroke="none" />
        <path d="M8 14.5c.9 2 2.6 3.3 4.5 3.3s3.6-1.3 4.5-3.3" />
      </>
    )}
  </svg>
  <span className="text-[12px] font-medium">체크인</span>
</button>
```

- [ ] **Step 3: `app/page.tsx` import 정리**

4번 줄 import에서 `Link` 제거:

```ts
// before
import type { Todo, Schedule, ScheduleType, RepeatMode, Section, NoteTab, WishItem, WishCategory, Link } from "@/types";

// after
import type { Todo, Schedule, ScheduleType, RepeatMode, Section, NoteTab, WishItem, WishCategory } from "@/types";
```

21번 줄(`AddLinkSheet`)과 25번 줄(`LinkSection`) import 라인 삭제.

- [ ] **Step 4: `app/page.tsx` state 정리**

47~49번 줄의 링크 관련 state 3줄 삭제:

```ts
const [links, setLinks] = useState<Link[]>([]);
const [linkTab, setLinkTab] = useState<"unread" | "read">("unread");
const [showAddLink, setShowAddLink] = useState(false);
```

- [ ] **Step 5: `app/page.tsx` fetchLinks 및 초기 로딩 정리**

97~105번 줄의 `fetchLinks` 콜백 전체 삭제. 그리고 107~111번 줄 `useEffect`의 `Promise.all`을 다음과 같이 수정:

```ts
// before
useEffect(() => {
  Promise.all([fetchTodos(), fetchSchedules(), fetchWishes(), fetchLinks()]).finally(
    () => setLoading(false)
  );
}, [fetchTodos, fetchSchedules, fetchWishes, fetchLinks]);

// after
useEffect(() => {
  Promise.all([fetchTodos(), fetchSchedules(), fetchWishes()]).finally(
    () => setLoading(false)
  );
}, [fetchTodos, fetchSchedules, fetchWishes]);
```

- [ ] **Step 6: `app/page.tsx` 링크 액션 핸들러 삭제**

336~383번 줄의 다음 함수 블록 전체 삭제:
- `// Link actions` 주석
- `toggleLinkRead`
- `deleteLink`
- `saveNewLink`

- [ ] **Step 7: `app/page.tsx` Sidebar 링크 버튼을 체크인으로 교체**

491~508번 줄의 링크 버튼 블록을 체크인 버튼으로 교체:

```tsx
<button
  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
    section === "checkin"
      ? "bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]"
      : "text-[var(--label-primary)] hover:bg-[var(--fill-quaternary)]"
  }`}
  onClick={() => setSection("checkin")}
>
  <svg width="22" height="22" viewBox="0 0 22 22" fill={section === "checkin" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={section === "checkin" ? "0" : "1.6"} strokeLinecap="round" strokeLinejoin="round">
    {section === "checkin" ? (
      <path fillRule="evenodd" clipRule="evenodd" d="M11 1.5C5.8 1.5 1.5 5.8 1.5 11s4.3 9.5 9.5 9.5 9.5-4.3 9.5-9.5S16.2 1.5 11 1.5zM7.9 9.5a1.1 1.1 0 110-2.2 1.1 1.1 0 010 2.2zm6.2 0a1.1 1.1 0 110-2.2 1.1 1.1 0 010 2.2zM6.5 12.8h9c-.9 2.4-2.9 4-4.5 4s-3.6-1.6-4.5-4z" />
    ) : (
      <>
        <circle cx="11" cy="11" r="8.5" />
        <circle cx="7.9" cy="8.7" r="0.95" fill="currentColor" stroke="none" />
        <circle cx="14.1" cy="8.7" r="0.95" fill="currentColor" stroke="none" />
        <path d="M6.8 12.8c.8 1.8 2.4 3 4.2 3s3.4-1.2 4.2-3" />
      </>
    )}
  </svg>
  <span className="text-[15px] font-medium flex-1">체크인</span>
</button>
```

(링크 버튼에 있던 `links.filter((l) => !l.read).length` 카운트 배지는 제거 — 체크인은 카운트 표시 안 함.)

- [ ] **Step 8: `app/page.tsx` 헤더 타이틀 매핑 수정 (2곳)**

636번 줄 (모바일 헤더):

```tsx
// before
{section === "todo" ? "할 일" : section === "note" ? "노트" : section === "link" ? "링크" : section === "wish" ? "위시" : "D-day"}

// after
{section === "todo" ? "할 일" : section === "note" ? "노트" : section === "checkin" ? "체크인" : section === "wish" ? "위시" : "D-day"}
```

667번 줄 (데스크톱 헤더): 동일하게 교체.

- [ ] **Step 9: `app/page.tsx` 스와이프 네비게이션 수정**

595~597번 줄의 `section === "link"` 분기 전체 삭제. 체크인은 단일 화면(서브탭 없음)이라 좌우 스와이프 시 섹션 내부 전환 동작이 없다 — 분기를 추가하지 않고 그냥 빠진 채로 둔다.

수정 전:
```ts
} else if (section === "link") {
  if (dir === "left" && linkTab === "unread") setLinkTab("read");
  if (dir === "right" && linkTab === "read") setLinkTab("unread");
} else if (section === "wish") {
```

수정 후:
```ts
} else if (section === "wish") {
```

- [ ] **Step 10: `app/page.tsx` 콘텐츠 라우팅 수정**

728~737번 줄의 `section === "link"` 분기를 `section === "checkin"` 분기로 교체:

```tsx
// before
) : section === "link" ? (
  <LinkSection
    links={links}
    activeTab={linkTab}
    onTabChange={setLinkTab}
    onToggleRead={toggleLinkRead}
    onDelete={deleteLink}
    onTagClick={(tag) => setActiveTag(tag)}
    onAdd={() => setShowAddLink(true)}
  />
) : section === "wish" ? (

// after
) : section === "checkin" ? (
  <CheckinView />
) : section === "wish" ? (
```

`CheckinView` import를 page.tsx 상단 import 블록에 추가 (`DailyNoteView` 근처):

```tsx
import CheckinView from "@/components/CheckinView";
```

- [ ] **Step 11: `app/page.tsx` AddLinkSheet 모달 삭제**

900~905번 줄의 `{showAddLink && (...)}` 블록 전체 삭제.

- [ ] **Step 12: 빌드 검증**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

Run: `npm run lint`
Expected: 경고/에러 없음 (또는 기존 경고 수준 유지).

- [ ] **Step 13: 커밋**

```bash
git add types/index.ts components/BottomNav.tsx app/page.tsx
git commit -m "feat(checkin): replace link section with checkin section"
```

---

## Task 3: DailyNoteView를 에디터 전용으로

`DailyNoteView`에서 `MoodInput`, `GratitudeSection`을 제거하고, 에디터가 부모 컨테이너 높이를 자연스럽게 가득 채우도록 단순화한다.

**Files:**
- Modify: `components/DailyNoteView.tsx`

- [ ] **Step 1: DailyNoteView 수정**

파일 상단 import 정리:

```tsx
// before
import { useState, useEffect, useCallback, useRef } from "react";
import DateNavigator from "@/components/DateNavigator";
import NoteEditor from "@/components/NoteEditor";
import GratitudeSection from "@/components/GratitudeSection";
import MoodInput from "@/components/MoodInput";

// after
import { useState, useEffect, useCallback, useRef } from "react";
import DateNavigator from "@/components/DateNavigator";
import NoteEditor from "@/components/NoteEditor";
```

return 블록 (102~124번 줄)을 다음으로 교체:

```tsx
return (
  <div className="flex flex-col flex-1 min-h-0">
    <DateNavigator date={date} onChange={handleDateChange} />
    {saveStatus !== "idle" && (
      <div className="px-5 md:px-0 pb-1 text-right">
        <span className="text-[13px] text-[var(--label-tertiary)]">
          {saveStatus === "saving" ? "저장 중..." : "저장됨"}
        </span>
      </div>
    )}
    <div className="flex-1 min-h-0 flex flex-col">
      <NoteEditor
        content={content}
        onChange={handleChange}
        placeholder="오늘의 노트를 작성하세요..."
      />
    </div>
  </div>
);
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 시각 검증 (수동)**

`npm run dev`로 띄우고 노트 → 데일리 탭 진입. 에디터가 화면을 가득 채우는지 확인. 위에 DateNavigator + (있다면) 저장 status 한 줄만 있어야 함.

- [ ] **Step 4: 커밋**

```bash
git add components/DailyNoteView.tsx
git commit -m "refactor(daily-note): editor-only view, mood/gratitude moved to checkin"
```

---

## Task 4: 링크 관련 파일 일괄 삭제

이 시점에서 링크 컴포넌트/API/스토어/폴러는 어디서도 import되지 않는다. 삭제해도 빌드/타입체크/테스트가 깨지지 않는다.

**Files:**
- Delete: `components/LinkSection.tsx`, `components/LinkCard.tsx`, `components/AddLinkSheet.tsx`
- Delete: `app/api/links/route.ts`, `app/api/links/[id]/route.ts`
- Delete: `lib/link-store.ts`, `lib/telegram-poller.ts`, `lib/url-extract.ts`
- Delete: `lib/__tests__/link-store.test.ts`, `lib/__tests__/api-links.test.ts`, `lib/__tests__/telegram-poller.test.ts`, `lib/__tests__/url-extract.test.ts`
- Delete: `instrumentation.ts`
- Delete: `data/links.json` (gitignored — 디스크에서만 삭제)

- [ ] **Step 1: 컴포넌트 파일 삭제**

```bash
git rm components/LinkSection.tsx components/LinkCard.tsx components/AddLinkSheet.tsx
```

- [ ] **Step 2: API 라우트 디렉토리 삭제**

```bash
git rm -r app/api/links
```

- [ ] **Step 3: lib 파일 + 테스트 삭제**

```bash
git rm lib/link-store.ts lib/telegram-poller.ts lib/url-extract.ts
git rm lib/__tests__/link-store.test.ts lib/__tests__/api-links.test.ts lib/__tests__/telegram-poller.test.ts lib/__tests__/url-extract.test.ts
```

- [ ] **Step 4: instrumentation.ts 삭제**

```bash
git rm instrumentation.ts
```

- [ ] **Step 5: data/links.json 삭제 (gitignored)**

```bash
rm -f data/links.json
```

- [ ] **Step 6: 잔여 참조 검색**

Run: `grep -rn -E "(link-store|telegram-poller|url-extract|LinkSection|LinkCard|AddLinkSheet|/api/links)" --include='*.ts' --include='*.tsx' .` 
(node_modules, .next, .test-data, docs/superpowers는 제외)

```bash
grep -rn -E "(link-store|telegram-poller|url-extract|LinkSection|LinkCard|AddLinkSheet|/api/links)" \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.test-data --exclude-dir=docs \
  .
```

Expected: 매치 없음. (있다면 그 파일도 정리.)

- [ ] **Step 7: 타입 체크 + 테스트**

```bash
npx tsc --noEmit
npm test
```

Expected: 둘 다 통과. 테스트 개수가 링크 테스트 만큼 줄어든 채로 PASS.

- [ ] **Step 8: 빌드 검증**

```bash
npx next build
```

Expected: 빌드 성공. `.next/BUILD_ID`와 `.next/prerender-manifest.json` 존재.

- [ ] **Step 9: 커밋**

```bash
git commit -m "chore: remove link feature, telegram poller, and url-extract"
```

---

## Task 5: 설정 문서/예시 정리

`.env.local.example`과 `CLAUDE.md`에서 텔레그램 링크 봇 안내를 제거한다.

**Files:**
- Modify: `.env.local.example`
- Modify: `CLAUDE.md`

- [ ] **Step 1: `.env.local.example` 정리**

`Telegram link archive bot` 주석으로 시작하는 블록과 관련 키 모두 제거 (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_ID`, `LINK_POLLER_*`).

남는 항목 외엔 남기지 않는다. 결과 파일에 `LINK_POLLER`, `TELEGRAM_` 키워드가 0건이어야 함.

검증:
```bash
grep -E "(LINK_POLLER|TELEGRAM_)" .env.local.example
```
Expected: 매치 없음.

- [ ] **Step 2: `CLAUDE.md` 정리**

"## 텔레그램 링크 봇 설정" 헤더부터 그 섹션 끝까지 (다음 `##` 헤더 직전까지 또는 파일 끝까지) 모두 삭제. 다른 섹션(`## 배포`, `## 코드 규칙`)은 보존.

검증:
```bash
grep -E "(텔레그램|TELEGRAM_|LINK_POLLER)" CLAUDE.md
```
Expected: 매치 없음.

- [ ] **Step 3: 커밋**

```bash
git add .env.local.example CLAUDE.md
git commit -m "docs: remove telegram link bot setup guide"
```

---

## Task 6: 통합 검증

전체 변경의 빌드/테스트/수동 동작 검증.

**Files:** (수정 없음)

- [ ] **Step 1: 클린 빌드**

```bash
rm -rf .next
npx next build
```

Expected: 빌드 성공.

- [ ] **Step 2: 전체 테스트**

```bash
npm test
```

Expected: 모든 테스트 PASS (링크 관련 테스트는 빠진 상태).

- [ ] **Step 3: 린트**

```bash
npm run lint
```

Expected: 새 에러/경고 없음.

- [ ] **Step 4: 수동 동작 검증 (`npm run dev`)**

브라우저에서 다음을 확인:

1. BottomNav: `할 일 / 노트 / 체크인 / 위시 / D-day` 5개 버튼. 체크인 자리에 미소 얼굴 아이콘.
2. 데스크톱 Sidebar에도 동일하게 체크인 항목 표시.
3. 체크인 탭 진입 → DateNavigator + 오늘의 기분 카드 + 오늘의 감사 카드. 기분 선택/감사 입력이 저장되고 다른 날짜로 이동했다 돌아와도 유지됨.
4. 노트 → 데일리 탭 진입 → 오직 DateNavigator + 에디터. 기분/감사 카드는 보이지 않음. 에디터가 화면 대부분을 차지.
5. 노트 서브탭(데일리/노트/무드) 그대로 동작.
6. 모바일에서 좌우 스와이프: 노트 안에서 데일리/노트/무드 전환 동작. 체크인은 단일 화면.
7. 위시/D-day/할 일 — 영향 없음.
8. 헤더 타이틀: 체크인 섹션에서 "체크인"이 표시.

- [ ] **Step 5: 잔여 참조 최종 스캔**

```bash
grep -rn -i "link" --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.test-data --exclude-dir=docs \
  . | grep -v "linkTitle\|link-store\b" || true
```

`HealingCard.tsx`의 `linkTitle` 매치 외에 링크 섹션과 관련된 잔여물이 없는지 눈으로 확인. (HealingCard의 URL 타입 힐링 아이템은 본 작업과 무관.)

```bash
grep -rn "checkin" --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules --exclude-dir=.next .
```

Expected: `types/index.ts`, `components/BottomNav.tsx`, `components/CheckinView.tsx`, `app/page.tsx` 등 의도한 곳에만 등장.

---

## 완료 기준

- 빌드/타입체크/테스트/린트 모두 통과
- 체크인 섹션이 BottomNav/Sidebar에서 링크 자리에 위치하고 미소 얼굴 아이콘 표시
- 체크인 탭에서 기분/감사 입력 가능, 날짜 이동 가능
- 데일리 노트 탭은 에디터만, 화면을 가득 채움
- 링크 관련 코드/테스트/데이터/설정 문서 잔여물 0건 (HealingCard의 URL 타입 힐링 아이템은 별개로 보존)
