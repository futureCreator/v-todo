# 체크인 섹션 분리 & 링크 피처 제거 — Design

## 배경

데일리 노트 뷰는 단일 스크롤 영역에 [기분 → 감사 → 노트 에디터]가 세로로 쌓여 있다. 위 두 섹션이 화면을 차지해 노트 입력 영역이 좁고 아래로 밀려나 작성이 불편하다. 동시에 링크 피처(텔레그램 봇 폴링 포함)는 더 이상 사용되지 않는다.

## 목표

1. 데일리 노트 뷰를 에디터 전용으로 만든다.
2. 기분/감사 입력을 새 최상위 섹션 "체크인"으로 분리한다.
3. 링크 피처와 텔레그램 링크 봇을 코드/데이터/설정에서 완전히 제거한다.

## 비목표

- 노트 섹션 내부 서브탭(`데일리노트` / `노트` / `무드`) 구조는 변경하지 않는다.
- `MoodInput`, `GratitudeSection` 컴포넌트의 내부 동작/레이아웃은 변경하지 않는다 (재사용만).
- 힐링 카드의 URL 타입 아이템(`HealingCard`의 `linkTitle/url`)은 건드리지 않는다. 링크 *섹션* 제거이지 URL을 가진 다른 피처와 무관.

## 변경 사항

### 1. 새 섹션: `checkin` (체크인)

#### 타입

`types/index.ts`:

```ts
// before
export type Section = "todo" | "note" | "link" | "wish" | "dday";

// after
export type Section = "todo" | "note" | "checkin" | "wish" | "dday";
```

`Link`, `LinkStore` 타입은 삭제한다.

#### BottomNav

`components/BottomNav.tsx`의 링크 버튼을 체크인 버튼으로 교체한다. 위치 동일 (todo / note / **checkin** / wish / dday). 아이콘은 미소 얼굴 (둥근 원 + 두 눈 + 위로 휘는 입). 활성/비활성 모두 동일한 글리프, 활성 시 채움(fill).

라벨: `체크인`.

#### CheckinView (신규)

`components/CheckinView.tsx`. 단순 래퍼:

```
<div className="flex flex-col flex-1 min-h-0">
  <DateNavigator date={date} onChange={...} />
  <div className="flex-1 min-h-0 overflow-y-auto">
    <MoodInput date={dateStr} />
    <GratitudeSection date={dateStr} />
  </div>
</div>
```

- 날짜 상태(`useState<Date>`)와 `dateToString` 유틸은 `DailyNoteView`에서 쓰던 것과 동일 패턴. 헬퍼는 컴포넌트 내부에 둬도 되고, 두 군데에서 같이 쓰면 `lib/date.ts` 등으로 추출해도 됨 (구현자 판단).
- KST 기준 `getFullYear/getMonth/getDate` 사용 (CLAUDE.md 규칙).

### 2. DailyNoteView 정리

`components/DailyNoteView.tsx`에서:
- `MoodInput`, `GratitudeSection` import 및 사용을 제거한다.
- 에디터 높이 계산을 단순화. 현재의 `style={{ height: "max(calc(100dvh - 200px), 400px)" }}` 대신 부모 컨테이너 `flex-1 min-h-0`만으로 채우도록 변경 (DateNavigator + 저장 status만 위에 남으니 자연스럽게 가득 참).
- 저장 status 표시는 그대로 유지.

### 3. 링크 피처 완전 제거

#### 삭제할 파일

코드:
- `components/LinkSection.tsx`
- `components/LinkCard.tsx`
- `components/AddLinkSheet.tsx`
- `app/api/links/route.ts`
- `app/api/links/[id]/route.ts`
- `lib/link-store.ts`
- `lib/telegram-poller.ts`
- `lib/url-extract.ts` (링크 API와 폴러 외에 다른 사용처 없음)
- `instrumentation.ts` (파일 전체가 폴러 등록 전용이므로 통째로 삭제)

테스트:
- `lib/__tests__/link-store.test.ts`
- `lib/__tests__/api-links.test.ts`
- `lib/__tests__/telegram-poller.test.ts`
- `lib/__tests__/url-extract.test.ts`

데이터:
- `data/links.json`

#### 수정할 파일

`app/page.tsx`:
- `Link`, `AddLinkSheet`, `LinkSection` import 제거.
- 상태 제거: `links`, `linkTab`, `showAddLink`.
- 함수 제거: `fetchLinks`, `toggleLinkRead`, `deleteLink`, `saveNewLink`.
- 초기 데이터 로딩 `Promise.all`에서 `fetchLinks()` 제거.
- 좌우 스와이프 네비게이션(`section === "link"` 분기)을 `section === "checkin"`으로 교체. 체크인은 단일 화면이라 서브탭 좌우 스와이프 로직 없음 — 좌우 스와이프 시엔 인접 섹션(`note` ↔ `checkin` ↔ `wish`)으로 이동만 처리한다.
- 헤더 타이틀 매핑 (`section === "link" ? "링크" : ...`)에서 `link` 분기를 `checkin ? "체크인"`으로 교체. 두 군데 (모바일/데스크톱) 모두.
- 본문 라우팅에 `section === "checkin"` 분기 추가 → `<CheckinView />` 렌더.
- 링크 헤더 우측의 `+` 추가 버튼 등 링크 전용 UI 제거.

`.env.local.example`:
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_ID`, `LINK_POLLER_*` 모든 줄과 주석 블록 삭제.

`CLAUDE.md`:
- "텔레그램 링크 봇 설정" 섹션 전체 삭제.

`public/manifest.json`:
- 링크 관련 shortcut/share_target이 있으면 삭제. 현재 staged 변경이 있으니 함께 정리.

`README.md`:
- 과거 changelog의 링크 피처 항목은 *유지*한다 (히스토리). 본 작업의 변경은 다음 릴리스 노트 작성 시 추가.

### 4. 검증 항목

- 빌드 통과 (`npx next build`).
- 타입 체크 통과 (`tsc --noEmit` 또는 빌드에 포함됨).
- `npx vitest run` 통과 — 삭제된 테스트 외에 깨지는 게 없어야 함.
- 수동: 모든 섹션 진입(todo / note(데일리노트/노트/무드) / checkin / wish / dday), 좌우 스와이프, 데일리 노트 에디터 전체 높이 차지, 체크인의 기분/감사 동작.

## 데이터 호환성

- `data/gratitude.json`, `data/moods.json`은 그대로 유지. 동일 API(`/api/gratitude`, `/api/moods`)를 체크인 섹션에서 그대로 호출한다. 마이그레이션 불필요.
- 데일리 노트 본문(`data/daily-notes/`)도 그대로.

## 보안/비밀

`.env.local`에 사용자가 직접 둔 `TELEGRAM_BOT_TOKEN` 등은 코드 변경 후 의미가 없어지지만 본 작업에서 *파일 자체*를 수정하지는 않는다 (그 파일은 git 관리 대상이 아님). 사용자가 원하면 수동으로 정리.

## 롤백

링크 데이터(`data/links.json`)를 삭제하므로 사용자가 남긴 링크가 있다면 되돌릴 수 없다. 작업 시작 전 `git stash` 혹은 별도 백업이 안전하지만, 사용자가 "삭제"를 선택했으므로 그대로 진행한다.

## 영향 받지 않는 영역

- 할 일, 위시, D-day, 습관, 일정, 주간 리뷰, AI 브리핑.
- 노트 서브탭(`general`, `mood`)의 동작.
- 힐링 카드의 URL 타입 아이템.
