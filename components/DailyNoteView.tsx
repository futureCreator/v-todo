"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import DateNavigator from "@/components/DateNavigator";
import NoteEditor from "@/components/NoteEditor";
import GratitudeSection from "@/components/GratitudeSection";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function dateToString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DailyNoteView() {
  const [date, setDate] = useState(() => new Date());
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const dateRef = useRef(dateToString(new Date()));
  const contentRef = useRef("");
  const dirtyRef = useRef(false);

  const fetchNote = useCallback(async (d: Date) => {
    const dateStr = dateToString(d);
    dateRef.current = dateStr;
    try {
      const res = await fetch(`${BASE}/api/notes/daily?date=${dateStr}`);
      const body = await res.json();
      const text = body.data ?? "";
      setContent(text);
      contentRef.current = text;
      dirtyRef.current = false;
      setSaveStatus(text ? "saved" : "idle");
    } catch {
      setContent("");
      contentRef.current = "";
    }
  }, []);

  const saveNote = useCallback(async () => {
    if (!dirtyRef.current) return;
    setSaveStatus("saving");
    try {
      await fetch(`${BASE}/api/notes/daily?date=${dateRef.current}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentRef.current }),
      });
      dirtyRef.current = false;
      setSaveStatus("saved");
    } catch {
      setSaveStatus("saved");
    }
  }, []);

  // Load note when date changes
  useEffect(() => {
    fetchNote(date);
  }, [date, fetchNote]);

  // Save on focus out / tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) saveNote();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Save on unmount
      saveNote();
    };
  }, [saveNote]);

  const handleChange = useCallback(
    (newContent: string) => {
      contentRef.current = newContent;
      dirtyRef.current = true;
      setSaveStatus("saving");

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        saveNote();
      }, 1000);
    },
    [saveNote]
  );

  const handleDateChange = useCallback(
    (newDate: Date) => {
      // Save current note before switching
      saveNote();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setDate(newDate);
    },
    [saveNote]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DateNavigator date={date} onChange={handleDateChange} />
      {saveStatus !== "idle" && (
        <div className="px-5 md:px-0 -mt-1 mb-1 text-right">
          <span className="text-[13px] text-[var(--label-tertiary)]">
            {saveStatus === "saving" ? "저장 중..." : "저장됨"}
          </span>
        </div>
      )}
      <GratitudeSection date={dateToString(date)} />
      <NoteEditor
        content={content}
        onChange={handleChange}
        placeholder="오늘의 노트를 작성하세요..."
      />
    </div>
  );
}
