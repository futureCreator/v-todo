"use client";

import { useState } from "react";
import DateNavigator from "@/components/DateNavigator";
import MoodInput from "@/components/MoodInput";
import GratitudeSection from "@/components/GratitudeSection";
import BriefingModal from "@/components/BriefingModal";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function dateToString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CheckinView() {
  const [date, setDate] = useState(() => new Date());
  const [showBriefing, setShowBriefing] = useState(false);
  const [briefingText, setBriefingText] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);

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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DateNavigator date={date} onChange={setDate} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-5 md:px-0 pt-3 pb-1">
          <button
            onClick={loadBriefing}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl active:opacity-80 transition-opacity"
            style={{ background: "var(--sys-bg-elevated)" }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="var(--sys-orange)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <circle cx="11" cy="11" r="1.5" fill="var(--sys-orange)" />
              <path d="M11 5v1.5M11 15.5V17M5 11h1.5M15.5 11H17" />
            </svg>
            <span className="text-[17px] font-medium text-[var(--label-primary)]">오늘의 브리핑</span>
            <svg className="ml-auto" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--label-tertiary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4l5 5-5 5" />
            </svg>
          </button>
        </div>
        <MoodInput date={dateToString(date)} />
        <GratitudeSection date={dateToString(date)} />
      </div>
      {showBriefing && (
        <BriefingModal
          briefing={briefingLoading ? "로딩 중..." : briefingText}
          onClose={() => setShowBriefing(false)}
        />
      )}
    </div>
  );
}
