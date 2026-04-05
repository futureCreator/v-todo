"use client";

import type { WishItem, WishCategory } from "@/types";
import SectionTabs from "@/components/SectionTabs";
import WishItemCard from "@/components/WishItem";

interface WishlistViewProps {
  wishes: WishItem[];
  wishTab: WishCategory;
  onTabChange: (tab: WishCategory) => void;
  onToggle: (id: string) => void;
  onEdit: (wish: WishItem) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export default function WishlistView({
  wishes,
  wishTab,
  onTabChange,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
}: WishlistViewProps) {
  const itemCount = wishes.filter((w) => w.category === "item" && !w.completed).length;
  const experienceCount = wishes.filter((w) => w.category === "experience" && !w.completed).length;

  const tabs = [
    { key: "item", label: `물건 ${itemCount > 0 ? itemCount : ""}`.trim() },
    { key: "experience", label: `경험 ${experienceCount > 0 ? experienceCount : ""}`.trim() },
  ];

  const filtered = wishes.filter((w) => w.category === wishTab);
  const active = filtered.filter((w) => !w.completed);
  const completed = filtered.filter((w) => w.completed);

  const categoryEmoji = wishTab === "item" ? "🛍️" : "⭐";
  const emptyMessage = wishTab === "item" ? "아직 담긴 물건이 없어요" : "아직 계획된 경험이 없어요";

  return (
    <div className="pb-6">
      {/* Internal tabs */}
      <SectionTabs
        tabs={tabs}
        active={wishTab}
        onChange={(key) => onTabChange(key as WishCategory)}
      />

      {/* Active wish items — 2-column grid */}
      {active.length > 0 && (
        <div className="mx-4 md:mx-0 mt-3 grid grid-cols-2 gap-3">
          {active.map((wish) => (
            <WishItemCard
              key={wish.id}
              wish={wish}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {active.length === 0 && completed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-[56px] opacity-30">{categoryEmoji}</span>
          <span className="text-[20px] text-[var(--label-tertiary)]">{emptyMessage}</span>
        </div>
      )}

      {/* Completed section */}
      {completed.length > 0 && (
        <div className="mx-4 md:mx-0 mt-6">
          <div className="text-[15px] font-medium text-[var(--label-tertiary)] mb-2 px-1">
            달성 {completed.length}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {completed.map((wish) => (
              <WishItemCard
                key={wish.id}
                wish={wish}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add button */}
      <div className="mx-4 md:mx-0 mt-4">
        <button
          className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold"
          onClick={onAdd}
        >
          새 위시 추가
        </button>
      </div>
    </div>
  );
}
