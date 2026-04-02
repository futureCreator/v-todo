"use client";

import type { WishItem as WishItemType } from "@/types";

interface WishItemProps {
  wish: WishItemType;
  onToggle: (id: string) => void;
  onEdit: (wish: WishItemType) => void;
  onDelete: (id: string) => void;
}

export default function WishItem({ wish, onToggle, onEdit, onDelete }: WishItemProps) {
  const categoryEmoji = wish.category === "item" ? "🛍️" : "⭐";

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-[var(--sys-bg-elevated)] transition-opacity ${wish.completed ? "opacity-50" : ""}`}>
      {/* Image area */}
      <button
        className="w-full aspect-[4/3] relative"
        onClick={() => onEdit(wish)}
        aria-label="위시 편집"
      >
        {wish.imageUrl ? (
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${wish.imageUrl})` }}
          />
        ) : (
          <div className="w-full h-full bg-[var(--fill-quaternary)] flex items-center justify-center">
            <span className="text-[48px] opacity-40">{categoryEmoji}</span>
          </div>
        )}
        {/* Completed overlay */}
        {wish.completed && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill="var(--accent-primary)" />
              <path d="M12 20L18 26L28 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </button>

      {/* Content */}
      <div className="px-3 pt-2.5 pb-3">
        <button
          className="w-full text-left"
          onClick={() => onEdit(wish)}
        >
          <div className={`text-[17px] leading-[22px] font-semibold text-[var(--label-primary)] line-clamp-2 ${wish.completed ? "line-through" : ""}`}>
            {wish.title}
          </div>
          {wish.price != null && (
            <div className="text-[15px] text-[var(--accent-primary)] font-medium mt-1">
              {wish.price.toLocaleString("ko-KR")}원
            </div>
          )}
          {wish.memo && (
            <div className="text-[13px] text-[var(--label-tertiary)] mt-0.5 truncate">
              {wish.memo}
            </div>
          )}
        </button>

        {/* Bottom actions */}
        <div className="flex items-center justify-between mt-2">
          <button
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full"
            onClick={() => onToggle(wish.id)}
            aria-label={wish.completed ? "완료 취소" : "완료 표시"}
          >
            <div
              className={`w-[24px] h-[24px] rounded-full flex items-center justify-center transition-colors ${
                wish.completed
                  ? "bg-[var(--accent-primary)]"
                  : "border-2 border-[var(--fill-tertiary)]"
              }`}
            >
              {wish.completed && (
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                  <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </button>
          <button
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full"
            onClick={() => onDelete(wish.id)}
            aria-label="위시 삭제"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1.5 1.5L12.5 12.5M12.5 1.5L1.5 12.5" stroke="var(--label-quaternary)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
