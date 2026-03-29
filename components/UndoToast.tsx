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
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[var(--fill-primary)] text-[var(--label-primary)] shadow-md animate-[toastSlide_0.3s_ease-out]">
      <span className="text-[14px]">{message}</span>
      <button
        className="text-[14px] font-bold text-[var(--accent-primary)] flex-shrink-0"
        onClick={onUndo}
      >
        실행 취소
      </button>
    </div>
  );
}
