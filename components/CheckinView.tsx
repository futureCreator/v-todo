"use client";

import { useState } from "react";
import DateNavigator from "@/components/DateNavigator";
import MoodInput from "@/components/MoodInput";
import GratitudeSection from "@/components/GratitudeSection";

function dateToString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CheckinView() {
  const [date, setDate] = useState(() => new Date());

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DateNavigator date={date} onChange={setDate} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <MoodInput date={dateToString(date)} />
        <GratitudeSection date={dateToString(date)} />
      </div>
    </div>
  );
}
