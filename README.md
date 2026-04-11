This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Changelog

### v0.17.2 - 2026-04-12
- **Change**: PWA 앱 이름 변경 — `v-todo - 아이젠하워 매트릭스 Todo` → `v-todo`, 설명을 현재 기능에 맞게 업데이트
- **Change**: 앱 아이콘 교체 — 아이젠하워 4분면 디자인 → 미니멀 체크마크 (Catppuccin Green on Dark), favicon 포함 전체 교체

### v0.17.1 - 2026-04-10
- **Fix**: 힐링 텍스트 카드 왼쪽 세로 줄(border-left) 장식 제거 — 깔끔한 텍스트만 표시

### v0.17.0 - 2026-04-10
- **Feature**: 노트 에디터 마크다운 단축키 — Bold(⌘B), Italic(⌘I), 취소선(⌘⇧S), 인라인 코드(⌘E), 코드 블록(⌘⇧E), 링크(⌘K), 제목 순환(⌘⇧H), 번호 목록(⌘⇧7), 글머리 기호(⌘⇧8), 체크리스트(⌘⇧9), 인용(⌘⇧.)
- **Feature**: 서식 토글 — 선택 영역이 이미 감싸져 있으면 해제, 줄 접두사도 토글 동작
- **Fix**: Undo/Redo 미동작 — `history()` 확장 누락으로 ⌘Z/⌘⇧Z가 작동하지 않던 문제 수정

### v0.16.0 - 2026-04-09
- **Feature**: 링크 직접 추가 — 링크 탭 하단 "링크 추가" 버튼 + 바텀 시트로 URL과 메모를 입력해 수동 저장 (기존 텔레그램 봇 외 추가 경로)
- **Feature**: `POST /api/links` 엔드포인트 — `{ url, memo? }` 요청으로 `source: "manual"` 링크 생성, URL 추출·도메인 파싱 자동 처리
- **Feature**: AddLinkSheet 컴포넌트 — HealingAddSheet와 동일한 바텀 시트 패턴, URL 자동 포커스, Enter 단축키, 해시태그 메모 지원
- **Improve**: 링크 빈 상태 텍스트 업데이트 — 직접 추가 안내 문구 반영

### v0.15.0 - 2026-04-09
- **Improve**: 무드 Year in Pixels 반응형 — 고정 20px 셀에서 컨테이너 너비 기반 동적 셀 크기로 변경, 가로 스크롤 제거
- **Improve**: 무드 색상 블루 계열 그라데이션으로 변경 — 5단계(연한 블루 → 진한 블루)
- **Feature**: 무드 이미지 저장 — 1년 전체 그리드를 PNG로 캡처 (3x 해상도), 모바일 Web Share API / 데스크톱 다운로드 지원
- **Dependency**: `html-to-image` 추가

### v0.14.0 - 2026-04-09
- **Feature**: 디데이 타임라인 탭 — 모든 일정(D-day + 기념일)을 월별 그룹으로 시간순 정렬하여 한눈에 조감
- **Feature**: 타임라인 월 헤더에 항목 수 표시, 날짜 원형 배지 + 요일, D-day/기념일 구분 태그 (색상 분리)
- **Feature**: 오늘 일정 accent 링 강조, 지난 일정 투명도 처리, 기념일 마일스톤 인라인 표시
- **Change**: 디데이 탭 순서 변경 — 타임라인 / D-day / 기념일 (3탭), 기본 탭을 타임라인으로 설정
- **Improve**: 스와이프 제스처 3탭 대응

### v0.13.0 - 2026-04-09
- **Feature**: 힐링 컬렉션 — 위시 섹션에 "힐링" 탭 추가, 기분이 좋아지는 이미지/글/링크를 모아두는 공간
- **Feature**: 힐링 아이템 3종 — 이미지 업로드, 텍스트 직접 입력(인용문 스타일), 링크 저장(도메인+타이틀 자동 추출)
- **Feature**: Masonry 레이아웃 — 위시 전체 탭(힐링/물건/경험)을 Pinterest 스타일 2열(모바일)/3열(데스크톱) 동적 높이 그리드로 전환
- **Feature**: 이미지 업로드 API (`/api/wishes/upload`) — JPEG/PNG/WebP/GIF, 10MB 제한, `data/healing/`에 저장
- **Feature**: 이미지 서빙 API (`/api/wishes/image/[filename]`) — immutable 캐시, Content-Type 자동 설정
- **Feature**: 링크 타이틀 자동 추출 — URL 저장 시 `<title>` 태그 크롤링 (5초 타임아웃, 50KB 제한)
- **Rename**: "위시리스트" → "위시" (헤더, 사이드바)
- **Improve**: WishItem 카드 — 이미지 없는 카드는 이미지 영역 생략, 텍스트 only 카드로 표시
- **Docs**: 힐링 컬렉션 설계서 및 11-task 구현 계획서
- **Test**: 링크 타이틀 추출 테스트 5개 추가 (총 118개 통과)

### v0.12.0 - 2026-04-08
- **Feature**: 무드 트래커 — 데일리 노트 상단에서 하루 기분을 5단계 이모지(😢😔😐😊😄)로 기록
- **Feature**: Year in Pixels — 노트 섹션 "무드" 탭에서 1년 전체 기분을 세로 스트립 그리드(12월×31일)로 시각화, 셀 탭 시 날짜+이모지 토스트
- **Feature**: 무드 데이터 AI 연동 — 일일 브리핑에 최근 7일 기분 추이 분석, 주간 리뷰에 기분-노트 상관관계 분석 포함
- **Feature**: 노트 섹션 탭 확장 (데일리 / 노트 / 무드), 스와이프 제스처 3탭 지원
- **Feature**: 무드 API (`/api/moods`) — GET(날짜별/연도별 조회), POST(기록/덮어쓰기), `data/moods.json` atomic store
- **Feature**: Catppuccin Yellow (`--sys-yellow`) CSS 변수 추가 (Latte #df8e1d / Mocha #f9e2af)
- **Improve**: 데일리 노트 레이아웃 — 무드+감사일기가 스크롤로 올라가도록 변경, 노트 에디터 영역 확대
- **Docs**: `docs/superpowers/specs/2026-04-08-mood-tracker-design.md` 설계서, `docs/superpowers/plans/2026-04-08-mood-tracker.md` 10-task 구현 계획서
- **Test**: 무드 스토어 단위 테스트 8개 추가 (총 113개 통과)

### v0.11.1 - 2026-04-08
- **Fix**: 노트 에디터 폰트 크기 축소 (20px → 16px) 및 줄 간격 조정 (1.7 → 1.6)

### v0.11.0 - 2026-04-07
- **Feature**: 링크 아카이브 — 텔레그램 봇으로 받은 링크를 자동 저장하는 새 메인 섹션 ("링크" 탭)
- **Feature**: 텔레그램 봇 long polling 워커 — `instrumentation.ts`에서 부팅 시 시작, 공개 URL/webhook 불필요, `TELEGRAM_ALLOWED_CHAT_ID`로 본인만 접근
- **Feature**: 봇 동작 모델 — 봇에 보낸 모든 메시지가 곧 저장. URL이 있으면 전체 텍스트를 메모로 저장하고 URL 추출, 없으면 "URL을 찾지 못했어요" 응답
- **Feature**: LinkCard — 메모 본문 안의 URL을 자동 linkify, 해시태그는 인라인 chip + 별도 chip row, 도메인 라벨과 상대 시간, 카드 탭으로 첫 URL 열기, [✓ 읽음 / 📤 공유 / 🗑] 액션 행 (삭제는 2-tap 확인)
- **Feature**: LinkSection — 읽지 않음 / 읽음 두 탭 + 카운트 배지 + 빈 상태 메시지
- **Feature**: 다중 URL 지원 — 한 메시지 = 한 항목, `urls: string[]` 모델로 메모 안의 모든 URL 보존
- **Feature**: Web Share API 공유 — 모바일은 네이티브 공유 시트, 데스크톱은 클립보드 폴백
- **Feature**: API `/api/links` (GET) + `/api/links/[id]` (PUT/DELETE) — `data/links.json` atomic store, `lastUpdateId` + `telegramMessageId` 이중 idempotency
- **Feature**: 새 API/스토어/유틸 (`lib/url-extract.ts`, `lib/link-store.ts`, `lib/telegram-poller.ts`) — TDD로 작성, 41개 신규 단위 테스트 (총 105개 통과)
- **Fix**: 링크 섹션에서 D-day/기념일 탭이 잘못 보이고 스와이프 시 ddayTab이 토글되던 문제 — `app/page.tsx`의 탭/스와이프 fallback이 무조건 dday로 떨어지던 패턴을 명시적 분기로 수정
- **Fix**: Node 18+의 Happy Eyeballs 버그 우회 — `instrumentation.ts`에서 `dns.setDefaultResultOrder("ipv4first")` + `net.setDefaultAutoSelectFamily(false)`로 IPv6 EHOSTUNREACH가 IPv4 fetch까지 망가뜨리는 문제 회피 (nodejs/node#47644)
- **Docs**: `docs/superpowers/specs/2026-04-07-link-archive-design.md` 설계서, `docs/superpowers/plans/2026-04-07-link-archive.md` 12-task 구현 계획서, CLAUDE.md "텔레그램 링크 봇 설정" 가이드 추가

### v0.10.0 - 2026-04-07
- **Feature**: 인라인 해시태그 시스템 — 할 일, 위시리스트, D-day 제목에 `#태그`를 입력하면 자동 인식하여 accent 색상 pill로 렌더링
- **Feature**: 크로스 섹션 태그 뷰 — 태그 pill을 탭하면 모든 섹션(할 일, 위시, D-day)에서 해당 태그가 포함된 항목을 통합 뷰로 표시
- **Feature**: 태그 파싱 유틸리티 (`lib/tags.ts`) — `extractTags`, `splitParts` 함수로 `#태그` 자동 추출 및 렌더링 분리

### v0.9.2 - 2026-04-06
- **Fix**: 습관 탭 "새 습관 추가" 버튼 화면 하단으로 이동 — 위시리스트와 동일한 레이아웃 패턴 적용

### v0.9.1 - 2026-04-06
- **Fix**: 빈 화면 아이콘 통일 — SVG 아이콘을 이모지로 교체 (할 일 ✅, 일정 📅, 노트 📝, 습관 🔥, 보관함 📦)

### v0.9.0 - 2026-04-06
- **Remove**: 뽀모도로 타이머 기능 제거 — 타이머 탭, API, 컴포넌트, 타입 일괄 삭제
- **Change**: 탭 구성 5개 → 4개 (할 일 / 노트 / 위시 / D-day)

### v0.8.1 - 2026-04-06
- **Fix**: 데일리 노트 "저장됨" 표시 중복 버그 수정
- **Fix**: 추가 버튼 위치/크기 통일 — 노트, 위시, 디데이 탭 모두 하단 고정, 동일한 마진 적용

### v0.8.0 - 2026-04-05
- **Feature**: 습관 트래커 — "할 일" 섹션에 3번째 탭("습관")으로 매일/요일/N일 간격 반복 습관 관리
- **Feature**: 습관 체크 시 연속 달성일(스트릭) 불꽃 아이콘 표시, 탭하면 GitHub 잔디 스타일 히트맵 펼침
- **Feature**: 히트맵 — 12px 고정 셀, 30주 렌더링 + overflow-hidden으로 카드 전체 너비 채움
- **Feature**: 습관 추가/편집 시트 — 제목 + 반복 주기(매일/요일 선택/2~7일 간격) 설정
- **Feature**: 감사 일기 — 데일리노트 상단에 "오늘의 감사" 3칸 입력 필드 (항상 펼침, 1초 디바운스 자동 저장)
- **Feature**: AI 브리핑 연동 — 오늘의 습관(스트릭 포함) + 어제의 감사 일기 리마인드 섹션 추가
- **Feature**: 습관/감사 데이터 저장소 (habits.json, habit-logs.json, gratitude.json) + API 엔드포인트

### v0.7.0 - 2026-04-05
- **Feature**: 위시 완료 경험 개선 — 완료 토글 시 축하 시트(컨페티 애니메이션 + 카테고리별 메시지)가 열리며 완료 정보 입력
- **Feature**: 완료 정보 기록 — 실제 구매 가격, 만족도(별 1~5), 한줄 후기, 완료일을 위시 달성 시 저장
- **Feature**: 완료 카드 보강 — opacity 제거, 달성일 뱃지, 예상/실제 가격 비교, 만족도 별점, 후기 표시
- **Feature**: 완료된 위시 편집 시 완료 정보 수정 가능 + "완료 취소" 버튼 추가
- **Feature**: 완료 섹션 라벨 "완료" → "달성"으로 변경

### v0.6.1 - 2026-04-05
- **Feature**: 할 일 인라인 편집 — 데스크톱 더블클릭 / 모바일 롱프레스(500ms)로 제목 즉시 수정
- **Feature**: Enter로 저장, Escape로 취소, 바깥 클릭 시 자동 저장, 낙관적 업데이트 적용
- **Feature**: 보관함에서도 동일한 인라인 편집 지원

### v0.6.0 - 2026-04-04
- **Feature**: Year Progress Bar — 현재 연도 진행률을 프로그레스 바로 표시, 모든 섹션에서 동일하게 노출
- **Feature**: 데스크탑 사이드바 상단 + 모바일 헤더 아래에 배치, 라이트/다크 테마 자동 대응
- **Feature**: Client-only 렌더링으로 SSG hydration mismatch 방지, ARIA progressbar 접근성 지원

### v0.5.2 - 2026-04-03
- **Fix**: PWA 아이콘 파일이 git에 포함되지 않던 문제 수정 (`.gitignore` `*.png` 예외 처리)

### v0.5.1 - 2026-04-03
- **Feature**: PWA 지원 — 데스크톱(Windows/Mac)에서 앱으로 설치 가능
- **Feature**: Web App Manifest, Service Worker, 앱 아이콘(192x192, 512x512) 추가
- **Feature**: 네트워크 우선 캐시 전략으로 오프라인 폴백 지원

### v0.5.0 - 2026-04-03
- **Feature**: 위시리스트 — 사고 싶은 물건과 하고 싶은 경험을 카드형 UI로 관리
- **Feature**: 위시 카드에 이미지(URL), 가격, 메모, 링크 지원 — 이미지가 상단에 크게 표시되는 2열 그리드 레이아웃
- **Feature**: 물건/경험 내부 탭으로 카테고리 구분, 완료 토글 및 삭제 지원
- **Feature**: 메인 탭 순서 변경 (할 일 / 노트 / 위시리스트 / 디데이)
- **Feature**: 위시 API (`/api/wishes`, `/api/wishes/[id]`) — CRUD 엔드포인트 및 JSON 파일 저장소

### v0.4.2 - 2026-04-02
- **Fix**: 노트 에디터 코드 블록 글자 크기를 0.85em에서 0.75em으로 추가 축소

### v0.4.1 - 2026-04-02
- **Fix**: 노트 에디터 코드 블록(monospace) 글자 크기를 본문 대비 0.85em으로 축소

### v0.4.0 - 2026-04-01
- **Feature**: 노트 에디터 격자무늬 배경 — 다이어리 스타일의 그리드 패턴을 CodeMirror 에디터 배경에 적용, 라이트/다크 모드 자동 대응

### v0.3.4 - 2026-04-01
- **Fix**: 노트 에디터 스크롤 불가 버그 수정 — 데스크톱/모바일 모두 내용이 길어도 스크롤되지 않던 문제 해결

### v0.3.3 - 2026-04-01
- **Improve**: 새 환경 셋업 지원 — `.env.local.example` 추가, `ecosystem.config.js` git 추적으로 전환
- **Fix**: `ecosystem.config.js`의 `cwd`를 `__dirname`으로 변경하여 어떤 경로에서든 PM2 정상 동작
- **Fix**: `.gitignore`에서 `.env.local.example` 예외 처리 추가

### v0.3.2 - 2026-04-01
- **Feature**: AI 주간 리뷰 — 매주 일요일 밤 데일리 노트를 분석하여 인사이트를 불릿 포인트로 추출, `weekly-review/` 폴더에 자동 저장
- **Feature**: 직전 주 리뷰를 LLM에 함께 전달하여 연속성 있는 분석 제공
- **Fix**: 테스트 실행 시 실제 데이터가 덮어쓰여지는 버그 수정 (테스트 데이터 격리)

### v0.3.1 - 2026-03-31
- **Improve**: AI 브리핑에 오늘/어제 데일리 노트 내용을 포함하여 더 풍부한 맥락 제공

### v0.3.0 - 2026-03-31
- **Feature**: Notes section — new 3rd tab (할 일 / 노트 / D-day) with two sub-tabs
- **Feature**: Daily Notes — date-navigated markdown journal with CodeMirror v6 editor, auto-save (1s debounce + focus-out)
- **Feature**: General Notes — file/folder based markdown notebook with create, rename, delete, navigation stack
- **Feature**: CodeMirror v6 markdown editor with Catppuccin-themed syntax highlighting (Latte/Mocha)
- **Feature**: API routes for daily notes (`/api/notes/daily`) and file management (`/api/notes/files`)
- **Improve**: Bottom nav now opaque background instead of semi-transparent to prevent content bleed-through
- **Improve**: Font sizes aligned to Apple HIG Dynamic Type across all note components (Body 20px, Footnote 15px)

### v0.2.3 - 2026-03-30
- **Feature**: Swipe gesture to switch tabs (지금/곧, D-day/기념일)
- **Fix**: Briefing date showing previous day (UTC→KST timezone fix in prompts.ts)
- **Fix**: React Error #310 — move useRef to component top level (hooks rules)
- **Docs**: Add deployment procedure and code rules to CLAUDE.md

### v0.2.2 - 2026-03-30
- **Improve**: Apple HIG typography compliance — all text sizes increased for better mobile readability
- **Improve**: Body text 16→20px, secondary text 12→15px, segment tabs 13→17px, sheet titles 17→20px, D-day labels 20→24px
- **Improve**: Calendar block and schedule item row height increased for better touch targets
- **Improve**: Bottom nav labels 10→12px, briefing modal prose-sm→prose for larger body text

### v0.2.1 - 2026-03-30
- **Fix**: Font path for reverse-proxy deployment (`/proxy/todo/` prefix)
- **Fix**: Lunar calendar yearly schedule display (correct solar conversion for D-day)
- **Improve**: Schedule list — individual rounded cards with gap spacing
- **Refactor**: AddScheduleSheet — unified date input for lunar/solar, simplified conversion logic
- **Polish**: Toggle switch & schedule item card sizing to match HIG

### v0.2.0 - 2026-03-29
- **Complete redesign**: Eisenhower matrix → time-decay stage model (지금/곧/보관함)
- **D-day & Anniversary**: Calendar-style layout with auto-computed next occurrence, milestone labels (N주년, N개월째, N일째)
- **Lunar calendar**: Support for 음력 dates with solar conversion
- **AI Briefing**: Unified daily briefing for todos + schedules via Gemini
- **New components**: BottomNav, SectionTabs, ScheduleItem, AddScheduleSheet, ArchiveView, UndoToast
- **Catppuccin theme**: Latte (light) / Mocha (dark) with system preference
- **Responsive layout**: Desktop sidebar + mobile bottom nav, card-based items
- **Auto-decay**: Todos auto-migrate from "지금" to "곧" after 3 days

### v0.1.1 - 2026-03-21
- Add `basePath` proxy support (`/proxy/todo`) for reverse-proxy deployments
- Update all API fetch calls to use `NEXT_PUBLIC_BASE_PATH` environment variable

### v0.1.0 - 2026-03-21
- Initial release: Eisenhower Matrix Todo App
