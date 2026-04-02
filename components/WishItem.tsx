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
    <div className={`flex items-center gap-3.5 px-4 min-h-[72px] py-2 ${wish.completed ? "opacity-40" : ""}`}>
      {/* Checkbox */}
      <button
        className="flex-shrink-0 w-[44px] h-[44px] flex items-center justify-center"
        onClick={() => onToggle(wish.id)}
        aria-label={wish.completed ? "완료 취소" : "완료 표시"}
      >
        <div
          className={`w-[28px] h-[28px] rounded-full flex items-center justify-center transition-colors ${
            wish.completed
              ? "bg-[var(--accent-primary)]"
              : "border-2 border-[var(--fill-tertiary)]"
          }`}
        >
          {wish.completed && (
            <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
              <path d="M1.5 5.5L5.5 9.5L12.5 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </button>

      {/* Thumbnail */}
      <button
        className="flex-shrink-0 w-[52px] h-[52px] rounded-xl overflow-hidden"
        onClick={() => onEdit(wish)}
        aria-label="위시 편집"
      >
        {wish.imageUrl ? (
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${wish.imageUrl})` }}
          />
        ) : (
          <div className="w-full h-full bg-[var(--fill-quaternary)] flex items-center justify-center text-[24px]">
            {categoryEmoji}
          </div>
        )}
      </button>

      {/* Content */}
      <button
        className="flex-1 min-w-0 text-left"
        onClick={() => onEdit(wish)}
        aria-label="위시 편집"
      >
        <div
          className={`text-[20px] leading-[26px] font-semibold text-[var(--label-primary)] truncate ${
            wish.completed ? "line-through" : ""
          }`}
        >
          {wish.title}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          {wish.price != null && (
            <span className="text-[15px] text-[var(--accent-primary)] font-medium flex-shrink-0">
              {wish.price.toLocaleString("ko-KR")}원
            </span>
          )}
          {wish.price != null && wish.memo && (
            <span className="text-[15px] text-[var(--label-quaternary)] flex-shrink-0">·</span>
          )}
          {wish.memo && (
            <span className="text-[15px] text-[var(--label-tertiary)] truncate">
              {wish.memo}
            </span>
          )}
        </div>
      </button>

      {/* Delete button */}
      <button
        className="flex-shrink-0 w-[44px] h-[44px] flex items-center justify-center"
        onClick={() => onDelete(wish.id)}
        aria-label="위시 삭제"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 2L14 14M14 2L2 14" stroke="var(--label-quaternary)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
