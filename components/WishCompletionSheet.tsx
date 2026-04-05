"use client";

import { useState, useEffect } from "react";
import type { WishItem } from "@/types";

interface WishCompletionSheetProps {
  wish: WishItem;
  onComplete: (data: {
    actualPrice: number | null;
    satisfaction: number | null;
    review: string | null;
    completedAt: string;
  }) => void;
  onClose: () => void;
}

function getTodayKST(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ConfettiParticles() {
  const colors = [
    "var(--accent-primary)",
    "var(--sys-orange)",
    "#FFD700",
    "#FF6B8A",
    "#7B68EE",
    "#50E3C2",
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-sm"
          style={{
            width: `${6 + Math.random() * 6}px`,
            height: `${6 + Math.random() * 6}px`,
            backgroundColor: colors[i % colors.length],
            left: `${8 + Math.random() * 84}%`,
            top: `${-10 + Math.random() * 30}%`,
            animation: `confettiFall ${1.2 + Math.random() * 0.8}s ease-in ${Math.random() * 0.3}s forwards`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

export default function WishCompletionSheet({
  wish,
  onComplete,
  onClose,
}: WishCompletionSheetProps) {
  const [dateInput, setDateInput] = useState(getTodayKST());
  const [priceInput, setPriceInput] = useState(
    wish.price != null ? String(wish.price) : ""
  );
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  const handleComplete = () => {
    const priceNum = priceInput.length > 0 ? parseInt(priceInput, 10) : null;
    onComplete({
      actualPrice: isNaN(priceNum as number) ? null : priceNum,
      satisfaction,
      review: review.trim() || null,
      completedAt: `${dateInput}T00:00:00+09:00`,
    });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setPriceInput(digits);
  };

  const congratsMessage =
    wish.category === "item"
      ? "드디어 손에 넣었네요!"
      : "멋진 경험이었죠!";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl p-6 animate-[sheetUp_0.3s_ease-out] max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-[var(--fill-tertiary)] rounded-full mx-auto mb-6" />

        {/* Confetti */}
        {showConfetti && <ConfettiParticles />}

        {/* Celebration header */}
        <div className="flex flex-col items-center mb-8 relative">
          <div
            className="w-[72px] h-[72px] rounded-full bg-[var(--accent-primary)] flex items-center justify-center mb-4"
            style={{ animation: "celebrationCheck 0.6s cubic-bezier(0.32, 0.72, 0, 1) forwards" }}
          >
            <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
              <path
                d="M2 12L12 22L30 2"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-[22px] font-bold text-[var(--label-primary)]">
            위시 달성!
          </h2>
          <p className="text-[17px] text-[var(--label-secondary)] mt-1">
            {congratsMessage}
          </p>
        </div>

        {/* Completion date */}
        <div className="mb-4">
          <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            완료일
          </label>
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] outline-none"
          />
        </div>

        {/* Actual price */}
        <div className="mb-4">
          <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            실제 가격
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

        {/* Satisfaction */}
        <div className="mb-4">
          <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            만족도
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
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
        </div>

        {/* Review */}
        <div className="mb-6">
          <label className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            한줄 후기
          </label>
          <input
            type="text"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="어떠셨나요?"
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none"
          />
        </div>

        {/* Complete button */}
        <button
          className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold"
          onClick={handleComplete}
        >
          완료
        </button>
      </div>
    </div>
  );
}
