"use client";

import type { WishItem } from "@/types";
import { extractDomain } from "@/lib/fetch-title";

interface HealingCardProps {
  item: WishItem;
  onDelete: (id: string) => void;
}

export default function HealingCard({ item, onDelete }: HealingCardProps) {
  const handleDelete = () => {
    onDelete(item.id);
  };

  const handleLinkClick = () => {
    if (item.url) window.open(item.url, "_blank", "noopener");
  };

  // Image type
  if (item.healingType === "image" && item.imageUrl) {
    return (
      <div className="rounded-2xl overflow-hidden bg-[var(--sys-bg-elevated)] relative group">
        <img
          src={item.imageUrl}
          alt=""
          className="w-full block"
          style={{ objectFit: "cover" }}
          loading="lazy"
        />
        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDelete}
          aria-label="삭제"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 1.5L12.5 12.5M12.5 1.5L1.5 12.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  // Text type
  if (item.healingType === "text") {
    return (
      <div className="rounded-2xl overflow-hidden bg-[var(--sys-bg-elevated)] p-4 relative group">
        <p className="text-[17px] leading-relaxed text-[var(--label-primary)] whitespace-pre-wrap">
          {item.title}
        </p>
        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[var(--fill-tertiary)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDelete}
          aria-label="삭제"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 1.5L12.5 12.5M12.5 1.5L1.5 12.5" stroke="var(--label-tertiary)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  // Link type
  return (
    <button
      className="rounded-2xl overflow-hidden bg-[var(--sys-bg-elevated)] p-4 text-left w-full relative group"
      onClick={handleLinkClick}
    >
      <div className="text-[13px] text-[var(--sys-teal)] font-medium mb-1">
        {item.url ? extractDomain(item.url) : "링크"}
      </div>
      <div className="text-[17px] leading-snug text-[var(--label-primary)] font-medium">
        {item.linkTitle || item.url || ""}
      </div>
      <button
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[var(--fill-tertiary)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); handleDelete(); }}
        aria-label="삭제"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path d="M1.5 1.5L12.5 12.5M12.5 1.5L1.5 12.5" stroke="var(--label-tertiary)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </button>
  );
}
