"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toPng } from "html-to-image";
import type { MoodMap } from "@/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const MOOD_COLORS: Record<number, string> = {
  5: "#1a6bf0",
  4: "#4a90f7",
  3: "#7db3fa",
  2: "#aed0fc",
  1: "#dbe9fe",
};

const MOOD_EMOJI: Record<number, string> = {
  1: "\u{1F622}",
  2: "\u{1F614}",
  3: "\u{1F610}",
  4: "\u{1F60A}",
  5: "\u{1F604}",
};

const MONTH_LABELS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

const DAY_LABEL_W = 18;
const GAP = 2;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function MoodYearView() {
  const [moods, setMoods] = useState<MoodMap>({});
  const [toast, setToast] = useState<string | null>(null);
  const [cellSize, setCellSize] = useState(0);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const year = now.getFullYear();
  const todayStr = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  /* ── dynamic cell sizing ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const calc = () => {
      const w = el.clientWidth;
      const available = w - DAY_LABEL_W - 11 * GAP;
      setCellSize(Math.max(Math.floor(available / 12), 8));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── fetch moods ── */
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

  /* ── cell tap ── */
  const handleCellTap = (dateStr: string, value: number | undefined) => {
    if (!value) return;
    const month = parseInt(dateStr.slice(5, 7));
    const day = parseInt(dateStr.slice(8, 10));
    setToast(`${month}/${day} ${MOOD_EMOJI[value]}`);
    setTimeout(() => setToast(null), 1500);
  };

  /* ── save as image ── */
  const handleSaveImage = async () => {
    const node = captureRef.current;
    if (!node || saving) return;
    setSaving(true);
    const header = node.querySelector("[data-capture-header]") as HTMLElement | null;
    if (header) header.classList.replace("hidden", "flex");
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 3,
        backgroundColor: getComputedStyle(document.documentElement)
          .getPropertyValue("--sys-bg-primary")
          .trim() || "#ffffff",
      });

      /* try Web Share API first (mobile) */
      if (navigator.share && navigator.canShare) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `mood-${year}.png`, {
          type: "image/png",
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          setSaving(false);
          return;
        }
      }

      /* fallback: download */
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `mood-${year}.png`;
      a.click();
    } catch {
      /* user cancelled share sheet — ignore */
    } finally {
      if (header) header.classList.replace("flex", "hidden");
      setSaving(false);
    }
  };

  if (cellSize === 0) {
    return <div ref={containerRef} className="px-5 md:px-0 py-4 min-h-[200px]" />;
  }

  return (
    <div ref={containerRef} className="px-5 md:px-0 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[18px]">{"\u{1FAE7}"}</span>
          <span className="text-[20px] font-bold text-[var(--label-primary)]">
            {year}년 무드
          </span>
        </div>
        <button
          onClick={handleSaveImage}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                     bg-[var(--fill-tertiary)] text-[var(--label-secondary)]
                     text-[13px] font-medium active:scale-95 transition-transform
                     disabled:opacity-50"
        >
          {saving ? (
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          저장
        </button>
      </div>

      {/* Capture area */}
      <div ref={captureRef} className="rounded-2xl" style={{ padding: 4 }}>
        {/* Capture header (visible only in exported image) */}
        <div
          className="justify-center mb-3 hidden"
          data-capture-header
        >
          <span className="text-[22px] font-bold text-[var(--label-primary)]">
            {year}
          </span>
        </div>
        {/* Grid */}
        <div className="flex">
          {/* Day labels column */}
          <div
            className="flex flex-col flex-shrink-0"
            style={{ width: DAY_LABEL_W, gap: GAP }}
          >
            <div style={{ height: cellSize }} />
            {Array.from({ length: 31 }, (_, i) => (
              <div
                key={i}
                className="flex items-center justify-end pr-0.5 text-[var(--label-tertiary)]"
                style={{
                  height: cellSize,
                  fontSize: Math.max(cellSize * 0.45, 8),
                  lineHeight: 1,
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Month columns */}
          <div className="flex flex-1" style={{ gap: GAP }}>
            {Array.from({ length: 12 }, (_, mi) => {
              const maxDay = daysInMonth(year, mi);
              return (
                <div
                  key={mi}
                  className="flex flex-col flex-1"
                  style={{ gap: GAP }}
                >
                  {/* Month label */}
                  <div
                    className="flex items-center justify-center font-semibold text-[var(--label-secondary)]"
                    style={{
                      height: cellSize,
                      fontSize: Math.max(cellSize * 0.5, 9),
                      lineHeight: 1,
                    }}
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
                          className="w-full"
                          style={{ height: cellSize }}
                        />
                      );
                    }
                    const dateStr = `${year}-${String(mi + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const value = moods[dateStr];
                    const isToday = dateStr === todayStr;

                    return (
                      <div
                        key={di}
                        className="w-full rounded-[3px] cursor-pointer transition-transform active:scale-110"
                        style={{
                          height: cellSize,
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
        <div className="flex items-center justify-center gap-3 mt-3">
          {[1, 2, 3, 4, 5].map((v) => (
            <div key={v} className="flex items-center gap-1">
              <div
                className="rounded-[2px]"
                style={{
                  width: Math.max(cellSize * 0.5, 10),
                  height: Math.max(cellSize * 0.5, 10),
                  backgroundColor: MOOD_COLORS[v],
                }}
              />
              <span style={{ fontSize: Math.max(cellSize * 0.5, 10) }}>
                {MOOD_EMOJI[v]}
              </span>
            </div>
          ))}
        </div>
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
