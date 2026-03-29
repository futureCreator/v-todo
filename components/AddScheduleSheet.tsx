"use client";

import { useState, useEffect } from "react";
import type { Schedule, ScheduleType, RepeatMode } from "@/types";
import KoreanLunarCalendar from "korean-lunar-calendar";

function clientLunarToSolar(year: number, month: number, day: number) {
  try {
    const cal = new KoreanLunarCalendar();
    if (!cal.setLunarDate(year, month, day, false)) return null;
    const s = cal.getSolarCalendar();
    return { year: s.year, month: s.month, day: s.day };
  } catch { return null; }
}

interface AddScheduleSheetProps {
  schedule?: Schedule | null;
  defaultType: ScheduleType;
  onSave: (data: {
    name: string;
    targetDate: string;
    originDate: string;
    type: ScheduleType;
    repeatMode: RepeatMode;
    isLunar: boolean;
    lunarMonth: number | null;
    lunarDay: number | null;
  }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function AddScheduleSheet({
  schedule,
  defaultType,
  onSave,
  onDelete,
  onClose,
}: AddScheduleSheetProps) {
  const [name, setName] = useState(schedule?.name ?? "");
  const [type, setType] = useState<ScheduleType>(schedule?.type ?? defaultType);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(schedule?.repeatMode ?? "none");
  const [targetDate, setTargetDate] = useState(schedule?.targetDate ?? "");
  const [originDate, setOriginDate] = useState(schedule?.originDate ?? "");
  const [isLunar, setIsLunar] = useState(schedule?.isLunar ?? false);
  const [lunarMonth, setLunarMonth] = useState<number | null>(schedule?.lunarMonth ?? null);
  const [lunarDay, setLunarDay] = useState<number | null>(schedule?.lunarDay ?? null);
  const [solarPreview, setSolarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (type === "general") {
      setRepeatMode("none");
    } else if (repeatMode === "none") {
      setRepeatMode("yearly");
    }
  }, [type, repeatMode]);

  useEffect(() => {
    if (isLunar && lunarMonth && lunarDay) {
      const year = new Date().getFullYear();
      const solar = clientLunarToSolar(year, lunarMonth, lunarDay);
      if (solar) {
        const dateStr = `${solar.year}-${String(solar.month).padStart(2, "0")}-${String(solar.day).padStart(2, "0")}`;
        setSolarPreview(dateStr);
        setTargetDate(dateStr);
        setOriginDate(dateStr);
      } else {
        setSolarPreview(null);
      }
    } else {
      setSolarPreview(null);
    }
  }, [isLunar, lunarMonth, lunarDay]);

  const handleSave = () => {
    if (!name.trim() || !targetDate) return;
    onSave({
      name: name.trim(),
      targetDate,
      originDate: originDate || targetDate,
      type,
      repeatMode,
      isLunar,
      lunarMonth: isLunar ? lunarMonth : null,
      lunarDay: isLunar ? lunarDay : null,
    });
  };

  const canSave = name.trim().length > 0 && targetDate.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl p-6 animate-[sheetUp_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[var(--fill-tertiary)] rounded-full mx-auto mb-6" />

        <div className="flex items-center justify-between mb-6">
          <button className="text-[var(--label-tertiary)] text-[15px]" onClick={onClose}>
            취소
          </button>
          <h2 className="text-[17px] font-bold text-[var(--label-primary)]">
            {schedule ? "일정 수정" : "새 일정"}
          </h2>
          <button
            className={`text-[15px] font-bold ${canSave ? "text-[var(--accent-primary)]" : "text-[var(--label-quaternary)]"}`}
            onClick={handleSave}
            disabled={!canSave}
          >
            저장
          </button>
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="일정 이름"
          maxLength={100}
          className="w-full px-4 py-3 rounded-xl bg-[var(--fill-quaternary)] text-[15px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none mb-4"
        />

        <div className="flex gap-2 mb-4">
          {(["general", "anniversary"] as const).map((t) => (
            <button
              key={t}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                type === t
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-[var(--fill-quaternary)] text-[var(--label-secondary)]"
              }`}
              onClick={() => setType(t)}
            >
              {t === "general" ? "일반 일정" : "기념일"}
            </button>
          ))}
        </div>

        {type === "anniversary" && (
          <div className="flex gap-2 mb-4">
            {(["every_100_days", "monthly", "yearly"] as const).map((m) => (
              <button
                key={m}
                className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-colors ${
                  repeatMode === m
                    ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                    : "bg-[var(--fill-quaternary)] text-[var(--label-tertiary)]"
                }`}
                onClick={() => setRepeatMode(m)}
              >
                {m === "every_100_days" ? "100일" : m === "monthly" ? "매월" : "매년"}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <span className="text-[14px] text-[var(--label-secondary)]">음력</span>
          <button
            className={`w-12 h-7 rounded-full transition-colors relative ${
              isLunar ? "bg-[var(--accent-primary)]" : "bg-[var(--fill-tertiary)]"
            }`}
            onClick={() => setIsLunar(!isLunar)}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                isLunar ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {isLunar ? (
          <div className="flex gap-2 mb-3">
            <input
              type="number"
              min={1}
              max={12}
              value={lunarMonth ?? ""}
              onChange={(e) => setLunarMonth(Number(e.target.value) || null)}
              placeholder="월"
              className="flex-1 px-3 py-3 rounded-xl bg-[var(--fill-quaternary)] text-[15px] text-center text-[var(--label-primary)] outline-none"
            />
            <input
              type="number"
              min={1}
              max={30}
              value={lunarDay ?? ""}
              onChange={(e) => setLunarDay(Number(e.target.value) || null)}
              placeholder="일"
              className="flex-1 px-3 py-3 rounded-xl bg-[var(--fill-quaternary)] text-[15px] text-center text-[var(--label-primary)] outline-none"
            />
          </div>
        ) : (
          <input
            type="date"
            value={targetDate}
            onChange={(e) => {
              setTargetDate(e.target.value);
              if (!originDate) setOriginDate(e.target.value);
            }}
            className="w-full px-4 py-3 rounded-xl bg-[var(--fill-quaternary)] text-[15px] text-[var(--label-primary)] outline-none mb-3"
          />
        )}

        {solarPreview && (
          <p className="text-[12px] text-[var(--label-tertiary)] mb-4">
            양력 변환: {solarPreview}
          </p>
        )}

        {schedule && onDelete && (
          <button
            className="w-full py-3 mt-4 rounded-xl text-[15px] font-medium text-[var(--system-red)] bg-[var(--system-red)]/10"
            onClick={() => onDelete(schedule.id)}
          >
            일정 삭제
          </button>
        )}
      </div>
    </div>
  );
}
