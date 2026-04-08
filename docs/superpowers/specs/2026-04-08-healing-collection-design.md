# 힐링 컬렉션 + 위시 Masonry 레이아웃

## Overview

우울하거나 기분이 좋지 않을 때 꺼내보는 "힐링 컬렉션" 기능을 위시 섹션의 첫 번째 탭으로 추가한다. 이미지, 글, 링크 세 종류의 아이템을 저장할 수 있다. 동시에 위시 섹션 전체를 Masonry(벽돌 쌓기) 2열 레이아웃으로 전환하여 카드 높이가 내용에 따라 동적으로 결정되도록 한다.

## 위시 섹션 변경사항

- 섹션 이름: "위시리스트" → "위시"
- 하단 네비 라벨: "위시리스트" → "위시"
- 모바일 헤더 타이틀: "위시리스트" → "위시"
- 탭 순서: **힐링 / 물건 / 경험** (기존 "물건 / 경험"에서 확장)

## 힐링 아이템

### 타입

3가지 종류:

**이미지 (`image`)**
- 입력: 파일 업로드 (JPEG, PNG, WebP, GIF)
- 저장: `data/healing/{id}.{ext}` (data 디렉토리 내)
- 카드 표시: 이미지가 카드를 채움, 원본 비율 유지

**글 (`text`)**
- 입력: 텍스트 직접 입력 (여러 줄 가능)
- 카드 표시: 인용문 스타일 — 좌측 세로선 + 텍스트

**링크 (`link`)**
- 입력: URL
- 저장 시 서버에서 URL fetch → `<title>` 태그 추출하여 `linkTitle` 필드에 저장 (1회성)
- 타이틀 추출 실패 시 `linkTitle`은 null
- 카드 표시: 도메인 라벨 + 페이지 타이틀 (타이틀 없으면 URL 텍스트)

### 추가 플로우

1. + 버튼 탭
2. 바텀시트 열림
3. 종류 선택 (이미지 / 글 / 링크)
4. 종류에 따른 입력 필드:
   - 이미지: 파일 선택 버튼
   - 글: 여러 줄 텍스트 입력
   - 링크: URL 입력 필드
5. 저장 버튼

### 삭제

기존 위시 2탭 확인 패턴과 동일.

## Masonry 레이아웃 (전체 위시 탭 공통)

### 구조
- 2열 그리드
- 카드 높이는 내용에 따라 동적
- 빈 공간 없이 짧은 열에 다음 카드 배치 (벽돌 쌓기)
- 열 간 간격: 12px, 카드 간 간격: 12px

### 카드 스타일

**이미지 있는 카드 (힐링 이미지 / 물건·경험에 이미지 있는 경우)**
- 이미지가 카드 상단을 채움 (원본 비율 유지)
- 하단에 텍스트 정보 (있는 경우)

**이미지 없는 카드 (힐링 글·링크 / 물건·경험에 이미지 없는 경우)**
- elevated card 배경 (`--sys-bg-elevated`)
- 제목 + 가격 + 메모 텍스트만 표시

### 적용 범위
- 힐링 탭: 이미지/글/링크 카드 혼합
- 물건 탭: 기존 WishItem 카드를 Masonry로 전환
- 경험 탭: 기존 WishItem 카드를 Masonry로 전환

## 데이터 모델

### WishCategory 확장

```typescript
export type WishCategory = "healing" | "item" | "experience";
```

`VALID_WISH_CATEGORIES`에 `"healing"` 추가.

### WishItem 필드 추가

```typescript
export interface WishItem {
  // ... 기존 필드 유지 ...
  healingType?: "image" | "text" | "link";  // healing 카테고리 전용
  linkTitle?: string;                        // link 타입: 크롤링한 페이지 타이틀
}
```

- `healingType`: `category === "healing"`일 때만 사용
- `linkTitle`: `healingType === "link"`일 때만 사용
- 힐링 이미지는 기존 `imageUrl` 필드에 서빙 URL 저장 (e.g. `/api/wishes/image/{id}.jpg`)
- 힐링 글은 기존 `title` 필드에 텍스트 저장
- 힐링 링크는 기존 `url` 필드에 URL 저장

### WishTab 타입 변경

```typescript
// 기존: wishTab === "item" | "experience"
// 변경: wishTab === "healing" | "item" | "experience"
```

## API

### 기존 API 확장

**POST `/api/wishes`**
- `category: "healing"` + `healingType` 필드 지원
- `healingType === "link"`인 경우: 서버에서 URL fetch → `<title>` 추출 → `linkTitle`에 저장

### 새 API

**POST `/api/wishes/upload`**
- multipart/form-data 형식
- 파일 검증: JPEG, PNG, WebP, GIF만 허용, 최대 10MB
- 파일 저장: `data/healing/{id}.{ext}`
- 응답: `{ data: { imageUrl: "/api/wishes/image/{filename}" } }`

**GET `/api/wishes/image/[filename]`**
- `data/healing/` 디렉토리에서 파일 읽어서 반환
- Content-Type 자동 설정
- 파일 없으면 404

## 컴포넌트 구조

### 새 컴포넌트
- `components/HealingCard.tsx` — 힐링 아이템 카드 (이미지/글/링크 3종)
- `components/HealingAddSheet.tsx` — 힐링 아이템 추가 바텀시트
- `components/MasonryGrid.tsx` — 범용 2열 Masonry 레이아웃 컴포넌트

### 수정 컴포넌트
- `components/WishlistView.tsx` — 탭에 "힐링" 추가, Masonry 레이아웃 적용
- `components/WishItem.tsx` — Masonry 카드 스타일로 변경 (이미지 유무에 따른 동적 높이)

### page.tsx 변경
- 위시 탭 기본값: `"healing"`
- 섹션 이름: "위시"
- 위시 탭 목록: `["healing", "item", "experience"]`
- 스와이프 3탭 지원

## 테스트

- `lib/__tests__/wish-store.test.ts` — healing 카테고리 CRUD
- 이미지 업로드 API 테스트
- 링크 타이틀 크롤링 테스트
