"use client";

import { useState, useEffect } from "react";
import type { WishItem } from "@/types";
import { haptic } from "@/lib/haptic";

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

const CONFETTI_COLORS = [
  "var(--accent-primary)",
  "var(--sys-orange)",
  "#FFD700",
  "#FF6B8A",
  "#7B68EE",
  "#50E3C2",
];

interface ConfettiParticle {
  id: number;
  width: number;
  height: number;
  color: string;
  left: number;
  top: number;
  duration: number;
  delay: number;
  round: boolean;
}

function ConfettiParticles() {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    const next: ConfettiParticle[] = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      width: 6 + Math.random() * 6,
      height: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: 8 + Math.random() * 84,
      top: -10 + Math.random() * 30,
      duration: 1.2 + Math.random() * 0.8,
      delay: Math.random() * 0.3,
      round: Math.random() > 0.5,
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only random init to avoid SSR hydration mismatch
    setParticles(next);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            width: `${p.width}px`,
            height: `${p.height}px`,
            backgroundColor: p.color,
            left: `${p.left}%`,
            top: `${p.top}%`,
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
            borderRadius: p.round ? "50%" : "2px",
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
    haptic.success();
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

        {/* Confetti */}
        {showConfetti && <ConfettiParticles />}

        {/* Celebration header */}
        <div className="flex flex-col items-center mb-8 relative">
          <div
            className="size-[72px] rounded-full bg-[var(--accent-primary)] flex items-center justify-center mb-4"
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
          <h2 className="text-[22px] font-semibold text-[var(--label-primary)]">
            위시 달성!
          </h2>
          <p className="text-[17px] text-[var(--label-secondary)] mt-1">
            {congratsMessage}
          </p>
        </div>

        {/* Completion date */}
        <div className="mb-4">
          <label htmlFor="wish-complete-date" className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            완료일
          </label>
          <input
            id="wish-complete-date"
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] outline-none"
          />
        </div>

        {/* Actual price */}
        <div className="mb-4">
          <label htmlFor="wish-complete-price" className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            실제 가격
          </label>
          <div className="relative">
            <input
              id="wish-complete-price"
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
        <div className="mb-6">
          <label htmlFor="wish-complete-review" className="text-[15px] text-[var(--label-tertiary)] mb-1.5 block">
            한줄 후기
          </label>
          <input
            id="wish-complete-review"
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
