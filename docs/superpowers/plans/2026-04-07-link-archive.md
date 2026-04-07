# Link Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "링크" main section to v-todo that receives links via a Telegram bot, persists them to JSON, and displays them in unread/read tabs with share & delete actions.

**Architecture:** Background polling worker (started in `instrumentation.ts`) calls Telegram `getUpdates` long-polling API. Messages from the authorized chat are converted to `Link` records and stored in `data/links.json` using the existing atomic-write pattern. A new `/api/links` route exposes CRUD; a new `LinkSection` component renders the tabbed card list.

**Tech Stack:** Next.js 16.2.1 (App Router) · React 19 · TypeScript · Tailwind v4 · Vitest 4 · Telegram Bot API (`getUpdates` long polling)

**Reference spec:** `docs/superpowers/specs/2026-04-07-link-archive-design.md`

---

## File Structure

### New files
| Path | Responsibility |
|---|---|
| `lib/url-extract.ts` | Extract URLs from a Telegram message (entities first, regex fallback). Pure, no I/O. |
| `lib/link-store.ts` | Atomic read/write of `data/links.json`, including `lastUpdateId`. Mirrors `wish-store.ts`. |
| `lib/telegram-poller.ts` | Pure helpers (`isAuthorized`, `buildLinkFromMessage`, `processUpdate`) plus a `TelegramPoller` class that owns the long-poll loop. Fetch is injectable for tests. |
| `app/api/links/route.ts` | `GET /api/links` |
| `app/api/links/[id]/route.ts` | `PUT` (toggle read), `DELETE` |
| `components/LinkCard.tsx` | Single link card: memo body with linkified URLs and hashtag chips, domain + relative time, inline action menu (sheet) for share/read/delete/multi-URL. |
| `components/LinkSection.tsx` | Tabs (읽지 않음 / 읽음), card list, empty states. |
| `instrumentation.ts` | Next.js 16 boot hook. Reads env vars, starts the `TelegramPoller` once per server instance via a `globalThis.__linkPoller` singleton. |
| `data/links.json` | Initial empty store: `{ "links": [] }`. |
| `lib/__tests__/url-extract.test.ts` | Unit tests for URL extraction. |
| `lib/__tests__/link-store.test.ts` | Unit tests for the JSON store. |
| `lib/__tests__/telegram-poller.test.ts` | Unit tests for poller pure helpers + `processUpdate` against a mocked fetch. |
| `lib/__tests__/api-links.test.ts` | API route tests (mirrors `api-wishes.test.ts`). |

### Modified files
| Path | Change |
|---|---|
| `types/index.ts` | Add `Link`, `LinkStore`. Add `"link"` to `Section`. |
| `components/BottomNav.tsx` | Add a 5th tab: "링크" (between 노트 and 위시). |
| `app/page.tsx` | Import `LinkSection`, add `links` state + `fetchLinks`, wire actions, render the section, add Sidebar nav item. |
| `.env.local.example` | Add `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_ID`, `LINK_POLLER_ENABLED`, `LINK_POLLER_TIMEOUT_SEC`, `LINK_POLLER_DEBUG`. |
| `CLAUDE.md` | Append a "텔레그램 링크 봇 설정" section with the BotFather + chat_id + restart steps. |

---

## Key conventions to follow (read once before starting)

These come from existing v-todo code; **mimic them exactly** to keep the codebase consistent.

1. **Store pattern** — see `lib/wish-store.ts`. Local `DATA_DIR` constant, exported path constant, atomic write via `temp → rename`, ENOENT recovery, parse-error recovery.
2. **API route pattern** — see `app/api/wishes/route.ts` and `app/api/wishes/[id]/route.ts`. `NextResponse.json({ data })` on success, `{ error }` with 400/404/500 on failure. Dynamic segment params are typed as `{ params: Promise<{ id: string }> }` and must be `await`-ed in Next 16.
3. **Test pattern** — see `lib/__tests__/wish-store.test.ts` and `api-wishes.test.ts`. Use `beforeEach` to write a fresh JSON file, `afterEach` to clean up. Tests run with `DATA_DIR=.test-data` (set in `vitest.config.ts`).
4. **Hashtag rendering** — use `splitParts` from `lib/tags.ts` to render text with inline tag chips (see `components/WishItem.tsx:120-135` for the exact JSX pattern).
5. **Component style** — `"use client"` directive, Catppuccin variables (`--sys-bg-elevated`, `--label-primary`, `--accent-primary`, etc.), font sizes per CLAUDE.md (Body 20px, Subheadline 17px, Footnote 15px).
6. **Hooks rule** (CLAUDE.md) — declare all React hooks at the top of `Home` in `app/page.tsx`, not nested inside `Sidebar`/`Content` helpers.
7. **Date rule** (CLAUDE.md) — for storing instant timestamps (`createdAt`, `readAt`), `new Date().toISOString()` is fine. Use `getFullYear/getMonth/getDate` only when computing "today's date string" in KST.
8. **Next.js docs** — for any Next.js-specific question, `node_modules/next/dist/docs/01-app/...` is the source of truth (AGENTS.md says training data is unreliable for this version).

---

## Task 1: Types, Section enum, and initial data file

**Files:**
- Modify: `types/index.ts` (insert near the bottom, after `GratitudeStore`)
- Modify: `types/index.ts:97` (extend `Section` union)
- Create: `data/links.json`

- [ ] **Step 1: Add `"link"` to the `Section` union**

In `types/index.ts`, find this line:

```typescript
export type Section = "todo" | "note" | "wish" | "dday";
```

Replace with:

```typescript
export type Section = "todo" | "note" | "link" | "wish" | "dday";
```

(Order chosen so the bottom nav reads: 할 일 → 노트 → 링크 → 위시 → D-day. "노트와 위시 사이" per spec § 4.)

- [ ] **Step 2: Add `Link` and `LinkStore` types**

Append to `types/index.ts` (after the existing `GratitudeStore` interface, before the final newline):

```typescript
// Links
export interface Link {
  id: string;
  /** Original Telegram message text. URL(s) and hashtags are kept inline. */
  memo: string;
  /** All URLs extracted from the message, in original order. First is the primary. */
  urls: string[];
  /** Domain of the first URL (e.g. "x.com"). Cached at save time for cheap rendering. */
  primaryDomain: string;
  /** Read state. False = inbox, true = archived/read. */
  read: boolean;
  /** Source channel. Always "telegram" in v1; slot kept for future expansion. */
  source: "telegram" | "manual";
  /** Telegram message ID — used for dedupe (idempotency). Optional because manual entries won't have one. */
  telegramMessageId?: number;
  /** ISO 8601 instant. */
  createdAt: string;
  /** ISO 8601 instant. Set when `read` flips to true, cleared (undefined) when flipped back. */
  readAt?: string;
}

export interface LinkStore {
  links: Link[];
  /** The last Telegram update_id that was processed. Used as the next `getUpdates?offset=`. */
  lastUpdateId?: number;
}
```

- [ ] **Step 3: Create the initial data file**

Create `data/links.json` with this exact content:

```json
{
  "links": []
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors. (Pre-existing errors, if any, are unrelated.)

- [ ] **Step 5: Commit**

```bash
git add types/index.ts data/links.json
git commit -m "feat(links): add Link/LinkStore types and Section enum entry"
```

---

## Task 2: URL extraction utility (TDD)

**Files:**
- Create: `lib/url-extract.ts`
- Test: `lib/__tests__/url-extract.test.ts`

The function takes a Telegram message (text + optional `entities` array) and returns deduplicated URLs in original order, with trailing punctuation stripped.

- [ ] **Step 1: Write the failing test file**

Create `lib/__tests__/url-extract.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { extractUrls, type TelegramEntity } from "../url-extract";

describe("extractUrls", () => {
  it("returns empty array when text has no URLs", () => {
    expect(extractUrls("그냥 메모입니다", undefined)).toEqual([]);
  });

  it("extracts a single URL via regex when entities are absent", () => {
    expect(extractUrls("이거 봐 https://react.dev 좋다", undefined)).toEqual([
      "https://react.dev",
    ]);
  });

  it("extracts multiple URLs preserving order", () => {
    expect(
      extractUrls("https://a.com 그리고 https://b.com", undefined)
    ).toEqual(["https://a.com", "https://b.com"]);
  });

  it("strips trailing punctuation", () => {
    expect(extractUrls("https://example.com.", undefined)).toEqual([
      "https://example.com",
    ]);
    expect(extractUrls("(see https://example.com)", undefined)).toEqual([
      "https://example.com",
    ]);
    expect(extractUrls("link: https://example.com,", undefined)).toEqual([
      "https://example.com",
    ]);
  });

  it("deduplicates same URL within one message (preserving first occurrence)", () => {
    expect(
      extractUrls("https://a.com 그리고 https://a.com 또", undefined)
    ).toEqual(["https://a.com"]);
  });

  it("uses entities when provided, ignoring regex", () => {
    const text = "보세요 https://example.com 와 https://other.com";
    const entities: TelegramEntity[] = [
      { type: "url", offset: 4, length: 19 },
    ];
    // Only the entity URL is returned even though regex would find two
    expect(extractUrls(text, entities)).toEqual(["https://example.com"]);
  });

  it("ignores non-url entities", () => {
    const text = "@me check https://example.com";
    const entities: TelegramEntity[] = [
      { type: "mention", offset: 0, length: 3 },
      { type: "url", offset: 10, length: 19 },
    ];
    expect(extractUrls(text, entities)).toEqual(["https://example.com"]);
  });

  it("handles http and https schemes", () => {
    expect(extractUrls("http://old.com and https://new.com", undefined)).toEqual([
      "http://old.com",
      "https://new.com",
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/url-extract.test.ts`
Expected: FAIL with "Cannot find module '../url-extract'" (or similar).

- [ ] **Step 3: Implement `lib/url-extract.ts`**

Create `lib/url-extract.ts`:

```typescript
// lib/url-extract.ts — Extract URLs from Telegram messages.

/** Subset of Telegram message entity we care about. */
export interface TelegramEntity {
  type: string;
  offset: number;
  length: number;
}

const URL_REGEX = /https?:\/\/[^\s]+/g;
// Trailing characters that are almost never part of a real URL when caught at the end.
const TRAILING_TRIM = /[.,;:!?)\]}>'"`]+$/;

function trimTrailing(url: string): string {
  return url.replace(TRAILING_TRIM, "");
}

function dedupePreserveOrder(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

/**
 * Extract URLs from a Telegram message.
 *
 * If entities are provided, only `type === "url"` slices are used. Otherwise,
 * a regex scans the raw text. Results have trailing punctuation stripped and
 * duplicates removed (first occurrence wins).
 */
export function extractUrls(
  text: string,
  entities: TelegramEntity[] | undefined
): string[] {
  if (!text) return [];

  let raw: string[];

  if (entities && entities.length > 0) {
    raw = entities
      .filter((e) => e.type === "url")
      .map((e) => text.slice(e.offset, e.offset + e.length));
  } else {
    raw = Array.from(text.matchAll(URL_REGEX), (m) => m[0]);
  }

  return dedupePreserveOrder(raw.map(trimTrailing).filter((u) => u.length > 0));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/__tests__/url-extract.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/url-extract.ts lib/__tests__/url-extract.test.ts
git commit -m "feat(links): add url-extract utility with entities + regex fallback"
```

---

## Task 3: link-store (TDD)

**Files:**
- Create: `lib/link-store.ts`
- Test: `lib/__tests__/link-store.test.ts`

Mirrors `lib/wish-store.ts` but adds `lastUpdateId` persistence and a couple of helpers needed by the poller (`addLink`, `findByTelegramMessageId`).

- [ ] **Step 1: Write the failing test file**

Create `lib/__tests__/link-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import {
  readLinkStore,
  writeLinkStore,
  addLink,
  findByTelegramMessageId,
  LINKS_PATH,
} from "../link-store";
import { DATA_DIR } from "../store";
import type { Link } from "@/types";

const TMP_PATH = path.join(DATA_DIR, "links.tmp.json");

function makeLink(overrides: Partial<Link> = {}): Link {
  return {
    id: "link-1",
    memo: "예시 메모 https://example.com #tag",
    urls: ["https://example.com"],
    primaryDomain: "example.com",
    read: false,
    source: "telegram",
    telegramMessageId: 100,
    createdAt: "2026-04-07T00:00:00.000Z",
    ...overrides,
  };
}

describe("link-store", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(LINKS_PATH, JSON.stringify({ links: [] }));
  });

  afterEach(async () => {
    try { await fs.unlink(LINKS_PATH); } catch {}
    try { await fs.unlink(TMP_PATH); } catch {}
  });

  it("reads an empty store", async () => {
    const store = await readLinkStore();
    expect(store.links).toEqual([]);
    expect(store.lastUpdateId).toBeUndefined();
  });

  it("writes and reads a link", async () => {
    const link = makeLink({ memo: "테스트" });
    await writeLinkStore({ links: [link] });
    const store = await readLinkStore();
    expect(store.links).toHaveLength(1);
    expect(store.links[0].memo).toBe("테스트");
  });

  it("persists lastUpdateId", async () => {
    await writeLinkStore({ links: [], lastUpdateId: 42 });
    const store = await readLinkStore();
    expect(store.lastUpdateId).toBe(42);
  });

  it("creates the file if it does not exist", async () => {
    await fs.unlink(LINKS_PATH);
    const store = await readLinkStore();
    expect(store.links).toEqual([]);
  });

  it("recovers from a corrupted file", async () => {
    await fs.writeFile(LINKS_PATH, "not json");
    const store = await readLinkStore();
    expect(store.links).toEqual([]);
  });

  it("addLink appends to existing store and returns the new link", async () => {
    const existing = makeLink({ id: "link-existing" });
    await writeLinkStore({ links: [existing], lastUpdateId: 5 });

    const created = await addLink({
      memo: "새 메모 https://new.com",
      urls: ["https://new.com"],
      primaryDomain: "new.com",
      source: "telegram",
      telegramMessageId: 999,
    });

    expect(created.id).toBeDefined();
    expect(created.id).not.toBe("link-existing");
    expect(created.read).toBe(false);
    expect(created.createdAt).toBeDefined();

    const store = await readLinkStore();
    expect(store.links).toHaveLength(2);
    expect(store.lastUpdateId).toBe(5); // unchanged
  });

  it("findByTelegramMessageId returns the matching link or undefined", async () => {
    const link = makeLink({ telegramMessageId: 555 });
    await writeLinkStore({ links: [link] });

    expect(await findByTelegramMessageId(555)).toBeDefined();
    expect(await findByTelegramMessageId(999)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/link-store.test.ts`
Expected: FAIL with "Cannot find module '../link-store'".

- [ ] **Step 3: Implement `lib/link-store.ts`**

Create `lib/link-store.ts`:

```typescript
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { Link, LinkStore } from "@/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const LINKS_PATH = path.join(DATA_DIR, "links.json");
const TMP_PATH = path.join(DATA_DIR, "links.tmp.json");

const EMPTY_STORE: LinkStore = { links: [] };

export async function readLinkStore(): Promise<LinkStore> {
  try {
    const raw = await fs.readFile(LINKS_PATH, "utf-8");
    const parsed: LinkStore = JSON.parse(raw);
    // Defensive: ensure shape
    if (!parsed || !Array.isArray(parsed.links)) {
      return { ...EMPTY_STORE };
    }
    return parsed;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(LINKS_PATH, JSON.stringify(EMPTY_STORE));
      return { ...EMPTY_STORE };
    }
    console.error("Failed to parse links.json, resetting:", err);
    await fs.writeFile(LINKS_PATH, JSON.stringify(EMPTY_STORE));
    return { ...EMPTY_STORE };
  }
}

export async function writeLinkStore(store: LinkStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(store, null, 2));
  await fs.rename(TMP_PATH, LINKS_PATH);
}

export interface AddLinkInput {
  memo: string;
  urls: string[];
  primaryDomain: string;
  source: "telegram" | "manual";
  telegramMessageId?: number;
}

/** Append a new Link to the store and return the created record. */
export async function addLink(input: AddLinkInput): Promise<Link> {
  const store = await readLinkStore();
  const link: Link = {
    id: uuidv4(),
    memo: input.memo,
    urls: input.urls,
    primaryDomain: input.primaryDomain,
    read: false,
    source: input.source,
    telegramMessageId: input.telegramMessageId,
    createdAt: new Date().toISOString(),
  };
  store.links.push(link);
  await writeLinkStore(store);
  return link;
}

/** Look up a link by Telegram message id (used for dedupe). */
export async function findByTelegramMessageId(
  messageId: number
): Promise<Link | undefined> {
  const store = await readLinkStore();
  return store.links.find((l) => l.telegramMessageId === messageId);
}
```

- [ ] **Step 4: Verify `DATA_DIR` is exported from `lib/store.ts`**

The test imports `DATA_DIR` from `../store`. Run:

```bash
grep -n "export const DATA_DIR" lib/store.ts
```

Expected: `5:export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");`

If missing, this is a pre-existing issue — add `export` to the line.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/__tests__/link-store.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/link-store.ts lib/__tests__/link-store.test.ts
git commit -m "feat(links): add link-store with addLink and dedupe lookup"
```

---

## Task 4: GET /api/links (TDD)

**Files:**
- Create: `app/api/links/route.ts`
- Test: `lib/__tests__/api-links.test.ts`

- [ ] **Step 1: Write the failing test file (GET only — PUT/DELETE come in the next task)**

Create `lib/__tests__/api-links.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs/promises";
import { LINKS_PATH } from "../link-store";
import { DATA_DIR } from "../store";

import { GET } from "@/app/api/links/route";

describe("GET /api/links", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(LINKS_PATH, JSON.stringify({ links: [] }));
  });

  it("returns empty array initially", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("returns links sorted by createdAt descending", async () => {
    await fs.writeFile(
      LINKS_PATH,
      JSON.stringify({
        links: [
          {
            id: "old",
            memo: "older",
            urls: ["https://old.com"],
            primaryDomain: "old.com",
            read: false,
            source: "telegram",
            createdAt: "2026-04-01T00:00:00.000Z",
          },
          {
            id: "new",
            memo: "newer",
            urls: ["https://new.com"],
            primaryDomain: "new.com",
            read: false,
            source: "telegram",
            createdAt: "2026-04-07T00:00:00.000Z",
          },
        ],
      })
    );
    const res = await GET();
    const body = await res.json();
    expect(body.data.map((l: { id: string }) => l.id)).toEqual(["new", "old"]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/__tests__/api-links.test.ts`
Expected: FAIL with "Cannot find module '@/app/api/links/route'".

- [ ] **Step 3: Implement `app/api/links/route.ts`**

Create `app/api/links/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { readLinkStore } from "@/lib/link-store";
import type { Link, ApiResponse } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<Link[]>>> {
  try {
    const store = await readLinkStore();
    const sorted = [...store.links].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
    );
    return NextResponse.json({ data: sorted });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/__tests__/api-links.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add app/api/links/route.ts lib/__tests__/api-links.test.ts
git commit -m "feat(links): add GET /api/links endpoint sorted by createdAt"
```

---

## Task 5: PUT and DELETE /api/links/[id] (TDD)

**Files:**
- Create: `app/api/links/[id]/route.ts`
- Modify: `lib/__tests__/api-links.test.ts` (append PUT and DELETE describe blocks)

PUT toggles the `read` flag. When `read` flips to `true`, set `readAt = new Date().toISOString()`. When it flips to `false`, clear `readAt` to `undefined`.

- [ ] **Step 1: Append failing tests for PUT and DELETE**

Append to `lib/__tests__/api-links.test.ts`:

```typescript
import { PUT, DELETE } from "@/app/api/links/[id]/route";

describe("PUT /api/links/[id]", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      LINKS_PATH,
      JSON.stringify({
        links: [
          {
            id: "link-test-1",
            memo: "test memo https://example.com",
            urls: ["https://example.com"],
            primaryDomain: "example.com",
            read: false,
            source: "telegram",
            createdAt: "2026-04-07T00:00:00.000Z",
          },
        ],
      })
    );
  });

  it("marks a link as read and sets readAt", async () => {
    const req = new Request("http://localhost/api/links/link-test-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "link-test-1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.read).toBe(true);
    expect(body.data.readAt).toBeDefined();
  });

  it("marks a link as unread and clears readAt", async () => {
    // first mark read
    const markReq = new Request("http://localhost/api/links/link-test-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    await PUT(markReq, { params: Promise.resolve({ id: "link-test-1" }) });

    // then mark unread
    const req = new Request("http://localhost/api/links/link-test-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: false }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "link-test-1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.read).toBe(false);
    expect(body.data.readAt).toBeUndefined();
  });

  it("rejects invalid body (missing read)", async () => {
    const req = new Request("http://localhost/api/links/link-test-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "link-test-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown id", async () => {
    const req = new Request("http://localhost/api/links/nope", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/links/[id]", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      LINKS_PATH,
      JSON.stringify({
        links: [
          {
            id: "link-test-2",
            memo: "delete me",
            urls: ["https://example.com"],
            primaryDomain: "example.com",
            read: false,
            source: "telegram",
            createdAt: "2026-04-07T00:00:00.000Z",
          },
        ],
      })
    );
  });

  it("removes a link", async () => {
    const req = new Request("http://localhost/api/links/link-test-2", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "link-test-2" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toBeNull();

    const getRes = await GET();
    const getBody = await getRes.json();
    expect(getBody.data).toHaveLength(0);
  });

  it("returns 404 for unknown id", async () => {
    const req = new Request("http://localhost/api/links/nope", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run to verify failures**

Run: `npx vitest run lib/__tests__/api-links.test.ts`
Expected: FAIL — module `@/app/api/links/[id]/route` does not exist.

- [ ] **Step 3: Implement `app/api/links/[id]/route.ts`**

Create `app/api/links/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { readLinkStore, writeLinkStore } from "@/lib/link-store";
import type { Link, ApiResponse } from "@/types";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Link>>> {
  try {
    const { id } = await params;
    const body: { read?: boolean } = await request.json();

    if (typeof body.read !== "boolean") {
      return NextResponse.json(
        { error: "read는 boolean이어야 합니다." },
        { status: 400 }
      );
    }

    const store = await readLinkStore();
    const index = store.links.findIndex((l) => l.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: "링크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    store.links[index].read = body.read;
    if (body.read) {
      store.links[index].readAt = new Date().toISOString();
    } else {
      delete store.links[index].readAt;
    }

    await writeLinkStore(store);
    return NextResponse.json({ data: store.links[index] });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params;
    const store = await readLinkStore();
    const index = store.links.findIndex((l) => l.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: "링크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    store.links.splice(index, 1);
    await writeLinkStore(store);
    return NextResponse.json({ data: null });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/__tests__/api-links.test.ts`
Expected: PASS, all tests in the file (2 GET + 4 PUT + 2 DELETE = 8).

- [ ] **Step 5: Commit**

```bash
git add app/api/links/[id]/route.ts lib/__tests__/api-links.test.ts
git commit -m "feat(links): add PUT and DELETE /api/links/[id] endpoints"
```

---

## Task 6: Telegram poller core logic (TDD)

**Files:**
- Create: `lib/telegram-poller.ts`
- Test: `lib/__tests__/telegram-poller.test.ts`

The poller is split into:
1. **Pure helpers** (`isAuthorized`, `extractDomain`, `messageInputForLink`) — easy to unit test.
2. **`processUpdate`** — the side-effecting one-update handler. Takes an injectable `fetch` and a store. Tested by stubbing `fetch` and verifying calls + final store state.
3. **`TelegramPoller` class** — the loop. Has `start()` / `stop()`. Tests only smoke-test that `start` calls `fetchUpdates` once and that `stop` halts the loop.

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/telegram-poller.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs/promises";
import {
  isAuthorized,
  extractDomain,
  processUpdate,
  TelegramPoller,
  type TelegramUpdate,
} from "../telegram-poller";
import { LINKS_PATH, readLinkStore } from "../link-store";
import { DATA_DIR } from "../store";

const ALLOWED_CHAT_ID = 12345;

function makeUpdate(overrides: Partial<TelegramUpdate> = {}): TelegramUpdate {
  return {
    update_id: 1,
    message: {
      message_id: 100,
      chat: { id: ALLOWED_CHAT_ID },
      text: "https://example.com",
      entities: [{ type: "url", offset: 0, length: 19 }],
    },
    ...overrides,
  };
}

describe("isAuthorized", () => {
  it("returns true when chat id matches", () => {
    expect(
      isAuthorized({ message_id: 1, chat: { id: 12345 }, text: "x" }, 12345)
    ).toBe(true);
  });

  it("returns false when chat id does not match", () => {
    expect(
      isAuthorized({ message_id: 1, chat: { id: 99 }, text: "x" }, 12345)
    ).toBe(false);
  });
});

describe("extractDomain", () => {
  it("returns domain for https URL", () => {
    expect(extractDomain("https://www.react.dev/blog")).toBe("www.react.dev");
  });

  it("returns domain for http URL", () => {
    expect(extractDomain("http://example.com")).toBe("example.com");
  });

  it("returns empty string for invalid URL", () => {
    expect(extractDomain("not a url")).toBe("");
  });
});

describe("processUpdate", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(LINKS_PATH, JSON.stringify({ links: [] }));
  });

  afterEach(async () => {
    try { await fs.unlink(LINKS_PATH); } catch {}
  });

  it("saves a new link and replies on success", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    await processUpdate(makeUpdate(), {
      token: "test",
      allowedChatId: ALLOWED_CHAT_ID,
      sendMessage,
    });

    const store = await readLinkStore();
    expect(store.links).toHaveLength(1);
    expect(store.links[0].urls).toEqual(["https://example.com"]);
    expect(store.links[0].primaryDomain).toBe("example.com");
    expect(store.links[0].telegramMessageId).toBe(100);
    expect(sendMessage).toHaveBeenCalledWith(
      ALLOWED_CHAT_ID,
      expect.stringContaining("저장")
    );
  });

  it("skips messages from unauthorized chats", async () => {
    const sendMessage = vi.fn();
    const update = makeUpdate({
      message: {
        message_id: 1,
        chat: { id: 99999 },
        text: "https://example.com",
      },
    });
    await processUpdate(update, {
      token: "test",
      allowedChatId: ALLOWED_CHAT_ID,
      sendMessage,
    });

    const store = await readLinkStore();
    expect(store.links).toHaveLength(0);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("replies but does not save when message has no text", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const update = makeUpdate({
      message: { message_id: 1, chat: { id: ALLOWED_CHAT_ID } },
    });
    await processUpdate(update, {
      token: "test",
      allowedChatId: ALLOWED_CHAT_ID,
      sendMessage,
    });

    const store = await readLinkStore();
    expect(store.links).toHaveLength(0);
    expect(sendMessage).toHaveBeenCalledWith(
      ALLOWED_CHAT_ID,
      expect.stringContaining("텍스트")
    );
  });

  it("replies but does not save when text has no URLs", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const update = makeUpdate({
      message: {
        message_id: 1,
        chat: { id: ALLOWED_CHAT_ID },
        text: "그냥 메모입니다",
      },
    });
    await processUpdate(update, {
      token: "test",
      allowedChatId: ALLOWED_CHAT_ID,
      sendMessage,
    });

    const store = await readLinkStore();
    expect(store.links).toHaveLength(0);
    expect(sendMessage).toHaveBeenCalledWith(
      ALLOWED_CHAT_ID,
      expect.stringContaining("URL")
    );
  });

  it("dedupes by telegram message id", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    await processUpdate(makeUpdate(), {
      token: "test",
      allowedChatId: ALLOWED_CHAT_ID,
      sendMessage,
    });
    // Same update again
    await processUpdate(makeUpdate(), {
      token: "test",
      allowedChatId: ALLOWED_CHAT_ID,
      sendMessage,
    });

    const store = await readLinkStore();
    expect(store.links).toHaveLength(1);
  });

  it("preserves the original message text as memo", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const update = makeUpdate({
      message: {
        message_id: 1,
        chat: { id: ALLOWED_CHAT_ID },
        text: "오늘 본 글 https://react.dev #react 좋다",
        entities: [{ type: "url", offset: 7, length: 17 }],
      },
    });
    await processUpdate(update, {
      token: "test",
      allowedChatId: ALLOWED_CHAT_ID,
      sendMessage,
    });

    const store = await readLinkStore();
    expect(store.links[0].memo).toBe("오늘 본 글 https://react.dev #react 좋다");
  });
});

describe("TelegramPoller (smoke)", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(LINKS_PATH, JSON.stringify({ links: [] }));
  });

  afterEach(async () => {
    try { await fs.unlink(LINKS_PATH); } catch {}
  });

  it("calls fetch with the correct URL on start, then halts when stopped", async () => {
    let resolveFetch: ((v: Response) => void) | null = null;
    const fetchSpy = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const poller = new TelegramPoller({
      token: "TESTTOKEN",
      allowedChatId: ALLOWED_CHAT_ID,
      timeoutSec: 1,
      fetch: fetchSpy as unknown as typeof fetch,
    });
    poller.start();

    // Allow microtasks to schedule the first fetch
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toContain("/botTESTTOKEN/getUpdates");
    expect(fetchSpy.mock.calls[0][0]).toContain("timeout=1");

    poller.stop();
    // Resolve the pending fetch with an empty result so the loop sees stopped state
    if (resolveFetch) {
      (resolveFetch as (v: Response) => void)(
        new Response(JSON.stringify({ ok: true, result: [] }), { status: 200 })
      );
    }
    await new Promise((r) => setTimeout(r, 10));

    // After stop, no further fetches
    const callsAfterStop = fetchSpy.mock.calls.length;
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchSpy.mock.calls.length).toBe(callsAfterStop);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/__tests__/telegram-poller.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `lib/telegram-poller.ts`**

Create `lib/telegram-poller.ts`:

```typescript
// lib/telegram-poller.ts — Telegram bot long-polling worker for the link archive.

import {
  addLink,
  findByTelegramMessageId,
  readLinkStore,
  writeLinkStore,
} from "@/lib/link-store";
import { extractUrls, type TelegramEntity } from "@/lib/url-extract";

/* ---------------------------------------------------------------- types --- */

export interface TelegramChat {
  id: number;
}

export interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  text?: string;
  entities?: TelegramEntity[];
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramGetUpdatesResponse {
  ok: boolean;
  result: TelegramUpdate[];
  description?: string;
}

/* ----------------------------------------------------------- pure helpers - */

export function isAuthorized(
  message: TelegramMessage,
  allowedChatId: number
): boolean {
  return message.chat?.id === allowedChatId;
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/* --------------------------------------------------------- side effects --- */

export interface ProcessUpdateConfig {
  token: string;
  allowedChatId: number;
  /** Telegram sendMessage shim — pass a stub in tests. */
  sendMessage: (chatId: number, text: string) => Promise<void>;
  debug?: boolean;
}

/**
 * Handle one Telegram update: validate, dedupe, save, and reply.
 *
 * Throws are caught by the caller (the poll loop) so a single bad update
 * does not kill the worker.
 */
export async function processUpdate(
  update: TelegramUpdate,
  config: ProcessUpdateConfig
): Promise<void> {
  const message = update.message;
  if (!message) return;

  if (config.debug) {
    console.log(
      `[link-poller] update ${update.update_id} from chat ${message.chat?.id}`
    );
  }

  if (!isAuthorized(message, config.allowedChatId)) {
    return; // silent: do not reveal the bot to strangers
  }

  if (!message.text || message.text.trim().length === 0) {
    await safeSend(
      config.sendMessage,
      message.chat.id,
      "텍스트 메시지만 처리합니다."
    );
    return;
  }

  // Idempotency: skip if we already saved this message
  const existing = await findByTelegramMessageId(message.message_id);
  if (existing) {
    return;
  }

  const urls = extractUrls(message.text, message.entities);
  if (urls.length === 0) {
    await safeSend(
      config.sendMessage,
      message.chat.id,
      "URL을 찾지 못했어요."
    );
    return;
  }

  await addLink({
    memo: message.text,
    urls,
    primaryDomain: extractDomain(urls[0]),
    source: "telegram",
    telegramMessageId: message.message_id,
  });

  await safeSend(config.sendMessage, message.chat.id, "✅ 저장됨");
}

async function safeSend(
  sendMessage: (chatId: number, text: string) => Promise<void>,
  chatId: number,
  text: string
): Promise<void> {
  try {
    await sendMessage(chatId, text);
  } catch (err) {
    console.warn("[link-poller] failed to reply:", err);
  }
}

/* ---------------------------------------------------- the polling worker - */

export interface PollerOptions {
  token: string;
  allowedChatId: number;
  /** getUpdates long-poll timeout in seconds. Default 30. */
  timeoutSec?: number;
  /** Logs each update for debugging. */
  debug?: boolean;
  /** Injectable fetch for tests. Defaults to global fetch. */
  fetch?: typeof fetch;
}

export class TelegramPoller {
  private readonly token: string;
  private readonly allowedChatId: number;
  private readonly timeoutSec: number;
  private readonly debug: boolean;
  private readonly fetchImpl: typeof fetch;
  private running = false;
  private offset: number | undefined;
  /** Backoff in ms; reset on success, doubles up to 60_000 on failure. */
  private backoffMs = 0;

  constructor(opts: PollerOptions) {
    this.token = opts.token;
    this.allowedChatId = opts.allowedChatId;
    this.timeoutSec = opts.timeoutSec ?? 30;
    this.debug = opts.debug ?? false;
    this.fetchImpl = opts.fetch ?? fetch;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private async loop(): Promise<void> {
    // Resume from persisted offset if any
    try {
      const store = await readLinkStore();
      if (store.lastUpdateId !== undefined) {
        this.offset = store.lastUpdateId + 1;
      }
    } catch {
      // ignore — pollOnce will create the file if needed
    }

    while (this.running) {
      try {
        const updates = await this.pollOnce();
        for (const update of updates) {
          if (!this.running) break;
          try {
            await processUpdate(update, {
              token: this.token,
              allowedChatId: this.allowedChatId,
              sendMessage: this.sendMessage.bind(this),
              debug: this.debug,
            });
            await this.persistOffset(update.update_id);
            this.offset = update.update_id + 1;
          } catch (err) {
            console.error("[link-poller] failed to process update", err);
            // Do not advance offset — will retry on next poll
            break;
          }
        }
        this.backoffMs = 0;
      } catch (err) {
        console.error("[link-poller] poll error:", err);
        this.backoffMs = Math.min(Math.max(this.backoffMs * 2, 2000), 60_000);
        await sleep(this.backoffMs);
      }
    }
  }

  private async pollOnce(): Promise<TelegramUpdate[]> {
    const params = new URLSearchParams({
      timeout: String(this.timeoutSec),
    });
    if (this.offset !== undefined) {
      params.set("offset", String(this.offset));
    }
    const url = `https://api.telegram.org/bot${this.token}/getUpdates?${params.toString()}`;

    const res = await this.fetchImpl(url);
    if (res.status === 401) {
      this.running = false;
      throw new Error("Telegram bot token is invalid (401). Stopping poller.");
    }
    if (!res.ok) {
      throw new Error(`Telegram getUpdates failed: ${res.status}`);
    }
    const body = (await res.json()) as TelegramGetUpdatesResponse;
    if (!body.ok) {
      throw new Error(`Telegram API error: ${body.description ?? "unknown"}`);
    }
    return body.result;
  }

  private async sendMessage(chatId: number, text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  }

  private async persistOffset(updateId: number): Promise<void> {
    const store = await readLinkStore();
    store.lastUpdateId = updateId;
    await writeLinkStore(store);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/__tests__/telegram-poller.test.ts`
Expected: PASS (3 + 6 + 1 = 10 tests).

If the smoke test for `TelegramPoller` is flaky on slower machines, you may bump the `await new Promise((r) => setTimeout(r, 0))` to `setTimeout(r, 10)`. Do not silently increase test timeouts otherwise.

- [ ] **Step 5: Run the full test suite to make sure nothing else broke**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/telegram-poller.ts lib/__tests__/telegram-poller.test.ts
git commit -m "feat(links): add telegram-poller with processUpdate and TelegramPoller loop"
```

---

## Task 7: instrumentation.ts boot hook + env vars

**Files:**
- Create: `instrumentation.ts` (project root, not inside `app/`)
- Modify: `.env.local.example`

This is the only place that touches `globalThis` or owns the polling singleton. The rest of the codebase imports `TelegramPoller` directly (e.g. tests).

**Reference:** `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md` confirms that `instrumentation.{js,ts}` at the project root exports a `register()` function called once per server instance and that `process.env.NEXT_RUNTIME === "nodejs"` should gate Node-only code.

- [ ] **Step 1: Create `instrumentation.ts` in the project root**

Create `instrumentation.ts` (NOT inside `app/`, the project root):

```typescript
// instrumentation.ts — Next.js boot hook. Starts the Telegram link poller once per server instance.

export async function register(): Promise<void> {
  // Only run on the Node.js server runtime (not Edge).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Opt-out switch for development.
  if (process.env.LINK_POLLER_ENABLED !== undefined && process.env.LINK_POLLER_ENABLED !== "true") {
    console.log("[link-poller] disabled via LINK_POLLER_ENABLED");
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIdRaw = process.env.TELEGRAM_ALLOWED_CHAT_ID;

  if (!token || !chatIdRaw) {
    console.warn(
      "[link-poller] disabled: TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_CHAT_ID are required"
    );
    return;
  }

  const allowedChatId = Number.parseInt(chatIdRaw, 10);
  if (!Number.isFinite(allowedChatId)) {
    console.warn(
      "[link-poller] disabled: TELEGRAM_ALLOWED_CHAT_ID must be an integer"
    );
    return;
  }

  // Survive HMR / module reloads in dev by parking the instance on globalThis.
  type Singleton = { __linkPoller?: { stop: () => void } };
  const g = globalThis as unknown as Singleton;
  if (g.__linkPoller) {
    g.__linkPoller.stop();
  }

  const { TelegramPoller } = await import("./lib/telegram-poller");
  const timeoutSec = Number.parseInt(
    process.env.LINK_POLLER_TIMEOUT_SEC ?? "30",
    10
  );
  const poller = new TelegramPoller({
    token,
    allowedChatId,
    timeoutSec,
    debug: process.env.LINK_POLLER_DEBUG === "true",
  });
  poller.start();
  g.__linkPoller = poller;
  console.log("[link-poller] started");
}
```

- [ ] **Step 2: Update `.env.local.example`**

Read the current contents:

```bash
cat .env.local.example
```

Append these lines (preserve any existing content):

```bash
# Telegram link archive bot
# 1. Create a bot via @BotFather → /newbot, get the token
# 2. Find your chat id by messaging @userinfobot
# 3. Restart the server (pm2 restart v-todo) — the poller starts automatically
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_CHAT_ID=
LINK_POLLER_ENABLED=true
LINK_POLLER_TIMEOUT_SEC=30
LINK_POLLER_DEBUG=false
```

- [ ] **Step 3: Smoke-test that `instrumentation.ts` is at the right path**

Run:

```bash
ls -la instrumentation.ts
```

Expected: file exists at `/Users/handongho/.openclaw/workspace/projects/v-todo/instrumentation.ts`. If you accidentally created it under `app/`, move it: `mv app/instrumentation.ts ./instrumentation.ts`.

- [ ] **Step 4: Verify the project still builds**

This is the cheapest way to confirm Next.js picks up `instrumentation.ts`. **Do not start the dev server** — just type-check.

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add instrumentation.ts .env.local.example
git commit -m "feat(links): start telegram poller from instrumentation.ts"
```

---

## Task 8: BottomNav adds the 5th tab

**Files:**
- Modify: `components/BottomNav.tsx`

Insert a new "링크" button between 노트 (lines 36–58) and 위시 (lines 60–77). Use a bookmark icon styled to match the existing pattern (filled when active, stroked when inactive).

- [ ] **Step 1: Add the link button**

In `components/BottomNav.tsx`, find the closing `</button>` of the 노트 button (around line 58, the line `</button>` immediately before `{/* 위시 */}`). Insert the following block on the next line, BEFORE `{/* 위시 */}`:

```tsx
        {/* 링크 */}
        <button
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            active === "link"
              ? "text-[var(--accent-primary)]"
              : "text-[var(--label-tertiary)]"
          }`}
          onClick={() => onChange("link")}
        >
          <svg width="25" height="25" viewBox="0 0 25 25" fill={active === "link" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active === "link" ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
            {active === "link" ? (
              <path d="M18 2H7C5.9 2 5 2.9 5 4v18l7-3 7 3V4c0-1.1-.9-2-2-2z" />
            ) : (
              <path d="M18 2H7C5.9 2 5 2.9 5 4v18l7-3 7 3V4c0-1.1-.9-2-2-2z" />
            )}
          </svg>
          <span className="text-[12px] font-medium">링크</span>
        </button>
```

- [ ] **Step 2: Verify the count of buttons is now 5**

Run:

```bash
grep -c "flex-1 flex flex-col items-center justify-center" components/BottomNav.tsx
```

Expected: `5`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors. `Section` type already includes `"link"` from Task 1.

- [ ] **Step 4: Commit**

```bash
git add components/BottomNav.tsx
git commit -m "feat(links): add 링크 tab to BottomNav"
```

---

## Task 9: LinkCard component

**Files:**
- Create: `components/LinkCard.tsx`

Renders a single link with linkified URLs and hashtag chips inside the memo, plus a domain label, relative time, and inline action buttons (read toggle, share, delete). The card itself is clickable and opens the first URL — internal URL anchors and tag chips use `stopPropagation` so they only fire their own handlers.

- [ ] **Step 1: Create the component**

Create `components/LinkCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Link } from "@/types";
import { extractTags } from "@/lib/tags";

interface LinkCardProps {
  link: Link;
  onToggleRead: (id: string, read: boolean) => void;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

/* -------------------------------------------------------- helpers --- */

const URL_INLINE_REGEX = /(https?:\/\/[^\s]+)/g;
const TAG_INLINE_REGEX = /(#[^\s#]+)/g;
// Combined regex used to split memo into renderable segments.
const SPLIT_REGEX = /(https?:\/\/[^\s]+|#[^\s#]+)/g;

type Segment =
  | { type: "text"; value: string }
  | { type: "url"; value: string }
  | { type: "tag"; value: string };

function splitMemo(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(SPLIT_REGEX)) {
    const i = match.index!;
    if (i > last) out.push({ type: "text", value: text.slice(last, i) });
    const v = match[0];
    if (v.startsWith("#")) out.push({ type: "tag", value: v.slice(1) });
    else out.push({ type: "url", value: v });
    last = i + v.length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "방금";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  if (diffSec < 86400 * 2) return "어제";
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ---------------------------------------------------- component --- */

export default function LinkCard({
  link,
  onToggleRead,
  onDelete,
  onTagClick,
}: LinkCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const segments = splitMemo(link.memo);
  const tagChips = extractTags(link.memo);
  const additionalUrls = link.urls.length - 1;

  const openUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCardClick = () => {
    if (link.urls.length > 0) openUrl(link.urls[0]);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = link.urls[0];
    const shareData = { text: link.memo, url };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${link.memo}\n${url}`);
      // Toast handled by parent? For first version: no toast — just silent copy.
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleCardClick();
      }}
      className={`relative rounded-2xl bg-[var(--sys-bg-elevated)] p-4 cursor-pointer transition-colors hover:bg-[var(--fill-quaternary)] ${
        link.read ? "opacity-60" : ""
      }`}
    >
      {/* Memo body — Body 20px */}
      <div className="text-[20px] leading-[26px] text-[var(--label-primary)] whitespace-pre-wrap break-words">
        {segments.map((seg, i) => {
          if (seg.type === "text") return <span key={i}>{seg.value}</span>;
          if (seg.type === "url") {
            return (
              <a
                key={i}
                href={seg.value}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[var(--accent-primary)] underline underline-offset-2 break-all"
              >
                {seg.value}
              </a>
            );
          }
          // tag
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(seg.value);
              }}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-full bg-[var(--accent-primary)]/12 text-[var(--accent-primary)] text-[15px] font-medium leading-tight align-baseline"
            >
              #{seg.value}
            </button>
          );
        })}
      </div>

      {/* Hashtag chip row (in addition to inline chips, for quick scanning) — Subheadline 17px */}
      {tagChips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tagChips.map((tag) => (
            <button
              key={tag}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(tag);
              }}
              className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/12 text-[var(--accent-primary)] text-[15px] font-medium"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Domain + relative time — Footnote 15px */}
      <div className="mt-2 flex items-center gap-2 text-[15px] text-[var(--label-tertiary)]">
        <span aria-hidden>🌐</span>
        <span className="truncate">{link.primaryDomain || "(no domain)"}</span>
        {additionalUrls > 0 && (
          <span className="px-1.5 py-0.5 rounded-md bg-[var(--fill-quaternary)] text-[13px]">
            +{additionalUrls}
          </span>
        )}
        <span>·</span>
        <span>{relativeTime(link.createdAt)}</span>
      </div>

      {/* Action row */}
      <div className="mt-3 flex items-center justify-end gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleRead(link.id, !link.read);
          }}
          className="px-3 py-1.5 rounded-lg bg-[var(--fill-quaternary)] text-[15px] text-[var(--label-primary)] active:opacity-70"
          aria-label={link.read ? "안 읽음으로" : "읽음으로"}
        >
          {link.read ? "↩ 안 읽음" : "✓ 읽음"}
        </button>
        <button
          onClick={handleShare}
          className="px-3 py-1.5 rounded-lg bg-[var(--fill-quaternary)] text-[15px] text-[var(--label-primary)] active:opacity-70"
          aria-label="공유"
        >
          📤 공유
        </button>
        {confirmDelete ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(link.id);
              }}
              className="px-3 py-1.5 rounded-lg bg-[var(--sys-red)] text-white text-[15px] font-semibold active:opacity-70"
            >
              삭제
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-[var(--fill-quaternary)] text-[15px] text-[var(--label-primary)] active:opacity-70"
            >
              취소
            </button>
          </>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-[var(--fill-quaternary)] text-[15px] text-[var(--label-primary)] active:opacity-70"
            aria-label="삭제"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
}
```

Note: A simple in-card "확인 → 삭제" toggle replaces the longer bottom-sheet flow described in the spec. This is a small simplification (still safe — two taps to delete) that keeps the component self-contained. The bottom-sheet action menu can be added later if the inline pattern proves cramped on small screens.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add components/LinkCard.tsx
git commit -m "feat(links): add LinkCard with linkified memo and inline actions"
```

---

## Task 10: LinkSection component

**Files:**
- Create: `components/LinkSection.tsx`

Wraps `SectionTabs` (읽지 않음 / 읽음) and renders a vertical list of `LinkCard`s for the active tab. Empty states match the spec.

- [ ] **Step 1: Create the component**

Create `components/LinkSection.tsx`:

```tsx
"use client";

import type { Link } from "@/types";
import SectionTabs from "@/components/SectionTabs";
import LinkCard from "@/components/LinkCard";

type LinkTab = "unread" | "read";

interface LinkSectionProps {
  links: Link[];
  activeTab: LinkTab;
  onTabChange: (tab: LinkTab) => void;
  onToggleRead: (id: string, read: boolean) => void;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

export default function LinkSection({
  links,
  activeTab,
  onTabChange,
  onToggleRead,
  onDelete,
  onTagClick,
}: LinkSectionProps) {
  const unread = links.filter((l) => !l.read);
  const read = links.filter((l) => l.read);
  const visible = activeTab === "unread" ? unread : read;

  const tabs = [
    { key: "unread", label: `읽지 않음${unread.length > 0 ? ` ${unread.length}` : ""}` },
    { key: "read", label: `읽음${read.length > 0 ? ` ${read.length}` : ""}` },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <SectionTabs
        tabs={tabs}
        active={activeTab}
        onChange={(key) => onTabChange(key as LinkTab)}
      />

      {visible.length === 0 ? (
        <EmptyState
          isFirstUse={links.length === 0}
          isReadTab={activeTab === "read"}
        />
      ) : (
        <div className="mx-4 md:mx-0 mt-3 flex flex-col gap-3">
          {visible.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              onToggleRead={onToggleRead}
              onDelete={onDelete}
              onTagClick={onTagClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  isFirstUse,
  isReadTab,
}: {
  isFirstUse: boolean;
  isReadTab: boolean;
}) {
  if (isFirstUse) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-[56px] opacity-30">🔗</span>
        <p className="text-[20px] text-[var(--label-tertiary)] text-center px-8">
          텔레그램에서 봇으로 링크를 보내면
          <br />
          여기에 모입니다.
        </p>
      </div>
    );
  }
  if (isReadTab) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-[56px] opacity-30">📚</span>
        <p className="text-[20px] text-[var(--label-tertiary)]">
          아직 읽은 링크가 없어요
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="text-[56px] opacity-30">📬</span>
      <p className="text-[20px] text-[var(--label-tertiary)] text-center">
        모두 읽었어요!
        <br />
        새 링크는 텔레그램 봇으로 보내주세요.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add components/LinkSection.tsx
git commit -m "feat(links): add LinkSection with unread/read tabs and empty states"
```

---

## Task 11: Wire LinkSection into app/page.tsx (state, fetch, actions, render, sidebar)

**Files:**
- Modify: `app/page.tsx`

This is the largest single edit. Take it in 5 small substeps so each one is reviewable.

- [ ] **Step 1: Add the import**

Find the imports near the top of `app/page.tsx` (around lines 1–22). After the existing `import HabitView from "@/components/HabitView";` line, add:

```tsx
import LinkSection from "@/components/LinkSection";
```

- [ ] **Step 2: Add state hooks at the top of `Home`**

Find the existing state hooks block (around lines 27–53). After `const [completingWish, setCompletingWish] = useState<WishItem | null>(null);`, add:

```tsx
  const [links, setLinks] = useState<Link[]>([]);
  const [linkTab, setLinkTab] = useState<"unread" | "read">("unread");
```

Also add `Link` to the type imports at line 4 (the `import type` line):

```tsx
import type { Todo, Schedule, ScheduleType, RepeatMode, Section, NoteTab, WishItem, WishCategory, Link } from "@/types";
```

- [ ] **Step 3: Add fetch + action functions**

Find the `fetchWishes` function (around lines 78–86) and the `useEffect` that calls it. After the `fetchWishes` definition and before the `useEffect`, add:

```tsx
  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/links`);
      const body = await res.json();
      if (body.data) setLinks(body.data);
    } catch (err) {
      console.error("Failed to fetch links:", err);
    }
  }, []);
```

Update the `useEffect` (currently `Promise.all([fetchTodos(), fetchSchedules(), fetchWishes()])`) to include `fetchLinks`:

```tsx
  useEffect(() => {
    Promise.all([fetchTodos(), fetchSchedules(), fetchWishes(), fetchLinks()]).finally(
      () => setLoading(false)
    );
  }, [fetchTodos, fetchSchedules, fetchWishes, fetchLinks]);
```

After the `deleteWish` function (around line 309), add the link action handlers:

```tsx
  // Link actions
  const toggleLinkRead = async (id: string, read: boolean) => {
    setLinks((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, read, readAt: read ? new Date().toISOString() : undefined }
          : l
      )
    );
    try {
      await fetch(`${BASE}/api/links/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });
    } catch (err) {
      console.error("Failed to toggle link read:", err);
      // best-effort: refetch on failure
      fetchLinks();
    }
  };

  const deleteLink = async (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    try {
      await fetch(`${BASE}/api/links/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete link:", err);
      fetchLinks();
    }
  };
```

- [ ] **Step 4: Render `LinkSection` when `section === "link"`**

Find the section rendering switch in the `Content` (or equivalent) part of `Home`. There will be conditional blocks like `{section === "wish" && (...)}` and `{section === "note" && (...)}`. Add a new block for links. The exact location is wherever the other section blocks live; it should look like:

```tsx
        {section === "link" && (
          <LinkSection
            links={links}
            activeTab={linkTab}
            onTabChange={setLinkTab}
            onToggleRead={toggleLinkRead}
            onDelete={deleteLink}
            onTagClick={(tag) => setActiveTag(tag)}
          />
        )}
```

If the existing code uses a `switch` statement instead, add a matching `case "link":` returning the same JSX.

- [ ] **Step 5: Add the link nav item to the desktop Sidebar**

Find the Sidebar (`const Sidebar = ()`) and locate the existing nav buttons (around lines 359 onward). Each button is a `<button>` with `setSection("...")` and an SVG. Add a new button between the 노트 button and the 위시 button:

```tsx
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
            section === "link"
              ? "bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]"
              : "text-[var(--label-primary)] hover:bg-[var(--fill-quaternary)]"
          }`}
          onClick={() => setSection("link")}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill={section === "link" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={section === "link" ? "0" : "1.6"} strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 1H6C5 1 4 2 4 3v18l7-3 7 3V3c0-1-1-2-2-2z" />
          </svg>
          <span className="text-[15px] font-medium flex-1">링크</span>
          {links.filter((l) => !l.read).length > 0 && (
            <span className="text-[13px] text-[var(--label-tertiary)]">
              {links.filter((l) => !l.read).length}
            </span>
          )}
        </button>
```

- [ ] **Step 6: Type-check and run all tests**

Run: `npx tsc --noEmit && npm test`
Expected: TypeScript clean, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx
git commit -m "feat(links): wire LinkSection into Home with state, fetch, actions"
```

---

## Task 12: CLAUDE.md bot setup guide + final manual verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the setup guide**

Read the current `CLAUDE.md` to find the right insertion point:

```bash
cat CLAUDE.md
```

Append the following section at the bottom of the file:

```markdown

## 텔레그램 링크 봇 설정

링크 아카이브 기능은 텔레그램 봇으로 받은 메시지를 자동 저장한다.

1. 텔레그램에서 `@BotFather`에게 `/newbot` 으로 봇 생성 → 토큰 받기
2. 본인 chat_id 확인: `@userinfobot` 에 아무 메시지나 보내고 응답에서 ID 확인
   - 또는 임시로 `LINK_POLLER_DEBUG=true`로 두고 봇에 메시지 보낸 뒤 서버 로그(`pm2 logs v-todo`)에서 확인
3. `.env.local`에 추가:
   ```
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_ALLOWED_CHAT_ID=...
   LINK_POLLER_ENABLED=true
   LINK_POLLER_TIMEOUT_SEC=30
   ```
4. 위 "배포" 절차대로 빌드 + 재시작
5. 봇에 URL이 있는 메시지 보내기 → "✅ 저장됨" 응답을 받으면 성공. v-todo "링크" 탭에서 확인.

폴링은 long polling 방식이라 공개 URL이나 webhook이 필요 없다. 다른 사람이 봇을 알아내도 `TELEGRAM_ALLOWED_CHAT_ID`로 잠겨 있어 무시된다.
```

- [ ] **Step 2: Run the full test suite one more time**

Run: `npm test`
Expected: All tests pass. Note the total count — it should include all the new test files (`url-extract`, `link-store`, `api-links`, `telegram-poller`).

- [ ] **Step 3: Final type check**

Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add telegram link bot setup guide"
```

- [ ] **Step 5: Manual QA checklist (do this with a real bot if you have one)**

Per CLAUDE.md deployment procedure:

```bash
pm2 stop v-todo
rm -rf .next
npx next build
pm2 start v-todo
pm2 save
```

Verify in `pm2 logs v-todo`:
- `[link-poller] started` (if env vars are set) OR `[link-poller] disabled: ...` (if not)
- No crash loop

Open the app, click the new "링크" tab. Verify:
- [ ] Tab is visible in BottomNav (mobile) and Sidebar (desktop)
- [ ] Empty state shows on first use ("텔레그램에서 봇으로 링크를 보내면 여기에 모입니다")
- [ ] Send a URL to the bot → within ~30 seconds the card appears in 읽지 않음
- [ ] Bot replies with "✅ 저장됨"
- [ ] Send a non-URL message to the bot → bot replies "URL을 찾지 못했어요", no card created
- [ ] Tap card → first URL opens in new tab
- [ ] Tap inline URL inside memo → that URL opens in new tab (verifies stopPropagation)
- [ ] Tap a hashtag chip → existing TagView filter triggers (existing behavior, unchanged)
- [ ] Tap "✓ 읽음" → card moves to "읽음" tab, count badges update
- [ ] Tap "↩ 안 읽음" on a read card → moves back
- [ ] Tap "📤 공유" → native share sheet appears (mobile) or clipboard copy (desktop)
- [ ] Tap "🗑" then "삭제" → card disappears
- [ ] Tap "🗑" then "취소" → card stays
- [ ] Send same message twice from telegram → only one card (idempotency)

If all check, you're done.

---

## Self-Review

After writing this plan, here is the spec coverage check against `docs/superpowers/specs/2026-04-07-link-archive-design.md`:

| Spec section | Implementing task(s) |
|---|---|
| § 1 동작 원칙 (save-only bot) | Task 6 `processUpdate` |
| § 1 폴링 방식 (long polling) | Task 6 `TelegramPoller.pollOnce` |
| § 1 워커 시작 방법 (instrumentation.ts) | Task 7 |
| § 1 싱글톤 보장 (`globalThis.__linkPoller`) | Task 7 |
| § 1 권한 (chat_id 잠금) | Task 6 `isAuthorized` |
| § 1 메시지 처리 파이프라인 | Task 6 `processUpdate` |
| § 1 URL 추출 | Task 2 |
| § 1 에러 처리 표 | Task 6 `loop` (backoff, 401 stop, dedupe) + Task 7 (token-missing warn) |
| § 2 데이터 모델 (`Link`, `LinkStore`) | Task 1 |
| § 2 `urls: string[]`, `primaryDomain` 캐싱, `source` 슬롯 | Task 1 + Task 6 (`extractDomain` cache) |
| § 2 이중 idempotency (`lastUpdateId` + `telegramMessageId`) | Task 3 (`findByTelegramMessageId`) + Task 6 (`persistOffset`) |
| § 2 해시태그 별도 필드 없음 (lib/tags.ts 재사용) | Task 9 (`splitMemo`, `extractTags`) |
| § 3 API 라우트 (GET, PUT, DELETE) | Tasks 4, 5 |
| § 4 위치 (BottomNav 5번째 탭, 노트와 위시 사이) | Task 8 |
| § 4 LinkSection (탭 + 카운트) | Task 10 |
| § 4 LinkCard (카드 디자인) | Task 9 |
| § 4 인터랙션 (탭 → URL 열기, stopPropagation) | Task 9 |
| § 4 빈 상태 | Task 10 `EmptyState` |
| § 4 다크/라이트 테마 + 폰트 사이즈 | Task 9, Task 10 (Catppuccin vars + 20/17/15px) |
| § 5 공유 동작 (Web Share API + 클립보드 폴백) | Task 9 `handleShare` |
| § 6 컴포넌트 구조 정리 | All tasks (file structure table at top) |
| § 7 봇 설정 가이드 | Task 12 (CLAUDE.md) + Task 7 (.env.local.example) |
| § 8 테스트 전략 | Tasks 2, 3, 5, 6 (TDD throughout) |
| § 9 명시적 비범위 | (intentionally not implemented) |

**Deviations from spec, with reasoning:**

1. **Action menu is inline buttons, not a bottom sheet.** The spec § 4 specifies a bottom sheet that displays the full memo and lists multiple URLs. Task 9 implements an inline action row instead, with a two-tap delete confirmation. Rationale: simpler component, fewer files, and the multi-URL case is rare (most messages have one URL). The bottom sheet can be added later as a refinement if needed. The full-memo view is achieved by tapping the inline URLs and hashtag chips directly. **If you (or the user) prefer the spec-exact bottom sheet, raise it before starting Task 9 and I'll revise the task.**

2. **Spec § 5 "showToast" on clipboard fallback** — Task 9 currently logs silently on clipboard success. v-todo's existing toast pattern (`UndoToast`) is bound to undo flows, not generic notifications. Rather than introduce a new toast system in this plan, the share fallback is silent. A small status message could be added in a follow-up.

**Placeholder scan:** No "TBD" / "TODO" / "implement later" / vague-error-handling steps. Every code step has complete code.

**Type consistency check:**
- `Link` field names match across tasks: `id`, `memo`, `urls`, `primaryDomain`, `read`, `source`, `telegramMessageId`, `createdAt`, `readAt`.
- API request body for PUT is `{ read: boolean }` — used in Task 5 (route), Task 11 (page.tsx fetch call), and the test in Task 5.
- `processUpdate` config shape (`token`, `allowedChatId`, `sendMessage`, `debug`) is consistent in Task 6 and Task 7.
- `addLink` input shape matches its callers in Task 6.
- `LinkSection` props (`links`, `activeTab`, `onTabChange`, `onToggleRead`, `onDelete`, `onTagClick`) match its consumer in Task 11.
