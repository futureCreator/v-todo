"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface GratitudeSectionProps {
  date: string;
}

export default function GratitudeSection({ date }: GratitudeSectionProps) {
  const empty: [string, string, string, string, string] = ["", "", "", "", ""];
  const [items, setItems] = useState<[string, string, string, string, string]>(empty);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const itemsRef = useRef<[string, string, string, string, string]>(empty);
  const dirtyRef = useRef(false);
  const dateRef = useRef(date);

  const fetchGratitude = useCallback(async (d: string) => {
    dateRef.current = d;
    try {
      const res = await fetch(`${BASE}/api/gratitude?date=${d}`);
      const body = await res.json();
      const entry = body.data;
      const raw = entry?.items ?? [];
      const loaded: [string, string, string, string, string] = [
        raw[0] ?? "", raw[1] ?? "", raw[2] ?? "", raw[3] ?? "", raw[4] ?? "",
      ];
      setItems(loaded);
      itemsRef.current = loaded;
      dirtyRef.current = false;
      const hasContent = loaded.some((s: string) => s.trim().length > 0);
      setSaveStatus(hasContent ? "saved" : "idle");
    } catch {
      setItems(empty);
      itemsRef.current = [...empty];
    }
  }, []);

  const saveGratitude = useCallback(async () => {
    if (!dirtyRef.current) return;
    setSaveStatus("saving");
    try {
      await fetch(`${BASE}/api/gratitude?date=${dateRef.current}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsRef.current }),
      });
      dirtyRef.current = false;
      setSaveStatus("saved");
    } catch {
      setSaveStatus("saved");
    }
  }, []);

  useEffect(() => {
    fetchGratitude(date);
  }, [date, fetchGratitude]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) saveGratitude();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      saveGratitude();
    };
  }, [saveGratitude]);

  const handleChange = (index: number, value: string) => {
    const updated = [...items] as [string, string, string, string, string];
    updated[index] = value;
    setItems(updated);
    itemsRef.current = updated;
    dirtyRef.current = true;
    setSaveStatus("saving");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveGratitude();
    }, 1000);
  };

  const filledCount = items.filter((s) => s.trim().length > 0).length;

  return (
    <div className="mx-5 md:mx-0 mb-3">
      <div className="bg-[var(--sys-bg-elevated)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-semibold text-[var(--label-primary)]">오늘의 감사</span>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === "saving" && (
              <span className="text-[13px] text-[var(--label-tertiary)]">저장 중...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-[13px] text-[var(--label-tertiary)]">저장됨</span>
            )}
          </div>
        </div>

        {/* Content — always visible */}
        <div>
          <div className="px-4 pb-4 flex flex-col gap-2.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--fill-quaternary)] text-[13px] font-semibold text-[var(--label-tertiary)] flex-shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={items[i]}
                  onChange={(e) => handleChange(i, e.target.value)}
                  placeholder="감사한 것을 적어보세요"
                  maxLength={200}
                  className="flex-1 bg-[var(--fill-quaternary)] rounded-lg px-3 py-2.5 text-[17px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
