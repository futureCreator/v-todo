# 데일리 노트 & 일반 노트 기능 설계

## 개요

v-todo에 "노트" 섹션을 추가하여 데일리 노트와 일반 노트 기능을 제공한다. CodeMirror v6 기반 마크다운 에디터를 사용하며, 파일은 서버의 프로젝트 디렉토리에 저장하여 향후 백업 방법을 별도로 마련할 수 있게 한다.

## 네비게이션 구조

### 하단 네비 (모바일)

```
[ 할 일 ]  [ 노트 ]  [ D-day ]
```

- 기존 2탭에서 3탭으로 확장
- section 상태: `"todo" | "note" | "dday"`
- 아이콘: 할 일(체크마크), 노트(doc.text), D-day(캘린더)

### 데스크톱 사이드바

- 기존 패턴대로 "노트" 항목을 "할 일"과 "D-day" 사이에 추가
- 서브탭은 컨텐츠 영역 상단에 표시

### 노트 섹션 내 서브탭

```
[ 데일리 ]  [ 노트 ]
```

- 기존 SectionTabs 컴포넌트 재사용
- "할 일"의 `현재 | 곧 처리할 일`, "D-day"의 `일반 | 기념일`과 동일한 패턴

## 데일리 노트 탭

### 날짜 네비게이션

- 중앙에 날짜 텍스트 (예: "3월 31일 월요일")
- 좌우에 chevron 버튼으로 전날/다음날 이동
- 날짜 텍스트 탭하면 날짜 피커 열림 (네이티브 `input[type="date"]`를 Apple HIG 스타일로)
- 오늘 날짜면 "오늘" 뱃지 표시

### 에디터 영역

- 날짜 네비게이션 아래로 CodeMirror 에디터가 전체 남은 공간 차지
- 빈 날짜로 이동 시 빈 에디터 표시, 타이핑하면 `data/daily-notes/YYYY-MM-DD.md` 자동 생성
- 빈 내용으로 저장 시 파일 삭제

### 스와이프

- 노트 섹션에서는 스와이프를 서브탭 전환(데일리 <-> 노트)에만 사용
- 날짜 이동은 chevron 버튼 + 캘린더 피커로만

## 일반 노트 탭

### 파일 리스트 뷰

- Apple HIG의 List (Plain) 스타일
- 각 항목: 파일명 + 마지막 수정 시간 (label-secondary)
- 폴더는 상단에, 파일은 하단에 정렬
- 폴더 탭 → 하위 목록으로 이동 (네비게이션 push 스타일, 상단에 `< 뒤로` + 현재 폴더명)
- 파일 탭 → 에디터 열림 (상단에 `< 뒤로` + 파일명)

### 새 파일/폴더 생성

- 우측 상단 `+` 버튼 → 액션시트: "새 노트" / "새 폴더"
- 새 노트: 파일명 입력 후 에디터로 이동
- 새 폴더: 폴더명 입력 후 리스트 갱신

### 파일 삭제/이름 변경

- 항목 길게 누르기 (long press) → 컨텍스트 메뉴: "이름 변경" / "삭제"
- 삭제 시 확인 얼럿 (Apple HIG destructive 스타일)

### 에디터 뷰

- 데일리 노트와 동일한 CodeMirror 에디터
- 상단 바에 파일명 표시 + 저장 상태

### 저장 구조

```
data/notes/
├── 아이디어.md
├── 회의록/
│   ├── 2026-03-28.md
│   └── 2026-03-31.md
└── 메모.md
```

## 자동 저장

- 디바운스 1초: 입력이 멈추고 1초 후 서버에 저장
- 포커스 아웃: 날짜 이동, 탭 전환, 파일 전환 시 즉시 저장
- 저장 상태 표시: 우측 상단에 "저장됨" / "저장 중..." (label-tertiary 색상)

## CodeMirror 에디터 설정

### 패키지

- `@codemirror/commands`
- `@codemirror/lang-markdown`
- `@codemirror/language`
- `@codemirror/language-data`
- `@codemirror/state`
- `@codemirror/view`
- `@lezer/highlight`

### 테마

- v-terminal의 `codemirrorSetup.ts`를 기반으로 CSS 변수를 Catppuccin 변수로 교체
- `--bg-primary`, `--label-primary`, `--accent-primary`, `--separator` 등
- 라인 넘버 숨김, 활성 라인 하이라이트 숨김
- 폰트: Pretendard (본문), JetBrains Mono (코드블록)
- 폰트 사이즈: Apple HIG 기준 Body 20px

### 마크다운 하이라이팅

- 헤딩 (레벨별 크기/굵기 차등), 볼드, 이탤릭, 취소선
- 코드 (인라인/블록), URL, 링크
- 인용문, 리스트

### 에디터 동작

- 라인 래핑 활성화
- 기본 키맵 + Tab 들여쓰기
- 플레이스홀더 텍스트 지원

## API 라우트

### 데일리 노트

- `GET /api/notes/daily?date=2026-03-31` — 해당 날짜 노트 반환 (없으면 빈 문자열)
- `PUT /api/notes/daily?date=2026-03-31` — 마크다운 내용 저장, 빈 내용이면 파일 삭제

### 일반 노트

- `GET /api/notes/files?path=/` — 해당 경로의 파일/폴더 목록 (이름, 타입, 수정일)
- `GET /api/notes/files?path=/회의록/2026-03-31.md` — 파일 내용 반환
- `PUT /api/notes/files?path=/메모.md` — 파일 저장 (없으면 생성)
- `POST /api/notes/files` — 새 파일/폴더 생성 (body: name, type, path)
- `PATCH /api/notes/files?path=/메모.md` — 이름 변경 (body: newName)
- `DELETE /api/notes/files?path=/메모.md` — 파일/폴더 삭제

### 보안

- path 파라미터에 `..` 등 경로 탈출 방지 (`data/notes/` 외부 접근 차단)
- 파일명 검증: 한글, 영문, 숫자, 하이픈, 언더스코어, 공백, 마침표만 허용

## 컴포넌트 구조

### 새로 만들 컴포넌트

- `NoteEditor.tsx` — CodeMirror 에디터 래퍼 (데일리/일반 공용)
- `DailyNoteView.tsx` — 날짜 네비게이션 + NoteEditor
- `DateNavigator.tsx` — 날짜 표시, chevron 버튼, 날짜 피커
- `GeneralNoteView.tsx` — 파일 리스트 or 에디터 뷰 (네비게이션 스택 관리)
- `FileListView.tsx` — 폴더/파일 목록 표시, long press 컨텍스트 메뉴
- `FileListItem.tsx` — 개별 파일/폴더 행

### 새로 만들 라이브러리

- `lib/note-store.ts` — 데일리 노트 읽기/쓰기 (파일 시스템)
- `lib/file-store.ts` — 일반 노트 CRUD + 디렉토리 목록 (경로 검증 포함)
- `lib/codemirror-setup.ts` — v-terminal 기반, Catppuccin 테마 적용

### 수정할 파일

- `app/page.tsx` — section에 `"note"` 추가, 노트 뷰 렌더링
- `components/BottomNav.tsx` — 3탭으로 확장
- `types/index.ts` — Section 타입에 `"note"` 추가, FileItem 등 타입 정의

### API 라우트

- `app/api/notes/daily/route.ts`
- `app/api/notes/files/route.ts`

## 저장 경로

- 데일리 노트: `data/daily-notes/YYYY-MM-DD.md`
- 일반 노트: `data/notes/` (디렉토리 + 파일 구조)
- 두 경로 모두 기존 `.gitignore`의 `/data/` 규칙에 의해 git 추적 제외
- 백업 방법은 향후 별도로 마련
