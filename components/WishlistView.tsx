"use client";

import type { WishItem, WishCategory } from "@/types";
import SectionTabs from "@/components/SectionTabs";
import WishItemCard from "@/components/WishItem";
import HealingCard from "@/components/HealingCard";
import MasonryGrid from "@/components/MasonryGrid";
import EmptyState from "@/components/EmptyState";
import { haptic } from "@/lib/haptic";

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

function WishFab({ onClick, ariaLabel }: { onClick: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="press fixed bottom-[72px] right-5 md:bottom-6 md:right-6 z-20 size-14 rounded-full bg-[var(--accent-primary)] text-white shadow-lg active:opacity-80 transition-opacity flex items-center justify-center"
      onClick={() => {
        haptic.tap();
        onClick();
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
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
      <div className="flex-1 flex flex-col min-h-full">
        <SectionTabs
          tabs={tabs}
          active={wishTab}
          onChange={(key) => onTabChange(key as WishCategory)}
        />
        <div className="flex-1 min-h-0 pb-20">
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
        </div>
        <WishFab onClick={onAdd} ariaLabel="힐링 추가" />
      </div>
    );
  }

  // Item/Experience tabs with masonry
  const active = filtered.filter((w) => !w.completed);
  const completed = filtered.filter((w) => w.completed);
  const emptyMessage = wishTab === "item" ? "아직 담긴 물건이 없어요" : "아직 계획된 경험이 없어요";

  return (
    <div className="flex-1 flex flex-col min-h-full">
      <SectionTabs
        tabs={tabs}
        active={wishTab}
        onChange={(key) => onTabChange(key as WishCategory)}
      />

      <div className="flex-1 min-h-0 pb-20">
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
      </div>

      <WishFab
        onClick={onAdd}
        ariaLabel={wishTab === "item" ? "물건 추가" : "경험 추가"}
      />
    </div>
  );
}
