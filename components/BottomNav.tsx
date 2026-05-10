"use client";

import type { Section } from "@/types";
import { haptic } from "@/lib/haptic";

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
          onClick={() => { if (active !== "todo") { haptic.selection(); onChange("todo"); } }}
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

        {/* 노트 */}
        <button
          className={`press flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            active === "note"
              ? "text-[var(--accent-primary)]"
              : "text-[var(--label-tertiary)]"
          }`}
          onClick={() => { if (active !== "note") { haptic.selection(); onChange("note"); } }}
        >
          <svg width="25" height="25" viewBox="0 0 25 25" fill={active === "note" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active === "note" ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
            {active === "note" ? (
              <path d="M6 3C4.9 3 4 3.9 4 5v14c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H6zm2 4h8v1.5H8V7zm0 3.5h8V12H8v-1.5zm0 3.5h5v1.5H8V14z" />
            ) : (
              <>
                <rect x="5" y="4" width="14" height="17" rx="2" />
                <line x1="9" y1="8" x2="16" y2="8" />
                <line x1="9" y1="12" x2="16" y2="12" />
                <line x1="9" y1="16" x2="13" y2="16" />
              </>
            )}
          </svg>
          <span className="text-[12px] font-medium">노트</span>
        </button>

        {/* 체크인 */}
        <button
          className={`press flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            active === "checkin"
              ? "text-[var(--accent-primary)]"
              : "text-[var(--label-tertiary)]"
          }`}
          onClick={() => { if (active !== "checkin") { haptic.selection(); onChange("checkin"); } }}
        >
          <svg width="25" height="25" viewBox="0 0 25 25" fill={active === "checkin" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active === "checkin" ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
            {active === "checkin" ? (
              <path fillRule="evenodd" clipRule="evenodd" d="M12.5 2.5C7 2.5 2.5 7 2.5 12.5S7 22.5 12.5 22.5 22.5 18 22.5 12.5 18 2.5 12.5 2.5zM9.2 10.8a1.3 1.3 0 110-2.6 1.3 1.3 0 010 2.6zm6.6 0a1.3 1.3 0 110-2.6 1.3 1.3 0 010 2.6zM7.7 14.5h9.6c-.9 2.6-3.1 4.3-4.8 4.3s-3.9-1.7-4.8-4.3z" />
            ) : (
              <>
                <circle cx="12.5" cy="12.5" r="9.5" />
                <circle cx="9.2" cy="10" r="1.1" fill="currentColor" stroke="none" />
                <circle cx="15.8" cy="10" r="1.1" fill="currentColor" stroke="none" />
                <path d="M8 14.5c.9 2 2.6 3.3 4.5 3.3s3.6-1.3 4.5-3.3" />
              </>
            )}
          </svg>
          <span className="text-[12px] font-medium">체크인</span>
        </button>

        {/* 위시 */}
        <button
          className={`press flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            active === "wish"
              ? "text-[var(--accent-primary)]"
              : "text-[var(--label-tertiary)]"
          }`}
          onClick={() => { if (active !== "wish") { haptic.selection(); onChange("wish"); } }}
        >
          <svg width="25" height="25" viewBox="0 0 25 25" fill={active === "wish" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active === "wish" ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
            {active === "wish" ? (
              <path d="M12.5 2.5l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2-4.5-4.4 6.2-.9 2.8-5.7z" />
            ) : (
              <polygon points="12.5 3 15.3 8.7 21.5 9.6 17 14 18.1 20.2 12.5 17.3 6.9 20.2 8 14 3.5 9.6 9.7 8.7" />
            )}
          </svg>
          <span className="text-[12px] font-medium">위시</span>
        </button>

        {/* D-day */}
        <button
          className={`press flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            active === "dday"
              ? "text-[var(--accent-primary)]"
              : "text-[var(--label-tertiary)]"
          }`}
          onClick={() => { if (active !== "dday") { haptic.selection(); onChange("dday"); } }}
        >
          <svg width="25" height="25" viewBox="0 0 25 25" fill={active === "dday" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active === "dday" ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
            {active === "dday" ? (
              <path d="M12.5 2.5C7 2.5 2.5 7 2.5 12.5S7 22.5 12.5 22.5 22.5 18 22.5 12.5 18 2.5 12.5 2.5zm0 18c-4.1 0-7.5-3.4-7.5-7.5S8.4 5.5 12.5 5.5s7.5 3.4 7.5 7.5-3.4 7.5-7.5 7.5zm.5-12h-1.5v5.5l4.8 2.9.8-1.2-4.1-2.4V8.5z" />
            ) : (
              <>
                <circle cx="12.5" cy="12.5" r="9" />
                <polyline points="12.5 7.5 12.5 12.5 16 14.5" />
              </>
            )}
          </svg>
          <span className="text-[12px] font-medium">D-day</span>
        </button>
      </div>
    </nav>
  );
}
