"use client";

import type { WishItem, WishCategory } from "@/types";
import SectionTabs from "@/components/SectionTabs";
import WishItemCard from "@/components/WishItem";
import HealingCard from "@/components/HealingCard";
import MasonryGrid from "@/components/MasonryGrid";
import EmptyState from "@/components/EmptyState";

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

  const filtered = wishes
    .filter((w) => w.category === wishTab)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
          <EmptyState
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            }
            title="힐링 아이템이 없어요"
            description="기분이 좋아지는 것들을 모아보세요"
          />
        )}
        <div className="mx-5 md:mx-0 mt-auto pt-4">
          <button
            className="press w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold active:opacity-80 transition-opacity"
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
        <EmptyState
          icon={
            wishTab === "item" ? (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            )
          }
          title={emptyMessage}
          description={wishTab === "item" ? "갖고 싶은 것을 적어두면 잊지 않아요" : "해보고 싶은 경험을 모아보세요"}
        />
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
          className="press w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold active:opacity-80 transition-opacity"
          onClick={onAdd}
        >
          새 위시 추가
        </button>
      </div>
    </div>
  );
}
