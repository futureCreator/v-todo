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
