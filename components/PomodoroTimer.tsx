"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const FOCUS_DURATION = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;
const CYCLES = 4;

type TimerState = "idle" | "running" | "paused" | "break";
type BreakType = "short" | "long";

interface PomodoroTimerProps {
  onComplete: () => void;
}

export default function PomodoroTimer({ onComplete }: PomodoroTimerProps) {
  const [state, setState] = useState<TimerState>("idle");
  const [remaining, setRemaining] = useState(FOCUS_DURATION);
  const [cycle, setCycle] = useState(0);
  const [breakType, setBreakType] = useState<BreakType>("short");

  const startTimeRef = useRef<number>(0);
  const totalDurationRef = useRef<number>(FOCUS_DURATION);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(`${BASE}/sounds/timer-end.wav`);
    return () => { audioRef.current = null; };
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const notify = useCallback((title: string, body: string) => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  }, []);

  const logFocusSession = useCallback(async () => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const completedAt = now.toISOString();
    await fetch(`${BASE}/api/pomodoro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, completedAt, type: "focus", duration: 25 }),
    });
    onComplete();
  }, [onComplete]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const left = Math.max(0, totalDurationRef.current - elapsed);
    setRemaining(left);
    return left;
  }, []);

  const start = useCallback(() => {
    if (state === "idle") {
      totalDurationRef.current = FOCUS_DURATION;
      setRemaining(FOCUS_DURATION);
      startTimeRef.current = Date.now();
    } else if (state === "paused") {
      startTimeRef.current = Date.now() - (totalDurationRef.current - remaining) * 1000;
    }
    setState("running");
  }, [state, remaining]);

  const pause = useCallback(() => {
    setState("paused");
    clearTimer();
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setState("idle");
    setRemaining(FOCUS_DURATION);
    setCycle(0);
    setBreakType("short");
    totalDurationRef.current = FOCUS_DURATION;
  }, [clearTimer]);

  useEffect(() => {
    if (state === "running" || state === "break") {
      clearTimer();
      intervalRef.current = setInterval(() => {
        const left = tick();
        if (left <= 0) {
          clearTimer();
          if (state === "running") {
            const newCycle = cycle + 1;
            setCycle(newCycle);
            logFocusSession();
            notify("집중 완료!", "휴식 시간입니다.");
            if (newCycle >= CYCLES) {
              setBreakType("long");
              totalDurationRef.current = LONG_BREAK;
              setRemaining(LONG_BREAK);
            } else {
              setBreakType("short");
              totalDurationRef.current = SHORT_BREAK;
              setRemaining(SHORT_BREAK);
            }
            startTimeRef.current = Date.now();
            setState("break");
          } else {
            notify("휴식 끝!", "다시 집중할 시간입니다.");
            if (cycle >= CYCLES) {
              setCycle(0);
            }
            totalDurationRef.current = FOCUS_DURATION;
            setRemaining(FOCUS_DURATION);
            setState("idle");
          }
        }
      }, 200);
    }
    return clearTimer;
  }, [state, cycle, clearTimer, tick, logFocusSession, notify]);

  const isFocus = state === "running" || state === "paused" || state === "idle";
  const total = totalDurationRef.current;
  const progress = total > 0 ? (total - remaining) / total : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const RADIUS = 88;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const offset = CIRCUMFERENCE * (1 - progress);
  const ringColor = isFocus ? "#FF6B35" : "#34C759";

  const stateLabel =
    state === "idle" ? "시작하기" :
    state === "running" ? "집중 중" :
    state === "paused" ? "일시정지" :
    breakType === "long" ? "긴 휴식" : "짧은 휴식";

  return (
    <div className="flex flex-col items-center gap-6 pt-6 pb-4">
      {/* Circular Progress */}
      <div className="relative w-[220px] h-[220px]">
        <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90">
          <circle cx="110" cy="110" r={RADIUS} fill="none" stroke="var(--sys-separator-opaque)" strokeWidth="6" />
          <circle cx="110" cy="110" r={RADIUS} fill="none" stroke={ringColor} strokeWidth="6"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-200" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[52px] font-bold tracking-tight text-[var(--label-primary)]" style={{ fontVariantNumeric: "tabular-nums" }}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          <span className="text-[15px] text-[var(--label-tertiary)] mt-1">{stateLabel}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5">
        {state !== "idle" && (
          <button onClick={reset}
            className="w-[48px] h-[48px] rounded-full bg-[var(--fill-tertiary)] flex items-center justify-center transition-transform active:scale-95">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--label-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 10a6 6 0 1 1 1.5-3.5" />
              <polyline points="2 3 4 6.5 7.5 5" />
            </svg>
          </button>
        )}

        <button onClick={state === "running" ? pause : start}
          className="w-[64px] h-[64px] rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{ backgroundColor: ringColor }}>
          {state === "running" ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <polygon points="8,5 19,12 8,19" />
            </svg>
          )}
        </button>
      </div>

      {/* Cycle Indicator */}
      <div className="flex items-center gap-2.5">
        {Array.from({ length: CYCLES }).map((_, i) => (
          <div key={i} className="w-[10px] h-[10px] rounded-full transition-colors"
            style={{
              backgroundColor: i < cycle ? "#FF6B35" : "transparent",
              border: i === cycle && state !== "idle" ? "2px solid #FF6B35" : i < cycle ? "none" : "2px solid var(--sys-separator-opaque)",
            }} />
        ))}
      </div>
    </div>
  );
}
