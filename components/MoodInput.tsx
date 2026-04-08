"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface MoodInputProps {
  date: string;
}

const MOODS: { value: number; emoji: string }[] = [
  { value: 1, emoji: "😢" },
  { value: 2, emoji: "😔" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "😊" },
  { value: 5, emoji: "😄" },
];

export default function MoodInput({ date }: MoodInputProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const dateRef = useRef(date);

  const fetchMood = useCallback(async (d: string) => {
    dateRef.current = d;
    try {
      const res = await fetch(`${BASE}/api/moods?date=${d}`);
      const body = await res.json();
      setSelected(body.data ?? null);
    } catch {
      setSelected(null);
    }
  }, []);

  const saveMood = useCallback(async (value: number) => {
    try {
      await fetch(`${BASE}/api/moods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateRef.current, value }),
      });
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchMood(date);
  }, [date, fetchMood]);

  const handleTap = (value: number) => {
    setSelected(value);
    saveMood(value);
  };

  return (
    <div className="mx-5 md:mx-0 mb-3">
      <div className="bg-[var(--sys-bg-elevated)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[18px]">🫧</span>
            <span className="text-[17px] font-semibold text-[var(--label-primary)]">오늘의 기분</span>
          </div>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => handleTap(m.value)}
              className="flex-1 flex items-center justify-center py-2.5 rounded-lg transition-all"
              style={{
                backgroundColor:
                  selected === m.value
                    ? "var(--fill-secondary)"
                    : "var(--fill-quaternary)",
                transform: selected === m.value ? "scale(1.1)" : "scale(1)",
                boxShadow:
                  selected === m.value
                    ? "0 0 0 2px var(--sys-teal)"
                    : "none",
              }}
            >
              <span className="text-[28px]">{m.emoji}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
