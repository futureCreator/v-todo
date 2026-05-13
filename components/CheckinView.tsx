"use client";

import { useState } from "react";
import DateNavigator from "@/components/DateNavigator";
import MoodInput from "@/components/MoodInput";
import GratitudeSection from "@/components/GratitudeSection";
import BriefingModal from "@/components/BriefingModal";
import TimeCapsuleCard from "@/components/TimeCapsuleCard";
import MonthlyReviewModal from "@/components/MonthlyReviewModal";
import { haptic } from "@/lib/haptic";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function dateToString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date {
  return new Date(s + "T00:00:00");
}

export default function CheckinView() {
  const [date, setDate] = useState(() => new Date());
  const [showBriefing, setShowBriefing] = useState(false);
  const [briefingText, setBriefingText] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const loadBriefing = async () => {
    haptic.selection();
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

  const openReview = () => {
    haptic.selection();
    setShowReview(true);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DateNavigator date={date} onChange={setDate} />
      <div
        className="flex-1 min-h-0 overflow-y-auto flex flex-col"
        style={{ viewTransitionName: "date-content" }}
      >
        <div className="pt-3">
          <MoodInput date={dateToString(date)} />
          <GratitudeSection date={dateToString(date)} />
        </div>
        <div className="mx-5 md:mx-0 mt-auto pt-4 pb-4 flex flex-col gap-3">
          <TimeCapsuleCard onSelectDate={(d) => setDate(parseDate(d))} />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="py-3.5 rounded-xl bg-[var(--fill-secondary)] text-[var(--label-primary)] text-[17px] font-semibold active:opacity-70 transition-opacity"
              onClick={openReview}
            >
              이 달 회고
            </button>
            <button
              type="button"
              className="py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[17px] font-semibold active:opacity-80 transition-opacity"
              onClick={loadBriefing}
            >
              오늘의 브리핑
            </button>
          </div>
        </div>
      </div>
      {showBriefing && (
        <BriefingModal
          briefing={briefingLoading ? "로딩 중..." : briefingText}
          onClose={() => setShowBriefing(false)}
        />
      )}
      {showReview && (
        <MonthlyReviewModal onClose={() => setShowReview(false)} />
      )}
    </div>
  );
}
