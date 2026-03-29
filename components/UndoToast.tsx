"use client";

import { useEffect } from "react";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export default function UndoToast({
  message,
  onUndo,
  onDismiss,
  duration = 3000,
}: UndoToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div className="fixed bottom-[68px] md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-[360px] z-50 flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl bg-[var(--sys-bg-elevated)] text-[var(--label-primary)] shadow-lg ios-toast safe-area-pb">
      <span className="text-[15px] leading-[20px] truncate">{message}</span>
      <button
        className="text-[15px] font-semibold text-[var(--accent-primary)] flex-shrink-0 active:opacity-60"
        onClick={onUndo}
      >
        실행 취소
      </button>
    </div>
  );
}
