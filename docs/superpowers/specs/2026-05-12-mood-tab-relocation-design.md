# 무드 탭 이전 디자인

**Date:** 2026-05-12
**Author:** futureCreator

## 배경

노트 섹션에 `daily / general / mood` 3개의 서브탭이 있고, "mood" 탭이 `MoodYearView`(12×31 Year-in-Pixels 그리드)를 렌더링하고 있다. 두 가지 문제:

1. 노트 섹션의 다른 두 탭(daily/general)은 "글쓰기" 컨셉이지만 mood는 시각화 그리드라 컨셉이 어긋난다.
2. 모바일 폭에서 12×31 셀이 너무 작아 화면에서 한눈에 보기 어렵다. 실용 가치는 이미지로 저장해 확대/공유하는 데 있다.

따라서 무드 탭을 노트 섹션에서 제거하고, 체크인 화면에서 진입할 수 있는 시트로 옮긴다. 진입의 본질은 "올해 무드 이미지를 저장/공유"하는 것이며, 화면 표시는 그 미리보기 역할이다.

## 결정 사항

- 진입점 위치: **체크인 화면의 `MoodInput` 라벨 옆** (Q1=B, Q2=A).
- 표현 방식: **`ios-sheet` 패턴의 풀스크린 시트**로 `MoodYearView`를 그대로 보여준다 (Q3=A — 이미지 자체는 손대지 않음).
- 데이터 레이어와 `MoodYearView` 자체 로직은 변경 없음.

## 컴포넌트 변경

### 1. `types/index.ts` — `NoteTab` 타입 축소

- `types/index.ts:94`의 `export type NoteTab = "daily" | "general" | "mood"`를 `"daily" | "general"`로 축소.

### 2. `app/page.tsx` — 노트 서브탭에서 mood 제거

- `MoodYearView` import 제거.
- 노트 `SectionTabs` 항목을 `daily / general` 두 개로 축소.
- 노트 영역의 mood 분기(`app/page.tsx:578-580`의 `<MoodYearView />` 분기)를 제거하고 ternary를 단순화.
- 노트 탭 스와이프 배열(`app/page.tsx:485`의 `noteTabs = ["daily", "general", "mood"]`)을 `["daily", "general"]`로 축소.
- `noteTab` state는 `useState<NoteTab>("daily")`로 초기화되며 localStorage 영속화가 없으므로 마이그레이션 처리 불필요.

### 3. `components/MoodInput.tsx` — 진입점 버튼 추가

- 기존 "오늘의 기분" 라벨 옆(같은 줄 우측)에 작은 텍스트/아이콘 버튼을 추가한다. 카피는 `올해 보기 ›` 한 줄로 짧게.
- 사이즈: 라벨이 17~20px이라면 버튼 본문은 13~15px, `text-[var(--label-tertiary)]` 또는 `--accent-primary`. Apple HIG의 Footnote~Subheadline 수준.
- 누르면 로컬 state로 시트(`MoodYearSheet`)를 연다. state는 `MoodInput` 내부에서 관리(부모로 끌어올릴 필요 없음 — 무드 입력과 시트는 같은 데이터 컨텍스트).
- 진입점 노출 조건: 무조건 표시(데이터가 비어 있어도 시트 안에서 빈 그리드가 보이고 저장도 가능).

### 4. `components/MoodYearSheet.tsx` — 신규 (얇은 래퍼)

- `BriefingModal.tsx`와 동일한 `ios-sheet` 구조를 따른다:
  - 오버레이: `fixed inset-0 z-50 flex items-end md:items-center justify-center ios-sheet-overlay`.
  - 시트 컨테이너: `ios-sheet w-full max-w-lg max-h-[80vh] flex flex-col rounded-t-[16px] md:rounded-[16px]`, `--sys-bg-elevated` 배경, `--shadow-xl`, `paddingBottom: max(env(safe-area-inset-bottom, 0px), 0px)`.
  - `drag-handle md:hidden` 핸들.
  - 헤더: 좌측 spacer(50px) / 중앙 타이틀 "올해 무드" / 우측 "완료" 버튼(`--sys-blue`).
- 본문 영역에 `<MoodYearView />`를 그대로 렌더. 본문은 `flex-1 overflow-y-auto`로 스크롤 허용.
- 닫기 동작:
  - 헤더 "완료" 버튼 클릭.
  - 시트 외부(오버레이) 클릭.
  - 모바일에서 시트를 아래로 드래그하는 동작은 기존 `ios-sheet` CSS가 처리.
- Props:
  ```
  interface MoodYearSheetProps {
    onClose: () => void;
  }
  ```

### 5. `components/MoodYearView.tsx` — 변경 없음

- 시트 내부에서 자연스럽게 보이도록 컴포넌트 외곽 패딩이 어색하면 시트 본문 쪽에서 흡수한다(필요 시 시트 본문에 `px-0` 등 미세 조정만). 컴포넌트 내부는 손대지 않는다.
- 컴포넌트 자체의 `containerRef` ResizeObserver는 시트 안에서도 정상 동작한다(부모 폭에 맞춰 셀 크기 재계산).

## 사용자 시나리오

1. 사용자가 체크인 화면에 들어온다.
2. "오늘의 기분" 라벨 옆 `올해 보기 ›` 버튼을 본다.
3. 버튼을 누르면 하단에서 시트가 올라오고 그리드가 보인다.
4. 우상단의 기존 "저장" 버튼을 누르면 Web Share API(모바일) 또는 다운로드(폴백)로 PNG가 생성된다.
5. 헤더 "완료" 또는 오버레이/드래그로 시트를 닫는다.

## 영향 범위

**변경 파일**
- `types/index.ts` — `NoteTab` 타입 축소.
- `app/page.tsx` — mood 탭/분기/스와이프 제거.
- `components/MoodInput.tsx` — 진입점 버튼 + 시트 state.
- `components/MoodYearSheet.tsx` — 신규.

**변경 없음**
- `components/MoodYearView.tsx`
- `app/api/moods/route.ts`, `lib/mood-store.ts`, `types/index.ts` 무드 관련 타입
- AI 브리핑/주간 리뷰의 무드 사용

## 테스트 시나리오

- 노트 섹션에 진입했을 때 SectionTabs가 `daily / general` 두 개만 보인다.
- 노트 탭 좌우 스와이프가 두 탭 사이에서만 동작한다(과거 mood 탭으로 넘어가는 인덱스 미스 없음).
- 체크인 화면에서 `올해 보기 ›` 버튼이 보인다.
- 버튼 클릭 시 모바일에서는 하단 시트, 데스크탑에서는 중앙 모달로 시트가 열린다.
- 시트 안 그리드의 셀 크기가 시트 폭에 맞게 계산된다(`ResizeObserver`).
- "저장" 버튼이 모바일에서 Web Share, 데스크탑에서 다운로드로 동작한다.
- "완료" 버튼, 오버레이 클릭, 모바일 드래그-다운으로 시트가 닫힌다.
- 시트 닫힘 후 체크인 화면 상태(MoodInput 선택값 등)가 그대로 유지된다.

## 비범위(YAGNI)

- 이미지 자체 디자인 개선(통계/리디자인 등 — Q3-C는 보류).
- 미니 미리보기 그리드(Q1-C 후보).
- 설정/메뉴를 통한 별도 진입점(Q1-D 후보).
- 무드 데이터 모델/저장소/AI 사용 부분 변경.
