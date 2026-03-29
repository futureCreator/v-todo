"use client";

interface BottomNavProps {
  active: "todo" | "dday";
  onChange: (section: "todo" | "dday") => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 material-nav safe-area-pb">
      <div className="flex">
        <button
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            active === "todo"
              ? "text-[var(--label-primary)] font-semibold"
              : "text-[var(--label-tertiary)]"
          }`}
          onClick={() => onChange("todo")}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <span className="text-[11px]">할 일</span>
        </button>
        <button
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            active === "dday"
              ? "text-[var(--label-primary)] font-semibold"
              : "text-[var(--label-tertiary)]"
          }`}
          onClick={() => onChange("dday")}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-[11px]">D-day</span>
        </button>
      </div>
    </nav>
  );
}
