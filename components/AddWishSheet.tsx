"use client";

import { useState, useEffect, useRef } from "react";
import type { WishItem } from "@/types";
import { haptic } from "@/lib/haptic";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface AddWishSheetProps {
  wish?: WishItem | null;
  defaultCategory: "item" | "experience";
  onSave: (data: {
    title: string;
    category: "item" | "experience";
    price: number | null;
    url: string | null;
    imageUrl: string | null;
    memo: string | null;
    actualPrice?: number | null;
    satisfaction?: number | null;
    review?: string | null;
  }) => void;
  onDelete?: (id: string) => void;
  onUncomplete?: (id: string) => void;
  onClose: () => void;
}

export default function AddWishSheet({
  wish,
  defaultCategory,
  onSave,
  onDelete,
  onUncomplete,
  onClose,
}: AddWishSheetProps) {
  const [title, setTitle] = useState(wish?.title ?? "");
  const category: "item" | "experience" =
    wish?.category === "item" || wish?.category === "experience"
      ? wish.category
      : defaultCategory;
  const [priceInput, setPriceInput] = useState(
    wish?.price != null ? String(wish.price) : ""
  );
  const [url, setUrl] = useState(wish?.url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(wish?.imageUrl ?? null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(wish?.imageUrl ?? null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [memo, setMemo] = useState(wish?.memo ?? "");
  const [actualPriceInput, setActualPriceInput] = useState(
    wish?.actualPrice != null ? String(wish.actualPrice) : ""
  );
  const [satisfaction, setSatisfaction] = useState<number | null>(wish?.satisfaction ?? null);
  const [reviewInput, setReviewInput] = useState(wish?.review ?? "");

  useEffect(() => { haptic.light(); }, []);

  const canSave = title.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    haptic.tap();
    const priceNum = priceInput.length > 0 ? parseInt(priceInput, 10) : null;
    const actualPriceNum = actualPriceInput.length > 0 ? parseInt(actualPriceInput, 10) : null;
    onSave({
      title: title.trim(),
      category,
      price: isNaN(priceNum as number) ? null : priceNum,
      url: url.trim() || null,
      imageUrl: uploadedUrl,
      memo: memo.trim() || null,
      ...(wish?.completed && {
        actualPrice: isNaN(actualPriceNum as number) ? null : actualPriceNum,
        satisfaction,
        review: reviewInput.trim() || null,
      }),
    });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setPriceInput(digits);
  };

  const handleActualPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setActualPriceInput(digits);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setPreviewSrc(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE}/api/wishes/upload`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (body.data?.imageUrl) {
        setUploadedUrl(body.data.imageUrl);
      }
    } catch {
      // silent
    }
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/40 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl p-6 animate-[sheetUp_0.3s_ease-out] max-h-[85dvh] overflow-y-auto"
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
          <h2 className="text-[20px] font-semibold text-[var(--label-primary)]">
            {wish ? "위시 수정" : "새 위시"}
          </h2>
          <button
            className={`text-[20px] font-semibold ${
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

        {/* Price */}
        <div className="mb-4">
          <label htmlFor="wish-price" className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            가격
          </label>
          <div className="relative">
            <input
              id="wish-price"
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
          <label htmlFor="wish-url" className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            링크
          </label>
          <input
            id="wish-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none"
          />
        </div>

        {/* Photo */}
        <div className="mb-4">
          <span className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            사진
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
          {previewSrc ? (
            <div className="rounded-xl overflow-hidden mb-3">
              <img src={previewSrc} alt="미리보기" className="w-full" />
            </div>
          ) : null}
          <button
            type="button"
            className="w-full py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-secondary)] font-medium"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "업로드 중..." : uploadedUrl ? "다른 사진 선택" : "사진 선택"}
          </button>
        </div>

        {/* Memo */}
        <div className="mb-4">
          <label htmlFor="wish-memo" className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            메모
          </label>
          <textarea
            id="wish-memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모를 입력하세요"
            rows={3}
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none resize-none"
          />
        </div>

        {/* Completion info (completed wishes only) */}
        {wish?.completed && (
          <>
            <div className="h-px bg-[var(--separator)] my-4" />
            <div className="text-[15px] font-medium text-[var(--label-secondary)] mb-3">
              완료 정보
            </div>

            {/* Actual price */}
            <div className="mb-4">
              <label htmlFor="wish-actual-price" className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
                실제 가격
              </label>
              <div className="relative">
                <input
                  id="wish-actual-price"
                  type="text"
                  inputMode="numeric"
                  value={actualPriceInput}
                  onChange={handleActualPriceChange}
                  placeholder="0"
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[20px] text-[var(--label-tertiary)] pointer-events-none">
                  원
                </span>
              </div>
            </div>

            {/* Satisfaction */}
            <fieldset className="mb-4">
              <legend className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
                만족도
              </legend>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star}점`}
                    aria-pressed={satisfaction != null && star <= satisfaction}
                    className="flex-1 py-3 rounded-xl text-[24px] transition-colors"
                    style={{
                      backgroundColor:
                        satisfaction != null && star <= satisfaction
                          ? "var(--accent-primary)"
                          : "var(--fill-quaternary)",
                    }}
                    onClick={() => setSatisfaction(star === satisfaction ? null : star)}
                  >
                    <span style={{
                      filter: satisfaction != null && star <= satisfaction
                        ? "brightness(0) invert(1)"
                        : "none",
                    }}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Review */}
            <div className="mb-4">
              <label htmlFor="wish-review" className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
                한줄 후기
              </label>
              <input
                id="wish-review"
                type="text"
                value={reviewInput}
                onChange={(e) => setReviewInput(e.target.value)}
                placeholder="어떠셨나요?"
                className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none"
              />
            </div>
          </>
        )}

        {/* Uncomplete button (completed wishes) */}
        {wish?.completed && onUncomplete && (
          <button
            className="w-full py-3.5 mt-2 rounded-xl text-[20px] font-medium text-[var(--sys-orange)] bg-[var(--sys-orange)]/10"
            onClick={() => onUncomplete(wish.id)}
          >
            완료 취소
          </button>
        )}

        {/* Delete button (edit mode only) */}
        {wish && onDelete && (
          <button
            className="w-full py-3.5 mt-2 rounded-xl text-[20px] font-medium text-[var(--system-red)] bg-[var(--system-red)]/10"
            onClick={() => { haptic.warning(); onDelete(wish.id); }}
          >
            위시 삭제
          </button>
        )}
      </div>
    </div>
  );
}
