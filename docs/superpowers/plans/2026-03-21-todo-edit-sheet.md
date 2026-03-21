# Todo Edit Bottom Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bottom sheet for editing todo items — title, quadrant, due date — and moving them between Eisenhower Matrix quadrants.

**Architecture:** TodoItem text tap → opens TodoEditSheet (new component). Sheet uses same ios-sheet pattern as BriefingModal. State managed in page.tsx via `editingTodo`. API: existing `PUT /api/todos/:id`.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, existing design system tokens

---

### Task 1: Create TodoEditSheet component

**Files:**
- Create: `components/TodoEditSheet.tsx`

**Reference patterns:**
- `components/BriefingModal.tsx` — sheet structure, overlay, animation classes
- `types/index.ts:73-85` — `QUADRANT_LABELS`, `QUADRANT_ORDER`
- `app/globals.css:207-223` — `ios-sheet`, `ios-sheet-overlay`, `drag-handle` classes

- [ ] **Step 1: Create `components/TodoEditSheet.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { Todo, Quadrant, UpdateTodoRequest } from "@/types";
import { QUADRANT_LABELS, QUADRANT_ORDER } from "@/types";

const QUADRANT_COLORS: Record<Quadrant, string> = {
  "urgent-important": "var(--q-urgent-important)",
  "urgent-not-important": "var(--q-urgent-not-important)",
  "not-urgent-important": "var(--q-not-urgent-important)",
  "not-urgent-not-important": "var(--q-not-urgent-not-important)",
};

const QUADRANT_TINTS: Record<Quadrant, string> = {
  "urgent-important": "var(--q-urgent-important-tint)",
  "urgent-not-important": "var(--q-urgent-not-important-tint)",
  "not-urgent-important": "var(--q-not-urgent-important-tint)",
  "not-urgent-not-important": "var(--q-not-urgent-not-important-tint)",
};

interface TodoEditSheetProps {
  todo: Todo;
  onSave: (id: string, updates: UpdateTodoRequest) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function TodoEditSheet({ todo, onSave, onDelete, onClose }: TodoEditSheetProps) {
  const [title, setTitle] = useState(todo.title);
  const [quadrant, setQuadrant] = useState<Quadrant>(todo.quadrant);
  const [dueDate, setDueDate] = useState<string>(todo.dueDate || "");
  const [saving, setSaving] = useState(false);

  const hasChanges =
    title.trim() !== todo.title ||
    quadrant !== todo.quadrant ||
    (dueDate || null) !== (todo.dueDate || null);

  const handleSave = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      const updates: UpdateTodoRequest = {};
      if (title.trim() !== todo.title) updates.title = title.trim();
      if (quadrant !== todo.quadrant) updates.quadrant = quadrant;
      if ((dueDate || null) !== (todo.dueDate || null)) updates.dueDate = dueDate || null;
      await onSave(todo.id, updates);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await onDelete(todo.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center ios-sheet-overlay"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="ios-sheet w-full max-w-lg max-h-[85dvh] flex flex-col rounded-t-[16px] md:rounded-[16px]"
        style={{
          background: "var(--sys-bg-elevated)",
          boxShadow: "var(--shadow-xl)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)",
        }}
      >
        <div className="drag-handle md:hidden" />

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-[14px]"
          style={{ borderBottom: "0.5px solid var(--sys-separator)" }}
        >
          <button
            onClick={onClose}
            className="text-[16px] font-normal w-[50px] text-left active:opacity-60 transition-opacity"
            style={{ color: "var(--sys-blue)" }}
          >
            취소
          </button>
          <h3 className="text-[16px] font-semibold" style={{ color: "var(--sys-label)" }}>
            편집
          </h3>
          <div className="w-[50px]" />
        </div>

        {/* Content */}
        <div className="px-5 py-5 flex flex-col gap-5 overflow-y-auto">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full text-[20px] font-semibold bg-transparent outline-none"
              style={{
                color: "var(--sys-label)",
                caretColor: "var(--sys-blue)",
              }}
              placeholder="할 일을 입력하세요"
            />
            <div className="mt-3" style={{ borderBottom: "0.5px solid var(--sys-separator)" }} />
          </div>

          {/* Quadrant Picker — 2x2 grid */}
          <div className="grid grid-cols-2 gap-[10px]">
            {QUADRANT_ORDER.map((q) => {
              const isSelected = quadrant === q;
              return (
                <button
                  key={q}
                  onClick={() => setQuadrant(q)}
                  className="flex items-center gap-[10px] px-[14px] py-[12px] rounded-[12px] transition-all active:scale-[0.97]"
                  style={{
                    background: isSelected ? QUADRANT_TINTS[q] : "var(--sys-fill-quaternary)",
                    border: isSelected
                      ? `1.5px solid ${QUADRANT_COLORS[q]}`
                      : "1.5px solid transparent",
                  }}
                >
                  <div
                    className="w-[3.5px] h-[18px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: QUADRANT_COLORS[q] }}
                  />
                  <span
                    className="text-[14px]"
                    style={{
                      color: "var(--sys-label)",
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {QUADRANT_LABELS[q]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Due Date */}
          <div
            className="flex items-center gap-[10px] min-h-[44px]"
            style={{ borderTop: "0.5px solid var(--sys-separator)", paddingTop: "16px" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
              <rect
                x="2.5" y="3" width="15" height="14.5" rx="2.5"
                stroke="var(--sys-label-tertiary)" strokeWidth="1.3"
              />
              <path d="M2.5 7.5h15" stroke="var(--sys-label-tertiary)" strokeWidth="1.3" />
              <path
                d="M6.5 1.5v3M13.5 1.5v3"
                stroke="var(--sys-label-tertiary)" strokeWidth="1.3" strokeLinecap="round"
              />
            </svg>
            <div className="flex-1 relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-[16px] bg-transparent outline-none appearance-none"
                style={{
                  color: dueDate ? "var(--sys-label)" : "var(--sys-label-tertiary)",
                  colorScheme: "light dark",
                }}
                placeholder="마감일 없음"
              />
            </div>
            {dueDate && (
              <button
                onClick={() => setDueDate("")}
                className="p-[6px] rounded-full active:bg-[var(--sys-fill-tertiary)] transition-colors"
                style={{ color: "var(--sys-label-tertiary)" }}
                aria-label="마감일 제거"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-3">
          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving || !title.trim()}
            className="w-full h-[50px] rounded-[14px] text-[16px] font-semibold transition-opacity disabled:opacity-40 active:opacity-80"
            style={{
              background: "var(--sys-blue)",
              color: "#FFFFFF",
            }}
          >
            {saving ? "저장 중..." : "저장"}
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={saving}
            className="w-full h-[44px] text-[16px] font-medium transition-opacity active:opacity-60 disabled:opacity-40"
            style={{ color: "var(--sys-red)" }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/handongho/.openclaw/workspace/projects/v-todo && npx next build`
Expected: Build succeeds (component not yet wired up, tree-shaking will ignore it)

- [ ] **Step 3: Commit**

```bash
git add components/TodoEditSheet.tsx
git commit -m "feat: add TodoEditSheet component"
```

---

### Task 2: Wire onEdit through TodoItem

**Files:**
- Modify: `components/TodoItem.tsx`

**What changes:**
- Add `onEdit: (todo: Todo) => void` to props
- Make the text/content area clickable (not the checkbox or delete button)

- [ ] **Step 1: Update TodoItem to accept and call onEdit**

Add `onEdit` to `TodoItemProps`:

```typescript
interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
}
```

Update component signature:

```typescript
export default function TodoItem({ todo, onToggle, onDelete, onEdit }: TodoItemProps) {
```

Wrap the content `<div>` (the flex-1 area between checkbox and delete button) with an `onClick`:

Replace the existing content div (`{/* Content */}` section, the `<div className="flex-1 min-w-0 flex items-center gap-2">`) with:

```tsx
      {/* Content — tappable to edit */}
      <button
        type="button"
        onClick={() => onEdit(todo)}
        className="flex-1 min-w-0 flex items-center gap-2 text-left"
      >
```

And close it with `</button>` instead of `</div>`.

- [ ] **Step 2: Commit**

```bash
git add components/TodoItem.tsx
git commit -m "feat: add onEdit prop to TodoItem"
```

---

### Task 3: Wire onEdit through QuadrantPanel

**Files:**
- Modify: `components/QuadrantPanel.tsx`

- [ ] **Step 1: Add onEdit to QuadrantPanelProps and pass to TodoItem**

Add to interface:

```typescript
  onEdit: (todo: Todo) => void;
```

Update component signature to destructure `onEdit`.

Pass to TodoItem:

```tsx
<TodoItem todo={todo} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
```

(Both the incomplete and completed `TodoItem` renders need this.)

- [ ] **Step 2: Commit**

```bash
git add components/QuadrantPanel.tsx
git commit -m "feat: pass onEdit through QuadrantPanel"
```

---

### Task 4: Wire onEdit through QuadrantGrid

**Files:**
- Modify: `components/QuadrantGrid.tsx`

- [ ] **Step 1: Add onEdit to QuadrantGridProps and pass to QuadrantPanel**

Add to interface:

```typescript
  onEdit: (todo: Todo) => void;
```

Update component signature to destructure `onEdit`.

Pass to each QuadrantPanel:

```tsx
<QuadrantPanel
  key={q}
  quadrant={q}
  todos={todos.filter((t) => t.quadrant === q)}
  isActive={activeQuadrant === q}
  onSelect={() => onSelectQuadrant(q)}
  onAdd={onAdd}
  onToggle={onToggle}
  onDelete={onDelete}
  onEdit={onEdit}
/>
```

- [ ] **Step 2: Commit**

```bash
git add components/QuadrantGrid.tsx
git commit -m "feat: pass onEdit through QuadrantGrid"
```

---

### Task 5: Wire everything in page.tsx

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add state and handler**

Add import at top:

```typescript
import TodoEditSheet from "@/components/TodoEditSheet";
```

Add state inside `Home`:

```typescript
const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
```

Add edit handler:

```typescript
const handleEdit = async (id: string, updates: UpdateTodoRequest) => {
  try {
    const res = await fetch(`/api/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const body: ApiResponse<null> = await res.json();
      setError(body.error || "수정에 실패했습니다.");
      return;
    }
    setEditingTodo(null);
    await fetchTodos();
  } catch { setError("수정에 실패했습니다."); }
};

const handleEditDelete = async (id: string) => {
  setEditingTodo(null);
  await handleDelete(id);
};
```

Add `UpdateTodoRequest` to the type import at the top.

- [ ] **Step 2: Pass onEdit to QuadrantGrid and mobile QuadrantPanel**

Desktop grid:

```tsx
<QuadrantGrid
  todos={todos}
  activeQuadrant={activeQuadrant}
  onSelectQuadrant={setActiveQuadrant}
  onAdd={handleAdd}
  onToggle={handleToggle}
  onDelete={handleDelete}
  onEdit={(todo) => setEditingTodo(todo)}
/>
```

Mobile panel:

```tsx
<QuadrantPanel
  quadrant={activeQuadrant}
  todos={activeTodos}
  isActive={true}
  onSelect={() => {}}
  onAdd={handleAdd}
  onToggle={handleToggle}
  onDelete={handleDelete}
  onEdit={(todo) => setEditingTodo(todo)}
/>
```

- [ ] **Step 3: Render TodoEditSheet**

Add before the `{error && ...}` line at the end of the main return:

```tsx
{editingTodo && (
  <TodoEditSheet
    todo={editingTodo}
    onSave={handleEdit}
    onDelete={handleEditDelete}
    onClose={() => setEditingTodo(null)}
  />
)}
```

- [ ] **Step 4: Build and verify**

Run: `cd /Users/handongho/.openclaw/workspace/projects/v-todo && npx next build`
Expected: Build succeeds with no type errors

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire TodoEditSheet into page with edit/delete handlers"
```

---

### Task 6: Manual smoke test

- [ ] **Step 1: Start dev server and test**

Run: `cd /Users/handongho/.openclaw/workspace/projects/v-todo && npm run dev`

Verify:
1. Tap todo text → edit sheet opens
2. Tap checkbox → toggles completion (sheet does NOT open)
3. Edit title → "저장" enables → tap saves
4. Change quadrant chip → "저장" enables → tap moves item to new quadrant
5. Change/clear due date → "저장" enables → tap saves
6. Tap "삭제" → item deleted, sheet closes
7. Tap "취소" or backdrop → sheet closes without saving
8. Desktop: sheet appears centered with full border-radius
9. Mobile: sheet appears bottom-aligned with top border-radius only

- [ ] **Step 2: Final commit if any fixes needed**
