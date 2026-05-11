# 무드 탭 이전 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 노트 섹션의 "무드" 탭을 제거하고, 체크인 화면의 무드 입력 옆 진입점에서 열리는 `ios-sheet` 시트로 `MoodYearView`를 이전한다.

**Architecture:** `MoodYearView` 컴포넌트는 그대로 두고, 그 위에 시트 래퍼(`MoodYearSheet`)를 새로 만들어 `BriefingModal`과 동일한 `ios-sheet` 패턴(모바일 하단 시트 / 데스크탑 중앙 모달)으로 보여준다. 진입은 `MoodInput`의 "오늘의 기분" 라벨 옆 작은 텍스트 버튼에서 한다. 노트 섹션은 `daily / general` 두 탭으로 축소된다.

**Tech Stack:** Next.js, React client components, Tailwind, 기존 `ios-sheet` CSS 클래스.

**Spec:** `docs/superpowers/specs/2026-05-12-mood-tab-relocation-design.md`

---

## File Structure

**변경 파일:**
- `types/index.ts` — `NoteTab` 타입 축소
- `app/page.tsx` — mood 탭 분기/스와이프 배열/import 제거
- `components/MoodInput.tsx` — 진입점 버튼 + 시트 state, `MoodYearSheet` import

**신규 파일:**
- `components/MoodYearSheet.tsx` — `BriefingModal` 패턴의 얇은 시트 래퍼

**변경 없음:**
- `components/MoodYearView.tsx` — 시트 안에서 그대로 렌더
- `app/api/moods/route.ts`, `lib/mood-store.ts` — 데이터 레이어 그대로

---

## Task 1: `NoteTab` 타입 축소

**Files:**
- Modify: `types/index.ts:94`

- [ ] **Step 1: `NoteTab`에서 `"mood"` 제거**

`types/index.ts:94`를 다음으로 변경:

```typescript
export type NoteTab = "daily" | "general" | "mood";
```

→

```typescript
export type NoteTab = "daily" | "general";
```

- [ ] **Step 2: 타입체크 실행 — `app/page.tsx`에서 컴파일 오류가 떠야 정상**

Run: `npx tsc --noEmit`

Expected: `app/page.tsx`에서 mood 관련 줄(`noteTabs: NoteTab[] = ["daily", "general", "mood"]`, ternary 조건) 때문에 타입 에러 발생. 이 에러는 Task 4에서 제거하면서 해소된다. 이번 단계에서는 에러를 확인만 한다(커밋하지 않음).

- [ ] **Step 3: 커밋하지 않음**

이 변경은 Task 4와 함께 한 커밋으로 묶는다(`page.tsx` 동시 수정이 필요하기 때문).

---

## Task 2: `MoodYearSheet` 컴포넌트 신규 작성

**Files:**
- Create: `components/MoodYearSheet.tsx`

`BriefingModal.tsx`와 동일한 `ios-sheet` 구조를 사용한다. 본문에 `<MoodYearView />`를 렌더한다.

- [ ] **Step 1: 신규 파일 작성**

`components/MoodYearSheet.tsx`를 다음 내용으로 생성:

```tsx
"use client";

import MoodYearView from "@/components/MoodYearView";

interface MoodYearSheetProps {
  onClose: () => void;
}

export default function MoodYearSheet({ onClose }: MoodYearSheetProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center ios-sheet-overlay"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="ios-sheet w-full max-w-lg max-h-[80vh] flex flex-col rounded-t-[16px] md:rounded-[16px]"
        style={{
          background: "var(--sys-bg-elevated)",
          boxShadow: "var(--shadow-xl)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drag-handle md:hidden" />

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-[14px]"
          style={{ borderBottom: "0.5px solid var(--sys-separator)" }}
        >
          <div className="w-[50px]" />
          <h3
            className="text-[20px] font-semibold"
            style={{ color: "var(--sys-label)" }}
          >
            올해 무드
          </h3>
          <button
            onClick={onClose}
            className="text-[20px] font-semibold w-[50px] text-right active:opacity-60 transition-opacity"
            style={{ color: "var(--sys-blue)" }}
          >
            완료
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <MoodYearView />
        </div>
      </div>
    </div>
  );
}
```

**구현 메모:**
- 오버레이 클릭으로 닫기 위해 `onClick={onClose}`를 오버레이에 걸고, 시트 컨테이너에는 `e.stopPropagation()`을 걸어 내부 클릭으로 닫히지 않게 한다(BriefingModal에는 이 stopPropagation이 없지만, 일관성을 위해 본 시트에서는 추가). 차후 BriefingModal과 패턴 통일 필요 시 따로 처리.
- `max-w-lg max-h-[80vh]`로 BriefingModal과 동일한 사이즈 컨벤션.
- 본문에 추가 패딩을 두지 않는다. `MoodYearView` 내부의 `px-5 md:px-0 py-4`가 좌우 여백을 책임진다.

- [ ] **Step 2: 컴포넌트가 단독으로 컴파일되는지 타입체크**

Run: `npx tsc --noEmit`

Expected: `components/MoodYearSheet.tsx` 관련 오류 없음. (Task 1에서 들어온 `page.tsx`의 mood 타입 에러는 여전히 존재.)

- [ ] **Step 3: 커밋**

```bash
git add components/MoodYearSheet.tsx
git commit -m "feat(mood): add MoodYearSheet wrapper using ios-sheet pattern"
```

---

## Task 3: `MoodInput`에 진입점 버튼 추가

**Files:**
- Modify: `components/MoodInput.tsx`

"오늘의 기분" 라벨이 있는 헤더 줄(현재 `justify-between`이지만 우측이 비어 있음)의 우측에 작은 텍스트 버튼을 둔다. 누르면 시트가 열린다.

- [ ] **Step 1: import 추가**

`components/MoodInput.tsx` 상단 import 블록에 추가:

```typescript
import MoodYearSheet from "@/components/MoodYearSheet";
```

기존:
```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import { haptic } from "@/lib/haptic";
```

변경 후:
```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import { haptic } from "@/lib/haptic";
import MoodYearSheet from "@/components/MoodYearSheet";
```

- [ ] **Step 2: 시트 state 추가**

`MoodInput` 함수 본문 첫 줄(`const [selected, setSelected] ...` 바로 아래)에 추가:

```typescript
const [showYearSheet, setShowYearSheet] = useState(false);
```

CLAUDE.md 규칙: React hooks는 컴포넌트 최상위에 선언할 것 → state 선언부와 같이 둠.

- [ ] **Step 3: 헤더에 진입점 버튼 추가**

현재 헤더(라인 61-65):
```tsx
<div className="flex items-center justify-between px-4 py-3">
  <div className="flex items-center gap-2">
    <span className="text-[17px] font-semibold text-[var(--label-primary)]">오늘의 기분</span>
  </div>
</div>
```

다음으로 변경:
```tsx
<div className="flex items-center justify-between px-4 py-3">
  <div className="flex items-center gap-2">
    <span className="text-[17px] font-semibold text-[var(--label-primary)]">오늘의 기분</span>
  </div>
  <button
    type="button"
    onClick={() => setShowYearSheet(true)}
    className="flex items-center gap-0.5 text-[15px] text-[var(--accent-primary)] active:opacity-60 transition-opacity"
  >
    <span>올해 보기</span>
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="7 4 13 10 7 16" />
    </svg>
  </button>
</div>
```

**구현 메모:**
- 카피는 "올해 보기" + 오른쪽 ▸ chevron.
- 폰트 15px(Footnote): Apple HIG 한 단계 크게 적용된 사이즈.
- 색은 `--accent-primary`(액션 가능함을 암시). CLAUDE.md의 HIG 준수 원칙.
- `type="button"`을 명시해 form submit 방지(컴포넌트 내 form은 없지만 안전).

- [ ] **Step 4: 시트 렌더 추가**

`return` 의 최상위 `<div className="mx-5 md:mx-0 mb-3">` 블록 다음(같은 fragment 안)에 시트를 조건부로 추가한다. 현재 return은 단일 `<div>`인데, 시트를 형제로 두려면 Fragment로 감싼다.

현재:
```tsx
return (
  <div className="mx-5 md:mx-0 mb-3">
    ...
  </div>
);
```

변경 후:
```tsx
return (
  <>
    <div className="mx-5 md:mx-0 mb-3">
      ...
    </div>
    {showYearSheet && (
      <MoodYearSheet onClose={() => setShowYearSheet(false)} />
    )}
  </>
);
```

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit`

Expected: `MoodInput.tsx` 관련 오류 없음. (`page.tsx` mood 타입 에러는 여전.)

- [ ] **Step 6: 커밋**

```bash
git add components/MoodInput.tsx
git commit -m "feat(mood): add '올해 보기' entry point to MoodInput"
```

---

## Task 4: `app/page.tsx`에서 mood 노트 탭 제거

**Files:**
- Modify: `app/page.tsx`
- Modify: `types/index.ts` (Task 1의 변경을 여기서 함께 커밋)

- [ ] **Step 1: import 제거**

`app/page.tsx:15` 줄 삭제:

```typescript
import MoodYearView from "@/components/MoodYearView";
```

- [ ] **Step 2: 스와이프 배열에서 `"mood"` 제거**

`app/page.tsx:485`:

```typescript
const noteTabs: NoteTab[] = ["daily", "general", "mood"];
```

→

```typescript
const noteTabs: NoteTab[] = ["daily", "general"];
```

(인덱스 비교 로직 `idx < noteTabs.length - 1` 등은 그대로 두면 자동으로 2탭 기준으로 동작.)

- [ ] **Step 3: SectionTabs에서 "무드" 탭 항목 제거**

`app/page.tsx:542-550` 블록:

```tsx
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

→

```tsx
<SectionTabs
  tabs={[
    { key: "daily", label: "데일리" },
    { key: "general", label: "노트" },
  ]}
  active={noteTab}
  onChange={(key) => setNoteTab(key as NoteTab)}
/>
```

- [ ] **Step 4: 노트 본문 ternary에서 `MoodYearView` 분기 제거**

`app/page.tsx:574-580`:

```tsx
{noteTab === "daily" ? (
  <DailyNoteView />
) : noteTab === "general" ? (
  <GeneralNoteView />
) : (
  <MoodYearView />
)}
```

→

```tsx
{noteTab === "daily" ? (
  <DailyNoteView />
) : (
  <GeneralNoteView />
)}
```

`NoteTab`이 이제 `"daily" | "general"` 둘뿐이라 두 갈래 ternary로 충분하다.

- [ ] **Step 5: 타입체크 — 이제 모든 에러가 사라져야 함**

Run: `npx tsc --noEmit`

Expected: 에러 없음 (clean exit).

- [ ] **Step 6: 빌드 확인**

Run: `npx next lint` 그리고 `npx next build`

Expected:
- Lint: 오류 없음 (사용하지 않는 import 경고 없음 — `MoodYearView` import는 이미 제거됨).
- Build: 성공. `.next/BUILD_ID`와 `.next/prerender-manifest.json` 생성 확인.

만약 빌드가 실패하면, 콘솔의 정확한 에러 메시지를 확인 후 해당 파일을 수정한다(이 시점에는 자동 fallback 처리 금지 — 디버깅 필요).

- [ ] **Step 7: 커밋 (Task 1 변경 포함)**

`types/index.ts`도 이번 커밋에 포함된다.

```bash
git add types/index.ts app/page.tsx
git commit -m "feat(note): remove mood subtab from note section"
```

---

## Task 5: 시각 검증

**Files:** 없음 (실행 검증만)

- [ ] **Step 1: 개발 서버 실행 또는 PM2 재배포**

옵션 A (개발 빠른 확인):
```bash
npx next dev
```

옵션 B (CLAUDE.md 배포 절차로 PM2 재시작):
```bash
pm2 stop v-todo
rm -rf .next
npx next build
pm2 start v-todo
pm2 save
```

CLAUDE.md 절차를 그대로 따른다 — pm2 실행 중에 `rm -rf .next` 금지.

- [ ] **Step 2: 노트 섹션 확인**

브라우저에서 노트 섹션으로 이동.

확인 항목:
- SectionTabs에 `데일리 / 노트` 두 개만 보임 (무드 없음).
- 데일리 탭 좌우 스와이프 시 노트 탭으로만 이동하고, 그 외에는 더 안 넘어감.

- [ ] **Step 3: 체크인 섹션 진입점 확인**

체크인 섹션으로 이동.

확인 항목:
- "오늘의 기분" 라벨 우측에 `올해 보기 ›` 버튼이 보임.
- 폰트가 본문 라벨보다 작고(15px) `--accent-primary` 컬러.

- [ ] **Step 4: 시트 동작 확인**

`올해 보기 ›` 버튼 클릭.

확인 항목:
- 모바일 폭(또는 데스크탑에서 좁은 창)에서 하단에서 시트가 슬라이드 업.
- 데스크탑 넓은 창에서는 중앙 모달로 표시.
- 시트 헤더 중앙에 "올해 무드" 타이틀, 우측에 "완료" 버튼.
- 본문에 `MoodYearView` 그리드와 우상단 "저장" 버튼이 보임.
- 그리드 셀이 시트 폭에 맞게 자동 리사이즈됨(`ResizeObserver` 동작).

- [ ] **Step 5: 닫기 동작 확인**

각각의 닫기 동작을 시도:
- "완료" 버튼 클릭 → 시트 사라짐.
- 시트 외부 오버레이(어두운 배경) 클릭 → 시트 사라짐.
- 시트 헤더의 `drag-handle`을 아래로 드래그(모바일/터치 시뮬레이션) → 기존 `ios-sheet` CSS에 따라 닫힘(이 인터랙션이 다른 시트에서 동작하는 패턴이라면 일관되게 동작).

- [ ] **Step 6: 저장 기능 확인**

시트 안 우상단 "저장" 버튼 클릭.

확인 항목:
- 데스크탑: `mood-{year}.png` 파일 다운로드.
- 모바일/지원 환경: Web Share 시트 표시.
- 저장 직후 다시 그리드로 돌아오고 캡처용 헤더가 보이지 않음.

- [ ] **Step 7: 시트 닫힘 후 상태 보존 확인**

시트를 닫고 체크인 화면으로 돌아왔을 때:
- MoodInput에서 선택했던 이모지가 그대로 선택돼 있음.
- 다른 섹션(노트, 할 일 등)으로 이동했다 돌아와도 정상.

- [ ] **Step 8: 모든 항목 통과 시 별도 커밋 없음**

코드 변경은 없으므로 커밋하지 않는다. 만약 검증 중 버그를 발견하면, 해당 Task로 돌아가 수정 후 별도 커밋.

---

## Self-Review

**Spec coverage:**
- ✅ 노트 섹션에서 mood 탭 제거 → Task 4
- ✅ MoodInput 라벨 옆 진입점 → Task 3
- ✅ MoodYearSheet (ios-sheet 패턴) → Task 2
- ✅ MoodYearView 변경 없음 → 명시적으로 변경 안 함
- ✅ NoteTab 타입 축소 → Task 1
- ✅ 스와이프 인덱스 조정 → Task 4 Step 2
- ✅ 모든 테스트 시나리오 → Task 5

**Placeholder scan:** 없음. 모든 단계에 실제 코드와 명령이 들어 있음.

**Type consistency:** `MoodYearSheetProps`의 `onClose: () => void` ↔ Task 3의 `onClose={() => setShowYearSheet(false)}` 일치.

**한계 사항:**
- `MoodYearSheet`/`MoodInput`의 진입점 버튼에 unit test를 추가하지 않았다. 이유: (1) 시트 구조는 `BriefingModal`과 동일한 패턴 재사용이고, (2) 진입점 버튼은 state 토글 한 줄이라 시각 검증으로 충분하며, (3) 프로젝트 테스트 인프라가 주로 lib 레벨(`lib/__tests__/`)에 집중되어 있고 UI 컴포넌트 테스트 setup이 없다. UI 회귀 방지는 Task 5의 시각 검증이 책임진다.
