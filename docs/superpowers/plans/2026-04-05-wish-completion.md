# 위시 완료 경험 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 위시 완료 시 축하 피드백 + 완료 정보 기록 + 완료 카드 보강을 통해 "삭제"와 "달성"의 경험을 명확히 구분한다.

**Architecture:** 데이터 모델에 `actualPrice`, `satisfaction`, `review` 3개 필드 추가. 완료 토글 시 `WishCompletionSheet` 바텀시트를 열어 축하 피드백(컨페티 + 메시지)과 완료 정보 입력을 동시에 제공. 완료 카드는 opacity 제거 후 달성일 뱃지, 만족도, 후기를 표시.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, vitest

---

### Task 1: 데이터 모델 확장 (types + API)

**Files:**
- Modify: `types/index.ts:109-145`
- Modify: `app/api/wishes/route.ts:30-41`
- Modify: `app/api/wishes/[id]/route.ts:39-58`

- [ ] **Step 1: WishItem 인터페이스에 필드 추가**

`types/index.ts`의 `WishItem` 인터페이스에 3개 필드 추가:

```typescript
export interface WishItem {
  id: string;
  title: string;
  category: WishCategory;
  price: number | null;
  url: string | null;
  imageUrl: string | null;
  memo: string | null;
  completed: boolean;
  completedAt: string | null;
  actualPrice: number | null;      // 추가
  satisfaction: number | null;     // 추가 (1~5)
  review: string | null;           // 추가
  createdAt: string;
}
```

`UpdateWishRequest`에도 추가:

```typescript
export interface UpdateWishRequest {
  title?: string;
  category?: WishCategory;
  price?: number | null;
  url?: string | null;
  imageUrl?: string | null;
  memo?: string | null;
  completed?: boolean;
  completedAt?: string | null;     // 추가: 사용자가 완료일 수정 가능
  actualPrice?: number | null;     // 추가
  satisfaction?: number | null;    // 추가
  review?: string | null;          // 추가
}
```

- [ ] **Step 2: POST 핸들러에 기본값 추가**

`app/api/wishes/route.ts`의 wish 객체 생성 부분(line 30~41)에 새 필드 기본값 추가:

```typescript
    const wish: WishItem = {
      id: uuidv4(),
      title: body.title.trim(),
      category: body.category,
      price: body.price ?? null,
      url: body.url ?? null,
      imageUrl: body.imageUrl ?? null,
      memo: body.memo ?? null,
      completed: false,
      completedAt: null,
      actualPrice: null,
      satisfaction: null,
      review: null,
      createdAt: new Date().toISOString(),
    };
```

- [ ] **Step 3: PUT 핸들러에 새 필드 처리 + 검증 추가**

`app/api/wishes/[id]/route.ts`의 PUT 함수에서, 기존 `body.memo` 처리 블록 아래에 추가:

```typescript
    if (body.actualPrice !== undefined) {
      wishes[index].actualPrice = body.actualPrice;
    }

    if (body.satisfaction !== undefined) {
      if (body.satisfaction !== null && (body.satisfaction < 1 || body.satisfaction > 5)) {
        return NextResponse.json({ error: "만족도는 1~5 사이여야 합니다." }, { status: 400 });
      }
      wishes[index].satisfaction = body.satisfaction;
    }

    if (body.review !== undefined) {
      wishes[index].review = body.review;
    }

    if (body.completedAt !== undefined) {
      wishes[index].completedAt = body.completedAt;
    }
```

그리고 기존 `completed` 처리 블록(line 55~58)을 수정 — 완료 취소 시 완료 정보 초기화:

```typescript
    if (body.completed !== undefined) {
      wishes[index].completed = body.completed;
      if (body.completed) {
        wishes[index].completedAt = body.completedAt ?? new Date().toISOString();
      } else {
        wishes[index].completedAt = null;
        wishes[index].actualPrice = null;
        wishes[index].satisfaction = null;
        wishes[index].review = null;
      }
    }
```

- [ ] **Step 4: 기존 테스트 실행하여 깨지지 않는지 확인**

Run: `npx vitest run lib/__tests__/api-wishes.test.ts`
Expected: 기존 테스트 모두 PASS. POST로 생성한 wish에 `actualPrice`, `satisfaction`, `review`가 null로 포함됨.

- [ ] **Step 5: 새 필드 테스트 추가**

`lib/__tests__/api-wishes.test.ts`의 `PUT /api/wishes/[id]` describe 블록에 테스트 추가:

```typescript
  it("saves completion info with completed toggle", async () => {
    const req = new Request("http://localhost/api/wishes/wish-test-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completed: true,
        actualPrice: 45000,
        satisfaction: 4,
        review: "좋았어요!",
        completedAt: "2026-04-05T00:00:00+09:00",
      }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "wish-test-1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.completed).toBe(true);
    expect(body.data.actualPrice).toBe(45000);
    expect(body.data.satisfaction).toBe(4);
    expect(body.data.review).toBe("좋았어요!");
    expect(body.data.completedAt).toBe("2026-04-05T00:00:00+09:00");
  });

  it("clears completion info when uncompleting", async () => {
    // First complete
    const completeReq = new Request("http://localhost/api/wishes/wish-test-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completed: true,
        actualPrice: 45000,
        satisfaction: 4,
        review: "좋았어요!",
      }),
    });
    await PUT(completeReq, { params: Promise.resolve({ id: "wish-test-1" }) });

    // Then uncomplete
    const uncompleteReq = new Request("http://localhost/api/wishes/wish-test-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: false }),
    });
    const res = await PUT(uncompleteReq, { params: Promise.resolve({ id: "wish-test-1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.completed).toBe(false);
    expect(body.data.completedAt).toBeNull();
    expect(body.data.actualPrice).toBeNull();
    expect(body.data.satisfaction).toBeNull();
    expect(body.data.review).toBeNull();
  });

  it("rejects invalid satisfaction value", async () => {
    const req = new Request("http://localhost/api/wishes/wish-test-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ satisfaction: 6 }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "wish-test-1" }) });
    expect(res.status).toBe(400);
  });
```

기존 `beforeEach`의 테스트 데이터에도 새 필드 추가:

```typescript
    await fs.writeFile(
      WISH_PATH,
      JSON.stringify({
        wishes: [
          {
            id: "wish-test-1",
            title: "원래 제목",
            category: "item",
            price: null,
            url: null,
            imageUrl: null,
            memo: null,
            completed: false,
            completedAt: null,
            actualPrice: null,
            satisfaction: null,
            review: null,
            createdAt: "2026-04-02T00:00:00Z",
          },
        ],
      })
    );
```

POST 테스트에서도 새 필드 null 검증 추가 (`POST /api/wishes` describe의 첫 번째 it에):

```typescript
    expect(body.data.actualPrice).toBeNull();
    expect(body.data.satisfaction).toBeNull();
    expect(body.data.review).toBeNull();
```

- [ ] **Step 6: 테스트 실행**

Run: `npx vitest run lib/__tests__/api-wishes.test.ts`
Expected: 모든 테스트 PASS

- [ ] **Step 7: 커밋**

```bash
git add types/index.ts app/api/wishes/route.ts app/api/wishes/[id]/route.ts lib/__tests__/api-wishes.test.ts
git commit -m "feat(wish): add completion info fields (actualPrice, satisfaction, review)"
```

---

### Task 2: 컨페티 애니메이션 키프레임

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: 컨페티 키프레임 추가**

`app/globals.css`의 Keyframes 섹션(`@keyframes breathe` 블록 아래)에 추가:

```css
@keyframes confettiFall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(120px) rotate(720deg);
    opacity: 0;
  }
}

@keyframes confettiPop {
  0% {
    transform: scale(0) translateY(0);
  }
  50% {
    transform: scale(1.2) translateY(-20px);
  }
  100% {
    transform: scale(1) translateY(-10px);
  }
}

@keyframes celebrationCheck {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.3);
    opacity: 1;
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/globals.css
git commit -m "feat(wish): add confetti and celebration keyframes"
```

---

### Task 3: WishCompletionSheet 컴포넌트

**Files:**
- Create: `components/WishCompletionSheet.tsx`

- [ ] **Step 1: WishCompletionSheet 컴포넌트 작성**

```tsx
"use client";

import { useState, useEffect } from "react";
import type { WishItem, WishCategory } from "@/types";

interface WishCompletionSheetProps {
  wish: WishItem;
  onComplete: (data: {
    actualPrice: number | null;
    satisfaction: number | null;
    review: string | null;
    completedAt: string;
  }) => void;
  onClose: () => void;
}

function getTodayKST(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ConfettiParticles() {
  const colors = [
    "var(--accent-primary)",
    "var(--sys-orange)",
    "#FFD700",
    "#FF6B8A",
    "#7B68EE",
    "#50E3C2",
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-sm"
          style={{
            width: `${6 + Math.random() * 6}px`,
            height: `${6 + Math.random() * 6}px`,
            backgroundColor: colors[i % colors.length],
            left: `${8 + Math.random() * 84}%`,
            top: `${-10 + Math.random() * 30}%`,
            animation: `confettiFall ${1.2 + Math.random() * 0.8}s ease-in ${Math.random() * 0.3}s forwards`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

export default function WishCompletionSheet({
  wish,
  onComplete,
  onClose,
}: WishCompletionSheetProps) {
  const [dateInput, setDateInput] = useState(getTodayKST());
  const [priceInput, setPriceInput] = useState(
    wish.price != null ? String(wish.price) : ""
  );
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  const handleComplete = () => {
    const priceNum = priceInput.length > 0 ? parseInt(priceInput, 10) : null;
    onComplete({
      actualPrice: isNaN(priceNum as number) ? null : priceNum,
      satisfaction,
      review: review.trim() || null,
      completedAt: `${dateInput}T00:00:00+09:00`,
    });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setPriceInput(digits);
  };

  const congratsMessage =
    wish.category === "item"
      ? "드디어 손에 넣었네요!"
      : "멋진 경험이었죠!";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl p-6 animate-[sheetUp_0.3s_ease-out] max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-[var(--fill-tertiary)] rounded-full mx-auto mb-6" />

        {/* Confetti */}
        {showConfetti && <ConfettiParticles />}

        {/* Celebration header */}
        <div className="flex flex-col items-center mb-8 relative">
          <div
            className="w-[72px] h-[72px] rounded-full bg-[var(--accent-primary)] flex items-center justify-center mb-4"
            style={{ animation: "celebrationCheck 0.6s cubic-bezier(0.32, 0.72, 0, 1) forwards" }}
          >
            <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
              <path
                d="M2 12L12 22L30 2"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-[22px] font-bold text-[var(--label-primary)]">
            위시 달성!
          </h2>
          <p className="text-[17px] text-[var(--label-secondary)] mt-1">
            {congratsMessage}
          </p>
        </div>

        {/* Completion date */}
        <div className="mb-4">
          <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            완료일
          </label>
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] outline-none"
          />
        </div>

        {/* Actual price */}
        <div className="mb-4">
          <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            실제 가격
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={priceInput}
              onChange={handlePriceChange}
              placeholder="0"
              className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[20px] text-[var(--label-tertiary)] pointer-events-none">
              원
            </span>
          </div>
        </div>

        {/* Satisfaction */}
        <div className="mb-4">
          <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            만족도
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className="flex-1 py-3 rounded-xl text-[24px] transition-colors"
                style={{
                  backgroundColor:
                    satisfaction != null && star <= satisfaction
                      ? "var(--accent-primary)"
                      : "var(--fill-quaternary)",
                }}
                onClick={() => setSatisfaction(star === satisfaction ? null : star)}
              >
                <span style={{
                  filter: satisfaction != null && star <= satisfaction
                    ? "brightness(0) invert(1)"
                    : "none",
                }}>
                  ★
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Review */}
        <div className="mb-6">
          <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            한줄 후기
          </label>
          <input
            type="text"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="어떠셨나요?"
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none"
          />
        </div>

        {/* Complete button */}
        <button
          className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold"
          onClick={handleComplete}
        >
          완료
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add components/WishCompletionSheet.tsx
git commit -m "feat(wish): add WishCompletionSheet with confetti celebration"
```

---

### Task 4: page.tsx에 완료 시트 연결

**Files:**
- Modify: `app/page.tsx:33-36` (state 선언부)
- Modify: `app/page.tsx:233-252` (toggleWish 함수)
- Modify: `app/page.tsx:685-693` (모달 렌더링)

- [ ] **Step 1: import 추가**

`app/page.tsx` 상단 import에 추가:

```typescript
import WishCompletionSheet from "@/components/WishCompletionSheet";
```

- [ ] **Step 2: 완료 시트 state 추가**

기존 state 선언부(`editWish` 근처, line 35 뒤)에 추가:

```typescript
  const [completingWish, setCompletingWish] = useState<WishItem | null>(null);
```

- [ ] **Step 3: toggleWish 함수 변경**

기존 `toggleWish` 함수(line 233~252)를 교체:

```typescript
  const toggleWish = async (id: string) => {
    const wish = wishes.find((w) => w.id === id);
    if (!wish) return;

    if (!wish.completed) {
      // 미완료 → 완료: CompletionSheet 열기
      setCompletingWish(wish);
    } else {
      // 완료 → 미완료: 즉시 토글 (완료 정보 초기화)
      setWishes((prev) =>
        prev.map((w) =>
          w.id === id
            ? { ...w, completed: false, completedAt: null, actualPrice: null, satisfaction: null, review: null }
            : w
        )
      );
      try {
        await fetch(`${BASE}/api/wishes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: false }),
        });
      } catch (err) {
        console.error("Failed to toggle wish:", err);
        setWishes((prev) =>
          prev.map((w) => (w.id === id ? wish : w))
        );
      }
    }
  };
```

- [ ] **Step 4: completeWish 핸들러 추가**

`toggleWish` 함수 아래에 새 함수 추가:

```typescript
  const completeWish = async (data: {
    actualPrice: number | null;
    satisfaction: number | null;
    review: string | null;
    completedAt: string;
  }) => {
    if (!completingWish) return;
    const id = completingWish.id;
    setWishes((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, completed: true, completedAt: data.completedAt, actualPrice: data.actualPrice, satisfaction: data.satisfaction, review: data.review }
          : w
      )
    );
    setCompletingWish(null);
    try {
      await fetch(`${BASE}/api/wishes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: true,
          completedAt: data.completedAt,
          actualPrice: data.actualPrice,
          satisfaction: data.satisfaction,
          review: data.review,
        }),
      });
    } catch (err) {
      console.error("Failed to complete wish:", err);
      setWishes((prev) =>
        prev.map((w) => (w.id === id ? completingWish : w))
      );
    }
  };
```

- [ ] **Step 5: WishCompletionSheet 렌더링 추가**

기존 `{showAddWish && <AddWishSheet .../>}` 블록 아래에 추가:

```tsx
      {completingWish && (
        <WishCompletionSheet
          wish={completingWish}
          onComplete={completeWish}
          onClose={() => setCompletingWish(null)}
        />
      )}
```

- [ ] **Step 6: 커밋**

```bash
git add app/page.tsx
git commit -m "feat(wish): wire completion sheet to toggle flow"
```

---

### Task 5: 완료 카드 보강 (WishItem.tsx)

**Files:**
- Modify: `components/WishItem.tsx`

- [ ] **Step 1: 완료 카드 디자인 업데이트**

`components/WishItem.tsx` 전체를 업데이트:

```tsx
"use client";

import type { WishItem as WishItemType } from "@/types";

interface WishItemProps {
  wish: WishItemType;
  onToggle: (id: string) => void;
  onEdit: (wish: WishItemType) => void;
  onDelete: (id: string) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function WishItem({ wish, onToggle, onEdit, onDelete }: WishItemProps) {
  const categoryEmoji = wish.category === "item" ? "🛍️" : "⭐";

  // 완료 카드: 가격 표시 로직
  const renderPrice = () => {
    if (wish.completed && wish.actualPrice != null) {
      if (wish.price != null && wish.price !== wish.actualPrice) {
        return (
          <div className="text-[15px] font-medium mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="line-through text-[var(--label-quaternary)]">
              {wish.price.toLocaleString("ko-KR")}원
            </span>
            <span className="text-[var(--accent-primary)]">
              → {wish.actualPrice.toLocaleString("ko-KR")}원
            </span>
          </div>
        );
      }
      return (
        <div className="text-[15px] text-[var(--accent-primary)] font-medium mt-1">
          {wish.actualPrice.toLocaleString("ko-KR")}원
        </div>
      );
    }
    if (wish.price != null) {
      return (
        <div className="text-[15px] text-[var(--accent-primary)] font-medium mt-1">
          {wish.price.toLocaleString("ko-KR")}원
        </div>
      );
    }
    return null;
  };

  // 완료 카드: 만족도 + 후기 or memo
  const renderMeta = () => {
    if (wish.completed) {
      return (
        <>
          {wish.satisfaction != null && (
            <div className="text-[13px] text-[var(--sys-orange)] mt-0.5 flex items-center gap-0.5">
              <span>★</span>
              <span>{wish.satisfaction}</span>
            </div>
          )}
          {(wish.review || wish.memo) && (
            <div className="text-[13px] text-[var(--label-tertiary)] mt-0.5 truncate">
              {wish.review ?? wish.memo}
            </div>
          )}
        </>
      );
    }
    if (wish.memo) {
      return (
        <div className="text-[13px] text-[var(--label-tertiary)] mt-0.5 truncate">
          {wish.memo}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-[var(--sys-bg-elevated)]">
      {/* Image area */}
      <button
        className="w-full aspect-[4/3] relative"
        onClick={() => onEdit(wish)}
        aria-label="위시 편집"
      >
        {wish.imageUrl ? (
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${wish.imageUrl})` }}
          />
        ) : (
          <div className="w-full h-full bg-[var(--fill-quaternary)] flex items-center justify-center">
            <span className="text-[48px] opacity-40">{categoryEmoji}</span>
          </div>
        )}
        {/* Completed overlay */}
        {wish.completed && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill="var(--accent-primary)" />
              <path d="M12 20L18 26L28 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        {/* Completed date badge */}
        {wish.completed && wish.completedAt && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/50 text-white text-[11px] font-medium">
            {formatDate(wish.completedAt)} 달성
          </div>
        )}
      </button>

      {/* Content */}
      <div className="px-3 pt-2.5 pb-3">
        <button
          className="w-full text-left"
          onClick={() => onEdit(wish)}
        >
          <div className={`text-[17px] leading-[22px] font-semibold text-[var(--label-primary)] line-clamp-2 ${wish.completed ? "line-through" : ""}`}>
            {wish.title}
          </div>
          {renderPrice()}
          {renderMeta()}
        </button>

        {/* Bottom actions */}
        <div className="flex items-center justify-between mt-2">
          <button
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full"
            onClick={() => onToggle(wish.id)}
            aria-label={wish.completed ? "완료 취소" : "완료 표시"}
          >
            <div
              className={`w-[24px] h-[24px] rounded-full flex items-center justify-center transition-colors ${
                wish.completed
                  ? "bg-[var(--accent-primary)]"
                  : "border-2 border-[var(--fill-tertiary)]"
              }`}
            >
              {wish.completed && (
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                  <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </button>
          <button
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full"
            onClick={() => onDelete(wish.id)}
            aria-label="위시 삭제"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1.5 1.5L12.5 12.5M12.5 1.5L1.5 12.5" stroke="var(--label-quaternary)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
```

핵심 변경:
- `opacity-50` 클래스 제거 (완료 카드도 선명하게)
- 완료일 뱃지: 이미지 우상단 "4/5 달성"
- 가격: actualPrice 있으면 비교 표시
- 만족도: 별 아이콘 + 점수
- 후기: review 우선, 없으면 memo

- [ ] **Step 2: 커밋**

```bash
git add components/WishItem.tsx
git commit -m "feat(wish): enhance completed card with date badge, satisfaction, review"
```

---

### Task 6: AddWishSheet에 완료 정보 편집 + 완료 취소

**Files:**
- Modify: `components/AddWishSheet.tsx`

- [ ] **Step 1: AddWishSheet에 완료 정보 편집 UI + 완료 취소 버튼 추가**

`onSave` 콜백의 data 타입에 완료 정보 추가:

```typescript
interface AddWishSheetProps {
  wish?: WishItem | null;
  defaultCategory: WishCategory;
  onSave: (data: {
    title: string;
    category: WishCategory;
    price: number | null;
    url: string | null;
    imageUrl: string | null;
    memo: string | null;
    actualPrice?: number | null;
    satisfaction?: number | null;
    review?: string | null;
    completedAt?: string | null;
  }) => void;
  onDelete?: (id: string) => void;
  onUncomplete?: (id: string) => void;
  onClose: () => void;
}
```

state 추가 (기존 state 아래에):

```typescript
  const [actualPriceInput, setActualPriceInput] = useState(
    wish?.actualPrice != null ? String(wish.actualPrice) : ""
  );
  const [satisfaction, setSatisfaction] = useState<number | null>(wish?.satisfaction ?? null);
  const [reviewInput, setReviewInput] = useState(wish?.review ?? "");
```

`handleSave`에 완료 정보 포함:

```typescript
  const handleSave = () => {
    if (!canSave) return;
    const priceNum = priceInput.length > 0 ? parseInt(priceInput, 10) : null;
    const actualPriceNum = actualPriceInput.length > 0 ? parseInt(actualPriceInput, 10) : null;
    onSave({
      title: title.trim(),
      category,
      price: isNaN(priceNum as number) ? null : priceNum,
      url: url.trim() || null,
      imageUrl: imageUrl.trim() || null,
      memo: memo.trim() || null,
      ...(wish?.completed && {
        actualPrice: isNaN(actualPriceNum as number) ? null : actualPriceNum,
        satisfaction,
        review: reviewInput.trim() || null,
      }),
    });
  };
```

실제 가격 onChange 핸들러:

```typescript
  const handleActualPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setActualPriceInput(digits);
  };
```

메모 필드 아래, 삭제 버튼 위에 조건부 완료 정보 섹션 추가:

```tsx
        {/* Completion info (completed wishes only) */}
        {wish?.completed && (
          <>
            <div className="h-px bg-[var(--separator)] my-4" />
            <div className="text-[15px] font-medium text-[var(--label-secondary)] mb-3">
              완료 정보
            </div>

            {/* Actual price */}
            <div className="mb-4">
              <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
                실제 가격
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={actualPriceInput}
                  onChange={handleActualPriceChange}
                  placeholder="0"
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[20px] text-[var(--label-tertiary)] pointer-events-none">
                  원
                </span>
              </div>
            </div>

            {/* Satisfaction */}
            <div className="mb-4">
              <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
                만족도
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="flex-1 py-3 rounded-xl text-[24px] transition-colors"
                    style={{
                      backgroundColor:
                        satisfaction != null && star <= satisfaction
                          ? "var(--accent-primary)"
                          : "var(--fill-quaternary)",
                    }}
                    onClick={() => setSatisfaction(star === satisfaction ? null : star)}
                  >
                    <span style={{
                      filter: satisfaction != null && star <= satisfaction
                        ? "brightness(0) invert(1)"
                        : "none",
                    }}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Review */}
            <div className="mb-4">
              <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
                한줄 후기
              </label>
              <input
                type="text"
                value={reviewInput}
                onChange={(e) => setReviewInput(e.target.value)}
                placeholder="어떠셨나요?"
                className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none"
              />
            </div>
          </>
        )}

        {/* Uncomplete button (completed wishes) */}
        {wish?.completed && onUncomplete && (
          <button
            className="w-full py-3.5 mt-2 rounded-xl text-[20px] font-medium text-[var(--sys-orange)] bg-[var(--sys-orange)]/10"
            onClick={() => onUncomplete(wish.id)}
          >
            완료 취소
          </button>
        )}
```

- [ ] **Step 2: page.tsx에서 onUncomplete prop 연결**

`app/page.tsx`에서 `AddWishSheet` 렌더링 부분에 `onUncomplete` 추가:

```tsx
      {showAddWish && (
        <AddWishSheet
          wish={editWish}
          defaultCategory={wishTab}
          onSave={saveWish}
          onDelete={editWish ? deleteWish : undefined}
          onUncomplete={editWish?.completed ? (id: string) => {
            toggleWish(id);
            setShowAddWish(false);
            setEditWish(null);
          } : undefined}
          onClose={() => { setShowAddWish(false); setEditWish(null); }}
        />
      )}
```

그리고 `saveWish` 함수의 data 타입에도 완료 정보 필드 추가:

```typescript
  const saveWish = async (data: {
    title: string;
    category: WishCategory;
    price: number | null;
    url: string | null;
    imageUrl: string | null;
    memo: string | null;
    actualPrice?: number | null;
    satisfaction?: number | null;
    review?: string | null;
    completedAt?: string | null;
  }) => {
```

- [ ] **Step 3: 커밋**

```bash
git add components/AddWishSheet.tsx app/page.tsx
git commit -m "feat(wish): add completion info editing and uncomplete button"
```

---

### Task 7: WishlistView 완료 섹션 라벨 개선

**Files:**
- Modify: `components/WishlistView.tsx:76-78`

- [ ] **Step 1: 완료 섹션 헤더 텍스트 변경**

`components/WishlistView.tsx`의 완료 섹션 헤더(line 77)를 변경:

```tsx
          <div className="text-[15px] font-medium text-[var(--label-tertiary)] mb-2 px-1">
            달성 {completed.length}
          </div>
```

"완료"를 "달성"으로 변경하여 성취감 강조.

- [ ] **Step 2: 커밋**

```bash
git add components/WishlistView.tsx
git commit -m "feat(wish): rename completed section label to 달성"
```

---

### Task 8: 빌드 검증 및 기존 데이터 호환

**Files:**
- Modify: `data/wishes.json` (기존 데이터에 새 필드가 없어도 API가 처리할 수 있는지 확인)

- [ ] **Step 1: 전체 테스트 실행**

Run: `npx vitest run lib/__tests__/api-wishes.test.ts`
Expected: 모든 테스트 PASS

- [ ] **Step 2: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공, 타입 에러 없음

- [ ] **Step 3: 기존 데이터 호환 확인**

`data/wishes.json`의 기존 위시에 `actualPrice`, `satisfaction`, `review` 필드가 없어도 문제가 없는지 확인. TypeScript에서 JSON 파싱 결과는 런타임에 해당 필드가 `undefined`가 되지만, UI 코드에서 `wish.actualPrice != null` 으로 체크하므로 안전. 별도 마이그레이션 불필요.

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "chore(wish): verify build and data compatibility"
```
