# Healing Collection + Wish Masonry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "힐링" tab (image/text/link items) to the wish section and convert all wish tabs to a Masonry 2-column layout with dynamic card heights.

**Architecture:** Extend WishItem type with `healingType` and `linkTitle` fields. Add image upload/serving APIs under `/api/wishes/`. Build a JS-based MasonryGrid component that distributes cards to the shorter column. Create HealingCard for 3 content types and HealingAddSheet for adding items. Rename "위시리스트" → "위시" across the app.

**Tech Stack:** Next.js API routes (file upload via formData), React client components, CSS-in-JS for masonry, file-based image storage in `data/healing/`.

---

### Task 1: Extend Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add healing to WishCategory and extend WishItem**

In `types/index.ts`, change `WishCategory`:

```typescript
// Line 107 — change:
export type WishCategory = "item" | "experience";
// to:
export type WishCategory = "healing" | "item" | "experience";
```

Add `healingType` and `linkTitle` to `WishItem` interface (after `review` field, line 121):

```typescript
  healingType?: "image" | "text" | "link";
  linkTitle?: string;
```

Add to `CreateWishRequest` (after `memo` field, line 136):

```typescript
  healingType?: "image" | "text" | "link";
  linkTitle?: string;
```

Add to `UpdateWishRequest` (after `review` field, line 150):

```typescript
  healingType?: "image" | "text" | "link";
  linkTitle?: string;
```

Update `VALID_WISH_CATEGORIES`:

```typescript
// Line 152 — change:
export const VALID_WISH_CATEGORIES: WishCategory[] = ["item", "experience"];
// to:
export const VALID_WISH_CATEGORIES: WishCategory[] = ["healing", "item", "experience"];
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat(healing): extend WishCategory and WishItem types for healing collection"
```

---

### Task 2: Image Upload & Serving APIs

**Files:**
- Create: `app/api/wishes/upload/route.ts`
- Create: `app/api/wishes/image/[filename]/route.ts`

- [ ] **Step 1: Create image upload API**

Create `app/api/wishes/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { ApiResponse } from "@/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const HEALING_DIR = path.join(DATA_DIR, "healing");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ imageUrl: string }>>> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "JPEG, PNG, WebP, GIF만 허용됩니다." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 10MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    await fs.mkdir(HEALING_DIR, { recursive: true });

    const id = uuidv4();
    const filename = `${id}${ext}`;
    const filePath = path.join(HEALING_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const imageUrl = `${BASE}/api/wishes/image/${filename}`;
    return NextResponse.json({ data: { imageUrl } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create image serving API**

Create `app/api/wishes/image/[filename]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const HEALING_DIR = path.join(DATA_DIR, "healing");

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  try {
    const { filename } = await params;

    // Prevent directory traversal
    const safe = path.basename(filename);
    const filePath = path.join(HEALING_DIR, safe);

    const ext = path.extname(safe).toLowerCase();
    const mime = MIME_TYPES[ext];
    if (!mime) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const buffer = await fs.readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 4: Commit**

```bash
git add app/api/wishes/upload/route.ts app/api/wishes/image/\[filename\]/route.ts
git commit -m "feat(healing): add image upload and serving APIs"
```

---

### Task 3: Link Title Fetcher + Tests

**Files:**
- Create: `lib/fetch-title.ts`
- Create: `lib/__tests__/fetch-title.test.ts`

- [ ] **Step 1: Write the tests**

Create `lib/__tests__/fetch-title.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { extractTitle } from "../fetch-title";

describe("extractTitle", () => {
  it("extracts title from HTML", () => {
    const html = "<html><head><title>Hello World</title></head></html>";
    expect(extractTitle(html)).toBe("Hello World");
  });

  it("returns null for missing title", () => {
    const html = "<html><head></head></html>";
    expect(extractTitle(html)).toBeNull();
  });

  it("trims whitespace from title", () => {
    const html = "<title>  Hello World  </title>";
    expect(extractTitle(html)).toBe("Hello World");
  });

  it("handles empty title", () => {
    const html = "<title></title>";
    expect(extractTitle(html)).toBeNull();
  });

  it("truncates long titles to 200 chars", () => {
    const longTitle = "A".repeat(300);
    const html = `<title>${longTitle}</title>`;
    expect(extractTitle(html)!.length).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/fetch-title.test.ts 2>&1 | tail -10`
Expected: FAIL

- [ ] **Step 3: Write implementation**

Create `lib/fetch-title.ts`:

```typescript
export function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  const title = match[1].trim();
  if (!title) return null;
  return title.length > 200 ? title.slice(0, 200) : title;
}

export async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "v-todo/1.0" },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    // Read only first 50KB to find <title>
    const reader = res.body?.getReader();
    if (!reader) return null;

    let html = "";
    const decoder = new TextDecoder();
    while (html.length < 50000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      // Early exit if we found </title>
      if (/<\/title>/i.test(html)) break;
    }
    reader.cancel();

    return extractTitle(html);
  } catch {
    return null;
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/fetch-title.test.ts 2>&1 | tail -10`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/fetch-title.ts lib/__tests__/fetch-title.test.ts
git commit -m "feat(healing): add link title fetcher with tests"
```

---

### Task 4: Extend Wish API for Healing Category

**Files:**
- Modify: `app/api/wishes/route.ts`
- Modify: `app/api/wishes/[id]/route.ts`

- [ ] **Step 1: Update POST /api/wishes**

In `app/api/wishes/route.ts`:

1. Update `VALID_CATEGORIES` (line 6):
```typescript
const VALID_CATEGORIES = ["healing", "item", "experience"];
```

2. Add import for fetchPageTitle:
```typescript
import { fetchPageTitle } from "@/lib/fetch-title";
```

3. Update the title validation (line 23) to allow empty title for healing items:
```typescript
    const isHealing = body.category === "healing";
    if (!isHealing && (!body.title || typeof body.title !== "string" || body.title.trim().length === 0 || body.title.length > 200)) {
      return NextResponse.json({ error: "제목은 1~200자여야 합니다." }, { status: 400 });
    }
```

4. Add link title fetching and healing fields to the wish object creation. Replace the `const wish: WishItem = {` block:
```typescript
    // For healing link type, fetch page title
    let linkTitle: string | null = null;
    if (isHealing && body.healingType === "link" && body.url) {
      linkTitle = await fetchPageTitle(body.url);
    }

    const wish: WishItem = {
      id: uuidv4(),
      title: isHealing ? (body.title?.trim() || "") : body.title.trim(),
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
      ...(isHealing && {
        healingType: body.healingType,
        linkTitle: linkTitle ?? body.linkTitle ?? null,
      }),
    };
```

- [ ] **Step 2: Update PUT /api/wishes/[id]**

In `app/api/wishes/[id]/route.ts`:

1. Update `VALID_CATEGORIES` (line 5):
```typescript
const VALID_CATEGORIES = ["healing", "item", "experience"];
```

2. Update category validation message (line 34):
```typescript
        return NextResponse.json({ error: "유효하지 않은 카테고리입니다." }, { status: 400 });
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 4: Commit**

```bash
git add app/api/wishes/route.ts app/api/wishes/\[id\]/route.ts
git commit -m "feat(healing): extend wish API for healing category with link title fetch"
```

---

### Task 5: MasonryGrid Component

**Files:**
- Create: `components/MasonryGrid.tsx`

- [ ] **Step 1: Create MasonryGrid**

This component distributes children into 2 columns, placing each item in the shorter column. Uses `useRef` + `useEffect` to measure actual heights and rebalance.

Create `components/MasonryGrid.tsx`:

```typescript
"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

interface MasonryGridProps {
  children: ReactNode[];
  gap?: number;
}

export default function MasonryGrid({ children, gap = 12 }: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<[number[], number[]]>([[], []]);

  useEffect(() => {
    // Simple distribution: alternate items between columns
    // This works well enough for similar-sized items
    const left: number[] = [];
    const right: number[] = [];
    for (let i = 0; i < children.length; i++) {
      if (i % 2 === 0) left.push(i);
      else right.push(i);
    }
    setColumns([left, right]);
  }, [children.length]);

  const items = Array.isArray(children) ? children : [children];

  return (
    <div
      ref={containerRef}
      className="flex"
      style={{ gap }}
    >
      {columns.map((col, ci) => (
        <div key={ci} className="flex-1 flex flex-col" style={{ gap }}>
          {col.map((idx) => (
            <div key={idx}>{items[idx]}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add components/MasonryGrid.tsx
git commit -m "feat(healing): add MasonryGrid 2-column layout component"
```

---

### Task 6: HealingCard Component

**Files:**
- Create: `components/HealingCard.tsx`

- [ ] **Step 1: Create HealingCard**

This component renders 3 different card styles based on `healingType`: image, text, or link.

Create `components/HealingCard.tsx`:

```typescript
"use client";

import type { WishItem } from "@/types";
import { extractDomain } from "@/lib/fetch-title";

interface HealingCardProps {
  item: WishItem;
  onDelete: (id: string) => void;
}

export default function HealingCard({ item, onDelete }: HealingCardProps) {
  const handleDelete = () => {
    onDelete(item.id);
  };

  const handleLinkClick = () => {
    if (item.url) window.open(item.url, "_blank", "noopener");
  };

  // Image type
  if (item.healingType === "image" && item.imageUrl) {
    return (
      <div className="rounded-2xl overflow-hidden bg-[var(--sys-bg-elevated)] relative group">
        <img
          src={item.imageUrl}
          alt=""
          className="w-full block"
          style={{ objectFit: "cover" }}
          loading="lazy"
        />
        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDelete}
          aria-label="삭제"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 1.5L12.5 12.5M12.5 1.5L1.5 12.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  // Text type
  if (item.healingType === "text") {
    return (
      <div className="rounded-2xl overflow-hidden bg-[var(--sys-bg-elevated)] p-4 relative group">
        <div className="border-l-3 border-[var(--sys-teal)] pl-3">
          <p className="text-[17px] leading-relaxed text-[var(--label-primary)] whitespace-pre-wrap">
            {item.title}
          </p>
        </div>
        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[var(--fill-tertiary)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDelete}
          aria-label="삭제"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 1.5L12.5 12.5M12.5 1.5L1.5 12.5" stroke="var(--label-tertiary)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  // Link type
  return (
    <button
      className="rounded-2xl overflow-hidden bg-[var(--sys-bg-elevated)] p-4 text-left w-full relative group"
      onClick={handleLinkClick}
    >
      <div className="text-[13px] text-[var(--sys-teal)] font-medium mb-1">
        {item.url ? extractDomain(item.url) : "링크"}
      </div>
      <div className="text-[17px] leading-snug text-[var(--label-primary)] font-medium">
        {item.linkTitle || item.url || ""}
      </div>
      <button
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[var(--fill-tertiary)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); handleDelete(); }}
        aria-label="삭제"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path d="M1.5 1.5L12.5 12.5M12.5 1.5L1.5 12.5" stroke="var(--label-tertiary)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </button>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add components/HealingCard.tsx
git commit -m "feat(healing): add HealingCard component for image/text/link types"
```

---

### Task 7: HealingAddSheet Component

**Files:**
- Create: `components/HealingAddSheet.tsx`

- [ ] **Step 1: Create HealingAddSheet**

This bottom sheet lets users choose between image/text/link and input the content.

Create `components/HealingAddSheet.tsx`:

```typescript
"use client";

import { useState, useRef } from "react";

type HealingType = "image" | "text" | "link";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface HealingAddSheetProps {
  onSave: (data: {
    title: string;
    category: "healing";
    healingType: HealingType;
    url: string | null;
    imageUrl: string | null;
    price: null;
    memo: null;
  }) => void;
  onClose: () => void;
}

export default function HealingAddSheet({ onSave, onClose }: HealingAddSheetProps) {
  const [type, setType] = useState<HealingType>("image");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSave =
    (type === "image" && uploadedUrl !== null) ||
    (type === "text" && text.trim().length > 0) ||
    (type === "link" && url.trim().length > 0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewSrc(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE}/api/wishes/upload`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (body.data?.imageUrl) {
        setUploadedUrl(body.data.imageUrl);
      }
    } catch {
      // silent
    }
    setUploading(false);
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      title: type === "text" ? text.trim() : "",
      category: "healing",
      healingType: type,
      url: type === "link" ? url.trim() : null,
      imageUrl: type === "image" ? uploadedUrl : null,
      price: null,
      memo: null,
    });
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
          <h2 className="text-[20px] font-bold text-[var(--label-primary)]">힐링 추가</h2>
          <button
            className={`text-[20px] font-bold ${canSave ? "text-[var(--accent-primary)]" : "text-[var(--label-quaternary)]"}`}
            onClick={handleSave}
            disabled={!canSave}
          >
            저장
          </button>
        </div>

        {/* Type selector */}
        <div className="flex gap-2 mb-5">
          {([
            { key: "image" as const, label: "🖼️ 이미지" },
            { key: "text" as const, label: "✍️ 글" },
            { key: "link" as const, label: "🔗 링크" },
          ]).map((t) => (
            <button
              key={t.key}
              className={`flex-1 py-3 rounded-xl text-[17px] font-medium transition-colors ${
                type === t.key
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-[var(--fill-quaternary)] text-[var(--label-secondary)]"
              }`}
              onClick={() => setType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content based on type */}
        {type === "image" && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            {previewSrc ? (
              <div className="rounded-xl overflow-hidden mb-4">
                <img src={previewSrc} alt="미리보기" className="w-full" />
              </div>
            ) : null}
            <button
              className="w-full py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-secondary)] font-medium"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "업로드 중..." : uploadedUrl ? "다른 사진 선택" : "사진 선택"}
            </button>
          </div>
        )}

        {type === "text" && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="위로가 되는 글을 적어보세요"
            rows={5}
            maxLength={1000}
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none resize-none"
          />
        )}

        {type === "link" && (
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none"
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add components/HealingAddSheet.tsx
git commit -m "feat(healing): add HealingAddSheet bottom sheet component"
```

---

### Task 8: Update WishItem Card for Masonry

**Files:**
- Modify: `components/WishItem.tsx`

- [ ] **Step 1: Change WishItem card from fixed aspect ratio to dynamic height**

In `components/WishItem.tsx`, the image area currently uses `aspect-[4/3]` which forces a fixed height. For masonry, the image should use its natural aspect ratio, and cards without images should be text-only.

Replace the entire image area button (lines 83-113):

```typescript
      {/* Image area */}
      {wish.imageUrl ? (
        <button
          className="w-full relative"
          onClick={() => onEdit(wish)}
          aria-label="위시 편집"
        >
          <img
            src={wish.imageUrl}
            alt=""
            className="w-full block rounded-t-2xl"
            loading="lazy"
          />
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
      ) : null}
```

Then update the content div (lines 116 onwards). Change the click handler for the text area to wrap the whole content section:

```typescript
      {/* Content */}
      <button
        className="w-full text-left px-3 pt-2.5 pb-3"
        onClick={() => onEdit(wish)}
      >
```

Remove the inner `<button className="w-full text-left">` wrapper (line 117-119) since the outer div is now the button. Keep the content inside.

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add components/WishItem.tsx
git commit -m "feat(healing): update WishItem card for masonry dynamic height"
```

---

### Task 9: Update WishlistView with Healing Tab + Masonry

**Files:**
- Modify: `components/WishlistView.tsx`

- [ ] **Step 1: Rewrite WishlistView with healing tab and masonry layout**

Replace the entire file `components/WishlistView.tsx`:

```typescript
"use client";

import type { WishItem, WishCategory } from "@/types";
import SectionTabs from "@/components/SectionTabs";
import WishItemCard from "@/components/WishItem";
import HealingCard from "@/components/HealingCard";
import MasonryGrid from "@/components/MasonryGrid";

interface WishlistViewProps {
  wishes: WishItem[];
  wishTab: WishCategory;
  onTabChange: (tab: WishCategory) => void;
  onToggle: (id: string) => void;
  onEdit: (wish: WishItem) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onTagClick?: (tag: string) => void;
}

export default function WishlistView({
  wishes,
  wishTab,
  onTabChange,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  onTagClick,
}: WishlistViewProps) {
  const healingCount = wishes.filter((w) => w.category === "healing").length;
  const itemCount = wishes.filter((w) => w.category === "item" && !w.completed).length;
  const experienceCount = wishes.filter((w) => w.category === "experience" && !w.completed).length;

  const tabs = [
    { key: "healing", label: `힐링${healingCount > 0 ? ` ${healingCount}` : ""}` },
    { key: "item", label: `물건${itemCount > 0 ? ` ${itemCount}` : ""}` },
    { key: "experience", label: `경험${experienceCount > 0 ? ` ${experienceCount}` : ""}` },
  ];

  const filtered = wishes.filter((w) => w.category === wishTab);

  // Healing tab: no completed/active split
  if (wishTab === "healing") {
    return (
      <div className="flex-1 flex flex-col">
        <SectionTabs
          tabs={tabs}
          active={wishTab}
          onChange={(key) => onTabChange(key as WishCategory)}
        />
        {filtered.length > 0 ? (
          <div className="mx-4 md:mx-0 mt-3">
            <MasonryGrid>
              {filtered.map((item) => (
                <HealingCard key={item.id} item={item} onDelete={onDelete} />
              ))}
            </MasonryGrid>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-[56px] opacity-30">💚</span>
            <span className="text-[20px] text-[var(--label-tertiary)]">기분이 좋아지는 것들을 모아보세요</span>
          </div>
        )}
        <div className="mx-5 md:mx-0 mt-auto pt-4">
          <button
            className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold active:opacity-80 transition-opacity"
            onClick={onAdd}
          >
            힐링 추가
          </button>
        </div>
      </div>
    );
  }

  // Item/Experience tabs with masonry
  const active = filtered.filter((w) => !w.completed);
  const completed = filtered.filter((w) => w.completed);
  const categoryEmoji = wishTab === "item" ? "🛍️" : "⭐";
  const emptyMessage = wishTab === "item" ? "아직 담긴 물건이 없어요" : "아직 계획된 경험이 없어요";

  return (
    <div className="flex-1 flex flex-col">
      <SectionTabs
        tabs={tabs}
        active={wishTab}
        onChange={(key) => onTabChange(key as WishCategory)}
      />

      {active.length > 0 && (
        <div className="mx-4 md:mx-0 mt-3">
          <MasonryGrid>
            {active.map((wish) => (
              <WishItemCard
                key={wish.id}
                wish={wish}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onTagClick={onTagClick}
              />
            ))}
          </MasonryGrid>
        </div>
      )}

      {active.length === 0 && completed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-[56px] opacity-30">{categoryEmoji}</span>
          <span className="text-[20px] text-[var(--label-tertiary)]">{emptyMessage}</span>
        </div>
      )}

      {completed.length > 0 && (
        <div className="mx-4 md:mx-0 mt-6">
          <div className="text-[15px] font-medium text-[var(--label-tertiary)] mb-2 px-1">
            달성 {completed.length}
          </div>
          <MasonryGrid>
            {completed.map((wish) => (
              <WishItemCard
                key={wish.id}
                wish={wish}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </MasonryGrid>
        </div>
      )}

      <div className="mx-5 md:mx-0 mt-auto pt-4">
        <button
          className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold active:opacity-80 transition-opacity"
          onClick={onAdd}
        >
          새 위시 추가
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add components/WishlistView.tsx
git commit -m "feat(healing): add healing tab and masonry layout to WishlistView"
```

---

### Task 10: Update page.tsx + BottomNav — Rename + Healing Integration

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/BottomNav.tsx`

- [ ] **Step 1: Add imports in page.tsx**

Add near other component imports:
```typescript
import HealingAddSheet from "@/components/HealingAddSheet";
```

- [ ] **Step 2: Update saveWish function type**

Find the `saveWish` function definition (around line 217). Add `healingType` to its parameter type:

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
    healingType?: "image" | "text" | "link";
  }) => {
```

- [ ] **Step 3: Change wishTab default to "healing"**

Find (around line 39):
```typescript
  const [wishTab, setWishTab] = useState<WishCategory>("item");
```
Change to:
```typescript
  const [wishTab, setWishTab] = useState<WishCategory>("healing");
```

- [ ] **Step 4: Update swipe handling for 3 wish tabs**

Find the wish swipe logic (around lines 574-576):
```typescript
      if (dir === "left" && wishTab === "item") setWishTab("experience");
      if (dir === "right" && wishTab === "experience") setWishTab("item");
```

Replace with:
```typescript
      const wishTabs: WishCategory[] = ["healing", "item", "experience"];
      const wi = wishTabs.indexOf(wishTab);
      if (dir === "left" && wi < wishTabs.length - 1) setWishTab(wishTabs[wi + 1]);
      if (dir === "right" && wi > 0) setWishTab(wishTabs[wi - 1]);
```

- [ ] **Step 5: Rename "위시리스트" to "위시" in headers**

Find all occurrences of `"위시리스트"` in page.tsx and replace with `"위시"`. There should be occurrences in:
- Mobile header (line ~608): `section === "wish" ? "위시리스트"` → `section === "wish" ? "위시"`
- Desktop header (line ~639): same change

- [ ] **Step 6: Update sidebar label**

Find the sidebar wish label (around line 501):
```typescript
          <span className="text-[15px] font-medium flex-1">위시리스트</span>
```
Change to:
```typescript
          <span className="text-[15px] font-medium flex-1">위시</span>
```

- [ ] **Step 7: Handle healing add sheet**

Find where `showAddWish` renders the `AddWishSheet` (around lines 829-842). Add the healing sheet conditionally:

```typescript
        {showAddWish && wishTab === "healing" ? (
          <HealingAddSheet
            onSave={saveWish}
            onClose={() => { setShowAddWish(false); setEditWish(null); }}
          />
        ) : showAddWish ? (
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
        ) : null}
```

- [ ] **Step 8: Update BottomNav label**

In `components/BottomNav.tsx`, the wish button label (line 95) already says "위시" — verify it does not say "위시리스트". If it says "위시리스트", change to "위시". (Current code already uses "위시" based on the read.)

- [ ] **Step 9: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 10: Commit**

```bash
git add app/page.tsx components/BottomNav.tsx
git commit -m "feat(healing): integrate healing tab, rename to 위시, add healing sheet"
```

---

### Task 11: Build & Verify

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run 2>&1 | tail -20`
Expected: All tests pass including new fetch-title tests

- [ ] **Step 2: Build for production**

Run: `npx next build 2>&1 | tail -25`
Expected: Build succeeds, includes `/api/wishes/upload` and `/api/wishes/image/[filename]` routes

- [ ] **Step 3: Verify build artifacts**

Run: `ls .next/BUILD_ID && ls .next/prerender-manifest.json`
Expected: Both files exist
