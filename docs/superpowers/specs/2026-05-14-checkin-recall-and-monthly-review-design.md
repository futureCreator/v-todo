# 체크인 회상 & 월간 회고 디자인

작성일: 2026-05-14

## 배경

v-todo는 mood / gratitude / daily-note / todo / wish / schedule 데이터가 매일 쌓이는 구조다. 사용자는 "쌓인 데이터를 활용하고, **오래 쓸수록 좋아지는** 기능"을 원한다.

두 갈래로 가져간다:

1. **회고/통찰** — 체크인 화면에서 명시적으로 진입하는 버튼. 누르면 AI가 지난 30일을 서술해준다.
2. **타임캡슐** — 매일 체크인 화면에 패시브로 떠 있는 카드. 같은 월·일의 과거 항목을 스택으로 보여준다.

회고는 의도해서 들어가는 깊은 surface, 타임캡슐은 매일 자연스레 만나는 얕은 surface다. 둘 다 데이터가 많을수록 풍성해진다.

## 비목표

- 주간/연간/누적 회고는 이번 범위 밖
- 정적 통계 대시보드(차트/히트맵)는 만들지 않음 — AI 서술형만
- 예측·추천·코치 톤은 만들지 않음 — 거울 톤만

## 기존 weekly review 정리

현재 `app/api/ai/weekly-review/`와 `buildWeeklyReviewPrompt`는 동작하지 않는다. 이번 작업에서 **완전히 제거**한다.

- `app/api/ai/weekly-review/route.ts` 삭제
- `lib/prompts.ts`의 `buildWeeklyReviewPrompt`, `DailyNoteEntry` 제거
- `types/index.ts`의 `WeeklyReviewResponse` 제거
- `lib/__tests__/prompts.test.ts`에서 weekly review 케이스 제거
- UI 진입점이 남아있다면 grep 결과대로 삭제

(나중에 필요하면 다시 추가한다.)

## 화면 구조 (CheckinView)

```
DateNavigator               (기존)
MoodInput                   (기존)
GratitudeSection            (기존)
─────────────────────────
TimeCapsuleCard             신규 · mt-auto 위
─────────────────────────
[이 달 회고] [오늘의 브리핑]  신규 split · 1:1 grid
```

- 기존 CheckinView 하단의 `mt-auto pt-4 pb-4` 영역에 TimeCapsuleCard와 버튼 grid를 **함께** 넣는다. 화면이 짧으면 카드+버튼이 같이 하단에 정렬, 화면이 길면 mood/gratitude 입력이 위로 떨어지고 카드+버튼이 그 아래에 자연스레 놓인다.
- 카드는 버튼 grid 바로 위. 가용 데이터가 0건이면 카드 자체를 unmount한다(빈 상태 안내 없음 — "오래 쓰면 좋아진다" 메시지가 자연스럽게).
- 하단 버튼 영역은 `grid grid-cols-2 gap-2` 2-cell. 왼쪽이 "이 달 회고"(secondary, 예: `bg-[var(--surface-secondary)]`), 오른쪽이 "오늘의 브리핑"(기존 primary accent 유지).

## 컴포넌트 1: TimeCapsuleCard

**목적**: 오늘 날짜와 **월/일이 같은 과거 항목**을 연도별 스택으로 보여준다.

**입력 데이터**
- `moods.json` (전체)
- `gratitude.json` (전체)
- `daily-notes/*.md` (필요한 날짜만 lazy fetch)

**로직**
1. 오늘 KST 기준 `MM-DD`를 구한다.
2. moods에서 `date.endsWith("-MM-DD")` 항목을 모두 추출 → 연도별 1건씩 (최근 → 과거 순).
3. 같은 날짜의 gratitude 첫 항목(첫 비어있지 않은 슬롯)을 매핑.
4. 같은 날짜의 daily-note가 존재하면 `GET /api/notes/files?path=daily-notes/YYYY-MM-DD.md`로 본문을 가져와 **첫 의미있는 줄 한 줄**만 추출 (앞 공백·헤딩·체크박스 마커 제거 후 첫 줄).
5. 최근 **5년치**까지만 표시. 그보다 오래된 항목은 보이지 않는다.

**렌더**
```
2025-05-14 · 😊 · "오늘은 동네 산책..."
2024-05-14 · 😔 · "감사: 부모님 전화"
```
- 한 줄 형식. mood 이모지 (`1: 😢, 2: 😔, 3: 😐, 4: 😊, 5: 😄`).
- 한 줄에 표시되는 보조 텍스트는 **하나만**. 우선순위: gratitude 첫 항목 → 없으면 note 첫 줄 → 둘 다 없으면 mood만.
- 항목 클릭: `onChange(date)` 호출 → DateNavigator를 그 날짜로 이동.

**가드**
- API 실패 시 throw하지 않고 카드 unmount.
- 0건이면 unmount.
- 노트 fetch는 표시 직전 1건씩 (병렬). 노트 fetch 실패한 줄은 mood + gratitude만 표시.

**접근성**
- 카드는 `<section aria-label="이 날의 발자취">`.
- 각 줄은 `<button type="button">`, 라벨에 `YYYY년 M월 D일로 이동` 포함.

## 컴포넌트 2: MonthlyReviewModal

**목적**: 지난 30일 데이터를 종합한 AI 서술 회고를 모달로 표시.

**진입**: CheckinView "이 달 회고" 버튼 클릭.

**모달 구조** (`BriefingModal` 패턴 복제 + 우상단 ↻ 버튼 추가)
- 헤더: `이 달 회고` · 우상단 `↻` 버튼 · 닫기
- 본문: 마크다운 렌더된 회고 텍스트
- 푸터: 생성 시각 표시(예: `2026-05-14 09:12 생성`)

**동작**
1. 마운트 → `GET /api/ai/monthly-review` 호출.
2. 응답 즉시 표시. 로딩 중엔 "회고를 정리하고 있어요..." 메시지.
3. ↻ 버튼 클릭 → `GET /api/ai/monthly-review?refresh=1` 재호출, 응답으로 본문 교체.
4. 에러 시: "AI 응답을 가져올 수 없어요. 잠시 후 다시 시도해주세요." + ↻ 활성 유지.

## API: `GET /api/ai/monthly-review`

**쿼리**
- `refresh=1`: 캐시 무시하고 강제 재생성

**캐시 저장소**: `data/monthly-review.json`
```json
{
  "date": "2026-05-14",
  "content": "### ...\n\n### ...",
  "generatedAt": "2026-05-14T09:12:00+09:00"
}
```

**플로우**
1. 오늘 날짜(KST `YYYY-MM-DD`)를 구한다.
2. `refresh !== "1"`이면 캐시 파일을 읽는다.
   - 파일이 있고 `cache.date === 오늘`이면 그대로 `{ data: cache }` 반환.
3. 그 외엔 30일치 데이터 수집 → 프롬프트 빌드 → `generateText(prompt)` 호출.
4. 결과를 캐시 파일에 덮어쓰고 반환.

**30일 데이터 수집**
- mood: `today - 29일` ~ `today` 범위 항목 전체
- gratitude: 같은 범위, 빈 슬롯 제거
- daily-notes: 같은 범위의 파일들. 각 파일 본문 **최대 3000자**로 자르고, 잘렸으면 `... (잘림)` 표시. 빈 파일은 제외
- todo: 같은 범위에 `completedAt` 또는 `stageMovedAt`이 든 항목
- wish: 같은 범위에 `completedAt`이 든 항목 (satisfaction, review 포함)
- schedule: 이번 범위에 포함하지 않음 (회고 본문이 산만해짐)

**구조화된 프롬프트 본문**
```
오늘 날짜: 2026-05-14
데이터 일수: 30일 (2026-04-15 ~ 2026-05-14)

## 일자별 (최근 → 과거)

### 2026-05-14 (목)
- mood: 4 😊
- gratitude:
  1. ...
  2. ...
- note: <첫 3000자, 잘렸으면 표시>

### 2026-05-13 (수)
- mood: 3 😐
(이하 반복; 데이터 없는 차원은 그 줄을 생략. 모든 차원이 비면 그 날짜 섹션 자체 생략)

## 30일 내 todo 완료
- 2026-05-12 · [지금] 프로젝트 마감 (12일 만에 완료)
- ...

## 30일 내 wish 완료
- 2026-05-10 · [경험] 등산 · 만족도 5/5
  리뷰: ...
- ...
```

## 시스템 지시문 (Monthly Review)

```
당신은 사용자의 데이터를 30일 단위로 돌아보는 회고 파트너입니다.
아래 30일치 기록에서 사용자가 스스로 보지 못하는 패턴을 짚어주세요.

규칙:
- 짧은 문단 3~5개로 구성. 각 문단은 ### 헤딩으로 시작.
- 인사, 결론, 총평 금지.
- 각 문단은 "관찰 → 근거 1~2개(날짜 인용) → 짧은 시사" 흐름.
- 다음 차원에서 골고루: mood 추이/주기, 감사 일기에서 반복되는 사람·주제, 노트의 반복 키워드나 감정 변화, 행동(todo/wish 완료)과 mood의 관계.
- 사람 이름이 등장하면 익명화하지 말고 그대로 인용하세요.
- 평가·훈수·격려 금지. 본인이 쓴 내용을 거울처럼 비추기.
- "당신은 ~한 사람" 같은 단정 라벨링 금지.
- 데이터가 너무 적은 차원은 다루지 않고, 억지로 채우지 않음.
- 한국어 존댓말.
```

## 파일 구조

```
신규
  app/api/ai/monthly-review/route.ts
  lib/monthly-review-store.ts
  components/TimeCapsuleCard.tsx
  components/MonthlyReviewModal.tsx
  lib/__tests__/monthly-review-store.test.ts
  components/__tests__/TimeCapsuleCard.test.tsx

수정
  components/CheckinView.tsx     (TimeCapsuleCard 삽입, 버튼 split)
  lib/prompts.ts                 (buildMonthlyReviewPrompt 추가)

삭제
  app/api/ai/weekly-review/route.ts
  lib/prompts.ts                 (buildWeeklyReviewPrompt, DailyNoteEntry 제거)
  types/index.ts                 (WeeklyReviewResponse 제거)
  lib/__tests__/prompts.test.ts  (weekly review 케이스 제거)

자동 생성
  data/monthly-review.json       (gitignore 대상이 아님 — 기존 data/*.json 패턴 따름)
```

## 에러 처리 / 엣지 케이스

**MonthlyReview**
- AI timeout (기본 15s): 모달에 안내 + ↻ 유지
- AI 실패 시 캐시 파일 변경 금지 (이전 캐시 보존)
- 캐시 JSON 파싱 실패: 그냥 새로 생성. `file-store.ts`의 안전 read 패턴 따름
- 데이터 일수 < 30일 (신규 사용자): 가용한 일수만 보내고 프롬프트 헤더에 `데이터 일수: N일` 명시. 모델이 톤 자율 조정
- 모든 차원이 비어있는 신규 사용자: 회고 버튼은 표시되나 응답이 "아직 데이터가 충분하지 않아요"가 나오도록 프롬프트가 처리

**TimeCapsuleCard**
- API 호출 실패 → 카드 자체 unmount
- 2월 29일 윤일이 아닌 해 → 그 해 데이터 없음 → 그 행만 생략
- 같은 날짜에 mood만 있고 다른 게 없으면 → mood만 표시
- 노트 본문 fetch 실패 → 그 줄에서 노트만 생략

**날짜/타임존**
- 모두 KST. `new Date()` + `getFullYear/Month/Date`. `toISOString()` 금지 (CLAUDE.md 규칙).

## 테스트

**vitest**
- `lib/__tests__/monthly-review-store.test.ts`
  - 캐시 read/write
  - 파일 없음 → null
  - JSON 손상 → null 반환(throw 안 함)
- `lib/__tests__/prompts.test.ts` (추가)
  - `buildMonthlyReviewPrompt`: 30일 풀 데이터
  - 빈 노트만 있는 경우 노트 섹션 생략
  - 노트 3000자 cut 표시
  - 데이터 일수 부족(예: 7일) 명시
- `components/__tests__/TimeCapsuleCard.test.tsx`
  - 0건이면 렌더 안 함
  - 같은 MM-DD 다른 연도 정렬 (최근 → 과거)
  - 항목 클릭 시 `onChange(date)` 호출
  - 노트 fetch 실패해도 다른 줄 정상 렌더

**수동 검증**
- 빌드 후 PM2 재시작 → 체크인 화면 진입
- 회고 버튼 클릭 → 모달 표시 → ↻ 재생성 동작
- 같은 날 다시 진입 → 캐시본 즉시 표시
- 다른 날 진입(또는 캐시 파일 date 변조) → 새로 생성

## 배포 순서

CLAUDE.md 배포 순서 그대로:

```
pm2 stop v-todo
rm -rf .next
npx next build
pm2 start v-todo
pm2 save
```

## 개방 질문

없음.
