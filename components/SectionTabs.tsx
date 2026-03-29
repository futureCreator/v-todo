"use client";

interface SectionTabsProps {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}

export default function SectionTabs({ tabs, active, onChange }: SectionTabsProps) {
  return (
    <div className="flex mx-5 md:mx-0 my-2 p-[3px] rounded-[10px] bg-[var(--fill-quaternary)]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`flex-1 py-[8px] text-[17px] font-semibold text-center rounded-[8px] transition-all duration-200 ${
            active === tab.key
              ? "bg-[var(--bg-elevated)] text-[var(--label-primary)] shadow-sm"
              : "text-[var(--label-secondary)]"
          }`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
