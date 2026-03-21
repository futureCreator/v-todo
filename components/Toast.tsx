"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed bottom-24 md:bottom-8 left-1/2 z-50 ios-toast flex items-center gap-[8px] px-5 py-[11px] rounded-2xl text-[14px] font-medium max-w-[340px] text-center"
      style={{
        background: "var(--sys-bg-elevated)",
        color: "var(--sys-label)",
        boxShadow: "var(--shadow-lg), 0 0 0 0.5px var(--sys-separator)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
        <circle cx="8" cy="8" r="7" stroke="var(--sys-orange)" strokeWidth="1.5" />
        <path d="M8 5v3.5M8 10.5v.5" stroke="var(--sys-orange)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
