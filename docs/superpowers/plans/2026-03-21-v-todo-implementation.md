# v-todo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Eisenhower Matrix todo app with Gemini AI integration (suggest, cleanup, briefing), served as a responsive web app on Tailscale network.

**Architecture:** Next.js 15 App Router with JSON file storage. Server-side API routes handle CRUD and Gemini AI calls. Single-page client with `useState` + `fetch`. Mobile shows one quadrant at a time with bottom tabs; PC shows 2x2 grid.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, `@google/generative-ai`, `uuid`, `react-markdown`, `@tailwindcss/typography`

**Spec:** `docs/superpowers/specs/2026-03-21-v-todo-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `types/index.ts` | All shared TypeScript types |
| `lib/store.ts` | JSON file read/write with atomic writes |
| `lib/gemini.ts` | Gemini API client singleton |
| `lib/prompts.ts` | AI prompt templates |
| `app/api/todos/route.ts` | GET (list all), POST (create) |
| `app/api/todos/[id]/route.ts` | PUT (update), DELETE (delete) |
| `app/api/ai/suggest/route.ts` | POST — AI todo suggestion |
| `app/api/ai/cleanup/route.ts` | POST — AI todo cleanup analysis |
| `app/api/ai/cleanup/apply/route.ts` | POST — apply selected cleanup changes |
| `app/api/ai/briefing/route.ts` | GET — daily briefing |
| `app/globals.css` | Tailwind v4 imports + design tokens + fonts |
| `app/layout.tsx` | Root layout with fonts, metadata |
| `app/page.tsx` | Main page — state, fetch, quadrant routing |
| `components/TabBar.tsx` | Bottom tab bar (mobile) |
| `components/QuadrantGrid.tsx` | 2x2 grid wrapper (PC) |
| `components/QuadrantPanel.tsx` | Single quadrant panel (shared mobile/PC) |
| `components/TodoItem.tsx` | Single todo row |
| `components/TodoInput.tsx` | New todo input form |
| `components/AiActions.tsx` | Floating AI action buttons |
| `components/AiSuggestPreview.tsx` | AI suggestion checklist modal |
| `components/AiCleanupDiff.tsx` | AI cleanup diff with accept/reject |
| `components/BriefingModal.tsx` | Daily briefing sheet |
| `components/Toast.tsx` | Toast notification component |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `postcss.config.mjs`, `next.config.ts`, `.env.local`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `data/todos.json`

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/handongho/.openclaw/workspace/projects/v-todo
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
```

Select defaults. This creates the base Next.js 15 + Tailwind project.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install @google/generative-ai uuid react-markdown @tailwindcss/typography
npm install -D @types/uuid
```

- [ ] **Step 3: Create `.env.local`**

```bash
# .env.local
GEMINI_API_KEY=your_api_key_here
```

- [ ] **Step 4: Download Pretendard font files**

```bash
mkdir -p public/fonts
# Download Pretendard Variable woff2
curl -L -o public/fonts/PretendardVariable.woff2 "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/woff2/PretendardVariable.woff2"
```

- [ ] **Step 5: Configure `app/globals.css` with Tailwind v4 + design tokens**

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@font-face {
  font-family: "Pretendard";
  src: url("/fonts/PretendardVariable.woff2") format("woff2-variations");
  font-weight: 45 920;
  font-style: normal;
  font-display: swap;
}

@theme inline {
  --font-sans: "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Light mode tokens */
  --color-bg: #FFFFFF;
  --color-surface: #F5F5F7;
  --color-ai-bg: #F0EBFF;
  --color-text-primary: #1D1D1F;
  --color-text-secondary: #6E6E73;
  --color-accent: #007AFF;
  --color-destructive: #FF3B30;
  --color-overdue: #FF3B30;
  --color-separator: #D1D1D6;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #000000;
    --color-surface: #1C1C1E;
    --color-ai-bg: #2C2640;
    --color-text-primary: #F5F5F7;
    --color-text-secondary: #98989D;
    --color-accent: #0A84FF;
    --color-destructive: #FF453A;
    --color-overdue: #FF453A;
    --color-separator: #38383A;
  }
}

.safe-area-pt {
  padding-top: env(safe-area-inset-top);
}

.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-pr {
  padding-right: env(safe-area-inset-right);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 6: Configure `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "v-todo",
  description: "아이젠하워 매트릭스 기반 Todo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Create placeholder `app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="min-h-dvh bg-(--color-bg) text-(--color-text-primary)">
      <h1 className="text-2xl font-bold p-4">v-todo</h1>
    </main>
  );
}
```

- [ ] **Step 8: Create initial `data/todos.json`**

```json
{ "todos": [] }
```

- [ ] **Step 9: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts at http://localhost:3000, shows "v-todo" heading.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 project with Tailwind v4 and design tokens"
```

---

## Task 2: Types

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Create all shared types**

```typescript
// types/index.ts

export type Quadrant =
  | "urgent-important"
  | "urgent-not-important"
  | "not-urgent-important"
  | "not-urgent-not-important";

export interface Todo {
  id: string;
  title: string;
  quadrant: Quadrant;
  completed: boolean;
  aiGenerated: boolean;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface TodoStore {
  todos: Todo[];
}

export interface CreateTodoRequest {
  title: string;
  quadrant: Quadrant;
  dueDate?: string | null;
  aiGenerated?: boolean;
}

export interface UpdateTodoRequest {
  title?: string;
  quadrant?: Quadrant;
  completed?: boolean;
  dueDate?: string | null;
}

export interface AiSuggestRequest {
  quadrant: Quadrant;
}

export interface AiSuggestResponse {
  suggestions: { title: string; dueDate: string | null }[];
}

export interface AiCleanupRequest {
  quadrant: Quadrant;
}

export interface AiCleanupChange {
  type: "edit" | "merge" | "delete";
  originalIds: string[];
  newTitle: string | null;
  dueDate?: string | null;
}

export interface AiCleanupResponse {
  changes: AiCleanupChange[];
}

export interface AiCleanupApplyRequest {
  quadrant: Quadrant;
  changes: AiCleanupChange[];
}

export interface AiBriefingResponse {
  briefing: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export const QUADRANT_LABELS: Record<Quadrant, string> = {
  "urgent-important": "지금 하기",
  "urgent-not-important": "위임하기",
  "not-urgent-important": "계획하기",
  "not-urgent-not-important": "나중에",
};

export const QUADRANT_ORDER: Quadrant[] = [
  "urgent-important",
  "not-urgent-important",
  "urgent-not-important",
  "not-urgent-not-important",
];
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add shared TypeScript types and constants"
```

---

## Task 3: JSON Store

**Files:**
- Create: `lib/store.ts`, `lib/__tests__/store.test.ts`

- [ ] **Step 1: Write failing tests for store**

```typescript
// lib/__tests__/store.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { readTodos, writeTodos, DATA_PATH } from "../store";
import type { Todo } from "@/types";

const TEST_DATA_DIR = path.join(process.cwd(), "data");
const TEST_DATA_PATH = path.join(TEST_DATA_DIR, "todos.json");

describe("store", () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
    await fs.writeFile(TEST_DATA_PATH, JSON.stringify({ todos: [] }));
  });

  afterEach(async () => {
    try {
      await fs.unlink(TEST_DATA_PATH);
    } catch {}
    try {
      await fs.unlink(path.join(TEST_DATA_DIR, "todos.tmp.json"));
    } catch {}
  });

  it("reads empty todos from file", async () => {
    const todos = await readTodos();
    expect(todos).toEqual([]);
  });

  it("writes and reads todos", async () => {
    const todo: Todo = {
      id: "test-1",
      title: "Test todo",
      quadrant: "urgent-important",
      completed: false,
      aiGenerated: false,
      dueDate: null,
      createdAt: "2026-03-21T09:00:00Z",
      completedAt: null,
    };
    await writeTodos([todo]);
    const todos = await readTodos();
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe("Test todo");
  });

  it("creates file if not exists", async () => {
    await fs.unlink(TEST_DATA_PATH);
    const todos = await readTodos();
    expect(todos).toEqual([]);
  });

  it("recovers from corrupted JSON", async () => {
    await fs.writeFile(TEST_DATA_PATH, "not valid json{{{");
    const todos = await readTodos();
    expect(todos).toEqual([]);
  });
});
```

- [ ] **Step 2: Install vitest and configure**

```bash
npm install -D vitest @vitejs/plugin-react
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
npm test -- lib/__tests__/store.test.ts
```

Expected: FAIL — `readTodos` and `writeTodos` not found.

- [ ] **Step 4: Implement store**

```typescript
// lib/store.ts
import fs from "fs/promises";
import path from "path";
import type { Todo, TodoStore } from "@/types";

export const DATA_DIR = path.join(process.cwd(), "data");
export const DATA_PATH = path.join(DATA_DIR, "todos.json");
const TMP_PATH = path.join(DATA_DIR, "todos.tmp.json");

export async function readTodos(): Promise<Todo[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed: TodoStore = JSON.parse(raw);
    return parsed.todos;
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(DATA_PATH, JSON.stringify({ todos: [] }));
      return [];
    }
    // Corrupted JSON — reset
    console.error("Failed to parse todos.json, resetting:", err);
    await fs.writeFile(DATA_PATH, JSON.stringify({ todos: [] }));
    return [];
  }
}

export async function writeTodos(todos: Todo[]): Promise<void> {
  const data: TodoStore = { todos };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(data, null, 2));
  await fs.rename(TMP_PATH, DATA_PATH);
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm test -- lib/__tests__/store.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/store.ts lib/__tests__/store.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat: add JSON store with atomic writes and tests"
```

---

## Task 4: Todo CRUD API Routes

**Files:**
- Create: `app/api/todos/route.ts`, `app/api/todos/[id]/route.ts`, `lib/__tests__/api-todos.test.ts`

- [ ] **Step 1: Write failing tests for todos API**

```typescript
// lib/__tests__/api-todos.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs/promises";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "todos.json");
const BASE_URL = "http://localhost:3000";

// These are integration tests — run with dev server active
// For unit testing, we test the store directly (Task 3)
// Here we test the API contract with direct handler imports

import { GET, POST } from "@/app/api/todos/route";

describe("GET /api/todos", () => {
  beforeEach(async () => {
    await fs.writeFile(DATA_PATH, JSON.stringify({ todos: [] }));
  });

  it("returns empty array initially", async () => {
    const req = new Request("http://localhost/api/todos");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});

describe("POST /api/todos", () => {
  beforeEach(async () => {
    await fs.writeFile(DATA_PATH, JSON.stringify({ todos: [] }));
  });

  it("creates a todo", async () => {
    const req = new Request("http://localhost/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "테스트 할 일",
        quadrant: "urgent-important",
      }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.title).toBe("테스트 할 일");
    expect(body.data.quadrant).toBe("urgent-important");
    expect(body.data.completed).toBe(false);
    expect(body.data.aiGenerated).toBe(false);
    expect(body.data.id).toBeDefined();
  });

  it("rejects empty title", async () => {
    const req = new Request("http://localhost/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", quadrant: "urgent-important" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects title over 200 chars", async () => {
    const req = new Request("http://localhost/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "a".repeat(201),
        quadrant: "urgent-important",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects invalid quadrant", async () => {
    const req = new Request("http://localhost/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "test", quadrant: "invalid" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- lib/__tests__/api-todos.test.ts
```

Expected: FAIL — route files don't exist.

- [ ] **Step 3: Implement `app/api/todos/route.ts`**

```typescript
// app/api/todos/route.ts
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readTodos, writeTodos } from "@/lib/store";
import type { CreateTodoRequest, Quadrant, Todo, ApiResponse } from "@/types";

const VALID_QUADRANTS: Quadrant[] = [
  "urgent-important",
  "urgent-not-important",
  "not-urgent-important",
  "not-urgent-not-important",
];

export async function GET(): Promise<NextResponse<ApiResponse<Todo[]>>> {
  try {
    const todos = await readTodos();
    return NextResponse.json({ data: todos });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<Todo>>> {
  try {
    const body: CreateTodoRequest = await request.json();

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
    }
    if (body.title.trim().length === 0 || body.title.length > 200) {
      return NextResponse.json(
        { error: "제목은 1~200자여야 합니다." },
        { status: 400 }
      );
    }
    if (!VALID_QUADRANTS.includes(body.quadrant)) {
      return NextResponse.json(
        { error: "올바른 분면을 선택해주세요." },
        { status: 400 }
      );
    }

    const todo: Todo = {
      id: uuidv4(),
      title: body.title.trim(),
      quadrant: body.quadrant,
      completed: false,
      aiGenerated: body.aiGenerated === true,
      dueDate: body.dueDate ?? null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    const todos = await readTodos();
    todos.push(todo);
    await writeTodos(todos);

    return NextResponse.json({ data: todo }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implement `app/api/todos/[id]/route.ts`**

```typescript
// app/api/todos/[id]/route.ts
import { NextResponse } from "next/server";
import { readTodos, writeTodos } from "@/lib/store";
import type { UpdateTodoRequest, Quadrant, Todo, ApiResponse } from "@/types";

const VALID_QUADRANTS: Quadrant[] = [
  "urgent-important",
  "urgent-not-important",
  "not-urgent-important",
  "not-urgent-not-important",
];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Todo>>> {
  try {
    const { id } = await params;
    const body: UpdateTodoRequest = await request.json();
    const todos = await readTodos();
    const index = todos.findIndex((t) => t.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "투두를 찾을 수 없습니다." }, { status: 404 });
    }

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim().length === 0 || body.title.length > 200) {
        return NextResponse.json({ error: "제목은 1~200자여야 합니다." }, { status: 400 });
      }
      todos[index].title = body.title.trim();
    }

    if (body.quadrant !== undefined) {
      if (!VALID_QUADRANTS.includes(body.quadrant)) {
        return NextResponse.json({ error: "올바른 분면을 선택해주세요." }, { status: 400 });
      }
      todos[index].quadrant = body.quadrant;
    }

    if (body.completed !== undefined) {
      todos[index].completed = body.completed;
      todos[index].completedAt = body.completed ? new Date().toISOString() : null;
    }

    if (body.dueDate !== undefined) {
      todos[index].dueDate = body.dueDate;
    }

    await writeTodos(todos);
    return NextResponse.json({ data: todos[index] });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params;
    const todos = await readTodos();
    const index = todos.findIndex((t) => t.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "투두를 찾을 수 없습니다." }, { status: 404 });
    }

    todos.splice(index, 1);
    await writeTodos(todos);
    return NextResponse.json({ data: null });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm test -- lib/__tests__/api-todos.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/todos/ lib/__tests__/api-todos.test.ts
git commit -m "feat: add todo CRUD API routes with validation"
```

---

## Task 5: Gemini Client & Prompts

**Files:**
- Create: `lib/gemini.ts`, `lib/prompts.ts`, `lib/__tests__/prompts.test.ts`

- [ ] **Step 1: Write tests for prompt generation**

```typescript
// lib/__tests__/prompts.test.ts
import { describe, it, expect } from "vitest";
import { buildSuggestPrompt, buildCleanupPrompt, buildBriefingPrompt } from "../prompts";
import type { Todo } from "@/types";

const sampleTodo: Todo = {
  id: "1",
  title: "서버 점검",
  quadrant: "urgent-important",
  completed: false,
  aiGenerated: false,
  dueDate: "2026-03-25",
  createdAt: "2026-03-21T09:00:00Z",
  completedAt: null,
};

describe("buildSuggestPrompt", () => {
  it("includes quadrant label and todo list", () => {
    const prompt = buildSuggestPrompt("urgent-important", [sampleTodo]);
    expect(prompt).toContain("지금 하기");
    expect(prompt).toContain("서버 점검");
    expect(prompt).toContain("JSON");
  });
});

describe("buildCleanupPrompt", () => {
  it("includes todo IDs and titles", () => {
    const prompt = buildCleanupPrompt([sampleTodo]);
    expect(prompt).toContain("1");
    expect(prompt).toContain("서버 점검");
  });
});

describe("buildBriefingPrompt", () => {
  it("includes today's date and todos", () => {
    const prompt = buildBriefingPrompt([sampleTodo]);
    expect(prompt).toContain("서버 점검");
    expect(prompt).toContain("지금 하기");
    expect(prompt).toContain("2026-03-25");
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- lib/__tests__/prompts.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `lib/prompts.ts`**

```typescript
// lib/prompts.ts
import { QUADRANT_LABELS } from "@/types";
import type { Quadrant, Todo } from "@/types";

export function buildSuggestPrompt(quadrant: Quadrant, todos: Todo[]): string {
  const label = QUADRANT_LABELS[quadrant];
  const list = todos.map((t) => `- ${t.title}${t.dueDate ? ` (마감: ${t.dueDate})` : ""}`).join("\n");

  return `당신은 할 일 관리 도우미입니다.
아래는 아이젠하워 매트릭스의 "${label}" 분면에 있는 현재 할 일 목록입니다:

${list || "(비어 있음)"}

이 목록을 보고 빠져 있을 수 있는 할 일을 3~5개 제안해주세요.
반드시 아래 JSON 형식으로만 응답하세요:
[{"title": "할 일 제목", "dueDate": "YYYY-MM-DD" 또는 null}]`;
}

export function buildCleanupPrompt(todos: Todo[]): string {
  const list = todos.map((t) => `- [${t.id}] ${t.title}`).join("\n");

  return `당신은 할 일 정리 도우미입니다.
아래는 할 일 목록입니다:

${list}

중복 제거, 문장 다듬기, 유사 항목 병합을 제안해주세요.
반드시 아래 JSON 형식으로만 응답하세요:
[{"type": "edit"|"merge"|"delete", "originalIds": ["id1"], "newTitle": "정리된 제목" 또는 null, "dueDate": "YYYY-MM-DD" 또는 null}]`;
}

export function buildBriefingPrompt(todos: Todo[]): string {
  const today = new Date().toISOString().split("T")[0];
  const list = todos
    .map(
      (t) =>
        `- [${QUADRANT_LABELS[t.quadrant]}] ${t.title}${t.dueDate ? ` (마감: ${t.dueDate})` : ""}`
    )
    .join("\n");

  return `당신은 일일 업무 브리핑 도우미입니다.
오늘 날짜: ${today}

아래는 사용자의 전체 미완료 할 일 목록입니다:
${list || "(할 일이 없습니다)"}

오늘 집중해야 할 항목을 우선순위별로 정리하고,
마감이 임박하거나 지난 항목을 강조해서 간결한 브리핑을 작성해주세요.
마크다운 형식으로 응답하세요.`;
}
```

- [ ] **Step 4: Implement `lib/gemini.ts`**

```typescript
// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export function getJsonModel() {
  return genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  });
}

export function getTextModel() {
  return genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  });
}

const AI_TIMEOUT_MS = 15_000;

export async function generateJson<T>(prompt: string): Promise<T> {
  const model = getJsonModel();
  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI request timeout")), AI_TIMEOUT_MS)
    ),
  ]);
  const text = result.response.text();
  return JSON.parse(text) as T;
}

export async function generateText(prompt: string): Promise<string> {
  const model = getTextModel();
  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI request timeout")), AI_TIMEOUT_MS)
    ),
  ]);
  return result.response.text();
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm test -- lib/__tests__/prompts.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/gemini.ts lib/prompts.ts lib/__tests__/prompts.test.ts
git commit -m "feat: add Gemini client and AI prompt templates"
```

---

## Task 6: AI API Routes

**Files:**
- Create: `app/api/ai/suggest/route.ts`, `app/api/ai/cleanup/route.ts`, `app/api/ai/cleanup/apply/route.ts`, `app/api/ai/briefing/route.ts`

- [ ] **Step 1: Implement `app/api/ai/suggest/route.ts`**

```typescript
// app/api/ai/suggest/route.ts
import { NextResponse } from "next/server";
import { readTodos } from "@/lib/store";
import { generateJson } from "@/lib/gemini";
import { buildSuggestPrompt } from "@/lib/prompts";
import type { AiSuggestRequest, AiSuggestResponse, ApiResponse, Quadrant } from "@/types";

const VALID_QUADRANTS: Quadrant[] = [
  "urgent-important", "urgent-not-important",
  "not-urgent-important", "not-urgent-not-important",
];

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<AiSuggestResponse>>> {
  try {
    const body: AiSuggestRequest = await request.json();

    if (!VALID_QUADRANTS.includes(body.quadrant)) {
      return NextResponse.json({ error: "올바른 분면을 선택해주세요." }, { status: 400 });
    }

    const todos = await readTodos();
    const quadrantTodos = todos.filter(
      (t) => t.quadrant === body.quadrant && !t.completed
    );
    const prompt = buildSuggestPrompt(body.quadrant, quadrantTodos);
    const suggestions = await generateJson<AiSuggestResponse["suggestions"]>(prompt);

    return NextResponse.json({ data: { suggestions } });
  } catch (err) {
    console.error("AI suggest error:", err);
    return NextResponse.json(
      { error: "AI 서비스를 사용할 수 없습니다." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Implement `app/api/ai/cleanup/route.ts`**

```typescript
// app/api/ai/cleanup/route.ts
import { NextResponse } from "next/server";
import { readTodos } from "@/lib/store";
import { generateJson } from "@/lib/gemini";
import { buildCleanupPrompt } from "@/lib/prompts";
import type { AiCleanupRequest, AiCleanupResponse, ApiResponse, Quadrant } from "@/types";

const VALID_QUADRANTS: Quadrant[] = [
  "urgent-important", "urgent-not-important",
  "not-urgent-important", "not-urgent-not-important",
];

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<AiCleanupResponse>>> {
  try {
    const body: AiCleanupRequest = await request.json();

    if (!VALID_QUADRANTS.includes(body.quadrant)) {
      return NextResponse.json({ error: "올바른 분면을 선택해주세요." }, { status: 400 });
    }

    const todos = await readTodos();
    const quadrantTodos = todos.filter(
      (t) => t.quadrant === body.quadrant && !t.completed
    );

    if (quadrantTodos.length === 0) {
      return NextResponse.json({ data: { changes: [] } });
    }

    const prompt = buildCleanupPrompt(quadrantTodos);
    const changes = await generateJson<AiCleanupResponse["changes"]>(prompt);

    return NextResponse.json({ data: { changes } });
  } catch (err) {
    console.error("AI cleanup error:", err);
    return NextResponse.json(
      { error: "AI 서비스를 사용할 수 없습니다." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Implement `app/api/ai/cleanup/apply/route.ts`**

```typescript
// app/api/ai/cleanup/apply/route.ts
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readTodos, writeTodos } from "@/lib/store";
import type { AiCleanupApplyRequest, Todo, ApiResponse } from "@/types";

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<Todo[]>>> {
  try {
    const body: AiCleanupApplyRequest = await request.json();
    const todos = await readTodos();

    for (const change of body.changes) {
      if (change.type === "edit") {
        const todo = todos.find((t) => t.id === change.originalIds[0]);
        if (todo && change.newTitle) {
          todo.title = change.newTitle;
        }
      } else if (change.type === "merge") {
        // Remove all originals
        const idsToRemove = new Set(change.originalIds);
        const originals = todos.filter((t) => idsToRemove.has(t.id));
        // Find earliest non-null dueDate
        const dueDates = originals
          .map((t) => t.dueDate)
          .filter((d): d is string => d !== null)
          .sort();

        // Remove originals from array
        for (let i = todos.length - 1; i >= 0; i--) {
          if (idsToRemove.has(todos[i].id)) {
            todos.splice(i, 1);
          }
        }

        // Add merged item
        if (change.newTitle) {
          const merged: Todo = {
            id: uuidv4(),
            title: change.newTitle,
            quadrant: body.quadrant,
            completed: false,
            aiGenerated: true,
            dueDate: change.dueDate ?? dueDates[0] ?? null,
            createdAt: new Date().toISOString(),
            completedAt: null,
          };
          todos.push(merged);
        }
      } else if (change.type === "delete") {
        const idsToRemove = new Set(change.originalIds);
        for (let i = todos.length - 1; i >= 0; i--) {
          if (idsToRemove.has(todos[i].id)) {
            todos.splice(i, 1);
          }
        }
      }
    }

    await writeTodos(todos);
    return NextResponse.json({ data: todos });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implement `app/api/ai/briefing/route.ts`**

```typescript
// app/api/ai/briefing/route.ts
import { NextResponse } from "next/server";
import { readTodos } from "@/lib/store";
import { generateText } from "@/lib/gemini";
import { buildBriefingPrompt } from "@/lib/prompts";
import type { AiBriefingResponse, ApiResponse } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<AiBriefingResponse>>> {
  try {
    const todos = await readTodos();
    const incompleteTodos = todos.filter((t) => !t.completed);

    if (incompleteTodos.length === 0) {
      return NextResponse.json({
        data: { briefing: "오늘은 등록된 할 일이 없습니다. 여유로운 하루 되세요!" },
      });
    }

    const prompt = buildBriefingPrompt(incompleteTodos);
    const briefing = await generateText(prompt);

    return NextResponse.json({ data: { briefing } });
  } catch (err) {
    console.error("AI briefing error:", err);
    return NextResponse.json(
      { error: "AI 서비스를 사용할 수 없습니다." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Verify all API routes compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/ai/
git commit -m "feat: add AI API routes (suggest, cleanup, cleanup/apply, briefing)"
```

---

## Task 7: Toast Component

**Files:**
- Create: `components/Toast.tsx`

- [ ] **Step 1: Implement Toast**

```tsx
// components/Toast.tsx
"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-(--color-surface) text-(--color-text-primary) shadow-lg border border-(--color-separator) text-sm max-w-80 text-center">
      {message}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Toast.tsx
git commit -m "feat: add Toast notification component"
```

---

## Task 8: Core UI Components

**Files:**
- Create: `components/TodoItem.tsx`, `components/TodoInput.tsx`, `components/QuadrantPanel.tsx`

- [ ] **Step 1: Implement `components/TodoItem.tsx`**

```tsx
// components/TodoItem.tsx
"use client";

import type { Todo } from "@/types";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isOverdue = !todo.completed && todo.dueDate && todo.dueDate < todayStr;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
        todo.aiGenerated ? "bg-(--color-ai-bg)" : "bg-(--color-surface)"
      } ${todo.completed ? "opacity-50" : ""}`}
    >
      <button
        onClick={() => onToggle(todo.id, !todo.completed)}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          todo.completed
            ? "bg-(--color-accent) border-(--color-accent)"
            : "border-(--color-separator)"
        }`}
        aria-label={todo.completed ? "미완료로 변경" : "완료로 변경"}
      >
        {todo.completed && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight ${todo.completed ? "line-through text-(--color-text-secondary)" : ""}`}>
          {todo.title}
        </p>
        {todo.dueDate && (
          <p className={`text-xs mt-0.5 ${isOverdue ? "text-(--color-overdue) font-medium" : "text-(--color-text-secondary)"}`}>
            {isOverdue ? "⚠ " : ""}{todo.dueDate}
          </p>
        )}
      </div>

      <button
        onClick={() => onDelete(todo.id)}
        className="text-(--color-text-secondary) hover:text-(--color-destructive) transition-colors p-1 flex-shrink-0"
        aria-label="삭제"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Implement `components/TodoInput.tsx`**

```tsx
// components/TodoInput.tsx
"use client";

import { useState } from "react";
import type { Quadrant } from "@/types";

interface TodoInputProps {
  quadrant: Quadrant;
  onAdd: (title: string, quadrant: Quadrant, dueDate: string | null) => void;
}

export default function TodoInput({ quadrant, onAdd }: TodoInputProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || trimmed.length > 200) return;
    onAdd(trimmed, quadrant, dueDate || null);
    setTitle("");
    setDueDate("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 px-4 py-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="할 일 추가..."
        maxLength={200}
        className="flex-1 bg-(--color-surface) rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-(--color-accent) text-(--color-text-primary) placeholder:text-(--color-text-secondary)"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="bg-(--color-surface) rounded-lg px-2 py-2 text-xs text-(--color-text-secondary) outline-none focus:ring-2 focus:ring-(--color-accent) w-32"
      />
      <button
        type="submit"
        disabled={!title.trim()}
        className="bg-(--color-accent) text-white rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40 transition-opacity"
      >
        추가
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Implement `components/QuadrantPanel.tsx`**

```tsx
// components/QuadrantPanel.tsx
"use client";

import { useState } from "react";
import type { Todo, Quadrant } from "@/types";
import { QUADRANT_LABELS } from "@/types";
import TodoItem from "./TodoItem";
import TodoInput from "./TodoInput";

interface QuadrantPanelProps {
  quadrant: Quadrant;
  todos: Todo[];
  isActive: boolean;
  onSelect: () => void;
  onAdd: (title: string, quadrant: Quadrant, dueDate: string | null) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export default function QuadrantPanel({
  quadrant,
  todos,
  isActive,
  onSelect,
  onAdd,
  onToggle,
  onDelete,
}: QuadrantPanelProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  const incomplete = todos
    .filter((t) => !t.completed)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const completed = todos
    .filter((t) => t.completed)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div
      onClick={onSelect}
      className={`flex flex-col h-full bg-(--color-bg) rounded-2xl overflow-hidden border transition-colors ${
        isActive ? "border-(--color-accent)" : "border-(--color-separator)"
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-2.5 border-b border-(--color-separator) ${
          isActive ? "border-t-2 border-t-(--color-accent)" : ""
        }`}
      >
        <h2 className="text-sm font-semibold">{QUADRANT_LABELS[quadrant]}</h2>
      </div>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {incomplete.length === 0 && completed.length === 0 && (
          <p className="text-(--color-text-secondary) text-sm text-center py-8">
            할 일을 추가해보세요
          </p>
        )}
        {incomplete.map((todo) => (
          <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
        ))}

        {completed.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCompleted(!showCompleted);
            }}
            className="text-xs text-(--color-text-secondary) px-2 py-1"
          >
            완료됨 ({completed.length}) {showCompleted ? "▲" : "▼"}
          </button>
        )}
        {showCompleted &&
          completed.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
          ))}
      </div>

      {/* Input */}
      <div className="border-t border-(--color-separator)">
        <TodoInput quadrant={quadrant} onAdd={onAdd} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify components compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add components/TodoItem.tsx components/TodoInput.tsx components/QuadrantPanel.tsx
git commit -m "feat: add core UI components (TodoItem, TodoInput, QuadrantPanel)"
```

---

## Task 9: Navigation Components

**Files:**
- Create: `components/TabBar.tsx`, `components/QuadrantGrid.tsx`

- [ ] **Step 1: Implement `components/TabBar.tsx` (mobile)**

```tsx
// components/TabBar.tsx
"use client";

import type { Quadrant } from "@/types";
import { QUADRANT_LABELS, QUADRANT_ORDER } from "@/types";

interface TabBarProps {
  active: Quadrant;
  onChange: (q: Quadrant) => void;
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-(--color-bg) border-t border-(--color-separator) flex md:hidden safe-area-pb z-40">
      {QUADRANT_ORDER.map((q) => (
        <button
          key={q}
          onClick={() => onChange(q)}
          className={`flex-1 py-3 text-xs font-medium text-center transition-colors ${
            active === q
              ? "text-(--color-accent)"
              : "text-(--color-text-secondary)"
          }`}
        >
          {QUADRANT_LABELS[q]}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Implement `components/QuadrantGrid.tsx` (PC)**

```tsx
// components/QuadrantGrid.tsx
"use client";

import type { Todo, Quadrant } from "@/types";
import { QUADRANT_ORDER } from "@/types";
import QuadrantPanel from "./QuadrantPanel";

interface QuadrantGridProps {
  todos: Todo[];
  activeQuadrant: Quadrant;
  onSelectQuadrant: (q: Quadrant) => void;
  onAdd: (title: string, quadrant: Quadrant, dueDate: string | null) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export default function QuadrantGrid({
  todos,
  activeQuadrant,
  onSelectQuadrant,
  onAdd,
  onToggle,
  onDelete,
}: QuadrantGridProps) {
  return (
    <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-3 flex-1 p-3 min-h-0">
      {QUADRANT_ORDER.map((q) => (
        <QuadrantPanel
          key={q}
          quadrant={q}
          todos={todos.filter((t) => t.quadrant === q)}
          isActive={activeQuadrant === q}
          onSelect={() => onSelectQuadrant(q)}
          onAdd={onAdd}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/TabBar.tsx components/QuadrantGrid.tsx
git commit -m "feat: add TabBar (mobile) and QuadrantGrid (PC) navigation"
```

---

## Task 10: Main Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Implement main page with state management**

```tsx
// app/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Todo, Quadrant, ApiResponse } from "@/types";
import { QUADRANT_LABELS } from "@/types";
import TabBar from "@/components/TabBar";
import QuadrantGrid from "@/components/QuadrantGrid";
import QuadrantPanel from "@/components/QuadrantPanel";
import Toast from "@/components/Toast";

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [activeQuadrant, setActiveQuadrant] = useState<Quadrant>("urgent-important");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/todos");
      const body: ApiResponse<Todo[]> = await res.json();
      if (body.data) setTodos(body.data);
    } catch {
      setError("할 일을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAdd = async (title: string, quadrant: Quadrant, dueDate: string | null) => {
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, quadrant, dueDate }),
      });
      const body: ApiResponse<Todo> = await res.json();
      if (!res.ok) {
        setError(body.error || "추가에 실패했습니다.");
        return;
      }
      await fetchTodos();
    } catch {
      setError("추가에 실패했습니다.");
    }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) {
        const body: ApiResponse<null> = await res.json();
        setError(body.error || "수정에 실패했습니다.");
        return;
      }
      await fetchTodos();
    } catch {
      setError("수정에 실패했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body: ApiResponse<null> = await res.json();
        setError(body.error || "삭제에 실패했습니다.");
        return;
      }
      await fetchTodos();
    } catch {
      setError("삭제에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <main className="min-h-dvh bg-(--color-bg) flex items-center justify-center">
        <div className="animate-pulse text-(--color-text-secondary)">불러오는 중...</div>
      </main>
    );
  }

  const activeTodos = todos.filter((t) => t.quadrant === activeQuadrant);

  return (
    <main className="min-h-dvh bg-(--color-bg) flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-(--color-separator) safe-area-pt">
        <h1 className="text-lg font-bold">v-todo</h1>
        <button
          id="briefing-btn"
          className="text-sm text-(--color-accent) font-medium"
        >
          브리핑
        </button>
      </header>

      {/* PC: 2x2 Grid */}
      <QuadrantGrid
        todos={todos}
        activeQuadrant={activeQuadrant}
        onSelectQuadrant={setActiveQuadrant}
        onAdd={handleAdd}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />

      {/* Mobile: Single quadrant */}
      <div className="flex-1 md:hidden overflow-hidden">
        <QuadrantPanel
          quadrant={activeQuadrant}
          todos={activeTodos}
          isActive={true}
          onSelect={() => {}}
          onAdd={handleAdd}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      </div>

      {/* Mobile: Bottom tab bar */}
      <TabBar active={activeQuadrant} onChange={setActiveQuadrant} />

      {/* Toast */}
      {error && <Toast message={error} onClose={() => setError(null)} />}
    </main>
  );
}
```

- [ ] **Step 2: Verify dev server renders correctly**

```bash
npm run dev
```

Open http://localhost:3000. Expected: Header with "v-todo" + "브리핑" button. Mobile: single panel with tabs. Resize to ≥768px: 2x2 grid. Can add/toggle/delete todos.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: implement main page with CRUD and responsive layout"
```

---

## Task 11: AI UI — Suggest & Actions

**Files:**
- Create: `components/AiSuggestPreview.tsx`, `components/AiActions.tsx`

- [ ] **Step 1: Implement `components/AiSuggestPreview.tsx`**

```tsx
// components/AiSuggestPreview.tsx
"use client";

import { useState } from "react";
import type { AiSuggestResponse } from "@/types";

interface AiSuggestPreviewProps {
  suggestions: AiSuggestResponse["suggestions"];
  onAccept: (selected: AiSuggestResponse["suggestions"]) => void;
  onClose: () => void;
}

export default function AiSuggestPreview({
  suggestions,
  onAccept,
  onClose,
}: AiSuggestPreviewProps) {
  const [checked, setChecked] = useState<boolean[]>(
    suggestions.map(() => true)
  );

  const toggle = (i: number) => {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const handleAccept = () => {
    const selected = suggestions.filter((_, i) => checked[i]);
    onAccept(selected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
      <div className="bg-(--color-bg) rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col safe-area-pb">
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-separator)">
          <h3 className="text-base font-semibold">AI 제안</h3>
          <button onClick={onClose} className="text-(--color-text-secondary) text-sm">
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {suggestions.map((s, i) => (
            <label
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-(--color-surface) cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => toggle(i)}
                className="w-4 h-4 accent-(--color-accent)"
              />
              <div className="flex-1">
                <p className="text-sm">{s.title}</p>
                {s.dueDate && (
                  <p className="text-xs text-(--color-text-secondary) mt-0.5">
                    마감: {s.dueDate}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-(--color-separator)">
          <button
            onClick={handleAccept}
            disabled={!checked.some(Boolean)}
            className="w-full bg-(--color-accent) text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
          >
            선택한 항목 추가
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `components/AiActions.tsx`**

```tsx
// components/AiActions.tsx
"use client";

interface AiActionsProps {
  onSuggest: () => void;
  onCleanup: () => void;
  loading: boolean;
}

export default function AiActions({ onSuggest, onCleanup, loading }: AiActionsProps) {
  return (
    <div className="fixed bottom-16 md:bottom-4 right-4 flex flex-col gap-2 z-40 safe-area-pr">
      <button
        onClick={onSuggest}
        disabled={loading}
        className="bg-(--color-accent) text-white rounded-full px-4 py-2.5 text-sm font-medium shadow-lg disabled:opacity-50 transition-opacity"
      >
        {loading ? "..." : "AI 제안"}
      </button>
      <button
        onClick={onCleanup}
        disabled={loading}
        className="bg-(--color-surface) text-(--color-text-primary) rounded-full px-4 py-2.5 text-sm font-medium shadow-lg border border-(--color-separator) disabled:opacity-50 transition-opacity"
      >
        {loading ? "..." : "AI 정리"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/AiSuggestPreview.tsx components/AiActions.tsx
git commit -m "feat: add AI suggest preview modal and action buttons"
```

---

## Task 12: AI UI — Cleanup Diff & Briefing

**Files:**
- Create: `components/AiCleanupDiff.tsx`, `components/BriefingModal.tsx`

- [ ] **Step 1: Implement `components/AiCleanupDiff.tsx`**

```tsx
// components/AiCleanupDiff.tsx
"use client";

import { useState } from "react";
import type { AiCleanupChange } from "@/types";

interface AiCleanupDiffProps {
  changes: AiCleanupChange[];
  onApply: (accepted: AiCleanupChange[]) => void;
  onClose: () => void;
}

const TYPE_LABELS = {
  edit: "수정",
  merge: "병합",
  delete: "삭제",
};

export default function AiCleanupDiff({
  changes,
  onApply,
  onClose,
}: AiCleanupDiffProps) {
  const [accepted, setAccepted] = useState<boolean[]>(
    changes.map(() => true)
  );

  const toggle = (i: number) => {
    setAccepted((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const handleApply = () => {
    const selected = changes.filter((_, i) => accepted[i]);
    onApply(selected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
      <div className="bg-(--color-bg) rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col safe-area-pb">
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-separator)">
          <h3 className="text-base font-semibold">AI 정리 제안</h3>
          <button onClick={onClose} className="text-(--color-text-secondary) text-sm">
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {changes.length === 0 && (
            <p className="text-(--color-text-secondary) text-sm text-center py-8">
              정리할 항목이 없습니다.
            </p>
          )}
          {changes.map((c, i) => (
            <label
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl bg-(--color-surface) cursor-pointer"
            >
              <input
                type="checkbox"
                checked={accepted[i]}
                onChange={() => toggle(i)}
                className="w-4 h-4 accent-(--color-accent) mt-0.5"
              />
              <div className="flex-1">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  c.type === "delete"
                    ? "bg-(--color-destructive)/10 text-(--color-destructive)"
                    : "bg-(--color-accent)/10 text-(--color-accent)"
                }`}>
                  {TYPE_LABELS[c.type]}
                </span>
                {c.newTitle && (
                  <p className="text-sm mt-1">→ {c.newTitle}</p>
                )}
                {c.type === "delete" && (
                  <p className="text-sm mt-1 text-(--color-text-secondary)">
                    항목 삭제
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>

        {changes.length > 0 && (
          <div className="px-4 py-3 border-t border-(--color-separator)">
            <button
              onClick={handleApply}
              disabled={!accepted.some(Boolean)}
              className="w-full bg-(--color-accent) text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
            >
              선택한 변경 적용
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `components/BriefingModal.tsx`**

```tsx
// components/BriefingModal.tsx
"use client";

import ReactMarkdown from "react-markdown";

interface BriefingModalProps {
  briefing: string;
  onClose: () => void;
}

export default function BriefingModal({ briefing, onClose }: BriefingModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
      <div className="bg-(--color-bg) rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col safe-area-pb">
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-separator)">
          <h3 className="text-base font-semibold">오늘의 브리핑</h3>
          <button onClick={onClose} className="text-(--color-text-secondary) text-sm">
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 prose prose-sm dark:prose-invert max-w-none text-(--color-text-primary)">
          <ReactMarkdown>{briefing}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/AiCleanupDiff.tsx components/BriefingModal.tsx
git commit -m "feat: add AI cleanup diff and daily briefing modals"
```

---

## Task 13: Wire AI Features into Main Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update `app/page.tsx` to integrate all AI features**

Add these imports at the top of `app/page.tsx`:

```tsx
import AiActions from "@/components/AiActions";
import AiSuggestPreview from "@/components/AiSuggestPreview";
import AiCleanupDiff from "@/components/AiCleanupDiff";
import BriefingModal from "@/components/BriefingModal";
import type {
  Todo, Quadrant, ApiResponse,
  AiSuggestResponse, AiCleanupResponse, AiCleanupChange, AiBriefingResponse,
} from "@/types";
```

Add these state variables inside `Home()` (after existing state):

```tsx
const [aiLoading, setAiLoading] = useState(false);
const [suggestions, setSuggestions] = useState<AiSuggestResponse["suggestions"] | null>(null);
const [cleanupChanges, setCleanupChanges] = useState<AiCleanupChange[] | null>(null);
const [briefing, setBriefing] = useState<string | null>(null);
```

Add these handlers (after existing handlers):

```tsx
const handleSuggest = async () => {
  setAiLoading(true);
  try {
    const res = await fetch("/api/ai/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quadrant: activeQuadrant }),
    });
    const body: ApiResponse<AiSuggestResponse> = await res.json();
    if (!res.ok || !body.data) {
      setError(body.error || "AI 서비스를 사용할 수 없습니다.");
      return;
    }
    setSuggestions(body.data.suggestions);
  } catch {
    setError("AI 서비스를 사용할 수 없습니다.");
  } finally {
    setAiLoading(false);
  }
};

const handleAcceptSuggestions = async (
  selected: AiSuggestResponse["suggestions"]
) => {
  for (const s of selected) {
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: s.title,
        quadrant: activeQuadrant,
        dueDate: s.dueDate,
        aiGenerated: true,
      }),
    });
  }
  setSuggestions(null);
  await fetchTodos();
};

const handleCleanup = async () => {
  setAiLoading(true);
  try {
    const res = await fetch("/api/ai/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quadrant: activeQuadrant }),
    });
    const body: ApiResponse<AiCleanupResponse> = await res.json();
    if (!res.ok || !body.data) {
      setError(body.error || "AI 서비스를 사용할 수 없습니다.");
      return;
    }
    if (body.data.changes.length === 0) {
      setError("정리할 항목이 없습니다.");
      return;
    }
    setCleanupChanges(body.data.changes);
  } catch {
    setError("AI 서비스를 사용할 수 없습니다.");
  } finally {
    setAiLoading(false);
  }
};

const handleApplyCleanup = async (accepted: AiCleanupChange[]) => {
  try {
    await fetch("/api/ai/cleanup/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quadrant: activeQuadrant, changes: accepted }),
    });
    setCleanupChanges(null);
    await fetchTodos();
  } catch {
    setError("정리 적용에 실패했습니다.");
  }
};

const handleBriefing = async () => {
  setAiLoading(true);
  try {
    const res = await fetch("/api/ai/briefing");
    const body: ApiResponse<AiBriefingResponse> = await res.json();
    if (!res.ok || !body.data) {
      setError(body.error || "AI 서비스를 사용할 수 없습니다.");
      return;
    }
    setBriefing(body.data.briefing);
  } catch {
    setError("AI 서비스를 사용할 수 없습니다.");
  } finally {
    setAiLoading(false);
  }
};
```

Update the briefing button `onClick`:

```tsx
<button
  onClick={handleBriefing}
  disabled={aiLoading}
  className="text-sm text-(--color-accent) font-medium disabled:opacity-50"
>
  {aiLoading ? "..." : "브리핑"}
</button>
```

Add before the closing `</main>` tag (after TabBar and Toast):

```tsx
{/* AI Action Buttons */}
<AiActions
  onSuggest={handleSuggest}
  onCleanup={handleCleanup}
  loading={aiLoading}
/>

{/* AI Modals */}
{suggestions && (
  <AiSuggestPreview
    suggestions={suggestions}
    onAccept={handleAcceptSuggestions}
    onClose={() => setSuggestions(null)}
  />
)}
{cleanupChanges && (
  <AiCleanupDiff
    changes={cleanupChanges}
    onApply={handleApplyCleanup}
    onClose={() => setCleanupChanges(null)}
  />
)}
{briefing && (
  <BriefingModal
    briefing={briefing}
    onClose={() => setBriefing(null)}
  />
)}
```

- [ ] **Step 2: Verify all features work in dev**

```bash
npm run dev
```

Test: Add todos, toggle, delete, click AI 제안, AI 정리, 브리핑. All modals should open/close. AI features require valid `GEMINI_API_KEY` in `.env.local`.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx app/api/todos/route.ts
git commit -m "feat: wire AI features (suggest, cleanup, briefing) into main page"
```

---

## Task 14: Final Polish & Build Verification

**Files:**
- Modify: `app/globals.css` (safe area padding utilities)
- Verify: build

- [ ] **Step 1: Add global empty state to `app/page.tsx`**

After the loading check in `app/page.tsx`, add before the main return:

```tsx
if (todos.length === 0) {
  return (
    <main className="min-h-dvh bg-(--color-bg) flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold mb-2">v-todo</h1>
      <p className="text-(--color-text-secondary) text-center mb-6">
        아이젠하워 매트릭스로 할 일을 관리하세요
      </p>
      <div className="w-full max-w-sm">
        <TodoInput quadrant="urgent-important" onAdd={handleAdd} />
      </div>
    </main>
  );
}
```

Import `TodoInput` at the top if not already imported.

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Test production server**

```bash
npm start
```

Open http://localhost:3000. Verify: responsive layout, CRUD, dark mode toggle (system setting), AI features (if API key set).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: finalize MVP build and verify all tests pass"
```

---

## Summary

| Task | Description | Estimated Steps |
|------|------------|----------------|
| 1 | Project scaffolding | 10 |
| 2 | Types | 3 |
| 3 | JSON store + tests | 6 |
| 4 | Todo CRUD API + tests | 6 |
| 5 | Gemini client + prompts + tests | 6 |
| 6 | AI API routes | 6 |
| 7 | Toast component | 2 |
| 8 | Core UI components | 5 |
| 9 | Navigation components | 3 |
| 10 | Main page | 3 |
| 11 | AI suggest + actions UI | 3 |
| 12 | AI cleanup + briefing UI | 3 |
| 13 | Wire AI into main page | 3 |
| 14 | Polish & build verification | 5 |
| **Total** | | **64 steps** |
