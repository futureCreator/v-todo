"use client";

import { useState, useEffect, useCallback } from "react";
import PomodoroTimer from "@/components/PomodoroTimer";
import PomodoroStats from "@/components/PomodoroStats";
import PomodoroHeatmap from "@/components/PomodoroHeatmap";
import type { PomodoroLog } from "@/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function PomodoroView() {
  const [logs, setLogs] = useState<PomodoroLog[]>([]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/pomodoro`);
      const body = await res.json();
      if (body.data) setLogs(body.data);
    } catch (err) {
      console.error("Failed to fetch pomodoro logs:", err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PomodoroTimer onComplete={fetchLogs} />
      <PomodoroStats logs={logs} />
      <PomodoroHeatmap logs={logs} />
    </div>
  );
}
