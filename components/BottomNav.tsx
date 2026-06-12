"use client";

import type { Section } from "@/types";
import { haptic } from "@/lib/haptic";
import { withViewTransition } from "@/lib/view-transition";

interface BottomNavProps {
  active: Section;
  onChange: (section: Section) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-[var(--separator)] bg-[var(--bg-primary)] safe-area-pb">
      <div className="flex h-[50px]">
        {/* 할 일 */}
        <button
          className={`press flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            active === "todo"
              ? "text-[var(--accent-primary)]"
              : "text-[var(--label-tertiary)]"
          }`}
          onClick={() => { if (active !== "todo") { haptic.selection(); withViewTransition(() => onChange("todo")); } }}
        >
          <svg width="25" height="25" viewBox="0 0 25 25" fill={active === "todo" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active === "todo" ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
            {active === "todo" ? (
              <path d="M19.5 3H5.5C4.4 3 3.5 3.9 3.5 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM10.5 15.6l-3.3-3.3 1.1-1.1 2.2 2.2 5.5-5.5 1.1 1.1-6.6 6.6z" />
            ) : (
              <>
                <rect x="4" y="4" width="17" height="17" rx="3" />
                <path d="M9 12.5l2.5 2.5L16 9.5" />
              </>
            )}
          </svg>
          <span className="text-[12px] font-medium">할 일</span>
        </button>
      </div>
    </nav>
  );
}
