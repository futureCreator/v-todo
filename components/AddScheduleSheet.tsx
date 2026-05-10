"use client";

import { useState, useEffect } from "react";
import type { Schedule, ScheduleType, RepeatMode } from "@/types";
import KoreanLunarCalendar from "korean-lunar-calendar";
import { haptic } from "@/lib/haptic";

function lunarToSolar(year: number, month: number, day: number) {
  try {
    const cal = new KoreanLunarCalendar();
    if (!cal.setLunarDate(year, month, day, false)) return null;
    const s = cal.getSolarCalendar();
    return `${s.year}-${String(s.month).padStart(2, "0")}-${String(s.day).padStart(2, "0")}`;
  } catch {
    return null;
  }
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
  const [isLunar, setIsLunar] = useState(schedule?.isLunar ?? false);
  const [inputDate, setInputDate] = useState(() => {
    if (!schedule) return "";
    if (schedule.isLunar && schedule.lunarMonth && schedule.lunarDay) {
      const y = new Date(schedule.originDate + "T00:00:00").getFullYear();
      return `${y}-${String(schedule.lunarMonth).padStart(2, "0")}-${String(schedule.lunarDay).padStart(2, "0")}`;
    }
    return schedule.targetDate;
  });
  const [originDate, setOriginDate] = useState(schedule?.originDate ?? "");

  useEffect(() => { haptic.light(); }, []);

  const solarPreview: string | null = (() => {
    if (!isLunar || !inputDate) return null;
    const [, m, d] = inputDate.split("-").map(Number);
    if (!m || !d) return null;
    return lunarToSolar(new Date().getFullYear(), m, d);
  })();

  const handleTypeChange = (t: ScheduleType) => {
    setType(t);
    if (t === "general") {
      setRepeatMode("none");
    } else if (repeatMode === "none") {
      setRepeatMode("yearly");
    }
  };

  const handleSave = () => {
    if (!name.trim() || !inputDate) return;
    haptic.tap();

    let targetDate: string;
    let finalOriginDate: string;
    let lunarMonth: number | null = null;
    let lunarDay: number | null = null;

    if (isLunar) {
      const [y, m, d] = inputDate.split("-").map(Number);
      lunarMonth = m;
      lunarDay = d;
      // targetDate: 올해(또는 내년) 양력 변환 (다음 도래일)
      const solar = lunarToSolar(new Date().getFullYear(), m, d);
      targetDate = solar ?? inputDate;
      // originDate: 입력한 원래 연도의 양력 변환 (주년 계산 기준)
      const solarOrigin = lunarToSolar(y, m, d);
      finalOriginDate = solarOrigin ?? inputDate;
    } else {
      targetDate = inputDate;
      finalOriginDate = originDate || targetDate;
    }

    onSave({
      name: name.trim(),
      targetDate,
      originDate: finalOriginDate,
      type,
      repeatMode,
      isLunar,
      lunarMonth,
      lunarDay,
    });
  };

  const canSave = name.trim().length > 0 && inputDate.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/40 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl p-6 animate-[sheetUp_0.3s_ease-out]"
      >
        <div className="w-10 h-1 bg-[var(--fill-tertiary)] rounded-full mx-auto mb-6" />

        <div className="flex items-center justify-between mb-6">
          <button className="text-[var(--label-tertiary)] text-[20px]" onClick={onClose}>
            취소
          </button>
          <h2 className="text-[20px] font-semibold text-[var(--label-primary)]">
            {schedule ? "일정 수정" : "새 일정"}
          </h2>
          <button
            className={`text-[20px] font-semibold ${canSave ? "text-[var(--accent-primary)]" : "text-[var(--label-quaternary)]"}`}
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
          className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none mb-4"
        />

        <div className="flex gap-2 mb-4">
          {(["general", "anniversary"] as const).map((t) => (
            <button
              key={t}
              className={`flex-1 py-3 rounded-xl text-[17px] font-medium transition-colors ${
                type === t
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-[var(--fill-quaternary)] text-[var(--label-secondary)]"
              }`}
              onClick={() => handleTypeChange(t)}
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
                className={`flex-1 py-2.5 rounded-lg text-[15px] font-medium transition-colors ${
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
          <span className="text-[20px] text-[var(--label-primary)]">음력</span>
          <button
            type="button"
            className={`w-[51px] h-[31px] rounded-full transition-colors duration-200 relative flex-shrink-0 ${
              isLunar ? "bg-[var(--accent-primary)]" : "bg-[var(--fill-tertiary)]"
            }`}
            onClick={() => setIsLunar(!isLunar)}
          >
            <span
              className={`pointer-events-none absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                isLunar ? "translate-x-[20px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <input
          type="date"
          value={inputDate}
          onChange={(e) => {
            setInputDate(e.target.value);
            if (!isLunar) setOriginDate(e.target.value);
          }}
          className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] outline-none mb-3"
        />

        {solarPreview && (
          <p className="text-[15px] text-[var(--label-tertiary)] mb-4">
            양력 변환: {solarPreview}
          </p>
        )}

        {schedule && onDelete && (
          <button
            className="w-full py-3.5 mt-4 rounded-xl text-[20px] font-medium text-[var(--system-red)] bg-[var(--system-red)]/10"
            onClick={() => { haptic.warning(); onDelete(schedule.id); }}
          >
            일정 삭제
          </button>
        )}
      </div>
    </div>
  );
}
