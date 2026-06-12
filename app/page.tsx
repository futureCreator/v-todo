"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Todo, Schedule, ScheduleType, RepeatMode, Section, NoteTab } from "@/types";
import BottomNav from "@/components/BottomNav";
import SectionTabs from "@/components/SectionTabs";
import TodoItem from "@/components/TodoItem";
import TodoInput from "@/components/TodoInput";
import ScheduleItem, { getDisplayInfo } from "@/components/ScheduleItem";
import TimelineView from "@/components/TimelineView";
import AddScheduleSheet from "@/components/AddScheduleSheet";
import UndoToast from "@/components/UndoToast";
import DailyNoteView from "@/components/DailyNoteView";
import GeneralNoteView from "@/components/GeneralNoteView";
import YearProgress from "@/components/YearProgress";
import TagView from "@/components/TagView";
import EmptyState from "@/components/EmptyState";
import type { TodoTab } from "@/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function Home() {
  const [section, setSection] = useState<Section>("todo");
  const [todoTab, setTodoTab] = useState<TodoTab>("now");
  const [ddayTab, setDdayTab] = useState<"timeline" | "general" | "anniversary">("timeline");
  const [noteTab, setNoteTab] = useState<NoteTab>("daily");

  const [todos, setTodos] = useState<Todo[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);

  const [undoItem, setUndoItem] = useState<{
    todo: Todo;
    timeout: NodeJS.Timeout;
  } | null>(null);

  /* ── Swipe gesture ── */
  const touchRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/todos`);
      const body = await res.json();
      if (body.data) setTodos(body.data);
    } catch (err) {
      console.error("Failed to fetch todos:", err);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/schedules`);
      const body = await res.json();
      if (body.data) setSchedules(body.data);
    } catch (err) {
      console.error("Failed to fetch schedules:", err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount; setState runs after Promise resolves
    Promise.all([fetchTodos(), fetchSchedules()]).finally(
      () => setLoading(false)
    );
  }, [fetchTodos, fetchSchedules]);

  // Todo actions
  const addTodo = async (title: string) => {
    try {
      const res = await fetch(`${BASE}/api/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const body = await res.json();
      if (body.data) setTodos((prev) => [body.data, ...prev]);
    } catch (err) {
      console.error("Failed to add todo:", err);
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await fetch(`${BASE}/api/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    if (undoItem) clearTimeout(undoItem.timeout);
    const timeout = setTimeout(() => setUndoItem(null), 3000);
    setUndoItem({ todo, timeout });
  };

  const undoComplete = async () => {
    if (!undoItem) return;
    clearTimeout(undoItem.timeout);
    await fetch(`${BASE}/api/todos/${undoItem.todo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: false }),
    });
    setTodos((prev) => [undoItem.todo, ...prev]);
    setUndoItem(null);
  };

  const editTodo = async (id: string, title: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title } : t))
    );
    await fetch(`${BASE}/api/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  };

  const deleteTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await fetch(`${BASE}/api/todos/${id}`, { method: "DELETE" });
  };

  // Schedule actions
  const saveSchedule = async (data: {
    name: string;
    targetDate: string;
    originDate: string;
    type: ScheduleType;
    repeatMode: RepeatMode;
    isLunar: boolean;
    lunarMonth: number | null;
    lunarDay: number | null;
  }) => {
    try {
      if (editSchedule) {
        const res = await fetch(
          `${BASE}/api/schedules/${editSchedule.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }
        );
        const body = await res.json();
        if (body.data) {
          setSchedules((prev) =>
            prev.map((s) => (s.id === editSchedule.id ? body.data : s))
          );
        }
      } else {
        const res = await fetch(`${BASE}/api/schedules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = await res.json();
        if (body.data) setSchedules((prev) => [...prev, body.data]);
      }
    } catch (err) {
      console.error("Failed to save schedule:", err);
    }
    setShowAddSchedule(false);
    setEditSchedule(null);
  };

  const deleteSchedule = async (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    await fetch(`${BASE}/api/schedules/${id}`, { method: "DELETE" });
    setShowAddSchedule(false);
    setEditSchedule(null);
  };

  // Filtered data
  const filteredTodos = todos.filter(
    (t) => t.stage === todoTab && !t.completed
  );
  const archivedTodos = todos.filter((t) => t.stage === "archive" && !t.completed);
  const filteredSchedules = schedules
    .filter((s) =>
      ddayTab === "timeline"
        ? true
        : ddayTab === "general"
          ? s.type === "general"
          : s.type === "anniversary"
    )
    .sort((a, b) => getDisplayInfo(a).daysLeft - getDisplayInfo(b).daysLeft);

  const nowCount = todos.filter((t) => t.stage === "now" && !t.completed).length;
  const soonCount = todos.filter((t) => t.stage === "soon" && !t.completed).length;
  const ddayCount = schedules.filter((s) => s.type === "general").length;
  const annivCount = schedules.filter((s) => s.type === "anniversary").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[var(--bg-primary)]">
        <div className="size-8 border-[3px] border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Desktop Sidebar ── */
  const sidebar = (
    <aside className="hidden md:flex flex-col w-[260px] h-dvh border-r border-[var(--separator)] bg-[var(--sys-bg-secondary)] flex-shrink-0">
      {/* App title */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-[22px] font-semibold text-[var(--label-primary)]">v-todo</h1>
      </div>

      {/* Year Progress */}
      <div className="px-5 pb-4">
        <YearProgress />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5">
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
            section === "todo"
              ? "bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]"
              : "text-[var(--label-primary)] hover:bg-[var(--fill-quaternary)]"
          }`}
          onClick={() => setSection("todo")}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill={section === "todo" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={section === "todo" ? "0" : "1.6"} strokeLinecap="round" strokeLinejoin="round">
            {section === "todo" ? (
              <path d="M17 2H5a3 3 0 00-3 3v12a3 3 0 003 3h12a3 3 0 003-3V5a3 3 0 00-3-3zM9.5 14l-3-3 1-1 2 2 5-5 1 1-6 6z" />
            ) : (
              <>
                <rect x="3" y="3" width="16" height="16" rx="3" />
                <path d="M8 11.5l2.5 2.5L15 9" />
              </>
            )}
          </svg>
          <span className="text-[15px] font-medium flex-1">할 일</span>
          {(nowCount + soonCount) > 0 && (
            <span className="text-[13px] text-[var(--label-tertiary)]">{nowCount + soonCount}</span>
          )}
        </button>

        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
            section === "note"
              ? "bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]"
              : "text-[var(--label-primary)] hover:bg-[var(--fill-quaternary)]"
          }`}
          onClick={() => setSection("note")}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill={section === "note" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={section === "note" ? "0" : "1.6"} strokeLinecap="round" strokeLinejoin="round">
            {section === "note" ? (
              <path d="M5 2C3.9 2 3 2.9 3 4v14c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H5zm2 4h8v1.5H7V6zm0 3.5h8V11H7V9.5zm0 3.5h5v1.5H7V13z" />
            ) : (
              <>
                <rect x="4" y="3" width="14" height="16" rx="2" />
                <line x1="8" y1="7" x2="14" y2="7" />
                <line x1="8" y1="11" x2="14" y2="11" />
                <line x1="8" y1="15" x2="12" y2="15" />
              </>
            )}
          </svg>
          <span className="text-[15px] font-medium flex-1">노트</span>
        </button>

      </nav>

    </aside>
  );

  const handleSwipe = (dir: "left" | "right") => {
    if (section === "todo") {
      const tabs: TodoTab[] = ["now", "soon", "archive"];
      const idx = tabs.indexOf(todoTab);
      if (dir === "left" && idx < tabs.length - 1) setTodoTab(tabs[idx + 1]);
      if (dir === "right" && idx > 0) setTodoTab(tabs[idx - 1]);
    } else if (section === "note") {
      const noteTabs: NoteTab[] = ["daily", "general"];
      const ni = noteTabs.indexOf(noteTab);
      if (dir === "left" && ni < noteTabs.length - 1) setNoteTab(noteTabs[ni + 1]);
      if (dir === "right" && ni > 0) setNoteTab(noteTabs[ni - 1]);

    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.time;
    touchRef.current = null;

    // 최소 60px 수평 이동, 수직보다 수평이 커야 함, 500ms 이내
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 500) {
      handleSwipe(dx < 0 ? "left" : "right");
    }
  };

  /* ── Content Area ── */
  const content = (
    <div className="flex-1 flex flex-col h-dvh overflow-hidden">
      {/* Year Progress (mobile) */}
      <div className="md:hidden px-5 pt-3 pb-2 safe-area-pt">
        <YearProgress />
      </div>

      {/* Tabs */}
      <div className="md:px-8 pt-1 md:pt-8 pb-2">
        {section === "todo" ? (
          <SectionTabs
            tabs={[
              { key: "now", label: `지금${nowCount > 0 ? ` ${nowCount}` : ""}` },
              { key: "soon", label: `곧${soonCount > 0 ? ` ${soonCount}` : ""}` },
              { key: "archive", label: "보관함" },
            ]}
            active={todoTab}
            onChange={(key) => setTodoTab(key as TodoTab)}
          />
        ) : section === "note" ? (
          <SectionTabs
            tabs={[
              { key: "daily", label: "데일리" },
              { key: "general", label: "노트" },
            ]}
            active={noteTab}
            onChange={(key) => setNoteTab(key as NoteTab)}
          />

        ) : null}
      </div>

      {/* Main Content */}
      <main
        className={`flex-1 overflow-y-auto ${section === "note" ? "pb-20 md:pb-0 flex flex-col min-h-0" : "pb-20 md:pb-8"}`}
        style={{ viewTransitionName: "tab-content" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className={`${section === "note" ? "flex-1 flex flex-col min-h-0" : "md:px-8 flex flex-col min-h-full"}`}>
          {section === "note" ? (
            <div className="flex-1 flex flex-col min-h-0 md:px-8">
              {noteTab === "daily" ? (
                <DailyNoteView />
              ) : (
                <GeneralNoteView />
              )}
            </div>
          ) : section === "todo" && todoTab === "archive" ? (
            <div className="flex-1 flex flex-col">
              {archivedTodos.length === 0 ? (
                <EmptyState
                  icon={
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 8v13H3V8" />
                      <rect x="1" y="3" width="22" height="5" rx="1" />
                      <line x1="10" y1="12" x2="14" y2="12" />
                    </svg>
                  }
                  title="보관함이 비어 있습니다"
                  description="완료되지 않은 할 일이 자동 보관되며, 30일 후 삭제됩니다"
                />
              ) : (
                <div className="mx-5 md:mx-0 flex flex-col gap-2.5">
                  {archivedTodos.map((todo) => (
                    <div key={todo.id} className="bg-[var(--sys-bg-elevated)] rounded-xl overflow-hidden">
                      <TodoItem
                        todo={todo}
                        onToggle={toggleTodo}
                        onDelete={deleteTodo}
                        onEdit={editTodo}
                        onTagClick={setActiveTag}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {filteredTodos.length === 0 ? (
                <EmptyState
                  icon={
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <path d="M8 12.5l2.5 2.5L16 9.5" />
                    </svg>
                  }
                  title={todoTab === "now" ? "할 일을 추가해보세요" : "곧 처리할 일이 없습니다"}
                  description={
                    todoTab === "now"
                      ? "3일 이내에 완료하지 않으면 '곧'으로 이동합니다"
                      : "3일 동안 미처리된 할 일이 여기에 표시됩니다"
                  }
                />
              ) : (
                <div className="mx-5 md:mx-0 flex flex-col gap-2.5">
                  {filteredTodos.map((todo) => (
                    <div key={todo.id} className="bg-[var(--sys-bg-elevated)] rounded-xl overflow-hidden">
                      <TodoItem
                        todo={todo}
                        onToggle={toggleTodo}
                        onDelete={deleteTodo}
                        onEdit={editTodo}
                        onTagClick={setActiveTag}
                      />
                    </div>
                  ))}
                </div>
              )}
              {todoTab === "now" && (
                <div className="mx-5 md:mx-0 mt-auto pt-2.5">
                  <TodoInput onAdd={addTodo} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );

  return (
    <div className="flex bg-[var(--bg-primary)]">
      {sidebar}
      {content}
      <BottomNav active={section} onChange={setSection} />

      {showAddSchedule && (
        <AddScheduleSheet
          schedule={editSchedule}
          defaultType={ddayTab === "anniversary" ? "anniversary" : "general" as ScheduleType}
          onSave={saveSchedule}
          onDelete={editSchedule ? deleteSchedule : undefined}
          onClose={() => {
            setShowAddSchedule(false);
            setEditSchedule(null);
          }}
        />
      )}
      {activeTag && (
        <TagView
          tag={activeTag}
          todos={todos}
          schedules={schedules}
          onClose={() => setActiveTag(null)}
        />
      )}
      {undoItem && (
        <UndoToast
          message={`"${undoItem.todo.title}" 완료됨`}
          onUndo={undoComplete}
          onDismiss={() => setUndoItem(null)}
        />
      )}
    </div>
  );
}
