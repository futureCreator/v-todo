# 습관 트래커 & 감사 일기 설계

## 개요

v-todo 앱에 두 가지 새 기능을 추가한다:
1. **습관 트래커** — 반복적인 일상 습관을 추적하고 스트릭/히트맵으로 시각화
2. **감사 일기** — 매일 감사한 것 3가지를 기록하는 구조화된 입력

---

## 1. 습관 트래커 (Habit Tracker)

### 위치

"할 일" 섹션의 3번째 서브탭으로 추가: **지금 / 곧 / 습관**

기존 `todoTab` 상태에 `"habit"` 값을 추가한다.

### 데이터 모델

```typescript
type HabitRepeatMode = "daily" | "weekdays" | "interval";

interface Habit {
  id: string;
  title: string;
  repeatMode: HabitRepeatMode;
  weekdays: number[];       // 0(일)~6(토), repeatMode가 "weekdays"일 때 사용
  intervalDays: number;     // 2~7, repeatMode가 "interval"일 때 사용
  createdAt: string;        // ISO 8601
}

interface HabitLog {
  habitId: string;
  date: string;             // YYYY-MM-DD
  completed: boolean;
}
```

### 저장소

- `data/habits.json` — `{ habits: Habit[] }`
- `data/habit-logs.json` — `{ logs: HabitLog[] }`
- 기존 store 패턴 동일 (atomic write, ENOENT fallback)

### API 엔드포인트

- `GET /api/habits` — 습관 목록 조회
- `POST /api/habits` — 습관 생성
- `PUT /api/habits/[id]` — 습관 수정
- `DELETE /api/habits/[id]` — 습관 삭제
- `GET /api/habits/logs?date=YYYY-MM-DD` — 특정 날짜의 로그 조회
- `PUT /api/habits/logs` — 로그 업데이트 (체크/해제)

### 화면 구성

**습관 리스트 (기본 뷰):**
- 상단: 오늘 날짜 + 전체 달성률 프로그레스 바
- 리스트: 오늘 실행해야 할 습관만 필터링하여 표시
  - 체크박스 + 제목 + 스트릭 카운터 (불꽃 아이콘 + N일 연속)
  - 완료 시 체크 애니메이션 (기존 TodoItem 패턴)
- 하단: 습관 추가 입력 (TodoInput과 동일한 UX 패턴)

**히트맵 (펼침 뷰):**
- 습관 항목을 탭하면 아래로 히트맵이 펼쳐짐 (accordion)
- 최근 12주(84일) 표시, GitHub 잔디 스타일
- 색상 농도: 미완료(빈 칸) → 완료(accent-primary)
- 주기에 해당하지 않는 날은 회색 점으로 표시
- 역대 최장 스트릭 표시

**습관 추가/편집:**
- 제목 입력
- 주기 설정: 기본 "매일" 선택됨
  - 매일: 추가 설정 없음
  - 요일 선택: 월~일 토글 버튼 (다중 선택)
  - N일마다: 2~7 범위 숫자 입력

### 스트릭 계산 로직

- 주기에 해당하는 날만 카운트 (월수금 습관이면 화목은 무시)
- 오늘부터 역방향으로 연속 완료일 계산
- 오늘이 아직 미완료여도 어제까지의 스트릭은 유지 (당일은 보너스)

### 빈 상태

- 습관이 없을 때: "반복하는 습관을 등록해 보세요" + 안내 텍스트

---

## 2. 감사 일기 (Gratitude Journal)

### 위치

데일리노트 뷰(DailyNoteView) 최상단에 접이식 섹션으로 통합.

### 데이터 모델

```typescript
interface GratitudeEntry {
  date: string;             // YYYY-MM-DD
  items: [string, string, string];  // 고정 3개
}
```

### 저장소

- `data/gratitude.json` — `{ entries: GratitudeEntry[] }`
- 기존 store 패턴 동일

### API 엔드포인트

- `GET /api/gratitude?date=YYYY-MM-DD` — 특정 날짜의 감사 일기 조회
- `PUT /api/gratitude?date=YYYY-MM-DD` — 감사 일기 저장/업데이트

### 화면 구성

**데일리노트 상단 섹션:**
- 접기/펼치기 헤더: "오늘의 감사" + 셰브론 아이콘
- 펼친 상태: 3개 입력 필드가 세로로 배치
  - 각 필드 앞에 번호 (1, 2, 3)
  - 플레이스홀더: "감사한 것을 적어보세요"
  - 한 줄 입력 (textarea가 아닌 input)
- 접힌 상태: 작성 완료된 항목 수 표시 ("3/3 작성됨" 또는 "아직 작성하지 않았어요")
- 자동 저장: 데일리노트와 동일한 1초 디바운스

**날짜 이동:**
- DateNavigator로 날짜를 변경하면 감사 일기도 해당 날짜의 데이터 로드
- 과거 날짜의 감사 일기는 읽기 전용이 아닌, 수정 가능 (데일리노트와 동일)

### 빈 상태

- 3개 빈 입력 필드가 기본으로 표시되므로 별도의 빈 상태 불필요
- 입력 없이 날짜를 넘기면 저장하지 않음 (빈 엔트리 생성 방지)

---

## 3. AI 브리핑 연동

### 추가 데이터 수집

브리핑 API(`/api/ai/briefing`)에서 추가로 fetch:
- 오늘의 습관 목록 + 각 습관의 현재 스트릭
- 어제의 감사 일기

### 프롬프트 확장

기존 브리핑 프롬프트에 두 섹션 추가:

```markdown
## 오늘의 습관
- 운동 (12일 연속)
- 독서 (5일 연속)
- 물 2L (오늘 시작)

## 어제의 감사
1. 좋은 날씨
2. 맛있는 커피
3. 친구와 통화
```

브리핑 AI에게 요청:
- 습관: "오늘 해야 할 습관과 스트릭 상위 항목을 격려"
- 감사: "어제 감사했던 것을 리마인드하여 하루를 긍정적으로 시작하도록 유도"

---

## 4. 컴포넌트 구조

### 새 컴포넌트

- `HabitView.tsx` — 습관 탭 전체 뷰 (리스트 + 추가 입력)
- `HabitItem.tsx` — 개별 습관 항목 (체크박스 + 스트릭 + 히트맵)
- `HabitHeatmap.tsx` — 12주 히트맵 시각화
- `AddHabitSheet.tsx` — 습관 추가/편집 모달 (주기 설정 포함)
- `GratitudeSection.tsx` — 데일리노트 상단 감사 일기 섹션

### 새 라이브러리

- `lib/habit-store.ts` — 습관 데이터 읽기/쓰기
- `lib/habit-log-store.ts` — 습관 로그 읽기/쓰기
- `lib/gratitude-store.ts` — 감사 일기 읽기/쓰기

### 타입 추가 (types/index.ts)

- `HabitRepeatMode`, `Habit`, `HabitLog`, `GratitudeEntry` 타입 정의
- `TodoTab` 타입에 `"habit"` 추가

---

## 5. 스타일링

- 기존 Catppuccin 테마 변수 활용
- 히트맵 셀: `--accent-primary` 색상의 opacity 변화 (0.2 → 1.0)
- 스트릭 불꽃: `--system-orange` 색상
- 감사 일기 섹션: `--bg-elevated` 배경 + `--separator` 하단 경계
- 접기/펼치기: 200ms ease transition
- 모든 애니메이션 `prefers-reduced-motion` 대응
