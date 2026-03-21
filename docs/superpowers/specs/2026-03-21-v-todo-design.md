# v-todo Design Spec

## Overview

아이젠하워 매트릭스 기반 Todo 애플리케이션. PC/모바일 반응형 웹앱으로, Tailscale 네트워크 내에서 접속. Google Gemini AI를 활용한 투두 제안, 정리, 데일리 브리핑 기능 포함.

## Architecture

- **Stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- **Data:** JSON 파일 (`data/todos.json`) — 서버 로컬 저장
- **AI:** Google Gemini API (`gemini-3-flash-preview`) via `@google/generative-ai` SDK
- **Access:** Tailscale 네트워크 내 접근, 별도 인증 없음
- **Font:** Pretendard (기본), JetBrains Mono (코드)
- **Design:** Apple HIG 철저 준수
- **Runtime:** `next build && next start`, PM2로 프로세스 관리, 기본 포트 3000

### Directory Structure

```
v-todo/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       ├── todos/
│       │   ├── route.ts          # GET, POST
│       │   └── [id]/
│       │       └── route.ts      # PUT, DELETE
│       └── ai/
│           ├── suggest/route.ts
│           ├── cleanup/
│           │   ├── route.ts
│           │   └── apply/route.ts
│           └── briefing/route.ts
├── components/
│   ├── TodoList.tsx
│   ├── TodoItem.tsx
│   ├── TodoInput.tsx
│   ├── TabBar.tsx
│   ├── AiActions.tsx
│   ├── BriefingModal.tsx
│   ├── AiSuggestPreview.tsx
│   └── AiCleanupDiff.tsx
├── lib/
│   ├── store.ts            # JSON 파일 읽기/쓰기 (atomic write)
│   ├── gemini.ts           # Gemini API 클라이언트
│   └── prompts.ts          # AI 프롬프트 템플릿
├── types/
│   └── index.ts
├── data/
│   └── todos.json
├── public/
│   └── fonts/
├── .env.local
├── package.json
└── tsconfig.json
```

### Dependencies

- `next` 15.x, `react` 19.x, `typescript`
- `tailwindcss` 4.x, `@tailwindcss/postcss`
- `@google/generative-ai` — Gemini SDK
- `uuid` — ID 생성
- `react-markdown` — 브리핑 마크다운 렌더링

## Type Definitions

```typescript
type Quadrant =
  | "urgent-important"
  | "urgent-not-important"
  | "not-urgent-important"
  | "not-urgent-not-important";

interface Todo {
  id: string;
  title: string;
  quadrant: Quadrant;
  completed: boolean;
  aiGenerated: boolean;
  dueDate: string | null;       // "YYYY-MM-DD", 서버 로컬 타임존 기준
  createdAt: string;            // ISO 8601
  completedAt: string | null;   // ISO 8601
}

// POST /api/todos
interface CreateTodoRequest {
  title: string;                // 1~200자
  quadrant: Quadrant;
  dueDate?: string | null;
}

// PUT /api/todos/:id
interface UpdateTodoRequest {
  title?: string;
  quadrant?: Quadrant;          // 분면 이동 지원
  completed?: boolean;
  dueDate?: string | null;
}

// POST /api/ai/suggest
interface AiSuggestRequest {
  quadrant: Quadrant;           // 제안 대상 분면
}
interface AiSuggestResponse {
  suggestions: { title: string; dueDate: string | null }[];
}

// POST /api/ai/cleanup
interface AiCleanupRequest {
  quadrant: Quadrant;           // 정리 대상 분면
}
interface AiCleanupResponse {
  changes: {
    type: "edit" | "merge" | "delete";
    originalIds: string[];
    newTitle: string | null;    // delete일 때 null
    dueDate?: string | null;   // merge 시 originalIds 중 가장 이른 non-null dueDate 상속
  }[];
}

// POST /api/ai/cleanup/apply — 선택한 정리 변경 사항 일괄 적용
interface AiCleanupApplyRequest {
  quadrant: Quadrant;
  changes: AiCleanupResponse["changes"];  // 사용자가 수락한 변경만
}
// edit: 원본 ID 유지, 제목만 변경
// merge: originalIds 모두 삭제 후 새 UUID로 생성
// delete: originalIds 삭제

// GET /api/ai/briefing
interface AiBriefingResponse {
  briefing: string;             // 마크다운 형식 요약
}

// 공통 API 응답
interface ApiResponse<T> {
  data?: T;
  error?: string;
}
```

## API Endpoints

- `GET /api/todos` — 전체 투두 조회 → `ApiResponse<Todo[]>`
- `POST /api/todos` — 투두 생성 (`CreateTodoRequest`) → `ApiResponse<Todo>`
- `PUT /api/todos/:id` — 투두 수정 (`UpdateTodoRequest`) → `ApiResponse<Todo>`
- `DELETE /api/todos/:id` — 투두 삭제 → `ApiResponse<null>`
- `POST /api/ai/suggest` — AI 투두 제안 (`AiSuggestRequest`) → `ApiResponse<AiSuggestResponse>`
- `POST /api/ai/cleanup` — AI 투두 정리 (`AiCleanupRequest`) → `ApiResponse<AiCleanupResponse>`
- `POST /api/ai/cleanup/apply` — 선택된 정리 변경 일괄 적용 (`AiCleanupApplyRequest`) → `ApiResponse<Todo[]>`
- `GET /api/ai/briefing` — 데일리 브리핑 → `ApiResponse<AiBriefingResponse>`

## Data Model

`data/todos.json` 구조:

```json
{
  "todos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "서버 마이그레이션",
      "quadrant": "urgent-important",
      "completed": false,
      "aiGenerated": false,
      "dueDate": "2026-03-25",
      "createdAt": "2026-03-21T09:00:00Z",
      "completedAt": null
    }
  ]
}
```

### Quadrant Keys & Tab Labels

| Key | 한글 라벨 | 의미 |
|-----|-----------|------|
| `urgent-important` | 지금 하기 | 즉시 실행 |
| `urgent-not-important` | 위임하기 | 다른 사람에게 맡기기 |
| `not-urgent-important` | 계획하기 | 일정 잡아서 하기 |
| `not-urgent-not-important` | 나중에 | 필요시 제거 |

### Field Notes

- `title` — 1~200자 제한.
- `aiGenerated` — AI가 생성한 항목 구분. UI에서 배경색으로 구분.
- `dueDate` — 선택값 (`null` 가능). `YYYY-MM-DD` 형식. 서버 로컬 타임존 기준. 기한 경과 시 붉은색 overdue 표시.
- `completedAt` — 완료 시 타임스탬프. 완료 항목은 삭제하지 않고 보관.
- `quadrant` — PUT으로 변경 가능 (분면 간 이동 지원).

### File I/O

- **Atomic write:** 임시 파일(`data/todos.tmp.json`)에 쓴 뒤 `rename`으로 교체.
- **초기 상태:** `data/todos.json`이 없으면 `{ "todos": [] }`로 자동 생성.

## UI Design

### Layout

- 상단: 앱 타이틀 + 데일리 브리핑 버튼
- 중앙: 4개 탭 (아이젠하워 매트릭스 4분면)
- 각 탭 내부: 투두 리스트 + 하단 입력 영역
- 하단 플로팅: AI 기능 버튼 (제안 / 정리)

### Responsive

- **모바일:** 하단 탭 바, 한 번에 하나의 분면만 표시. Thumb Zone 기준 배치.
- **PC (≥768px):** 2x2 그리드로 4분면 동시 표시. 그리드 셀 클릭 시 해당 분면이 활성화되며, 활성 분면은 Accent 색상 상단 보더로 표시. 초기 로드 시 "지금 하기" 분면 활성. AI 기능은 활성 분면에 적용.

### Tab Labels

한글 짧은 라벨 사용: **지금 하기** / **위임하기** / **계획하기** / **나중에**

### Theme & Design Tokens

라이트/다크 테마: 시스템 `prefers-color-scheme`에 따라 자동 전환.

**라이트 모드:**
- Background: `#FFFFFF`
- Surface (card): `#F5F5F7`
- AI item background: `#F0EBFF` (연한 보라)
- Text primary: `#1D1D1F`
- Text secondary: `#6E6E73`
- Accent: `#007AFF` (HIG 시스템 블루)
- Destructive: `#FF3B30`
- Overdue badge: `#FF3B30`
- Separator: `#D1D1D6`

**다크 모드:**
- Background: `#000000`
- Surface (card): `#1C1C1E`
- AI item background: `#2C2640` (어두운 보라)
- Text primary: `#F5F5F7`
- Text secondary: `#98989D`
- Accent: `#0A84FF`
- Destructive: `#FF453A`
- Overdue badge: `#FF453A`
- Separator: `#38383A`

### UI States

- **빈 분면:** "할 일을 추가해보세요" 안내 텍스트
- **전체 빈 상태:** 간단한 환영 메시지 + 첫 투두 입력 유도
- **로딩:** 스켈레톤 UI (투두 리스트), AI 응답 대기 시 인라인 스피너
- **에러:** 화면 하단 토스트로 에러 메시지 표시, 3초 후 자동 사라짐

### Completed Items

- 완료된 항목은 해당 분면 리스트 하단에 취소선 처리로 표시
- 기본 숨김, "완료 보기" 토글로 표시/숨김 전환

### AI Item Distinction

- AI가 생성한 투두는 배경색으로 구분 (아이콘 없음)
- 라이트: `#F0EBFF`, 다크: `#2C2640`

## AI Features

### 1. AI 투두 제안 (`POST /api/ai/suggest`)

- 현재 분면의 투두 목록을 Gemini에 전달
- 응답받은 항목들을 체크리스트 형태로 표시 (모달)
- 사용자가 체크한 항목만 선택적으로 추가
- 추가된 항목은 `aiGenerated: true`로 저장

**프롬프트 템플릿:**
```
당신은 할 일 관리 도우미입니다.
아래는 아이젠하워 매트릭스의 "{quadrant_label}" 분면에 있는 현재 할 일 목록입니다:

{todo_list}

이 목록을 보고 빠져 있을 수 있는 할 일을 3~5개 제안해주세요.
반드시 아래 JSON 형식으로만 응답하세요:
[{"title": "할 일 제목", "dueDate": "YYYY-MM-DD" 또는 null}]
```

### 2. AI 투두 정리 (`POST /api/ai/cleanup`)

- 현재 분면의 투두 목록을 Gemini에 전달
- 중복 제거, 문장 다듬기, 유사 항목 병합 제안
- 변경 사항을 리스트로 표시: 각 변경에 수락/거절 버튼
- 사용자 확인 후 선택적 반영

**프롬프트 템플릿:**
```
당신은 할 일 정리 도우미입니다.
아래는 할 일 목록입니다:

{todo_list_with_ids}

중복 제거, 문장 다듬기, 유사 항목 병합을 제안해주세요.
반드시 아래 JSON 형식으로만 응답하세요:
[{"type": "edit"|"merge"|"delete", "originalIds": ["id1"], "newTitle": "정리된 제목" 또는 null}]
```

### 3. 데일리 브리핑 (`GET /api/ai/briefing`)

- 전체 4분면의 미완료 투두 + 마감일 정보를 Gemini에 전달
- "오늘 집중해야 할 것" 요약 생성
- 앱 상단 브리핑 버튼 누르면 시트(바텀시트/모달)로 표시

**프롬프트 템플릿:**
```
당신은 일일 업무 브리핑 도우미입니다.
오늘 날짜: {today}

아래는 사용자의 전체 미완료 할 일 목록입니다:
{all_todos_with_quadrants_and_due_dates}

오늘 집중해야 할 항목을 우선순위별로 정리하고,
마감이 임박하거나 지난 항목을 강조해서 간결한 브리핑을 작성해주세요.
마크다운 형식으로 응답하세요.
```

### Common

- 모든 AI 요청은 서버 사이드 API Route에서 처리 (API 키 노출 방지)
- Gemini 모델: `gemini-3-flash-preview`
- API 키: `.env.local`의 `GEMINI_API_KEY`
- Gemini `generationConfig`: suggest/cleanup → `{ temperature: 0.7, maxOutputTokens: 1024, responseMimeType: "application/json" }`, briefing → `{ temperature: 0.7, maxOutputTokens: 1024 }` (마크다운 응답)
- Gemini 응답은 JSON 파싱 후 스키마 검증. 파싱 실패 시 "AI 응답을 처리할 수 없습니다" 토스트 표시.
- AI 요청 타임아웃: 15초

## Error Handling

- **API 에러 응답:** HTTP 상태 코드 + `ApiResponse` 형식의 `error` 필드
- **400:** 잘못된 요청 (유효성 검증 실패)
- **404:** 투두 없음
- **500:** 서버/파일/AI 오류
- **클라이언트:** 모든 에러는 하단 토스트로 표시 (3초 자동 사라짐)
- **JSON 파일 손상:** 파싱 실패 시 빈 목록(`{ "todos": [] }`)으로 초기화하고 에러 로그 출력
- **Gemini API 실패:** "AI 서비스를 사용할 수 없습니다" 토스트. 재시도 버튼 없음 (사용자가 다시 클릭).

## Client State

- `useState` + `fetch`로 관리. 별도 상태 라이브러리 사용하지 않음.
- 투두 목록은 페이지 로드 시 `GET /api/todos`로 가져오고, 모든 mutation 후 전체 목록 refetch.
- 각 분면의 투두는 `createdAt` 오름차순 정렬. 완료된 항목은 하단에 별도 그룹.

## Todo Edit Bottom Sheet

아이템 탭 → 바텀 시트(half-sheet)가 올라와 제목 편집, 분면 이동, 마감일 변경, 삭제를 할 수 있다.

### Trigger

- **TodoItem 텍스트 영역 탭** → 바텀 시트 오픈
- **체크박스 탭** → 기존 완료 토글 유지 (바텀 시트 열지 않음)
- **삭제 버튼(X)** → 기존 즉시 삭제 유지

### Sheet Structure (위→아래)

1. **헤더** — 좌측 "취소" 텍스트 버튼 (sys-blue) + 중앙 "편집" 타이틀 (font-weight: 600) + 핸들 바 (상단 중앙 회색 캡슐)
2. **제목 편집** — 현재 제목이 채워진 텍스트 필드. `font-size: 20px`, `font-weight: 600`. 탭하면 편집 가능. 하단 구분선.
3. **분면 선택** — `QUADRANT_ORDER` (types/index.ts) 순서로 4개 칩을 2x2 그리드 배치
   - 각 칩: 분면 컬러 좌측 바 + 라벨 ("지금 하기", "계획하기", "위임하기", "나중에")
   - 현재 분면: tint 배경 + `font-weight: 600`
   - 다른 분면 탭 → 즉시 시각적 선택 변경
4. **마감일** — 캘린더 아이콘 + 날짜 텍스트 (없으면 "마감일 없음", tertiary color)
   - 탭 → `<input type="date">` 네이티브 피커 활성화
   - 날짜가 있을 때 우측 X 버튼 → 날짜 제거 (`null` 설정)
5. **저장 버튼** — 파란색 풀폭 라운드 버튼 "저장". 변경 사항이 없으면 `disabled`. 탭 → `PUT /api/todos/:id` 호출 → 시트 닫기 → 목록 refetch.
6. **삭제 버튼** — 저장 버튼 아래, 빨간 텍스트 "삭제". 탭 → `DELETE /api/todos/:id` → 시트 닫기 → 목록 refetch.

### Completed Todo Behavior

- 완료된 아이템도 편집 가능. 편집해도 완료 상태는 유지.
- 모든 필드(제목, 분면, 마감일) 편집 가능.

### Interactions

- **배경 딤** — 시트 뒤 반투명 검정 오버레이 (`bg-black/40`)
- **닫기** — 배경 탭 또는 헤더 "취소" 버튼 → 변경 사항 저장 안 함 (cancel). 스와이프 제스처는 MVP 제외.
- **시트 높이** — 콘텐츠에 맞춤, `max-h-[85dvh]`.
- **애니메이션** — 기존 `ios-sheet` / `ios-sheet-overlay` CSS 클래스 사용 (0.4s cubic-bezier(0.32, 0.72, 0, 1))
- **반응형** — 모바일: 하단 정렬 바텀 시트. 데스크톱(md↑): 중앙 정렬 모달, 풀 border-radius. 기존 BriefingModal/AiSuggestPreview 패턴과 동일 (`items-end md:items-center`).

### New Component

`components/TodoEditSheet.tsx`

```typescript
interface TodoEditSheetProps {
  todo: Todo;
  onSave: (id: string, updates: UpdateTodoRequest) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}
```

### State Changes in page.tsx

- `editingTodo: Todo | null` state 추가
- `handleEdit` 함수: `PUT /api/todos/:id` 호출
- TodoItem에 `onEdit` prop 추가 (텍스트 탭 시 호출)
- QuadrantPanel과 QuadrantGrid에 `onEdit` prop 전달

### API Changes

없음. 기존 `PUT /api/todos/:id`가 `title`, `quadrant`, `dueDate` 변경을 이미 지원.

## Scope Exclusions (MVP)

- 드래그 앤 드롭 분면 이동
- 검색/필터 기능
- 오프라인 지원
- 데이터 백업/복구
- 벌크 연산 (다중 선택 삭제/완료)
