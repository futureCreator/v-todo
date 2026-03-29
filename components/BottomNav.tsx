"use client";

interface BottomNavProps {
  active: "todo" | "dday";
  onChange: (section: "todo" | "dday") => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-[var(--separator)] material-nav safe-area-pb">
      <div className="flex h-[50px]">
        <button
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            active === "todo"
              ? "text-[var(--accent-primary)]"
              : "text-[var(--label-tertiary)]"
          }`}
          onClick={() => onChange("todo")}
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
        <button
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            active === "dday"
              ? "text-[var(--accent-primary)]"
              : "text-[var(--label-tertiary)]"
          }`}
          onClick={() => onChange("dday")}
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
