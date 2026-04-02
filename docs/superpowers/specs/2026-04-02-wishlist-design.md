# 위시리스트 기능 설계

## 개요

v-todo에 위시리스트 기능을 추가한다. 사고 싶은 물건과 하고 싶은 경험을 카드형 UI로 관리할 수 있다. 시간 감쇠(자동 스테이지 이동)는 적용하지 않으며, 사용자가 직접 완료/삭제로 관리한다.

## 데이터 모델

```typescript
interface WishItem {
  id: string                        // UUID v4
  title: string                     // 제목 (1-200자, 필수)
  category: "item" | "experience"   // 물건 / 경험
  price: number | null              // 예상 가격 (원, 선택)
  url: string | null                // 관련 링크 (선택)
  imageUrl: string | null           // 이미지 URL (선택)
  memo: string | null               // 메모 (선택)
  completed: boolean                // 달성/구매 여부
  completedAt: string | null        // 완료 시각 (ISO 8601)
  createdAt: string                 // 생성 시각 (ISO 8601)
}
```

## 저장소

- **파일:** `/data/wishes.json`
- **패턴:** 기존 `store.ts`, `schedule-store.ts`와 동일한 atomic write (임시 파일 → rename)
- **구현:** `lib/wish-store.ts`

## API 엔드포인트

- `GET /api/wishes` — 전체 위시 목록 조회
- `POST /api/wishes` — 위시 추가
- `PUT /api/wishes/[id]` — 위시 수정 (완료 토글 포함)
- `DELETE /api/wishes/[id]` — 위시 삭제

요청/응답 형식은 기존 `/api/todos`, `/api/schedules`와 동일한 패턴을 따른다.

## UI 구조

### 네비게이션

메인 탭 순서를 변경한다:

**기존:** 할일 / 디데이 / 노트
**변경:** 할일 / 노트 / 위시리스트 / 디데이

사이드바(데스크톱)와 하단 네비게이션(모바일) 모두 반영한다.

### 위시리스트 뷰

- **내부 탭:** 물건 / 경험 (SectionTabs 컴포넌트 재활용)
- **카드 레이아웃:** 세로 스크롤 리스트
  - 이미지가 있으면 좌측에 썸네일 표시
  - 이미지가 없으면 카테고리 아이콘으로 대체 (물건: 쇼핑백, 경험: 별)
  - 카드 내용: 제목 + 가격(있으면, 원화 포맷) + 메모 미리보기(1줄)
- **완료된 아이템:** 리스트 하단에 흐리게(opacity) 표시
- **추가 버튼:** 하단 플로팅 + 버튼 → AddWishSheet 열기

### 추가/수정 시트 (AddWishSheet)

기존 AddScheduleSheet와 동일한 바텀 시트 패턴. 입력 필드:

1. **제목** (필수, 텍스트)
2. **카테고리** (물건/경험, 세그먼트 컨트롤)
3. **예상 가격** (선택, 숫자 입력, 원화)
4. **링크** (선택, URL 입력)
5. **이미지 URL** (선택, URL 입력)
6. **메모** (선택, 여러 줄 텍스트)

## 컴포넌트 목록

- `components/WishlistView.tsx` — 물건/경험 탭 + 위시 카드 목록 + 추가 버튼
- `components/WishItem.tsx` — 개별 카드 컴포넌트 (완료 체크, 스와이프 삭제)
- `components/AddWishSheet.tsx` — 위시 추가/수정 바텀 시트

## 타입 정의

`types/index.ts`에 `WishItem` 인터페이스를 추가한다.

## 기존 코드 변경사항

- `app/page.tsx` — 탭 순서 변경, 위시리스트 뷰 연결
- `components/BottomNav.tsx` — 탭 순서 및 아이콘 변경
- `types/index.ts` — WishItem 타입 추가

## 범위 외 (향후 고려)

- 이미지 직접 업로드 (현재는 URL만 지원)
- 가격 추적 / 알림
- AI 브리핑에 위시리스트 통합
- 위시 → 투두 전환
