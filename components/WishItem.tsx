"use client";

import type { WishItem as WishItemType } from "@/types";
import { splitParts } from "@/lib/tags";
import { haptic } from "@/lib/haptic";

interface WishItemProps {
  wish: WishItemType;
  onToggle: (id: string) => void;
  onEdit: (wish: WishItemType) => void;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function WishItem({ wish, onToggle, onEdit, onDelete, onTagClick }: WishItemProps) {
  const renderPrice = () => {
    if (wish.completed && wish.actualPrice != null) {
      if (wish.price != null && wish.price !== wish.actualPrice) {
        return (
          <div className="text-[15px] font-medium mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="line-through text-[var(--label-quaternary)]">
              {wish.price.toLocaleString("ko-KR")}원
            </span>
            <span className="text-[var(--accent-primary)]">
              → {wish.actualPrice.toLocaleString("ko-KR")}원
            </span>
          </div>
        );
      }
      return (
        <div className="text-[15px] text-[var(--accent-primary)] font-medium mt-1">
          {wish.actualPrice.toLocaleString("ko-KR")}원
        </div>
      );
    }
    if (wish.price != null) {
      return (
        <div className="text-[15px] text-[var(--accent-primary)] font-medium mt-1">
          {wish.price.toLocaleString("ko-KR")}원
        </div>
      );
    }
    return null;
  };

  const renderMeta = () => {
    if (wish.completed) {
      return (
        <>
          {wish.satisfaction != null && (
            <div className="text-[13px] text-[var(--sys-orange)] mt-0.5 flex items-center gap-0.5">
              <span>★</span>
              <span>{wish.satisfaction}</span>
            </div>
          )}
          {(wish.review || wish.memo) && (
            <div className="text-[13px] text-[var(--label-tertiary)] mt-0.5 truncate">
              {wish.review ?? wish.memo}
            </div>
          )}
        </>
      );
    }
    if (wish.memo) {
      return (
        <div className="text-[13px] text-[var(--label-tertiary)] mt-0.5 truncate">
          {wish.memo}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-[var(--sys-bg-elevated)]">
      {/* Image area — only if image exists */}
      {wish.imageUrl ? (
        <button
          className="press w-full relative"
          onClick={() => onEdit(wish)}
          aria-label="위시 편집"
        >
          <img
            src={wish.imageUrl}
            alt=""
            className="w-full block rounded-t-2xl"
            loading="lazy"
          />
          {/* Completed overlay */}
          {wish.completed && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" fill="var(--accent-primary)" />
                <path d="M12 20L18 26L28 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {/* Completed date badge */}
          {wish.completed && wish.completedAt && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/50 text-white text-[11px] font-medium">
              {formatDate(wish.completedAt)} 달성
            </div>
          )}
        </button>
      ) : null}

      {/* Content */}
      <div className="px-3 pt-2.5 pb-3">
        <button
          className="press w-full text-left"
          onClick={() => onEdit(wish)}
        >
          <div className={`text-[17px] leading-[22px] font-semibold text-[var(--label-primary)] ${wish.completed ? "line-through" : ""} flex items-center flex-wrap gap-1`}>
            {splitParts(wish.title).map((part) =>
              part.type === "tag" ? (
                <button
                  key={part.key}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/12 text-[var(--accent-primary)] text-[11px] font-medium leading-tight no-underline"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); onTagClick?.(part.value); }}
                  style={{ textDecoration: "none" }}
                >
                  #{part.value}
                </button>
              ) : (
                <span key={part.key}>{part.value}</span>
              )
            )}
          </div>
          {renderPrice()}
          {renderMeta()}
        </button>

        {/* Bottom actions */}
        <div className="flex items-center justify-between mt-2">
          <button
            className="press size-[36px] flex items-center justify-center rounded-full"
            onClick={() => { haptic.medium(); onToggle(wish.id); }}
            aria-label={wish.completed ? "완료 취소" : "완료 표시"}
          >
            <div
              className={`size-[24px] rounded-full flex items-center justify-center transition-colors ${
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
            className="press size-[36px] flex items-center justify-center rounded-full"
            onClick={() => { haptic.warning(); onDelete(wish.id); }}
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
