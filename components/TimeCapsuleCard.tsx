"use client";

import { useEffect, useState, useCallback } from "react";
import { haptic } from "@/lib/haptic";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const MOOD_EMOJI: Record<number, string> = {
  1: "😢", 2: "😔", 3: "😐", 4: "😊", 5: "😄",
};

const MAX_YEARS = 5;

interface Row {
  date: string;
  year: number;
  mood: number | null;
  preview: string | null;
}

interface TimeCapsuleCardProps {
  onSelectDate: (date: string) => void;
}

function todayMMDD(): { mm: string; dd: string; today: string } {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const today = `${now.getFullYear()}-${mm}-${dd}`;
  return { mm, dd, today };
}

function firstMeaningfulLine(md: string): string | null {
  for (const raw of md.split("\n")) {
    // Skip heading lines entirely
    if (/^#+\s/.test(raw)) continue;
    const line = raw
      .replace(/^[-*]\s+\[.\]\s+/, "")
      .replace(/^[-*]\s+/, "")
      .replace(/^>\s+/, "")
      .trim();
    if (line.length > 0) return line.length > 80 ? line.slice(0, 80) + "…" : line;
  }
  return null;
}

export default function TimeCapsuleCard({ onSelectDate }: TimeCapsuleCardProps) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const { mm, dd, today } = todayMMDD();
      const moodRes = await fetch(`${BASE}/api/moods`);
      if (!moodRes.ok) throw new Error("moods");
      const moodBody: { data?: Record<string, number> } = await moodRes.json();
      const moods = moodBody.data ?? {};

      const matchingDates = Object.keys(moods)
        .filter((d) => d.length === 10 && d.endsWith(`-${mm}-${dd}`) && d !== today)
        .sort()
        .reverse()
        .slice(0, MAX_YEARS);

      const built: Row[] = await Promise.all(
        matchingDates.map(async (date): Promise<Row> => {
          let preview: string | null = null;
          try {
            const gRes = await fetch(`${BASE}/api/gratitude?date=${date}`);
            if (gRes.ok) {
              const gBody: { data?: { items?: string[] } | null } = await gRes.json();
              const first = (gBody.data?.items ?? []).find((s) => s && s.trim());
              if (first) preview = first.trim();
            }
          } catch {}
          if (!preview) {
            try {
              const nRes = await fetch(`${BASE}/api/notes/daily?date=${date}`);
              if (nRes.ok) {
                const nBody: { data?: string } = await nRes.json();
                const content = nBody.data ?? "";
                preview = firstMeaningfulLine(content);
              }
            } catch {}
          }
          return {
            date,
            year: Number(date.slice(0, 4)),
            mood: moods[date] ?? null,
            preview,
          };
        }),
      );

      setRows(built);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (failed) return null;
  if (rows === null) return null;
  if (rows.length === 0) return null;

  return (
    <section
      aria-label="이 날의 발자취"
      className="mx-5 md:mx-0 mb-3 bg-[var(--sys-bg-elevated)] rounded-xl overflow-hidden"
    >
      <div className="px-4 pt-3 pb-1">
        <span className="text-[15px] font-semibold text-[var(--label-secondary)]">이 날의 발자취</span>
      </div>
      <ul className="px-2 pb-2">
        {rows.map((r) => (
          <li key={r.date}>
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                onSelectDate(r.date);
              }}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg active:bg-[var(--fill-tertiary)] transition-colors"
              aria-label={`${r.date}로 이동`}
            >
              <span className="text-[15px] tabular-nums text-[var(--label-tertiary)] w-[88px] text-left">
                {r.date}
              </span>
              <span className="text-[20px] w-[24px] text-center" aria-hidden="true">
                {r.mood !== null ? MOOD_EMOJI[r.mood] : ""}
              </span>
              <span className="text-[15px] text-[var(--label-primary)] flex-1 text-left truncate">
                {r.preview ?? ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
