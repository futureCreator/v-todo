# Pomodoro Timer Design Spec

## Overview

v-todo 앱에 뽀모도로 타이머 기능을 추가한다. 독립된 5번째 탭으로 배치하여 할일, 노트, **타이머**, 위시, 디데이 순서로 네비게이션한다.

## 기능 범위

### 포함
- 기본 뽀모도로 타이머 (25분 집중 → 5분 휴식 → 4회 후 15분 긴 휴식)
- 통계/기록 (오늘 요약 카드 + 히트맵)
- 알림 (사운드 + 브라우저 Notification API)

### 제외
- 시간 커스텀 (고정 25/5/15)
- 할 일 연결

## 네비게이션

### Section 타입 변경
```
// types/index.ts
export type Section = "todo" | "note" | "timer" | "wish" | "dday";
```

### 탭 순서
할일 → 노트 → **타이머** → 위시 → 디데이 (5개)

### BottomNav 아이콘
타이머 아이콘은 원형 시계/타이머 형태의 SVG. 활성/비활성 상태 모두 지원.

### 데스크탑 사이드바
기존 사이드바에도 타이머 항목 추가.

## 화면 구성

타이머 탭은 단일 스크롤 뷰로 구성:

### 1. 원형 프로그레스 타이머
- Apple Watch 스타일 원형 링
- 중앙에 남은 시간 표시 (mm:ss, tabular-nums)
- 링 아래에 현재 상태 텍스트 (집중 중 / 짧은 휴식 / 긴 휴식)
- 링 색상: 집중=#FF6B35(오렌지), 휴식=#34C759(그린)

### 2. 컨트롤 버튼
- 시작/일시정지 토글 버튼 (메인, 큰 원형)
- 리셋 버튼 (보조, 작은 원형)
- Thumb Zone 중앙 배치

### 3. 사이클 인디케이터
- 4개 도트로 현재 뽀모도로 사이클 진행 표시
- 완료된 사이클: 오렌지 채움, 현재: 오렌지 테두리, 미진행: 회색

### 4. 오늘 요약 카드
- 3열 레이아웃: 오늘 완료 수 | 집중 시간 | 연속일(스트릭)
- 구분선으로 분리
- rounded-xl 카드 스타일 (기존 앱 디자인과 일관)

### 5. 히트맵
- 습관 탭의 HabitHeatmap과 동일한 스타일
- 셀 색상: #FF6B35 (오렌지) 계열, 뽀모도로 완료 수에 따라 opacity 단계
- 30주 표시, 12px 셀, gap 3px

## 타이머 로직

### 상태 머신
```
idle → running (시작)
running → paused (일시정지)
paused → running (재개)
running → break (25분 완료 → 자동 전환)
break → idle (휴식 완료 → 자동 전환, 사이클 카운트 증가)
any → idle (리셋)
```

### 사이클
- 1~3번째 집중 완료 후: 5분 짧은 휴식
- 4번째 집중 완료 후: 15분 긴 휴식, 사이클 리셋

### 타이머 구현
- `setInterval` (1초 간격) + `useRef`로 남은 시간 관리
- 탭 전환/백그라운드 시에도 타이머 유지 (시작 시각 기록 방식)
- `Date.now()` 기반으로 경과 시간 계산하여 백그라운드 복귀 시 정확한 시간 표시

### 알림
- 집중/휴식 종료 시 사운드 재생 (`Audio` API)
- `Notification.requestPermission()` → `new Notification()` 으로 브라우저 알림
- 알림음: 짧은 벨 사운드 (public/sounds/timer-end.mp3)

## 데이터

### 저장소
`data/pomodoro-logs.json`

### 스키마
```json
{
  "logs": [
    {
      "id": "uuid",
      "date": "2026-04-05",
      "completedAt": "2026-04-05T14:30:00",
      "type": "focus",
      "duration": 25
    }
  ]
}
```

- `type`: "focus" | "short-break" | "long-break"
- `duration`: 분 단위
- 집중 완료 시에만 로그 기록 (휴식은 기록하지 않음)

### 통계 계산 (클라이언트)
- **오늘 완료**: 오늘 날짜의 focus 타입 로그 수
- **집중 시간**: 오늘 focus 로그의 duration 합계
- **연속일**: 오늘부터 역순으로 focus 로그가 있는 연속 날짜 수
- **히트맵**: 일별 focus 완료 수를 4단계 opacity로 매핑 (0, 1-2, 3-4, 5+)

## API

### GET /api/pomodoro
- 쿼리: `?from=2026-03-01&to=2026-04-05` (날짜 범위, optional)
- 기본: 최근 210일 (30주)
- 응답: `{ data: PomodoroLog[] }`

### POST /api/pomodoro
- 바디: `{ date, completedAt, type, duration }`
- 응답: `{ data: PomodoroLog }`

## 컴포넌트 구조

```
components/
  PomodoroView.tsx        — 메인 타이머 뷰 (타이머 + 통계)
  PomodoroTimer.tsx       — 원형 프로그레스 + 컨트롤
  PomodoroStats.tsx       — 오늘 요약 카드
  PomodoroHeatmap.tsx     — 히트맵 (HabitHeatmap 패턴 참고)

app/api/pomodoro/
  route.ts                — GET/POST 핸들러
```

## 파일 변경 목록

### 신규
- `components/PomodoroView.tsx`
- `components/PomodoroTimer.tsx`
- `components/PomodoroStats.tsx`
- `components/PomodoroHeatmap.tsx`
- `app/api/pomodoro/route.ts`
- `public/sounds/timer-end.mp3`

### 수정
- `types/index.ts` — Section 타입에 "timer" 추가
- `components/BottomNav.tsx` — 타이머 탭 추가 (노트와 위시 사이)
- `app/page.tsx` — 타이머 섹션 렌더링 추가, 데스크탑 사이드바에 타이머 항목 추가
