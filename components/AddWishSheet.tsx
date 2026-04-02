"use client";

import { useState } from "react";
import type { WishItem, WishCategory } from "@/types";

interface AddWishSheetProps {
  wish?: WishItem | null;
  defaultCategory: WishCategory;
  onSave: (data: {
    title: string;
    category: WishCategory;
    price: number | null;
    url: string | null;
    imageUrl: string | null;
    memo: string | null;
  }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function AddWishSheet({
  wish,
  defaultCategory,
  onSave,
  onDelete,
  onClose,
}: AddWishSheetProps) {
  const [title, setTitle] = useState(wish?.title ?? "");
  const [category, setCategory] = useState<WishCategory>(wish?.category ?? defaultCategory);
  const [priceInput, setPriceInput] = useState(
    wish?.price != null ? String(wish.price) : ""
  );
  const [url, setUrl] = useState(wish?.url ?? "");
  const [imageUrl, setImageUrl] = useState(wish?.imageUrl ?? "");
  const [memo, setMemo] = useState(wish?.memo ?? "");

  const canSave = title.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const priceNum = priceInput.length > 0 ? parseInt(priceInput, 10) : null;
    onSave({
      title: title.trim(),
      category,
      price: isNaN(priceNum as number) ? null : priceNum,
      url: url.trim() || null,
      imageUrl: imageUrl.trim() || null,
      memo: memo.trim() || null,
    });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setPriceInput(digits);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl p-6 animate-[sheetUp_0.3s_ease-out] max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-[var(--fill-tertiary)] rounded-full mx-auto mb-6" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            className="text-[var(--label-tertiary)] text-[20px]"
            onClick={onClose}
          >
            취소
          </button>
          <h2 className="text-[20px] font-bold text-[var(--label-primary)]">
            {wish ? "위시 수정" : "새 위시"}
          </h2>
          <button
            className={`text-[20px] font-bold ${
              canSave
                ? "text-[var(--accent-primary)]"
                : "text-[var(--label-quaternary)]"
            }`}
            onClick={handleSave}
            disabled={!canSave}
          >
            저장
          </button>
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="위시 이름"
          maxLength={100}
          className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none mb-4"
        />

        {/* Category */}
        <div className="flex gap-2 mb-4">
          {(["item", "experience"] as const).map((cat) => (
            <button
              key={cat}
              className={`flex-1 py-3 rounded-xl text-[17px] font-medium transition-colors ${
                category === cat
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-[var(--fill-quaternary)] text-[var(--label-secondary)]"
              }`}
              onClick={() => setCategory(cat)}
            >
              {cat === "item" ? "🛍️ 물건" : "⭐ 경험"}
            </button>
          ))}
        </div>

        {/* Price */}
        <div className="mb-4">
          <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            가격
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={priceInput}
              onChange={handlePriceChange}
              placeholder="0"
              className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[20px] text-[var(--label-tertiary)] pointer-events-none">
              원
            </span>
          </div>
        </div>

        {/* URL */}
        <div className="mb-4">
          <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            링크
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none"
          />
        </div>

        {/* Image URL */}
        <div className="mb-4">
          <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            이미지 URL
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://"
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none"
          />
        </div>

        {/* Memo */}
        <div className="mb-4">
          <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            메모
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모를 입력하세요"
            rows={3}
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none resize-none"
          />
        </div>

        {/* Delete button (edit mode only) */}
        {wish && onDelete && (
          <button
            className="w-full py-3.5 mt-2 rounded-xl text-[20px] font-medium text-[var(--system-red)] bg-[var(--system-red)]/10"
            onClick={() => onDelete(wish.id)}
          >
            위시 삭제
          </button>
        )}
      </div>
    </div>
  );
}
