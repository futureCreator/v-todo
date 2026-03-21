"use client";

interface AiActionsProps {
  onSuggest: () => void;
  onCleanup: () => void;
  loading: boolean;
}

export default function AiActions({ onSuggest, onCleanup, loading }: AiActionsProps) {
  return (
    <div className="fixed bottom-[80px] md:bottom-8 right-5 md:right-8 flex flex-col gap-[10px] z-40 safe-area-pr">
      {/* AI Suggest — gradient shimmer button */}
      <button
        onClick={onSuggest}
        disabled={loading}
        className={`h-[44px] px-[18px] rounded-2xl text-[14px] font-semibold disabled:opacity-40 transition-all active:scale-95 flex items-center gap-[6px] ${
          loading ? "" : "ai-shimmer"
        }`}
        style={{
          background: loading ? "var(--ai-from)" : undefined,
          color: "#FFFFFF",
          boxShadow: "0 2px 16px rgba(88, 86, 214, 0.3), 0 1px 4px rgba(0,0,0,0.1)",
        }}
      >
        {loading ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="animate-spin">
            <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
            <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z"
              fill="white"
            />
          </svg>
        )}
        AI 제안
      </button>

      {/* AI Cleanup — glass button */}
      <button
        onClick={onCleanup}
        disabled={loading}
        className="h-[44px] px-[18px] rounded-2xl text-[14px] font-semibold disabled:opacity-40 transition-all active:scale-95 material-bar flex items-center gap-[6px]"
        style={{
          color: "var(--ai-from)",
          boxShadow: "var(--shadow-md), 0 0 0 0.5px var(--sys-separator)",
        }}
      >
        {loading ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="animate-spin">
            <circle cx="8" cy="8" r="6" stroke="var(--sys-fill)" strokeWidth="2" />
            <path d="M8 2a6 6 0 0 1 6 6" stroke="var(--ai-from)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 4h12M6 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M3.5 4l.7 9.1a1.5 1.5 0 001.5 1.4h4.6a1.5 1.5 0 001.5-1.4l.7-9.1"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        AI 정리
      </button>
    </div>
  );
}
