"use client";

import type { WishItem, WishCategory } from "@/types";
import SectionTabs from "@/components/SectionTabs";
import WishItemCard from "@/components/WishItem";
import HealingCard from "@/components/HealingCard";
import MasonryGrid from "@/components/MasonryGrid";

interface WishlistViewProps {
  wishes: WishItem[];
  wishTab: WishCategory;
  onTabChange: (tab: WishCategory) => void;
  onToggle: (id: string) => void;
  onEdit: (wish: WishItem) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onTagClick?: (tag: string) => void;
}

export default function WishlistView({
  wishes,
  wishTab,
  onTabChange,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  onTagClick,
}: WishlistViewProps) {
  const healingCount = wishes.filter((w) => w.category === "healing").length;
  const itemCount = wishes.filter((w) => w.category === "item" && !w.completed).length;
  const experienceCount = wishes.filter((w) => w.category === "experience" && !w.completed).length;

  const tabs = [
    { key: "healing", label: `힐링${healingCount > 0 ? ` ${healingCount}` : ""}` },
    { key: "item", label: `물건${itemCount > 0 ? ` ${itemCount}` : ""}` },
    { key: "experience", label: `경험${experienceCount > 0 ? ` ${experienceCount}` : ""}` },
  ];

  const filtered = wishes.filter((w) => w.category === wishTab);

  // Healing tab: no completed/active split
  if (wishTab === "healing") {
    return (
      <div className="flex-1 flex flex-col">
        <SectionTabs
          tabs={tabs}
          active={wishTab}
          onChange={(key) => onTabChange(key as WishCategory)}
        />
        {filtered.length > 0 ? (
          <div className="mx-4 md:mx-0 mt-3">
            <MasonryGrid>
              {filtered.map((item) => (
                <HealingCard key={item.id} item={item} onDelete={onDelete} />
              ))}
            </MasonryGrid>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-[56px] opacity-30">💚</span>
            <span className="text-[20px] text-[var(--label-tertiary)]">기분이 좋아지는 것들을 모아보세요</span>
          </div>
        )}
        <div className="mx-5 md:mx-0 mt-auto pt-4">
          <button
            className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold active:opacity-80 transition-opacity"
            onClick={onAdd}
          >
            힐링 추가
          </button>
        </div>
      </div>
    );
  }

  // Item/Experience tabs with masonry
  const active = filtered.filter((w) => !w.completed);
  const completed = filtered.filter((w) => w.completed);
  const categoryEmoji = wishTab === "item" ? "🛍️" : "⭐";
  const emptyMessage = wishTab === "item" ? "아직 담긴 물건이 없어요" : "아직 계획된 경험이 없어요";

  return (
    <div className="flex-1 flex flex-col">
      <SectionTabs
        tabs={tabs}
        active={wishTab}
        onChange={(key) => onTabChange(key as WishCategory)}
      />

      {active.length > 0 && (
        <div className="mx-4 md:mx-0 mt-3">
          <MasonryGrid>
            {active.map((wish) => (
              <WishItemCard
                key={wish.id}
                wish={wish}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onTagClick={onTagClick}
              />
            ))}
          </MasonryGrid>
        </div>
      )}

      {active.length === 0 && completed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-[56px] opacity-30">{categoryEmoji}</span>
          <span className="text-[20px] text-[var(--label-tertiary)]">{emptyMessage}</span>
        </div>
      )}

      {completed.length > 0 && (
        <div className="mx-4 md:mx-0 mt-6">
          <div className="text-[15px] font-medium text-[var(--label-tertiary)] mb-2 px-1">
            달성 {completed.length}
          </div>
          <MasonryGrid>
            {completed.map((wish) => (
              <WishItemCard
                key={wish.id}
                wish={wish}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </MasonryGrid>
        </div>
      )}

      <div className="mx-5 md:mx-0 mt-auto pt-4">
        <button
          className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold active:opacity-80 transition-opacity"
          onClick={onAdd}
        >
          새 위시 추가
        </button>
      </div>
    </div>
  );
}
