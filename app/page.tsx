"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Todo, Schedule, ScheduleType, RepeatMode, Section, NoteTab, WishItem, WishCategory } from "@/types";
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
import MoodYearView from "@/components/MoodYearView";
import WishlistView from "@/components/WishlistView";
import AddWishSheet from "@/components/AddWishSheet";
import HealingAddSheet from "@/components/HealingAddSheet";
import YearProgress from "@/components/YearProgress";
import WishCompletionSheet from "@/components/WishCompletionSheet";
import CheckinView from "@/components/CheckinView";
import TagView from "@/components/TagView";
import type { TodoTab } from "@/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function Home() {
  const [section, setSection] = useState<Section>("todo");
  const [todoTab, setTodoTab] = useState<TodoTab>("now");
  const [ddayTab, setDdayTab] = useState<"timeline" | "general" | "anniversary">("timeline");
  const [noteTab, setNoteTab] = useState<NoteTab>("daily");

  const [todos, setTodos] = useState<Todo[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [wishes, setWishes] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [wishTab, setWishTab] = useState<WishCategory>("healing");
  const [showAddWish, setShowAddWish] = useState(false);
  const [editWish, setEditWish] = useState<WishItem | null>(null);
  const [completingWish, setCompletingWish] = useState<WishItem | null>(null);

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

  const fetchWishes = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/wishes`);
      const body = await res.json();
      if (body.data) setWishes(body.data);
    } catch (err) {
      console.error("Failed to fetch wishes:", err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount; setState runs after Promise resolves
    Promise.all([fetchTodos(), fetchSchedules(), fetchWishes()]).finally(
      () => setLoading(false)
    );
  }, [fetchTodos, fetchSchedules, fetchWishes]);

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

  // Wish actions
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
    try {
      if (editWish) {
        const res = await fetch(`${BASE}/api/wishes/${editWish.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = await res.json();
        if (body.data) {
          setWishes((prev) =>
            prev.map((w) => (w.id === editWish.id ? body.data : w))
          );
        }
      } else {
        const res = await fetch(`${BASE}/api/wishes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = await res.json();
        if (body.data) setWishes((prev) => [...prev, body.data]);
      }
    } catch (err) {
      console.error("Failed to save wish:", err);
    }
    setShowAddWish(false);
    setEditWish(null);
  };

  const toggleWish = async (id: string) => {
    const wish = wishes.find((w) => w.id === id);
    if (!wish) return;

    if (!wish.completed) {
      // Not completed → open CompletionSheet
      setCompletingWish(wish);
    } else {
      // Completed → uncomplete immediately (clear completion info)
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

  const deleteWish = async (id: string) => {
    setWishes((prev) => prev.filter((w) => w.id !== id));
    await fetch(`${BASE}/api/wishes/${id}`, { method: "DELETE" });
    setShowAddWish(false);
    setEditWish(null);
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

        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
            section === "checkin"
              ? "bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]"
              : "text-[var(--label-primary)] hover:bg-[var(--fill-quaternary)]"
          }`}
          onClick={() => setSection("checkin")}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill={section === "checkin" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={section === "checkin" ? "0" : "1.6"} strokeLinecap="round" strokeLinejoin="round">
            {section === "checkin" ? (
              <path fillRule="evenodd" clipRule="evenodd" d="M11 1.5C5.8 1.5 1.5 5.8 1.5 11s4.3 9.5 9.5 9.5 9.5-4.3 9.5-9.5S16.2 1.5 11 1.5zM7.9 9.5a1.1 1.1 0 110-2.2 1.1 1.1 0 010 2.2zm6.2 0a1.1 1.1 0 110-2.2 1.1 1.1 0 010 2.2zM6.5 12.8h9c-.9 2.4-2.9 4-4.5 4s-3.6-1.6-4.5-4z" />
            ) : (
              <>
                <circle cx="11" cy="11" r="8.5" />
                <circle cx="7.9" cy="8.7" r="0.95" fill="currentColor" stroke="none" />
                <circle cx="14.1" cy="8.7" r="0.95" fill="currentColor" stroke="none" />
                <path d="M6.8 12.8c.8 1.8 2.4 3 4.2 3s3.4-1.2 4.2-3" />
              </>
            )}
          </svg>
          <span className="text-[15px] font-medium flex-1">체크인</span>
        </button>

        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
            section === "wish"
              ? "bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]"
              : "text-[var(--label-primary)] hover:bg-[var(--fill-quaternary)]"
          }`}
          onClick={() => setSection("wish")}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill={section === "wish" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={section === "wish" ? "0" : "1.6"} strokeLinecap="round" strokeLinejoin="round">
            {section === "wish" ? (
              <path d="M11 1.5l2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.6-5 2.6 1-5.6-4.1-4 5.6-.8L11 1.5z" />
            ) : (
              <polygon points="11 2 13.9 7.6 20 8.5 15.5 12.9 16.6 19 11 16 5.4 19 6.5 12.9 2 8.5 8.1 7.6" />
            )}
          </svg>
          <span className="text-[15px] font-medium flex-1">위시</span>
          {wishes.filter((w) => !w.completed).length > 0 && (
            <span className="text-[13px] text-[var(--label-tertiary)]">{wishes.filter((w) => !w.completed).length}</span>
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

    </aside>
  );

  const handleSwipe = (dir: "left" | "right") => {
    if (section === "todo") {
      const tabs: TodoTab[] = ["now", "soon", "archive"];
      const idx = tabs.indexOf(todoTab);
      if (dir === "left" && idx < tabs.length - 1) setTodoTab(tabs[idx + 1]);
      if (dir === "right" && idx > 0) setTodoTab(tabs[idx - 1]);
    } else if (section === "note") {
      const noteTabs: NoteTab[] = ["daily", "general", "mood"];
      const ni = noteTabs.indexOf(noteTab);
      if (dir === "left" && ni < noteTabs.length - 1) setNoteTab(noteTabs[ni + 1]);
      if (dir === "right" && ni > 0) setNoteTab(noteTabs[ni - 1]);
    } else if (section === "wish") {
      const wishTabs: WishCategory[] = ["healing", "item", "experience"];
      const wi = wishTabs.indexOf(wishTab);
      if (dir === "left" && wi < wishTabs.length - 1) setWishTab(wishTabs[wi + 1]);
      if (dir === "right" && wi > 0) setWishTab(wishTabs[wi - 1]);
    } else if (section === "dday") {
      const ddayTabs: ("timeline" | "general" | "anniversary")[] = ["timeline", "general", "anniversary"];
      const di = ddayTabs.indexOf(ddayTab);
      if (dir === "left" && di < ddayTabs.length - 1) setDdayTab(ddayTabs[di + 1]);
      if (dir === "right" && di > 0) setDdayTab(ddayTabs[di - 1]);
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
              { key: "mood", label: "무드" },
            ]}
            active={noteTab}
            onChange={(key) => setNoteTab(key as NoteTab)}
          />
        ) : section === "dday" ? (
          <SectionTabs
            tabs={[
              { key: "timeline", label: "타임라인" },
              { key: "general", label: `D-day${ddayCount > 0 ? ` ${ddayCount}` : ""}` },
              { key: "anniversary", label: `기념일${annivCount > 0 ? ` ${annivCount}` : ""}` },
            ]}
            active={ddayTab}
            onChange={(key) => setDdayTab(key as "timeline" | "general" | "anniversary")}
          />
        ) : null}
      </div>

      {/* Main Content */}
      <main
        className={`flex-1 overflow-y-auto ${(section === "note" || section === "checkin") ? "pb-20 md:pb-0 flex flex-col min-h-0" : "pb-20 md:pb-8"}`}
        style={{ viewTransitionName: "tab-content" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className={`${(section === "note" || section === "checkin") ? "flex-1 flex flex-col min-h-0" : "md:px-8 flex flex-col min-h-full"}`}>
          {section === "note" ? (
            <div className="flex-1 flex flex-col min-h-0 md:px-8">
              {noteTab === "daily" ? (
                <DailyNoteView />
              ) : noteTab === "general" ? (
                <GeneralNoteView />
              ) : (
                <MoodYearView />
              )}
            </div>
          ) : section === "checkin" ? (
            <div className="flex-1 flex flex-col min-h-0 md:px-8">
              <CheckinView />
            </div>
          ) : section === "wish" ? (
            <WishlistView
              wishes={wishes}
              wishTab={wishTab}
              onTabChange={setWishTab}
              onToggle={toggleWish}
              onEdit={(w) => { setEditWish(w); setShowAddWish(true); }}
              onDelete={deleteWish}
              onAdd={() => { setEditWish(null); setShowAddWish(true); }}
              onTagClick={setActiveTag}
            />
          ) : section === "todo" && todoTab === "archive" ? (
            <div className="flex-1 flex flex-col">
              {archivedTodos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--label-tertiary)]">
                  <span className="text-[56px] mb-5 opacity-30">📦</span>
                  <p className="text-[20px]">보관함이 비어 있습니다</p>
                  <p className="text-[15px] text-[var(--label-quaternary)] mt-1.5">30일 후 자동 삭제됩니다</p>
                </div>
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
          ) : section === "todo" ? (
            <div className="flex-1 flex flex-col">
              {filteredTodos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--label-tertiary)]">
                  <span className="text-[56px] mb-5 opacity-30">✅</span>
                  <p className="text-[20px]">
                    {todoTab === "now" ? "할 일을 추가해보세요" : "곧 처리할 일이 없습니다"}
                  </p>
                  <p className="text-[15px] text-[var(--label-quaternary)] mt-1.5">
                    {todoTab === "now"
                      ? "3일 이내에 완료하지 않으면 '곧'으로 이동합니다"
                      : "3일 동안 미처리된 할 일이 여기에 표시됩니다"}
                  </p>
                </div>
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
          ) : ddayTab === "timeline" ? (
            <div className="flex-1 flex flex-col">
              <TimelineView
                schedules={schedules}
                onEdit={(s) => {
                  setEditSchedule(s);
                  setShowAddSchedule(true);
                }}
                onTagClick={setActiveTag}
              />
              <div className="mx-5 md:mx-0 mt-auto pt-4">
                <button
                  className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold active:opacity-80 transition-opacity"
                  onClick={() => {
                    setEditSchedule(null);
                    setShowAddSchedule(true);
                  }}
                >
                  새 일정 추가
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {filteredSchedules.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--label-tertiary)]">
                  <span className="text-[56px] mb-5 opacity-30">📅</span>
                  <p className="text-[20px]">
                    {ddayTab === "general" ? "일정을 추가해보세요" : "기념일을 추가해보세요"}
                  </p>
                </div>
              ) : (
                <div className="mx-5 md:mx-0 flex flex-col gap-2">
                  {filteredSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="bg-[var(--sys-bg-elevated)] rounded-xl overflow-hidden"
                    >
                      <ScheduleItem
                        schedule={schedule}
                        onEdit={(s) => {
                          setEditSchedule(s);
                          setShowAddSchedule(true);
                        }}
                        onTagClick={setActiveTag}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="mx-5 md:mx-0 mt-auto pt-4">
                <button
                  className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold active:opacity-80 transition-opacity"
                  onClick={() => {
                    setEditSchedule(null);
                    setShowAddSchedule(true);
                  }}
                >
                  새 일정 추가
                </button>
              </div>
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
      {completingWish && (
        <WishCompletionSheet
          wish={completingWish}
          onComplete={completeWish}
          onClose={() => setCompletingWish(null)}
        />
      )}
      {activeTag && (
        <TagView
          tag={activeTag}
          todos={todos}
          schedules={schedules}
          wishes={wishes}
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
