# 위시 완료 경험 개선

## 개요

위시 완료("달성/구입")와 삭제를 명확히 구분하고, 완료 시 성취감을 주는 피드백과 기록 기능을 추가한다.

## 1. 데이터 모델 확장

`WishItem` 인터페이스에 완료 정보 필드 추가:

```typescript
// 기존 필드 유지 + 추가
actualPrice: number | null;      // 실제 구매/소요 가격
satisfaction: number | null;     // 만족도 1~5
review: string | null;           // 한줄 후기
```

- `completedAt`은 기존 필드를 활용하되, 사용자가 수정 가능하도록 UI에서 노출
- `UpdateWishRequest`에도 `actualPrice`, `satisfaction`, `review` 추가

## 2. 완료 플로우

### 트리거

WishItem 카드의 완료 토글 버튼(동그라미) 클릭 시:
- 미완료 → 완료: **CompletionSheet** 바텀시트 오픈
- 완료 → 미완료: 즉시 토글 (완료 정보 초기화)

### CompletionSheet 구성

새 컴포넌트 `components/WishCompletionSheet.tsx`:

**상단 축하 영역:**
- 체크 아이콘 (큰 원형, accent-primary 배경 + 흰색 체크)
- 카테고리별 축하 메시지:
  - 물건(item): "드디어 손에 넣었네요!"
  - 경험(experience): "멋진 경험이었죠!"

**입력 필드:**
1. **완료일** — date input, 기본값 오늘(KST 기준 `getFullYear/getMonth/getDate`)
2. **실제 가격** — 숫자 입력 + "원" 접미사 (기존 가격 입력과 동일 패턴)
3. **만족도** — 별 5개 탭 선택 (1~5, 기본 미선택)
4. **한줄 후기** — 텍스트 입력, placeholder "어떠셨나요?"

**하단 버튼:**
- "완료" 버튼 — 필수 입력 없음, 모두 선택사항. 누르면 completed=true + 입력 정보 저장
- 배경 탭 또는 취소 → 시트 닫힘, 완료 처리 안 됨

### 축하 피드백

CompletionSheet가 열릴 때 컨페티(폭죽) 애니메이션 재생:
- CSS 기반 파티클 애니메이션 (외부 라이브러리 없이 구현)
- 약 1.5초간 재생 후 자동 소멸
- 시트 상단 축하 영역 위에서 터짐

## 3. 완료 카드 보강

### 현재 문제
- 50% opacity로 흐릿하게만 표시
- 완료 정보 표시 없음

### 개선

완료된 WishItem 카드:
- opacity 50% 제거
- 이미지 영역: 기존 완료 오버레이 유지 (체크 아이콘)
- **완료일 뱃지**: 카드 우상단에 작은 뱃지 "4/5 달성" 형태
- **만족도**: 가격 옆에 별 아이콘 + 점수 표시 (예: ★ 4)
- **한줄 후기**: memo 대신 review 표시 (review가 있으면 우선, 없으면 memo)
- **실제 가격**: 기존 price 대신 actualPrice 표시. 둘 다 있으면 "~~50,000원~~ → 45,000원" 비교 형태

### 완료 카드 편집

완료된 카드 탭 → AddWishSheet(기존 편집 시트) 열림:
- 완료 정보(실제 가격, 만족도, 후기) 편집 가능
- "완료 취소" 버튼 추가 (삭제 버튼 위에, 또는 대체)
- 완료 취소 시 completedAt, actualPrice, satisfaction, review 모두 null로 초기화

## 4. API 변경

### PUT /api/wishes/[id]

기존 `UpdateWishRequest`에 필드 추가:
- `actualPrice?: number | null`
- `satisfaction?: number | null` (1~5 범위 검증)
- `review?: string | null`

완료 토글 시 자동 처리:
- `completed: true` → `completedAt`에 타임스탬프 설정 (기존 로직 유지)
- `completed: false` → `completedAt`, `actualPrice`, `satisfaction`, `review` 모두 null로 초기화

## 5. 변경 대상 파일

1. `types/index.ts` — WishItem, UpdateWishRequest에 필드 추가
2. `app/api/wishes/[id]/route.ts` — PUT 핸들러에 새 필드 처리 + 검증
3. `app/api/wishes/route.ts` — POST 핸들러에 새 필드 기본값(null) 설정
4. `components/WishCompletionSheet.tsx` — **신규** 완료 시트 컴포넌트
5. `components/WishItem.tsx` — 완료 카드 디자인 보강
6. `components/AddWishSheet.tsx` — 완료 정보 편집 + 완료 취소 기능
7. `app/page.tsx` — toggleWish 로직 변경 (시트 오픈), 완료 시트 state 관리
8. `lib/__tests__/api-wishes.test.ts` — 새 필드 테스트 추가
