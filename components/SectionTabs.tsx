"use client";

interface SectionTabsProps {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}

export default function SectionTabs({ tabs, active, onChange }: SectionTabsProps) {
  return (
    <div className="flex border-b border-[var(--separator)]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`flex-1 py-3 text-[14px] font-medium text-center transition-colors relative ${
            active === tab.key
              ? "text-[var(--accent-primary)] font-bold"
              : "text-[var(--label-tertiary)]"
          }`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {active === tab.key && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-[var(--accent-primary)] rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
