"use client";

import { useState, useEffect, useCallback } from "react";
import type { MoodMap } from "@/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const MOOD_COLORS: Record<number, string> = {
  5: "var(--sys-green)",
  4: "var(--sys-teal)",
  3: "var(--sys-yellow)",
  2: "var(--sys-orange)",
  1: "var(--sys-red)",
};

const MOOD_EMOJI: Record<number, string> = {
  1: "😢",
  2: "😔",
  3: "😐",
  4: "😊",
  5: "😄",
};

const MONTH_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function MoodYearView() {
  const [moods, setMoods] = useState<MoodMap>({});
  const [toast, setToast] = useState<string | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const todayStr = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const fetchMoods = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/moods?year=${year}`);
      const body = await res.json();
      setMoods(body.data ?? {});
    } catch {
      setMoods({});
    }
  }, [year]);

  useEffect(() => {
    fetchMoods();
  }, [fetchMoods]);

  const handleCellTap = (dateStr: string, value: number | undefined) => {
    if (!value) return;
    const month = parseInt(dateStr.slice(5, 7));
    const day = parseInt(dateStr.slice(8, 10));
    setToast(`${month}/${day} ${MOOD_EMOJI[value]}`);
    setTimeout(() => setToast(null), 1500);
  };

  const CELL_SIZE = 20;
  const GAP = 3;

  return (
    <div className="px-5 md:px-0 py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[18px]">🫧</span>
        <span className="text-[20px] font-bold text-[var(--label-primary)]">{year}년 무드</span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-0">
          {/* Day labels column */}
          <div className="flex flex-col flex-shrink-0 mr-1" style={{ gap: GAP }}>
            {/* Empty cell for month label row */}
            <div style={{ height: CELL_SIZE }} />
            {Array.from({ length: 31 }, (_, i) => (
              <div
                key={i}
                className="flex items-center justify-end pr-1 text-[10px] text-[var(--label-tertiary)]"
                style={{ height: CELL_SIZE }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Month columns */}
          {Array.from({ length: 12 }, (_, mi) => {
            const maxDay = daysInMonth(year, mi);
            return (
              <div key={mi} className="flex flex-col flex-shrink-0" style={{ gap: GAP }}>
                {/* Month label */}
                <div
                  className="flex items-center justify-center text-[11px] font-semibold text-[var(--label-secondary)]"
                  style={{ height: CELL_SIZE }}
                >
                  {MONTH_LABELS[mi]}
                </div>
                {/* Day cells */}
                {Array.from({ length: 31 }, (_, di) => {
                  const day = di + 1;
                  if (day > maxDay) {
                    return (
                      <div
                        key={di}
                        style={{ width: CELL_SIZE, height: CELL_SIZE }}
                      />
                    );
                  }
                  const dateStr = `${year}-${String(mi + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const value = moods[dateStr];
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={di}
                      className="rounded-[3px] cursor-pointer transition-transform active:scale-110"
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        backgroundColor: value
                          ? MOOD_COLORS[value]
                          : "var(--fill-quaternary)",
                        border: isToday
                          ? "2px solid var(--label-primary)"
                          : "none",
                      }}
                      onClick={() => handleCellTap(dateStr, value)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-4">
        {[1, 2, 3, 4, 5].map((v) => (
          <div key={v} className="flex items-center gap-1">
            <div
              className="rounded-[2px]"
              style={{
                width: 12,
                height: 12,
                backgroundColor: MOOD_COLORS[v],
              }}
            />
            <span className="text-[12px]">{MOOD_EMOJI[v]}</span>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[var(--sys-bg-elevated)] text-[var(--label-primary)] text-[17px] font-semibold px-5 py-2.5 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
