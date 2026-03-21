"use client";

import type { Quadrant } from "@/types";
import { QUADRANT_LABELS, QUADRANT_ORDER } from "@/types";

const TAB_COLORS: Record<Quadrant, string> = {
  "urgent-important": "var(--q-urgent-important)",
  "urgent-not-important": "var(--q-urgent-not-important)",
  "not-urgent-important": "var(--q-not-urgent-important)",
  "not-urgent-not-important": "var(--q-not-urgent-not-important)",
};

const TAB_TINTS: Record<Quadrant, string> = {
  "urgent-important": "var(--q-urgent-important-tint)",
  "urgent-not-important": "var(--q-urgent-not-important-tint)",
  "not-urgent-important": "var(--q-not-urgent-important-tint)",
  "not-urgent-not-important": "var(--q-not-urgent-not-important-tint)",
};

function TabIcon({ quadrant, active }: { quadrant: Quadrant; active: boolean }) {
  const color = active ? TAB_COLORS[quadrant] : "var(--sys-gray)";
  const sw = active ? "2" : "1.8";

  switch (quadrant) {
    case "urgent-important":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={active ? `color-mix(in srgb, ${TAB_COLORS[quadrant]} 15%, transparent)` : "none"}
          />
        </svg>
      );
    case "not-urgent-important":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke={color}
            strokeWidth={sw}
            fill={active ? `color-mix(in srgb, ${TAB_COLORS[quadrant]} 15%, transparent)` : "none"}
          />
          <path d="M12 7v5l3 3" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "urgent-not-important":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M17 7l-10 10M7 7h10v10"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "not-urgent-not-important":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect
            x="3"
            y="3"
            width="7"
            height="7"
            rx="1.5"
            stroke={color}
            strokeWidth={sw}
            fill={active ? `color-mix(in srgb, ${TAB_COLORS[quadrant]} 10%, transparent)` : "none"}
          />
          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={sw} />
          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={sw} />
          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={sw} />
        </svg>
      );
  }
}

interface TabBarProps {
  active: Quadrant;
  onChange: (q: Quadrant) => void;
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex md:hidden z-40"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 4px)",
      }}
    >
      {/* Glass background */}
      <div
        className="absolute inset-0 material-bar"
        style={{ borderTop: "0.5px solid var(--sys-separator)" }}
      />

      {/* Tab buttons */}
      <div className="relative flex w-full px-2">
        {QUADRANT_ORDER.map((q) => {
          const isActive = active === q;
          return (
            <button
              key={q}
              onClick={() => onChange(q)}
              className="flex-1 flex flex-col items-center gap-[3px] pt-[7px] pb-[3px] min-h-[50px] transition-all active:scale-95"
            >
              {/* Icon with tinted pill */}
              <div className="relative flex items-center justify-center w-[56px] h-[30px]">
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-full transition-colors"
                    style={{ background: TAB_TINTS[q] }}
                  />
                )}
                <div className="relative">
                  <TabIcon quadrant={q} active={isActive} />
                </div>
              </div>
              <span
                className="text-[10px] font-semibold transition-colors"
                style={{ color: isActive ? TAB_COLORS[q] : "var(--sys-gray)" }}
              >
                {QUADRANT_LABELS[q]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
