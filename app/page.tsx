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

  const [undoItem, setUndoItem] = useState<{
    todo: Todo;
    timeout: NodeJS.Timeout;
  } | null>(null);

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
    Promise.all([fetchTodos(), fetchSchedules()]).finally(() =>
      setLoading(false)
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

  // Briefing
  const loadBriefing = async () => {
    setShowBriefing(true);
    setBriefingLoading(true);
    try {
      const res = await fetch(`${BASE}/api/ai/briefing`);
      const body = await res.json();
      setBriefingText(
        body.data?.briefing ?? "브리핑을 불러올 수 없습니다."
      );
    } catch {
      setBriefingText("AI 서비스를 사용할 수 없습니다.");
    } finally {
      setBriefingLoading(false);
    }
  };

  // Filtered data
  const filteredTodos = todos.filter(
    (t) => t.stage === todoTab && !t.completed
  );
  const filteredSchedules = schedules
    .filter((s) =>
      ddayTab === "general"
        ? s.type === "general"
        : s.type === "anniversary"
    )
    .sort(
      (a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    );

  const nowCount = todos.filter((t) => t.stage === "now" && !t.completed).length;
  const soonCount = todos.filter((t) => t.stage === "soon" && !t.completed).length;
  const ddayCount = schedules.filter((s) => s.type === "general").length;
  const annivCount = schedules.filter((s) => s.type === "anniversary").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-[3px] border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Desktop Sidebar ── */
  const Sidebar = () => (
    <aside className="hidden md:flex flex-col w-[260px] h-dvh border-r border-[var(--separator)] bg-[var(--sys-bg-secondary)] flex-shrink-0">
      {/* App title */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-[22px] font-bold text-[var(--label-primary)]">v-todo</h1>
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
            section === "dday"
              ? "bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]"
              : "text-[var(--label-primary)] hover:bg-[var(--fill-quaternary)]"
          }`}
          onClick={() => setSection("dday")}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill={section === "dday" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={section === "dday" ? "0" : "1.6"} strokeLinecap="round" strokeLinejoin="round">
            {section === "dday" ? (
              <path d="M11 1C5.5 1 1 5.5 1 11s4.5 10 10 10 10-4.5 10-10S16.5 1 11 1zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13h-1.5v6l5.2 3.1.8-1.3-4.5-2.6V6z" />
            ) : (
              <>
                <circle cx="11" cy="11" r="9" />
                <polyline points="11 6 11 11 15 13" />
              </>
            )}
          </svg>
          <span className="text-[15px] font-medium flex-1">D-day</span>
          {(ddayCount + annivCount) > 0 && (
            <span className="text-[13px] text-[var(--label-tertiary)]">{ddayCount + annivCount}</span>
          )}
        </button>
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 space-y-0.5">
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[var(--label-secondary)] hover:bg-[var(--fill-quaternary)] transition-colors"
          onClick={() => setShowArchive(true)}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h14l-1.5 10H5.5L4 7z" />
            <path d="M3 7h16" />
            <path d="M9 11h4" />
          </svg>
          <span className="text-[15px] font-medium">보관함</span>
        </button>
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[var(--sys-orange)] hover:bg-[var(--sys-orange)]/8 transition-colors"
          onClick={loadBriefing}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <circle cx="11" cy="11" r="1.5" fill="currentColor" />
            <path d="M11 5v1.5M11 15.5V17M5 11h1.5M15.5 11H17" />
          </svg>
          <span className="text-[15px] font-medium">AI 브리핑</span>
        </button>
      </div>
    </aside>
  );

  /* ── Content Area ── */
  const Content = () => (
    <div className="flex-1 flex flex-col h-dvh overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-5 pt-3 pb-1 safe-area-pt">
        <h1 className="text-[34px] font-bold tracking-tight text-[var(--label-primary)]">
          {section === "todo" ? "할 일" : "D-day"}
        </h1>
        <div className="flex items-center gap-1">
          {section === "todo" && (
            <button
              className="w-11 h-11 flex items-center justify-center text-[var(--label-tertiary)]"
              onClick={() => setShowArchive(true)}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h14l-1.5 10H5.5L4 7z" />
                <path d="M3 7h16" />
                <path d="M9 11h4" />
              </svg>
            </button>
          )}
          <button
            className="w-11 h-11 flex items-center justify-center text-[var(--sys-orange)]"
            onClick={loadBriefing}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <circle cx="11" cy="11" r="1.5" fill="currentColor" />
              <path d="M11 5v1.5M11 15.5V17M5 11h1.5M15.5 11H17" />
            </svg>
          </button>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-8 pt-8 pb-2">
        <h1 className="text-[28px] font-bold tracking-tight text-[var(--label-primary)]">
          {section === "todo" ? "할 일" : "D-day"}
        </h1>
      </header>

      {/* Tabs */}
      <div className="px-0 md:px-8 pt-1 pb-2">
        {section === "todo" ? (
          <SectionTabs
            tabs={[
              { key: "now", label: `지금${nowCount > 0 ? ` ${nowCount}` : ""}` },
              { key: "soon", label: `곧${soonCount > 0 ? ` ${soonCount}` : ""}` },
            ]}
            active={todoTab}
            onChange={(key) => setTodoTab(key as "now" | "soon")}
          />
        ) : (
          <SectionTabs
            tabs={[
              { key: "general", label: `D-day${ddayCount > 0 ? ` ${ddayCount}` : ""}` },
              { key: "anniversary", label: `기념일${annivCount > 0 ? ` ${annivCount}` : ""}` },
            ]}
            active={ddayTab}
            onChange={(key) => setDdayTab(key as "general" | "anniversary")}
          />
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-8">
        <div className="md:px-8">
          {section === "todo" ? (
            <>
              {filteredTodos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-[var(--label-tertiary)]">
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-5 opacity-30">
                    <rect x="10" y="10" width="36" height="36" rx="8" />
                    <path d="M20 28l6 6 10-10" />
                  </svg>
                  <p className="text-[17px]">
                    {todoTab === "now" ? "할 일을 추가해보세요" : "곧 처리할 일이 없습니다"}
                  </p>
                  <p className="text-[13px] text-[var(--label-quaternary)] mt-1">
                    {todoTab === "now"
                      ? "3일 이내에 완료하지 않으면 '곧'으로 이동합니다"
                      : "3일 동안 미처리된 할 일이 여기에 표시됩니다"}
                  </p>
                </div>
              ) : (
                <div className="md:bg-[var(--sys-bg-elevated)] md:rounded-xl md:border md:border-[var(--separator)] md:overflow-hidden">
                  {filteredTodos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={toggleTodo}
                      onDelete={deleteTodo}
                    />
                  ))}
                </div>
              )}
              <div className="mt-3 md:mt-4">
                <TodoInput onAdd={addTodo} />
              </div>
            </>
          ) : (
            <>
              {filteredSchedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-[var(--label-tertiary)]">
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-5 opacity-30">
                    <circle cx="28" cy="28" r="20" />
                    <polyline points="28 16 28 28 36 33" />
                  </svg>
                  <p className="text-[17px]">
                    {ddayTab === "general" ? "일정을 추가해보세요" : "기념일을 추가해보세요"}
                  </p>
                </div>
              ) : (
                <div className="md:bg-[var(--sys-bg-elevated)] md:rounded-xl md:border md:border-[var(--separator)] md:overflow-hidden">
                  {filteredSchedules.map((schedule) => (
                    <ScheduleItem
                      key={schedule.id}
                      schedule={schedule}
                      onEdit={(s) => {
                        setEditSchedule(s);
                        setShowAddSchedule(true);
                      }}
                    />
                  ))}
                </div>
              )}
              <div className="px-5 md:px-0 mt-4">
                <button
                  className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[17px] font-semibold active:opacity-80 transition-opacity"
                  onClick={() => {
                    setEditSchedule(null);
                    setShowAddSchedule(true);
                  }}
                >
                  새 일정 추가
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );

  return (
    <div className="flex bg-[var(--bg-primary)]">
      <Sidebar />
      <Content />
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
          briefing={
            briefingLoading
              ? "브리핑을 생성하고 있습니다..."
              : briefingText
          }
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
