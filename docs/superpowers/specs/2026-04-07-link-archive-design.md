# 링크 아카이브 설계

## 개요

v-todo 앱에 새 기능 **링크 아카이브**를 추가한다. 뉴스 기사, 블로그 글, X(Twitter) 트윗, Threads 게시물 등 외부 링크를 모아두고 나중에 읽거나 참고 자료로 다시 찾기 위한 보관함이다.

핵심 가치: **저장 흐름이 가벼워야 한다.** v-todo 앱을 여는 대신 텔레그램 봇으로 메시지를 보내면 자동으로 저장된다. 두 가지 사용 시나리오를 동시에 만족한다:
1. **나중에 읽기 (Read-it-later)** — 새 링크는 "읽지 않음"에 쌓이고, 다 읽으면 "읽음"으로 이동
2. **참고 자료 보관함 (Reference library)** — 영구 보관, 자동 만료 없음. 메모와 해시태그로 다시 찾음

---

## 1. 입력 채널 — 텔레그램 봇

### 동작 원칙
**봇은 저장 전용이다.** 봇에 보내는 모든 메시지는 저장 의도로 간주한다.
- URL이 포함된 메시지 → 전체 텍스트를 메모로 저장하고 URL을 추출
- URL이 없는 메시지 → 봇이 "URL을 찾지 못했어요" 응답, 저장 안 함
- 텍스트 없는 메시지(이미지만) → 봇이 "텍스트 메시지만 처리합니다" 응답, skip

### 폴링 방식
서버 프로세스 안에서 싱글톤 폴링 워커가 Telegram Bot API의 `getUpdates`를 long polling으로 호출한다.
- `getUpdates?offset={lastUpdateId+1}&timeout=30`
- Telegram이 새 메시지가 있을 때까지 최대 30초간 연결 유지 → 사실상 실시간
- 응답 처리 후 즉시 다음 호출
- **공개 URL/webhook 불필요** → 현재 PM2 로컬 운영 환경 그대로 동작

### 워커 시작 방법
Next.js 16의 부팅 훅에서 워커를 시작한다.
- 우선 `instrumentation.ts` 같은 표준 훅을 시도하되, AGENTS.md 지침에 따라 구현 단계 전에 `node_modules/next/dist/docs/`에서 정확한 부팅 훅 문서를 먼저 확인할 것
- 만약 instrumentation 훅이 다르거나 사용 불가하면, fallback으로 첫 API 요청 시 lazy 초기화

### 싱글톤 보장
- 모듈 스코프 변수 + `globalThis.__linkPoller` 패턴
- 개발 모드 HMR 재로드 시 중복 시작 방지

### 권한 (Authorization)
폴링 워커는 본인 텔레그램 계정에서 온 메시지만 처리한다. 다른 사람이 봇을 알아내도 무시된다.

```bash
# .env.local
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_ALLOWED_CHAT_ID=123456789
LINK_POLLER_ENABLED=true
LINK_POLLER_TIMEOUT_SEC=30
```

- 두 필수 변수가 없으면 워커는 시작 자체를 안 하고 콘솔에 경고. 다른 v-todo 기능에는 영향 없음.
- 임시 디버깅: `LINK_POLLER_DEBUG=true`를 켜면 첫 메시지의 chat_id를 로그에 출력해 본인 chat_id 확인 가능

### 메시지 처리 파이프라인
```
1. getUpdates 응답 수신
2. for each update:
   2a. message.chat.id 검증 → 본인이 아니면 skip
   2b. message.text 비어있음 → "텍스트 메시지만 처리합니다" 응답, skip
   2c. lib/url-extract.ts로 URL 추출
   2d. URL 0개 → "URL을 찾지 못했어요" 응답, skip (저장 안 함)
   2e. telegramMessageId로 중복 체크 → 이미 있으면 skip
   2f. Link 객체 생성 (memo = message.text 원본, urls, primaryDomain, read=false)
   2g. linkStore.add(link)
   2h. "✅ 저장됨" 응답
3. 마지막 update_id를 lastUpdateId로 저장 (다음 polling offset)
```

### URL 추출 (`lib/url-extract.ts`)
- Telegram 메시지의 `entities` 배열을 우선 사용 (`type === "url"` 항목)
- entities가 없으면 정규식 fallback (`https?://[^\s]+`)
- 추출된 URL은 trailing 구두점 제거 (`,`, `.`, `)`, `]` 등)
- 같은 메시지 내 중복 URL 제거 (순서 보존)

### 에러 처리 & 회복력

| 케이스 | 동작 |
|---|---|
| 봇 토큰 없음 | 워커 시작 안 함, 콘솔 경고. v-todo는 정상 동작 |
| 봇 토큰 잘못됨 (401) | 워커 정지, 에러 로그. 자동 재시작 안 함 |
| 네트워크 일시 장애 | 지수 백오프 (2s → 4s → 8s → … → 최대 60s) 후 재시도 |
| 다른 사람이 봇에 메시지 | chat_id 검증 실패, 무응답 + skip |
| URL 없는 메시지 | "URL을 찾지 못했어요" 응답, 저장 안 함 |
| 같은 message_id 재처리 | dedupe → skip (중복 저장 방지) |
| 디스크 쓰기 실패 | 해당 update만 skip + 로그. lastUpdateId는 안 올림 → 다음 폴링에서 재시도 |
| 텍스트 없는 메시지 | "텍스트 메시지만 처리합니다" 응답, skip |
| 봇 응답 실패 | 저장은 이미 성공했으므로 로그만 |

---

## 2. 데이터 모델

### 타입 추가 (`types/index.ts`)

```typescript
export interface Link {
  id: string;
  // 메시지 원본 텍스트 (메모) — URL 포함, 그대로 보존
  memo: string;
  // 추출된 URL 목록. 첫 번째가 대표 URL
  urls: string[];
  // 첫 URL의 도메인 (예: "x.com", "react.dev"). 카드 라벨용. 저장 시점에 미리 계산해 캐싱
  primaryDomain: string;
  // 읽음 상태 (단순 2단계)
  read: boolean;
  // 출처 — 향후 확장용 슬롯, 현재는 항상 "telegram"
  source: "telegram" | "manual";
  // 텔레그램 메시지 ID — 중복 저장 방지용 (idempotency)
  telegramMessageId?: number;
  // 시간 정보 — KST 기준 ISO 문자열 (CLAUDE.md 지침대로 getFullYear/getMonth/getDate 사용)
  createdAt: string;
  readAt?: string;
}

export interface LinkStore {
  links: Link[];
  // 폴링 워커가 마지막으로 처리한 Telegram update_id
  // 다음 getUpdates 호출 시 offset으로 사용
  lastUpdateId?: number;
}
```

### 데이터 저장
- `data/links.json` — `{ links: Link[], lastUpdateId?: number }`
- 기존 store 패턴 (atomic write: temp 파일 → rename)

### 모델 설계 결정 사항
- **`urls: string[]`** — 한 메시지 = 한 항목, 여러 URL은 배열로. 메모 중복 없이 맥락 보존.
- **`primaryDomain` 캐싱** — 매 렌더링마다 URL 파싱하지 않도록 저장 시점에 미리 계산
- **이중 idempotency** — `lastUpdateId` (offset 추적) + `telegramMessageId` (만에 하나 중복 처리 시 dedupe). 폴링은 같은 update를 두 번 받을 수 있어 두 단계 안전장치를 둠.
- **`source` 슬롯** — 향후 수동 추가/다른 입력 채널 확장 시 깨지지 않도록 한 줄짜리 enum 슬롯만 미리 만들어둠
- **해시태그 별도 필드 없음** — 메모 본문에 `#태그`가 그대로 포함됨. 렌더링 시 기존 `lib/tags.ts`의 `extractTags` / `splitParts`를 호출해 칩으로 표시. 이래야 v-todo의 cross-section 태그 뷰가 다른 섹션과 동일한 방식으로 자동 동작 (Todo, Wish, Schedule이 이미 이 방식).

---

## 3. API 라우트

`app/api/links/route.ts` — v-todo의 다른 라우트와 동일한 패턴.

| 메소드 | 경로 | 동작 |
|---|---|---|
| `GET` | `/api/links` | 전체 링크 반환 (createdAt 내림차순 정렬) |
| `PATCH` | `/api/links?id={id}` | 읽음 상태 토글 (`{ read: boolean }` 바디) |
| `DELETE` | `/api/links?id={id}` | 항목 삭제 |

- **POST 없음**: 첫 버전에선 텔레그램만이 입력 채널. 수동 추가는 첫 버전 범위에서 제외.
- **PUT/메모 편집 없음**: 인라인 편집도 첫 버전 범위에서 제외. 수정하려면 텔레그램에서 다시 보내고 옛 항목을 삭제.
- 클라이언트 필터링 (읽음/안읽음 탭)은 GET 결과를 메모리에서 분리. 데이터가 작아서 충분.

---

## 4. UI 컴포넌트

### 위치
하단 네비게이션(또는 데스크톱 사이드바)에 **"링크"** 메인 메뉴 추가.
- 위치: 노트와 위시 사이 (사용 빈도 고려, Thumb Zone)
- 아이콘: SF Symbols 호환 `link` 또는 `bookmark`, Catppuccin 색상 변수 사용

### LinkSection 컴포넌트
- 상단: 두 개의 서브탭 — **"읽지 않음"** (기본) / **"읽음"**
- 탭에 카운트 배지: `읽지 않음 (3)` 처럼 처리할 게 얼마나 남았는지 한눈에
- 본문: 카드 리스트 (세로 스크롤)

### LinkCard 컴포넌트

```
┌──────────────────────────────────────┐
│ 메모 본문이 여기에 옴.                │  ← Body 20px (Pretendard)
│ 두세 줄까지 표시 후 ellipsis.         │
│                                       │
│ #react #frontend                     │  ← 해시태그 칩 (기존 스타일)
│                                       │
│ 🌐 react.dev · 4시간 전              │  ← Footnote 15px, 회색
│                          [⋯]          │  ← 액션 메뉴
└──────────────────────────────────────┘
```

- **메모 영역**:
  - 본문 텍스트를 그대로 표시. URL 부분과 해시태그는 색상 강조 (기존 `lib/tags.ts` 활용)
  - 해시태그는 본문 아래 칩으로도 별도 노출
  - 너무 길면 3줄에서 ellipsis. 펼침 동작은 첫 버전에선 없음 (전체 메모를 보려면 long-press 액션 메뉴에 표시)
- **도메인 라벨**: 첫 URL의 도메인 + 추가 URL이 있으면 `+2` 같은 표시
- **시간**: 상대 시간 (`방금`, `4시간 전`, `어제`, `3일 전`, 그 이후엔 날짜)

### 인터랙션
- **카드 전체 탭** → 첫 URL을 새 탭으로 열기 (가장 흔한 액션을 가장 짧은 동선으로)
- **우측 ⋯ 버튼 탭** → 액션 메뉴 (하단 시트)
- **카드 길게 누르기 / 더블클릭** (v-todo 기존 패턴) → 동일한 액션 메뉴

### 액션 메뉴 (하단 시트)
메뉴 상단에 메모 전체 텍스트를 표시 (ellipsis 없이). 그 아래 액션 버튼:

1. **🔗 열기** — 첫 URL을 새 탭으로 열기
2. **🔗 다른 링크 열기** (URL이 2개 이상일 때만) — 추가 URL 각각을 별도 메뉴 아이템으로 펼침. 각 항목 탭 시 해당 URL 새 탭으로 열기
3. **📤 공유** — `navigator.share({ text: memo, url: urls[0] })`. 데스크톱에선 클립보드 복사 + 토스트
4. **✓ 읽음으로** (또는 ↩ 안 읽음으로) — 상태 토글
5. **🗑 삭제** — undo 토스트 (v-todo 기존 패턴 재사용)

### 빈 상태 (Empty State)
- **읽지 않음이 0개**일 때:
  > "📬 모두 읽었어요!  
  > 새 링크는 텔레그램 봇으로 보내주세요."
- **전체가 0개** (첫 사용)일 때:
  > "🔗 텔레그램에서 봇으로 링크를 보내면 여기에 모입니다."

### 다크/라이트 테마
- 기존 Catppuccin 시스템 (Latte/Mocha) 자동 적용
- 카드 배경: `var(--sys-bg-secondary)`
- 도메인 라벨: `var(--sys-label-secondary)`

### 폰트 사이즈 (CLAUDE.md 지침)
- 메모 본문: Body 20px (Pretendard)
- 해시태그 칩: Subheadline 17px
- 도메인/시간 메타: Footnote 15px

---

## 5. 공유 동작 (Web Share API)

### 동작
액션 메뉴의 "공유" 선택 시:
```typescript
if (navigator.share) {
  await navigator.share({
    text: link.memo,           // 원본 메모 (해시태그 포함)
    url: link.urls[0],         // 대표 URL
  });
} else {
  // 데스크톱 폴백: 클립보드 복사
  await navigator.clipboard.writeText(`${link.memo}\n${link.urls[0]}`);
  showToast("클립보드에 복사됨");
}
```

### 결정 사항
- **공유 내용 = URL + 메모** (Q10 B안). 메모 보존의 취지와 일관됨. 받는 사람이 메모가 불필요하면 공유 시트에서 직접 지울 수 있음.
- **여러 URL이어도 첫 URL만 공유** (단순화). 메모 본문에 다른 URL들이 텍스트로 포함되어 있으므로 정보 손실 없음.

---

## 6. 컴포넌트 구조 정리

### 새 컴포넌트
- `components/LinkSection.tsx` — 링크 메인 뷰 (탭 + 리스트)
- `components/LinkCard.tsx` — 개별 링크 카드 + 액션 메뉴

### 새 라이브러리
- `lib/link-store.ts` — 링크 데이터 atomic read/write + lastUpdateId 관리
- `lib/telegram-poller.ts` — 폴링 워커 (싱글톤)
- `lib/url-extract.ts` — 메시지 텍스트 + entities에서 URL 추출 유틸

### 새 API 라우트
- `app/api/links/route.ts` — GET / PATCH / DELETE

### 변경
- `types/index.ts` — `Link`, `LinkStore` 타입 추가
- 메인 네비게이션 컴포넌트 — "링크" 탭 추가
- `app/page.tsx` — 라우팅에 LinkSection 연결
- `instrumentation.ts` (또는 동등 부팅 훅) — 폴링 워커 시작

### 새 데이터 파일
- `data/links.json` — 초기값 `{ "links": [] }`

---

## 7. 봇 설정 가이드

CLAUDE.md (또는 README)에 다음 절차를 추가한다:

1. Telegram에서 `@BotFather`에 `/newbot` → 봇 이름 정하고 토큰 발급
2. 본인 텔레그램 봇 (`@userinfobot`)으로 본인 chat_id 확인  
   (또는 임시로 `LINK_POLLER_DEBUG=true`로 봇에 첫 메시지 보내고 로그 확인)
3. `.env.local`에 `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_ID` 추가
4. CLAUDE.md의 배포 절차대로 `pm2 stop v-todo && rm -rf .next && npx next build && pm2 start v-todo && pm2 save`
5. 만든 봇에 아무 URL 메시지 보내기 → "✅ 저장됨" 응답 확인

---

## 8. 테스트 전략

기존 `lib/__tests__/` 패턴 (Vitest)을 따른다.

### 유닛 테스트
- **`lib/url-extract.test.ts`**
  - entities로부터 URL 추출
  - entities 없을 때 정규식 fallback
  - trailing 구두점 제거 (`.`, `,`, `)`, `]`)
  - 중복 URL 제거 (순서 보존)
  - URL 0개 케이스
- **`lib/link-store.test.ts`**
  - add / list / patch / delete
  - lastUpdateId 저장/조회
  - telegramMessageId 중복 체크
  - atomic write (temp 파일 → rename)
- **`lib/telegram-poller.test.ts`**
  - chat_id 검증 로직
  - getUpdates 응답 처리 (mock fetch)
  - 에러 시 백오프 (fake timers)
  - 토큰 누락 시 비활성화

### 수동 QA
- 봇 설정 후 실제로 URL 보내서 다음 흐름 확인:
  - 저장 → 카드 표시 → 읽음 처리 → 삭제 → 공유

### 통합 테스트
- 실제 Telegram API 호출 통합 테스트는 안 함. mock으로 충분. v-todo의 다른 스토어도 같은 정책.

---

## 9. 명시적 비범위 (첫 버전에서 제외)

다음은 의도적으로 첫 버전에서 빼고, 실제 사용 후 필요해지면 추가한다:

- **앱 내 수동 추가 버튼** — 텔레그램이 주 입력 경로. 데스크톱에서 직접 추가하고 싶을 때만 필요.
- **메모 인라인 편집** — 수정은 텔레그램에서 다시 보내고 옛 항목 삭제하는 흐름.
- **자유 텍스트 검색** — 데이터가 쌓이기 전엔 해시태그 필터로 충분.
- **도메인 필터** — 데이터가 쌓이기 전엔 의미 없음.
- **별도 태그 필터링 화면** — v-todo의 cross-section 태그 뷰로 이미 커버.
- **메타데이터 자동 수집 (OG 태그, 썸네일)** — 첫 버전은 메모 + URL만. X 우회나 외부 서비스 의존 없음.
- **이미지/PDF 첨부** — 텍스트 메시지만 처리.
- **여러 사용자 지원** — 본인 chat_id로 잠금. 단일 사용자용.

---

## 10. 설계 요약 표

| 항목 | 결정 |
|---|---|
| 입력 채널 | 텔레그램 봇 (long polling, 공개 URL 불필요) |
| 봇 동작 | "보내면 저장됨" 단순 모델. URL 추출 + 메모 보존 |
| 위치 | 새 메인 섹션 — 네비게이션에 "링크" 탭 |
| 상태 모델 | 2단계 (읽지 않음 / 읽음), 자동 만료 없음 |
| 메타데이터 | 수집 안 함. URL + 메모만 |
| 카드 디자인 | 메모 우선 + 도메인 라벨 + 해시태그 칩 |
| 다중 URL | 한 메시지 = 한 항목, `urls: string[]` |
| MLP 액션 | 열기 / 공유 (Web Share API) / 읽음 토글 / 삭제 |
| 해시태그 | 메모 본문에 그대로, 기존 cross-section 시스템 자동 통합 |
| 데이터 저장 | `data/links.json` (atomic write) |
| 인증 | `TELEGRAM_ALLOWED_CHAT_ID`로 본인 chat_id 잠금 |
