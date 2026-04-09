# 링크 직접 추가 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 링크 탭에서 URL + 메모를 입력해 직접 링크를 추가할 수 있는 바텀 시트 UI 추가

**Architecture:** 기존 바텀 시트 패턴(HealingAddSheet, AddScheduleSheet)을 그대로 따름. POST /api/links 엔드포인트를 추가하고, AddLinkSheet 컴포넌트를 생성하여 page.tsx에서 관리.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS 4, file-based JSON store

---

## File Structure

- Create: `components/AddLinkSheet.tsx` — 링크 추가 바텀 시트 (URL + 메모 입력)
- Modify: `app/api/links/route.ts` — POST 핸들러 추가
- Modify: `components/LinkSection.tsx` — onAdd prop 추가, 하단 추가 버튼 렌더링
- Modify: `app/page.tsx` — showAddLink 상태, addLink 핸들러, AddLinkSheet 렌더링

---

### Task 1: POST /api/links 엔드포인트

**Files:**
- Modify: `app/api/links/route.ts`

- [ ] **Step 1: POST 핸들러 추가**

`route.ts`에 POST 함수를 추가한다. 요청 body에서 `url`(필수)과 `memo`(선택)를 받아 `addLink`로 저장.

```typescript
import { addLink } from "@/lib/link-store";
import { extractUrls } from "@/lib/url-extract";

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<Link>>> {
  try {
    const body = await request.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const memo = typeof body.memo === "string" ? body.memo.trim() : "";

    if (!url) {
      return NextResponse.json({ error: "URL은 필수입니다." }, { status: 400 });
    }

    // memo에 URL이 없으면 앞에 붙여줌 (텔레그램 방식과 동일한 형태 유지)
    const fullMemo = memo ? `${url} ${memo}` : url;
    const urls = extractUrls(fullMemo, undefined);
    if (urls.length === 0) urls.push(url);

    let primaryDomain = "";
    try {
      primaryDomain = new URL(urls[0]).hostname;
    } catch {}

    const link = await addLink({
      memo: fullMemo,
      urls,
      primaryDomain,
      source: "manual",
    });

    return NextResponse.json({ data: link }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 2: 동작 확인**

Run: `curl -X POST http://localhost:3000/api/links -H 'Content-Type: application/json' -d '{"url":"https://example.com","memo":"테스트 #test"}'`
Expected: `{ "data": { "id": "...", "source": "manual", ... } }` with status 201

- [ ] **Step 3: Commit**

```bash
git add app/api/links/route.ts
git commit -m "feat(links): add POST /api/links endpoint for manual link creation"
```

---

### Task 2: AddLinkSheet 컴포넌트

**Files:**
- Create: `components/AddLinkSheet.tsx`

- [ ] **Step 1: 바텀 시트 컴포넌트 생성**

HealingAddSheet와 동일한 바텀 시트 패턴을 따른다. URL 입력(필수) + 메모 textarea(선택).

```tsx
"use client";

import { useState, useRef, useEffect } from "react";

interface AddLinkSheetProps {
  onSave: (data: { url: string; memo: string }) => void;
  onClose: () => void;
}

export default function AddLinkSheet({ onSave, onClose }: AddLinkSheetProps) {
  const [url, setUrl] = useState("");
  const [memo, setMemo] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canSave = url.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ url: url.trim(), memo: memo.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl p-6 animate-[sheetUp_0.3s_ease-out] max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-[var(--fill-tertiary)] rounded-full mx-auto mb-6" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button className="text-[var(--label-tertiary)] text-[20px]" onClick={onClose}>
            취소
          </button>
          <h2 className="text-[20px] font-bold text-[var(--label-primary)]">링크 추가</h2>
          <button
            className={`text-[20px] font-bold ${canSave ? "text-[var(--accent-primary)]" : "text-[var(--label-quaternary)]"}`}
            onClick={handleSave}
            disabled={!canSave}
          >
            저장
          </button>
        </div>

        {/* URL input */}
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && memo === "" && handleSave()}
          placeholder="https://"
          className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none mb-4"
        />

        {/* Memo textarea */}
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모 (해시태그 가능)"
          rows={3}
          maxLength={500}
          className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none resize-none"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/AddLinkSheet.tsx
git commit -m "feat(links): add AddLinkSheet bottom sheet component"
```

---

### Task 3: LinkSection에 추가 버튼 삽입

**Files:**
- Modify: `components/LinkSection.tsx`

- [ ] **Step 1: onAdd prop 추가 및 하단 버튼 렌더링**

LinkSectionProps에 `onAdd` 콜백을 추가하고, 섹션 하단에 "링크 추가" 버튼을 렌더링한다. D-day 섹션의 "새 일정 추가" 버튼과 동일한 스타일.

```diff
 interface LinkSectionProps {
   links: Link[];
   activeTab: LinkTab;
   onTabChange: (tab: LinkTab) => void;
   onToggleRead: (id: string, read: boolean) => void;
   onDelete: (id: string) => void;
   onTagClick?: (tag: string) => void;
+  onAdd?: () => void;
 }
```

return문의 최상위 div에 버튼 추가:

```tsx
return (
  <div className="flex-1 flex flex-col">
    <SectionTabs ... />

    {visible.length === 0 ? (
      <EmptyState ... />
    ) : (
      <div className="mx-4 md:mx-0 mt-3 flex flex-col gap-3">
        {visible.map(...)}
      </div>
    )}

    {/* 추가 버튼 — 하단 고정 */}
    {onAdd && (
      <div className="mx-5 md:mx-0 mt-auto pt-4">
        <button
          className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold active:opacity-80 transition-opacity"
          onClick={onAdd}
        >
          링크 추가
        </button>
      </div>
    )}
  </div>
);
```

또한 EmptyState의 firstUse 텍스트를 업데이트:

```
텔레그램 봇으로 링크를 보내거나
아래 버튼으로 직접 추가해보세요.
```

- [ ] **Step 2: Commit**

```bash
git add components/LinkSection.tsx
git commit -m "feat(links): add onAdd prop and add button to LinkSection"
```

---

### Task 4: page.tsx 통합

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: state 추가 및 핸들러 작성**

기존 link 관련 state 근처에 추가:

```typescript
const [showAddLink, setShowAddLink] = useState(false);
```

Link actions 섹션에 addLink 핸들러 추가:

```typescript
const saveNewLink = async (data: { url: string; memo: string }) => {
  try {
    const res = await fetch(`${BASE}/api/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (body.data) {
      setLinks((prev) => [body.data, ...prev]);
    }
  } catch (err) {
    console.error("Failed to add link:", err);
  }
  setShowAddLink(false);
};
```

- [ ] **Step 2: LinkSection에 onAdd 전달**

```diff
 <LinkSection
   links={links}
   activeTab={linkTab}
   onTabChange={setLinkTab}
   onToggleRead={toggleLinkRead}
   onDelete={deleteLink}
   onTagClick={(tag) => setActiveTag(tag)}
+  onAdd={() => setShowAddLink(true)}
 />
```

- [ ] **Step 3: AddLinkSheet 렌더링**

다른 시트들과 같은 위치(return문 하단, 모달 영역)에 추가:

```tsx
import AddLinkSheet from "@/components/AddLinkSheet";

// ... return 내부, 다른 시트들 옆에:
{showAddLink && (
  <AddLinkSheet
    onSave={saveNewLink}
    onClose={() => setShowAddLink(false)}
  />
)}
```

- [ ] **Step 4: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공, 에러 없음

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat(links): integrate AddLinkSheet into main page"
```
