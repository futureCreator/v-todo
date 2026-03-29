// app/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Todo, Schedule, ScheduleType, RepeatMode } from "@/types";
import BottomNav from "@/components/BottomNav";
import SectionTabs from "@/components/SectionTabs";
import TodoItem from "@/components/TodoItem";
import TodoInput from "@/components/TodoInput";
import ScheduleItem from "@/components/ScheduleItem";
import AddScheduleSheet from "@/components/AddScheduleSheet";
import UndoToast from "@/components/UndoToast";
import ArchiveView from "@/components/ArchiveView";
import BriefingModal from "@/components/BriefingModal";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function Home() {
  const [section, setSection] = useState<"todo" | "dday">("todo");
  const [todoTab, setTodoTab] = useState<"now" | "soon">("now");
  const [ddayTab, setDdayTab] = useState<"general" | "anniversary">("general");

  const [todos, setTodos] = useState<Todo[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const [showArchive, setShowArchive] = useState(false);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);
  const [showBriefing, setShowBriefing] = useState(false);
  const [briefingText, setBriefingText] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);

  const [undoItem, setUndoItem] = useState<{ todo: Todo; timeout: NodeJS.Timeout } | null>(null);

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
    Promise.all([fetchTodos(), fetchSchedules()]).finally(() => setLoading(false));
  }, [fetchTodos, fetchSchedules]);

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

  const deleteTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await fetch(`${BASE}/api/todos/${id}`, { method: "DELETE" });
  };

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
        const res = await fetch(`${BASE}/api/schedules/${editSchedule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
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

  const loadBriefing = async () => {
    setShowBriefing(true);
    setBriefingLoading(true);
    try {
      const res = await fetch(`${BASE}/api/ai/briefing`);
      const body = await res.json();
      setBriefingText(body.data?.briefing ?? "브리핑을 불러올 수 없습니다.");
    } catch {
      setBriefingText("AI 서비스를 사용할 수 없습니다.");
    } finally {
      setBriefingLoading(false);
    }
  };

  const filteredTodos = todos.filter((t) => t.stage === todoTab && !t.completed);
  const filteredSchedules = schedules
    .filter((s) => (ddayTab === "general" ? s.type === "general" : s.type === "anniversary"))
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-[var(--bg-primary)]">
      <header className="flex items-center justify-between px-5 pt-3 pb-2 safe-area-pt">
        <h1 className="text-[20px] font-bold text-[var(--label-primary)]">v-todo</h1>
        <div className="flex items-center gap-2">
          {section === "todo" && (
            <button
              className="p-2 text-[var(--label-tertiary)] hover:text-[var(--label-primary)]"
              onClick={() => setShowArchive(true)}
              title="보관함"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h14l-1.5 10H4.5L3 5z" />
                <path d="M2 5h16" />
                <path d="M8 9h4" />
              </svg>
            </button>
          )}
          <button
            className="px-3 py-1.5 text-[13px] font-medium text-[var(--accent-primary)] rounded-lg hover:bg-[var(--fill-quaternary)]"
            onClick={loadBriefing}
          >
            브리핑
          </button>
        </div>
      </header>

      {section === "todo" ? (
        <SectionTabs
          tabs={[
            { key: "now", label: "지금" },
            { key: "soon", label: "곧" },
          ]}
          active={todoTab}
          onChange={(key) => setTodoTab(key as "now" | "soon")}
        />
      ) : (
        <SectionTabs
          tabs={[
            { key: "general", label: "D-day" },
            { key: "anniversary", label: "기념일" },
          ]}
          active={ddayTab}
          onChange={(key) => setDdayTab(key as "general" | "anniversary")}
        />
      )}

      <main className="flex-1 overflow-y-auto pb-24">
        {section === "todo" ? (
          <>
            {filteredTodos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-[var(--label-quaternary)]">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40">
                  <rect x="6" y="6" width="28" height="28" rx="4" />
                  <path d="M14 20l4 4 8-8" />
                </svg>
                <p className="text-[14px]">할 일을 추가해보세요</p>
              </div>
            ) : (
              filteredTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                />
              ))
            )}
            <TodoInput onAdd={addTodo} />
          </>
        ) : (
          <>
            {filteredSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-[var(--label-quaternary)]">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40">
                  <circle cx="20" cy="20" r="14" />
                  <polyline points="20 12 20 20 26 23" />
                </svg>
                <p className="text-[14px]">일정을 추가해보세요</p>
              </div>
            ) : (
              filteredSchedules.map((schedule) => (
                <ScheduleItem
                  key={schedule.id}
                  schedule={schedule}
                  onEdit={(s) => {
                    setEditSchedule(s);
                    setShowAddSchedule(true);
                  }}
                />
              ))
            )}
            <div className="px-4 py-3">
              <button
                className="w-full py-3 rounded-2xl bg-[var(--fill-quaternary)] text-[var(--accent-primary)] text-[15px] font-medium hover:bg-[var(--fill-tertiary)] transition-colors"
                onClick={() => {
                  setEditSchedule(null);
                  setShowAddSchedule(true);
                }}
              >
                + 새 일정
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav active={section} onChange={setSection} />

      {showArchive && (
        <ArchiveView
          todos={todos}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onClose={() => setShowArchive(false)}
        />
      )}

      {showAddSchedule && (
        <AddScheduleSheet
          schedule={editSchedule}
          defaultType={ddayTab === "anniversary" ? "anniversary" : "general"}
          onSave={saveSchedule}
          onDelete={editSchedule ? deleteSchedule : undefined}
          onClose={() => {
            setShowAddSchedule(false);
            setEditSchedule(null);
          }}
        />
      )}

      {showBriefing && (
        <BriefingModal
          briefing={briefingLoading ? "브리핑을 생성하고 있습니다..." : briefingText}
          onClose={() => setShowBriefing(false)}
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
