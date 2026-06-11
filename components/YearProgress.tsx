"use client";

import { useState, useEffect } from "react";

export default function YearProgress() {
  const [progress, setProgress] = useState<{ year: number; display: string } | null>(null);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const diff = now.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const totalDays = isLeapYear ? 366 : 365;
    const percent = (dayOfYear / totalDays) * 100;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only init to avoid SSR/CSR time mismatch
    setProgress({ year, display: percent.toFixed(1) });
  }, []);

  return (
    <div
      className="relative w-full h-5 rounded-full overflow-hidden bg-[var(--sys-fill-secondary)]"
      role="progressbar"
      aria-valuenow={progress ? parseFloat(progress.display) : 0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={progress ? `${progress.year}년 진행률 ${progress.display}%` : "연간 진행률"}
    >
      {progress && (
        <>
          {/* Unfilled/Background Text (Visible on the grey/unfilled portion) */}
          <span className="absolute inset-0 flex items-center justify-center text-[13px] text-[var(--sys-label-secondary)] font-medium">
            {progress.year}&nbsp;&nbsp;{progress.display}%
          </span>

          {/* Filled Bar & Masked Text (Visible on the blue/filled portion) */}
          <div
            className="absolute inset-0 rounded-full bg-[var(--sys-blue)] overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - parseFloat(progress.display)}% 0 0)` }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[13px] text-white font-semibold">
              {progress.year}&nbsp;&nbsp;{progress.display}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}
