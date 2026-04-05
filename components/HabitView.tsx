"use client";

import { useState, useEffect, useCallback } from "react";
import type { Habit, HabitLog, HabitRepeatMode } from "@/types";
import HabitItem from "@/components/HabitItem";
import AddHabitSheet from "@/components/AddHabitSheet";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isScheduledDay(date: Date, habit: Habit): boolean {
  const created = new Date(habit.createdAt);
  created.setHours(0, 0, 0, 0);
  if (date < created) return false;
  if (habit.repeatMode === "daily") return true;
  if (habit.repeatMode === "weekdays") return habit.weekdays.includes(date.getDay());
  if (habit.repeatMode === "interval") {
    const diffMs = date.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays % habit.intervalDays === 0;
  }
  return false;
}

function calcStreak(habit: Habit, logs: HabitLog[]): number {
  const habitLogs = new Set(
    logs.filter((l) => l.habitId === habit.id && l.completed).map((l) => l.date)
  );
  const created = new Date(habit.createdAt);
  created.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let streak = 0;

  const d = new Date(now);
  d.setDate(d.getDate() - 1);

  while (d >= created) {
    if (!isScheduledDay(d, habit)) {
      d.setDate(d.getDate() - 1);
      continue;
    }
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (habitLogs.has(ds)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  if (isScheduledDay(now, habit)) {
    const todayS = todayStr();
    if (habitLogs.has(todayS)) {
      streak++;
    }
  }

  return streak;
}

function calcBestStreak(habit: Habit, logs: HabitLog[]): number {
  const habitLogs = new Set(
    logs.filter((l) => l.habitId === habit.id && l.completed).map((l) => l.date)
  );
  const created = new Date(habit.createdAt);
  created.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let best = 0;
  let current = 0;
  const d = new Date(created);

  while (d <= now) {
    if (!isScheduledDay(d, habit)) {
      d.setDate(d.getDate() + 1);
      continue;
    }
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (habitLogs.has(ds)) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
    d.setDate(d.getDate() + 1);
  }

  return best;
}

export default function HabitView() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [allLogs, setAllLogs] = useState<HabitLog[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);

  const fetchHabits = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/habits`);
      const body = await res.json();
      if (body.data) setHabits(body.data);
    } catch (err) {
      console.error("Failed to fetch habits:", err);
    }
  }, []);

  const fetchAllLogs = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/habits/logs?date=all`);
      const body = await res.json();
      if (body.data) setAllLogs(body.data);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
    fetchAllLogs();
  }, [fetchHabits, fetchAllLogs]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDate = todayStr();

  const todayHabits = habits.filter((h) => isScheduledDay(today, h));
  const completedCount = todayHabits.filter((h) =>
    allLogs.some((l) => l.habitId === h.id && l.date === todayDate && l.completed)
  ).length;
  const progress = todayHabits.length > 0 ? completedCount / todayHabits.length : 0;

  const toggleHabit = async (habitId: string, completed: boolean) => {
    if (completed) {
      setAllLogs((prev) => [...prev, { habitId, date: todayDate, completed: true }]);
    } else {
      setAllLogs((prev) => prev.filter((l) => !(l.habitId === habitId && l.date === todayDate)));
    }

    try {
      await fetch(`${BASE}/api/habits/logs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, date: todayDate, completed }),
      });
    } catch (err) {
      console.error("Failed to toggle habit:", err);
      fetchAllLogs();
    }
  };

  const saveHabit = async (data: {
    title: string;
    repeatMode: HabitRepeatMode;
    weekdays: number[];
    intervalDays: number;
  }) => {
    try {
      if (editHabit) {
        const res = await fetch(`${BASE}/api/habits/${editHabit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = await res.json();
        if (body.data) {
          setHabits((prev) => prev.map((h) => (h.id === editHabit.id ? body.data : h)));
        }
      } else {
        const res = await fetch(`${BASE}/api/habits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = await res.json();
        if (body.data) setHabits((prev) => [...prev, body.data]);
      }
    } catch (err) {
      console.error("Failed to save habit:", err);
    }
    setShowSheet(false);
    setEditHabit(null);
  };

  const deleteHabit = async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setAllLogs((prev) => prev.filter((l) => l.habitId !== id));
    await fetch(`${BASE}/api/habits/${id}`, { method: "DELETE" });
    setShowSheet(false);
    setEditHabit(null);
  };

  return (
    <>
      {/* Progress bar */}
      <div className="mx-5 md:mx-0 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[15px] text-[var(--label-secondary)]">
            오늘 {completedCount}/{todayHabits.length}
          </span>
          <span className="text-[15px] font-semibold text-[var(--accent-primary)]">
            {todayHabits.length > 0 ? Math.round(progress * 100) : 0}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--fill-tertiary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Habit list */}
      {todayHabits.length === 0 && habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--label-tertiary)]">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-5 opacity-30">
            <path d="M28 8C28 8 16 22 16 32C16 38.6 21.4 44 28 44S40 38.6 40 32C40 22 28 8 28 8Z" />
          </svg>
          <p className="text-[20px]">반복하는 습관을 등록해 보세요</p>
          <p className="text-[15px] text-[var(--label-quaternary)] mt-1.5">
            매일, 특정 요일, 또는 N일마다 반복할 수 있습니다
          </p>
        </div>
      ) : (
        <div className="mx-5 md:mx-0 flex flex-col gap-2.5">
          {todayHabits.map((habit) => {
            const todayCompleted = allLogs.some(
              (l) => l.habitId === habit.id && l.date === todayDate && l.completed
            );
            return (
              <HabitItem
                key={habit.id}
                habit={habit}
                logs={allLogs}
                todayCompleted={todayCompleted}
                streak={calcStreak(habit, allLogs)}
                bestStreak={calcBestStreak(habit, allLogs)}
                onToggle={toggleHabit}
                onEdit={(h) => { setEditHabit(h); setShowSheet(true); }}
                onDelete={deleteHabit}
              />
            );
          })}

          {/* Show non-today habits in a dimmed section */}
          {habits.filter((h) => !isScheduledDay(today, h)).length > 0 && (
            <>
              <div className="mt-4 mb-1 px-1">
                <span className="text-[13px] text-[var(--label-tertiary)]">오늘 아닌 습관</span>
              </div>
              {habits
                .filter((h) => !isScheduledDay(today, h))
                .map((habit) => (
                  <div key={habit.id} className="opacity-50">
                    <HabitItem
                      habit={habit}
                      logs={allLogs}
                      todayCompleted={false}
                      streak={calcStreak(habit, allLogs)}
                      bestStreak={calcBestStreak(habit, allLogs)}
                      onToggle={() => {}}
                      onEdit={(h) => { setEditHabit(h); setShowSheet(true); }}
                      onDelete={deleteHabit}
                    />
                  </div>
                ))}
            </>
          )}
        </div>
      )}

      {/* Add button */}
      <div className="mx-5 md:mx-0 mt-4">
        <button
          className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold active:opacity-80 transition-opacity"
          onClick={() => {
            setEditHabit(null);
            setShowSheet(true);
          }}
        >
          새 습관 추가
        </button>
      </div>

      {showSheet && (
        <AddHabitSheet
          habit={editHabit}
          onSave={saveHabit}
          onDelete={editHabit ? deleteHabit : undefined}
          onClose={() => { setShowSheet(false); setEditHabit(null); }}
        />
      )}
    </>
  );
}
